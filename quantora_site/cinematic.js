/* ============================================================
   Quantora — site-wide CINEMATIC engine
   Loaded on every page via nav.js. Self-contained, defensive:
   it NEVER throws in a way that hides page content.
   ============================================================ */
(function(){
  if(window.__qcinematic)return; window.__qcinematic=1;
  var RM=false; try{RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }

  function revealAll(){ try{ var n=document.querySelectorAll('.qc-reveal'); for(var i=0;i<n.length;i++)n[i].classList.add('qc-in'); }catch(e){} }

  ready(function(){
    try{
      var body=document.body; if(!body) return;
      /* Skip pages that already ship their own cinematic system (today/alpha/index). */
      if(document.querySelector('.atmos')||document.querySelector('.reveal')||body.classList.contains('gl-on')||document.getElementById('field')) return;
      body.classList.add('qc-on');

      /* 1) ambient aurora */
      if(!RM){
        var at=document.createElement('div'); at.className='qc-atmos'; at.setAttribute('aria-hidden','true');
        at.innerHTML='<b class="qa1"></b><b class="qa2"></b><b class="qa3"></b>';
        body.insertBefore(at, body.firstChild);
      }

      /* 2) shared scroll-pause smoothness flag (other loops can read window.__qscroll) */
      var sT; addEventListener('scroll',function(){ window.__qscroll=true; clearTimeout(sT); sT=setTimeout(function(){ window.__qscroll=false; },150); },{passive:true});

      /* 3) cinematic media treatment — meaningful images & videos only */
      try{
        var media=document.querySelectorAll('img,video');
        for(var m=0;m<media.length;m++){ var el=media[m];
          if(el.closest('.qnav,#qx-panel,#qx-fab,nav,header')) continue;
          var cs=getComputedStyle(el); if(cs.position==='absolute'||cs.position==='fixed') continue;
          var w=Math.max(el.offsetWidth||0, el.naturalWidth||0), h=Math.max(el.offsetHeight||0, el.naturalHeight||0);
          if(el.tagName==='IMG' && (w<84 || h<64)) continue;   /* skip icons / logos / avatars */
          el.classList.add('qc-media');
        }
      }catch(e){}

      /* 4) scroll reveals — fade + rise + focus-in, staggered as they enter view */
      if(!RM && 'IntersectionObserver' in window){
        var sel='main > *, .sw > *, .wrap > *, .wrapper > *, .container > *, .content > *, .page > *, .app > *, .layout > *, section, article, figure, table, .card, .panel, .tile, .box, .widget, .metric, .stat, .kpi, h1, h2, img.qc-media, video.qc-media';
        var picked=[]; var nodes;
        try{ nodes=document.querySelectorAll(sel); }catch(e){ nodes=[]; }
        for(var i=0;i<nodes.length && picked.length<180;i++){ var node=nodes[i];
          if(picked.indexOf(node)>=0) continue;
          if(node.closest('.qnav,#qx-panel,#qx-fab,nav,header,.qc-atmos')) continue;
          var r=node.getBoundingClientRect();
          if(r.height<22 && node.tagName!=='IMG' && node.tagName!=='VIDEO') continue;
          picked.push(node);
        }
        /* drop nested nodes whose ancestor is also revealing (avoid double animation) */
        picked=picked.filter(function(el){ return !picked.some(function(o){ return o!==el && o.contains(el); }); });

        var io=new IntersectionObserver(function(entries){
          entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('qc-in'); io.unobserve(en.target); } });
        },{rootMargin:'0px 0px -6% 0px', threshold:0.03});

        picked.forEach(function(el){ el.classList.add('qc-reveal'); io.observe(el); });

        /* failsafe: never leave content hidden */
        setTimeout(revealAll, 2600);
        addEventListener('load', function(){ setTimeout(revealAll, 1200); });
      }
    }catch(e){
      /* absolute last resort: make sure nothing stays invisible */
      revealAll();
      try{ document.body.classList.remove('qc-on'); }catch(_){ }
    }
  });
})();
