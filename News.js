/**
 * GET /api/news?lang=en|hi&state=West%20Bengal
 *
 * Returns the latest farm-related headlines from the Google News RSS feed.
 * Only headline, source, link and time are returned; full stories stay on the publisher's site.
 * No API key needed.
 */

const json = (statusCode, body, cache = 'no-store') => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cache,
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, '')
  .trim();

const pick = (block, tag) => {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  return m ? decode(m[1]) : '';
};

function parseRSS(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) && items.length < 20) {
    const block = m[1];
    let title = pick(block, 'title');
    let source = pick(block, 'source');
    const link = pick(block, 'link');
    const pub = pick(block, 'pubDate');

    // Google News appends " - Publisher" to titles.
    const i = title.lastIndexOf(' - ');
    if (i > 0) {
      if (!source) source = title.slice(i + 3);
      title = title.slice(0, i);
    }
    const d = pub ? new Date(pub) : null;
    if (title && link) {
      items.push({
        title,
        source,
        link,
        published: d && !Number.isNaN(d.getTime()) ? d.toISOString() : '',
      });
    }
  }
  return items;
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const hi = q.lang === 'hi';
  const state = (q.state || '').trim().slice(0, 60);

  const terms = hi
    ? `किसान OR कृषि OR मंडी OR फसल ${state || 'भारत'} when:7d`
    : `farmers OR agriculture OR mandi OR "crop prices" OR monsoon ${state || 'India'} when:7d`;

  const url = 'https://news.google.com/rss/search'
    + `?q=${encodeURIComponent(terms)}`
    + `&hl=${hi ? 'hi' : 'en-IN'}&gl=IN&ceid=${hi ? 'IN:hi' : 'IN:en'}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'KrishiDost/1.0' } });
    if (!res.ok) throw new Error(`Google News responded ${res.status}`);
    const items = parseRSS(await res.text());
    items.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    return json(200, { items: items.slice(0, 6) }, 'public, max-age=900');
  } catch (err) {
    return json(502, { error: 'upstream_failed' });
  } finally {
    clearTimeout(timer);
  }
};