// Quantora backend - Ask Quantora (conversational AI analyst, grounded in live data).
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') { res.status(405).json({ error: 'post_only' }); return; }
  const gk = process.env.GROQ_KEY;
  if (!gk) { res.status(200).json({ error: 'no_key' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const q = ((body && body.q) || '').toString().slice(0, 600);
  if (!q) { res.status(200).json({ error: 'empty' }); return; }
  const sym = ((body && body.symbol) || '').toString().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  const CRYPTO = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT', 'LTC', 'BCH', 'UNI', 'ATOM'];
  let ctx = ''; let grounded = false;
  if (sym && CRYPTO.indexOf(sym) >= 0) {
    try {
      const u = 'https://api.exchange.coinbase.com/products/' + sym + '-USD/candles?granularity=86400';
      const r = await fetch(u, { headers: { 'User-Agent': 'Quantora' } });
      const c = await r.json();
      if (Array.isArray(c) && c.length > 30) {
        const closes = c.map(function (x) { return x[4]; }).slice(0, 40).reverse();
        const last = closes[closes.length - 1];
        const ret30 = ((last / closes[Math.max(0, closes.length - 31)]) - 1) * 100;
        const rets = []; for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
        const mean = rets.reduce(function (a, b) { return a + b; }, 0) / rets.length;
        const v = Math.sqrt(rets.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / rets.length) * Math.sqrt(365) * 100;
        let g = 0, l = 0; for (let i = closes.length - 14; i < closes.length; i++) { const d = closes[i] - closes[i - 1]; if (d >= 0) g += d; else l -= d; }
        const rs = l === 0 ? 100 : g / l; const rsi = 100 - 100 / (1 + rs);
        ctx = 'Live Quantora data for ' + sym + ': price $' + last.toFixed(2) + ', 30-day return ' + ret30.toFixed(1) + '%, annualized volatility ' + v.toFixed(0) + '%, RSI(14) ' + rsi.toFixed(0) + '.';
        grounded = true;
      }
    } catch (e) {}
  }
  const sys = 'You are Quantora, an AI markets analyst built into a professional finance terminal. Answer concisely, specifically, and with structure. When given live data, cite the exact figures. Briefly explain your reasoning. Stay analytical and do not give personalized investment advice. Avoid long disclaimers.';
  const msgs = [{ role: 'system', content: sys }];
  if (ctx) msgs.push({ role: 'system', content: ctx });
  msgs.push({ role: 'user', content: q });
  try {
    const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + gk, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.5, max_tokens: 600, messages: msgs }) });
    const gd = await gr.json();
    const t = gd && gd.choices && gd.choices[0] && gd.choices[0].message && gd.choices[0].message.content;
    res.status(200).json({ text: (t || '').trim(), grounded: grounded, symbol: grounded ? sym : null });
  } catch (e) { res.status(200).json({ error: 'ai_fail' }); }
};
