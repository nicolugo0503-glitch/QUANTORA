// QUANTORA · FMP proxy (single consolidated function). Set FMP_KEY in Vercel env to activate.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  const KEY = process.env.FMP_KEY;
  if (!KEY) { res.status(200).json({ error: 'nokey' }); return; }
  const type = (req.query.type || '').toString();
  const sym = (req.query.symbol || '').toString().replace(/[^A-Za-z0-9.\-]/g, '').toUpperCase();
  const MAP = {
    quote:    () => 'quote?symbol=' + sym,
    profile:  () => 'profile?symbol=' + sym,
    targets:  () => 'price-target-consensus?symbol=' + sym,
    ratings:  () => 'ratings-snapshot?symbol=' + sym,
    metrics:  () => 'key-metrics?symbol=' + sym + '&limit=1',
    peers:    () => 'stock-peers?symbol=' + sym,
    insider:  () => sym ? ('insider-trading/search?symbol=' + sym + '&page=0&limit=12')
                        : ('insider-trading/latest?page=0&limit=15'),
    senate:   () => sym ? ('senate-trades?symbol=' + sym) : ('senate-latest?page=0&limit=15'),
    house:    () => 'house-latest?page=0&limit=15',
    estimates:() => 'analyst-estimates?symbol=' + sym + '&period=annual&page=0&limit=5',
    thirteenf:() => 'institutional-ownership/symbol-positions-summary?symbol=' + sym + '&page=0&limit=1',
    etfhold:  () => 'etf/holdings?symbol=' + sym,
    etfsector:() => 'etf/sector-weightings?symbol=' + sym,
    gainers:  () => 'biggest-gainers',
    actives:  () => 'most-actives',
    news:     () => 'news/stock-latest?page=0&limit=12'
  };
  const build = MAP[type];
  if (!build) { res.status(200).json({ error: 'badtype' }); return; }
  try {
    const url = 'https://financialmodelingprep.com/stable/' + build() + '&apikey=' + KEY;
    const r = await fetch(url);
    const j = await r.json();
    res.status(200).json({ data: j });
  } catch (e) { res.status(200).json({ error: 'feed' }); }
};
