/* Quantora hero engine v5 — full dramatic hero on showcase pages, compact live strip on working modules. */
(function(){
  if(window.__qheroLoaded)return;window.__qheroLoaded=true;
  function cb(p,l){return {type:'cb',product:p,label:l};}
  function ser(u,m,l){return {type:'series',url:u,map:m,label:l};}
  function met(u,m,l){return {type:'metric',url:u,map:m,label:l};}
  var CG='https://api.coingecko.com/api/v3/global', FNG='https://api.alternative.me/fng/';
  var FULL={'/markets.html':1};
  var CFG={
    '/pulse.html':   {t:'Pulse',  s:'Ask the AI about any market theme, sector or strategy.', a:['#6366f1','#8b5cf6','#22d3ee'], feed:met(CG,'cgcap','Total market cap')},
    '/markets.html': {t:'Markets', s:'Live prices, moves and trend across every asset.', a:['#4f7cff','#6366f1','#22d3ee'], feed:cb('BTC-USD','BTC / USD')},
    '/coins.html':   {t:'Coins',   s:'The top of the crypto market, ranked and live.', a:['#8b5cf6','#ec4899','#6366f1'], feed:met(CG,'cgcap','Total crypto cap')},
    '/defi.html':    {t:'DeFi',    s:'Total value locked, yields, stablecoins, fees.', a:['#14b8a6','#22d3ee','#6366f1'], feed:ser('https://api.llama.fi/v2/historicalChainTvl','llamaTVL','Total value locked')},
    '/chain.html':   {t:'Bitcoin Chain', s:'On-chain truth, block by block.', a:['#f59e0b','#fb7185','#8b5cf6'], feed:ser('https://mempool.space/api/v1/blocks','blocks','Block height')},
    '/macro.html':   {t:'Macro',   s:'The forces beneath every market.', a:['#3b82f6','#6366f1','#64748b'], feed:ser('/api/fredseries','fred10Y','10-Year Treasury')},
    '/stocks.html':  {t:'Stocks',  s:'Equities, indices and the names that move them.', a:['#4f7cff','#6366f1','#8b5cf6'], feed:ser('/api/quote?symbol=SPY','quote','S&P 500 · SPY')},
    '/global.html':  {t:'Global',  s:'FX and commodities across the world.', a:['#0ea5e9','#6366f1','#14b8a6'], feed:ser('/api/quote?symbol=GLD','quote','Gold · GLD')},
    '/fundamentals.html':{t:'Fundamentals',s:'The numbers behind the ticker.', a:['#4f7cff','#14b8a6','#6366f1'], feed:ser('/api/quote?symbol=AAPL','quote','Apple · AAPL')},
    '/chart.html':   {t:'Chart',   s:'Professional charting, every instrument.', a:['#6366f1','#22d3ee','#8b5cf6'], feed:cb('ETH-USD','ETH / USD')},
    '/live.html':    {t:'Live',    s:'Every print, streaming in real time.', a:['#10b981','#22d3ee','#6366f1'], feed:cb('SOL-USD','SOL / USD')},
    '/dex.html':     {t:'DEX',     s:'Real-time decentralized exchange flow.', a:['#10b981','#14b8a6','#22d3ee'], feed:cb('UNI-USD','UNI / USD')},
    '/funding.html': {t:'Funding', s:'Perp funding rates and open interest, live.', a:['#ef4444','#8b5cf6','#22d3ee'], feed:cb('BTC-USD','BTC perp ref')},
    '/l2.html':      {t:'Layer 2s', s:'The Ethereum scaling economy, live.', a:['#6366f1','#22d3ee','#14b8a6'], feed:met('https://l2beat.com/api/scaling/summary','l2tvs','Total value secured')},
    '/events.html':  {t:'Global Events', s:'World market news and tone, live.', a:['#8b5cf6','#6366f1','#ec4899'], feed:{type:'glow'}},
    '/wallet.html':  {t:'Wallet', s:'Any wallet, any chain, valued live.', a:['#14b8a6','#6366f1','#8b5cf6'], feed:cb('ETH-USD','ETH / USD')},
    '/predictions.html': {t:'Predictions', s:'What the crowd is betting on, priced live.', a:['#8b5cf6','#ec4899','#6366f1'], feed:{type:'glow'}},
    '/delta.html':   {t:'The Delta', s:'What changed across markets, and why.', a:['#6366f1','#8b5cf6','#22d3ee'], feed:{type:'glow'}},
    '/unlocks.html': {t:'Token Unlocks', s:'The supply hitting the market next.', a:['#6366f1','#ec4899','#8b5cf6'], feed:{type:'glow'}},
    '/staking.html': {t:'Staking', s:'What your assets earn on-chain, live.', a:['#0a8a3b','#14b8a6','#6366f1'], feed:{type:'glow'}},
    '/news.html':    {t:'News',    s:'The wire that moves capital.', a:['#8b5cf6','#6366f1','#ec4899'], feed:met(FNG,'fng','Market sentiment')},
    '/alerts.html':  {t:'Alerts',  s:'Never miss the move that matters.', a:['#f59e0b','#ec4899','#8b5cf6'], feed:met(FNG,'fng','Market sentiment')},
    '/signals.html': {t:'Signals', s:'Momentum, trend and risk, computed live.', a:['#ec4899','#8b5cf6','#6366f1'], feed:cb('BTC-USD','BTC')},
    '/watchlist.html':{t:'Watchlist', s:'The names you’re watching, in real time.', a:['#4f7cff','#6366f1','#8b5cf6'], feed:cb('BTC-USD','BTC / USD')},
    '/risk.html':    {t:'Risk Center', s:'Stress, exposure and drawdown, quantified.', a:['#ef4444','#f59e0b','#8b5cf6'], feed:ser('/api/fredseries','fredVIX','VIX · volatility')},
    '/portfolio.html':{t:'Portfolio', s:'Your positions, priced and risk-read live.', a:['#6366f1','#8b5cf6','#14b8a6'], feed:met(CG,'cgcap','Crypto market')},
    '/heatmap.html': {t:'Heatmap', s:'The market’s heat, at a glance.', a:['#fb7185','#f59e0b','#8b5cf6'], feed:met(CG,'cgvol','24h volume')},
    '/screener.html':{t:'Screener',s:'Describe what you want; AI finds the names.', a:['#4f7cff','#6366f1','#22d3ee'], feed:met(CG,'cgcap','Total market cap')},
    '/brief.html':   {t:'Brief',   s:'Your AI morning brief, ready to share.', a:['#8b5cf6','#6366f1','#22d3ee'], feed:met(CG,'cgcap','Total market cap')},
    '/calendar.html':{t:'Calendar',s:'The events that move everything.', a:['#6366f1','#22d3ee','#8b5cf6'], feed:{type:'glow',clock:true}},
    '/ask.html':     {t:'Ask Quantora', s:'Ask anything. Grounded in live data.', a:['#6366f1','#8b5cf6','#ec4899'], feed:{type:'glow'}},
    '/analyst.html': {t:'AI Analyst', s:'An entire research desk, on demand.', a:['#8b5cf6','#6366f1','#22d3ee'], feed:{type:'glow'}}
  };
  var path=(location.pathname||'/').replace(/\/index\.html$/,'/');
  var cfg=CFG[path]; if(!cfg) return;

  function big(n){if(n==null||isNaN(n))return '—';n=+n;var a=Math.abs(n);if(a>=1e12)return '$'+(n/1e12).toFixed(2)+'T';if(a>=1e9)return '$'+(n/1e9).toFixed(1)+'B';if(a>=1e6)return '$'+(n/1e6).toFixed(1)+'M';return '$'+Math.round(n).toLocaleString();}
  function pxf(n){if(n==null||isNaN(n))return '—';n=+n;if(n>=100)return '$'+Math.round(n).toLocaleString();if(n>=1)return '$'+n.toFixed(2);return '$'+n.toFixed(4);}
  function usd2(n){return (n==null||isNaN(n))?'—':'$'+(+n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function pctv(n){return (n==null||isNaN(n))?'—':(+n).toFixed(2)+'%';}
  function numv(n){return (n==null||isNaN(n))?'—':(+n).toFixed(2);}
  function intv(n){return (n==null||isNaN(n))?'—':Math.round(n).toLocaleString();}
  var FMT={big:big,usd0:pxf,usd2:usd2,pct:pctv,num:numv,int:intv};
  var MAP={
    llamaTVL:function(a){if(!Array.isArray(a)||!a.length)return null;var s=a.slice(-150);return{points:s.map(function(x){return x.tvl;}),value:s[s.length-1].tvl,fmt:'big'};},
    fred10Y:function(j){var it=(j.indicators||[]).filter(function(x){return x.id==='DGS10';})[0];if(!it)return null;return{points:it.points.map(function(p){return p.v;}),value:it.latest,fmt:'pct'};},
    fredVIX:function(j){var it=(j.indicators||[]).filter(function(x){return x.id==='VIXCLS';})[0];if(!it)return null;return{points:it.points.map(function(p){return p.v;}),value:it.latest,fmt:'num'};},
    quote:function(j){var c=j.closes||j.values||null;if(!c||!c.length)return null;return{points:c.map(Number),value:+c[c.length-1],fmt:'usd2'};},
    blocks:function(a){if(!Array.isArray(a)||!a.length)return null;return{points:a.map(function(b){return b.tx_count;}).reverse(),value:a[0].height,fmt:'int',sub:'live · mempool.space'};},
    cgcap:function(j){var d=j.data;if(!d)return null;return{value:d.total_market_cap.usd,fmt:'big',sub:(d.market_cap_change_percentage_24h_usd>=0?'+':'')+d.market_cap_change_percentage_24h_usd.toFixed(2)+'% 24h',dir:d.market_cap_change_percentage_24h_usd>=0?'up':'dn'};},
    cgvol:function(j){var d=j.data;if(!d)return null;return{value:d.total_volume.usd,fmt:'big',sub:'24h volume'};},
    fng:function(j){if(!j.data||!j.data[0])return null;var v=+j.data[0].value;return{value:v,fmt:'int',sub:j.data[0].value_classification,dir:v>=50?'up':'dn'};},
    l2tvs:function(j){var pr=j.projects||{};var t=0,c=0;Object.keys(pr).forEach(function(k){var v=pr[k].tvs&&pr[k].tvs.breakdown&&pr[k].tvs.breakdown.total;if(v){t+=v;c++;}});if(!t)return null;return{value:t,fmt:'big',sub:c+' networks secured'};}
  };

  var FULLCSS=
  '.qhero{position:relative;border-radius:24px;overflow:hidden;margin:6px 0 22px;height:208px;background:#0b0d12;box-shadow:0 2px 6px rgba(16,24,40,.06),0 40px 80px -34px rgba(99,102,241,.4);border:1px solid rgba(255,255,255,.5)}'+
  '.qhero canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 1s ease}.qhero.shown canvas{opacity:1}'+
  '.qhero .ov{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,16,.86) 0%,rgba(8,10,16,.5) 44%,rgba(8,10,16,.08) 100%)}'+
  '.qhero .in{position:absolute;left:0;bottom:0;padding:26px 30px;z-index:2}'+
  '.qhero .badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.16em;color:#d9defb;text-transform:uppercase;margin-bottom:12px}'+
  '.qhero .badge .d{width:7px;height:7px;border-radius:50%;background:#34d399;animation:qhp 1.9s infinite}'+
  '@keyframes qhp{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}'+
  '.qhero h1.qht{margin:0;font-size:46px;line-height:1;font-weight:800;letter-spacing:-.035em;color:#fff;font-family:Inter,-apple-system,sans-serif}'+
  '.qhero .qhs{margin:11px 0 0;font-size:15px;color:#c3cae0;max-width:540px;font-weight:450}'+
  '.qhero .qhlive{position:absolute;right:28px;bottom:22px;z-index:2;text-align:right;max-width:50%}'+
  '.qhero .qhlive .ql{font-size:10.5px;letter-spacing:.16em;color:#9aa3bd;text-transform:uppercase;font-weight:700}'+
  '.qhero .qhlive .qp{font-size:30px;font-weight:800;color:#fff;letter-spacing:-.03em;margin-top:4px;font-variant-numeric:tabular-nums}'+
  '.qhero .qhlive .qc{font-size:13px;font-weight:700;margin-top:4px;color:#aab2c8}.qhero .qhlive .qc.up{color:#34d399}.qhero .qhlive .qc.dn{color:#fb7185}'+
  '@media(max-width:640px){.qhero{height:172px}.qhero h1.qht{font-size:34px}.qhero .qhs{display:none}}';
  var STRIPCSS=
  '.qstrip{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:8px 2px 16px;margin:2px 0 22px;border-bottom:1px solid var(--line,#ececec)}'+
  '.qstrip .qsL{display:flex;align-items:center;gap:11px;min-width:0}'+
  '.qstrip .qsdot{width:8px;height:8px;border-radius:50%;background:#0a8a3b;flex:0 0 auto;box-shadow:0 0 0 0 rgba(10,138,59,.45);animation:qsp 2s infinite}'+
  '@keyframes qsp{0%{box-shadow:0 0 0 0 rgba(10,138,59,.4)}70%{box-shadow:0 0 0 7px rgba(10,138,59,0)}100%{box-shadow:0 0 0 0 rgba(10,138,59,0)}}'+
  '.qstrip h1.qst{margin:0;font-size:27px;font-weight:750;letter-spacing:-.035em;color:var(--ink,#0a0a0a);font-family:Inter,-apple-system,sans-serif}'+
  '.qstrip .qsub{font-size:13px;color:var(--mut,#6b7280);margin-left:2px}'+
  '.qstrip .qsR{display:flex;align-items:center;gap:16px}'+
  '.qstrip .qspark{width:148px;height:40px;display:block}'+
  '.qstrip .qsm{text-align:right;line-height:1.15}'+
  '.qstrip .qsm .ql{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut,#6b7280);font-weight:700}'+
  '.qstrip .qsm .qp{font-size:21px;font-weight:750;color:var(--ink,#0a0a0a);font-variant-numeric:tabular-nums;letter-spacing:-.02em}'+
  '.qstrip .qsm .qc{font-size:13px;font-weight:700;margin-left:5px}.qstrip .qsm .qc.up{color:#0a8a3b}.qstrip .qsm .qc.dn{color:#d23a2c}'+
  '@media(max-width:560px){.qstrip .qspark,.qstrip .qsub{display:none}.qstrip h1.qst{font-size:22px}}';
  var isFull=!!FULL[path];
  document.head.appendChild(Object.assign(document.createElement('style'),{textContent:(isFull?FULLCSS:STRIPCSS)}));

  function setM(label,val,sub,dir){var e;if((e=document.getElementById('qhl'))&&label)e.textContent=label;if((e=document.getElementById('qhp')))e.textContent=val;if((e=document.getElementById('qhc'))){e.textContent=sub||'';e.className='qc'+(dir?' '+dir:'');}}
  function hideOld(host){var o=host.querySelector('h1');if(o){var sib=o.nextElementSibling;if(sib&&/\bsub\b/.test(sib.className))sib.style.display='none';var hh=o.closest('.head,.header,.hero')||o;if(hh!==host)hh.style.display='none';else o.style.display='none';}}

  function build(){
    var host=document.querySelector('.wrap')||document.querySelector('main')||document.body;
    hideOld(host);
    var f=cfg.feed;
    if(isFull){ buildFull(host,f); } else { buildStrip(host,f); }
  }

  function buildStrip(host,f){
    var hasChart=f&&(f.type==='cb'||f.type==='series');
    var rightInner='';
    if(f&&f.type!=='glow') rightInner=(hasChart?'<canvas class="qspark"></canvas>':'')+'<div class="qsm"><div class="ql" id="qhl">'+(f.label||'')+'</div><div><span class="qp" id="qhp">—</span><span class="qc" id="qhc"></span></div></div>';
    else if(f&&f.clock) rightInner='<div class="qsm"><div class="ql">UTC</div><div><span class="qp" id="qhclock">--:--:--</span></div></div>';
    var el=document.createElement('div');el.className='qstrip';
    el.innerHTML='<div class="qsL"><span class="qsdot"></span><h1 class="qst">'+cfg.t+'</h1><span class="qsub">'+cfg.s+'</span></div><div class="qsR">'+rightInner+'</div>';
    host.insertBefore(el,host.firstChild);
    var cvw=el.querySelector('.qspark'),sx=cvw?cvw.getContext('2d'):null,W,H,dpr;
    function size(){if(!cvw)return;var r=cvw.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);cvw.width=(W=r.width||148)*dpr;cvw.height=(H=r.height||40)*dpr;sx.setTransform(dpr,0,0,dpr,0,0);}
    function spark(arr){if(!sx)return;size();sx.clearRect(0,0,W,H);if(!arr||arr.length<2)return;var lo=Math.min.apply(null,arr),hi=Math.max.apply(null,arr),rng=(hi-lo)||1;var X=function(i){return i/(arr.length-1)*W;},Y=function(v){return H-4-(v-lo)/rng*(H-8);};var up=arr[arr.length-1]>=arr[0],col=up?'#0a8a3b':'#d23a2c';sx.beginPath();sx.moveTo(0,H);for(var i=0;i<arr.length;i++)sx.lineTo(X(i),Y(arr[i]));sx.lineTo(W,H);sx.closePath();sx.fillStyle=up?'rgba(10,138,59,.10)':'rgba(210,58,44,.10)';sx.fill();sx.beginPath();for(var i=0;i<arr.length;i++){i?sx.lineTo(X(i),Y(arr[i])):sx.moveTo(X(i),Y(arr[i]));}sx.strokeStyle=col;sx.lineWidth=1.8;sx.lineJoin='round';sx.stroke();sx.beginPath();sx.arc(X(arr.length-1),Y(arr[arr.length-1]),2.4,0,6.3);sx.fillStyle=col;sx.fill();}
    runFeed(f,spark,true);
    if(f&&f.clock)clock();
    if(cvw)window.addEventListener('resize',function(){if(window.__qarr)spark(window.__qarr);});
  }

  function buildFull(host,f){
    var right='';
    if(f&&f.type!=='glow') right='<div class="qhlive"><div class="ql" id="qhl">'+(f.label||'')+'</div><div class="qp" id="qhp">—</div><div class="qc" id="qhc">live</div></div>';
    var hero=document.createElement('div');hero.className='qhero';
    hero.innerHTML='<canvas></canvas><div class="ov"></div><div class="in"><div class="badge"><span class="d"></span> Quantora · Live</div><h1 class="qht">'+cfg.t+'</h1><p class="qhs">'+cfg.s+'</p></div>'+right;
    host.insertBefore(hero,host.firstChild);
    var cv=hero.querySelector('canvas'),cx=cv.getContext('2d'),W,H,dpr;
    function size(){var r=hero.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);cv.width=(W=r.width)*dpr;cv.height=(H=r.height)*dpr;cx.setTransform(dpr,0,0,dpr,0,0);cx.fillStyle='#0b0d12';cx.fillRect(0,0,W,H);}
    size();
    function area(arr){cx.clearRect(0,0,W,H);cx.fillStyle='#0b0d12';cx.fillRect(0,0,W,H);if(!arr||arr.length<2){hero.classList.add('shown');return;}var lo=Math.min.apply(null,arr),hi=Math.max.apply(null,arr),pad=(hi-lo)*0.18||1;lo-=pad;hi+=pad;var X=function(i){return i/(arr.length-1)*W;},Y=function(v){return H-(v-lo)/(hi-lo)*(H-26)-8;};var gl=cx.createLinearGradient(0,0,W,0);gl.addColorStop(0,cfg.a[0]);gl.addColorStop(.55,cfg.a[1]);gl.addColorStop(1,cfg.a[2]);var gf=cx.createLinearGradient(0,0,0,H);gf.addColorStop(0,'rgba(99,102,241,.30)');gf.addColorStop(1,'rgba(99,102,241,0)');cx.beginPath();cx.moveTo(0,H);for(var i=0;i<arr.length;i++)cx.lineTo(X(i),Y(arr[i]));cx.lineTo(W,H);cx.closePath();cx.fillStyle=gf;cx.fill();cx.beginPath();for(var i=0;i<arr.length;i++){i?cx.lineTo(X(i),Y(arr[i])):cx.moveTo(X(i),Y(arr[i]));}cx.strokeStyle=gl;cx.lineWidth=2.6;cx.lineJoin='round';cx.shadowColor='rgba(124,92,246,.55)';cx.shadowBlur=18;cx.stroke();cx.shadowBlur=0;var lx=X(arr.length-1),ly=Y(arr[arr.length-1]);cx.beginPath();cx.arc(lx,ly,4.5,0,6.3);cx.fillStyle='#fff';cx.fill();cx.lineWidth=2.4;cx.strokeStyle=arr[arr.length-1]>=arr[0]?'#34d399':'#fb7185';cx.stroke();hero.classList.add('shown');}
    function glowBg(){var g=cx.createRadialGradient(W*0.78,H*0.42,10,W*0.78,H*0.42,W*0.72);g.addColorStop(0,cfg.a[0]);g.addColorStop(1,'#0b0d12');cx.globalAlpha=0.5;cx.fillStyle=g;cx.fillRect(0,0,W,H);cx.globalAlpha=1;hero.classList.add('shown');}
    if(!f){glowBg();return;}
    if(f.type==='metric')glowBg();
    runFeed(f,area,false);
    window.addEventListener('resize',function(){size();if(window.__qarr)area(window.__qarr);});
  }

  function runFeed(f,draw,compact){
    if(!f||f.type==='glow')return;
    function pricefmt(p){return pxf(p);}
    try{
      if(f.type==='cb'){
        fetch('https://api.exchange.coinbase.com/products/'+f.product+'/candles?granularity=3600').then(function(r){return r.json();}).then(function(a){if(!Array.isArray(a)||!a.length)return;window.__qarr=a.map(function(c){return c[4];}).reverse();draw(window.__qarr);}).catch(function(){});
        try{var ws=new WebSocket('wss://ws-feed.exchange.coinbase.com');ws.onopen=function(){ws.send(JSON.stringify({type:'subscribe',product_ids:[f.product],channels:['ticker']}));};ws.onmessage=function(e){var m=JSON.parse(e.data);if(m.type!=='ticker')return;var p=+m.price,o=+m.open_24h,ch=o?((p-o)/o*100):0;setM(f.label,pricefmt(p),(ch>=0?'▲ +':'▼ ')+Math.abs(ch).toFixed(2)+'%',ch>=0?'up':'dn');if(window.__qarr&&window.__qarr.length){window.__qarr[window.__qarr.length-1]=p;draw(window.__qarr);}};}catch(e){}
      } else if(f.type==='series'){
        fetch(f.url).then(function(r){return r.json();}).then(function(j){var m=MAP[f.map](j);if(!m)return;window.__qarr=m.points;draw(m.points);var ch=(m.points&&m.points.length>1)?((m.points[m.points.length-1]-m.points[0])/Math.abs(m.points[0]||1)*100):null;var sub=m.sub||(ch!=null?(ch>=0?'▲ +':'▼ ')+Math.abs(ch).toFixed(1)+'%':'');setM(f.label,FMT[m.fmt](m.value),sub,(ch!=null&&!m.sub)?(ch>=0?'up':'dn'):'');}).catch(function(){});
      } else if(f.type==='metric'){
        fetch(f.url).then(function(r){return r.json();}).then(function(j){var m=MAP[f.map](j);if(!m)return;setM(f.label,FMT[m.fmt](m.value),m.sub||'',m.dir||'');}).catch(function(){});
      }
    }catch(e){}
  }
  function clock(){function tk(){var d=new Date(),p=function(n){return String(n).padStart(2,'0');},el=document.getElementById('qhclock');if(el)el.textContent=p(d.getUTCHours())+':'+p(d.getUTCMinutes())+':'+p(d.getUTCSeconds());}tk();setInterval(tk,1000);}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
