// Quantora backend - News.
//   GET  /api/news   -> latest market news WITH real photos (Finnhub general + company-news, logos stripped)
//   POST /api/news {heads} -> AI "market pulse" summary of the supplied headlines (Groq)
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }

  // ---- GET: fetch real market news (prefer real article photos over source logos) ----
  if (req.method === 'GET') {
    const FH = process.env.FINNHUB_KEY;
    if (!FH) { res.status(200).json({ error: 'no_key' }); return; }
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    function isLogo(u) { u = (u || '') + ''; return !/^https?:\/\//.test(u) || /finnhub\/logo|\/logo[\/._-]|logo\.(png|jpe?g|svg|gif)/i.test(u); }
    function fmt(d) { return d.toISOString().slice(0, 10); }
    try {
      const to = new Date(), from = new Date(Date.now() - 3 * 864e5);
      const syms = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD'];
      const urls = ['https://finnhub.io/api/v1/news?category=general&token=' + FH]
        .concat(syms.map(function (s) { return 'https://finnhub.io/api/v1/company-news?symbol=' + s + '&from=' + fmt(from) + '&to=' + fmt(to) + '&token=' + FH; }));
      const results = await Promise.all(urls.map(function (u) { return fetch(u).then(function (r) { return r.json(); }).catch(function () { return []; }); }));
      let all = [];
      results.forEach(function (arr) { if (Array.isArray(arr)) all = all.concat(arr); });
      const seen = {}, withImg = [], noImg = [];
      all.forEach(function (a) {
        if (!a || !a.headline || seen[a.headline]) return; seen[a.headline] = 1;
        const item = {
          headline: a.headline,
          summary: (a.summary || '').toString().slice(0, 260),
          image: (a.image || '').toString(),
          source: (a.source || '').toString(),
          url: (a.url || '').toString(),
          datetime: +a.datetime || 0
        };
        if (isLogo(item.image)) { item.image = ''; noImg.push(item); } else { withImg.push(item); }
      });
      withImg.sort(function (x, y) { return y.datetime - x.datetime; });
      noImg.sort(function (x, y) { return y.datetime - x.datetime; });
      const out = withImg.concat(noImg).slice(0, 24);
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
