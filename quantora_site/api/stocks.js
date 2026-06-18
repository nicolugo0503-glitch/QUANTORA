// Quantora backend - Stocks. Live US equity tape via Twelve Data + AI equities-desk read.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.TWELVEDATA_KEY;
  if (!key) { res.status(200).json({ error: 'no_key' }); return; }
  const SYMS = ['SPY', 'QQQ', 'DIA', 'AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN'];
  const NAME = { SPY: 'S&P 500 ETF', QQQ: 'Nasdaq 100 ETF', DIA: 'Dow Jones ETF', AAPL: 'Apple', NVDA: 'NVIDIA', MSFT: 'Microsoft', TSLA: 'Tesla', AMZN: 'Amazon' };
  let rows = [];
  try {
    const u = 'https://api.twelvedata.com/quote?symbol=' + SYMS.join(',') + '&apikey=' + key;
    const r = await fetch(u);
    const d = await r.json();
    SYMS.forEach(function (s) {
      const o = d[s];
      if (o && o.close && !o.code) {
        rows.push({ symbol: s, name: NAME[s] || (o.name || s), price: parseFloat(o.close), changePct: parseFloat(o.percent_change), change: parseFloat(o.change) });
      }
    });
  } catch (e) {}
  if (!rows.length) { res.status(200).json({ error: 'feed' }); return; }
  let aiRead = null;
  const gk = process.env.GROQ_KEY;
  if (gk) {
    const line = rows.map(function (x) { return x.symbol + ' ' + x.price.toFixed(2) + ' (' + (x.changePct >= 0 ? '+' : '') + x.changePct.toFixed(2) + '%)'; }).join(', ');
    const prompt = 'You are Quantora\'s equities desk. Here is the live US equity tape: ' + line + '. Write a tight 3 to 4 sentence read on what the tape is saying today: the leaders, the laggards, and the overall risk tone. Be specific, cite tickers and moves, no hype, no investment advice, no disclaimers in the text.';
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
