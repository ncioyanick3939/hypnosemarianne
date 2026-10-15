(function(){
  var C = CONFIG;
  document.querySelectorAll('[data-c]').forEach(function(el){
    var k = el.getAttribute('data-c');
    if (k === 'year') el.textContent = new Date().getFullYear();
    else if (C[k] != null) el.textContent = C[k];
  });
  document.querySelectorAll('[data-phone]').forEach(function(a){ a.textContent = C.phone; a.href = 'tel:' + C.phone.replace(/[^\d+]/g, '').replace(/^0/, '+41'); });
  document.querySelectorAll('[data-email]').forEach(function(a){ a.textContent = C.email; a.href = 'mailto:' + C.email; });
  document.querySelectorAll('[data-opt]').forEach(function(el){ var v = C[el.getAttribute('data-opt')]; if (v) el.textContent = v; });
  if (C.bookingUrl) {
    var live = document.getElementById('booking-live'), soon = document.getElementById('booking-soon');
    if (live && soon) {
      document.getElementById('booking-frame').src = C.bookingUrl;
      document.getElementById('booking-link').href = C.bookingUrl;
      live.classList.remove('hide'); soon.classList.add('hide');
    }
  }
  var od = document.getElementById('onedoc-link'); if (od && C.onedocUrl) { od.href = C.onedocUrl; od.textContent = 'Bei OneDoc buchen'; od.removeAttribute('aria-disabled'); }
  document.querySelectorAll('[data-login]').forEach(function(a){ if (C.loginUrl) { a.href = C.loginUrl; a.hidden = false; } });
  var por = document.querySelector('[data-portrait]');
  if (por && C.portrait) { por.innerHTML = '<img src="' + C.portrait + '" alt="' + C.person + '" width="261" height="333">'; }

  // ---- Terminkalender (Wunschtermin) ----
  var grid = document.getElementById('cal-grid');
  if (grid && C.hours) {
    var MN = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var WD = ['Mo','Di','Mi','Do','Fr','Sa','So'], WDL = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var first = new Date(today.getTime() + (C.leadDays || 0) * 864e5), last = new Date(today.getTime() + (C.bookingWeeks || 12) * 7 * 864e5);
    var view = new Date(first.getFullYear(), first.getMonth(), 1), sel = null;
    var slotBox = document.getElementById('cal-slots'), slotIn = document.getElementById('slot');
    function p2(n){ return (n < 10 ? '0' : '') + n; }
    function draw(){
      document.getElementById('cal-title').textContent = MN[view.getMonth()] + ' ' + view.getFullYear();
      document.getElementById('cal-prev').disabled = view <= new Date(first.getFullYear(), first.getMonth(), 1);
      document.getElementById('cal-next').disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > last;
      var h = WD.map(function(d){ return '<span class="cal-wd">' + d + '</span>'; }).join('');
      var off = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
      for (var i = 0; i < off; i++) h += '<span></span>';
      var n = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= n; d++) {
        var dt = new Date(view.getFullYear(), view.getMonth(), d), ok = C.hours[dt.getDay()] && dt >= first && dt <= last;
        var key = dt.getFullYear() + '-' + p2(dt.getMonth() + 1) + '-' + p2(d);
        h += ok ? '<button type="button" class="cal-day on' + (sel === key ? ' sel' : '') + '" data-d="' + key + '" aria-label="' + WDL[dt.getDay()] + ', ' + d + '. ' + MN[dt.getMonth()] + '">' + d + '</button>' : '<span class="cal-day off">' + d + '</span>';
      }
      grid.innerHTML = h;
    }
    grid.addEventListener('click', function(e){
      var bt = e.target.closest('.cal-day.on'); if (!bt) return;
      sel = bt.getAttribute('data-d'); var p = sel.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]);
      draw();
      slotBox.innerHTML = '<p><strong>' + WDL[dt.getDay()] + ', ' + (+p[2]) + '. ' + MN[dt.getMonth()] + '</strong></p><div class="slot-list">' +
        C.hours[dt.getDay()].map(function(t){ return '<button type="button" class="slot" data-t="' + t + '">' + t + ' Uhr</button>'; }).join('') + '</div>';
      slotIn.value = '';
    });
    slotBox.addEventListener('click', function(e){
      var s = e.target.closest('.slot'); if (!s) return;
      slotBox.querySelectorAll('.slot').forEach(function(x){ x.classList.remove('sel'); }); s.classList.add('sel');
      var p = sel.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]);
      slotIn.value = WDL[dt.getDay()] + ', ' + p2(+p[2]) + '.' + p2(+p[1]) + '.' + p[0] + ', ' + s.getAttribute('data-t') + ' Uhr' + (C.sessionDuration ? ' (' + C.sessionDuration + ')' : '');
    });
    document.getElementById('cal-prev').addEventListener('click', function(){ view = new Date(view.getFullYear(), view.getMonth() - 1, 1); draw(); });
    document.getElementById('cal-next').addEventListener('click', function(){ view = new Date(view.getFullYear(), view.getMonth() + 1, 1); draw(); });
    draw();
  }

  var b = document.body, open = document.querySelector('.menu-btn'), nav = document.getElementById('menue');
  function setMenu(v){ b.classList.toggle('menu-open', v); open.setAttribute('aria-expanded', v ? 'true' : 'false'); }
  open.addEventListener('click', function(){ setMenu(true); });
  nav.querySelector('.menu-close').addEventListener('click', function(){ setMenu(false); open.focus(); });
  nav.addEventListener('click', function(e){ if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') setMenu(false); });

  document.querySelectorAll('form[data-form]').forEach(function(f){
    var t = f.querySelector('.status'), btn = f.querySelector('button[type=submit]');
    function say(msg, bad){ t.hidden = false; t.textContent = msg; t.classList.toggle('bad', !!bad); }
    f.addEventListener('submit', function(e){
      e.preventDefault();
      if (!C.formAction) { say('Testmodus: Es wird noch nichts versendet. Die Formular-Adresse fehlt in config.js.'); return; }
      var fd = new FormData(f);
      fd.append('_subject', f.getAttribute('data-subject'));
      fd.append('_captcha', 'false');
      btn.disabled = true; say('Wird gesendet …');
      fetch(C.formAction, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
        .then(function(r){ if (!r.ok) throw new Error(r.status); f.reset(); say(f.getAttribute('data-thanks')); })
        .catch(function(){ say('Das Senden hat nicht geklappt. Bitte versuchen Sie es nochmal oder rufen Sie an.', true); })
        .then(function(){ btn.disabled = false; });
    });
  });
})();
