
/**
 * GET /api/news?lang=en|hi&state=West%20Bengal
 * Vercel Serverless Function
 */

const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, '')
  .trim();

const pick = (block, tag) => {
  const match = new RegExp(
    `<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}\\s*>`, 'i'
  ).exec(block);

  return match ? decode(match[1]) : '';
};

function parseRSS(xml) {
  const items = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = re.exec(xml)) && items.length < 20) {
    const block = match[1];
    let title = pick(block, 'title');
    let source = pick(block, 'source');
    const link = pick(block, 'link');
    const pub = pick(block, 'pubDate');

    const separator = title.lastIndexOf(' - ');
    if (separator > 0) {
      if (!source) source = title.slice(separator + 3);
      title = title.slice(0, separator);
    }

    const date = pub ? new Date(pub) : null;

    if (title && link) {
      items.push({
        title,
        source,
        link,
        published:
          date && !Number.isNaN(date.getTime())
            ? date.toISOString()
            : ''
      });
    }
  }

  return items;
}

module.exports = async function handler(req, res) {
  // GET only
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const lang = req.query.lang === 'hi' ? 'hi' : 'en';

  const state = String(req.query.state || '')
    .trim()
    .slice(0, 60);

  const terms = lang === 'hi'
    ? `किसान OR कृषि OR मंडी OR फसल ${state || 'भारत'} when:7d`
    : `farmers OR agriculture OR mandi OR "crop prices" OR monsoon ${state || 'India'} when:7d`;

  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(terms) +
    `&hl=${lang === 'hi' ? 'hi' : 'en-IN'}` +
    `&gl=IN&ceid=${lang === 'hi' ? 'IN:hi' : 'IN:en'}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'KrishiDost/1.0' }
    });

    if (!response.ok) {
      throw new Error(`News provider returned ${response.status}`);
    }

    const xml = await response.text();
    const items = parseRSS(xml);

    items.sort((a, b) =>
      (b.published || '').localeCompare(a.published || '')
    );

    // Shared CDN cache: 15 minutes.
    // Permit stale responses while the cache refreshes.
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=900, stale-while-revalidate=1800'
    );

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    return res.status(200).json({
      items: items.slice(0, 6)
    });
  } catch (error) {
    // Do not cache an error as a successful news response.
    res.setHeader('Cache-Control', 'no-store');

    return res.status(502).json({
      error: 'upstream_failed',
      message: 'News is temporarily unavailable. Please try again later.'
    });
  } finally {
    clearTimeout(timer);
  }
};
