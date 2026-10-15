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
  var por = document.querySelector('[data-portrait]');
  if (por && C.portrait) { por.innerHTML = '<img src="' + C.portrait + '" alt="' + C.person + '" width="300" height="360">'; }

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
