// QUANTORA · FMP proxy + server-rendered /stock pages (single function to stay under Hobby's 12-fn cap).
module.exports = async (req, res) => {
  const KEY = process.env.FMP_KEY;
  const type = (req.query.type || '').toString();
  const sym = (req.query.symbol || req.query.sym || '').toString().replace(/[^A-Za-z0-9.\-]/g, '').toUpperCase().slice(0, 12);

  // ---------- /stock/:sym  (rewritten to /api/fmp?type=stock&symbol=:sym) ----------
  if (type === 'stock') { return renderStock(res, KEY, sym); }

  // ---------- JSON data proxy (default) ----------
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  if (!KEY) { res.status(200).json({ error: 'nokey' }); return; }
  const MAP = {
    quote:    () => 'quote?symbol=' + sym,
    profile:  () => 'profile?symbol=' + sym,
    targets:  () => 'price-target-consensus?symbol=' + sym,
    ratings:  () => 'ratings-snapshot?symbol=' + sym,
    metrics:  () => 'key-metrics?symbol=' + sym + '&limit=1',
    peers:    () => 'stock-peers?symbol=' + sym,
    insider:  () => sym ? ('insider-trading/search?symbol=' + sym + '&page=0&limit=12') : ('insider-trading/latest?page=0&limit=15'),
    senate:   () => sym ? ('senate-trades?symbol=' + sym) : ('senate-latest?page=0&limit=15'),
    house:    () => 'house-latest?page=0&limit=15',
    estimates:() => 'analyst-estimates?symbol=' + sym + '&period=annual&page=0&limit=5',
    thirteenf:() => 'institutional-ownership/symbol-positions-summary?symbol=' + sym + '&page=0&limit=1',
    etfhold:  () => 'etf/holdings?symbol=' + sym,
    etfsector:() => 'etf/sector-weightings?symbol=' + sym,
    gainers:  () => 'biggest-gainers',
    actives:  () => 'most-active',
    news:     () => 'stock-news?limit=12',
    income:   () => 'income-statement?symbol=' + sym + '&period=annual&limit=2',
    balance:  () => 'balance-sheet-statement?symbol=' + sym + '&period=annual&limit=2',
    cashflow: () => 'cash-flow-statement?symbol=' + sym + '&period=annual&limit=2',
    prices:   () => 'historical-price-eod/light?symbol=' + sym,
    ratios:   () => 'ratios?symbol=' + sym + '&limit=1'
  };
  const build = MAP[type];
  if (!build) { res.status(200).json({ error: 'badtype' }); return; }
  try {
    const path = build(); const sep = path.indexOf('?') >= 0 ? '&' : '?';
    const r = await fetch('https://financialmodelingprep.com/stable/' + path + sep + 'apikey=' + KEY);
    const j = await r.json();
    res.status(200).json({ data: j });
  } catch (e) { res.status(200).json({ error: 'feed' }); }
};

// ===================== server-rendered ticker page =====================
async function renderStock(res, KEY, sym) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  const esc = s => (s == null ? '' : String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
  const num = (v, d = 2) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (v, d = 2) => (v == null || isNaN(v)) ? '—' : (Number(v) >= 0 ? '+' : '') + Number(v).toFixed(d) + '%';
  const big = v => { v = Number(v); if (!isFinite(v) || !v) return '—'; const a = Math.abs(v), s = v < 0 ? '-' : ''; if (a >= 1e12) return s + (a/1e12).toFixed(2) + 'T'; if (a >= 1e9) return s + (a/1e9).toFixed(2) + 'B'; if (a >= 1e6) return s + (a/1e6).toFixed(2) + 'M'; return s + a.toLocaleString('en-US'); };
  const CSS = '<link rel="stylesheet" href="/theme.css"><style>' +
    'body{background:#f7f8fa;color:#14161c;font-family:Geist,system-ui,sans-serif;margin:0}' +
    '.sw{max-width:960px;margin:0 auto;padding:28px 24px 80px}.eyb{text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:#9aa1ad;font-weight:500}' +
    '.shero{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:flex-end;border-bottom:1px solid rgba(17,24,39,.08);padding-bottom:22px;margin-bottom:26px}' +
    '.snm{font-size:26px;font-weight:600;letter-spacing:-.02em;margin:6px 0 2px}.stk{font-family:Geist Mono,monospace;color:#6b7280;font-size:13px}' +
    '.spx{font-family:Geist Mono,monospace;font-size:40px;font-weight:600;letter-spacing:-.03em;line-height:1}.up{color:#0f9d63}.down{color:#d6453d}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:rgba(17,24,39,.08);border:1px solid rgba(17,24,39,.08);border-radius:14px;overflow:hidden;margin:22px 0}' +
    '.cell{background:#fff;padding:15px 16px}.cl{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#9aa1ad;font-weight:500}' +
    '.cv{font-family:Geist Mono,monospace;font-size:19px;font-weight:500;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.sec2{margin:30px 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#9aa1ad;font-weight:500}.desc{color:#3a4150;line-height:1.65;font-size:15px;max-width:680px}' +
    '.cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.btn{display:inline-flex;gap:7px;text-decoration:none;border:1px solid rgba(17,24,39,.12);border-radius:10px;padding:11px 16px;font-size:14px;font-weight:500;color:#14161c;background:#fff}.btn:hover{border-color:rgba(99,91,255,.5)}.btn.pri{background:#635bff;color:#fff;border-color:#635bff}' +
    '.vnote{background:#fafbfc;border:1px solid rgba(17,24,39,.08);border-radius:14px;padding:18px 20px;font-size:14.5px;color:#3a4150;line-height:1.6}' +
    '.foot{margin-top:40px;padding-top:18px;border-top:1px solid rgba(17,24,39,.08);font-size:11.5px;color:#9aa1ad;line-height:1.6;max-width:720px}' +
    '</style><script src="/nav.js" defer></script>';
  const send = (status, head, body) => { res.statusCode = status; res.end('<!doctype html><html lang="en"><head>' + head + '</head><body><div id="qnav"></div>' + body + '</body></html>'); };

  if (!sym) { send(200, '<meta name="robots" content="noindex"><title>Quantora · Stocks</title>' + CSS, '<div class="sw"><div class="eyb">Quantora</div><h1 class="snm">Stock research</h1><p class="desc">Try <a href="/stock/AAPL">/stock/AAPL</a>.</p></div>'); return; }

  async function fmp(path) { if (!KEY) return null; try { const sep = path.indexOf('?') >= 0 ? '&' : '?'; const r = await fetch('https://financialmodelingprep.com/stable/' + path + sep + 'apikey=' + KEY); const j = await r.json(); return Array.isArray(j) ? j[0] : j; } catch (e) { return null; } }
  const [q, p, m, ra] = await Promise.all([fmp('quote?symbol=' + sym), fmp('profile?symbol=' + sym), fmp('key-metrics?symbol=' + sym + '&limit=1'), fmp('ratios?symbol=' + sym + '&limit=1')]);

  if (!q || q.price == null) { send(404, '<meta name="robots" content="noindex"><title>' + esc(sym) + ' — not found · Quantora</title>' + CSS, '<div class="sw"><div class="eyb">Quantora</div><h1 class="snm">' + esc(sym) + '</h1><p class="desc">No live data for this symbol. Try the <a href="/engines.html">terminal</a>.</p></div>'); return; }

  const name = (p && p.companyName) || q.name || sym;
  const chg = q.changePercentage != null ? q.changePercentage : q.changesPercentage;
  const dir = (chg || 0) >= 0 ? 'up' : 'down';
  const sector = (p && p.sector) || '', exch = (p && (p.exchange || p.exchangeShortName)) || '', desc = (p && p.description) || '';
  const roe = m && m.returnOnEquity, roic = m && (m.returnOnInvestedCapital || m.roic), fcfY = m && m.freeCashFlowYield, ndE = m && m.netDebtToEBITDA, graham = m && m.grahamNumber;
  const pe = q.pe != null ? q.pe : (ra && ra.priceEarningsRatio), ps = ra && (ra.priceToSalesRatio || ra.priceSalesRatio), pb = ra && (ra.priceToBookRatio || ra.priceBookValueRatio), peg = ra && ra.priceEarningsToGrowthRatio;
  const divY = ra && (ra.dividendYield != null ? ra.dividendYield * 100 : null), gm = ra && (ra.grossProfitMargin != null ? ra.grossProfitMargin * 100 : null), nm = ra && (ra.netProfitMargin != null ? ra.netProfitMargin * 100 : null), eYield = pe ? 100 / pe : null;
  const cell = (l, v) => '<div class="cell"><div class="cl">' + l + '</div><div class="cv">' + v + '</div></div>';
  const grid = cell('Price', '$' + num(q.price)) + cell('Change', '<span class="' + dir + '">' + pct(chg) + '</span>') + cell('Market cap', '$' + big(q.marketCap)) + cell('P/E', num(pe, 1)) + cell('P/S', num(ps, 1)) + cell('P/B', num(pb, 1)) + cell('ROE', roe != null ? num(roe*100,1)+'%' : '—') + cell('ROIC', roic != null ? num(roic*100,1)+'%' : '—') + cell('Net debt/EBITDA', num(ndE,2)) + cell('FCF yield', fcfY != null ? num(fcfY*100,1)+'%' : '—') + cell('Earnings yield', eYield != null ? num(eYield,1)+'%' : '—') + cell('Div yield', divY != null ? num(divY,2)+'%' : '—') + cell('Gross margin', gm != null ? num(gm,1)+'%' : '—') + cell('Net margin', nm != null ? num(nm,1)+'%' : '—') + cell('52w high', '$' + num(q.yearHigh)) + cell('52w low', '$' + num(q.yearLow));
  let v = [];
  if (eYield != null) v.push('an earnings yield of <b>' + num(eYield,1) + '%</b>');
  if (fcfY != null) v.push('a free-cash-flow yield of <b>' + num(fcfY*100,1) + '%</b>');
  if (graham != null) { const gd = ((graham - q.price)/q.price)*100; v.push('a Graham number of <b>$' + num(graham) + '</b> (' + (gd>=0?'~'+num(gd,0)+'% above':num(-gd,0)+'% below') + ' price)'); }
  if (peg != null) v.push('a PEG of <b>' + num(peg,2) + '</b>');
  const vtext = v.length ? (esc(name) + ' trades with ' + v.join(', ') + '. Computed from the latest reported figures — open the terminal to run the full 96-engine suite (DCF, Altman Z, DuPont, options & risk) on ' + esc(sym) + ' live.') : ('Open the terminal to run the full 96-engine suite on ' + esc(sym) + '.');
  const title = esc(name) + ' (' + esc(sym) + ') Stock Price, Valuation & Quant Analysis · Quantora';
  const md = esc(name) + ' (' + esc(sym) + ') — $' + num(q.price) + ', ' + pct(chg) + '. P/E ' + num(pe,1) + ', market cap $' + big(q.marketCap) + '. Verified quant valuation, risk & options engines. Free, no login.';
  const url = 'https://www.usequantora.com/stock/' + esc(sym);
  const head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><meta name="description" content="' + md + '"><link rel="canonical" href="' + url + '"><meta property="og:title" content="' + title + '"><meta property="og:description" content="' + md + '"><meta property="og:type" content="website"><meta property="og:url" content="' + url + '"><meta name="twitter:card" content="summary"><script type="application/ld+json">' + JSON.stringify({ "@context":"https://schema.org","@type":"Corporation",name:name,tickerSymbol:sym,description:desc.slice(0,280) }) + '</script>' + CSS;
  const body = '<div class="sw"><div class="shero"><div><div class="eyb">' + esc(exch) + (sector ? ' · ' + esc(sector) : '') + '</div><div class="snm">' + esc(name) + ' <span class="stk">' + esc(sym) + '</span></div></div><div style="text-align:right"><div class="spx">$' + num(q.price) + '</div><div class="' + dir + '" style="font-family:Geist Mono,monospace;font-size:14px;margin-top:4px">' + pct(chg) + ' today</div></div></div>' +
    '<div class="grid">' + grid + '</div><div class="sec2">Valuation snapshot</div><div class="vnote">' + vtext + '</div>' +
    (desc ? '<div class="sec2">About</div><p class="desc">' + esc(desc.slice(0,600)) + (desc.length>600?'…':'') + '</p>' : '') +
    '<div class="cta"><a class="btn pri" href="/engines.html#options-pricer">Run the 96 engines on ' + esc(sym) + ' →</a><a class="btn" href="/intel.html?sym=' + esc(sym) + '">Equity Intelligence</a><a class="btn" href="/engines.html">Open terminal</a></div>' +
    '<div class="foot">Figures computed at the edge from latest reported data via Financial Modeling Prep; quotes may be delayed. Standard published formulas. Mathematical tools for analysis & education — not investment advice. Quantora is not a registered investment adviser or broker-dealer.</div></div>';
  send(200, head, body);
}
