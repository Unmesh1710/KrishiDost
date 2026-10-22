
/**
 * GET /api/mandi?crop=paddy&state=West%20Bengal&district=Hooghly
 *
 * Vercel serverless function.
 * Required environment variable:
 *   DATA_GOV_API_KEY
 *
 * Returns Agmarknet mandi prices from data.gov.in.
 * Prices are in INR per quintal.
 *
 * IMPORTANT:
 * - District searches never silently fall back to the whole state.
 * - State-wide results are returned only when no district is requested.
 * - This endpoint does not claim that district-level markets are nearby.
 */

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

const COMMODITY = Object.freeze({
  paddy: 'Paddy(Dhan)(Common)',
  wheat: 'Wheat',
  cotton: 'Cotton',
  maize: 'Maize',
  jute: 'Jute',
  potato: 'Potato',
});

const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const MAX_RESULTS = 6;
const TIMEOUT_MS = 10000;
const CACHE_SECONDS = 900;

function send(res, status, body, cache = 'no-store') {
  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return res.status(status).json(body);
}

function cleanString(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }

  return String(value).trim();
}

function normalizeText(value) {
  return cleanString(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-IN');
}

function toISO(value) {
  const date = cleanString(value);

  // ISO format: YYYY-MM-DD
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (match) {
    const [, year, month, day] = match;

    return isValidDate(year, month, day)
      ? `${year}-${month}-${day}`
      : '';
  }

  // Agmarknet commonly uses DD/MM/YYYY.
  match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);

  if (!match) {
    return '';
  }

  const [, day, month, year] = match;

  if (!isValidDate(year, month, day)) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

function isValidDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }

  const date = new Date(Date.UTC(y, m - 1, d));

  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function parsePrice(value) {
  if (
    value === null ||
    value === undefined ||
    cleanString(value) === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? number
    : null;
}

function normalizeRecord(record) {
  const modal = parsePrice(record.modal_price);

  if (modal === null) {
    return null;
  }

  const min = parsePrice(record.min_price);
  const max = parsePrice(record.max_price);

  return {
    market: cleanString(record.market),
    district: cleanString(record.district),
    state: cleanString(record.state),
    commodity: cleanString(record.commodity),
    variety: cleanString(record.variety),
    min: min !== null ? min : modal,
    max: max !== null ? max : modal,
    modal,
    date: toISO(record.arrival_date),
  };
}

/**
 * Requests matching records from data.gov.in.
 * Throws on upstream errors instead of pretending that
 * missing records mean a different geographic scope.
 */
async function query(key, commodity, state, district) {
  const allRecords = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      'api-key': key,
      format: 'json',
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
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

    let response;
    let data;

    try {
      response = await fetch(
        `${API_BASE}?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        // Do not include the request URL: it contains the API key.
        throw new Error(`Upstream HTTP ${response.status}`);
      }

      data = await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Upstream request timed out');
      }

      if (error instanceof SyntaxError) {
        throw new Error('Upstream returned invalid JSON');
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

/**
 * Defensive filtering prevents records from another district
 * or state being presented as a local match.
 */
function matchesLocation(record, state, district) {
  if (normalizeText(record.state) !== normalizeText(state)) {
    return false;
  }

  if (
    district &&
    normalizeText(record.district) !== normalizeText(district)
  ) {
    return false;
  }

  return true;
}

/**
 * Keep the newest record per state, district, market and variety.
 * Records without a market name are discarded because they
 * cannot be reliably identified as a market.
 */
function normalizeMarkets(records, state, district) {
  const byMarket = new Map();

  for (const record of records) {
    if (!matchesLocation(record, state, district)) {
      continue;
    }

    const item = normalizeRecord(record);

    if (!item || !item.market) {
      continue;
    }

    // Discard impossible price ranges.
    if (item.min > item.max) {
      continue;
    }

    const key = [
      normalizeText(item.state),
      normalizeText(item.district),
      normalizeText(item.market),
      normalizeText(item.variety),
    ].join('|');

    const previous = byMarket.get(key);

    if (!previous) {
      byMarket.set(key, item);
      continue;
    }

    // Keep the newest dated record.
    // If dates are equal or missing, retain the first record.
    if (
      item.date &&
      (!previous.date || item.date > previous.date)
    ) {
      byMarket.set(key, item);
    }
  }

  return [...byMarket.values()].sort((a, b) => {
    const dateComparison = (b.date || '').localeCompare(
      a.date || ''
    );

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return a.market.localeCompare(b.market);
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

  const apiKey = process.env.DATA_GOV_API_KEY;

  if (!apiKey) {
    return send(res, 503, {
      error: 'not_configured',
      message: 'The mandi API is not configured on the server.',
    });
  }

  const crop = cleanString(req.query.crop).toLowerCase();
  const commodity = COMMODITY[crop];

  const state = cleanString(req.query.state);
  const district = cleanString(req.query.district);

  if (!commodity || !state) {
    return send(res, 400, {
      error: 'bad_request',
      message: 'A supported crop and state are required.',
      supportedCrops: Object.keys(COMMODITY),
    });
  }

  if (state.length > 100 || district.length > 100) {
    return send(res, 400, {
      error: 'bad_request',
      message: 'The state or district name is too long.',
    });
  }

  try {
    // Critical fix:
    // If a district is supplied, search ONLY that district.
    // Never silently broaden the search to the entire state.
    const records = await query(
      apiKey,
      commodity,
      state,
      district
    );

    const markets = normalizeMarkets(
      records,
      state,
      district
    );

    const scope = district ? 'district' : 'state';

    const result = markets.slice(0, MAX_RESULTS);

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

        // Number of returned market entries.
        count: result.length,

        // Number of distinct market/variety entries found.
        totalCount: markets.length,

        // True means the configured page limit may have truncated
        // the upstream search.
        possiblyTruncated: records.length >= PAGE_SIZE * MAX_PAGES,

        markets: result,
        updatedAt: new Date().toISOString(),
        source: 'data.gov.in',
        message: result.length
          ? null
          : district
            ? 'No matching mandi prices were found for this district and crop. No state-wide fallback was applied.'
            : 'No matching mandi prices were found for this state and crop.',
      },
      `public, max-age=${CACHE_SECONDS}`
    );
  } catch (error) {
    // Never log the API key, request URL, or credentials.
    console.error(
      'Mandi API request failed:',
      error.message
    );

    return send(res, 502, {
      error: 'upstream_failed',
      message:
        'Could not retrieve mandi prices. Please try again later.',
    });
  }
};
