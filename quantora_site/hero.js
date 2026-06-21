/* Quantora · hero engine — live-data heroes per module; flow-field only as fallback. */
(function(){
  if(window.__qheroLoaded)return;window.__qheroLoaded=true;
  var CFG={
    '/pulse.html':   {t:'Pulse',  s:'The whole market on one screen, live.', a:['#6366f1','#8b5cf6','#22d3ee'], feed:{type:'metric',url:'https://api.coingecko.com/api/v3/global',map:'cgcap',label:'Total market cap'}},
    '/markets.html': {t:'Markets', s:'Live prices, moves and trend across every asset.', a:['#4f7cff','#6366f1','#22d3ee'], feed:{type:'cb',product:'BTC-USD',label:'BTC / USD'}},
    '/coins.html':   {t:'Coins',   s:'The top of the crypto market, ranked and live.', a:['#8b5cf6','#ec4899','#6366f1'], feed:{type:'metric',url:'https://api.coingecko.com/api/v3/global',map:'cgcap',label:'Total crypto cap'}},
    '/defi.html':    {t:'DeFi',    s:'Total value locked, yields, stablecoins, fees.', a:['#14b8a6','#22d3ee','#6366f1'], feed:{type:'series',url:'https://api.llama.fi/v2/historicalChainTvl',map:'llamaTVL',label:'Total value locked'}},
    '/chain.html':   {t:'Bitcoin Chain', s:'On-chain truth, block by block.', a:['#f59e0b','#fb7185','#8b5cf6'], feed:{type:'series',url:'https://mempool.space/api/v1/blocks',map:'blocks',label:'Block height'}},
    '/macro.html':   {t:'Macro',   s:'The forces beneath every market — live from FRED.', a:['#3b82f6','#6366f1','#64748b'], feed:{type:'series',url:'/api/fredseries',map:'fred10Y',label:'10-Year Treasury'}},
    '/stocks.html':  {t:'Stocks',  s:'Equities, indices and the names that move them.', a:['#4f7cff','#6366f1','#8b5cf6'], feed:{type:'series',url:'/api/quote?symbol=SPY',map:'quote',label:'S&P 500 · SPY'}},
    '/dex.html':     {t:'DEX',     s:'Real-time decentralized exchange flow.', a:['#10b981','#14b8a6','#22d3ee']},
    '/global.html':  {t:'Global',  s:'FX and commodities across the world.', a:['#0ea5e9','#6366f1','#14b8a6']},
    '/news.html':    {t:'News',    s:'The wire that moves capital, summarized.', a:['#8b5cf6','#6366f1','#ec4899']},
    '/signals.html': {t:'Signals', s:'Momentum, trend and risk, computed live.', a:['#ec4899','#8b5cf6','#6366f1']},
    '/calendar.html':{t:'Calendar',s:'The events that move everything.', a:['#6366f1','#22d3ee','#8b5cf6']},
    '/fundamentals.html':{t:'Fundamentals',s:'The numbers behind the ticker.', a:['#4f7cff','#14b8a6','#6366f1']},
    '/analyst.html': {t:'AI Analyst', s:'An entire research desk, on demand.', a:['#8b5cf6','#6366f1','#22d3ee']},
    '/ask.html':     {t:'Ask Quantora', s:'Ask anything. Grounded in live data.', a:['#6366f1','#8b5cf6','#ec4899']},
    '/heatmap.html': {t:'Heatmap', s:'The market’s heat, at a glance.', a:['#fb7185','#f59e0b','#8b5cf6']},
    '/screener.html':{t:'Screener',s:'Filter the entire market in seconds.', a:['#4f7cff','#6366f1','#22d3ee']},
    '/chart.html':   {t:'Chart',   s:'Professional charting, every instrument.', a:['#6366f1','#22d3ee','#8b5cf6'], feed:{type:'cb',product:'ETH-USD',label:'ETH / USD'}},
    '/portfolio.html':{t:'Portfolio', s:'Your positions, priced and risk-read live.', a:['#6366f1','#8b5cf6','#14b8a6']},
    '/watchlist.html':{t:'Watchlist', s:'The names you’re watching, in real time.', a:['#4f7cff','#6366f1','#8b5cf6']},
    '/alerts.html':  {t:'Alerts',  s:'Never miss the move that matters.', a:['#f59e0b','#ec4899','#8b5cf6']},
    '/risk.html':    {t:'Risk Center', s:'Stress, exposure and drawdown, quantified.', a:['#ef4444','#f59e0b','#8b5cf6']},
    '/brief.html':   {t:'Brief',   s:'Your AI morning brief, ready to share.', a:['#8b5cf6','#6366f1','#22d3ee']},
    '/live.html':    {t:'Live',    s:'Every print, streaming in real time.', a:['#10b981','#22d3ee','#6366f1'], feed:{type:'cb',product:'SOL-USD',label:'SOL / USD'}}
  };
  var path=(location.pathname||'/').replace(/\/index\.html$/,'/');
  var cfg=CFG[path]; if(!cfg) return;

  var css=
  '.qhero{position:relative;border-radius:24px;overflow:hidden;margin:6px 0 22px;height:208px;background:#0b0d12;box-shadow:0 2px 6px rgba(16,24,40,.06),0 40px 80px -34px rgba(99,102,241,.4);border:1px solid rgba(255,255,255,.5)}'+
  '.qhero canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 1s ease}.qhero.shown canvas{opacity:1}'+
  '.qhero .ov{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,16,.86) 0%,rgba(8,10,16,.5) 44%,rgba(8,10,16,.08) 100%)}'+
  '.qhero .in{position:absolute;left:0;bottom:0;padding:26px 30px;z-index:2}'+
  '.qhero .badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.16em;color:#d9defb;text-transform:uppercase;margin-bottom:12px}'+
  '.qhero .badge .d{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 0 0 rgba(52,211,153,.5);animation:qhp 1.9s infinite}'+
  '@keyframes qhp{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}'+
  '.qhero h1.qht{margin:0;font-size:46px;line-height:1;font-weight:800;letter-spacing:-.035em;color:#fff;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'+
  '.qhero .qhs{margin:11px 0 0;font-size:15px;color:#c3cae0;max-width:540px;font-weight:450}'+
  '.qhero .clock{position:absolute;right:26px;bottom:24px;z-index:2;text-align:right;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace}'+
  '.qhero .clock .t{font-size:21px;font-weight:600;color:#eef1fb;font-variant-numeric:tabular-nums}.qhero .clock .l{font-size:10.5px;letter-spacing:.18em;color:#8b93ad;text-transform:uppercase;margin-top:3px}'+
  '.qhero .qhlive{position:absolute;right:28px;bottom:22px;z-index:2;text-align:right;max-width:48%}'+
  '.qhero .qhlive .ql{font-size:10.5px;letter-spacing:.16em;color:#9aa3bd;text-transform:uppercase;font-weight:700}'+
  '.qhero .qhlive .qp{font-size:30px;font-weight:800;color:#fff;letter-spacing:-.03em;margin-top:4px;font-variant-numeric:tabular-nums}'+
  '.qhero .qhlive .qc{font-size:13.5px;font-weight:700;margin-top:4px;color:#aab2c8}.qhero .qhlive .qc.up{color:#34d399}.qhero .qhlive .qc.dn{color:#fb7185}'+
  '@media(max-width:640px){.qhero{height:172px}.qhero h1.qht{font-size:34px}.qhero .qhs{display:none}.qhero .qhlive .qp,.qhero .clock .t{font-size:22px}}';
  document.head.appendChild(Object.assign(document.createElement('style'),{textContent:css}));

  function big(n){if(n==null||isNaN(n))return '—';n=+n;var a=Math.abs(n);if(a>=1e12)return '$'+(n/1e12).toFixed(2)+'T';if(a>=1e9)return '$'+(n/1e9).toFixed(1)+'B';if(a>=1e6)return '$'+(n/1e6).toFixed(1)+'M';return '$'+Math.round(n).toLocaleString();}
  function usd0(n){return (n==null||isNaN(n))?'—':'$'+Math.round(n).toLocaleString();}
  function usd2(n){return (n==null||isNaN(n))?'—':'$'+(+n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function pctv(n){return (n==null||isNaN(n))?'—':(+n).toFixed(2)+'%';}
  function intv(n){return (n==null||isNaN(n))?'—':Math.round(n).toLocaleString();}
  var FMT={big:big,usd0:usd0,usd2:usd2,pct:pctv,int:intv};

  var MAP={
    llamaTVL:function(a){if(!Array.isArray(a)||!a.length)return null;var s=a.slice(-150);return{points:s.map(function(x){return x.tvl;}),value:s[s.length-1].tvl,fmt:'big'};},
    fred10Y:function(j){var it=(j.indicators||[]).filter(function(x){return x.id==='DGS10';})[0];if(!it)return null;return{points:it.points.map(function(p){return p.v;}),value:it.latest,fmt:'pct'};},
    quote:function(j){var c=j.closes||j.values||null;if(!c||!c.length)return null;return{points:c.map(Number),value:+c[c.length-1],fmt:'usd2'};},
    blocks:function(a){if(!Array.isArray(a)||!a.length)return null;return{points:a.map(function(b){return b.tx_count;}).reverse(),value:a[0].height,fmt:'int',sub:'live · mempool.space'};},
    cgcap:function(j){var d=j.data;if(!d)return null;return{value:d.total_market_cap.usd,fmt:'big',sub:(d.market_cap_change_percentage_24h_usd>=0?'▲ +':'▼ ')+Math.abs(d.market_cap_change_percentage_24h_usd).toFixed(2)+'% 24h · BTC dom '+d.market_cap_percentage.btc.toFixed(1)+'%',dir:d.market_cap_change_percentage_24h_usd>=0?'up':'dn'};}
  };

  function build(){
    var host=document.querySelector('.wrap')||document.querySelector('main')||document.body;
    var oldH1=host.querySelector('h1');
    if(oldH1){var sib=oldH1.nextElementSibling;if(sib&&/\bsub\b/.test(sib.className))sib.style.display='none';var hh=oldH1.closest('.head,.header,.hero')||oldH1;if(hh!==host)hh.style.display='none';else oldH1.style.display='none';}
    var hero=document.createElement('div');hero.className='qhero';
    var right=cfg.feed?'<div class="qhlive"><div class="ql" id="qhl">'+(cfg.feed.label||'')+'</div><div class="qp" id="qhp">—</div><div class="qc" id="qhc">live</div></div>'
                      :'<div class="clock"><div class="t" id="qhclock">--:--:--</div><div class="l">UTC</div></div>';
    hero.innerHTML='<canvas></canvas><div class="ov"></div><div class="in"><div class="badge"><span class="d"></span> Quantora · Live</div><h1 class="qht">'+cfg.t+'</h1><p class="qhs">'+cfg.s+'</p></div>'+right;
    host.insertBefore(hero,host.firstChild);
    var cv=hero.querySelector('canvas'),cx=cv.getContext('2d'),W,H,dpr;
    function size(){var r=hero.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);cv.width=(W=r.width)*dpr;cv.height=(H=r.height)*dpr;cx.setTransform(dpr,0,0,dpr,0,0);cx.fillStyle='#0b0d12';cx.fillRect(0,0,W,H);}
    size();

    function area(arr){
      cx.clearRect(0,0,W,H);cx.fillStyle='#0b0d12';cx.fillRect(0,0,W,H);
      if(!arr||arr.length<2)return;
      var lo=Math.min.apply(null,arr),hi=Math.max.apply(null,arr),pad=(hi-lo)*0.18||1;lo-=pad;hi+=pad;
      var X=function(i){return i/(arr.length-1)*W;},Y=function(v){return H-(v-lo)/(hi-lo)*(H-26)-8;};
      var gl=cx.createLinearGradient(0,0,W,0);gl.addColorStop(0,cfg.a[0]);gl.addColorStop(.55,cfg.a[1]);gl.addColorStop(1,cfg.a[2]);
      var gf=cx.createLinearGradient(0,0,0,H);gf.addColorStop(0,'rgba(99,102,241,.30)');gf.addColorStop(1,'rgba(99,102,241,0)');
      cx.beginPath();cx.moveTo(0,H);for(var i=0;i<arr.length;i++)cx.lineTo(X(i),Y(arr[i]));cx.lineTo(W,H);cx.closePath();cx.fillStyle=gf;cx.fill();
      cx.beginPath();for(var i=0;i<arr.length;i++){i?cx.lineTo(X(i),Y(arr[i])):cx.moveTo(X(i),Y(arr[i]));}
      cx.strokeStyle=gl;cx.lineWidth=2.6;cx.lineJoin='round';cx.shadowColor='rgba(124,92,246,.55)';cx.shadowBlur=18;cx.stroke();cx.shadowBlur=0;
      var lx=X(arr.length-1),ly=Y(arr[arr.length-1]);cx.beginPath();cx.arc(lx,ly,4.5,0,6.3);cx.fillStyle='#fff';cx.fill();cx.lineWidth=2.4;cx.strokeStyle=arr[arr.length-1]>=arr[0]?'#34d399':'#fb7185';cx.stroke();
    }
    function glowBg(){var g=cx.createRadialGradient(W*0.8,H*0.4,10,W*0.8,H*0.4,W*0.7);g.addColorStop(0,cfg.a[0]);g.addColorStop(1,'#0b0d12');cx.globalAlpha=0.5;cx.fillStyle=g;cx.fillRect(0,0,W,H);cx.globalAlpha=1;}
    function setMetric(label,val,sub,dir){var e;if((e=document.getElementById('qhl'))&&label)e.textContent=label;if((e=document.getElementById('qhp')))e.textContent=val;if((e=document.getElementById('qhc'))){e.textContent=sub||'';e.className='qc'+(dir?' '+dir:'');}}
    function fallback(){flowField();clock();}

    if(!cfg.feed){ fallback(); return; }
    var f=cfg.feed;
    try{
      if(f.type==='cb'){
        var closes=[];
        fetch('https://api.exchange.coinbase.com/products/'+f.product+'/candles?granularity=3600').then(function(r){return r.json();}).then(function(a){if(!Array.isArray(a)||!a.length){fallback();return;}closes=a.map(function(c){return c[4];}).reverse();area(closes);hero.classList.add('shown');}).catch(fallback);
        try{var ws=new WebSocket('wss://ws-feed.exchange.coinbase.com');ws.onopen=function(){ws.send(JSON.stringify({type:'subscribe',product_ids:[f.product],channels:['ticker']}));};ws.onmessage=function(e){var m=JSON.parse(e.data);if(m.type!=='ticker')return;var p=+m.price,o=+m.open_24h,ch=o?((p-o)/o*100):0;setMetric(f.label,usd0(p),(ch>=0?'▲ +':'▼ ')+Math.abs(ch).toFixed(2)+'%',ch>=0?'up':'dn');if(closes.length){closes[closes.length-1]=p;area(closes);}};}catch(e){}
        window.addEventListener('resize',function(){size();area(closes);});
      } else if(f.type==='series'){
        fetch(f.url).then(function(r){return r.json();}).then(function(j){var m=MAP[f.map](j);if(!m){fallback();return;}area(m.points);hero.classList.add('shown');var ch=m.points.length>1?((m.points[m.points.length-1]-m.points[0])/Math.abs(m.points[0])*100):null;var sub=m.sub||(ch!=null?(ch>=0?'▲ +':'▼ ')+Math.abs(ch).toFixed(1)+'% range':'');setMetric(f.label,FMT[m.fmt](m.value),sub,ch!=null&&!m.sub?(ch>=0?'up':'dn'):'');window.addEventListener('resize',function(){size();area(m.points);});}).catch(fallback);
      } else if(f.type==='metric'){
        glowBg();hero.classList.add('shown');
        fetch(f.url).then(function(r){return r.json();}).then(function(j){var m=MAP[f.map](j);if(!m){fallback();return;}setMetric(f.label,FMT[m.fmt](m.value),m.sub||'',m.dir||'');}).catch(fallback);
      } else { fallback(); }
    }catch(e){ fallback(); }

    function flowField(){
      hero.classList.add('shown');
      var grad=cx.createLinearGradient(0,0,W,H);grad.addColorStop(0,cfg.a[0]);grad.addColorStop(.5,cfg.a[1]);grad.addColorStop(1,cfg.a[2]);
      var N=Math.round(Math.min(150,W/8)),P=[];for(var i=0;i<N;i++)P.push({x:Math.random()*W,y:Math.random()*H,px:0,py:0});
      function ang(x,y,t){return (Math.sin(x*0.0042+t*0.00035)+Math.cos(y*0.0050-t*0.00028)+Math.sin((x+y)*0.0024+t*0.0002))*1.4;}
      function stp(t){cx.fillStyle='rgba(11,13,18,0.07)';cx.fillRect(0,0,W,H);cx.lineWidth=1.25;cx.lineCap='round';cx.strokeStyle=grad;cx.globalCompositeOperation='lighter';for(var i=0;i<P.length;i++){var p=P[i];var a=ang(p.x,p.y,t);p.px=p.x;p.py=p.y;p.x+=Math.cos(a)*1.7;p.y+=Math.sin(a)*1.7;if(p.x<0||p.x>W||p.y<0||p.y>H){p.x=Math.random()*W;p.y=Math.random()*H;p.px=p.x;p.py=p.y;continue;}cx.globalAlpha=0.5;cx.beginPath();cx.moveTo(p.px,p.py);cx.lineTo(p.x,p.y);cx.stroke();}cx.globalAlpha=1;cx.globalCompositeOperation='source-over';}
      var t0=0;for(var s=0;s<90;s++){t0+=16;stp(t0);}var run=true;function loop(){if(!run)return;t0+=16;stp(t0);requestAnimationFrame(loop);}requestAnimationFrame(loop);
    }
    function clock(){function tk(){var d=new Date(),p=function(n){return String(n).padStart(2,'0');},el=document.getElementById('qhclock');if(el)el.textContent=p(d.getUTCHours())+':'+p(d.getUTCMinutes())+':'+p(d.getUTCSeconds());}tk();setInterval(tk,1000);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
