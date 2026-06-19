// Quantora backend - SEC filings. Recent EDGAR filings for a ticker (server-side; EDGAR requires a User-Agent).
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const CIK = { AAPL: '0000320193', NVDA: '0001045810', MSFT: '0000789019', TSLA: '0001318605', AMZN: '0001018724', GOOGL: '0001652044', META: '0001326801' };
  const t = ((req.query && req.query.ticker) || '').toString().toUpperCase().replace(/[^A-Z]/g, '');
  const cik = CIK[t];
  if (!cik) { res.status(200).json({ error: 'unsupported', supported: Object.keys(CIK) }); return; }
  try {
    const r = await fetch('https://data.sec.gov/submissions/CIK' + cik + '.json', { headers: { 'User-Agent': 'Quantora research (contact@usequantora.com)' } });
    const d = await r.json();
    const rec = d && d.filings && d.filings.recent;
    if (!rec) { res.status(200).json({ error: 'feed' }); return; }
    const cikNum = String(parseInt(cik, 10));
    const out = [];
    for (let i = 0; i < rec.form.length && out.length < 14; i++) {
      const form = rec.form[i];
      if (/^(10-K|10-Q|8-K|4|S-1|DEF 14A)/.test(form)) {
        const acc = (rec.accessionNumber[i] || '').replace(/-/g, '');
        const doc = rec.primaryDocument[i] || '';
        out.push({ form: form, date: rec.filingDate[i], desc: rec.primaryDocDescription[i] || '', url: 'https://www.sec.gov/Archives/edgar/data/' + cikNum + '/' + acc + '/' + doc });
      }
    }
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(200).json({ ticker: t, name: (d.name || t), filings: out });
  } catch (e) { res.status(200).json({ error: 'feed' }); }
};
