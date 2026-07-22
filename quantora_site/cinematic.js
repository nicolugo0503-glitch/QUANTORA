/* ============================================================
   Quantora — site-wide CINEMATIC engine  (v2)
   Loaded on every page via nav.js. Defensive: never hides content.
   Structure-agnostic reveals + re-scans for async-rendered content.
   ============================================================ */
(function(){
  if(window.__qcinematic)return; window.__qcinematic=1;
  var RM=false; try{RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  var IO=null, count=0, CAP=220;

  function revealAllNow(){ try{ var n=document.querySelectorAll('.qc-reveal:not(.qc-in)'); for(var i=0;i<n.length;i++)n[i].classList.add('qc-in'); }catch(e){} }
  function isChrome(el){ try{ return !!el.closest('.qnav,#qx-panel,#qx-fab,nav,header,.qc-atmos,.qfoot,footer'); }catch(e){ return false; } }

  /* Walk the DOM and collect the real content blocks, descending THROUGH full-height
     wrappers (which vary by page) down to the blocks that actually hold content. */
  function collect(root, out, depth){
    if(depth>4 || !root || !root.children) return;
    var kids=root.children;
    for(var i=0;i<kids.length;i++){ var el=kids[i];
      if(el.matches('script,style,link,noscript,.qnav,.qc-atmos,#qx-fab,#qx-panel')) continue;
      if(isChrome(el)) continue;
      var h=el.offsetHeight; if(h<26) continue;
      var cc=el.children, bk=0; for(var j=0;j<cc.length;j++){ if(cc[j].offsetHeight>26) bk++; }
      if(h > window.innerHeight*0.82 && bk>=3 && depth<4){ collect(el,out,depth+1); }
      else if(out.indexOf(el)<0){ out.push(el); }
    }
  }

  function applyMedia(){
    try{ var media=document.querySelectorAll('img,video');
      for(var m=0;m<media.length;m++){ var el=media[m];
        if(el.classList.contains('qc-media')||isChrome(el)) continue;
        var cs=getComputedStyle(el); if(cs.position==='absolute'||cs.position==='fixed') continue;
        var w=Math.max(el.offsetWidth||0, el.naturalWidth||0), hh=Math.max(el.offsetHeight||0, el.naturalHeight||0);
        if(el.tagName==='IMG' && (w<84 || hh<64)) continue;
        el.classList.add('qc-media');
      }
    }catch(e){}
  }

  function applyReveals(){
    if(RM || !('IntersectionObserver' in window) || count>=CAP) return;
    if(!IO) IO=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('qc-in'); IO.unobserve(e.target); } }); },{rootMargin:'0px 0px -5% 0px', threshold:0.02});
    var blocks=[]; collect(document.body, blocks, 0);
    [].forEach.call(document.querySelectorAll('img.qc-media,video.qc-media'),function(m){ if(blocks.indexOf(m)<0) blocks.push(m); });
    blocks.forEach(function(el){
      if(count>=CAP) return;
      if(!el.classList.contains('qc-reveal')){ el.classList.add('qc-reveal'); IO.observe(el); count++; }
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

      /* catch async-rendered content (tables/charts that appear after fetch) */
      if('MutationObserver' in window){
        var mo=new MutationObserver(function(){ clearTimeout(window.__qcm); window.__qcm=setTimeout(pass,300); });
        try{ mo.observe(document.body,{childList:true,subtree:true}); }catch(e){}
        setTimeout(function(){ try{mo.disconnect();}catch(e){} }, 14000);
      }
      /* ultimate safety: never leave anything invisible */
      setTimeout(revealAllNow, 8000);
    }catch(e){ revealAllNow(); try{ document.body.classList.remove('qc-on'); }catch(_){ } }
  });
})();
