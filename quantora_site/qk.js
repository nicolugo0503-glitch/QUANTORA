/* ============================================================
   QUANTORA ⌘K — universal command palette (the spine)
   Self-contained, vanilla, injected site-wide via nav.js.
   Press ⌘K / Ctrl+K / "/" anywhere → search + jump across all
   132 pages & 60+ engines, run a ticker, or hand off to AI.
   OpenAI-white. No deps. No login (recents in localStorage).
   ============================================================ */
(function(){
  if (window.__qk) return; window.__qk = 1;

  /* ---- registry: every page + tool, [label, href, group, keywords] ---- */
  var R = [
    ['Terminal','/terminal.html','Core','ai ask command chat'],
    ['Engines','/engines.html','Core','tools calculators all'],
    ['Command Center','/deck.html','Core','deck home dashboard'],
    ['The Delta','/delta.html','Core','delta'],
    ['Pulse','/pulse.html','Core','pulse live'],
    ['Tools','/tools.html','Core','tools'],
    ['Intel','/intel.html','Core','intel'],
    ['Brief','/brief.html','Core','brief daily'],
    ['Platform','/platform.html','Core','platform overview'],
    ['Track Record','/track.html','Signature','calls scored leaderboard proof alpha'],
    ['Monte Carlo','/montecarlo.html','Signature','simulation paths cone distribution'],
    ['Expected Move · Cone','/cone.html','Signature','cone probability distribution forward'],
    ['Stock Monte Carlo','/stock-montecarlo.html','Signature','simulation single stock cone'],
    /* Markets */
    ['Market Map','/map.html','Markets','map overview'],
    ['Markets Tape','/markets.html','Markets','tape stocks indices tickers'],
    ['Stocks','/stocks.html','Markets','equities shares'],
    ['Crypto Markets','/crypto.html','Markets','coins bitcoin'],
    ['Coins','/coins.html','Markets','crypto tokens'],
    ['Live Crypto Stream','/stream.html','Markets','live crypto stream'],
    ['Live Stream','/live.html','Markets','live'],
    ['Global FX & Commodities','/global.html','Markets','forex fx gold oil commodities'],
    ['Chart','/chart.html','Markets','chart price candles'],
    ['Heatmap','/heatmap.html','Markets','heatmap sectors'],
    ['Screener','/screener.html','Markets','screen filter find stocks'],
    /* On-Chain */
    ['On-Chain Dashboard','/tvl.html','On-Chain','tvl defi'],
    ['DeFi','/defi.html','On-Chain','defi yield'],
    ['Bitcoin Chain','/chain.html','On-Chain','bitcoin onchain'],
    ['DEX','/dex.html','On-Chain','dex swap'],
    ['Perps · Funding','/funding.html','On-Chain','perps funding rates'],
    ['Token Unlocks','/unlocks.html','On-Chain','unlocks vesting'],
    ['Staking','/staking.html','On-Chain','staking yield'],
    ['Layer 2s','/l2.html','On-Chain','l2 rollups'],
    ['Wallet','/wallet.html','On-Chain','wallet portfolio onchain'],
    ['Signals','/signals.html','On-Chain','signals alerts'],
    /* Research */
    ['SEC Filings','/edgar.html','Research','edgar filings 10k 10q'],
    ['SEC Financials','/financials.html','Research','financials income balance'],
    ['Compare Financials','/fincompare.html','Research','compare financials'],
    ['Insider Trades','/insider.html','Research','insider trades'],
    ['Superinvestors 13F','/superinvestors.html','Research','13f whales buffett'],
    ['Trending Tickers','/watching.html','Research','trending watching'],
    ['Congressional Trades','/congress.html','Research','congress pelosi politicians'],
    ['Analyst Ratings','/ratings.html','Research','analyst ratings targets'],
    ['Earnings Calendar','/earnings.html','Research','earnings calendar'],
    ['Explain a Move','/explain.html','Research','explain move why'],
    ['Research Report','/report.html','Research','report'],
    ['Rates & Curves','/rates.html','Research','rates curves treasury'],
    ['Recession Odds','/recession.html','Research','recession odds macro'],
    ['Macro Dashboard','/economy.html','Research','macro economy'],
    ['Bond Ladder','/bondladder.html','Research','bonds ladder'],
    ['Credit Risk','/credit.html','Research','credit spreads risk'],
    ['News','/news.html','Research','news headlines'],
    ['Global Events','/events.html','Research','events calendar'],
    ['Predictions','/predictions.html','Research','predictions'],
    ['Macro','/macro.html','Research','macro'],
    ['Economic Calendar','/calendar.html','Research','calendar data releases'],
    ['Fundamentals','/fundamentals.html','Research','fundamentals'],
    ['AI Analyst','/analyst.html','Research','ai analyst'],
    ['Ask Quantora','/ask.html','Research','ask ai question'],
    /* Desk / engines */
    ['Your Dashboard','/dashboard.html','Desk','dashboard home'],
    ['Backtester','/backtest.html','Desk','backtest strategy'],
    ['Options Builder','/options.html','Desk','options greeks strategy'],
    ['Exotic Options','/exotics.html','Desk','exotic options barrier'],
    ['Futures & FX','/futures.html','Desk','futures fx'],
    ['Performance Lab','/perf.html','Desk','performance returns'],
    ['Risk Parity','/riskparity.html','Desk','risk parity allocation'],
    ['CVaR Optimizer','/cvar.html','Desk','cvar optimizer tail'],
    ['Black-Litterman','/blacklitterman.html','Desk','black litterman allocation'],
    ['Correlation Matrix','/correlation.html','Desk','correlation matrix'],
    ['Pairs Analyzer','/pairs.html','Desk','pairs trade spread'],
    ['Risk-Return Map','/riskmap.html','Desk','risk return map'],
    ['Seasonality','/seasonality.html','Desk','seasonality calendar'],
    ['Portfolio','/portfolio.html','Desk','portfolio holdings'],
    ['Watchlist','/watchlist.html','Desk','watchlist'],
    ['Alerts','/alerts.html','Desk','alerts notify'],
    ['Drawdown Lab','/drawdown.html','Desk','drawdown underwater'],
    ['Factor Lab','/factor-lab.html','Desk','factor exposure value momentum'],
    ['Position Sizer','/stop-loss.html','Desk','position size stop loss r-multiple'],
    ['Rolling Correlation','/rolling-correlation.html','Desk','rolling correlation'],
    ['Position VaR','/position-var.html','Desk','var cvar value at risk'],
    ['Crowd Consensus','/crowd.html','Desk','crowd consensus sentiment'],
    ['DCA Backtester','/dca.html','Desk','dca dollar cost averaging'],
    ['Sharpe Compare','/sharpe-compare.html','Desk','sharpe compare risk adjusted'],
    ['Rolling Sharpe','/rolling-sharpe.html','Desk','rolling sharpe'],
    ['Portfolio Beta','/portfolio-beta.html','Desk','beta portfolio'],
    ['Beta Hedge','/hedge.html','Desk','hedge beta'],
    ['Kelly Sizer','/kelly.html','Desk','kelly criterion position size'],
    ['52-Week Range','/range.html','Desk','52 week range momentum'],
    ['Cross-Asset Correlation','/macro-correlation.html','Desk','cross asset correlation'],
    ['My Library','/library.html','Desk','library saved'],
    ['Compare Stocks','/compare.html','Desk','compare stocks vs'],
    ['Explore Screens','/explore.html','Desk','explore screens'],
    ['Sector Rotation','/sector-rotation.html','Desk','sector rotation'],
    ['Trend / Reversion','/trend.html','Desk','trend reversion'],
    ['Beta & Regime','/beta.html','Desk','beta regime'],
    ['Relative Strength','/relative.html','Desk','relative strength rs'],
    ['Return Distribution','/distribution.html','Desk','return distribution histogram'],
    ['Yield Curve','/yield-curve.html','Desk','yield curve treasury'],
    ['Inflation Nowcast','/inflation.html','Desk','inflation nowcast cpi'],
    ['Cross-Asset Regime','/cross-asset.html','Desk','cross asset regime'],
    ['Portfolio Doctor','/portfolio-doctor.html','Desk','portfolio doctor review'],
    ['Move Explainer','/move-explainer.html','Desk','move explainer'],
    ['Earnings Summary','/earnings-ai.html','Desk','earnings ai summary'],
    ['Volatility Lab','/vol-lab.html','Desk','volatility vol iv'],
    ['Stock Risk Lab','/stock-risk.html','Desk','stock risk'],
    ['Risk Center','/risk.html','Desk','risk center'],
    ['Pricing','/pricing.html','Core','pricing plans pro']
  ];

  /* ---- fuzzy subsequence score ---- */
  function fz(text, q){
    text = text.toLowerCase();
    if (!q) return 0.3;
    if (text === q) return 1;
    var idx = text.indexOf(q);
    if (idx === 0) return 0.95;          // prefix
    if (idx > 0) return 0.72 - Math.min(idx,20)*0.006; // substring
    // subsequence
    var ti=0, qi=0, hits=0, streak=0, sc=0, prev=' ';
    for (ti=0; ti<text.length && qi<q.length; ti++){
      var c=text[ti];
      if (c === q[qi]){
        var boundary = (prev===' '||prev==='-'||prev==='/'||prev==='.'||prev===',');
        sc += 1 + streak*0.6 + (boundary?1.2:0);
        streak++; qi++; hits++;
      } else streak=0;
      prev=c;
    }
    if (qi < q.length) return 0;          // not all chars matched
    return 0.28 + (sc/(text.length+q.length))*0.4;
  }
  function scoreItem(it, q){
    var best = fz(it[0], q);
    if (it[3]){ var s = fz(it[3], q); if (s>best) best=s*0.92; }
    return best;
  }

  /* ---- recents (localStorage) ---- */
  function recents(){ try{ return JSON.parse(localStorage.getItem('qk:recents')||'[]'); }catch(e){ return []; } }
  function pushRecent(h){ try{ var r=recents().filter(function(x){return x!==h;}); r.unshift(h); localStorage.setItem('qk:recents', JSON.stringify(r.slice(0,7))); }catch(e){} }

  var GI = { Core:'◆', Signature:'✦', Markets:'▤', 'On-Chain':'⛓', Research:'◇', Desk:'▦', Ticker:'▲', AI:'✦' };

  /* ---- styles ---- */
  var css = ''
   + '#qk-scrim{position:fixed;inset:0;z-index:2147483000;background:rgba(15,17,21,.32);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .13s linear,visibility 0s linear .13s;display:flex;justify-content:center;align-items:flex-start}'
   + '#qk-scrim.on{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .13s linear}'
   + '#qk-panel{margin-top:14vh;width:640px;max-width:92vw;background:#fff;border-radius:14px;overflow:hidden;'
   + 'box-shadow:0 0 0 1px rgba(0,0,0,.055),0 10px 30px -8px rgba(16,24,40,.22),0 28px 60px -14px rgba(16,24,40,.28);'
   + 'transform:translateY(-6px) scale(.985);opacity:0;transition:transform .16s cubic-bezier(.16,1,.3,1),opacity .16s;'
   + 'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'
   + '#qk-scrim.on #qk-panel{transform:none;opacity:1}'
   + '#qk-top{display:flex;align-items:center;gap:11px;padding:15px 18px;border-bottom:1px solid #f0f0f2}'
   + '#qk-top svg{flex:none;color:#9aa0ac}'
   + '#qk-in{flex:1;border:0;outline:0;background:transparent;font:500 17px Inter,sans-serif;color:#0a0a0b;letter-spacing:-.01em;min-width:0}'
   + '#qk-in::placeholder{color:#a8adb8;font-weight:400}'
   + '#qk-esc{flex:none;font:500 11px ui-monospace,"SF Mono",monospace;color:#8a8f98;background:#f4f4f5;border:1px solid #eaeaec;border-radius:5px;padding:3px 6px}'
   + '#qk-list{max-height:56vh;overflow-y:auto;padding:6px;overscroll-behavior:contain}'
   + '.qk-gh{font:500 10.5px ui-monospace,"SF Mono",monospace;letter-spacing:.09em;text-transform:uppercase;color:#a2a7b2;padding:11px 12px 5px}'
   + '.qk-row{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:9px;cursor:pointer;scroll-margin:8px}'
   + '.qk-row .qk-ic{flex:none;width:22px;height:22px;border-radius:6px;background:#f4f4f6;color:#6b7280;display:flex;align-items:center;justify-content:center;font-size:12px}'
   + '.qk-row .qk-l{flex:1;font:500 14.5px Inter,sans-serif;color:#18181b;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
   + '.qk-row .qk-l b{color:#0a0a0b;font-weight:700}'
   + '.qk-row .qk-sub{flex:none;font:400 12.5px Inter,sans-serif;color:#a2a7b2}'
   + '.qk-row .qk-go{flex:none;opacity:0;font:500 11px ui-monospace,monospace;color:#8a8f98}'
   + '.qk-row[aria-selected="true"]{background:#f5f5f6}'
   + '.qk-row[aria-selected="true"] .qk-ic{background:#eaeafe;color:#2563eb}'
   + '.qk-row[aria-selected="true"] .qk-go{opacity:1}'
   + '.qk-ai .qk-ic{background:#eaeafe;color:#2563eb}'
   + '#qk-foot{display:flex;align-items:center;gap:16px;padding:9px 16px;border-top:1px solid #f0f0f2;font:400 12px Inter,sans-serif;color:#9aa0ac}'
   + '#qk-foot kbd{font:500 11px ui-monospace,monospace;color:#8a8f98;background:#f4f4f5;border:1px solid #eaeaec;border-radius:4px;padding:1px 5px;margin:0 2px}'
   + '#qk-empty{padding:26px 16px;text-align:center;color:#a2a7b2;font:400 14px Inter,sans-serif}'
   + '.qk-trigger{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 9px 0 11px;border-radius:8px;background:#f4f4f6;color:#6b7280;'
   + 'border:1px solid #ececee;cursor:pointer;font:500 13px Inter,sans-serif;letter-spacing:-.01em;transition:background .18s,color .18s}'
   + '.qk-trigger:hover{background:#ececee;color:#18181b}'
   + '.qk-trigger kbd{font:500 10.5px ui-monospace,monospace;background:#fff;border:1px solid #e4e4e7;border-radius:4px;padding:1px 5px;color:#8a8f98}'
   + '@media(prefers-reduced-motion:reduce){#qk-scrim,#qk-panel{transition:none!important}}';
  var st = document.createElement('style'); st.textContent = css; (document.head||document.documentElement).appendChild(st);

  /* ---- overlay DOM (built once) ---- */
  var scrim = document.createElement('div'); scrim.id='qk-scrim'; scrim.setAttribute('aria-hidden','true');
  scrim.innerHTML =
    '<div id="qk-panel" role="dialog" aria-label="Command palette">'
    + '<div id="qk-top"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>'
    + '<input id="qk-in" placeholder="Search engines, pages, or a ticker…" autocomplete="off" spellcheck="false" aria-label="Command palette search">'
    + '<span id="qk-esc">esc</span></div>'
    + '<div id="qk-list" role="listbox"></div>'
    + '<div id="qk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>⌘</kbd><kbd>K</kbd> anytime</span><span style="margin-left:auto">Quantora</span></div>'
    + '</div>';
  function mount(){ if(!document.body) return setTimeout(mount,50); document.body.appendChild(scrim); }
  mount();

  var input, list, sel=0, rows=[];
  function els(){ input=document.getElementById('qk-in'); list=document.getElementById('qk-list'); }

  function esc(s){ return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
  function hi(label, q){ // bold the matched substring if present
    if(!q) return esc(label);
    var i = label.toLowerCase().indexOf(q.toLowerCase());
    if(i<0) return esc(label);
    return esc(label.slice(0,i))+'<b>'+esc(label.slice(i,i+q.length))+'</b>'+esc(label.slice(i+q.length));
  }

  function build(q){
    q = (q||'').trim();
    var out = [];
    if(!q){
      var rec = recents().map(function(h){ for(var i=0;i<R.length;i++) if(R[i][1]===h) return R[i]; return null; }).filter(Boolean);
      if(rec.length) out.push(['Recent', rec]);
      out.push(['Jump to', [byHref('/terminal.html'),byHref('/engines.html'),byHref('/track.html'),byHref('/cone.html'),byHref('/markets.html'),byHref('/screener.html')].filter(Boolean)]);
    } else {
      // ticker heuristic
      if(/^[A-Za-z]{1,5}$/.test(q)){
        var T=q.toUpperCase();
        out.push(['Ticker', [
          {tick:1,l:'Chart '+T, sub:T, h:'/chart.html?symbol='+T, g:'Ticker'},
          {tick:1,l:'Ask Quantora about '+T, sub:'AI', h:'/terminal.html?q='+encodeURIComponent(T), g:'Ticker'}
        ]]);
      }
      var scored=[];
      for(var i=0;i<R.length;i++){ var s=scoreItem(R[i],q.toLowerCase()); if(s>0.28) scored.push([R[i],s]); }
      scored.sort(function(a,b){ return b[1]-a[1] || a[0][0].localeCompare(b[0][0]); });
      if(scored.length){
        var groups={}, order=[];
        scored.slice(0,40).forEach(function(p){ var g=p[0][2]; if(!groups[g]){groups[g]=[];order.push(g);} groups[g].push(p[0]); });
        order.forEach(function(g){ out.push([g, groups[g]]); });
      }
    }
    // AI fallthrough always
    out.push(['', [{ai:1,l: q? ('Ask Quantora AI: “'+q+'”') : 'Open the AI terminal', sub:'AI', h:'/terminal.html'+(q?('?q='+encodeURIComponent(q)):''), g:'AI'}]]);
    return out;
  }
  function byHref(h){ for(var i=0;i<R.length;i++) if(R[i][1]===h) return R[i]; return null; }

  function render(){
    var q = input.value;
    var groups = build(q);
    rows = []; var html='';
    groups.forEach(function(pair){
      var head=pair[0], items=pair[1]; if(!items.length) return;
      if(head) html += '<div class="qk-gh">'+esc(head)+'</div>';
      items.forEach(function(it){
        var isArr = Array.isArray(it);
        var label = isArr? it[0] : it.l;
        var href  = isArr? it[1] : it.h;
        var group = isArr? it[2] : it.g;
        var sub   = isArr? '' : (it.sub||'');
        var ai    = !isArr && it.ai;
        rows.push(href);
        html += '<div class="qk-row'+(ai?' qk-ai':'')+'" role="option" aria-selected="false" data-h="'+esc(href)+'">'
          + '<span class="qk-ic">'+(GI[group]||'•')+'</span>'
          + '<span class="qk-l">'+hi(label,q)+'</span>'
          + (sub?'<span class="qk-sub">'+esc(sub)+'</span>':'')
          + '<span class="qk-go">↵</span></div>';
      });
    });
    list.innerHTML = html || '<div id="qk-empty">No matches. Press ↵ to ask the AI terminal.</div>';
    sel = 0; paint();
    Array.prototype.forEach.call(list.querySelectorAll('.qk-row'), function(r,i){
      r.addEventListener('mousemove', function(){ if(sel!==i){ sel=i; paint(); } });
      r.addEventListener('click', function(){ go(i); });
    });
  }
  function paint(){
    var rs = list.querySelectorAll('.qk-row');
    Array.prototype.forEach.call(rs, function(r,i){ r.setAttribute('aria-selected', i===sel?'true':'false'); });
    if(rs[sel]) rs[sel].scrollIntoView({block:'nearest'});
  }
  function go(i){
    if(i==null) i=sel; var h=rows[i]; if(!h) return;
    if(h.charAt(0)==='/' && h.indexOf('?')<0) pushRecent(h);
    close(); location.href = h;
  }

  var open=false;
  function openK(){ if(open) return; open=true; els(); scrim.setAttribute('aria-hidden','false');
    scrim.classList.add('on'); input.value=''; render(); input.focus(); }
  function close(){ if(!open) return; open=false; scrim.classList.remove('on'); scrim.setAttribute('aria-hidden','true'); }
  window.__qkOpen = openK;

  scrim.addEventListener('click', function(e){ if(e.target===scrim) close(); });
  document.addEventListener('input', function(e){ if(e.target && e.target.id==='qk-in') render(); });
  document.addEventListener('keydown', function(e){
    var k=e.key.toLowerCase();
    if((e.metaKey||e.ctrlKey) && k==='k'){ e.preventDefault(); open?close():openK(); return; }
    if(!open && k==='/' ){ var t=e.target, tag=(t&&t.tagName||'').toLowerCase(); if(tag!=='input'&&tag!=='textarea'&&!(t&&t.isContentEditable)){ e.preventDefault(); openK(); } return; }
    if(!open) return;
    if(k==='escape'){ e.preventDefault(); close(); }
    else if(k==='arrowdown'){ e.preventDefault(); sel=Math.min(sel+1, rows.length-1); paint(); }
    else if(k==='arrowup'){ e.preventDefault(); sel=Math.max(sel-1, 0); paint(); }
    else if(k==='enter'){ e.preventDefault(); go(sel); }
  });

  /* ---- inject a visible trigger into the shared nav when present ---- */
  function addTrigger(){
    var nav=document.querySelector('.qnav'); if(!nav || nav.querySelector('.qk-trigger')) return;
    var b=document.createElement('button'); b.type='button'; b.className='qk-trigger';
    b.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg> Search <kbd>⌘K</kbd>';
    b.addEventListener('click', openK);
    var right=nav.querySelector('.qright');
    if(right) nav.insertBefore(b, right); else nav.appendChild(b);
  }
  var tries=0; (function waitNav(){ addTrigger(); if(!document.querySelector('.qnav .qk-trigger') && tries++<40) setTimeout(waitNav, 150); })();
})();
