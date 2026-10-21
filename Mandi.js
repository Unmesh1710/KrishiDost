
/**
 * GET /api/mandi?crop=paddy&state=West%20Bengal&district=Hooghly
 *
 * Vercel serverless function.
 * Environment variable required:
 * DATA_GOV_API_KEY
 *
 * Returns daily mandi prices in INR per quintal.
 */

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

const COMMODITY = {
  paddy: 'Paddy(Dhan)(Common)',
  wheat: 'Wheat',
  cotton: 'Cotton',
  maize: 'Maize',
  jute: 'Jute',
  potato: 'Potato',
};

const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const TIMEOUT_MS = 10000;

function send(res, status, body, cache = 'no-store') {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(status).json(body);
}

function toISO(value) {
  const date = String(value || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);

  if (!match) return '';

  const [, day, month, year] = match;

  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

async function query(key, commodity, state, district) {
  const allRecords = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;

    const params = new URLSearchParams({
      'api-key': key,
      format: 'json',
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });

    params.set('filters[state.keyword]', state);
    params.set('filters[commodity]', commodity);

    if (district) {
      params.set('filters[district]', district);
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      TIMEOUT_MS
    );

    let data;

    try {
      const response = await fetch(
        `${API_BASE}?${params.toString()}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`Upstream HTTP ${response.status}`);
      }

      data = await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Upstream request timed out');
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!data || !Array.isArray(data.records)) {
      throw new Error('Unexpected upstream response format');
    }

    allRecords.push(...data.records);

    if (data.records.length < PAGE_SIZE) {
      break;
    }
  }

  return allRecords;
}

function normalise(records) {
  const byMarket = new Map();

  for (const record of records) {
    const modal = Number(record.modal_price);

    if (!Number.isFinite(modal) || modal <= 0) {
      continue;
    }

    const minValue = Number(record.min_price);
    const maxValue = Number(record.max_price);

    const item = {
      market: String(record.market || ''),
      district: String(record.district || ''),
      state: String(record.state || ''),
      commodity: String(record.commodity || ''),
      variety: String(record.variety || ''),
      min:
        Number.isFinite(minValue) && minValue > 0
          ? minValue
          : modal,
      max:
        Number.isFinite(maxValue) && maxValue > 0
          ? maxValue
          : modal,
      modal,
      date: toISO(record.arrival_date),
    };

    const key = [
      item.state.toLowerCase(),
      item.district.toLowerCase(),
      item.market.toLowerCase(),
      item.variety.toLowerCase(),
    ].join('|');

    const previous = byMarket.get(key);

    if (
      !previous ||
      (item.date && (!previous.date || item.date > previous.date))
    ) {
      byMarket.set(key, item);
    }
  }

  return [...byMarket.values()].sort((a, b) => {
    return (b.date || '').localeCompare(a.date || '');
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return send(res, 405, {
      error: 'method_not_allowed',
      message: 'Only GET requests are supported.',
    });
  }

  const key = process.env.DATA_GOV_API_KEY;

  if (!key) {
    return send(res, 503, {
      error: 'not_configured',
      message: 'The mandi API is not configured on the server.',
    });
  }

  const crop = String(req.query.crop || '')
    .trim()
    .toLowerCase();

  const commodity = COMMODITY[crop];
  const state = String(req.query.state || '').trim();
  const district = String(req.query.district || '').trim();

  if (!commodity || !state) {
    return send(res, 400, {
      error: 'bad_request',
      message: 'A supported crop and state are required.',
      supportedCrops: Object.keys(COMMODITY),
    });
  }

  try {
    let records = [];
    let scope = 'state';

    if (district) {
      records = await query(key, commodity, state, district);

      if (records.length > 0) {
        scope = 'district';
      }
    }

    if (records.length === 0) {
      records = await query(key, commodity, state, '');
      scope = 'state';
    }

    const markets = normalise(records);

    return send(
      res,
      200,
      {
        crop,
        commodity,
        state,
        district: district || null,
        scope,
        unit: 'INR per quintal',
        count: Math.min(markets.length, 6),
        markets: markets.slice(0, 6),
        updatedAt: new Date().toISOString(),
        source: 'data.gov.in',
      },
      'public, max-age=900'
    );
  } catch (error) {
    // Never log the API key or expose upstream error details to clients.
    console.error('Mandi API request failed:', error.message);

    return send(res, 502, {
      error: 'upstream_failed',
      message: 'Could not retrieve mandi prices. Please try again later.',
    });
  }
};
