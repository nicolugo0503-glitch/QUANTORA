// Quantora backend - Global. Live FX & commodities tape via Twelve Data + AI macro-desk read.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.TWELVEDATA_KEY;
  if (!key) { res.status(200).json({ error: 'no_key' }); return; }
  const DEF = [
    { s: 'EUR/USD', n: 'Euro / US Dollar', c: 'FX' },
    { s: 'GBP/USD', n: 'British Pound / USD', c: 'FX' },
    { s: 'USD/JPY', n: 'US Dollar / Yen', c: 'FX' },
    { s: 'AUD/USD', n: 'Aussie / US Dollar', c: 'FX' },
    { s: 'XAU/USD', n: 'Gold (spot)', c: 'Commodity' },
    { s: 'XAG/USD', n: 'Silver (spot)', c: 'Commodity' },
    { s: 'USO', n: 'Crude Oil (USO ETF)', c: 'Commodity' }
  ];
  let rows = [];
  try {
    const syms = DEF.map(function (x) { return encodeURIComponent(x.s); }).join(',');
    const u = 'https://api.twelvedata.com/quote?symbol=' + syms + '&apikey=' + key;
    const r = await fetch(u);
    const d = await r.json();
    DEF.forEach(function (it) {
      const o = d[it.s];
      if (o && o.close && !o.code) {
        rows.push({ symbol: it.s, name: it.n, cls: it.c, price: parseFloat(o.close), changePct: parseFloat(o.percent_change) });
      }
    });
  } catch (e) {}
  if (!rows.length) { res.status(200).json({ error: 'feed' }); return; }
  let aiRead = null;
  const gk = process.env.GROQ_KEY;
  if (gk) {
    const line = rows.map(function (x) { return x.symbol + ' ' + x.price + ' (' + (x.changePct >= 0 ? '+' : '') + x.changePct.toFixed(2) + '%)'; }).join(', ');
    const prompt = 'You are Quantora\'s global macro desk. Here is the live cross-asset tape of FX and commodities: ' + line + '. Write a tight 3 to 4 sentence read: dollar strength or weakness, what gold and oil are signaling, and the overall risk tone. Be specific, cite levels and moves, no hype, no investment advice, no disclaimers in the text.';
    try {
      const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + gk, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 300, messages: [{ role: 'user', content: prompt }] }) });
      const gd = await gr.json();
      const t = gd && gd.choices && gd.choices[0] && gd.choices[0].message && gd.choices[0].message.content;
      if (t) aiRead = t.trim();
    } catch (e) {}
  }
  res.setHeader('Cache-Control', 's-maxage=300');
  res.status(200).json({ rows: rows, aiRead: aiRead });
};
