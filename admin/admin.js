(function () {
  'use strict';
  var C = window.CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var TZ = 'Europe/Zurich';
  var fDate = function (d) { return new Date(d).toLocaleDateString('de-CH', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }); };
  var fTime = function (d) { return new Date(d).toLocaleTimeString('de-CH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }); };
  var fDay = function (d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; };
  var money = function (n) { return Number(n || 0).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/’/g, "'"); };
  var STAT = { angefragt: 'Angefragt', bestaetigt: 'Bestätigt', abgesagt: 'Abgesagt', erledigt: 'Erledigt', offen: 'Offen', bezahlt: 'Bezahlt', storniert: 'Storniert' };

  if (!C.supabaseUrl || !C.supabaseAnonKey) { $('#setup').hidden = false; return; }
  var sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  var S = { settings: null, customers: [], appts: [], invoices: [] };

  function toast(msg, bad) { var t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = ''; }, 3500); }
  function fail(e) { console.error(e); toast('Fehler: ' + (e && e.message ? e.message : e), true); }
  function must(r) { if (r.error) throw r.error; return r.data; }

  // ---------- Daten ----------
  function loadAll() {
    return Promise.all([
      sb.from('settings').select('*').eq('id', 1).single(),
      sb.from('customers').select('*').order('last_name', { ascending: true }),
      sb.from('appointments').select('*').order('starts_at', { ascending: true }),
      sb.from('invoices').select('*').order('number', { ascending: false })
    ]).then(function (r) {
      S.settings = must(r[0]); S.customers = must(r[1]) || []; S.appts = must(r[2]) || []; S.invoices = must(r[3]) || [];
    });
  }
  function svcs() { return (S.settings && S.settings.services) || []; }
  function svc(id) { return svcs().filter(function (s) { return s.id === id; })[0]; }
  function svcName(id) { var s = svc(id); return s ? s.name : ''; }
  function cust(id) { return S.customers.filter(function (c) { return c.id === id; })[0]; }
  function cName(c) { return c ? (c.first_name + ' ' + c.last_name).trim() || '(ohne Namen)' : ''; }
  function apName(a) { return a.customer_id ? cName(cust(a.customer_id)) : a.guest_name; }
  function apMail(a) { var c = a.customer_id && cust(a.customer_id); return (c && c.email) || a.guest_email; }
  function apPhone(a) { var c = a.customer_id && cust(a.customer_id); return (c && c.phone) || a.guest_phone; }

  // ---------- Login ----------
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; }
  function start() {
    $('#login').hidden = true; $('#app').hidden = false; $('#view').innerHTML = '<p>Lade …</p>';
    loadAll().then(route).catch(function (e) { fail(e); $('#view').innerHTML = '<div class="card"><h2>Kein Zugriff</h2><p>Die Daten konnten nicht geladen werden. Ist die Datenbank eingerichtet und diese E-Mail die Inhaberin? (' + esc(e.message) + ')</p></div>'; });
  }
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault(); var st = $('#l-status'); st.textContent = '';
    sb.auth.signInWithPassword({ email: $('#l-mail').value.trim(), password: $('#l-pw').value }).then(function (r) {
      if (r.error) { st.textContent = 'Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.'; return; }
      $('#l-pw').value = ''; start();
    });
  });
  $('#l-forgot').addEventListener('click', function (e) {
    e.preventDefault(); var st = $('#l-status'), mail = $('#l-mail').value.trim();
    if (!mail) { st.textContent = 'Bitte oben die E-Mail eintragen, dann nochmals klicken.'; return; }
    sb.auth.resetPasswordForEmail(mail, { redirectTo: location.origin + location.pathname }).then(function (r) {
      st.style.color = r.error ? '' : '#1f4a2b';
      st.textContent = r.error ? 'Das hat nicht geklappt: ' + r.error.message : 'Falls die Adresse bekannt ist, kommt gleich eine E-Mail mit einem Link.';
    });
  });
  function showNewPw() {
    $('#login').hidden = true; $('#app').hidden = true; $('#newpw').hidden = false;
  }
  $('#newpw-form').addEventListener('submit', function (e) {
    e.preventDefault(); var st = $('#np-status'), p1 = $('#np-1').value;
    if (p1.length < 10) { st.textContent = 'Bitte mindestens 10 Zeichen verwenden.'; return; }
    if (p1 !== $('#np-2').value) { st.textContent = 'Die beiden Passwörter sind nicht gleich.'; return; }
    sb.auth.updateUser({ password: p1 }).then(function (r) {
      if (r.error) { st.textContent = r.error.message; return; }
      $('#newpw').hidden = true; history.replaceState(null, '', location.pathname); start(); toast('Neues Passwort gespeichert.');
    });
  });
  if (sb.auth.onAuthStateChange) sb.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') showNewPw(); });
  $('#logout').addEventListener('click', function () { sb.auth.signOut().then(function () { S = { settings: null, customers: [], appts: [], invoices: [] }; showLogin(); }); });
  sb.auth.getSession().then(function (r) { if ($('#newpw').hidden === false) return; if (r.data && r.data.session) start(); else showLogin(); });

  // ---------- Router ----------
  var VIEWS = { termine: vTermine, kunden: vKunden, rechnungen: vRechnungen, einstellungen: vEinst };
  function route() {
    var k = (location.hash || '#termine').slice(1); if (!VIEWS[k]) k = 'termine';
    document.querySelectorAll('#tabs a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + k); });
    VIEWS[k]();
  }
  window.addEventListener('hashchange', function () { if (!$('#app').hidden && S.settings) route(); });
  function refresh() { return loadAll().then(route).catch(fail); }

  // ---------- Dialog ----------
  function dialog(html, onMount) { var d = $('#dlg'); d.innerHTML = html; if (!d.open) d.showModal(); if (onMount) onMount(d); return d; }
  function closeDlg() { var d = $('#dlg'); if (d.open) d.close(); }
  $('#dlg').addEventListener('click', function (e) { if (e.target.id === 'dlg') closeDlg(); });

  // ---------- Termine ----------
  var apFilter = 'anstehend';
  function vTermine() {
    var now = new Date();
    var open = S.appts.filter(function (a) { return a.status === 'angefragt'; }).length;
    var next = S.appts.filter(function (a) { return a.status === 'bestaetigt' && new Date(a.starts_at) >= now; })[0];
    var due = S.invoices.filter(function (i) { return i.status === 'offen'; }).reduce(function (s, i) { return s + Number(i.total); }, 0);
    var list = S.appts.filter(function (a) {
      var past = new Date(a.starts_at) < now;
      if (apFilter === 'anfragen') return a.status === 'angefragt';
      if (apFilter === 'anstehend') return !past && a.status !== 'abgesagt';
      if (apFilter === 'vergangen') return past && a.status !== 'abgesagt';
      return a.status === 'abgesagt';
    });
    if (apFilter === 'vergangen') list = list.slice().reverse();
    var rows = list.map(function (a) {
      var act = '';
      if (a.status === 'angefragt') act += '<button class="btn small primary" data-a="confirm" data-id="' + a.id + '">Bestätigen</button>';
      if (a.status === 'bestaetigt' && new Date(a.starts_at) < now) act += '<button class="btn small ghost" data-a="done" data-id="' + a.id + '">Erledigt</button>';
      if (apMail(a)) act += '<button class="btn small ghost" data-a="mail" data-id="' + a.id + '">E-Mail</button>';
      if (!a.customer_id) act += '<button class="btn small ghost" data-a="link" data-id="' + a.id + '">Als Kunde speichern</button>';
      if (a.status !== 'abgesagt') act += '<button class="btn small ghost" data-a="invoice" data-id="' + a.id + '">Rechnung</button>';
      if (a.status !== 'abgesagt' && a.status !== 'erledigt') act += '<button class="btn small danger" data-a="cancel" data-id="' + a.id + '">Absagen</button>';
      return '<tr><td><strong>' + esc(fDate(a.starts_at)) + '</strong><br>' + esc(fTime(a.starts_at)) + ' Uhr</td><td>' + esc(apName(a)) + (a.customer_id ? '' : ' <span class="hint">(Gast)</span>') + '<br><span class="hint">' + esc(apMail(a)) + (apPhone(a) ? ' · ' + esc(apPhone(a)) : '') + '</span></td><td>' + (a.service ? '<strong>' + esc(svcName(a.service) || a.service) + '</strong><br>' : '') + esc(a.topic) + (a.note ? '<br><span class="hint">' + esc(a.note) + '</span>' : '') + '</td><td><span class="badge ' + a.status + '">' + STAT[a.status] + '</span></td><td><div class="act">' + act + '</div></td></tr>';
    }).join('') || '<tr><td colspan="5" class="hint">Keine Termine in dieser Ansicht.</td></tr>';
    $('#view').innerHTML =
      '<div class="cards"><div class="card"><div class="hint">Neue Anfragen</div><div class="num">' + open + '</div></div>' +
      '<div class="card"><div class="hint">Nächster bestätigter Termin</div><div class="num" style="font-size:1.2rem">' + (next ? esc(fDate(next.starts_at)) + ', ' + esc(fTime(next.starts_at)) + ' Uhr' : '–') + '</div></div>' +
      '<div class="card"><div class="hint">Offene Rechnungen</div><div class="num">CHF ' + money(due) + '</div></div></div>' +
      '<div class="toolbar"><h2 style="margin:0">Termine</h2><div class="sp"></div><select id="apf" style="width:auto" aria-label="Ansicht">' +
      [['anstehend', 'Anstehend'], ['anfragen', 'Anfragen'], ['vergangen', 'Vergangen'], ['abgesagt', 'Abgesagt']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === apFilter ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select><button class="btn primary" id="new-ap">Neuer Termin</button></div>' +
      '<div class="tw"><table><thead><tr><th>Wann</th><th>Wer</th><th>Angebot / Thema</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    $('#apf').onchange = function () { apFilter = this.value; vTermine(); };
    $('#new-ap').onclick = function () { apDialog(); };
    $('#view').onclick = function (e) { var b = e.target.closest('button[data-a]'); if (b) apAction(b.dataset.a, b.dataset.id); };
  }
  function apById(id) { return S.appts.filter(function (a) { return a.id === id; })[0]; }
  function setStatus(a, st) { return sb.from('appointments').update({ status: st }).eq('id', a.id).then(function (r) { must(r); return refresh(); }); }
  function mailFor(a) {
    var when = fDate(a.starts_at) + ', ' + fTime(a.starts_at) + ' Uhr';
    var body = 'Guten Tag ' + apName(a) + '\n\nIhr Termin in der ' + S.settings.practice + ' ist bestätigt:\n' + when + '\n' + S.settings.street + ', ' + S.settings.zip + ' ' + S.settings.city + '\nDauer: ' + a.minutes + ' Minuten, Preis: CHF ' + money(S.settings.session_price) + '\n\nBei Fragen oder wenn Sie den Termin nicht wahrnehmen können, melden Sie sich bitte rechtzeitig: ' + S.settings.phone + '.\n\nFreundliche Grüsse\n' + S.settings.person;
    location.href = 'mailto:' + encodeURIComponent(apMail(a)) + '?subject=' + encodeURIComponent('Ihr Termin: ' + when) + '&body=' + encodeURIComponent(body);
  }
  function ensureCustomer(a) {
    if (a.customer_id) return Promise.resolve(a.customer_id);
    var found = S.customers.filter(function (c) { return a.guest_email && c.email.toLowerCase() === a.guest_email.toLowerCase(); })[0];
    var p;
    if (found) p = Promise.resolve(found.id);
    else {
      var parts = a.guest_name.trim().split(/\s+/), last = parts.length > 1 ? parts.pop() : '';
      p = sb.from('customers').insert({ first_name: parts.join(' '), last_name: last, email: a.guest_email, phone: a.guest_phone }).select().single().then(function (r) { return must(r).id; });
    }
    return p.then(function (cid) { return sb.from('appointments').update({ customer_id: cid }).eq('id', a.id).then(function (r) { must(r); a.customer_id = cid; return cid; }); });
  }
  function apAction(act, id) {
    var a = apById(id); if (!a) return;
    if (act === 'confirm') setStatus(a, 'bestaetigt').then(function () { toast('Termin bestätigt. Mit «E-Mail» kannst du der Kundin die Bestätigung senden.'); }).catch(fail);
    else if (act === 'done') setStatus(a, 'erledigt').catch(fail);
    else if (act === 'cancel') { if (confirm('Termin wirklich absagen? Die Zeit wird auf der Website wieder frei.')) setStatus(a, 'abgesagt').catch(fail); }
    else if (act === 'mail') mailFor(a);
    else if (act === 'link') ensureCustomer(a).then(function () { toast('Als Kunde gespeichert.'); return refresh(); }).catch(fail);
    else if (act === 'invoice') ensureCustomer(a).then(function () { return loadAll(); }).then(function () { invDialog({ customer_id: a.customer_id, appointment_id: a.id, text: (svcName(a.service) || 'Hypnosetherapie') + ' vom ' + fDate(a.starts_at).replace(/^\S+\s/, ''), price: svc(a.service) ? Number(svc(a.service).price) : undefined }); }).catch(fail);
  }
  function custOptions(sel) { return '<option value="">– Kunde wählen –</option>' + S.customers.map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(cName(c)) + '</option>'; }).join(''); }
  function apDialog(pre) {
    pre = pre || {};
    dialog('<h2>Neuer Termin</h2><form id="f"><label for="a-c">Kunde</label><select id="a-c">' + custOptions(pre.customer_id) + '</select>' +
      '<p class="hint">Oder neuer Gast:</p><div class="row2"><div><label for="a-n">Name</label><input id="a-n"></div><div><label for="a-m">E-Mail</label><input id="a-m" type="email"></div></div>' +
      '<label for="a-s">Angebot</label><select id="a-s">' + svcs().map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + ' (' + s.minutes + ' Min.)</option>'; }).join('') + '</select>' +
      '<div class="row2"><div><label for="a-d">Datum und Uhrzeit</label><input id="a-d" type="datetime-local" required></div><div><label for="a-t">Thema</label><input id="a-t"></div></div>' +
      '<label for="a-no">Notiz</label><input id="a-no"><div class="dlg-actions"><button class="btn primary" type="submit">Speichern</button><button class="btn ghost" type="button" data-close>Abbrechen</button></div></form>', function (d) {
      d.querySelector('[data-close]').onclick = closeDlg;
      d.querySelector('#f').onsubmit = function (e) {
        e.preventDefault();
        var cid = $('#a-c').value || null, name = $('#a-n').value.trim();
        if (!cid && !name) { toast('Bitte Kunde wählen oder Namen eingeben.', true); return; }
        var row = { starts_at: new Date($('#a-d').value).toISOString(), minutes: (svc($('#a-s').value) || {}).minutes || S.settings.session_minutes, service: $('#a-s').value, status: 'bestaetigt', customer_id: cid, guest_name: cid ? '' : name, guest_email: cid ? '' : $('#a-m').value.trim(), topic: $('#a-t').value.trim(), note: $('#a-no').value.trim(), source: 'admin' };
        sb.from('appointments').insert(row).then(function (r) { if (r.error) { toast(r.error.code === '23505' ? 'Diese Zeit ist schon vergeben.' : r.error.message, true); return; } closeDlg(); toast('Termin gespeichert.'); return refresh(); });
      };
    });
  }

  // ---------- Kunden ----------
  var cq = '';
  function vKunden() {
    var q = cq.toLowerCase();
    var list = S.customers.filter(function (c) { return !q || (cName(c) + ' ' + c.email + ' ' + c.city + ' ' + c.phone).toLowerCase().indexOf(q) >= 0; });
    var rows = list.map(function (c) {
      var n = S.appts.filter(function (a) { return a.customer_id === c.id && a.status !== 'abgesagt'; }).length;
      return '<tr><td><a href="#" data-c="' + c.id + '">' + esc(cName(c)) + '</a></td><td>' + esc(c.email) + '</td><td>' + esc(c.phone) + '</td><td>' + esc((c.zip + ' ' + c.city).trim()) + '</td><td class="r">' + n + '</td></tr>';
    }).join('') || '<tr><td colspan="5" class="hint">Noch keine Kunden.</td></tr>';
    $('#view').innerHTML = '<div class="toolbar"><h2 style="margin:0">Kunden</h2><div class="sp"></div><input id="cq" type="search" placeholder="Suchen …" value="' + esc(cq) + '" style="width:220px" aria-label="Suchen"><button class="btn ghost" id="c-csv">CSV</button><button class="btn primary" id="c-new">Neuer Kunde</button></div>' +
      '<div class="tw"><table><thead><tr><th>Name</th><th>E-Mail</th><th>Telefon</th><th>Ort</th><th class="r">Termine</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    $('#cq').oninput = function () { cq = this.value; var pos = this.selectionStart; vKunden(); var i = $('#cq'); i.focus(); i.setSelectionRange(pos, pos); };
    $('#c-new').onclick = function () { custDialog(); };
    $('#c-csv').onclick = function () { csv('kunden.csv', ['Vorname', 'Nachname', 'E-Mail', 'Telefon', 'Strasse', 'PLZ', 'Ort'], S.customers.map(function (c) { return [c.first_name, c.last_name, c.email, c.phone, c.street, c.zip, c.city]; })); };
    $('#view').onclick = function (e) { var a = e.target.closest('a[data-c]'); if (a) { e.preventDefault(); custDialog(cust(a.dataset.c)); } };
  }
  function custDialog(c) {
    var isNew = !c; c = c || { first_name: '', last_name: '', email: '', phone: '', street: '', zip: '', city: '', notes: '' };
    var aps = isNew ? [] : S.appts.filter(function (a) { return a.customer_id === c.id; }).reverse();
    var ivs = isNew ? [] : S.invoices.filter(function (i) { return i.customer_id === c.id; });
    var hist = isNew ? '' : '<h3 style="margin-top:20px">Termine</h3><table class="mini"><tbody>' + (aps.map(function (a) { return '<tr><td>' + esc(fDate(a.starts_at)) + ' ' + esc(fTime(a.starts_at)) + '</td><td><span class="badge ' + a.status + '">' + STAT[a.status] + '</span></td></tr>'; }).join('') || '<tr><td class="hint">Keine</td></tr>') + '</tbody></table>' +
      '<h3 style="margin-top:20px">Rechnungen</h3><table class="mini"><tbody>' + (ivs.map(function (i) { return '<tr><td>' + esc(i.number) + '</td><td>CHF ' + money(i.total) + '</td><td><span class="badge ' + i.status + '">' + STAT[i.status] + '</span></td></tr>'; }).join('') || '<tr><td class="hint">Keine</td></tr>') + '</tbody></table>';
    dialog('<h2>' + (isNew ? 'Neuer Kunde' : esc(cName(c))) + '</h2><form id="f"><div class="row2"><div><label for="k-fn">Vorname</label><input id="k-fn" value="' + esc(c.first_name) + '"></div><div><label for="k-ln">Nachname</label><input id="k-ln" value="' + esc(c.last_name) + '" required></div></div>' +
      '<div class="row2"><div><label for="k-m">E-Mail</label><input id="k-m" type="email" value="' + esc(c.email) + '"></div><div><label for="k-p">Telefon</label><input id="k-p" value="' + esc(c.phone) + '"></div></div>' +
      '<label for="k-s">Strasse</label><input id="k-s" value="' + esc(c.street) + '"><div class="row2"><div><label for="k-z">PLZ</label><input id="k-z" value="' + esc(c.zip) + '"></div><div><label for="k-c">Ort</label><input id="k-c" value="' + esc(c.city) + '"></div></div>' +
      '<label for="k-n">Notizen (besonders schützenswert, nur das Nötige)</label><textarea id="k-n">' + esc(c.notes) + '</textarea>' + hist +
      '<div class="dlg-actions"><button class="btn primary" type="submit">Speichern</button>' + (isNew ? '' : '<button class="btn ghost" type="button" id="k-ap">Neuer Termin</button><button class="btn ghost" type="button" id="k-iv">Neue Rechnung</button><button class="btn danger" type="button" id="k-del">Löschen</button>') + '<span class="sp"></span><button class="btn ghost" type="button" data-close>Schliessen</button></div></form>', function (d) {
      d.querySelector('[data-close]').onclick = closeDlg;
      if (!isNew) {
        $('#k-ap').onclick = function () { closeDlg(); apDialog({ customer_id: c.id }); };
        $('#k-iv').onclick = function () { closeDlg(); invDialog({ customer_id: c.id }); };
        $('#k-del').onclick = function () { if (confirm('Kunde und seine Notizen endgültig löschen? Termine und Rechnungen bleiben ohne Zuordnung bestehen.')) sb.from('customers').delete().eq('id', c.id).then(function (r) { must(r); closeDlg(); return refresh(); }).catch(fail); };
      }
      d.querySelector('#f').onsubmit = function (e) {
        e.preventDefault();
        var row = { first_name: $('#k-fn').value.trim(), last_name: $('#k-ln').value.trim(), email: $('#k-m').value.trim(), phone: $('#k-p').value.trim(), street: $('#k-s').value.trim(), zip: $('#k-z').value.trim(), city: $('#k-c').value.trim(), notes: $('#k-n').value };
        var q = isNew ? sb.from('customers').insert(row) : sb.from('customers').update(row).eq('id', c.id);
        q.then(function (r) { must(r); closeDlg(); toast('Gespeichert.'); return refresh(); }).catch(fail);
      };
    });
  }

  // ---------- Rechnungen ----------
  function vRechnungen() {
    var rows = S.invoices.map(function (i) {
      var c = cust(i.customer_id);
      return '<tr><td><a href="#" data-i="' + i.id + '">' + esc(i.number) + '</a></td><td>' + esc(fDay(i.issued_on)) + '</td><td>' + esc(cName(c) || '–') + '</td><td class="r">CHF ' + money(i.total) + '</td><td>' + esc(fDay(i.due_on)) + '</td><td><span class="badge ' + i.status + '">' + STAT[i.status] + '</span></td><td><div class="act"><button class="btn small ghost" data-v="' + i.id + '">PDF / Drucken</button>' +
        (i.status === 'offen' ? '<button class="btn small primary" data-p="' + i.id + '">Bezahlt</button><button class="btn small danger" data-x="' + i.id + '">Stornieren</button>' : '') + '</div></td></tr>';
    }).join('') || '<tr><td colspan="7" class="hint">Noch keine Rechnungen.</td></tr>';
    $('#view').innerHTML = '<div class="toolbar"><h2 style="margin:0">Rechnungen</h2><div class="sp"></div><button class="btn ghost" id="i-csv">CSV (für Buchhaltung)</button><button class="btn primary" id="i-new">Neue Rechnung</button></div>' +
      '<div class="tw"><table><thead><tr><th>Nr.</th><th>Datum</th><th>Kunde</th><th class="r">Betrag</th><th>Fällig</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (S.settings.iban ? '' : '<p class="hint">Hinweis: Für den QR-Zahlteil fehlt noch die IBAN unter «Einstellungen».</p>');
    $('#i-new').onclick = function () { invDialog({}); };
    $('#i-csv').onclick = function () { csv('rechnungen.csv', ['Nummer', 'Datum', 'Fällig', 'Kunde', 'Betrag CHF', 'Status', 'Bezahlt am'], S.invoices.map(function (i) { return [i.number, i.issued_on, i.due_on, cName(cust(i.customer_id)), Number(i.total).toFixed(2), STAT[i.status], i.paid_on || '']; })); };
    $('#view').onclick = function (e) {
      var v = e.target.closest('[data-v]'), p = e.target.closest('[data-p]'), x = e.target.closest('[data-x]');
      if (v) printInvoice(v.dataset.v);
      else if (p) sb.from('invoices').update({ status: 'bezahlt', paid_on: new Date().toISOString().slice(0, 10) }).eq('id', p.dataset.p).then(function (r) { must(r); return refresh(); }).catch(fail);
      else if (x) { if (confirm('Rechnung stornieren?')) sb.from('invoices').update({ status: 'storniert' }).eq('id', x.dataset.x).then(function (r) { must(r); return refresh(); }).catch(fail); }
      var a = e.target.closest('a[data-i]'); if (a) { e.preventDefault(); printInvoice(a.dataset.i); }
    };
  }
  function invDialog(pre) {
    var today = new Date().toISOString().slice(0, 10);
    var items = [{ text: pre.text || 'Hypnosetherapie', qty: 1, price: pre.price != null ? pre.price : Number(S.settings.session_price) }];
    dialog('<h2>Neue Rechnung</h2><form id="f"><label for="v-c">Kunde</label><select id="v-c" required>' + custOptions(pre.customer_id) + '</select>' +
      '<div class="row2"><div><label for="v-d">Rechnungsdatum</label><input id="v-d" type="date" value="' + today + '" required></div><div><label for="v-f">Zahlbar innert (Tage)</label><input id="v-f" type="number" min="0" value="' + S.settings.payment_days + '"></div></div>' +
      '<table class="items" style="border:0"><thead><tr><th>Leistung</th><th style="width:70px">Anz.</th><th style="width:110px">Preis CHF</th><th></th></tr></thead><tbody id="v-items"></tbody></table>' +
      '<button class="btn small ghost" type="button" id="v-add">+ Position</button><p style="text-align:right"><strong>Total CHF <span id="v-tot"></span></strong></p>' +
      '<div class="dlg-actions"><button class="btn primary" type="submit">Rechnung erstellen</button><button class="btn ghost" type="button" data-close>Abbrechen</button></div></form>', function (d) {
      function draw() {
        $('#v-items').innerHTML = items.map(function (it, i) { return '<tr><td><input data-k="text" data-i="' + i + '" value="' + esc(it.text) + '" aria-label="Leistung"></td><td><input data-k="qty" data-i="' + i + '" type="number" min="0" step="1" value="' + it.qty + '" aria-label="Anzahl"></td><td><input data-k="price" data-i="' + i + '" type="number" min="0" step="0.05" value="' + it.price + '" aria-label="Preis"></td><td>' + (items.length > 1 ? '<button class="btn small danger" type="button" data-rm="' + i + '" aria-label="Position entfernen">×</button>' : '') + '</td></tr>'; }).join('');
        tot();
      }
      function tot() { $('#v-tot').textContent = money(sum(items)); }
      function sum(arr) { return Math.round(arr.reduce(function (s, it) { return s + (Number(it.qty) || 0) * (Number(it.price) || 0); }, 0) * 100) / 100; }
      draw();
      d.querySelector('[data-close]').onclick = closeDlg;
      $('#v-add').onclick = function () { items.push({ text: '', qty: 1, price: 0 }); draw(); };
      $('#v-items').oninput = function (e) { var t = e.target; if (t.dataset.k) { items[t.dataset.i][t.dataset.k] = t.value; tot(); } };
      $('#v-items').onclick = function (e) { var b = e.target.closest('[data-rm]'); if (b) { items.splice(b.dataset.rm, 1); draw(); } };
      d.querySelector('#f').onsubmit = function (e) {
        e.preventDefault();
        var clean = items.filter(function (it) { return String(it.text).trim(); }).map(function (it) { return { text: String(it.text).trim(), qty: Number(it.qty) || 0, price: Number(it.price) || 0 }; });
        if (!clean.length) { toast('Bitte mindestens eine Position angeben.', true); return; }
        var issued = $('#v-d').value, due = new Date(issued + 'T12:00:00'); due.setDate(due.getDate() + (Number($('#v-f').value) || 0));
        sb.rpc('next_invoice_number').then(function (r) {
          var number = must(r);
          return sb.from('invoices').insert({ number: number, customer_id: $('#v-c').value || null, appointment_id: pre.appointment_id || null, issued_on: issued, due_on: due.toISOString().slice(0, 10), items: clean, total: sum(clean) }).select().single();
        }).then(function (r) { var inv = must(r); closeDlg(); toast('Rechnung ' + inv.number + ' erstellt.'); return loadAll().then(function () { if (location.hash !== '#rechnungen') location.hash = '#rechnungen'; else route(); printInvoice(inv.id); }); }).catch(fail);
      };
    });
  }

  // QR-Referenz (27 Stellen, Modulo 10 rekursiv) nur nötig bei QR-IBAN
  function qrRef(number) {
    var digits = String(number).replace(/\D/g, ''); while (digits.length < 26) digits = '0' + digits; digits = digits.slice(-26);
    var t = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5], c = 0; for (var i = 0; i < digits.length; i++) c = t[(c + Number(digits[i])) % 10];
    return digits + ((10 - c) % 10);
  }
  function isQrIban(iban) { var n = Number(iban.replace(/\s/g, '').slice(4, 9)); return n >= 30000 && n <= 31999; }

  function printInvoice(id) {
    var inv = S.invoices.filter(function (i) { return i.id === id; })[0], c = cust(inv.customer_id), s = S.settings, qrSvg = '', qrErr = '';
    if (s.iban) {
      try {
        var data = { amount: Number(inv.total), currency: 'CHF', creditor: { account: s.iban.replace(/\s/g, ''), name: s.person, address: s.street, zip: String(s.zip), city: s.city, country: 'CH' }, message: 'Rechnung ' + inv.number };
        if (c && c.street && c.zip && c.city && (c.last_name || c.first_name)) data.debtor = { name: cName(c), address: c.street, zip: String(c.zip), city: c.city, country: 'CH' };
        if (isQrIban(s.iban)) data.reference = qrRef(inv.number);
        qrSvg = new window.SQB.SwissQRBill(data).toString();
      } catch (e) { qrErr = 'QR-Zahlteil nicht möglich: ' + (e.message || e); }
    } else qrErr = 'Für den QR-Zahlteil fehlt die IBAN in den Einstellungen.';
    var rows = (inv.items || []).map(function (it) { return '<tr><td>' + esc(it.text) + '</td><td class="r">' + esc(it.qty) + '</td><td class="r">' + money(it.price) + '</td><td class="r">' + money(it.qty * it.price) + '</td></tr>'; }).join('');
    var w = window.open('', '_blank'); if (!w) { toast('Pop-up wurde blockiert. Bitte Pop-ups für diese Seite erlauben.', true); return; }
    w.document.write('<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><title>Rechnung ' + esc(inv.number) + '</title><style>' +
      '@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font:11pt/1.4 Arial,Helvetica,sans-serif;color:#222}.page{position:relative;width:210mm;height:297mm;padding:20mm 20mm 0}' +
      'h1{font:600 18pt Georgia,serif;margin:18mm 0 6mm;color:#263D34}table{width:100%;border-collapse:collapse}th,td{padding:5px 4px;border-bottom:1px solid #ddd;text-align:left}th{font-size:9pt;text-transform:uppercase;color:#555}.r{text-align:right}' +
      '.top{display:flex;justify-content:space-between}.small{font-size:9.5pt;color:#444}.tot td{border-bottom:0;font-weight:700;font-size:12pt}.qr{position:absolute;left:0;bottom:0;width:210mm;height:105mm}.qr svg{display:block}.err{position:absolute;left:20mm;bottom:20mm;color:#a3382f}' +
      '.noprint{position:fixed;top:8px;right:8px}@media print{.noprint{display:none}}</style></head><body><button class="noprint" onclick="print()">Drucken / als PDF speichern</button><div class="page">' +
      '<div class="top"><div><strong>' + esc(s.practice) + '</strong><br>' + esc(s.person) + '<br>' + esc(s.street) + '<br>' + esc(s.zip) + ' ' + esc(s.city) + '<br>' + esc(s.phone) + '<br>' + esc(s.email) + '</div>' +
      '<div style="margin-top:12mm;min-width:70mm">' + (c ? esc(cName(c)) + '<br>' + esc(c.street) + '<br>' + esc((c.zip + ' ' + c.city).trim()) : '') + '</div></div>' +
      '<h1>Rechnung ' + esc(inv.number) + '</h1><p class="small">Datum: ' + esc(fDay(inv.issued_on)) + ' &nbsp;·&nbsp; Zahlbar bis: ' + esc(fDay(inv.due_on)) + '</p>' +
      '<table><thead><tr><th>Leistung</th><th class="r">Anz.</th><th class="r">Preis CHF</th><th class="r">Betrag CHF</th></tr></thead><tbody>' + rows + '<tr class="tot"><td colspan="3" class="r">Total CHF</td><td class="r">' + money(inv.total) + '</td></tr></tbody></table>' +
      '<p class="small" style="margin-top:8mm">' + esc(s.invoice_note).replace(/\n/g, '<br>') + '</p>' +
      (qrSvg ? '<div class="qr">' + qrSvg + '</div>' : '<div class="err">' + esc(qrErr) + '</div>') + '</div></body></html>');
    w.document.close();
  }

  // ---------- Einstellungen ----------
  var DAYS = [['1', 'Montag'], ['2', 'Dienstag'], ['3', 'Mittwoch'], ['4', 'Donnerstag'], ['5', 'Freitag'], ['6', 'Samstag'], ['0', 'Sonntag']];
  function vEinst() {
    var s = S.settings, f = function (id, label, val, type, extra) { return '<div><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val) + '" ' + (extra || '') + '></div>'; };
    $('#view').innerHTML = '<h2>Einstellungen</h2><form id="f" class="card">' +
      '<div class="row2">' + f('s-pr', 'Praxisname', s.practice) + f('s-pe', 'Name', s.person) + '</div><div class="row2">' + f('s-st', 'Strasse', s.street) + '<div class="row2">' + f('s-zi', 'PLZ', s.zip) + f('s-ci', 'Ort', s.city) + '</div></div>' +
      '<div class="row2">' + f('s-ph', 'Telefon', s.phone) + f('s-em', 'E-Mail (Kontakt)', s.email, 'email') + '</div>' +
      '<h3 style="margin-top:24px">Rechnungen</h3><div class="row2">' + f('s-ib', 'IBAN für QR-Zahlteil', s.iban, 'text', 'placeholder="CH.. .... .... .... .... ."') + f('s-pd', 'Zahlbar innert (Tage)', s.payment_days, 'number', 'min="0"') + '</div>' +
      '<label for="s-no">Text unter der Rechnung</label><textarea id="s-no" style="min-height:70px">' + esc(s.invoice_note) + '</textarea>' +
      '<h3 style="margin-top:24px">Angebote (erscheinen in der Buchung)</h3><div id="svc-rows"></div><button class="btn small ghost" type="button" id="svc-add">+ Angebot</button><p class="hint">Die Kennung (z. B. hypnose) nach dem Anlegen nicht mehr ändern. Bereits gebuchte Termine verweisen darauf.</p>' +
      '<h3 style="margin-top:24px">Sitzung und Buchung</h3><div class="row3">' + f('s-mi', 'Dauer (Min.)', s.session_minutes, 'number', 'min="15" step="5"') + f('s-pc', 'Preis CHF', s.session_price, 'number', 'min="0" step="0.05"') + '<div class="row2">' + f('s-ld', 'Vorlauf (Tage)', s.lead_days, 'number', 'min="0"') + f('s-bw', 'Wochen im Voraus', s.booking_weeks, 'number', 'min="1"') + '</div></div>' +
      '<h3 style="margin-top:24px">Sprechzeiten (Startzeiten pro Tag, getrennt mit Komma)</h3>' +
      DAYS.map(function (d) { return '<div class="row2"><label for="h' + d[0] + '" style="align-self:center">' + d[1] + '</label><input id="h' + d[0] + '" value="' + esc(((s.hours || {})[d[0]] || []).join(', ')) + '" placeholder="z. B. 13:00, 14:00"></div>'; }).join('') +
      '<div class="dlg-actions"><button class="btn primary" type="submit">Speichern</button></div></form>';
    var svl = svcs().map(function (s) { return Object.assign({}, s); });
    function drawSvc() {
      $('#svc-rows').innerHTML = svl.map(function (s, i) { return '<div class="row3" style="grid-template-columns:1fr 2fr 1fr 1fr auto;gap:8px;align-items:end"><div><label>Kennung</label><input data-sk="id" data-i="' + i + '" value="' + esc(s.id) + '" pattern="[a-z0-9]+" title="nur Kleinbuchstaben und Zahlen"></div><div><label>Name</label><input data-sk="name" data-i="' + i + '" value="' + esc(s.name) + '"></div><div><label>Minuten</label><input type="number" min="15" step="5" data-sk="minutes" data-i="' + i + '" value="' + esc(s.minutes) + '"></div><div><label>Preis CHF</label><input type="number" min="0" step="0.05" data-sk="price" data-i="' + i + '" value="' + esc(s.price) + '"></div><button type="button" class="btn small danger" data-sr="' + i + '" aria-label="Angebot entfernen">×</button></div>'; }).join('');
    }
    drawSvc();
    $('#svc-rows').oninput = function (e) { var t = e.target; if (t.dataset.sk) svl[t.dataset.i][t.dataset.sk] = (t.dataset.sk === 'minutes' || t.dataset.sk === 'price') ? Number(t.value) : t.value; };
    $('#svc-rows').onclick = function (e) { var b = e.target.closest('[data-sr]'); if (b) { svl.splice(b.dataset.sr, 1); drawSvc(); } };
    $('#svc-add').onclick = function () { svl.push({ id: 'neu' + (svl.length + 1), name: '', minutes: 60, price: 0 }); drawSvc(); };
    $('#f').onsubmit = function (e) {
      e.preventDefault(); var hours = {}, bad = false;
      var ids = {}; for (var k = 0; k < svl.length; k++) { if (!/^[a-z0-9]+$/.test(svl[k].id) || !String(svl[k].name).trim() || ids[svl[k].id]) { toast('Jedes Angebot braucht eine eindeutige Kennung (a–z, 0–9) und einen Namen.', true); return; } ids[svl[k].id] = 1; }
      DAYS.forEach(function (d) { var v = $('#h' + d[0]).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); v.forEach(function (t) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) bad = true; }); if (v.length) hours[d[0]] = v; });
      if (bad) { toast('Zeiten bitte im Format 13:00 angeben.', true); return; }
      var iban = $('#s-ib').value.replace(/\s/g, '').toUpperCase();
      if (iban && !/^(CH|LI)\d{19}$/.test(iban)) { toast('Die IBAN muss mit CH oder LI beginnen und 21 Zeichen haben.', true); return; }
      sb.from('settings').update({ practice: $('#s-pr').value.trim(), person: $('#s-pe').value.trim(), street: $('#s-st').value.trim(), zip: $('#s-zi').value.trim(), city: $('#s-ci').value.trim(), phone: $('#s-ph').value.trim(), email: $('#s-em').value.trim(), iban: iban, payment_days: Number($('#s-pd').value) || 0, invoice_note: $('#s-no').value, session_minutes: Number($('#s-mi').value) || 60, session_price: Number($('#s-pc').value) || 0, lead_days: Number($('#s-ld').value) || 0, booking_weeks: Number($('#s-bw').value) || 12, hours: hours, services: svl }).eq('id', 1)
        .then(function (r) { must(r); toast('Gespeichert.'); return refresh(); }).catch(fail);
    };
  }

  // ---------- CSV ----------
  function csv(name, head, rows) {
    var q = function (v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    var txt = '﻿' + [head].concat(rows).map(function (r) { return r.map(q).join(';'); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
})();
