/* anti-FOUC: hold body until injected nav+hero are in, then reveal. Only runs if nav.js loads, so no stuck-blank risk. */
(function(){try{if(window.__qhold)return;window.__qhold=1;var d=document;var st=d.createElement('style');st.textContent='body{opacity:0}body.qshown{opacity:1;transition:opacity .13s ease}';(d.head||d.documentElement).appendChild(st);var rv=function(){var b=d.body;if(b)b.classList.add('qshown');};window.__qshow=rv;var sched=function(){setTimeout(rv,240);setTimeout(rv,900);};if(d.readyState==='loading'){d.addEventListener('DOMContentLoaded',sched);}else{sched();}}catch(e){try{document.body.style.opacity='1';}catch(_){}}})();
/* Quantora shared navigation — one source of truth, grouped dropdown menus. */
(function () {
  var css =
  '.nav,.topnav{display:none!important}' +
  '.qnav{display:flex;align-items:center;gap:2px;padding:11px 24px;border-bottom:1px solid #ececec;position:sticky;top:0;background:rgba(255,255,255,.93);backdrop-filter:blur(8px);z-index:1000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;flex-wrap:wrap}' +
  '.qnav .qbrand{display:flex;align-items:center;gap:9px;font-weight:650;font-size:16px;color:#0a0a0a;text-decoration:none;margin-right:12px}' +
  '.qnav .qbrand .qq{width:22px;height:22px;border-radius:6px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}' +
  '.qnav .qitem{position:relative}' +
  '.qnav a.qtop,.qnav .qtop{display:inline-flex;align-items:center;gap:3px;color:#444;font-size:14px;font-weight:500;padding:7px 12px;border-radius:9px;text-decoration:none;cursor:pointer;white-space:nowrap}' +
  '.qnav a.qtop:hover,.qnav .qtop:hover,.qnav .qitem.open .qtop{background:#f3f3f3;color:#0a0a0a}' +
  '.qnav .qtop.active{color:#0a0a0a;font-weight:650}' +
  '.qnav .qcaret{font-size:9px;color:#9aa0aa;margin-left:1px}' +
  '.qnav .qmenu{display:none;position:absolute;top:calc(100% + 5px);left:0;min-width:190px;background:#fff;border:1px solid #ececec;border-radius:12px;box-shadow:0 10px 34px rgba(0,0,0,.11);padding:6px;z-index:1100}' +
  '.qnav .qitem:hover .qmenu,.qnav .qitem.open .qmenu{display:block}' +
  '.qnav .qmenu a{display:block;padding:9px 12px;border-radius:8px;font-size:14px;color:#333;text-decoration:none;white-space:nowrap}' +
  '.qnav .qmenu a:hover{background:#f3f3f3;color:#0a0a0a}' +
  '.qnav .qmenu a.active{color:#0a0a0a;font-weight:650;background:#f7f7f7}' +
  '.qnav .qright{margin-left:auto;font-size:12.5px;color:#6b7280;display:flex;align-items:center;gap:7px}' +
  '.qnav .qdot{width:7px;height:7px;border-radius:50%;background:#0a7d33;display:inline-block}' +
  '@media(max-width:820px){.qnav .qright{display:none}}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);
  var lk = document.createElement('link'); lk.rel='stylesheet'; lk.href='/theme.css?v=2'; (document.head || document.documentElement).appendChild(lk);
  var hj=document.createElement('script'); hj.src='/hero.js?v=2'; hj.async=false; (document.head || document.documentElement).appendChild(hj);

  var NAV = [
    { label: 'Command', href: '/deck.html' },
    { label: 'The Delta', href: '/delta.html' },
    { label: 'Pulse', href: '/pulse.html' },
    { label: 'Engines', href: '/engines.html' },
    { label: 'Terminal', href: '/terminal.html' },
    { label: 'Intel', href: '/intel.html' },
    { label: 'Brief', href: '/brief.html' },
    { label: 'Markets', items: [['Markets tape', '/markets.html'], ['Live Crypto Stream', '/stream.html'], ['Live stream', '/live.html'], ['Coins', '/coins.html'], ['Stocks', '/stocks.html'], ['Global FX & Commodities', '/global.html'], ['Chart', '/chart.html'], ['Heatmap', '/heatmap.html'], ['Screener', '/screener.html']] },
    { label: 'On-Chain', items: [['DeFi', '/defi.html'], ['Bitcoin Chain', '/chain.html'], ['DEX', '/dex.html'], ['Perps · Funding', '/funding.html'], ['Token Unlocks', '/unlocks.html'], ['Staking', '/staking.html'], ['Layer 2s', '/l2.html'], ['Wallet', '/wallet.html'], ['Signals', '/signals.html']] },
    { label: 'Research', items: [['Research Report', '/report.html'], ['Rates & Curves', '/rates.html'], ['Bond Ladder', '/bondladder.html'], ['Credit Risk', '/credit.html'], ['News', '/news.html'], ['Global Events', '/events.html'], ['Predictions', '/predictions.html'], ['Macro', '/macro.html'], ['Calendar', '/calendar.html'], ['Fundamentals', '/fundamentals.html'], ['AI Analyst', '/analyst.html'], ['Ask Quantora', '/ask.html']] },
    { label: 'Desk', items: [['Your Dashboard', '/dashboard.html'], ['Backtester', '/backtest.html'], ['Options Builder', '/options.html'], ['Expected Move', '/cone.html'], ['Monte Carlo', '/montecarlo.html'], ['Performance Lab', '/perf.html'], ['Risk Parity', '/riskparity.html'], ['Correlation Matrix', '/correlation.html'], ['Pairs Analyzer', '/pairs.html'], ['Risk-Return Map', '/riskmap.html'], ['Seasonality', '/seasonality.html'], ['Portfolio', '/portfolio.html'], ['Watchlist', '/watchlist.html'], ['Alerts', '/alerts.html'], ['Risk Center', '/risk.html']] },
    { label: 'Platform', href: '/platform.html' }
  ];

  function build() {
    var path = (location.pathname || '/').replace(/\/$/, '') || '/';
    if (path === '' || path === '/index.html') path = '/';
    var legacy = document.querySelector('.brand');
    if (legacy) { var c = (legacy.closest && legacy.closest('.nav,.topnav,nav,header')) || legacy.parentElement; if (c) c.style.display = 'none'; }
    var bar = document.createElement('div'); bar.className = 'qnav';
    var html = '<a href="/" class="qbrand"><span class="qq">Q</span> Quantora</a>';
    NAV.forEach(function (g) {
      if (g.href) {
        html += '<div class="qitem"><a class="qtop' + (path === g.href ? ' active' : '') + '" href="' + g.href + '">' + g.label + '</a></div>';
      } else {
        var ga = g.items.some(function (it) { return path === it[1]; });
        html += '<div class="qitem"><span class="qtop' + (ga ? ' active' : '') + '">' + g.label + ' <span class="qcaret">&#9662;</span></span><div class="qmenu">' +
          g.items.map(function (it) { return '<a class="' + (path === it[1] ? 'active' : '') + '" href="' + it[1] + '">' + it[0] + '</a>'; }).join('') + '</div></div>';
      }
    });
    html += '<div class="qright"><span class="qdot"></span> Live</div>';
    bar.innerHTML = html;
    document.body.insertBefore(bar, document.body.firstChild);
    Array.prototype.forEach.call(bar.querySelectorAll('.qitem'), function (it) {
      var top = it.querySelector('.qtop');
      if (it.querySelector('.qmenu') && top) {
        top.addEventListener('click', function (e) { e.preventDefault(); var was = it.classList.contains('open'); Array.prototype.forEach.call(bar.querySelectorAll('.qitem'), function (x) { x.classList.remove('open'); }); if (!was) it.classList.add('open'); });
      }
    });
    document.addEventListener('click', function (e) { if (!bar.contains(e.target)) Array.prototype.forEach.call(bar.querySelectorAll('.qitem'), function (x) { x.classList.remove('open'); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();

/* ===== Quantora AI Suite — context-aware AI on every page (different form per page type) ===== */
(function(){
  if(window.__qxSuite) return; window.__qxSuite=1;
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  ready(function(){
    var path=location.pathname.toLowerCase();
    if(/engines\.html$/.test(path) || /ask\.html$/.test(path)) return; // these have their own AI UIs
    if(document.getElementById('qai-fab')||document.getElementById('qx-fab')) return;
    var kind='ask';
    if(/\/stock\//.test(path)) kind='stock';
    else if(/\/compare\//.test(path)) kind='compare';
    else if(/portfolio\.html$/.test(path)) kind='portfolio';
    else if(/efficient-frontier\.html$/.test(path)) kind='frontier';
    else if(/-calculator\.html$/.test(path) || /calculators\.html$/.test(path) || document.querySelector('script[src*="engines.js"]')) kind='calc';
    var titles={calc:'✦ Describe in words',stock:'✦ AI analyst take',compare:'✦ AI verdict',portfolio:'✦ AI review',frontier:'✦ AI review',ask:'✦ Ask AI'};
    var css='#qx-fab{position:fixed;right:18px;bottom:18px;z-index:99998;background:#635bff;color:#fff;border-radius:999px;padding:11px 16px;font:500 14px Geist,system-ui,sans-serif;box-shadow:0 6px 22px rgba(99,91,255,.4);cursor:pointer;user-select:none}#qx-fab:hover{background:#544cff}'
      +'#qx-panel{position:fixed;top:0;right:0;height:100dvh;width:420px;max-width:94vw;background:#fff;border-left:1px solid rgba(17,24,39,.12);box-shadow:-8px 0 44px rgba(16,24,40,.14);z-index:99999;transform:translateX(110%);transition:transform .22s ease;display:flex;flex-direction:column;font-family:Geist,system-ui,sans-serif}#qx-panel.open{transform:none}'
      +'.qx-h{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid rgba(17,24,39,.08)}.qx-h b{font-size:14px;color:#14161c}.qx-x{cursor:pointer;color:#9aa1ad;font-size:22px;border:0;background:none;line-height:1}'
      +'.qx-body{flex:1;overflow:auto;padding:16px 18px}.qx-ans{font-size:14.5px;line-height:1.7;color:#1c2230;white-space:pre-wrap}.qx-ans b{font-weight:600}'
      +'.qx-eng{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}.qx-chip{font:11px Geist Mono,monospace;color:#635bff;background:rgba(99,91,255,.07);border:1px solid rgba(99,91,255,.18);border-radius:6px;padding:3px 8px}'
      +'.qx-state{background:#fffaf0;border:1px solid #f0d9a8;color:#7a5a14;border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.55}.qx-state code{background:rgba(0,0,0,.06);padding:1px 5px;border-radius:4px}'
      +'.qx-foot{padding:12px 14px;border-top:1px solid rgba(17,24,39,.08);display:flex;gap:8px}.qx-foot input{flex:1;border:1px solid rgba(17,24,39,.14);border-radius:9px;padding:9px 11px;font:inherit;font-size:14px}.qx-foot button{border:0;background:#635bff;color:#fff;border-radius:9px;padding:9px 14px;font:500 14px Geist;cursor:pointer}'
      +'.qx-spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(99,91,255,.25);border-top-color:#635bff;border-radius:50%;animation:qxsp .7s linear infinite;vertical-align:-2px;margin-right:7px}@keyframes qxsp{to{transform:rotate(360deg)}}';
    var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
    var ph=(kind==='calc')?'Describe it, e.g. 1-year call on a $250 stock, 30% vol, 4% rate':'Ask a follow-up...';
    var btn=(kind==='calc')?'Fill':'Ask';
    var fab=document.createElement('div'); fab.id='qx-fab'; fab.textContent=titles[kind];
    var panel=document.createElement('div'); panel.id='qx-panel';
    panel.innerHTML='<div class="qx-h"><b>✦ Quantora AI</b><button class="qx-x" id="qx-x">×</button></div><div class="qx-body" id="qx-body"></div><div class="qx-foot"><input id="qx-in" placeholder="'+ph+'"><button id="qx-send">'+btn+'</button></div>';
    document.body.appendChild(fab); document.body.appendChild(panel);
    var body=panel.querySelector('#qx-body'), inp=panel.querySelector('#qx-in'), send=panel.querySelector('#qx-send');
    function esc(s){return String(s).replace(/[&<>]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;'})[c];});}
    function fmt(t){return esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');}
    function spin(m){body.innerHTML='<div class="qx-ans"><span class="qx-spin"></span>'+esc(m)+'</div>';}
    function chips(e){return (e&&e.length)?('<div class="qx-eng">'+e.map(function(x){return '<span class="qx-chip">'+esc(x.engine||(x.tool==='market_data'?('data:'+(x.symbol||'')):'')||'')+'</span>';}).join('')+'</div>'):'';}
    function post(payload,onok){ fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json();}).then(function(j){ if(j.error==='ai_key_needed'){body.innerHTML='<div class="qx-state">AI isn\'t activated yet. Add an <code>OPENAI_API_KEY</code> or <code>ANTHROPIC_API_KEY</code> in Vercel.</div>';return;} if(j.error){body.innerHTML='<div class="qx-state">Couldn\'t complete that: <code>'+esc(j.detail||j.message||j.error)+'</code></div>';return;} onok(j); }).catch(function(e){body.innerHTML='<div class="qx-state">Network error: <code>'+esc(String(e&&e.message||e))+'</code></div>';}); }
    function ans(j){ body.innerHTML='<div class="qx-ans">'+fmt(j.answer||'(no answer)')+'</div>'+chips(j.engines_used); }
    function mainText(){ var el=document.querySelector('.sw')||document.querySelector('main')||document.body; return (el.innerText||'').replace(/\s+/g,' ').trim().slice(0,3500); }
    function symFromStock(){ var m=path.match(/\/stock\/([a-z0-9.\-]+)/i); return m?m[1].toUpperCase():''; }
    function pairFromCompare(){ var m=path.match(/\/compare\/([a-z0-9.\-]+)-vs-([a-z0-9.\-]+)/i); return m?[m[1].toUpperCase(),m[2].toUpperCase()]:['','']; }
    function labelFor(i){ var f=i.closest('.fld,.field'); if(f){var l=f.querySelector('label'); if(l)return l.innerText.trim();} var p=i.previousElementSibling; if(p&&p.tagName==='LABEL')return p.innerText.trim(); return i.getAttribute('placeholder')||i.id||''; }
    function doFill(desc){ if(!desc)return; var scope=document.querySelector('.calc')||document.querySelector('.sw')||document; var inputs=[].slice.call(scope.querySelectorAll('input[type=number]:not([readonly]):not([disabled])')); var fields=inputs.map(labelFor).filter(Boolean); if(!fields.length){body.innerHTML='<div class="qx-state">No numeric inputs found on this page to fill.</div>';return;} spin('Reading your description...'); post({mode:'parse',q:desc,fields:fields},function(j){ var v=j.values||{}; var keys=Object.keys(v); var filled=[]; inputs.forEach(function(i){ var lab=labelFor(i).toLowerCase(); var key=keys.find(function(k){var kl=k.toLowerCase(); return kl===lab||lab.indexOf(kl)>=0||kl.indexOf(lab)>=0;}); if(key&&v[key]!=null&&v[key]!==''){ i.value=v[key]; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); filled.push(labelFor(i)+' = '+v[key]); } }); body.innerHTML = filled.length?('<div class="qx-ans"><b>Filled from your words:</b>\n'+esc(filled.join('\n'))+'\n\nThe tool above has recomputed.</div>'):'<div class="qx-state">Couldn\'t map that. Try naming values: "spot 250, strike 240, vol 30%, 1 year, rate 4%".</div>'; }); }
    function doAsk(q){ if(!q)return; spin('Thinking...'); var c=''; if(kind==='stock')c='Ticker: '+symFromStock(); else if(kind==='compare'){var p=pairFromCompare();c='Comparing '+p[0]+' vs '+p[1];} else c=mainText(); post({q:q,context:c},ans); }
    function onOpen(){
      if(kind==='stock'){ var s=symFromStock(); spin('Reading '+s+' with AI...'); post({q:'Give a concise analyst read on '+s+' using its live market data: valuation, profitability, balance-sheet health and key risks. 4-6 sentences. Educational only, not investment advice.',context:'Ticker: '+s},ans); }
      else if(kind==='compare'){ var p=pairFromCompare(); spin('Judging '+p[0]+' vs '+p[1]+'...'); post({q:'Head-to-head using live data: '+p[0]+' vs '+p[1]+'. Which looks better positioned on valuation, quality and risk? Balanced and concise. Educational only, not advice.',context:'Compare '+p[0]+' and '+p[1]},ans); }
      else if(kind==='portfolio'||kind==='frontier'){ spin('Reviewing with AI...'); post({q:'Review this '+(kind==='frontier'?'portfolio optimization':'portfolio')+' shown on screen: comment on concentration, risk, diversification and 1-2 concrete improvement ideas. Concise. Educational only.',context:mainText()},ans); }
      else if(kind==='calc'){ body.innerHTML='<div class="qx-ans" style="color:#9aa1ad">Describe your scenario in plain English below and I\'ll fill this calculator and compute it.</div>'; }
      else { body.innerHTML='<div class="qx-ans" style="color:#9aa1ad">Ask me anything about markets, options, risk or valuation — I run the verified engines and live data.</div>'; }
    }
    var opened=false;
    function open(){ panel.classList.add('open'); if(!opened){opened=true; onOpen();} }
    function close(){ panel.classList.remove('open'); }
    fab.addEventListener('click',function(){ panel.classList.contains('open')?close():open(); });
    panel.querySelector('#qx-x').addEventListener('click',close);
    function go(){ var q=inp.value.trim(); if(!q)return; inp.value=''; if(kind==='calc')doFill(q); else doAsk(q); }
    send.addEventListener('click',go);
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); go(); } });
  });
})();
