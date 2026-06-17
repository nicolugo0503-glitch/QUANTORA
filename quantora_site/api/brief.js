// Quantora backend - AI portfolio brief over a watchlist (Vercel serverless function).
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const key = process.env.GROQ_KEY;
  if (!key) { res.status(200).json({ error: 'no_key' }); return; }
  let m = req.body;
  if (!m || typeof m === 'string') {
    try { let raw = ''; for await (const c of req) raw += c; m = JSON.parse(raw || '{}'); } catch (e) { m = {}; }
  }
  const items = Array.isArray(m.items) ? m.items : [];
  if (!items.length) { res.status(200).json({ error: 'empty' }); return; }
  const lines = items.map(function (a) {
    return a.name + ' (' + a.symbol + '): price ' + a.price + ', 30-period return ' + a.ret30 + '%, volatility ' + a.vol + '%, RSI ' + a.rsi + ', signal ' + a.signal;
  }).join('; ');
  const prompt = 'You are the head analyst at Quantora writing a concise morning brief on a client watchlist of ' + items.length + ' assets. Data: ' + lines + '. In about 4 to 5 sentences: summarize the overall posture of the book, name the single strongest and single weakest holding with the reason, flag the biggest risk across the watchlist, and end with what to watch next. Be specific, cite figures, no hype, no buy or sell advice, and no disclaimers in the text.';
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 420, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    const text = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    if (!text) { res.status(200).json({ error: 'feed', message: (d && d.error && d.error.message) || 'no text' }); return; }
    res.status(200).json({ text: text.trim() });
  } catch (e) { res.status(200).json({ error: 'fetch' }); }
};
