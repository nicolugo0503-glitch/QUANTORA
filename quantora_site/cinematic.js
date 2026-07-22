/* ============================================================
   Quantora — site-wide CINEMATIC engine  (v3)
   Loaded on every page via nav.js. Defensive: never hides content.
   Structure-agnostic reveals + re-scan for async content +
   cinematic media (rounded/shadow for inline, hover-zoom for covers).
   ============================================================ */
(function(){
  if(window.__qcinematic)return; window.__qcinematic=1;
  var RM=false; try{RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  var IO=null, count=0, CAP=240;

  function revealAllNow(){ try{ var n=document.querySelectorAll('.qc-reveal:not(.qc-in)'); for(var i=0;i<n.length;i++)n[i].classList.add('qc-in'); }catch(e){} }
  function isChrome(el){ try{ return !!el.closest('.qnav,#qx-panel,#qx-fab,nav,header,.qc-atmos,.qfoot,footer'); }catch(e){ return false; } }

  /* Walk the DOM, descending THROUGH big page wrappers down to the real content blocks. */
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

  function applyMedia(){
    try{ var media=document.querySelectorAll('img,video');
      for(var i=0;i<media.length;i++){ var el=media[i];
        if(el.classList.contains('qc-media')||el.classList.contains('qc-cover')||isChrome(el)) continue;
        var cs=getComputedStyle(el);
        var w=Math.max(el.offsetWidth||0, el.naturalWidth||0), h=Math.max(el.offsetHeight||0, el.naturalHeight||0);
        if(cs.position==='absolute'||cs.position==='fixed'){
          /* cover image filling a card → cinematic hover-zoom (only if parent already clips) */
          var p=el.parentElement; if(!p) continue;
          var pcs=getComputedStyle(p);
          if((pcs.overflow==='hidden'||pcs.overflowX==='hidden'||pcs.overflowY==='hidden') && w>=100 && h>=70){
            p.classList.add('qc-coverwrap'); el.classList.add('qc-cover');
          }
          continue;
        }
        if(el.tagName==='IMG' && (w<84 || h<64)) continue;   /* icons / logos / avatars */
        el.classList.add('qc-media');
      }
    }catch(e){}
  }

  function applyReveals(){
    if(RM || !('IntersectionObserver' in window) || count>=CAP) return;
    if(!IO) IO=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('qc-in'); IO.unobserve(e.target); } }); },{rootMargin:'0px 0px -5% 0px', threshold:0.02});
    var blocks=[]; collect(document.body, blocks, 0);
    [].forEach.call(document.querySelectorAll('img.qc-media,video.qc-media'),function(m){ if(blocks.indexOf(m)<0) blocks.push(m); });
    var vh=window.innerHeight, stagger=0;
    blocks.forEach(function(el){
      if(count>=CAP) return;
      if(!el.classList.contains('qc-reveal')){
        el.classList.add('qc-reveal');
        try{ var r=el.getBoundingClientRect(); if(r.top>=0 && r.top<vh){ el.style.transitionDelay=(Math.min(stagger,10)*0.05)+'s'; stagger++; } }catch(e){}
        IO.observe(el); count++;
      }
    });
  }

  function pass(){ try{ applyMedia(); applyReveals(); }catch(e){ revealAllNow(); } }

  ready(function(){
    try{
      if(!document.body) return;
      /* Skip pages that already ship their own cinematic system (today/alpha/index). */
      if(document.querySelector('.atmos')||document.querySelector('.reveal')||document.body.classList.contains('gl-on')||document.getElementById('field')) return;
      document.body.classList.add('qc-on');

      if(!RM){ var at=document.createElement('div'); at.className='qc-atmos'; at.setAttribute('aria-hidden','true'); at.innerHTML='<b class="qa1"></b><b class="qa2"></b><b class="qa3"></b>'; document.body.insertBefore(at, document.body.firstChild); }

      var sT; addEventListener('scroll',function(){ window.__qscroll=true; clearTimeout(sT); sT=setTimeout(function(){ window.__qscroll=false; },150); },{passive:true});

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
