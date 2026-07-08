/**
 * Quantora self-hosted MCP endpoint (Vercel serverless).
 * Speaks MCP over Streamable HTTP (JSON-RPC 2.0). Lives at /api/mcp on the
 * same deployment, and calls the site's own /api/fmp proxy for data, so it
 * needs no extra hosting and no extra keys.
 *   POST /api/mcp   {jsonrpc,id,method,params}   -> initialize | tools/list | tools/call
 *   GET  /api/mcp   -> discovery manifest
 */
module.exports = async (req, res) => {
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
};
