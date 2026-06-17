// Quantora backend - Macro engine (FRED economic data + AI strategist read).
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.FRED_KEY;
  if (!key) { res.status(200).json({ error: 'no_key' }); return; }
  const series = [
    { id: 'FEDFUNDS', name: 'Fed Funds Rate', unit: '%' },
    { id: 'DGS10', name: '10-Year Treasury', unit: '%' },
    { id: 'T10Y2Y', name: '10Y-2Y Spread', unit: '%' },
    { id: 'UNRATE', name: 'Unemployment', unit: '%' },
    { id: 'T10YIE', name: 'Inflation (10Y breakeven)', unit: '%' },
    { id: 'VIXCLS', name: 'VIX (volatility)', unit: '' }
  ];
  async function one(s) {
    try {
      const u = 'https://api.stlouisfed.org/fred/series/observations?series_id=' + s.id + '&api_key=' + key + '&file_type=json&sort_order=desc&limit=10';
      const r = await fetch(u);
      const d = await r.json();
      const obs = (d.observations || []).filter(function (o) { return o.value && o.value !== '.'; }).map(function (o) { return { date: o.date, value: parseFloat(o.value) }; });
      if (obs.length < 2) return null;
      return { name: s.name, unit: s.unit, value: obs[0].value, change: obs[0].value - obs[1].value, date: obs[0].date };
    } catch (e) { return null; }
  }
  const results = (await Promise.all(series.map(one))).filter(Boolean);
  if (!results.length) { res.status(200).json({ error: 'feed' }); return; }
  let aiRead = null;
  const gk = process.env.GROQ_KEY;
  if (gk) {
    const lines = results.map(function (r) { return r.name + ': ' + r.value + r.unit + ' (' + (r.change >= 0 ? '+' : '') + r.change.toFixed(2) + ' vs prior)'; }).join('; ');
    const prompt = 'You are the chief macro strategist at Quantora. Write a concise 4 to 5 sentence read on the current US macro backdrop using these latest figures: ' + lines + '. Interpret the rate environment, the yield curve and recession signal, inflation expectations, and market volatility, and end with what it implies for risk assets. Be specific, cite figures, no hype, no advice, no disclaimers in the text.';
    try {
      const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + gk, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 380, messages: [{ role: 'user', content: prompt }] }) });
      const gd = await gr.json();
      const t = gd && gd.choices && gd.choices[0] && gd.choices[0].message && gd.choices[0].message.content;
      if (t) aiRead = t.trim();
    } catch (e) {}
  }
  res.setHeader('Cache-Control', 's-maxage=900');
  res.status(200).json({ indicators: results, aiRead: aiRead });
};
