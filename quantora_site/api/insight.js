// Quantora backend - AI analyst read (Vercel serverless function).
// Uses a free LLM API (Groq). Key lives in env var GROQ_KEY, never in client code.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const key = process.env.GROQ_KEY;
  if (!key) { res.status(200).json({ error: 'no_key' }); return; }
  let m = req.body;
  if (!m || typeof m === 'string') {
    try { let raw = ''; for await (const c of req) raw += c; m = JSON.parse(raw || '{}'); } catch (e) { m = {}; }
  }
  const kind = m.kind === 'crypto' ? 'cryptocurrency' : 'stock';
  const prompt = 'You are a precise markets analyst at Quantora. Write a sharp, professional read of about 4 sentences on the ' + kind + ' ' + (m.name || m.symbol) + '. Cite these computed live figures naturally: last price ' + m.price + ', latest period move ' + m.change + '%, 30-period return ' + m.ret30 + '%, annualized volatility ' + m.vol + '%, RSI ' + m.rsi + ', max drawdown ' + m.drawdown + '%, technical signal ' + m.signal + '. Be specific and grounded, explain what the signal and risk imply, name the single biggest risk, and end plainly. No hype, no buy/sell recommendation, no disclaimers in the text.';
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 320, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    const text = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    if (!text) { res.status(200).json({ error: 'feed', message: (d && d.error && d.error.message) || 'no text' }); return; }
    res.status(200).json({ text: text.trim() });
  } catch (e) { res.status(200).json({ error: 'fetch' }); }
};
