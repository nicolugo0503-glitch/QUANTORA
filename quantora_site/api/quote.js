// Quantora backend - secure stock-data proxy (Vercel serverless function).
// The API key lives in a Vercel Environment Variable (TWELVEDATA_KEY),
// so it is never exposed in the public site or in client code.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const symbol = String((req.query && req.query.symbol) || '').toUpperCase().trim();
  const key = process.env.TWELVEDATA_KEY;
  if (!key) {
    res.status(200).json({ error: 'no_key', message: 'Stock data not configured yet. Add TWELVEDATA_KEY in Vercel Environment Variables.' });
    return;
  }
  if (!/^[A-Z.\-]{1,12}$/.test(symbol)) {
    res.status(400).json({ error: 'bad_symbol' });
    return;
  }
  try {
    const url = 'https://api.twelvedata.com/time_series?symbol=' + encodeURIComponent(symbol) + '&interval=1day&outputsize=120&apikey=' + key;
    const r = await fetch(url);
    const d = await r.json();
    if (!d || !Array.isArray(d.values) || d.values.length < 2) {
      res.status(200).json({ error: 'feed', message: (d && (d.message || d.status)) || ('No data for ' + symbol) });
      return;
    }
    const vals = d.values.slice().reverse();
    const closes = vals.map(function (v) { return parseFloat(v.close); }).filter(function (n) { return !isNaN(n); });
    const dates = vals.map(function (v) { return v.datetime; });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ symbol: symbol, closes: closes, dates: dates });
  } catch (e) {
    res.status(200).json({ error: 'fetch', message: 'Upstream feed unavailable.' });
  }
};
