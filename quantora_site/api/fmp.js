// QUANTORA · FMP proxy + server-rendered /stock pages (single function to stay under Hobby's 12-fn cap).
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS'); res.setHeader('Access-Control-Allow-Headers','content-type'); res.statusCode=200; res.end(); return; }
  const KEY = process.env.FMP_KEY;
  const type = (req.query.type || '').toString();
  const sym = (req.query.symbol || req.query.sym || '').toString().replace(/[^A-Za-z0-9.\-]/g, '').toUpperCase().slice(0, 12);
  if (type === 'stock') { return renderStock(res, KEY, sym); }
  if (type === 'engine') { return renderEngine(req, res); }
  if (type === 'compare') { return renderCompare(req, res, KEY); }
  if (type === 'ai') { return renderAI(req, res); }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  if (!KEY) { res.status(200).json({ error: 'nokey' }); return; }
  const MAP = {
    quote: () => 'quote?symbol=' + sym, profile: () => 'profile?symbol=' + sym, targets: () => 'price-target-consensus?symbol=' + sym,
    ratings: () => 'ratings-snapshot?symbol=' + sym, metrics: () => 'key-metrics?symbol=' + sym + '&limit=1', peers: () => 'stock-peers?symbol=' + sym,
    insider: () => sym ? ('insider-trading/search?symbol=' + sym + '&page=0&limit=12') : ('insider-trading/latest?page=0&limit=15'),
    senate: () => sym ? ('senate-trades?symbol=' + sym) : ('senate-latest?page=0&limit=15'), house: () => 'house-latest?page=0&limit=15',
    estimates: () => 'analyst-estimates?symbol=' + sym + '&period=annual&page=0&limit=5', thirteenf: () => 'institutional-ownership/symbol-positions-summary?symbol=' + sym + '&page=0&limit=1',
    etfhold: () => 'etf/holdings?symbol=' + sym, etfsector: () => 'etf/sector-weightings?symbol=' + sym, gainers: () => 'biggest-gainers', actives: () => 'most-active',
    news: () => 'stock-news?limit=12', income: () => 'income-statement?symbol=' + sym + '&period=annual&limit=2', balance: () => 'balance-sheet-statement?symbol=' + sym + '&period=annual&limit=2',
    cashflow: () => 'cash-flow-statement?symbol=' + sym + '&period=annual&limit=2', prices: () => 'historical-price-eod/light?symbol=' + sym, ratios: () => 'ratios?symbol=' + sym + '&limit=1'
  };
  const build = MAP[type];
  if (!build) { res.status(200).json({ error: 'badtype' }); return; }
  try { const path = build(); const sep = path.indexOf('?') >= 0 ? '&' : '?'; const r = await fetch('https://financialmodelingprep.com/stable/' + path + sep + 'apikey=' + KEY); const j = await r.json(); res.status(200).json({ data: j }); }
  catch (e) { res.status(200).json({ error: 'feed' }); }
};

async function renderStock(res, KEY, sym) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  const esc = s => (s == null ? '' : String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
  const num = (v, d = 2) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (v, d = 2) => (v == null || isNaN(v)) ? '—' : (Number(v) >= 0 ? '+' : '') + Number(v).toFixed(d) + '%';
  const big = v => { v = Number(v); if (!isFinite(v) || !v) return '—'; const a = Math.abs(v), s = v < 0 ? '-' : ''; if (a >= 1e12) return s + (a/1e12).toFixed(2) + 'T'; if (a >= 1e9) return s + (a/1e9).toFixed(2) + 'B'; if (a >= 1e6) return s + (a/1e6).toFixed(2) + 'M'; return s + a.toLocaleString('en-US'); };
  const CSS = '<link rel="stylesheet" href="/theme.css"><style>' +
    'body{background:#f7f8fa;color:#14161c;font-family:Geist,system-ui,sans-serif;margin:0}.sw{max-width:960px;margin:0 auto;padding:28px 24px 80px}.eyb{text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:#9aa1ad;font-weight:500}' +
    '.shero{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:flex-end;border-bottom:1px solid rgba(17,24,39,.08);padding-bottom:22px;margin-bottom:26px}.snm{font-size:26px;font-weight:600;letter-spacing:-.02em;margin:6px 0 2px}.stk{font-family:Geist Mono,monospace;color:#6b7280;font-size:13px}' +
    '.spx{font-family:Geist Mono,monospace;font-size:40px;font-weight:600;letter-spacing:-.03em;line-height:1}.up{color:#0f9d63}.down{color:#d6453d}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:rgba(17,24,39,.08);border:1px solid rgba(17,24,39,.08);border-radius:14px;overflow:hidden;margin:22px 0}.cell{background:#fff;padding:15px 16px}.cl{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#9aa1ad;font-weight:500}.cv{font-family:Geist Mono,monospace;font-size:19px;font-weight:500;margin-top:5px;font-variant-numeric:tabular-nums}' +
    '.sec2{margin:30px 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#9aa1ad;font-weight:500}.desc{color:#3a4150;line-height:1.65;font-size:15px;max-width:680px}' +
    '.cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.btn{display:inline-flex;gap:7px;text-decoration:none;border:1px solid rgba(17,24,39,.12);border-radius:10px;padding:11px 16px;font-size:14px;font-weight:500;color:#14161c;background:#fff}.btn:hover{border-color:rgba(99,91,255,.5)}.btn.pri{background:#635bff;color:#fff;border-color:#635bff}' +
    '.vnote{background:#fafbfc;border:1px solid rgba(17,24,39,.08);border-radius:14px;padding:18px 20px;font-size:14.5px;color:#3a4150;line-height:1.6}.rel{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.rel a{font-family:Geist Mono,monospace;font-size:12px;color:#635bff;text-decoration:none;border:1px solid rgba(17,24,39,.1);border-radius:8px;padding:5px 9px}' +
    '.foot{margin-top:40px;padding-top:18px;border-top:1px solid rgba(17,24,39,.08);font-size:11.5px;color:#9aa1ad;line-height:1.6;max-width:720px}</style><script src="/nav.js" defer></script>';
  const send = (status, head, body) => { res.statusCode = status; res.end('<!doctype html><html lang="en"><head>' + head + '</head><body><div id="qnav"></div>' + body + '</body></html>'); };
  if (!sym) { send(200, '<meta name="robots" content="noindex"><title>Quantora · Stocks</title>' + CSS, '<div class="sw"><div class="eyb">Quantora</div><h1 class="snm">Stock research</h1><p class="desc">Try <a href="/stock/AAPL">/stock/AAPL</a>.</p></div>'); return; }

  async function fmp(path) { if (!KEY) return null; try { const sep = path.indexOf('?') >= 0 ? '&' : '?'; const r = await fetch('https://financialmodelingprep.com/stable/' + path + sep + 'apikey=' + KEY); const j = await r.json(); return Array.isArray(j) ? j[0] : j; } catch (e) { return null; } }
  async function fmpRaw(path) { if (!KEY) return null; try { const sep = path.indexOf('?') >= 0 ? '&' : '?'; const r = await fetch('https://financialmodelingprep.com/stable/' + path + sep + 'apikey=' + KEY); return await r.json(); } catch (e) { return null; } }
  const [q, p, m, ra, pr, inc, bal] = await Promise.all([
    fmp('quote?symbol=' + sym), fmp('profile?symbol=' + sym), fmp('key-metrics?symbol=' + sym + '&limit=1'), fmp('ratios?symbol=' + sym + '&limit=1'),
    fmpRaw('historical-price-eod/light?symbol=' + sym), fmp('income-statement?symbol=' + sym + '&period=annual&limit=1'), fmp('balance-sheet-statement?symbol=' + sym + '&period=annual&limit=1')
  ]);

  if (!q || q.price == null) { send(404, '<meta name="robots" content="noindex"><title>' + esc(sym) + ' — not found · Quantora</title>' + CSS, '<div class="sw"><div class="eyb">Quantora</div><h1 class="snm">' + esc(sym) + '</h1><p class="desc">No live data for this symbol. Try the <a href="/engines.html">terminal</a>.</p></div>'); return; }

  const name = (p && p.companyName) || q.name || sym;
  const chg = q.changePercentage != null ? q.changePercentage : q.changesPercentage;
  const dir = (chg || 0) >= 0 ? 'up' : 'down';
  const sector = (p && p.sector) || '', exch = (p && (p.exchange || p.exchangeShortName)) || '', desc = (p && p.description) || '';
  const roe = m && m.returnOnEquity, roic = m && (m.returnOnInvestedCapital || m.roic), fcfY = m && m.freeCashFlowYield, ndE = m && m.netDebtToEBITDA, graham = m && m.grahamNumber;
  const pe = q.pe != null ? q.pe : (ra && ra.priceEarningsRatio), ps = ra && (ra.priceToSalesRatio || ra.priceSalesRatio), pb = ra && (ra.priceToBookRatio || ra.priceBookValueRatio), peg = ra && ra.priceEarningsToGrowthRatio;
  const divY = ra && (ra.dividendYield != null ? ra.dividendYield * 100 : null), gm = ra && (ra.grossProfitMargin != null ? ra.grossProfitMargin * 100 : null), nm = ra && (ra.netProfitMargin != null ? ra.netProfitMargin * 100 : null), eYield = pe ? 100 / pe : null;

  function spark() {
    try {
      var a = Array.isArray(pr) ? pr : (pr && pr.historical ? pr.historical : []);
      if (!a || a.length < 5) return '';
      var closes = a.slice(0, 140).map(function (x) { return x.price != null ? x.price : (x.close != null ? x.close : x.adjClose); }).filter(function (x) { return x != null && isFinite(x); }).reverse();
      if (closes.length < 5) return '';
      var n = closes.length, lo = Math.min.apply(null, closes), hi = Math.max.apply(null, closes); if (hi - lo < 1e-9) hi = lo + 1;
      var W = 900, H = 120, pd = 4; function X(i){return pd+i/(n-1)*(W-2*pd);} function Y(v){return H-pd-(v-lo)/(hi-lo)*(H-2*pd);}
      var d = closes.map(function (v, i) { return (i?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1); }).join(' ');
      var up = closes[n-1] >= closes[0], col = up ? '#0f9d63' : '#d6453d';
      return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:60px;display:block;margin:18px 0 2px"><path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg><div style="font-size:11px;color:#9aa1ad;font-family:Geist Mono,monospace">'+n+'-day close · '+(up?'+':'')+(((closes[n-1]/closes[0])-1)*100).toFixed(1)+'%</div>';
    } catch (e) { return ''; }
  }

  var altman = null, dupont = null;
  if (inc && bal) {
    var sales = inc.revenue, ebit = (inc.operatingIncome != null ? inc.operatingIncome : inc.ebit), ni = inc.netIncome;
    var ta = bal.totalAssets, tl = bal.totalLiabilities, re2 = bal.retainedEarnings, tca = bal.totalCurrentAssets, tcl = bal.totalCurrentLiabilities, eq = (bal.totalStockholdersEquity != null ? bal.totalStockholdersEquity : bal.totalEquity);
    var wc = (tca != null && tcl != null) ? (tca - tcl) : null, mktEq = q.marketCap;
    if (ta && sales != null && ebit != null && wc != null && re2 != null && tl) { var z = 1.2*(wc/ta)+1.4*(re2/ta)+3.3*(ebit/ta)+0.6*(mktEq/tl)+1.0*(sales/ta); altman = { z: z, zone: (z>2.99?'Safe':(z>=1.81?'Grey':'Distress')) }; }
    if (ni != null && sales && ta && eq) { dupont = { margin: ni/sales, turnover: sales/ta, leverage: ta/eq, roe: (ni/sales)*(sales/ta)*(ta/eq) }; }
  }

  const cell = (l, v) => '<div class="cell"><div class="cl">' + l + '</div><div class="cv">' + v + '</div></div>';
  const grid = cell('Price', '$' + num(q.price)) + cell('Change', '<span class="' + dir + '">' + pct(chg) + '</span>') + cell('Market cap', '$' + big(q.marketCap)) + cell('P/E', num(pe, 1)) + cell('P/S', num(ps, 1)) + cell('P/B', num(pb, 1)) + cell('ROE', roe != null ? num(roe*100,1)+'%' : '—') + cell('ROIC', roic != null ? num(roic*100,1)+'%' : '—') + cell('Net debt/EBITDA', num(ndE,2)) + cell('FCF yield', fcfY != null ? num(fcfY*100,1)+'%' : '—') + cell('Earnings yield', eYield != null ? num(eYield,1)+'%' : '—') + cell('Div yield', divY != null ? num(divY,2)+'%' : '—') + cell('Gross margin', gm != null ? num(gm,1)+'%' : '—') + cell('Net margin', nm != null ? num(nm,1)+'%' : '—') + cell('52w high', '$' + num(q.yearHigh)) + cell('52w low', '$' + num(q.yearLow));

  var scoreCells = '';
  if (altman) scoreCells += cell('Altman Z-score', num(altman.z,2) + ' <span class="' + (altman.zone==='Safe'?'up':(altman.zone==='Distress'?'down':'')) + '" style="font-size:12px">' + altman.zone + '</span>');
  if (dupont) scoreCells += cell('ROE (DuPont)', num(dupont.roe*100,1)+'%') + cell('Net margin', num(dupont.margin*100,1)+'%') + cell('Asset turnover', num(dupont.turnover,2)+'x') + cell('Equity leverage', num(dupont.leverage,2)+'x');
  var scorecardHTML = scoreCells ? ('<div class="sec2">Quant scorecard · computed live</div><div class="grid">' + scoreCells + '</div>') : '';

  var v = [];
  if (eYield != null) v.push('an earnings yield of <b>' + num(eYield,1) + '%</b>');
  if (fcfY != null) v.push('a free-cash-flow yield of <b>' + num(fcfY*100,1) + '%</b>');
  if (graham != null) { const gd = ((graham - q.price)/q.price)*100; v.push('a Graham number of <b>$' + num(graham) + '</b> (' + (gd>=0?'~'+num(gd,0)+'% above':num(-gd,0)+'% below') + ' price)'); }
  if (altman) v.push('an Altman Z-score of <b>' + num(altman.z,2) + '</b> (' + altman.zone.toLowerCase() + ' zone)');
  if (peg != null) v.push('a PEG of <b>' + num(peg,2) + '</b>');
  const vtext = v.length ? (esc(name) + ' trades with ' + v.join(', ') + '. Computed from the latest reported figures — open the terminal to run the full 96-engine suite on ' + esc(sym) + ' live.') : ('Open the terminal to run the full 96-engine suite on ' + esc(sym) + '.');
  const related = ['AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','JPM'].filter(function(x){return x!==sym;}).slice(0,7).map(function(x){return '<a href="/stock/'+x+'">'+x+'</a>';}).join('');

  const title = esc(name) + ' (' + esc(sym) + ') Stock Price, Valuation & Quant Analysis · Quantora';
  const md = esc(name) + ' (' + esc(sym) + ') — $' + num(q.price) + ', ' + pct(chg) + '. P/E ' + num(pe,1) + ', market cap $' + big(q.marketCap) + ', Altman Z ' + (altman?num(altman.z,1):'n/a') + '. Verified quant valuation, risk & options engines. Free, no login.';
  const url = 'https://www.usequantora.com/stock/' + esc(sym);
  const head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><meta name="description" content="' + md + '"><link rel="canonical" href="' + url + '"><meta property="og:title" content="' + title + '"><meta property="og:description" content="' + md + '"><meta property="og:type" content="website"><meta property="og:url" content="' + url + '"><meta name="twitter:card" content="summary"><script type="application/ld+json">' + JSON.stringify({ "@context":"https://schema.org","@type":"Corporation",name:name,tickerSymbol:sym,description:desc.slice(0,280) }) + '</script>' + CSS;
  const body = '<div class="sw"><div class="shero"><div><div class="eyb">' + esc(exch) + (sector ? ' · ' + esc(sector) : '') + '</div><div class="snm">' + esc(name) + ' <span class="stk">' + esc(sym) + '</span></div></div><div style="text-align:right"><div class="spx">$' + num(q.price) + '</div><div class="' + dir + '" style="font-family:Geist Mono,monospace;font-size:14px;margin-top:4px">' + pct(chg) + ' today</div></div></div>' +
    spark() + '<div class="grid">' + grid + '</div>' +
    '<div class="sec2">Valuation snapshot</div><div class="vnote">' + vtext + '</div>' + scorecardHTML +
    (desc ? '<div class="sec2">About</div><p class="desc">' + esc(desc.slice(0,600)) + (desc.length>600?'…':'') + '</p>' : '') +
    '<div class="cta"><a class="btn pri" href="/engines.html#options-pricer">Run the 96 engines on ' + esc(sym) + ' →</a><a class="btn" href="/intel.html?sym=' + esc(sym) + '">Equity Intelligence</a><a class="btn" href="/engines.html">Open terminal</a></div>' +
    '<div class="sec2">Embed this</div><div class="vnote" style="font-family:Geist Mono,monospace;font-size:12px;word-break:break-all">&lt;iframe src=\'https://www.usequantora.com/widget.html?sym=' + esc(sym) + '\' width=\'340\' height=\'150\' style=\'border:0\' loading=\'lazy\'&gt;&lt;/iframe&gt;</div>' +'<div class="sec2">Compare</div><div class="rel"><a href="/compare/'+esc(sym)+'-vs-AAPL">'+esc(sym)+' vs AAPL</a><a href="/compare/'+esc(sym)+'-vs-MSFT">'+esc(sym)+' vs MSFT</a><a href="/compare/'+esc(sym)+'-vs-NVDA">'+esc(sym)+' vs NVDA</a></div>' + '<div class="sec2">More stocks</div><div class="rel">' + related + ' <a href="/directory.html">All stocks →</a></div>' +
    '<div class="foot">Figures computed at the edge from latest reported data via Financial Modeling Prep; quotes may be delayed. Standard published formulas (P/E, FCF yield, Graham number, Altman Z, DuPont). Mathematical tools for analysis & education — not investment advice. Quantora is not a registered investment adviser or broker-dealer.</div></div>';
  send(200, head, body);
}


// ===================== verified quant engine API (/api/v1/:fn -> /api/fmp?type=engine&fn=:fn) =====================
function renderEngine(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=86400');
  var fn=(req.query.fn||'').toString();
  var SPEC={
    bsm:['S','K','T','r','q','sig'], greeks:['S','K','T','r','q','sig'], impliedVol:['price','S','K','T','r','q','isCall'],
    crr:['S','K','T','r','q','sig','N','isCall','american'], black76:['F','K','T','r','sig'], garmanKohlhagen:['S','K','T','rd','rf','sig'],
    bondPrice:['face','couponRate','yld','n','m'], ytm:['face','couponRate','price','n','m'], bondAnalytics:['face','couponRate','yld','n','m'], nelsonSiegel:['t','b0','b1','b2','tau'],
    npv:['rate','@cfs'], irr:['@cfs'], merton:['V','D','sig','drift','T'], expectedLoss:['pd','lgd','ead'], pdFromSpread:['spread','recovery','T'],
    taylorRule:['inflation','outputGap'], recessionProb:['tenY','threeM'],
    histVaR:['@returns','conf'], histCVaR:['@returns','conf'], paramVaR:['@returns','conf'], annVol:['@returns','P'],
    sharpe:['@returns','rfPeriod','P'], sortino:['@returns','mar','P'], maxDrawdown:['@returns'], beta:['@asset','@bench'], correlation:['@x','@y'],
    altmanZ:['wc','re','ebit','mktEq','sales','ta','tl'], dupont:['ni','sales','assets','equity']
  };
  if(!fn){ res.status(200).json({ api:'Quantora Engine API', version:'v1', usage:'/api/v1/{engine}?param=value', engines:Object.keys(SPEC), example:'/api/v1/greeks?S=100&K=100&T=1&r=0.05&q=0&sig=0.2' }); return; }
  if(!SPEC[fn]){ res.status(200).json({ error:'unknown_engine', engine:fn, available:Object.keys(SPEC) }); return; }
  var Q; try{ Q=require('../engines.js'); }catch(e){ res.status(200).json({ error:'engine_unavailable' }); return; }
  function toArr(v){ return (v==null?'':String(v)).split(/[ ,]+/).map(parseFloat).filter(function(x){return isFinite(x);}); }
  var spec=SPEC[fn], args=[], inputs={};
  for(var i=0;i<spec.length;i++){ var key=spec[i];
    if(key.charAt(0)==='@'){ var k=key.slice(1); var a=toArr(req.query[k]); args.push(a); inputs[k]=a; }
    else { var raw=req.query[key]; var val; if(key==='isCall'){ val=(raw==='true'||raw==='1'||raw==='call'); } else if(key==='american'){ val=(raw==='true'||raw==='1'); } else { val=raw==null?undefined:parseFloat(raw); } if(val!==undefined){ args.push(val); inputs[key]=val; } else { args.push(undefined); } }
  }
  var result; try{ result=Q[fn].apply(null,args); }catch(e){ res.status(200).json({ error:'compute_error', engine:fn, message:String(e&&e.message||e) }); return; }
  res.status(200).json({ engine:fn, inputs:inputs, result:result, verified:true, library:'Quantora quant library v'+(Q.version||'') });
}


// ===================== /compare/:a-vs-:b  side-by-side stock comparison =====================
async function renderCompare(req, res, KEY){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=86400');
  function clean(x){ return (x||'').toString().replace(/[^A-Za-z0-9.\-]/g,'').toUpperCase().slice(0,12); }
  var pair=(req.query.pair||'').toString().toLowerCase();
  var A=clean(req.query.a), B=clean(req.query.b);
  if((!A||!B)&&pair.indexOf('-vs-')>=0){ var pp=pair.split('-vs-'); A=clean(pp[0]); B=clean(pp[1]); }
  var esc=function(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});};
  var num=function(v,d){d=d==null?2:d;return (v==null||isNaN(v))?'—':Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});};
  var big=function(v){v=Number(v);if(!isFinite(v)||!v)return '—';var a=Math.abs(v),s=v<0?'-':'';if(a>=1e12)return s+(a/1e12).toFixed(2)+'T';if(a>=1e9)return s+(a/1e9).toFixed(2)+'B';if(a>=1e6)return s+(a/1e6).toFixed(2)+'M';return s+a.toLocaleString('en-US');};
  var CSS='<link rel="stylesheet" href="/theme.css"><style>body{background:#f7f8fa;color:#14161c;font-family:Geist,system-ui,sans-serif;margin:0}.sw{max-width:840px;margin:0 auto;padding:32px 24px 80px}.eyb{text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:#9aa1ad;font-weight:500}h1{font-size:clamp(24px,3.4vw,36px);font-weight:600;letter-spacing:-.03em;margin:8px 0 18px}table{width:100%;border-collapse:collapse;font-size:14px;background:#fff;border:1px solid rgba(17,24,39,.08);border-radius:14px;overflow:hidden}th,td{padding:13px 16px;border-bottom:1px solid rgba(17,24,39,.06);text-align:right;font-variant-numeric:tabular-nums;font-family:Geist Mono,monospace}td:first-child,th:first-child{text-align:left;font-family:Geist,sans-serif;color:#6b7280}thead th{font-size:13px;font-weight:600;color:#14161c}tr:last-child td{border-bottom:0}.win{color:#0f9d63;font-weight:600}.eyb2{font-size:11px}.cta{display:inline-flex;margin:22px 8px 0 0;text-decoration:none;border:1px solid rgba(17,24,39,.12);border-radius:10px;padding:11px 16px;font-size:14px;font-weight:500;color:#14161c;background:#fff}.cta.pri{background:#635bff;color:#fff;border-color:#635bff}.foot{margin-top:36px;padding-top:18px;border-top:1px solid rgba(17,24,39,.08);font-size:11.5px;color:#9aa1ad;line-height:1.6}</style><script src="/nav.js" defer></script>';
  var send=function(st,head,body){ res.statusCode=st; res.end('<!doctype html><html lang="en"><head>'+head+'</head><body><div id="qnav"></div>'+body+'</body></html>'); };
  if(!A||!B){ send(200,'<meta name="robots" content="noindex"><title>Compare stocks · Quantora</title>'+CSS,'<div class="sw"><div class="eyb">Quantora</div><h1>Compare two stocks</h1><p>Try <a href="/compare/AAPL-vs-MSFT">/compare/AAPL-vs-MSFT</a>.</p></div>'); return; }
  async function one(sym){ async function f(path){ try{ var sep=path.indexOf('?')>=0?'&':'?'; var r=await fetch('https://financialmodelingprep.com/stable/'+path+sep+'apikey='+KEY); var j=await r.json(); return Array.isArray(j)?j[0]:j; }catch(e){ return null; } }
    var q=await f('quote?symbol='+sym), m=await f('key-metrics?symbol='+sym+'&limit=1'); return {q:q,m:m}; }
  var da=await one(A), db=await one(B);
  if(!da.q||da.q.price==null||!db.q||db.q.price==null){ send(404,'<meta name="robots" content="noindex"><title>'+esc(A)+' vs '+esc(B)+' · Quantora</title>'+CSS,'<div class="sw"><div class="eyb">Quantora</div><h1>'+esc(A)+' vs '+esc(B)+'</h1><p>Live data unavailable for one of these symbols. Try the <a href="/engines.html">terminal</a>.</p></div>'); return; }
  var na=(da.q.name||A), nb=(db.q.name||B);
  function pe(d){ return d.q.pe!=null?d.q.pe:null; }
  function eY(d){ var x=pe(d); return x?100/x:null; }
  // rows: [label, valA, valB, betterHigh(true/false/null), fmtWinKey]
  function row(label, va, vb, betterHigh, disp){
    var a=va, b=vb, wa='', wb='';
    if(betterHigh!=null && a!=null && b!=null && a!==b){ var aWin=(betterHigh? a>b : a<b); if(aWin) wa='win'; else wb='win'; }
    return '<tr><td>'+label+'</td><td class="'+wa+'">'+disp(a)+'</td><td class="'+wb+'">'+disp(b)+'</td></tr>';
  }
  var d2=function(v){return v==null?'—':num(v,2);};
  var pctd=function(v){return v==null?'—':num(v,1)+'%';};
  var usd=function(v){return v==null?'—':'$'+num(v,2);};
  var bigd=function(v){return v==null?'—':'$'+big(v);};
  var ma=da.m||{}, mb=db.m||{};
  var rows=
    row('Price', da.q.price, db.q.price, null, usd)+
    row('Market cap', da.q.marketCap, db.q.marketCap, true, bigd)+
    row('P/E (lower cheaper)', pe(da), pe(db), false, d2)+
    row('Earnings yield', eY(da), eY(db), true, pctd)+
    row('ROE', ma.returnOnEquity!=null?ma.returnOnEquity*100:null, mb.returnOnEquity!=null?mb.returnOnEquity*100:null, true, pctd)+
    row('ROIC', (ma.returnOnInvestedCapital||ma.roic)!=null?(ma.returnOnInvestedCapital||ma.roic)*100:null, (mb.returnOnInvestedCapital||mb.roic)!=null?(mb.returnOnInvestedCapital||mb.roic)*100:null, true, pctd)+
    row('FCF yield', ma.freeCashFlowYield!=null?ma.freeCashFlowYield*100:null, mb.freeCashFlowYield!=null?mb.freeCashFlowYield*100:null, true, pctd)+
    row('Net debt / EBITDA (lower safer)', ma.netDebtToEBITDA, mb.netDebtToEBITDA, false, d2);
  var title=esc(na)+' vs '+esc(nb)+' ('+esc(A)+' vs '+esc(B)+') — Stock Comparison · Quantora';
  var md=esc(A)+' vs '+esc(B)+': compare price, market cap, P/E, ROE, ROIC and FCF yield side by side. Verified quant comparison, free, no login.';
  var url='https://www.usequantora.com/compare/'+esc(A)+'-vs-'+esc(B);
  var head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><meta name="description" content="'+md+'"><link rel="canonical" href="'+url+'"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+md+'">'+CSS;
  var body='<div class="sw"><div class="eyb">Quantora · Stock comparison</div><h1>'+esc(na)+' vs '+esc(nb)+'</h1>'+
    '<table><thead><tr><th>Metric</th><th>'+esc(A)+'</th><th>'+esc(B)+'</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<a class="cta pri" href="/engines.html">Run the engines →</a><a class="cta" href="/stock/'+esc(A)+'">'+esc(A)+' analysis</a><a class="cta" href="/stock/'+esc(B)+'">'+esc(B)+' analysis</a>'+
    '<div class="foot">Green marks the more favorable figure on each row (context only, not a recommendation). Computed from latest reported data via Financial Modeling Prep; quotes may be delayed. For analysis &amp; education — not investment advice. Quantora is not a registered investment adviser or broker-dealer.</div></div>';
  send(200,head,body);
}


// ===================== /api/ai  AI analyst over the verified engines (tool-use) =====================
var AI_SPEC = {
  bsm:['S','K','T','r','q','sig'], greeks:['S','K','T','r','q','sig'], impliedVol:['price','S','K','T','r','q','isCall'],
  crr:['S','K','T','r','q','sig','N','isCall','american'], black76:['F','K','T','r','sig'], garmanKohlhagen:['S','K','T','rd','rf','sig'],
  bondPrice:['face','couponRate','yld','n','m'], ytm:['face','couponRate','price','n','m'], bondAnalytics:['face','couponRate','yld','n','m'], nelsonSiegel:['t','b0','b1','b2','tau'],
  npv:['rate','@cfs'], irr:['@cfs'], merton:['V','D','sig','drift','T'], expectedLoss:['pd','lgd','ead'], pdFromSpread:['spread','recovery','T'],
  taylorRule:['inflation','outputGap'], recessionProb:['tenY','threeM'],
  histVaR:['@returns','conf'], histCVaR:['@returns','conf'], paramVaR:['@returns','conf'], annVol:['@returns','P'],
  sharpe:['@returns','rfPeriod','P'], sortino:['@returns','mar','P'], maxDrawdown:['@returns'], beta:['@asset','@bench'], correlation:['@x','@y'],
  altmanZ:['wc','re','ebit','mktEq','sales','ta','tl'], dupont:['ni','sales','assets','equity']
};
function runEngineTool(Q, input){
  try{
    if(!Q) return { error:'engines_unavailable' };
    var name = input && input.engine, spec = AI_SPEC[name];
    if(!spec) return { error:'unknown_engine', engine:name, available:Object.keys(AI_SPEC) };
    var p = (input && input.params) || {};
    var args = spec.map(function(k){
      if(k.charAt(0)==='@'){ var key=k.slice(1); var v=p[key]; if(typeof v==='string') v=v.split(/[ ,]+/).map(parseFloat); if(!Array.isArray(v)&&v!=null) v=[v]; return v; }
      if(k==='isCall'||k==='american'){ return (p[k]===true||p[k]==='true'||p[k]===1||p[k]==='1'||p[k]==='call'); }
      return p[k];
    });
    var out = Q[name].apply(null, args);
    return { engine:name, result:out };
  }catch(e){ return { error:'compute_error', message:String(e&&e.message||e) }; }
}
async function renderAI(req, res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','no-store');
  var body = req.body; if(typeof body==='string'){ try{ body=JSON.parse(body); }catch(e){ body={}; } }
  body = body || {};
  var q = (body.q || body.question || req.query.q || '').toString().slice(0,2000);
  var ctx = (body.context || req.query.context || '').toString().slice(0,4000);
  if(!q){ res.statusCode=200; res.end(JSON.stringify({ error:'no_question' })); return; }
  var oaiKey = process.env.OPENAI_API_KEY, antKey = process.env.ANTHROPIC_API_KEY;
  var prov = (process.env.QAI_PROVIDER||'').toLowerCase();
  if(!prov) prov = oaiKey ? 'openai' : (antKey ? 'anthropic' : '');
  if(!prov || (prov==='openai'&&!oaiKey) || (prov==='anthropic'&&!antKey)){ res.statusCode=200; res.end(JSON.stringify({ error:'ai_key_needed' })); return; }
  var Q; try{ Q=require('../engines.js'); }catch(e){ Q=null; }
  var paramHelp = Object.keys(AI_SPEC).map(function(k){ return k+'('+AI_SPEC[k].map(function(x){return x.charAt(0)==='@'?x.slice(1)+'[]':x;}).join(', ')+')'; }).join('; ');
  var toolDesc = 'Run a verified Quantora quant engine and return the exact numeric result. Use this for ANY number. engine must be one of the listed names; params is an object of that engine’s named inputs. Names ending [] take arrays of numbers (e.g. returns, cashflows). Engines: '+paramHelp;
  var system = "You are Quantora's quantitative markets analyst. Answer finance/markets questions with rigor and clarity. For ANY numeric result (option prices, Greeks, implied vol, VaR/CVaR, Sharpe/Sortino, bond price/duration, credit/default, valuation scores, etc.) you MUST call the run_engine tool to compute it with Quantora's verified math — never estimate numbers yourself. After computing, explain what the result means in plain language, briefly. Be concise and concrete. Compliance: you give educational analysis and information, NOT personalized investment advice; you are not a registered investment adviser or broker-dealer; never tell the user to buy or sell specific securities or give individualized recommendations — if asked, explain the relevant analysis instead and suggest a licensed professional. If a question is outside quantitative finance, answer briefly and helpfully.";
  var userMsg = ctx ? (ctx+"\n\nQuestion: "+q) : q;
  var used = [];
  try{
    if(prov==='openai'){
      var tools = [{ type:'function', function:{ name:'run_engine', description: toolDesc, parameters:{ type:'object', properties:{ engine:{type:'string'}, params:{type:'object'} }, required:['engine','params'] } } }];
      var messages = [{ role:'system', content:system }, { role:'user', content:userMsg }];
      for(var iter=0; iter<5; iter++){
        var r = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{ 'Authorization':'Bearer '+oaiKey, 'content-type':'application/json' }, body: JSON.stringify({ model: process.env.QAI_MODEL || 'gpt-4o-mini', messages:messages, tools:tools, tool_choice:'auto', max_tokens:1024 }) });
        var j = await r.json();
        if(j.error){ res.statusCode=200; res.end(JSON.stringify({ error:'ai_error', detail:(j.error&&j.error.message)||'AI request failed' })); return; }
        var m = j.choices && j.choices[0] && j.choices[0].message;
        if(!m){ res.statusCode=200; res.end(JSON.stringify({ error:'ai_error', detail:'no message' })); return; }
        if(m.tool_calls && m.tool_calls.length){
          messages.push(m);
          m.tool_calls.forEach(function(tc){ var input={}; try{ input=JSON.parse(tc.function.arguments||'{}'); }catch(e){} var out=runEngineTool(Q,input); used.push({ engine:(input&&input.engine)||'?', params:(input&&input.params)||{}, result: out.result!==undefined?out.result:out }); messages.push({ role:'tool', tool_call_id:tc.id, content: JSON.stringify(out) }); });
          continue;
        }
        res.statusCode=200; res.end(JSON.stringify({ answer:(m.content||'').trim(), engines_used:used, model:j.model, provider:'openai' })); return;
      }
      res.statusCode=200; res.end(JSON.stringify({ error:'too_many_steps', engines_used:used })); return;
    } else {
      var atools = [{ name:'run_engine', description: toolDesc, input_schema:{ type:'object', properties:{ engine:{type:'string'}, params:{type:'object'} }, required:['engine','params'] } }];
      var amsgs = [{ role:'user', content: userMsg }];
      for(var it=0; it<5; it++){
        var ar = await fetch('https://api.anthropic.com/v1/messages',{ method:'POST', headers:{ 'x-api-key':antKey, 'anthropic-version':'2023-06-01', 'content-type':'application/json' }, body: JSON.stringify({ model: process.env.QAI_MODEL || 'claude-3-5-haiku-latest', max_tokens:1024, system:system, tools:atools, messages:amsgs }) });
        var aj = await ar.json();
        if(aj.type==='error' || aj.error){ res.statusCode=200; res.end(JSON.stringify({ error:'ai_error', detail:(aj.error&&aj.error.message)||'AI request failed' })); return; }
        if(aj.stop_reason==='tool_use'){
          amsgs.push({ role:'assistant', content:aj.content });
          var results = [];
          (aj.content||[]).forEach(function(b){ if(b.type==='tool_use'){ var out=runEngineTool(Q,b.input); used.push({ engine:(b.input&&b.input.engine)||'?', params:(b.input&&b.input.params)||{}, result: out.result!==undefined?out.result:out }); results.push({ type:'tool_result', tool_use_id:b.id, content: JSON.stringify(out) }); } });
          amsgs.push({ role:'user', content: results });
          continue;
        }
        var text = (aj.content||[]).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join('\n').trim();
        res.statusCode=200; res.end(JSON.stringify({ answer:text, engines_used:used, model:aj.model, provider:'anthropic' })); return;
      }
      res.statusCode=200; res.end(JSON.stringify({ error:'too_many_steps', engines_used:used })); return;
    }
  }catch(e){ res.statusCode=200; res.end(JSON.stringify({ error:'server_error', message:String(e&&e.message||e) })); }
}
