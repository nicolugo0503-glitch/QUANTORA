// Quantora backend - Global Events. Cached GDELT proxy (server-side, CORS-safe, rate-limit-safe).
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');
  const Q = encodeURIComponent('(economy OR markets OR inflation OR "central bank" OR bitcoin OR recession)');
  const base = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' + Q + '&format=json';
  async function gj(u){ try{ const r = await fetch(u, {headers:{'User-Agent':'Quantora/1.0 (research)'}}); const t = await r.text(); return JSON.parse(t); }catch(e){ return null; } }
  try {
    const a = (await gj(base + '&mode=artlist&maxrecords=24&sort=datedesc&timespan=3d')) || {};
    const t = (await gj(base + '&mode=timelinetone&timespan=7d')) || {};
    const articles = a.articles || [];
    const tone = (t.timeline && t.timeline[0] && t.timeline[0].data) || [];
    if (!articles.length) { res.status(200).json({ error: 'feed' }); return; }
    res.status(200).json({ articles: articles, tone: tone });
  } catch (e) { res.status(200).json({ error: 'feed' }); }
};
