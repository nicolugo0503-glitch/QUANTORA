// Quantora backend - Global Events. Cached GDELT proxy. Parallel simple-term queries
// (GDELT rejects complex OR/quoted queries; sequential calls time out — so fetch in parallel).
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');
  const TERMS = ['markets', 'economy', 'inflation', 'bitcoin'];
  const UA = { headers: { 'User-Agent': 'Quantora/1.0 (research; contact@usequantora.com)' } };
  async function gj(u){ try{ const r = await fetch(u, UA); const t = await r.text(); return JSON.parse(t); }catch(e){ return null; } }
  const art = 'https://api.gdeltproject.org/api/v2/doc/doc?mode=artlist&format=json&maxrecords=20&sort=datedesc&timespan=3d&query=';
  const toneUrl = 'https://api.gdeltproject.org/api/v2/doc/doc?mode=timelinetone&format=json&timespan=7d&query=' + encodeURIComponent('markets');
  try {
    const reqs = TERMS.map(function (t) { return gj(art + encodeURIComponent(t)); });
    reqs.push(gj(toneUrl));
    const out = await Promise.all(reqs);
    const toneRes = out.pop();
    let all = [];
    out.forEach(function (j) { if (j && Array.isArray(j.articles)) all = all.concat(j.articles); });
    const seen = {}, uniq = [];
    all.forEach(function (a) { if (!a || !a.title || !a.url) return; const k = a.title.toLowerCase().slice(0, 60); if (!seen[k]) { seen[k] = 1; uniq.push(a); } });
    uniq.sort(function (a, b) { return (b.seendate || '').localeCompare(a.seendate || ''); });
    const tone = (toneRes && toneRes.timeline && toneRes.timeline[0] && toneRes.timeline[0].data) || [];
    if (!uniq.length) { res.status(200).json({ error: 'feed' }); return; }
    res.status(200).json({ articles: uniq.slice(0, 24), tone: tone });
  } catch (e) { res.status(200).json({ error: 'feed' }); }
};
