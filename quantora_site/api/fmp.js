// QUANTORA · FMP proxy + server-rendered /stock pages (single function to stay under Hobby's 12-fn cap).
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS'); res.setHeader('Access-Control-Allow-Headers','content-type'); res.statusCode=200; res.end(); return; }
  const KEY = process.env.FMP_KEY;
  const type = (req.query.type || '').toString();
  if (type === 'settle') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  var _stSec = process.env.CRON_SECRET;
  if (_stSec) { var _stAuth = (req.headers['authorization'] || ''); var _stKey = (req.query.key || '').toString(); if (_stAuth !== ('Bearer ' + _stSec) && _stKey !== _stSec) { res.status(401).json({ error: 'unauthorized' }); return; } }
  var _stU = (process.env.SUPABASE_URL || '').trim(); while (_stU.slice(-1) === '/') _stU = _stU.slice(0, -1); if (_stU.slice(-8) === '/rest/v1') _stU = _stU.slice(0, -8);
  var _stK = process.env.SUPABASE_KEY;
  if (!_stU || !_stK) { res.status(200).json({ error: 'nocfg', settled: 0 }); return; }
  var _stBase = "https://" + (req.headers["x-forwarded-host"] || req.headers.host || "www.usequantora.com");
  var _stHZ = [[30, 'ret_30d', 'alpha_30d'], [90, 'ret_90d', 'alpha_90d'], [180, 'ret_180d', 'alpha_180d']];
  var _stHdr = { 'apikey': _stK, 'Authorization': 'Bearer ' + _stK };
  try {
    var _stR = await fetch(_stU + '/rest/v1/calls?select=*&order=created_at.desc&limit=1000', { headers: _stHdr });
    var _stCalls = await _stR.json();
    if (!Array.isArray(_stCalls) || !_stCalls.length) { res.status(200).json({ ok: true, scanned: 0, settled: 0 }); return; }
    var _stNow = Date.now();
    var _stAge = function (c) { return Math.floor((_stNow - new Date(c.created_at).getTime()) / 864e5); };
    var _stTodo = [];
    _stCalls.forEach(function (c) { var need = false; _stHZ.forEach(function (h) { if (_stAge(c) >= h[0] && c[h[1]] == null) need = true; }); if (need) _stTodo.push(c); });
    if (!_stTodo.length) { res.status(200).json({ ok: true, scanned: _stCalls.length, settled: 0 }); return; }
    if (_stTodo.length > 50) _stTodo = _stTodo.slice(0, 50);
    var _stHist = async function (sym) { try { var r = await fetch(_stBase + '/api/fmp?type=prices&symbol=' + encodeURIComponent(sym)); var j = await r.json(); var arr = Array.isArray(j) ? j : (j.data || j.historical || []); var m = {}; for (var i = 0; i < arr.length; i++) { var d = arr[i].date || arr[i].datetime; var p = arr[i].price != null ? arr[i].price : (arr[i].close != null ? arr[i].close : arr[i].adjClose); if (d && p > 0) m[('' + d).slice(0, 10)] = +p; } return m; } catch (e) { return {}; } };
    var _stSpy = await _stHist('SPY');
    var _stSpyKeys = Object.keys(_stSpy).sort();
    var _stTset = {}; _stTodo.forEach(function (c) { _stTset[c.ticker] = 1; });
    var _stTickers = Object.keys(_stTset);
    var _stPmap = {};
    for (var _sti = 0; _sti < _stTickers.length; _sti++) { _stPmap[_stTickers[_sti]] = await _stHist(_stTickers[_sti]); }
    var _stNearest = function (keys, m, date) { var lo = 0, hi = keys.length - 1, ans = null; while (lo <= hi) { var mid = (lo + hi) >> 1; if (keys[mid] <= date) { ans = keys[mid]; lo = mid + 1; } else hi = mid - 1; } return ans != null ? m[ans] : null; };
    var _stAddDays = function (iso, d) { var dt = new Date(iso + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + d); return dt.toISOString().slice(0, 10); };
    var _stSettled = 0;
    for (var _stc = 0; _stc < _stTodo.length; _stc++) {
      var c = _stTodo[_stc];
      var _stTmap = _stPmap[c.ticker] || {}; var _stTkeys = Object.keys(_stTmap).sort();
      var _stEntry = (c.created_at || '').slice(0, 10);
      var _stSpyEntry = _stNearest(_stSpyKeys, _stSpy, _stEntry);
      var _stPatch = {};
      _stHZ.forEach(function (h) {
        if (_stAge(c) >= h[0] && c[h[1]] == null) {
          var td = _stAddDays(_stEntry, h[0]);
          var pxH = _stNearest(_stTkeys, _stTmap, td);
          var spyH = _stNearest(_stSpyKeys, _stSpy, td);
          if (pxH && c.entry_price > 0) {
            var tRet = pxH / c.entry_price - 1;
            var callRet = (c.dir === 'bear') ? -tRet : tRet;
            _stPatch[h[1]] = +callRet.toFixed(6);
            if (spyH && _stSpyEntry) { var sRet = spyH / _stSpyEntry - 1; var alpha = (c.dir === 'bear') ? (sRet - tRet) : (tRet - sRet); _stPatch[h[2]] = +alpha.toFixed(6); }
          }
        }
      });
      if (Object.keys(_stPatch).length) {
        _stPatch.settled_at = new Date().toISOString();
        var _stUr = await fetch(_stU + '/rest/v1/calls?id=eq.' + c.id, { method: 'PATCH', headers: { 'apikey': _stK, 'Authorization': 'Bearer ' + _stK, 'content-type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(_stPatch) });
        if (_stUr.status < 300) _stSettled++;
      }
    }
    res.status(200).json({ ok: true, scanned: _stCalls.length, candidates: _stTodo.length, settled: _stSettled });
  } catch (e) { res.status(200).json({ error: 'settle_fail', detail: (e && e.message) || String(e), settled: 0 }); }
  return;
}

  if (type === 'call' || type === 'calls') {
  var _cs = (process.env.SUPABASE_URL || '').trim(); while (_cs.slice(-1) === '/') _cs = _cs.slice(0, -1); if (_cs.slice(-8) === '/rest/v1') _cs = _cs.slice(0, -8);
  var _ck = process.env.SUPABASE_KEY;
  var _cbase = "https://" + (req.headers["x-forwarded-host"] || req.headers.host || "www.usequantora.com");
  if (type === 'calls') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!_cs || !_ck) { res.status(200).json({ data: [] }); return; }
    var _h = (req.query.handle || '').toString().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    var _lim = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 200));
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    try {
      var _q = _cs + '/rest/v1/calls?select=*&order=created_at.desc&limit=' + _lim + (_h ? ('&handle=eq.' + _h) : '');
      var _r = await fetch(_q, { headers: { 'apikey': _ck, 'Authorization': 'Bearer ' + _ck } });
      var _j = await _r.json();
      res.status(200).json({ data: Array.isArray(_j) ? _j : [] });
    } catch (e) { res.status(200).json({ data: [] }); }
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!_cs || !_ck) { res.status(200).json({ error: 'nocfg' }); return; }
  var _body = req.body; if (typeof _body === 'string') { try { _body = JSON.parse(_body); } catch (e) { _body = {}; } } _body = _body || {};
  var _handle = ((req.query.handle || _body.handle || 'anon') + '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'anon';
  var _ticker = ((req.query.symbol || req.query.ticker || _body.ticker || '') + '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 8);
  var _dir = (((req.query.dir || _body.dir || 'bull') + '').toLowerCase() === 'bear') ? 'bear' : 'bull';
  var _thesis = ((req.query.thesis || _body.thesis || '') + '').slice(0, 280);
  if (!_ticker) { res.status(200).json({ error: 'nosym' }); return; }
  try {
    var _pr = await fetch(_cbase + '/api/fmp?type=prices&symbol=' + encodeURIComponent(_ticker));
    var _pj = await _pr.json(); var _arr = Array.isArray(_pj) ? _pj : (_pj.data || _pj.historical || []);
    var _lastRow = _arr && _arr.length ? _arr[0] : null;
    var _last = _lastRow ? (_lastRow.price != null ? _lastRow.price : _lastRow.close) : null;
    if (!_last || !(_last > 0)) { res.status(200).json({ error: 'noprice' }); return; }
    var _entry = +(+_last).toFixed(4);
    var _ins = await fetch(_cs + '/rest/v1/calls', { method: 'POST', headers: { 'apikey': _ck, 'Authorization': 'Bearer ' + _ck, 'content-type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ handle: _handle, ticker: _ticker, dir: _dir, thesis: _thesis, entry_price: _entry }) });
    if (_ins.status >= 300) { res.status(200).json({ error: 'db', status: _ins.status }); return; }
    res.status(200).json({ ok: true, handle: _handle, ticker: _ticker, dir: _dir, entry_price: _entry });
  } catch (e) { res.status(200).json({ error: 'feed' }); }
  return;
}


  if (type === 'mcp') {
res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id, mcp-protocol-version");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const base = "https://" + (req.headers["x-forwarded-host"] || req.headers.host || "www.usequantora.com");

  /* ------------------------- data + math (ported, verified) ------------------------- */
  async function px(sym) {
    const r = await fetch(base + "/api/fmp?type=prices&symbol=" + encodeURIComponent(sym));
    const j = await r.json(); const arr = Array.isArray(j) ? j : (j.data || j.historical || []); const out = [];
    for (const row of arr) { const d = row.date || row.datetime; const p = row.price != null ? row.price : (row.close != null ? row.close : row.adjClose); if (d && p > 0) out.push({ d: String(d).slice(0, 10), v: +p }); }
    out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)); return out;
  }
  async function fred(series) {
    const r = await fetch(base + "/api/fmp?type=fred&series=" + encodeURIComponent(series)); const j = await r.json();
    const obs = (j && j.data && j.data.observations) || []; const out = [];
    for (const o of obs) { const v = parseFloat(o.value); if (!isNaN(v)) out.push({ d: o.date, v }); }
    out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)); return out;
  }
  async function aiScreen(query) {
    const prompt = 'Act as an equity screener over US-listed stocks. From the request, return 8-12 real US tickers. FIRST line exactly "TICKERS: X, Y, Z" (uppercase, comma separated). Then 2-4 sentences. Educational only. Request: ' + query;
    const r = await fetch(base + "/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: prompt, context: "MCP screener" }) });
    const j = await r.json(); if (j && j.error === "ai_key_needed") return { error: "Quantora AI key not set." };
    const ans = (j && j.answer) || ""; const line = (ans.split(/\n/).find((l) => /TICKERS?\s*:/i.test(l)) || "");
    const toks = (line.split(":").slice(1).join(":").match(/\$?[A-Z]{1,5}(?:\.[A-Z])?\b/g) || []).map((t) => t.replace(/^\$/, ""));
    const STOP = new Set(["A","I","AI","THE","AND","FOR","ARE","ETF","US"]); const seen = new Set(), tickers = [];
    for (const t of toks) { const b = t.split(".")[0]; if (STOP.has(b) || seen.has(t)) continue; seen.add(t); tickers.push(t); if (tickers.length >= 14) break; }
    return { tickers, reasoning: ans.replace(/^[\s\S]*?TICKERS?\s*:[^\n]*\n?/i, "").trim() };
  }
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const sd = (a) => { const m = mean(a); let s = 0; for (const x of a) s += (x - m) * (x - m); return Math.sqrt(s / (a.length - 1)); };
  const rets = (p) => { const r = []; for (let i = 1; i < p.length; i++) r.push(p[i].v / p[i - 1].v - 1); return r; };
  const logrets = (p) => { const r = []; for (let i = 1; i < p.length; i++) r.push(Math.log(p[i].v / p[i - 1].v)); return r; };
  const betaOf = (ys, xs) => { const mx = mean(xs), my = mean(ys); let n = 0, d = 0; for (let i = 0; i < xs.length; i++) { n += (xs[i] - mx) * (ys[i] - my); d += (xs[i] - mx) * (xs[i] - mx); } return d ? n / d : 0; };
  const corr = (x, y) => { const mx = mean(x), my = mean(y); let n = 0, dx = 0, dy = 0; for (let i = 0; i < x.length; i++) { n += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; } return n / Math.sqrt(dx * dy); };
  const maxDD = (r) => { let eq = 1, peak = 1, m = 0; for (const x of r) { eq *= 1 + x; if (eq > peak) peak = eq; const dd = eq / peak - 1; if (dd < m) m = dd; } return m; };
  const pctile = (s, p) => { const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  const toMap = (p) => { const m = {}; for (const o of p) m[o.d] = o.v; return m; };
  const align = (...maps) => { let d = Object.keys(maps[0]); for (let i = 1; i < maps.length; i++) d = d.filter((x) => maps[i][x]); d.sort(); return d; };
  const matInv = (M) => { const n = M.length, A = M.map((r) => r.slice()); for (let i = 0; i < n; i++) A[i] = A[i].concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))); for (let c = 0; c < n; c++) { let pv = c, bs = Math.abs(A[c][c]); for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > bs) { bs = Math.abs(A[r][c]); pv = r; } if (bs < 1e-13) return null; const tmp = A[c]; A[c] = A[pv]; A[pv] = tmp; const dv = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= dv; for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; } } return A.map((r) => r.slice(n)); };
  const mVec = (M, v) => M.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
  const ANN = Math.sqrt(252);
  function riskStats(p, spy) { const dm = toMap(p), sm = toMap(spy), dates = align(dm, sm); const r = [], rm = []; for (let i = 1; i < dates.length; i++) { r.push(dm[dates[i]] / dm[dates[i - 1]] - 1); rm.push(sm[dates[i]] / sm[dates[i - 1]] - 1); } const m = mean(r), s = sd(r), srt = r.slice().sort((a, b) => a - b); const downs = r.filter((x) => x < 0), dsd = downs.length ? Math.sqrt(downs.reduce((a, x) => a + x * x, 0) / downs.length) : 0; const v95 = pctile(srt, 0.05); let cv = 0, c = 0; for (const x of r) if (x <= v95) { cv += x; c++; } return { days: r.length, totalReturn: dm[dates[dates.length - 1]] / dm[dates[0]] - 1, cagr: Math.pow(dm[dates[dates.length - 1]] / dm[dates[0]], 252 / (dates.length - 1)) - 1, annVol: s * ANN, beta: betaOf(r, rm), corrSPY: corr(r, rm), sharpe: (m * 252) / (s * ANN), sortino: dsd ? (m * 252) / (dsd * ANN) : null, maxDrawdown: maxDD(r), var95: v95, cvar95: c ? cv / c : v95, var99: pctile(srt, 0.01) }; }
  function hurst(r) { const taus = [1, 2, 4, 8, 16, 32], xs = [], ys = []; for (const tau of taus) { const sums = []; let i = 0; while (i + tau <= r.length) { let s = 0; for (let j = 0; j < tau; j++) s += r[i + j]; sums.push(s); i += tau; } if (sums.length < 8) continue; const v = sd(sums) ** 2; if (v > 0) { xs.push(Math.log(tau)); ys.push(Math.log(v)); } } return betaOf(ys, xs) / 2; }
  function varRatio(r, q) { const n = r.length, mu = mean(r), v1 = sd(r) ** 2; let sq = 0; for (let t = q; t <= n; t++) { let s = 0; for (let j = 0; j < q; j++) s += r[t - 1 - j]; sq += (s - q * mu) ** 2; } const vq = sq / (q * (n - q + 1) * (1 - q / n)); const vr = vq / v1; return { q, vr, z: (vr - 1) / Math.sqrt((2 * (2 * q - 1) * (q - 1)) / (3 * q * n)) }; }
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
  const need = (p, min, sym) => { if (!p || p.length < min) throw new Error("Not enough price history for " + sym); };

  /* ------------------------------ tool catalog ------------------------------ */
  const S = (props, req2) => ({ type: "object", properties: props, required: req2 || [] });
  const sym = { symbol: { type: "string", description: "Ticker e.g. NVDA, SPY, BTCUSD" } };
  const TOOLS = [
    { name: "quantora_get_prices", description: "Recent split-adjusted daily closes + snapshot (last, 1d/1m/1y change, 52-week range) for any US stock, ETF or crypto ticker.", inputSchema: S({ ...sym, days: { type: "number", description: "recent closes to return (default 60)" } }, ["symbol"]),
      run: async ({ symbol, days = 60 }) => { const p = await px(symbol); need(p, 5, symbol); const n = p.length, last = p[n - 1].v, ret = (k) => (n > k ? last / p[n - 1 - k].v - 1 : null); const w = p.slice(-252).map((o) => o.v), hi = Math.max(...w), lo = Math.min(...w); return { symbol: symbol.toUpperCase(), last, change_1d: ret(1), change_1m: ret(21), change_1y: ret(252), range52w: { low: lo, high: hi, pctOfRange: ((last - lo) / (hi - lo)) * 100 }, prices: p.slice(-Math.min(days, 400)).map((o) => ({ date: o.d, close: +o.v.toFixed(4) })) }; } },
    { name: "quantora_risk_metrics", description: "Full risk profile over ~5y: total return, CAGR, annualized vol, beta & correlation vs S&P 500, Sharpe, Sortino, max drawdown, 95/99% VaR and 95% CVaR.", inputSchema: S(sym, ["symbol"]),
      run: async ({ symbol }) => { const [p, spy] = await Promise.all([px(symbol), px("SPY")]); need(p, 120, symbol); return { symbol: symbol.toUpperCase(), ...riskStats(p, spy) }; } },
    { name: "quantora_compare", description: "Compare two tickers head-to-head over ~5y (return, CAGR, vol, beta, max drawdown, Sharpe) plus the correlation between them.", inputSchema: S({ symbol_a: { type: "string" }, symbol_b: { type: "string" } }, ["symbol_a", "symbol_b"]),
      run: async ({ symbol_a, symbol_b }) => { const [a, b, spy] = await Promise.all([px(symbol_a), px(symbol_b), px("SPY")]); need(a, 120, symbol_a); need(b, 120, symbol_b); const am = toMap(a), bm = toMap(b), dt = align(am, bm), ra = [], rb = []; for (let i = 1; i < dt.length; i++) { ra.push(am[dt[i]] / am[dt[i - 1]] - 1); rb.push(bm[dt[i]] / bm[dt[i - 1]] - 1); } return { a: { symbol: symbol_a.toUpperCase(), ...riskStats(a, spy) }, b: { symbol: symbol_b.toUpperCase(), ...riskStats(b, spy) }, correlation: corr(ra, rb) }; } },
    { name: "quantora_volatility_cone", description: "Realized-volatility cone at 21/63/126/252-day horizons (min/25/median/75/max) plus current 21-day vol percentile vs its own history.", inputSchema: S(sym, ["symbol"]),
      run: async ({ symbol }) => { const p = await px(symbol); need(p, 260, symbol); const r = logrets(p); const roll = (w) => { const o = []; for (let i = w; i <= r.length; i++) o.push(sd(r.slice(i - w, i)) * Math.sqrt(252)); return o; }; const cone = [21, 63, 126, 252].map((w) => { const s = roll(w).sort((a, b) => a - b); return { horizonDays: w, min: s[0], p25: pctile(s, 0.25), median: pctile(s, 0.5), p75: pctile(s, 0.75), max: s[s.length - 1] }; }); const cur = roll(21), cv = cur[cur.length - 1], srt = cur.slice().sort((a, b) => a - b); let bl = 0; for (const x of srt) if (x < cv) bl++; return { symbol: symbol.toUpperCase(), cone, current21dVol: cv, percentileVsOwnHistory: (bl / srt.length) * 100 }; } },
    { name: "quantora_factor_exposure", description: "5-factor returns-based regression (market, size, value, momentum, quality) with betas, t-stats, R-squared and annualized alpha.", inputSchema: S(sym, ["symbol"]),
      run: async ({ symbol }) => { const syms = [symbol, "SPY", "IWM", "IVE", "IVW", "MTUM", "QUAL"]; const [maps, rf] = await Promise.all([Promise.all(syms.map((s) => px(s).then(toMap))), fred("DGS3MO").then(toMap)]); const [tg, spy, iwm, ive, ivw, mtum, qual] = maps; need(Object.keys(tg), 150, symbol); const rd = Object.keys(rf).sort(); const rfAt = (d) => { let lo = 0, hi = rd.length - 1, a = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (rd[m] <= d) { a = rd[m]; lo = m + 1; } else hi = m - 1; } return a ? rf[a] : 4; }; const dt = align(tg, spy, iwm, ive, ivw, mtum, qual), X = [], Y = []; for (let i = 1; i < dt.length; i++) { const d0 = dt[i - 1], d1 = dt[i], rt = (o) => o[d1] / o[d0] - 1, rfd = rfAt(d1) / 100 / 252, y = rt(tg) - rfd; if (!isFinite(y) || Math.abs(y) > 0.6) continue; X.push([1, rt(spy) - rfd, rt(iwm) - rt(spy), rt(ive) - rt(ivw), rt(mtum) - rt(spy), rt(qual) - rt(spy)]); Y.push(y); } const k = 6, n = X.length, XtX = Array.from({ length: k }, () => Array(k).fill(0)), Xty = Array(k).fill(0); for (let t = 0; t < n; t++) for (let a = 0; a < k; a++) { Xty[a] += X[t][a] * Y[t]; for (let b = 0; b < k; b++) XtX[a][b] += X[t][a] * X[t][b]; } const inv = matInv(XtX); if (!inv) throw new Error("singular"); const bt = mVec(inv, Xty), yb = mean(Y); let rss = 0, tss = 0; for (let t = 0; t < n; t++) { let pr = 0; for (let a = 0; a < k; a++) pr += bt[a] * X[t][a]; rss += (Y[t] - pr) ** 2; tss += (Y[t] - yb) ** 2; } const s2 = rss / (n - k), se = inv.map((row, i) => Math.sqrt(Math.max(0, s2 * row[i]))), ts = bt.map((v, i) => (se[i] ? v / se[i] : 0)); const nm = ["alpha", "market", "size", "value", "momentum", "quality"], f = {}; nm.forEach((x, i) => { f[x] = { beta: bt[i], tStat: ts[i], significant: Math.abs(ts[i]) > 1.96 }; }); return { symbol: symbol.toUpperCase(), observations: n, rSquared: 1 - rss / tss, annualizedAlpha: bt[0] * 252, factors: f }; } },
    { name: "quantora_drawdowns", description: "Max/current drawdown, Ulcer index, longest time underwater, and 5 worst peak-to-trough episodes with recovery times.", inputSchema: S(sym, ["symbol"]),
      run: async ({ symbol }) => { const p = await px(symbol); need(p, 120, symbol); const n = p.length; let peak = p[0].v, pd = p[0].d, inDD = false, sP, sPD, tr, trD, m = 0, mi = 0, ss = 0; const eps = []; for (let i = 0; i < n; i++) { const v = p[i].v; if (v >= peak) { if (inDD) { eps.push({ peak: sP, peakDate: sPD, trough: tr, troughDate: trD, recDate: p[i].d, ongoing: false }); inDD = false; } peak = v; pd = p[i].d; } else { if (!inDD) { inDD = true; sP = peak; sPD = pd; tr = v; trD = p[i].d; } else if (v < tr) { tr = v; trD = p[i].d; } } const dd = v / peak - 1; if (dd < m) { m = dd; mi = i; } ss += (dd * 100) ** 2; } if (inDD) eps.push({ peak: sP, peakDate: sPD, trough: tr, troughDate: trD, recDate: null, ongoing: true }); const dys = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5); eps.forEach((e) => { e.depth = e.trough / e.peak - 1; e.endD = e.recDate || p[n - 1].d; e.peakToTroughDays = dys(e.peakDate, e.troughDate); e.recoveryDays = e.ongoing ? null : dys(e.troughDate, e.endD); e.underwaterDays = dys(e.peakDate, e.endD); }); return { symbol: symbol.toUpperCase(), maxDrawdown: m, maxDrawdownDate: p[mi].d, currentDrawdown: p[n - 1].v / peak - 1, ulcerIndex: Math.sqrt(ss / n), longestUnderwaterDays: Math.max(0, ...eps.map((e) => e.underwaterDays)), worstDrawdowns: eps.slice().sort((a, b) => a.depth - b.depth).slice(0, 5) }; } },
    { name: "quantora_trend_regime", description: "Whether a stock trends or mean-reverts: Hurst exponent + Lo-MacKinlay variance-ratio test with a plain verdict.", inputSchema: S(sym, ["symbol"]),
      run: async ({ symbol }) => { const p = await px(symbol); need(p, 200, symbol); const r = logrets(p), H = hurst(r), vr = [2, 4, 8, 16].map((q) => varRatio(r, q)), v16 = vr[3].vr; return { symbol: symbol.toUpperCase(), hurstExponent: H, varianceRatios: vr, verdict: H > 0.54 || v16 > 1.1 ? "trending / persistent" : H < 0.46 || v16 < 0.9 ? "mean-reverting / anti-persistent" : "random walk" }; } },
    { name: "quantora_return_distribution", description: "Return-distribution & tail stats: annualized return/vol, skew, excess kurtosis, % up days, VaR/CVaR 95/99, Jarque-Bera normality.", inputSchema: S(sym, ["symbol"]),
      run: async ({ symbol }) => { const p = await px(symbol); need(p, 160, symbol); const r = rets(p), n = r.length, m = mean(r); let s2 = 0, s3 = 0, s4 = 0; for (const x of r) { const d = x - m; s2 += d * d; s3 += d ** 3; s4 += d ** 4; } const sk = (s3 / n) / Math.pow(s2 / n, 1.5), ek = (s4 / n) / Math.pow(s2 / n, 2) - 3, jb = (n / 6) * (sk * sk + ek * ek / 4); const srt = r.slice().sort((a, b) => a - b), v95 = pctile(srt, 0.05); let cv = 0, c = 0; for (const x of srt) if (x <= v95) { cv += x; c++; } return { symbol: symbol.toUpperCase(), days: n, annReturn: m * 252, annVol: Math.sqrt(s2 / (n - 1)) * ANN, skew: sk, excessKurtosis: ek, pctUpDays: r.filter((x) => x > 0).length / n, var95: v95, cvar95: c ? cv / c : v95, var99: pctile(srt, 0.01), jarqueBera: jb, rejectsNormality: jb > 6 }; } },
    { name: "quantora_screen", description: "AI natural-language equity screener: describe what you want, get US tickers + reasoning. AI-generated starting points, not a live fundamental screen.", inputSchema: S({ query: { type: "string", description: "Plain-English screen" } }, ["query"]),
      run: async ({ query }) => aiScreen(query) },
    { name: "quantora_recession_signals", description: "US recession & macro dashboard from FRED: yield-curve recession probability (Estrella-Mishkin), 10y-3m & 10y-2y spreads, and current Treasury yields.", inputSchema: S({}, []),
      run: async () => { const [m3, y10, y2] = await Promise.all([fred("DGS3MO"), fred("DGS10"), fred("DGS2")]); const last = (a) => (a.length ? a[a.length - 1].v : null); const a = last(m3), b = last(y10), c = last(y2), sp = b - a; return { recessionProbability12mo: normCdf(-0.5333 - 0.6629 * sp), spread10y3m_bps: sp * 100, spread10y2y_bps: (b - c) * 100, yields: { m3: a, y2: c, y10: b }, inverted: sp < 0, asOf: y10.length ? y10[y10.length - 1].d : null }; } },
  ];

  const manifest = { name: "quantora", version: "1.0.0", description: "Quantora quantitative markets engines as MCP tools. Deterministic numbers from live data; no keys required.", endpoint: base + "/api/mcp", tools: TOOLS.map((t) => ({ name: t.name, description: t.description })) };
  if (req.method === "GET") { res.setHeader("content-type", "application/json"); res.status(200).json(manifest); return; }

  /* ------------------------------ JSON-RPC ------------------------------ */
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body) { let raw = ""; await new Promise((ok) => { req.on("data", (c) => (raw += c)); req.on("end", ok); }); try { body = JSON.parse(raw); } catch (e) { body = null; } }
  const rpc = async (msg) => {
    const id = msg && msg.id, method = msg && msg.method;
    const ok = (result) => ({ jsonrpc: "2.0", id, result });
    const err = (code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
    try {
      if (method === "initialize") return ok({ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "quantora", version: "1.0.0" }, instructions: "Quantora quant engines. Numbers are computed from live data; cite them directly." });
      if (method === "tools/list") return ok({ tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
      if (method === "tools/call") { const t = TOOLS.find((x) => x.name === (msg.params && msg.params.name)); if (!t) return err(-32602, "Unknown tool"); try { const out = await t.run((msg.params && msg.params.arguments) || {}); return ok({ content: [{ type: "text", text: JSON.stringify(out, null, 2) }] }); } catch (e) { return ok({ content: [{ type: "text", text: "Error: " + (e && e.message || e) }], isError: true }); } }
      if (method === "ping") return ok({});
      if (method && method.indexOf("notifications/") === 0) return null; // notifications: no response
      return err(-32601, "Method not found: " + method);
    } catch (e) { return err(-32603, "Internal error: " + (e && e.message || e)); }
  };
  res.setHeader("content-type", "application/json");
  if (Array.isArray(body)) { const out = (await Promise.all(body.map(rpc))).filter(Boolean); res.status(200).json(out); return; }
  const out = await rpc(body || {}); if (out === null) { res.status(202).end(); return; } res.status(200).json(out);
  return;
}


  const sym = (req.query.symbol || req.query.sym || '').toString().replace(/[^A-Za-z0-9.\-]/g, '').toUpperCase().slice(0, 12);
  if (type === 'stock') { return renderStock(res, KEY, sym); }
  if (type === 'engine') { return renderEngine(req, res); }
  if (type === 'compare') { return renderCompare(req, res, KEY); }
  if (type === 'ai') { return renderAI(req, res); } if (type === 'pulse') { let _s = (process.env.SUPABASE_URL || '').trim(); while(_s.length && _s.slice(-1)==='/') _s = _s.slice(0,-1); if(_s.slice(-8)==='/rest/v1') _s = _s.slice(0,-8); while(_s.length && _s.slice(-1)==='/') _s = _s.slice(0,-1); const SU = _s; const SK = process.env.SUPABASE_KEY; if (!SU || !SK) { res.status(200).json({ error: 'nocfg' }); return; } const tk = (sym || '').toString().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 8); if (!tk) { res.status(200).json({ error: 'nosym' }); return; } try { await fetch(SU + '/rest/v1/pulse_events', { method: 'POST', headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK, 'content-type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ ticker: tk }) }); res.status(200).json({ ok: true }); } catch (e) { res.status(200).json({ error: 'feed' }); } return; } if (type === 'pulsetop') { let _s = (process.env.SUPABASE_URL || '').trim(); while(_s.length && _s.slice(-1)==='/') _s = _s.slice(0,-1); if(_s.slice(-8)==='/rest/v1') _s = _s.slice(0,-8); while(_s.length && _s.slice(-1)==='/') _s = _s.slice(0,-1); const SU = _s; const SK = process.env.SUPABASE_KEY; if (!SU || !SK) { res.status(200).json({ data: [] }); return; } const hrs = Math.max(1, Math.min(720, parseInt(req.query.hours, 10) || 168)); res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600'); try { const r = await fetch(SU + '/rest/v1/rpc/top_tickers', { method: 'POST', headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK, 'content-type': 'application/json' }, body: JSON.stringify({ since_hours: hrs }) }); const j = await r.json(); res.status(200).json({ data: Array.isArray(j) ? j : [] }); } catch (e) { res.status(200).json({ data: [] }); } return; } if (type === 'db') { const DB = process.env.DATABENTO_KEY; if (!DB) { res.status(200).json({ error: 'nokey' }); return; } const schema = (req.query.schema || 'ohlcv-1d').toString(); if (['ohlcv-1d','ohlcv-1h','ohlcv-1m','ohlcv-1s','trades','mbp-1','bbo-1s','tbbo'].indexOf(schema) < 0) { res.status(200).json({ error: 'badschema' }); return; } const dataset = (req.query.dataset || 'DBEQ.BASIC').toString().replace(/[^A-Za-z0-9._-]/g, ''); const symbols = (sym || req.query.symbols || '').toString().toUpperCase().replace(/[^A-Z0-9.,-]/g, '').slice(0, 120); if (!symbols) { res.status(200).json({ error: 'nosym' }); return; } function ymd(d) { return d.toISOString().slice(0, 10); } const nowD = new Date(); const startD = (req.query.start || '').toString().replace(/[^0-9T:-]/g, '') || ymd(new Date(nowD.getTime() - 8 * 864e5)); const endD = (req.query.end || '').toString().replace(/[^0-9T:-]/g, '') || ymd(nowD); const lim = Math.max(1, Math.min(5000, parseInt(req.query.limit, 10) || 500)); res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300'); try { const u = 'https://hist.databento.com/v0/timeseries.get_range?dataset=' + encodeURIComponent(dataset) + '&symbols=' + encodeURIComponent(symbols) + '&schema=' + encodeURIComponent(schema) + '&stype_in=raw_symbol&encoding=json&start=' + encodeURIComponent(startD) + '&end=' + encodeURIComponent(endD) + '&limit=' + lim; const auth = 'Basic ' + Buffer.from(DB + ':').toString('base64'); const r = await fetch(u, { headers: { 'Authorization': auth } }); const txt = await r.text(); const rows = txt.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); res.status(200).json({ data: rows, delayed: true, source: 'databento', schema: schema }); } catch (e) { res.status(200).json({ error: 'feed' }); } return; } if (type === 'fh') { const FH = process.env.FINNHUB_KEY; if (!FH) { res.status(200).json({ error: 'nokey' }); return; } const fp = (req.query.path || '').toString(); if (['stock/recommendation','stock/price-target','stock/upgrade-downgrade','calendar/earnings'].indexOf(fp) < 0) { res.status(200).json({ error: 'badpath' }); return; } res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400'); try { let fu = 'https://finnhub.io/api/v1/' + fp + '?token=' + FH; if (fp === 'calendar/earnings') { const ff = (req.query.from || '').toString().replace(/[^0-9-]/g, ''); const ft = (req.query.to || '').toString().replace(/[^0-9-]/g, ''); if (ff) fu += '&from=' + ff; if (ft) fu += '&to=' + ft; } else { fu += '&symbol=' + encodeURIComponent(sym); } const fr = await fetch(fu); const fj = await fr.json(); res.status(200).json({ data: fj }); } catch (e) { res.status(200).json({ error: 'feed' }); } return; }
  if (type === 'sec') { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=1800'); try { const p=(req.query.path||'').toString().replace(/[^\w.\/-]/g,''); if(p.indexOf('..')>=0||!/^(submissions\/CIK\d{10}\.json|api\/xbrl\/(companyfacts\/CIK\d{10}|companyconcept\/CIK\d{10}\/[A-Za-z-]+\/[A-Za-z0-9-]+)\.json|files\/company_tickers\.json|Archives\/edgar\/data\/\d{1,10}\/\d{18}\/(index\.json|[A-Za-z0-9_.-]+\.xml))$/.test(p)){ res.status(200).json({ error:'sec_path_not_allowed' }); return; } const host=(p.indexOf('files/')===0||p.indexOf('Archives/')===0)?'www.sec.gov':'data.sec.gov'; const r=await fetch('https://'+host+'/'+p,{headers:{'User-Agent':'Quantora nicolugo0503@gmail.com'}}); if(!r.ok){ res.status(200).json({ error:'sec_'+r.status }); return; } const ct=r.headers.get('content-type')||''; const txt=await r.text(); let data; if(/json/.test(ct)||/\.json$/.test(p)){ try{ data=JSON.parse(txt); }catch(e){ data=txt; } } else { data=txt; } res.status(200).json({ data:data }); } catch(o){ res.status(200).json({ error:'sec_error' }); } return; }
  if (type === 'fred') { res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=7200'); const fk=process.env.FRED_KEY; if(!fk){ res.status(200).json({ error:'fred_key_needed' }); return; } try { const s=(req.query.series||'').toString().replace(/[^A-Za-z0-9]/g,''); const r=await fetch('https://api.stlouisfed.org/fred/series/observations?series_id='+s+'&api_key='+fk+'&file_type=json&sort_order=desc&limit=1200'); const j=await r.json(); res.status(200).json({ data:j }); } catch(o){ res.status(200).json({ error:'fred_error' }); } return; }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  if (!KEY) { res.status(200).json({ error: 'nokey' }); return; }
  const MAP = {
    quote: () => 'quote?symbol=' + sym, profile: () => 'profile?symbol=' + sym, targets: () => 'price-target-consensus?symbol=' + sym,
    ratings: () => 'ratings-snapshot?symbol=' + sym, metrics: () => 'key-metrics?symbol=' + sym + '&limit=1', peers: () => 'stock-peers?symbol=' + sym,
    insider: () => sym ? ('insider-trading/search?symbol=' + sym + '&page=0&limit=12') : ('insider-trading/latest?page=0&limit=15'),
    senate: () => sym ? ('senate-trades?symbol=' + sym) : ('senate-latest?page=' + (Math.max(0,Math.min(20,(+req.query.page||0)))) + '&limit=15'), house: () => 'house-latest?page=' + (Math.max(0,Math.min(20,(+req.query.page||0)))) + '&limit=15',
    estimates: () => 'analyst-estimates?symbol=' + sym + '&period=annual&page=0&limit=5', thirteenf: () => 'institutional-ownership/symbol-positions-summary?symbol=' + sym + '&page=0&limit=1',
    etfhold: () => 'etf/holdings?symbol=' + sym, etfsector: () => 'etf/sector-weightings?symbol=' + sym, gainers: () => 'biggest-gainers', losers: () => 'biggest-losers', actives: () => 'most-actives', actives: () => 'most-active',
    earncal: () => ('earnings-calendar?from='+(req.query.from||new Date(Date.now()-2592e5).toISOString().slice(0,10))+'&to='+(req.query.to||new Date(Date.now()+6912e5).toISOString().slice(0,10))), news: () => 'stock-news?limit=12', income: () => 'income-statement?symbol=' + sym + '&period=annual&limit=2', balance: () => 'balance-sheet-statement?symbol=' + sym + '&period=annual&limit=2',
    cashflow: () => 'cash-flow-statement?symbol=' + sym + '&period=annual&limit=2', prices: () => 'historical-price-eod/light?symbol=' + sym, ratios: () => 'ratios?symbol=' + sym + '&limit=1'
  };
  const build = MAP[type];
  if (!build) { res.status(200).json({ error: 'badtype' }); return; }
  try { const path = build(); const sep = path.indexOf('?') >= 0 ? '&' : '?'; let j=null; try{ const r = await fetch('https://financialmodelingprep.com/stable/' + path + sep + 'apikey=' + KEY); j = await r.json(); }catch(_e){ j=null; } if(type==='prices'){ let arr=Array.isArray(j)?j:((j&&j.historical)||[]); if(arr.length<30 && process.env.TWELVEDATA_KEY){ const td=await fetch('https://api.twelvedata.com/time_series?symbol='+encodeURIComponent(sym)+'&interval=1day&outputsize=1300&apikey='+process.env.TWELVEDATA_KEY).then(function(x){return x.json();}).catch(function(){return null;}); if(td&&td.values&&td.values.length){ j=td.values.map(function(v){return {date:v.datetime, price:parseFloat(v.close)};}); } } } res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=90'); res.status(200).json({ data: j }); }
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
  sharpe:['@returns'], sortino:['@returns'], maxDrawdown:['@returns'], calmar:['@returns'], ulcerIndex:['@returns'], beta:['@asset','@bench'], correlation:['@x','@y'],
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
async function marketDataTool(input){
  var KEY=process.env.FMP_KEY; if(!KEY) return { error:'no_market_data_key' };
  var sym=((input&&input.symbol)||'').toString().replace(/[^A-Za-z0-9.\-]/g,'').toUpperCase().slice(0,12);
  if(!sym) return { error:'no_symbol' };
  var fields=(input&&input.fields)||['quote']; if(typeof fields==='string') fields=[fields];
  async function f(path){ try{ var sep=path.indexOf('?')>=0?'&':'?'; var r=await fetch('https://financialmodelingprep.com/stable/'+path+sep+'apikey='+KEY); return await r.json(); }catch(e){ return null; } }
  var out={ symbol:sym };
  for(var i=0;i<fields.length;i++){ var fld=fields[i];
    if(fld==='quote'){ var q=await f('quote?symbol='+sym); q=Array.isArray(q)?q[0]:q; if(q) out.quote={ price:q.price, changePct:(q.changePercentage!=null?q.changePercentage:q.changesPercentage), marketCap:q.marketCap, pe:q.pe, name:q.name, dayHigh:q.dayHigh, dayLow:q.dayLow, yearHigh:q.yearHigh, yearLow:q.yearLow }; }
    else if(fld==='prices'||fld==='returns'){ var pr=await f('historical-price-eod/light?symbol='+sym); var arr=Array.isArray(pr)?pr:((pr&&pr.historical)||[]); var closes=arr.slice(0,260).map(function(x){return x.price!=null?x.price:x.close;}).filter(function(x){return x!=null&&isFinite(x);}); var rets=[]; for(var k=0;k<closes.length-1;k++){ rets.push((closes[k]-closes[k+1])/closes[k+1]); } out.returns=rets.slice(0,250).reverse(); out.lastClose=closes[0]; }
    else if(fld==='profile'){ var p=await f('profile?symbol='+sym); p=Array.isArray(p)?p[0]:p; if(p) out.profile={ name:p.companyName, sector:p.sector, beta:p.beta, price:p.price, description:(p.description||'').slice(0,300) }; }
    else if(fld==='income'){ var inc=await f('income-statement?symbol='+sym+'&period=annual&limit=1'); inc=Array.isArray(inc)?inc[0]:inc; if(inc) out.income={ revenue:inc.revenue, operatingIncome:inc.operatingIncome, ebit:inc.operatingIncome, netIncome:inc.netIncome }; }
    else if(fld==='balance'){ var bal=await f('balance-sheet-statement?symbol='+sym+'&period=annual&limit=1'); bal=Array.isArray(bal)?bal[0]:bal; if(bal) out.balance={ totalAssets:bal.totalAssets, totalLiabilities:bal.totalLiabilities, totalEquity:(bal.totalStockholdersEquity!=null?bal.totalStockholdersEquity:bal.totalEquity), retainedEarnings:bal.retainedEarnings, currentAssets:bal.totalCurrentAssets, currentLiabilities:bal.totalCurrentLiabilities }; }
    else if(fld==='metrics'){ var m=await f('key-metrics?symbol='+sym+'&limit=1'); m=Array.isArray(m)?m[0]:m; if(m) out.metrics={ roe:m.returnOnEquity, roic:(m.returnOnInvestedCapital||m.roic), fcfYield:m.freeCashFlowYield, netDebtToEBITDA:m.netDebtToEBITDA }; }
  }
  return out;
}
async function renderAI(req, res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','no-store');
  var body = req.body; if(typeof body==='string'){ try{ body=JSON.parse(body); }catch(e){ body={}; } }
  body = body || {};
  var q = (body.q || body.question || req.query.q || '').toString().slice(0,2000);
  var ctx = (body.context || req.query.context || '').toString().slice(0,4000);
  var mode = (body.mode || req.query.mode || '').toString();
  if(!q){ res.statusCode=200; res.end(JSON.stringify({ error:'no_question' })); return; }
  var oaiKey = process.env.OPENAI_API_KEY, antKey = process.env.ANTHROPIC_API_KEY;
  var prov = (process.env.QAI_PROVIDER||'').toLowerCase();
  if(!prov) prov = oaiKey ? 'openai' : (antKey ? 'anthropic' : '');
  if(!prov || (prov==='openai'&&!oaiKey) || (prov==='anthropic'&&!antKey)){ res.statusCode=200; res.end(JSON.stringify({ error:'ai_key_needed' })); return; }

  if(mode==='parse'){
    var fields=body.fields||[]; if(typeof fields==='string'){ try{ fields=JSON.parse(fields); }catch(e){ fields=[]; } }
    var labels=fields.map(function(f){return typeof f==='string'?f:(f&&f.label||'');}).filter(Boolean).slice(0,40);
    var psys="You extract numeric input values from a plain-English description for a finance calculator. Return ONLY strict minified JSON: an object mapping each provided field label (verbatim) to a number. Omit fields not mentioned. Express percentages as the number typed in a percent box (20 for 20%). No prose.";
    var pmsg="Fields: "+JSON.stringify(labels)+"\nDescription: "+q;
    var raw="";
    try{
      if(prov==='openai'){ var pr=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+oaiKey,'content-type':'application/json'},body:JSON.stringify({model:process.env.QAI_MODEL||'gpt-4o-mini',messages:[{role:'system',content:psys},{role:'user',content:pmsg}],max_tokens:500,response_format:{type:'json_object'}})}); var pj=await pr.json(); if(pj.error){ res.statusCode=200; res.end(JSON.stringify({error:'ai_error',detail:(pj.error&&pj.error.message)||'AI error'})); return; } raw=(pj.choices&&pj.choices[0]&&pj.choices[0].message&&pj.choices[0].message.content)||""; }
      else { var pa=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':antKey,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:process.env.QAI_MODEL||'claude-3-5-haiku-latest',max_tokens:500,system:psys,messages:[{role:'user',content:pmsg+"\nReturn only JSON."}]})}); var paj=await pa.json(); if(paj.type==='error'||paj.error){ res.statusCode=200; res.end(JSON.stringify({error:'ai_error',detail:(paj.error&&paj.error.message)||'AI error'})); return; } raw=(paj.content||[]).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join(""); }
    }catch(e){ res.statusCode=200; res.end(JSON.stringify({error:'server_error',message:String(e&&e.message||e)})); return; }
    var vals={}; try{ vals=JSON.parse((raw||'').replace(/```json|```/g,'').trim()); }catch(e){ vals={}; }
    res.statusCode=200; res.end(JSON.stringify({ values:vals })); return;
  }
  var Q; try{ Q=require('../engines.js'); }catch(e){ Q=null; }
  var mdCache = {};
  async function doTool(name, input){
    if(name==='get_market_data'){ var out=await marketDataTool(input); if(out){ if(out.returns){ mdCache[out.symbol]=out.returns; mdCache._last=out.returns; } } return out; }
    if(name==='run_engine'){ var inp=input||{}; var p=inp.params||{}; Object.keys(p).forEach(function(k){ var v=p[k]; if(typeof v==='string'&&v.charAt(0)==='@'){ var key=v.slice(1).toUpperCase(); p[k]=(key==='LAST'?mdCache._last:mdCache[key])||v; } }); inp.params=p; return runEngineTool(Q, inp); }
    return { error:'unknown_tool', tool:name };
  }
  var paramHelp = Object.keys(AI_SPEC).map(function(k){ return k+'('+AI_SPEC[k].map(function(x){return x.charAt(0)==='@'?x.slice(1)+'[]':x;}).join(', ')+')'; }).join('; ');
  var engDesc = 'Run a verified Quantora quant engine; returns the exact numeric result. engine must be one of: '+paramHelp+'. params is an object of named inputs. IMPORTANT: for array inputs (names ending []) that you already fetched via get_market_data, do NOT paste the numbers — pass the string "@SYMBOL" (e.g. returns:"@AAPL") or "@last" and the system substitutes the real series. Pass scalar inputs (price, spot, etc.) as numbers.';
  var mdDesc = 'Fetch LIVE market data for a real ticker (stock, ETF, or crypto like BTCUSD). symbol = ticker. fields = any of ["quote","returns","profile","income","balance","metrics"]. "returns" loads a daily return series (reference it later as "@SYMBOL"); "quote" gives live price; income/balance/metrics give fundamentals for Altman Z / DuPont / Merton.';
  var system = "You are Quantora's quantitative markets analyst. To analyze a REAL ticker, FIRST call get_market_data to load its live data, THEN call run_engine on it — referencing any fetched return series as \"@SYMBOL\" (never paste the raw numbers). For ANY numeric result you MUST use run_engine; never estimate. Explain briefly in plain language. Be concise. Compliance: educational analysis only, NOT personalized investment advice; not a registered investment adviser/broker-dealer; never tell the user to buy or sell specific securities.";
  var calcSys = "You are a quantitative finance calculator. Compute the requested result using ONLY your own reasoning and arithmetic — do NOT use any tools, and ignore any answer already shown in the context. Reply with the final numeric answer clearly first, then ONE short sentence on method. Be concise.";
  var userMsg = ctx ? (ctx+"\n\nTask: "+q) : q;
  var used = [];
  try{
    if(prov==='openai'){
      var tools=[{type:'function',function:{name:'run_engine',description:engDesc,parameters:{type:'object',properties:{engine:{type:'string'},params:{type:'object'}},required:['engine','params']}}},{type:'function',function:{name:'get_market_data',description:mdDesc,parameters:{type:'object',properties:{symbol:{type:'string'},fields:{type:'array',items:{type:'string'}}},required:['symbol']}}}];
      async function oai(messages, useTools){ var r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+oaiKey,'content-type':'application/json'},body:JSON.stringify({model:process.env.QAI_MODEL||'gpt-4o-mini',messages:messages,tools:useTools?tools:undefined,tool_choice:useTools?'auto':undefined,max_tokens:1200})}); return await r.json(); }
      var aiOwn=null;
      if(mode==='compute'){ var jno=await oai([{role:'system',content:calcSys},{role:'user',content:userMsg}],false); if(jno.error){res.statusCode=200;res.end(JSON.stringify({error:'ai_error',detail:(jno.error&&jno.error.message)||'AI error'}));return;} aiOwn=(jno.choices&&jno.choices[0]&&jno.choices[0].message&&jno.choices[0].message.content||'').trim(); }
      var messages=[{role:'system',content:system},{role:'user',content:mode==='compute'?('Compute the primary numeric result for this. '+userMsg):userMsg}];
      for(var iter=0;iter<6;iter++){
        var j=await oai(messages,true);
        if(j.error){res.statusCode=200;res.end(JSON.stringify({error:'ai_error',detail:(j.error&&j.error.message)||'AI error'}));return;}
        var m=j.choices&&j.choices[0]&&j.choices[0].message; if(!m){res.statusCode=200;res.end(JSON.stringify({error:'ai_error',detail:'no message'}));return;}
        if(m.tool_calls&&m.tool_calls.length){ messages.push(m); for(var t=0;t<m.tool_calls.length;t++){ var tc=m.tool_calls[t]; var input={}; try{input=JSON.parse(tc.function.arguments||'{}');}catch(e){} var out=await doTool(tc.function.name,input); if(tc.function.name==='run_engine') used.push({engine:(input&&input.engine)||'?',result:out.result!==undefined?out.result:out}); else used.push({tool:'market_data',symbol:input&&input.symbol}); messages.push({role:'tool',tool_call_id:tc.id,content:JSON.stringify(out)}); } continue; }
        var ft=(m.content||'').trim();
        if(mode==='compute'){res.statusCode=200;res.end(JSON.stringify({mode:'compute',ai:aiOwn,verified:ft,engines_used:used,model:j.model,provider:'openai'}));return;}
        res.statusCode=200;res.end(JSON.stringify({answer:ft,engines_used:used,model:j.model,provider:'openai'}));return;
      }
      res.statusCode=200;res.end(JSON.stringify({error:'too_many_steps',engines_used:used}));return;
    } else {
      var atools=[{name:'run_engine',description:engDesc,input_schema:{type:'object',properties:{engine:{type:'string'},params:{type:'object'}},required:['engine','params']}},{name:'get_market_data',description:mdDesc,input_schema:{type:'object',properties:{symbol:{type:'string'},fields:{type:'array',items:{type:'string'}}},required:['symbol']}}];
      async function ant(messages, useTools, sys){ var r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':antKey,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:process.env.QAI_MODEL||'claude-3-5-haiku-latest',max_tokens:1200,system:sys,tools:useTools?atools:undefined,messages:messages})}); return await r.json(); }
      var aiOwnA=null;
      if(mode==='compute'){ var ano=await ant([{role:'user',content:userMsg}],false,calcSys); if(ano.type==='error'||ano.error){res.statusCode=200;res.end(JSON.stringify({error:'ai_error',detail:(ano.error&&ano.error.message)||'AI error'}));return;} aiOwnA=(ano.content||[]).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join('\n').trim(); }
      var amsgs=[{role:'user',content:mode==='compute'?('Compute the primary numeric result for this. '+userMsg):userMsg}];
      for(var it=0;it<6;it++){
        var aj=await ant(amsgs,true,system);
        if(aj.type==='error'||aj.error){res.statusCode=200;res.end(JSON.stringify({error:'ai_error',detail:(aj.error&&aj.error.message)||'AI error'}));return;}
        if(aj.stop_reason==='tool_use'){ amsgs.push({role:'assistant',content:aj.content}); var rr=[]; var tc2=(aj.content||[]).filter(function(b){return b.type==='tool_use';}); for(var u=0;u<tc2.length;u++){ var b=tc2[u]; var out=await doTool(b.name,b.input); if(b.name==='run_engine') used.push({engine:(b.input&&b.input.engine)||'?',result:out.result!==undefined?out.result:out}); else used.push({tool:'market_data',symbol:b.input&&b.input.symbol}); rr.push({type:'tool_result',tool_use_id:b.id,content:JSON.stringify(out)}); } amsgs.push({role:'user',content:rr}); continue; }
        var at=(aj.content||[]).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join('\n').trim();
        if(mode==='compute'){res.statusCode=200;res.end(JSON.stringify({mode:'compute',ai:aiOwnA,verified:at,engines_used:used,model:aj.model,provider:'anthropic'}));return;}
        res.statusCode=200;res.end(JSON.stringify({answer:at,engines_used:used,model:aj.model,provider:'anthropic'}));return;
      }
      res.statusCode=200;res.end(JSON.stringify({error:'too_many_steps',engines_used:used}));return;
    }
  }catch(e){ res.statusCode=200; res.end(JSON.stringify({ error:'server_error', message:String(e&&e.message||e) })); }
}
