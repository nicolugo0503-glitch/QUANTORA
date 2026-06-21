module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  const KEY = process.env.FRED_KEY;
  if (!KEY) { res.status(200).json({ error: 'nokey' }); return; }
  const SERIES = [
    { id: 'FEDFUNDS', name: 'Fed Funds Rate', unit: '%' },
    { id: 'DGS10', name: '10-Year Treasury', unit: '%' },
    { id: 'T10Y2Y', name: '10Y–2Y Spread', unit: '%' },
    { id: 'T10Y3M', name: '10Y–3M Spread', unit: '%' },
    { id: 'DGS3MO', name: '3-Month Treasury', unit: '%' },
    { id: 'DGS1MO', name: '1-Month Treasury', unit: '%' },
    { id: 'DGS2', name: '2-Year Treasury', unit: '%' },
    { id: 'DGS5', name: '5-Year Treasury', unit: '%' },
    { id: 'DGS30', name: '30-Year Treasury', unit: '%' },
    { id: 'T10YIE', name: 'Inflation (10Y breakeven)', unit: '%' },
    { id: 'UNRATE', name: 'Unemployment', unit: '%' },
    { id: 'VIXCLS', name: 'VIX (volatility)', unit: '' }
  ];
  const start = new Date(); start.setMonth(start.getMonth() - 31);
  const sd = start.toISOString().slice(0, 10);
  try {
    const out = [];
    for (const s of SERIES) {
      const u = 'https://api.stlouisfed.org/fred/series/observations?series_id=' + s.id +
        '&api_key=' + KEY + '&file_type=json&observation_start=' + sd +
        '&frequency=m&aggregation_method=avg&sort_order=asc';
      try {
        const j = await (await fetch(u)).json();
        const pts = (j.observations || [])
          .filter(o => o.value !== '.' && o.value !== '')
          .map(o => ({ d: o.date.slice(0, 7), v: +(+o.value).toFixed(2) }));
        if (pts.length < 2) continue;
        const latest = pts[pts.length - 1].v, prev = pts[pts.length - 2].v;
        out.push({ id: s.id, name: s.name, unit: s.unit, latest, change: +(latest - prev).toFixed(2), points: pts });
      } catch (e) {}
    }
    if (!out.length) { res.status(200).json({ error: 'feed' }); return; }
    res.status(200).json({ indicators: out });
  } catch (e) { res.status(200).json({ error: 'feed' }); }
};
