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
  document.querySelectorAll('[data-login]').forEach(function(a){ if (C.loginUrl) { a.href = C.loginUrl; a.hidden = false; } });
  var por = document.querySelector('[data-portrait]');
  if (por && C.portrait) { por.innerHTML = '<img src="' + C.portrait + '" alt="' + C.person + '" width="261" height="333">'; }

  // ---- Angebote: Dauer, Preis, Auswahl ----
  var svcList = C.services || [];
  function fmtPrice(p){ return Number(p) === 0 ? 'kostenlos' : 'CHF ' + (Number(p) % 1 ? Number(p).toFixed(2) : Number(p) + '.-'); }
  function fillServices(list){
    svcList = list || svcList;
    document.querySelectorAll('[data-svc]').forEach(function(el){
      var s = svcList.filter(function(x){ return x.id === el.getAttribute('data-svc'); })[0]; if (!s) return;
      el.textContent = el.getAttribute('data-f') === 'minutes' ? s.minutes + ' Min.' : fmtPrice(s.price);
    });
    var sel = document.getElementById('svc');
    if (sel && svcList.length) {
      var cur = sel.value || (location.search.match(/angebot=([a-z]+)/) || [])[1];
      sel.innerHTML = svcList.map(function(s){ return '<option value="' + s.id + '">' + s.name + ' (' + s.minutes + ' Min., ' + fmtPrice(s.price) + ')</option>'; }).join('');
      if (cur) sel.value = cur;
    }
  }
  fillServices();

  // ---- Terminkalender (Wunschtermin) ----
  var grid = document.getElementById('cal-grid');
  var sbc = (C.supabaseUrl && C.supabaseAnonKey && window.supabase) ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey) : null;
  var TZ = 'Europe/Zurich';
  function zdate(y, m, d, hh, mm) {
    var guess = Date.UTC(y, m - 1, d, hh, mm);
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    function off(ts) { var o = {}; f.formatToParts(new Date(ts)).forEach(function (p) { o[p.type] = +p.value; }); return Date.UTC(o.year, o.month - 1, o.day, o.hour % 24, o.minute) - ts; }
    var t = guess - off(guess); return new Date(guess - off(t));
  }
  if (grid && C.hours) {
    var MN = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var WD = ['Mo','Di','Mi','Do','Fr','Sa','So'], WDL = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    var hoursCfg = C.hours, leadDays = C.leadDays || 0, weeksCfg = C.bookingWeeks || 12, taken = {};
    var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var first, last, view, sel = null;
    var slotBox = document.getElementById('cal-slots'), slotIn = document.getElementById('slot'), slotIso = null;
    function p2(n){ return (n < 10 ? '0' : '') + n; }
    function setRange(){ first = new Date(today.getTime() + leadDays * 864e5); last = new Date(today.getTime() + weeksCfg * 7 * 864e5); if (!view) view = new Date(first.getFullYear(), first.getMonth(), 1); }
    function draw(){
      document.getElementById('cal-title').textContent = MN[view.getMonth()] + ' ' + view.getFullYear();
      document.getElementById('cal-prev').disabled = view <= new Date(first.getFullYear(), first.getMonth(), 1);
      document.getElementById('cal-next').disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > last;
      var h = WD.map(function(d){ return '<span class="cal-wd">' + d + '</span>'; }).join('');
      var off = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
      for (var i = 0; i < off; i++) h += '<span></span>';
      var n = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= n; d++) {
        var dt = new Date(view.getFullYear(), view.getMonth(), d), ok = hoursCfg[dt.getDay()] && dt >= first && dt <= last;
        var key = dt.getFullYear() + '-' + p2(dt.getMonth() + 1) + '-' + p2(d);
        if (ok && !freeTimes(key).length) ok = false;
        h += ok ? '<button type="button" class="cal-day on' + (sel === key ? ' sel' : '') + '" data-d="' + key + '" aria-label="' + WDL[dt.getDay()] + ', ' + d + '. ' + MN[dt.getMonth()] + '">' + d + '</button>' : '<span class="cal-day off">' + d + '</span>';
      }
      grid.innerHTML = h;
    }
    function freeTimes(key){
      var p = key.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]);
      return (hoursCfg[dt.getDay()] || []).filter(function (t) {
        var tt = t.split(':'), when = zdate(+p[0], +p[1], +p[2], +tt[0], +tt[1]);
        return !taken[when.toISOString()] && when >= new Date(Date.now() + leadDays * 864e5);
      });
    }
    function showSlots(){
      if (!sel) return;
      var p = sel.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]), times = freeTimes(sel);
      slotBox.innerHTML = '<p><strong>' + WDL[dt.getDay()] + ', ' + (+p[2]) + '. ' + MN[dt.getMonth()] + '</strong></p><div class="slot-list">' +
        (times.map(function(t){ return '<button type="button" class="slot" data-t="' + t + '">' + t + ' Uhr</button>'; }).join('') || '<span class="hint">An diesem Tag ist nichts mehr frei.</span>') + '</div>';
    }
    grid.addEventListener('click', function(e){
      var bt = e.target.closest('.cal-day.on'); if (!bt) return;
      sel = bt.getAttribute('data-d'); draw(); showSlots(); slotIn.value = ''; slotIso = null;
    });
    slotBox.addEventListener('click', function(e){
      var s = e.target.closest('.slot'); if (!s) return;
      slotBox.querySelectorAll('.slot').forEach(function(x){ x.classList.remove('sel'); }); s.classList.add('sel');
      var p = sel.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]), tt = s.getAttribute('data-t').split(':');
      slotIso = zdate(+p[0], +p[1], +p[2], +tt[0], +tt[1]).toISOString();
      slotIn.value = WDL[dt.getDay()] + ', ' + p2(+p[2]) + '.' + p2(+p[1]) + '.' + p[0] + ', ' + s.getAttribute('data-t') + ' Uhr';
    });
    document.getElementById('cal-prev').addEventListener('click', function(){ view = new Date(view.getFullYear(), view.getMonth() - 1, 1); draw(); });
    document.getElementById('cal-next').addEventListener('click', function(){ view = new Date(view.getFullYear(), view.getMonth() + 1, 1); draw(); });
    setRange(); draw();

    // Live-Modus: Sprechzeiten und vergebene Termine aus der Datenbank
    function loadTaken(){
      return sbc.rpc('taken_slots', { from_ts: new Date().toISOString(), to_ts: new Date(Date.now() + (weeksCfg + 1) * 7 * 864e5).toISOString() }).then(function(r){
        taken = {}; (r.data || []).forEach(function(t){ taken[new Date(t).toISOString()] = 1; }); draw(); showSlots();
      });
    }
    if (sbc) {
      sbc.rpc('public_config').then(function(r){
        if (r.data) { if (r.data.services) fillServices(r.data.services); hoursCfg = r.data.hours || hoursCfg; leadDays = r.data.lead_days; weeksCfg = r.data.weeks; view = null; setRange(); }
        return loadTaken();
      }).then(function(){
        var n = document.getElementById('cal-note');
        if (n) n.textContent = 'Es werden nur freie Zeiten angezeigt. Ihr Wunschtermin ist erst fix, wenn Marianne Kaeser ihn bestätigt.';
      });
      var bf = document.querySelector('form[data-booking]');
      if (bf) bf.addEventListener('submit', function(e){
        e.preventDefault();
        var st = bf.querySelector('.status'), btn = bf.querySelector('button[type=submit]');
        function say(m, bad){ st.hidden = false; st.textContent = m; st.classList.toggle('bad', !!bad); }
        if (!slotIso) { say('Bitte wählen Sie zuerst einen Termin im Kalender.', true); return; }
        btn.disabled = true; say('Wird gesendet …');
        sbc.rpc('book_slot', { p_start: slotIso, p_name: bf.elements.name.value, p_email: bf.elements.email.value, p_phone: bf.elements.telefon.value, p_topic: bf.elements.thema.value, p_service: bf.elements.angebot.value }).then(function(r){
          var d = r.data || {};
          if (!r.error && d.ok) { bf.reset(); slotIn.value = ''; slotIso = null; say(bf.getAttribute('data-thanks')); return loadTaken(); }
          var msg = { taken: 'Diese Zeit wurde gerade vergeben. Bitte wählen Sie eine andere.', closed: 'Diese Zeit ist nicht buchbar.', range: 'Dieser Tag ist nicht mehr buchbar.', email: 'Bitte prüfen Sie Ihre E-Mail-Adresse.', name: 'Bitte geben Sie Ihren Namen an.' }[d.error] || 'Das Senden hat nicht geklappt. Bitte versuchen Sie es nochmal oder rufen Sie an.';
          say(msg, true); if (d.error === 'taken') return loadTaken();
        }).then(function(){ btn.disabled = false; });
      });
    }
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
      if (f.hasAttribute('data-booking') && C.supabaseUrl && window.supabase) return;
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
