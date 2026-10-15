# Praxis Soleil: Was noch fehlt und wie es weitergeht

## Angaben, die Marianne ergänzen muss
- [ ] Absage-Regel (`config.js`: `cancellation`) — Dauer (60 Min.) und Preis (CHF 125.-) sind eingetragen
- [ ] Impressum (Anbieterinformationen) und Datenschutzerklärung (Texte rechtlich prüfen lassen)
- [ ] Texte gegenlesen, besonders die Angebote und die Fragen

## Online-Terminbuchung (SimplyBook.me)
1. Konto bei simplybook.me anlegen (kostenloser Plan: bis 50 Buchungen pro Monat, 1 Mitarbeiterin; Bezahlpläne ab ca. USD 8.25 pro Monat bei jährlicher Zahlung, Stand März 2026, bitte auf der Anbieterseite prüfen).
2. Leistung anlegen (z. B. «Kennenlerngespräch», «Hypnose-Sitzung») mit Dauer, Preis, Arbeitszeiten.
3. Möglichst wenig Pflichtfelder (Name, E-Mail, Telefon). Keine Gesundheitsangaben abfragen.
4. Link der Buchungsseite kopieren und in `config.js` bei `bookingUrl` eintragen. Die Seite «Termin buchen» zeigt dann die Buchung statt der Terminanfrage.
5. Datenschutz prüfen: Wo werden die Daten gespeichert, gibt es einen Auftragsverarbeitungsvertrag? Den Dienst in der Datenschutzerklärung nennen. Falls die Anforderungen nicht passen, ist eine Alternative zum Beispiel Cal.com oder eine reine Terminanfrage per Formular.

## Formulare
- `formAction` in `config.js` eintragen, z. B. `https://formsubmit.co/marianne.kaeser@bluewin.ch`. Einmal testen und die Bestätigungs-Mail bestätigen.

## Launch-Checkliste
- [ ] GitHub Pages eingeschaltet (Settings → Pages → `main` / root), HTTPS aktiv
- [ ] Alle Seiten am Handy und am Computer angesehen
- [ ] Formulare getestet (Anfrage kommt an)
- [ ] Buchung getestet (falls eingerichtet): Bestätigungs-Mail kommt an
- [ ] Impressum und Datenschutz ausgefüllt
- [ ] Texte und Preise geprüft, keine Heilversprechen
- [ ] Seitentitel und Beschreibungen (sind vorbereitet) kontrolliert
- [ ] `sitemap.xml`: Adresse prüfen, falls später eine eigene Domain verwendet wird
- [ ] In Google Search Console anmelden (optional)

## Kosten
- GitHub Pages: kostenlos
- SimplyBook.me: kostenlos (Grundplan) oder bezahlt, siehe oben
- Eigene Domain (optional, z. B. praxis-soleil.ch): je nach Anbieter ca. CHF 10 bis 20 pro Jahr
- Gesamt: deutlich unter CHF 1'000
