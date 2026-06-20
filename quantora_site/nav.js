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

  var NAV = [
    { label: 'Pulse', href: '/pulse.html' },
    { label: 'Brief', href: '/brief.html' },
    { label: 'Markets', items: [['Markets tape', '/markets.html'], ['Live stream', '/live.html'], ['Coins', '/coins.html'], ['Stocks', '/stocks.html'], ['Global FX & Commodities', '/global.html'], ['Chart', '/chart.html'], ['Heatmap', '/heatmap.html'], ['Screener', '/screener.html']] },
    { label: 'On-Chain', items: [['DeFi', '/defi.html'], ['Bitcoin Chain', '/chain.html'], ['DEX', '/dex.html'], ['Signals', '/signals.html']] },
    { label: 'Research', items: [['News', '/news.html'], ['Macro', '/macro.html'], ['Calendar', '/calendar.html'], ['Fundamentals', '/fundamentals.html'], ['AI Analyst', '/analyst.html'], ['Ask Quantora', '/ask.html']] },
    { label: 'Desk', items: [['Portfolio', '/portfolio.html'], ['Watchlist', '/watchlist.html'], ['Alerts', '/alerts.html'], ['Risk Center', '/risk.html']] },
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
