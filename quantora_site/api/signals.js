// Quantora backend - Signals. AI head-of-signals brief over a live market scan.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  const gk = process.env.GROQ_KEY;
  if (!gk) { res.status(200).json({ error: 'no_key' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const scan = ((body && body.scan) || '').toString().slice(0, 4500);
  const fng = ((body && body.fng) || '').toString().slice(0, 120);
  if (!scan) { res.status(200).json({ error: 'no_scan' }); return; }
  const sys = 'You are the head of signals at Quantora. Given a live scan of the crypto market and the Fear and Greed index, write a punchy 4 to 6 sentence "what to watch" brief. Name the strongest momentum, the most overbought and most oversold names, any standout setups, and the overall risk posture implied by Fear and Greed. Cite specific tickers, RSI levels, and returns. Be specific and direct, no hype, no investment advice, no disclaimers in the text.';
  const userMsg = 'FEAR & GREED: ' + (fng || 'n/a') + '\n\nLIVE MARKET SCAN:\n' + scan;
  try {
    const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + gk, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 420, messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }] }) });
    const gd = await gr.json();
    const t = gd && gd.choices && gd.choices[0] && gd.choices[0].message && gd.choices[0].message.content;
    if (!t) { res.status(200).json({ error: 'ai' }); return; }
    res.status(200).json({ text: t.trim() });
  } catch (e) { res.status(200).json({ error: 'ai' }); }
};
