/* Quantora compliance layer v1 - site-wide disclaimer + privacy/cookie consent. Defensive: never blocks or breaks a page. */
(function(){
  if(window.__qCompliance)return; window.__qCompliance=true;
  try{
    var GPC = !!(navigator && navigator.globalPrivacyControl===true);
    var KEY='q_consent_v1';
    function getC(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
    function setC(v){ try{ localStorage.setItem(KEY,v); }catch(e){} }
    window.__qConsent = { marketing:false, gpc:GPC };
    var stored = getC();
    if(GPC && !stored){ setC('gpc-optout'); stored='gpc-optout'; }
    if(stored==='accept'){ window.__qConsent.marketing=true; }

    function addDisclaimer(){
      if(document.getElementById('q-disc'))return;
      var d=document.createElement('div'); d.id='q-disc';
      d.setAttribute('style','max-width:1080px;margin:10px auto 30px;padding:14px 20px 0;border-top:1px solid rgba(17,24,39,.08);color:#9aa1ad;font:400 11.5px/1.65 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:left');
      d.innerHTML='Quantora is provided for informational and educational purposes only. Nothing here is investment, legal, tax, or financial advice, a recommendation, or an offer or solicitation to buy or sell any security or asset. Quantora is not a registered investment adviser or broker-dealer and does not provide personalized advice. Market data comes from third parties, may be delayed or inaccurate, and should be independently verified. AI-generated content can be wrong. Do your own research. &nbsp;<a href="/privacy.html" style="color:#6b7280;text-decoration:underline">Privacy &amp; your choices</a>';
      (document.body||document.documentElement).appendChild(d);
    }

    function addBanner(){
      if(stored)return;
      if(document.getElementById('q-consent'))return;
      var b=document.createElement('div'); b.id='q-consent';
      b.setAttribute('style','position:fixed;left:14px;right:14px;bottom:14px;z-index:100000;max-width:560px;margin:0 auto;background:#0b1220;color:#e6e9ef;border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:16px 18px;font:400 13px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif');
      b.innerHTML='<div style="font-weight:600;margin-bottom:4px">Your privacy</div><div style="color:#aeb6c4">Quantora needs no account. We use essential cookies to run the site; optional analytics cookies help us improve it. Decline and we will not set or share optional cookies. <a href="/privacy.html" style="color:#8ab4ff">Learn more</a>.</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button id="q-cd" type="button" style="flex:1;min-width:120px;background:transparent;color:#e6e9ef;border:1px solid rgba(255,255,255,.22);border-radius:9px;padding:9px 12px;font-weight:600;cursor:pointer">Decline optional</button><button id="q-ca" type="button" style="flex:1;min-width:120px;background:#2f6bff;color:#fff;border:0;border-radius:9px;padding:9px 12px;font-weight:600;cursor:pointer">Accept all</button></div>';
      (document.body||document.documentElement).appendChild(b);
      function close(v){ setC(v); if(v==='accept')window.__qConsent.marketing=true; var el=document.getElementById('q-consent'); if(el&&el.parentNode)el.parentNode.removeChild(el); }
      var a=document.getElementById('q-ca'), c=document.getElementById('q-cd');
      if(a)a.addEventListener('click',function(){ close('accept'); });
      if(c)c.addEventListener('click',function(){ close('decline'); });
    }

    function run(){ try{ addDisclaimer(); addBanner(); }catch(e){} }
    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',run); } else { run(); }
  }catch(e){}
})();
