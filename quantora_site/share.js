/* Quantora share.js - universal permalink + fork layer for engine pages.
   Captures a page's inputs into a single ?view= param (a forkable object),
   restores them on load and re-runs. Fully defensive: any failure is a silent no-op
   and never affects the host page. */
(function () {
  try {
    if (window.__qShare) return; window.__qShare = 1;
    var path = (location.pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
    // Pages with their own URL handling or where a "share this view" control doesn't fit.
    var deny = ['/', '/index.html', '/track.html', '/screener.html', '/compare.html',
      '/explore.html', '/library.html', '/embed.html', '/ask.html', '/engines.html',
      '/deck.html', '/pulse.html', '/terminal.html', '/platform.html', '/dashboard.html',
      '/watchlist.html', '/portfolio.html', '/alerts.html', '/map.html', '/heatmap.html',
      '/stream.html', '/live.html', '/news.html'];
    if (deny.indexOf(path) >= 0) return;

    function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

    function isField(e) {
      if (!e.id) return false;
      var t = (e.type || '').toLowerCase();
      if (['password', 'file', 'hidden', 'submit', 'button', 'checkbox', 'radio'].indexOf(t) >= 0) return false;
      try { if (e.closest('#qx-panel,#qai-panel,.qnav,#qshare')) return false; } catch (_) {}
      return true;
    }
    function fields() {
      try { return [].slice.call(document.querySelectorAll('input,select,textarea')).filter(isField); }
      catch (_) { return []; }
    }
    function encodeView() {
      var o = {};
      fields().forEach(function (e) { if (e.value != null && e.value !== '') o[e.id] = e.value; });
      return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(o)))));
    }
    function decodeView(s) {
      return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(s)))));
    }

    ready(function () {
      try {
        if (!fields().length) return; // nothing to share on this page

        // 1) restore a shared view, if present
        var m = location.search.match(/[?&]view=([^&]+)/);
        if (m) {
          try {
            var obj = decodeView(m[1]);
            var byId = {}; fields().forEach(function (e) { byId[e.id] = e; });
            Object.keys(obj).forEach(function (k) {
              var e = byId[k]; if (!e) return;
              try {
                e.value = obj[k];
                e.dispatchEvent(new Event('input', { bubbles: true }));
                e.dispatchEvent(new Event('change', { bubbles: true }));
              } catch (_) {}
            });
            // fire an explicit run/compute if the page has one
            setTimeout(function () {
              try {
                var btns = [].slice.call(document.querySelectorAll('button,a.btn,[role=button]'));
                var run = btns.filter(function (b) {
                  var s = ((b.id || '') + ' ' + (b.textContent || '')).toLowerCase();
                  if (/reset|clear|cancel|share|copy|save|export|download|print/.test(s)) return false;
                  return /\b(run|calc|calculate|comput|analy|analyse|update|build|go|plot|render|generate)\b/.test(s);
                })[0];
                if (run) run.click();
              } catch (_) {}
            }, 80);
          } catch (_) {}
        }

        // 2) inject the Share button
        var css = '#qshare{position:fixed;left:16px;bottom:16px;z-index:99997;background:#fff;color:#14161c;'
          + 'border:1px solid rgba(17,24,39,.16);border-radius:999px;padding:9px 15px;'
          + 'font:600 13px Geist,system-ui,-apple-system,sans-serif;box-shadow:0 4px 16px rgba(16,24,40,.12);'
          + 'cursor:pointer;user-select:none}#qshare:hover{border-color:#2f6bff;color:#2f6bff}'
          + '@media(max-width:640px){#qshare{left:10px;bottom:10px;padding:8px 12px;font-size:12px}}';
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
        var b = document.createElement('button'); b.id = 'qshare'; b.type = 'button';
        b.textContent = '↗ Share this view';
        b.title = 'Copy a permalink that reproduces this exact view - anyone can open it and fork it.';
        b.addEventListener('click', function () {
          try {
            var url = location.origin + location.pathname + '?view=' + encodeView();
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url).then(function () {
                b.textContent = '✓ Link copied';
                setTimeout(function () { b.textContent = '↗ Share this view'; }, 1800);
              }, function () { window.prompt('Copy this link:', url); });
            } else { window.prompt('Copy this link:', url); }
          } catch (_) {}
        });
        document.body.appendChild(b);
      } catch (_) {}
    });
  } catch (_) {}
})();
