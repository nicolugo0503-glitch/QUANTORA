// Quantora backend - News.
//   GET  /api/news   -> market news with real photos (Finnhub photo field first, og:image as a bonus)
//   POST /api/news {heads} -> AI "market pulse" summary of the supplied headlines (Groq)
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }

  if (req.method === 'GET') {
    const FH = process.env.FINNHUB_KEY;
    if (!FH) { res.status(200).json({ error: 'no_key' }); return; }
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=7200');
    // a bad image = a source logo or generic branding, not a real article photo
    function isBad(u) { u = (u || '') + ''; return !/^https?:\/\//.test(u) || /finnhub\/logo|\/logo[\/._-]|logo\.(png|jpe?g|svg|gif)|placeholder|default-?(image|thumb)/i.test(u); }
    function fmt(d) { return d.toISOString().slice(0, 10); }
    async function ogImage(url) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(function () { ctrl.abort(); }, 4500);
        const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36', 'accept': 'text/html,application/xhtml+xml', 'accept-language': 'en-US,en;q=0.9' } });
        clearTimeout(t);
        if (!r.ok) return '';
        const html = (await r.text()).slice(0, 300000);
        const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
        let u = m ? m[1] : '';
        if (u.indexOf('//') === 0) u = 'https:' + u;
        return (/^https?:\/\//.test(u) && !isBad(u)) ? u : '';
      } catch (e) { return ''; }
    }
    try {
      const to = new Date(), from = new Date(Date.now() - 3 * 864e5);
      const syms = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META'];
      const urls = ['https://finnhub.io/api/v1/news?category=general&token=' + FH]
        .concat(syms.map(function (s) { return 'https://finnhub.io/api/v1/company-news?symbol=' + s + '&from=' + fmt(from) + '&to=' + fmt(to) + '&token=' + FH; }));
      const results = await Promise.all(urls.map(function (u) { return fetch(u).then(function (r) { return r.json(); }).catch(function () { return []; }); }));
      let all = [];
      results.forEach(function (arr) { if (Array.isArray(arr)) all = all.concat(arr); });
      const seen = {}, items = [];
      all.forEach(function (a) {
        if (!a || !a.headline || !a.url || seen[a.headline]) return; seen[a.headline] = 1;
        items.push({ headline: a.headline, summary: (a.summary || '').toString().slice(0, 260), image: (a.image || '').toString(), source: (a.source || '').toString(), url: (a.url || '').toString(), datetime: +a.datetime || 0 });
      });
      // reliable photos already in the Finnhub image field (CNBC, Motley Fool, etc.): real + unique
      const ffreq = {};
      items.forEach(function (it) { if (it.image && !isBad(it.image)) ffreq[it.image] = (ffreq[it.image] || 0) + 1; });
      items.forEach(function (it) { it.fh = (it.image && !isBad(it.image) && ffreq[it.image] === 1) ? it.image : ''; });
      // put stories that already have a real photo first, then by recency
      items.sort(function (a, b) { return (b.fh ? 1 : 0) - (a.fh ? 1 : 0) || b.datetime - a.datetime; });
      const top = items.slice(0, 18);
      // use the reliable photo where present; scrape og:image for the rest
      await Promise.all(top.map(async function (it) {
        if (it.fh) { it.image = it.fh; return; }
        const og = await ogImage(it.url);
        it.image = og || '';
      }));
      // drop any image that ended up repeating (leftover branding)
      const ifreq = {};
      top.forEach(function (it) { if (it.image) ifreq[it.image] = (ifreq[it.image] || 0) + 1; });
      top.forEach(function (it) { if (ifreq[it.image] > 1) it.image = ''; });
      const withImg = top.filter(function (it) { return it.image; });
      const noImg = top.filter(function (it) { return !it.image; });
      const out = withImg.concat(noImg).slice(0, 18);
      res.status(200).json({ articles: out, photos: withImg.length });
    } catch (e) { res.status(200).json({ error: 'feed' }); }
    return;
  }

  // ---- POST: AI market-pulse summary of client-supplied headlines ----
  if (req.method !== 'POST') { res.status(200).json({ error: 'method' }); return; }
  const gk = process.env.GROQ_KEY;
  if (!gk) { res.status(200).json({ error: 'no_key' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const heads = ((body && body.heads) || '').toString().slice(0, 3500);
  if (!heads) { res.status(200).json({ error: 'no_heads' }); return; }
  const prompt = 'You are Quantora\'s markets desk. Here are the latest market headlines:\n' + heads + '\n\nWrite a tight 4 to 5 sentence "market pulse": the dominant themes across these stories, the overall sentiment (risk-on or risk-off), and what a trader should watch next. Be specific and reference the actual stories. No preamble, no bullet points, no markdown.';
  try {
    const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + gk, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 380, messages: [{ role: 'user', content: prompt }] })
    });
    const gd = await gr.json();
    const t = gd && gd.choices && gd.choices[0] && gd.choices[0].message && gd.choices[0].message.content;
    if (!t) { res.status(200).json({ error: 'ai' }); return; }
    res.status(200).json({ summary: t.trim() });
  } catch (e) { res.status(200).json({ error: 'ai' }); }
};
