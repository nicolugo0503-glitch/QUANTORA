// Quantora backend - News pulse. Takes headlines from the client wire, returns an AI market-pulse summary.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') { res.status(200).json({ error: 'method' }); return; }
  const gk = process.env.GROQ_KEY;
  if (!gk) { res.status(200).json({ error: 'no_key' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const heads = ((body && body.heads) || '').toString().slice(0, 3500);
  if (!heads) { res.status(200).json({ error: 'no_heads' }); return; }
  const prompt = 'You are Quantora\'s markets desk. Here are the latest market headlines:\n' + heads + '\n\nWrite a tight 4 to 5 sentence "market pulse": the dominant themes across these stories, the overall sentiment (risk-on or risk-off), and what a trader should pay attention to. Be specific and reference the actual stories, no hype, no investment advice, no disclaimers in the text.';
  try {
    const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + gk, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 380, messages: [{ role: 'user', content: prompt }] }) });
    const gd = await gr.json();
    const t = gd && gd.choices && gd.choices[0] && gd.choices[0].message && gd.choices[0].message.content;
    if (!t) { res.status(200).json({ error: 'ai' }); return; }
    res.status(200).json({ summary: t.trim() });
  } catch (e) { res.status(200).json({ error: 'ai' }); }
};
