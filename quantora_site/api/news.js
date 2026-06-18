// Quantora backend - News. Live market wire (CryptoCompare with Reddit fallback) + AI market-pulse.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  async function tryCC() {
    try {
      const r = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
      const d = await r.json();
      const list = (d && d.Data) || [];
      return list.slice(0, 16).map(function (a) {
        return { title: a.title, source: (a.source_info && a.source_info.name) || a.source || '', url: a.url, ts: a.published_on, body: (a.body || '').slice(0, 200) };
      });
    } catch (e) { return []; }
  }
  async function tryReddit() {
    try {
      const r = await fetch('https://www.reddit.com/r/CryptoCurrency/hot.json?limit=24', { headers: { 'User-Agent': 'QuantoraBot/1.0 (+https://usequantora.com)' } });
      const d = await r.json();
      const ch = (d && d.data && d.data.children) || [];
      return ch.filter(function (c) { return c.data && !c.data.stickied; }).slice(0, 16).map(function (c) {
        const p = c.data;
        const ext = p.url_overridden_by_dest && /^https?:/.test(p.url_overridden_by_dest);
        return { title: p.title, source: ext ? (p.domain || 'r/CryptoCurrency') : 'r/CryptoCurrency', url: ext ? p.url_overridden_by_dest : ('https://www.reddit.com' + p.permalink), ts: Math.floor(p.created_utc || 0), body: (p.selftext || '').slice(0, 200) };
      });
    } catch (e) { return []; }
  }
  let articles = await tryCC();
  if (!articles.length) articles = await tryReddit();
  if (!articles.length) { res.status(200).json({ error: 'feed' }); return; }
  let summary = null;
  const gk = process.env.GROQ_KEY;
  if (gk) {
    const heads = articles.slice(0, 12).map(function (a, i) { return (i + 1) + '. ' + a.title + ' (' + a.source + ')'; }).join('\n');
    const prompt = 'You are Quantora\'s markets desk. Here are the latest market headlines:\n' + heads + '\n\nWrite a tight 4 to 5 sentence "market pulse": the dominant themes across these stories, the overall sentiment (risk-on or risk-off), and what a trader should pay attention to. Be specific and reference the actual stories, no hype, no investment advice, no disclaimers in the text.';
    try {
      const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + gk, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 380, messages: [{ role: 'user', content: prompt }] }) });
      const gd = await gr.json();
      const t = gd && gd.choices && gd.choices[0] && gd.choices[0].message && gd.choices[0].message.content;
      if (t) summary = t.trim();
    } catch (e) {}
  }
  res.setHeader('Cache-Control', 's-maxage=300');
  res.status(200).json({ articles: articles, summary: summary });
};
