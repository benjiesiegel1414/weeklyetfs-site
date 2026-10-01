/* WeeklyETFs.com x TopDividendETFsPRO house ads
   - Fills every <div class="wx-pro-ad"></div> slot with the in-content PRO banner
   - Adds one banner above the footer on pages that have no slot
   - Adds the sticky PRO bar at the bottom of every page (closable, remembered per visit) */
(function () {
  if (window.__wxProAds) return; window.__wxProAds = true;
  var BASE = 'https://topdividendetfspro.com/';
  var url = function (place) { return BASE + '?utm_source=weeklyetfs&utm_medium=' + place + '&utm_campaign=pro_house_ad'; };
  var track = function (place) { try { if (typeof gtag === 'function') gtag('event', 'pro_ad_click', { placement: place, page_path: location.pathname }); } catch (e) {} };

  var css = [
    '.wxp,.wxp *{box-sizing:border-box}',
    '.wxp-slot{width:100%;max-width:760px;margin:22px auto;padding:0 12px;text-align:center;font-family:Lato,"Segoe UI",Roboto,Arial,sans-serif}',
    '.wxp-card{position:relative;display:flex;align-items:center;gap:18px;text-align:left;text-decoration:none!important;color:#fff!important;',
    ' background:radial-gradient(120% 140% at 100% 0%,rgba(231,76,60,.32) 0%,rgba(231,76,60,0) 55%),linear-gradient(135deg,#001f3d 0%,#062c52 60%,#0a3a6b 100%);',
    ' border-radius:14px;padding:18px 20px;overflow:hidden;box-shadow:0 6px 22px rgba(0,31,61,.28);border:1px solid rgba(255,255,255,.08);transition:transform .18s ease,box-shadow .18s ease}',
    '.wxp-card:before{content:"";position:absolute;left:0;top:0;right:0;height:4px;background:linear-gradient(90deg,#e74c3c,#ff8a5c,#2ecc71)}',
    '.wxp-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,31,61,.38)}',
    '.wxp-card:focus-visible{outline:3px solid #e74c3c;outline-offset:3px}',
    '.wxp-badge{flex:none;width:62px;height:62px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;',
    ' background:linear-gradient(145deg,#e74c3c,#b8322a);box-shadow:0 0 0 3px rgba(255,255,255,.08),0 6px 18px rgba(231,76,60,.45);font-weight:900;line-height:1}',
    '.wxp-badge b{font-size:19px;letter-spacing:.5px}.wxp-badge i{font-style:normal;font-size:9px;letter-spacing:1.2px;opacity:.85;margin-top:4px}',
    '.wxp-body{flex:1;min-width:0;position:relative;z-index:1}',
    '.wxp-eyebrow{font-size:12px;font-weight:900;letter-spacing:.06em;color:#ff9b8f;text-transform:uppercase;margin:0 0 3px}',
    '.wxp-head{font-size:21px;font-weight:900;line-height:1.18;margin:0;color:#fff;letter-spacing:-.2px}',
    '.wxp-head em{font-style:normal;color:#2ecc71}',
    '.wxp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}',
    '.wxp-chips span{font-size:11.5px;font-weight:700;color:#d6e4f2;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:3px 9px;white-space:nowrap}',
    '.wxp-side{flex:none;display:flex;flex-direction:column;align-items:center;gap:7px;position:relative;z-index:1}',
    '.wxp-spark{width:118px;height:34px;display:block}',
    '.wxp-cta{display:inline-flex;align-items:center;gap:6px;background:#2ecc71;color:#00243f;font-weight:900;font-size:15px;padding:11px 18px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 14px rgba(46,204,113,.38);transition:transform .15s ease}',
    '.wxp-card:hover .wxp-cta{transform:scale(1.05)}',
    '.wxp-label{display:block;margin-top:6px;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#7a8a99}',
    '@media(max-width:640px){.wxp-card{flex-wrap:wrap;gap:12px;padding:16px}.wxp-badge{width:50px;height:50px;border-radius:12px}.wxp-badge b{font-size:16px}',
    ' .wxp-body{flex:1 1 calc(100% - 64px)}.wxp-head{font-size:18px}.wxp-side{flex:1 1 100%;flex-direction:row;justify-content:space-between}.wxp-spark{width:96px}.wxp-cta{font-size:14px;padding:10px 16px}}',
    /* sticky */
    '#wxpSticky{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;font-family:Lato,"Segoe UI",Roboto,Arial,sans-serif;',
    ' background:linear-gradient(90deg,#001f3d 0%,#05325e 70%,#0a3a6b 100%);border-top:3px solid #e74c3c;box-shadow:0 -6px 22px rgba(0,0,0,.28);',
    ' padding:9px 0;padding-bottom:calc(9px + env(safe-area-inset-bottom,0px));transform:translateY(120%);transition:transform .32s cubic-bezier(.2,.7,.3,1)}',
    '#wxpSticky.on{transform:translateY(0)}',
    '.wxps-in{max-width:1100px;margin:0 auto;padding:0 52px 0 16px;display:flex;align-items:center;justify-content:center;gap:14px}',
    '.wxps-link{display:flex;align-items:center;gap:14px;text-decoration:none!important;color:#fff!important;min-width:0}',
    '.wxps-badge{flex:none;background:#e74c3c;color:#fff;font-weight:900;font-size:13px;letter-spacing:.6px;border-radius:7px;padding:6px 9px;box-shadow:0 3px 10px rgba(231,76,60,.45)}',
    '.wxps-txt{min-width:0;line-height:1.25}',
    '.wxps-txt b{display:block;font-size:16px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.wxps-txt b em{font-style:normal;color:#2ecc71}',
    '.wxps-s{display:none}',
    '.wxps-txt small{display:block;font-size:12.5px;color:#b9cde0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.wxps-cta{flex:none;background:#2ecc71;color:#00243f;font-weight:900;font-size:14px;padding:9px 16px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 12px rgba(46,204,113,.35);transition:transform .15s ease}',
    '.wxps-link:hover .wxps-cta{transform:scale(1.05)}',
    '.wxps-x{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.3);',
    ' background:rgba(255,255,255,.1);color:rgba(255,255,255,.85);font-size:17px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
    '.wxps-x:hover{background:#e74c3c;border-color:#e74c3c;color:#fff}',
    '@media(max-width:700px){.wxps-in{padding:0 44px 0 10px;gap:10px;justify-content:flex-start}.wxps-link{gap:10px;flex:1}.wxps-txt{flex:1}.wxps-txt b{font-size:14px}.wxps-txt small{display:none}.wxps-l{display:none}.wxps-s{display:inline}',
    ' .wxps-badge{font-size:11px;padding:5px 7px}.wxps-cta{font-size:13px;padding:8px 13px}.wxps-x{right:8px;width:26px;height:26px}}',
    '@media(prefers-reduced-motion:reduce){#wxpSticky,.wxp-card,.wxp-cta,.wxps-cta{transition:none}}',
    '@media print{#wxpSticky,.wxp-slot{display:none!important}}'
  ].join('\n');
  var st = document.createElement('style'); st.id = 'wxp-css'; st.textContent = css; document.head.appendChild(st);

  var HEADS = [
    'Find the <em>best dividend ETFs</em> in seconds',
    'Every top dividend ETF <em>rated, filtered &amp; compared</em>',
    'See whose <em>yields &amp; total returns</em> are moving',
    'Stop guessing. <em>Screen dividend ETFs</em> like a PRO'
  ];
  var head = HEADS[Math.floor(Math.random() * HEADS.length)];
  var spark = '<svg class="wxp-spark" viewBox="0 0 118 34" aria-hidden="true"><defs><linearGradient id="wxpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2ecc71" stop-opacity=".45"/><stop offset="1" stop-color="#2ecc71" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="M2 28 L18 24 L30 26 L44 18 L58 20 L72 12 L86 14 L100 7 L116 3 L116 34 L2 34Z" fill="url(#wxpg)"/>' +
    '<path d="M2 28 L18 24 L30 26 L44 18 L58 20 L72 12 L86 14 L100 7 L116 3" fill="none" stroke="#2ecc71" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="116" cy="3" r="2.8" fill="#fff"/></svg>';

  function card(place) {
    return '<a class="wxp wxp-card" href="' + url(place) + '" target="_blank" rel="noopener" data-place="' + place + '" aria-label="TopDividendETFsPRO: the PRO dividend ETF terminal">' +
      '<span class="wxp-badge"><b>PRO</b><i>TERMINAL</i></span>' +
      '<span class="wxp-body"><span class="wxp-eyebrow" style="display:block">TopDividendETFsPRO.com</span>' +
      '<span class="wxp-head" style="display:block">' + head + '</span>' +
      '<span class="wxp-chips"><span>🔍 Advanced filters</span><span>⭐ Ratings</span><span>🧾 Tax grades</span><span>📈 Return movers</span></span></span>' +
      '<span class="wxp-side">' + spark + '<span class="wxp-cta">Unlock PRO →</span></span></a>' +
      '<small class="wxp-label">From our network</small>';
  }

  function fill() {
    var slots = document.querySelectorAll('.wx-pro-ad');
    if (!slots.length && !document.querySelector('.pro-btn')) {
      var s = document.createElement('div'); s.className = 'wx-pro-ad';
      var foot = document.querySelector('footer');
      if (foot && foot.parentNode) foot.parentNode.insertBefore(s, foot); else document.body.appendChild(s);
      slots = [s];
    }
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i]; if (el.getAttribute('data-filled')) continue;
      var place = 'banner_' + (i + 1);
      el.classList.add('wxp-slot'); el.setAttribute('data-filled', '1'); el.innerHTML = card(place);
    }
  }

  function sticky() {
    var off = false; try { off = sessionStorage.getItem('wxpStickyOff') === '1'; } catch (e) {}
    if (off || document.getElementById('wxpSticky')) return;
    var bar = document.createElement('div'); bar.id = 'wxpSticky'; bar.setAttribute('role', 'complementary'); bar.setAttribute('aria-label', 'TopDividendETFsPRO');
    bar.innerHTML = '<div class="wxps-in"><a class="wxps-link" href="' + url('sticky') + '" target="_blank" rel="noopener" data-place="sticky">' +
      '<span class="wxps-badge">PRO</span><span class="wxps-txt"><b><span class="wxps-l">Screen dividend ETFs like a </span><span class="wxps-s">Dividend ETFs, </span><em>PRO</em><span class="wxps-s"> tools</span></b>' +
      '<small>Ratings, tax grades, advanced filters and yield &amp; total return movers at TopDividendETFsPRO.com</small></span>' +
      '<span class="wxps-cta">Try PRO →</span></a>' +
      '<button class="wxps-x" type="button" aria-label="Close">&times;</button></div>';
    document.body.appendChild(bar);
    var pad = parseFloat(getComputedStyle(document.body).paddingBottom) || 0, shown = false;
    function show() {
      if (shown) return; shown = true; bar.classList.add('on');
      document.body.style.paddingBottom = (pad + bar.offsetHeight) + 'px';
    }
    function maybe() { if (window.scrollY > 220) { show(); window.removeEventListener('scroll', maybe); } }
    window.addEventListener('scroll', maybe, { passive: true });
    setTimeout(show, 4000);
    bar.querySelector('.wxps-x').addEventListener('click', function () {
      bar.classList.remove('on'); document.body.style.paddingBottom = pad ? pad + 'px' : '';
      try { sessionStorage.setItem('wxpStickyOff', '1'); } catch (e) {}
      setTimeout(function () { bar.remove(); }, 400);
    });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-place]');
    if (a && (a.classList.contains('wxp-card') || a.classList.contains('wxps-link'))) track(a.getAttribute('data-place'));
  });

  function go() { fill(); sticky(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
