/* Quantora · hero engine. Flow-field data-art by default; live-data chart hero where configured. */
(function(){
  if(window.__qheroLoaded)return;window.__qheroLoaded=true;
  var CFG={
    '/pulse.html':   {t:'Pulse',        s:'The whole market on one screen, live.',                a:['#6366f1','#8b5cf6','#22d3ee']},
    '/markets.html': {t:'Markets',       s:'Live prices, moves and trend across every asset.',     a:['#4f7cff','#6366f1','#22d3ee'], live:'BTC-USD', llabel:'BTC / USD'},
    '/coins.html':   {t:'Coins',         s:'The top of the crypto market, ranked and live.',        a:['#8b5cf6','#ec4899','#6366f1']},
    '/defi.html':    {t:'DeFi',          s:'Total value locked, yields, stablecoins, fees.',        a:['#14b8a6','#22d3ee','#6366f1']},
    '/chain.html':   {t:'Bitcoin Chain', s:'On-chain truth, block by block.',                       a:['#f59e0b','#fb7185','#8b5cf6']},
    '/dex.html':     {t:'DEX',           s:'Real-time decentralized exchange flow.',                 a:['#10b981','#14b8a6','#22d3ee']},
    '/stocks.html':  {t:'Stocks',        s:'Equities, indices and the names that move them.',        a:['#4f7cff','#6366f1','#8b5cf6']},
    '/global.html':  {t:'Global',        s:'FX and commodities across the world.',                  a:['#0ea5e9','#6366f1','#14b8a6']},
    '/macro.html':   {t:'Macro',         s:'The forces beneath every market — live from FRED.',     a:['#3b82f6','#6366f1','#64748b']},
    '/news.html':    {t:'News',          s:'The wire that moves capital, summarized.',               a:['#8b5cf6','#6366f1','#ec4899']},
    '/signals.html': {t:'Signals',       s:'Momentum, trend and risk, computed live.',              a:['#ec4899','#8b5cf6','#6366f1']},
    '/calendar.html':{t:'Calendar',      s:'The events that move everything.',                      a:['#6366f1','#22d3ee','#8b5cf6']},
    '/fundamentals.html':{t:'Fundamentals',s:'The numbers behind the ticker.',                      a:['#4f7cff','#14b8a6','#6366f1']},
    '/analyst.html': {t:'AI Analyst',    s:'An entire research desk, on demand.',                   a:['#8b5cf6','#6366f1','#22d3ee']},
    '/ask.html':     {t:'Ask Quantora',  s:'Ask anything. Grounded in live data.',                  a:['#6366f1','#8b5cf6','#ec4899']},
    '/heatmap.html': {t:'Heatmap',       s:'The market’s heat, at a glance.',                  a:['#fb7185','#f59e0b','#8b5cf6']},
    '/screener.html':{t:'Screener',      s:'Filter the entire market in seconds.',                  a:['#4f7cff','#6366f1','#22d3ee']},
    '/chart.html':   {t:'Chart',         s:'Professional charting, every instrument.',              a:['#6366f1','#22d3ee','#8b5cf6']},
    '/portfolio.html':{t:'Portfolio',    s:'Your positions, priced and risk-read live.',            a:['#6366f1','#8b5cf6','#14b8a6']},
    '/watchlist.html':{t:'Watchlist',    s:'The names you’re watching, in real time.',         a:['#4f7cff','#6366f1','#8b5cf6']},
    '/alerts.html':  {t:'Alerts',        s:'Never miss the move that matters.',                     a:['#f59e0b','#ec4899','#8b5cf6']},
    '/risk.html':    {t:'Risk Center',   s:'Stress, exposure and drawdown, quantified.',            a:['#ef4444','#f59e0b','#8b5cf6']},
    '/brief.html':   {t:'Brief',         s:'Your AI morning brief, ready to share.',                a:['#8b5cf6','#6366f1','#22d3ee']},
    '/live.html':    {t:'Live',          s:'Every print, streaming in real time.',                  a:['#10b981','#22d3ee','#6366f1']}
  };
  var path=(location.pathname||'/').replace(/\/index\.html$/,'/');
  var cfg=CFG[path]; if(!cfg) return;

  var css=
  '.qhero{position:relative;border-radius:24px;overflow:hidden;margin:6px 0 22px;height:208px;background:#0b0d12;box-shadow:0 2px 6px rgba(16,24,40,.06),0 40px 80px -34px rgba(99,102,241,.4);border:1px solid rgba(255,255,255,.5)}'+
  '.qhero canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 1s ease}'+
  '.qhero.shown canvas{opacity:1}'+
  '.qhero .ov{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,16,.85) 0%,rgba(8,10,16,.5) 44%,rgba(8,10,16,.08) 100%)}'+
  '.qhero .in{position:absolute;left:0;bottom:0;padding:26px 30px;z-index:2}'+
  '.qhero .badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.16em;color:#d9defb;text-transform:uppercase;margin-bottom:12px}'+
  '.qhero .badge .d{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 0 0 rgba(52,211,153,.5);animation:qhp 1.9s infinite}'+
  '@keyframes qhp{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}'+
  '.qhero h1.qht{margin:0;font-size:46px;line-height:1;font-weight:800;letter-spacing:-.035em;color:#fff;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'+
  '.qhero .qhs{margin:11px 0 0;font-size:15px;color:#c3cae0;max-width:560px;font-weight:450}'+
  '.qhero .clock{position:absolute;right:26px;bottom:24px;z-index:2;text-align:right;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace}'+
  '.qhero .clock .t{font-size:21px;font-weight:600;color:#eef1fb;letter-spacing:.02em;font-variant-numeric:tabular-nums}'+
  '.qhero .clock .l{font-size:10.5px;letter-spacing:.18em;color:#8b93ad;text-transform:uppercase;margin-top:3px}'+
  '.qhero .qhlive{position:absolute;right:28px;bottom:22px;z-index:2;text-align:right}'+
  '.qhero .qhlive .ql{font-size:10.5px;letter-spacing:.16em;color:#9aa3bd;text-transform:uppercase;font-weight:700}'+
  '.qhero .qhlive .qp{font-size:30px;font-weight:800;color:#fff;letter-spacing:-.03em;margin-top:4px;font-variant-numeric:tabular-nums}'+
  '.qhero .qhlive .qc{font-size:13.5px;font-weight:700;margin-top:4px}'+
  '.qhero .qhlive .qc.up{color:#34d399}.qhero .qhlive .qc.dn{color:#fb7185}'+
  '@media(max-width:640px){.qhero{height:172px}.qhero h1.qht{font-size:34px}.qhero .qhs{font-size:13px}.qhero .clock,.qhero .qhlive .qp{font-size:22px}.qhero .qhs{display:none}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  function usd(n){if(n==null||isNaN(n))return '$—';return '$'+Number(n).toLocaleString('en-US',{maximumFractionDigits:0});}

  function build(){
    var host=document.querySelector('.wrap')||document.querySelector('main')||document.body;
    var oldH1=host.querySelector('h1');
    if(oldH1){ var sib=oldH1.nextElementSibling; if(sib&&/\bsub\b/.test(sib.className)) sib.style.display='none';
      var hh=oldH1.closest('.head,.header,.hero')||oldH1; if(hh!==host) hh.style.display='none'; else oldH1.style.display='none'; }

    var hero=document.createElement('div');hero.className='qhero';
    var rightHTML = cfg.live
      ? '<div class="qhlive"><div class="ql">'+cfg.llabel+'</div><div class="qp" id="qhlivep">$—</div><div class="qc" id="qhlivec">live</div></div>'
      : '<div class="clock"><div class="t" id="qhclock">--:--:--</div><div class="l">UTC</div></div>';
    hero.innerHTML='<canvas></canvas><div class="ov"></div>'+
      '<div class="in"><div class="badge"><span class="d"></span> Quantora · Live</div>'+
      '<h1 class="qht">'+cfg.t+'</h1><p class="qhs">'+cfg.s+'</p></div>'+rightHTML;
    host.insertBefore(hero,host.firstChild);

    var cv=hero.querySelector('canvas'),cx=cv.getContext('2d'),W,H,dpr;
    function size(){var r=hero.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);cv.width=(W=r.width)*dpr;cv.height=(H=r.height)*dpr;cx.setTransform(dpr,0,0,dpr,0,0);cx.fillStyle='#0b0d12';cx.fillRect(0,0,W,H);}
    size();

    if(cfg.live){ liveChart(); }
    else { flowField(); clock(); }

    /* ---------- LIVE DATA HERO ---------- */
    function liveChart(){
      var closes=[];
      function draw(){
        cx.clearRect(0,0,W,H);cx.fillStyle='#0b0d12';cx.fillRect(0,0,W,H);
        if(closes.length<2)return;
        var lo=Math.min.apply(null,closes),hi=Math.max.apply(null,closes),pad=(hi-lo)*0.18||1;lo-=pad;hi+=pad;
        var X=function(i){return i/(closes.length-1)*W;},Y=function(v){return H-(v-lo)/(hi-lo)*(H-26)-8;};
        var up=closes[closes.length-1]>=closes[0];
        var gl=cx.createLinearGradient(0,0,W,0);gl.addColorStop(0,cfg.a[0]);gl.addColorStop(.55,cfg.a[1]);gl.addColorStop(1,cfg.a[2]);
        var gf=cx.createLinearGradient(0,0,0,H);gf.addColorStop(0,'rgba(99,102,241,.30)');gf.addColorStop(1,'rgba(99,102,241,0)');
        cx.beginPath();cx.moveTo(0,H);for(var i=0;i<closes.length;i++)cx.lineTo(X(i),Y(closes[i]));cx.lineTo(W,H);cx.closePath();cx.fillStyle=gf;cx.fill();
        cx.beginPath();for(var i=0;i<closes.length;i++){i?cx.lineTo(X(i),Y(closes[i])):cx.moveTo(X(i),Y(closes[i]));}
        cx.strokeStyle=gl;cx.lineWidth=2.6;cx.lineJoin='round';cx.shadowColor='rgba(124,92,246,.55)';cx.shadowBlur=18;cx.stroke();cx.shadowBlur=0;
        var lx=X(closes.length-1),ly=Y(closes[closes.length-1]);
        cx.beginPath();cx.arc(lx,ly,4.5,0,6.3);cx.fillStyle='#fff';cx.fill();cx.lineWidth=2.4;cx.strokeStyle=up?'#34d399':'#fb7185';cx.stroke();
      }
      fetch('https://api.exchange.coinbase.com/products/'+cfg.live+'/candles?granularity=3600').then(function(r){return r.json();}).then(function(a){
        if(!Array.isArray(a)||!a.length)return; closes=a.map(function(c){return c[4];}).reverse(); draw(); hero.classList.add('shown');
      }).catch(function(){ hero.classList.add('shown'); });
      try{
        var ws=new WebSocket('wss://ws-feed.exchange.coinbase.com');
        ws.onopen=function(){ws.send(JSON.stringify({type:'subscribe',product_ids:[cfg.live],channels:['ticker']}));};
        ws.onmessage=function(e){var m=JSON.parse(e.data);if(m.type!=='ticker')return;var p=+m.price,o=+m.open_24h;
          var pe=document.getElementById('qhlivep');if(pe)pe.textContent=usd(p);
          var ch=o?((p-o)/o*100):0,ce=document.getElementById('qhlivec');if(ce){ce.className='qc '+(ch>=0?'up':'dn');ce.textContent=(ch>=0?'▲ +':'▼ ')+Math.abs(ch).toFixed(2)+'%';}
          if(closes.length){closes[closes.length-1]=p;draw();}
        };
      }catch(e){}
      window.addEventListener('resize',function(){size();draw();});
    }

    /* ---------- FLOW-FIELD ART (default) ---------- */
    function flowField(){
      hero.classList.add('shown');
      var grad=cx.createLinearGradient(0,0,W,H);grad.addColorStop(0,cfg.a[0]);grad.addColorStop(.5,cfg.a[1]);grad.addColorStop(1,cfg.a[2]);
      var N=Math.round(Math.min(150,W/8)),P=[];for(var i=0;i<N;i++)P.push({x:Math.random()*W,y:Math.random()*H,px:0,py:0});
      function ang(x,y,t){return (Math.sin(x*0.0042+t*0.00035)+Math.cos(y*0.0050-t*0.00028)+Math.sin((x+y)*0.0024+t*0.0002))*1.4;}
      function stp(t){cx.fillStyle='rgba(11,13,18,0.07)';cx.fillRect(0,0,W,H);cx.lineWidth=1.25;cx.lineCap='round';cx.strokeStyle=grad;cx.globalCompositeOperation='lighter';
        for(var i=0;i<P.length;i++){var p=P[i];var a=ang(p.x,p.y,t);p.px=p.x;p.py=p.y;p.x+=Math.cos(a)*1.7;p.y+=Math.sin(a)*1.7;
          if(p.x<0||p.x>W||p.y<0||p.y>H){p.x=Math.random()*W;p.y=Math.random()*H;p.px=p.x;p.py=p.y;continue;}
          cx.globalAlpha=0.5;cx.beginPath();cx.moveTo(p.px,p.py);cx.lineTo(p.x,p.y);cx.stroke();}
        cx.globalAlpha=1;cx.globalCompositeOperation='source-over';}
      var t0=0;for(var s=0;s<90;s++){t0+=16;stp(t0);}var run=true;
      function loop(){if(!run)return;t0+=16;stp(t0);requestAnimationFrame(loop);}requestAnimationFrame(loop);
      window.addEventListener('resize',function(){run=false;size();grad=cx.createLinearGradient(0,0,W,H);grad.addColorStop(0,cfg.a[0]);grad.addColorStop(.5,cfg.a[1]);grad.addColorStop(1,cfg.a[2]);for(var k=0;k<60;k++){t0+=16;stp(t0);}run=true;requestAnimationFrame(loop);});
    }
    function clock(){function tk(){var d=new Date();var p=function(n){return String(n).padStart(2,'0');};var el=document.getElementById('qhclock');if(el)el.textContent=p(d.getUTCHours())+':'+p(d.getUTCMinutes())+':'+p(d.getUTCSeconds());}tk();setInterval(tk,1000);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
