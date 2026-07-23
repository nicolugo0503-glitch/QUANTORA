/* ============================================================
   Quantora — site-wide CINEMATIC engine  (v5 · addictive)
   Loaded on every page via nav.js. Defensive: never hides content.
   Reveals + count-up numbers + tactile cards (tilt/spotlight/lift)
   + cinematic media. Skips pages with their own system.
   ============================================================ */
(function(){
  if(window.__qcinematic)return; window.__qcinematic=1;
  var RM=false, COARSE=false;
  try{RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  try{COARSE=window.matchMedia&&matchMedia('(pointer: coarse)').matches;}catch(e){}
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  var IO=null, count=0, CAP=260;

  function revealAllNow(){ try{ var n=document.querySelectorAll('.qc-reveal:not(.qc-in)'); for(var i=0;i<n.length;i++)n[i].classList.add('qc-in'); }catch(e){} }
  function isChrome(el){ try{ return !!el.closest('.qnav,#qx-panel,#qx-fab,nav,header,.qc-atmos,.qfoot,footer'); }catch(e){ return false; } }

  function collect(root, out, depth){
    if(depth>4 || !root || !root.children) return;
    var kids=root.children;
    for(var i=0;i<kids.length;i++){ var el=kids[i];
      if(el.matches('script,style,link,noscript,.qnav,.qc-atmos,#qx-fab,#qx-panel')) continue;
      if(isChrome(el)) continue;
      var h=el.offsetHeight; if(h<26) continue;
      var cc=el.children, bk=0; for(var j=0;j<cc.length;j++){ if(cc[j].offsetHeight>26) bk++; }
      if(h > window.innerHeight*0.55 && bk>=3 && depth<4){ collect(el,out,depth+1); }
      else if(out.indexOf(el)<0){ out.push(el); }
    }
  }

  function isCard(el){
    try{ var cs=getComputedStyle(el);
      var br=parseFloat(cs.borderTopLeftRadius)||0;
      var shadow=cs.boxShadow && cs.boxShadow!=='none';
      var bw=parseFloat(cs.borderTopWidth)||0;
      var bg=cs.backgroundColor, hasBg=bg && bg!=='rgba(0, 0, 0, 0)' && bg!=='transparent';
      var w=el.offsetWidth, h=el.offsetHeight;
      return br>=6 && (shadow||bw>0||hasBg) && w>=120 && w<=1120 && h>=54 && h<=window.innerHeight*1.4;
    }catch(e){ return false; }
  }

  /* ---- count-up ---- */
  function isNum(t){ return /^[-+]?[$€£]?[\d,]+(\.\d+)?[%]?$/.test(t) || /^[-+]?[$€£]?[\d,]+(\.\d+)?[MBKT]$/.test(t); }
  function countUpEl(el){
    try{
      if(el.__qcu || el.children.length) return;
      var raw=(el.textContent||'').trim(); if(raw.length>14 || !isNum(raw)) return;
      var fs=parseFloat(getComputedStyle(el).fontSize)||0; if(fs<21) return;
      var num=parseFloat(raw.replace(/[^0-9.]/g,'')); if(!isFinite(num) || num===0) return;
      var neg=/^-/.test(raw), pre=(raw.match(/[$€£]/)||[''])[0], suf=(raw.match(/[%MBKT]$/)||[''])[0];
      var dec=((raw.split('.')[1]||'').match(/\d+/)||[''])[0].length;
      el.__qcu=1; el.classList.add('qc-num');
      var t0=null, dur=1000, target=neg?-num:num;
      function fmt(v){ var s=Math.abs(v).toFixed(dec); s=s.replace(/\B(?=(\d{3})+(?!\d))/g,','); return (v<0?'-':'')+pre+s+suf; }
      function fr(ts){ if(!t0)t0=ts; var p=Math.min(1,(ts-t0)/dur), e=1-Math.pow(1-p,3); el.textContent=fmt(target*e); if(p<1)requestAnimationFrame(fr); else el.textContent=raw; }
      requestAnimationFrame(fr);
    }catch(e){}
  }
  function countUpIn(root){ if(RM) return; try{ if(root.children.length===0){ countUpEl(root); return; } var els=root.querySelectorAll('*'); for(var i=0;i<els.length && i<400;i++){ if(els[i].children.length===0) countUpEl(els[i]); } }catch(e){} }

  function applyMedia(){
    try{ var media=document.querySelectorAll('img,video');
      for(var i=0;i<media.length;i++){ var el=media[i];
        if(el.classList.contains('qc-media')||el.classList.contains('qc-cover')||isChrome(el)) continue;
        var cs=getComputedStyle(el);
        var w=Math.max(el.offsetWidth||0, el.naturalWidth||0), h=Math.max(el.offsetHeight||0, el.naturalHeight||0);
        if(cs.position==='absolute'||cs.position==='fixed'){
          var p=el.parentElement; if(!p) continue; var pcs=getComputedStyle(p);
          if((pcs.overflow==='hidden'||pcs.overflowX==='hidden'||pcs.overflowY==='hidden') && w>=100 && h>=70){ p.classList.add('qc-coverwrap'); el.classList.add('qc-cover'); }
          continue;
        }
        if(el.tagName==='IMG' && (w<84 || h<64)) continue;
        el.classList.add('qc-media');
      }
    }catch(e){}
  }

  function applyReveals(){
    if(RM || !('IntersectionObserver' in window) || count>=CAP) return;
    if(!IO) IO=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('qc-in'); countUpIn(e.target); IO.unobserve(e.target); } }); },{rootMargin:'0px 0px -5% 0px', threshold:0.02});
    var blocks=[]; collect(document.body, blocks, 0);
    [].forEach.call(document.querySelectorAll('img.qc-media,video.qc-media'),function(m){ if(blocks.indexOf(m)<0) blocks.push(m); });
    var vh=window.innerHeight, stagger=0;
    blocks.forEach(function(el){
      if(count>=CAP) return;
      if(!el.classList.contains('qc-reveal')){
        el.classList.add('qc-reveal');
        if(!COARSE && !RM && isCard(el)){ el.classList.add('qc-card'); if(getComputedStyle(el).position==='static'){ el.style.position='relative'; } }
        try{ var r=el.getBoundingClientRect(); if(r.top>=0 && r.top<vh){ el.style.transitionDelay=(Math.min(stagger,10)*0.05)+'s'; stagger++; } }catch(e){}
        IO.observe(el); count++;
      }
    });
  }

  /* ---- pointer backbone: tilt toward cursor + moving spotlight (fine pointers) ---- */
  function backbone(){
    if(RM || COARSE) return;
    var active=null, raf=0, mx=0, my=0;
    function frame(){ raf=0; if(!active) return;
      var r=active.getBoundingClientRect(); if(!r.width) return;
      var x=mx-r.left, y=my-r.top;
      active.style.setProperty('--mx', x.toFixed(0)+'px'); active.style.setProperty('--my', y.toFixed(0)+'px');
      var rx=-((y-r.height/2)/(r.height/2))*3.2, ry=((x-r.width/2)/(r.width/2))*3.2;
      if(rx>4)rx=4; if(rx<-4)rx=-4; if(ry>4)ry=4; if(ry<-4)ry=-4;
      active.style.transform='perspective(920px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg) translateY(-4px)';
    }
    function reset(){ if(active){ active.classList.remove('qc-hot'); active.style.transform=''; active.style.removeProperty('--mx'); active.style.removeProperty('--my'); active=null; } }
    document.addEventListener('pointermove', function(e){
      if(window.__qscroll){ if(active) reset(); return; }
      mx=e.clientX; my=e.clientY;
      var card=e.target && e.target.closest ? e.target.closest('.qc-card') : null;
      if(card!==active){ reset(); active=card; if(active) active.classList.add('qc-hot'); }
      if(active && !raf) raf=requestAnimationFrame(frame);
    }, {passive:true});
    document.addEventListener('pointerdown', function(e){ var c=e.target&&e.target.closest?e.target.closest('.qc-card'):null; if(c){ c.style.transition='transform .12s ease'; setTimeout(function(){ c.style.transition=''; },140); } }, {passive:true});
    window.addEventListener('blur', reset);
    document.addEventListener('mouseleave', reset);
  }

  /* sweep in-view cards for numbers that loaded in AFTER their reveal (async data) */
  function sweepCountUp(){ if(RM) return; try{
    var cards=document.querySelectorAll('.qc-card'), vh=window.innerHeight;
    for(var i=0;i<cards.length;i++){ var c=cards[i]; var r=c.getBoundingClientRect(); if(r.bottom<0||r.top>vh) continue;
      var els=c.querySelectorAll('*'); for(var j=0;j<els.length && j<200;j++){ if(els[j].children.length===0 && !els[j].__qcu) countUpEl(els[j]); }
    }
  }catch(e){} }
  function pass(){ try{ applyMedia(); applyReveals(); sweepCountUp(); }catch(e){ revealAllNow(); } }

  ready(function(){
    try{
      if(!document.body) return;
      if(document.querySelector('.atmos')||document.querySelector('.reveal')||document.body.classList.contains('gl-on')||document.getElementById('field')) return;
      document.body.classList.add('qc-on');
      /* aurora background removed — keep the clean white surface */

      var sT; addEventListener('scroll',function(){ window.__qscroll=true; clearTimeout(sT); sT=setTimeout(function(){ window.__qscroll=false; },150); },{passive:true});

      backbone();
      pass();
      [500,1100,2000,3400,5200].forEach(function(t){ setTimeout(pass,t); });
      addEventListener('load',function(){ pass(); setTimeout(pass,700); });

      if('MutationObserver' in window){
        var mo=new MutationObserver(function(){ clearTimeout(window.__qcm); window.__qcm=setTimeout(pass,300); });
        try{ mo.observe(document.body,{childList:true,subtree:true}); }catch(e){}
        setTimeout(function(){ try{mo.disconnect();}catch(e){} }, 14000);
      }
      setTimeout(revealAllNow, 8000);
    }catch(e){ revealAllNow(); try{ document.body.classList.remove('qc-on'); }catch(_){ } }
  });
})();
