# Verwaltung und Online-Buchung einrichten (Supabase)

Was dabei entsteht:
- **Website:** Kundinnen wählen Freitagnachmittag oder Samstagvormittag im Kalender. Vergebene Zeiten verschwinden automatisch.
- **Verwaltung unter `/admin/`** (mit Login nur für Marianne): Termine bestätigen und absagen, Kundendatenbank, Rechnungen mit Schweizer QR-Zahlteil (Druck oder PDF), CSV-Export, Einstellungen.
- **Daten:** liegen in einer eigenen Datenbank bei Supabase, nicht im Code auf GitHub.

Kosten: Der Gratis-Tarif von Supabase reicht dafür. Aktuelle Limits und Preise bitte vor dem Start auf supabase.com prüfen.

## 1. Supabase-Projekt anlegen (ca. 10 Minuten, durch Marianne)
1. Auf supabase.com ein Konto eröffnen und «New project» wählen.
2. Region wählen: **Zürich (eu-central-2)**, falls angeboten, sonst Frankfurt. Starkes Datenbank-Passwort setzen und gut aufbewahren.
3. Warten, bis das Projekt bereit ist.

## 2. Datenbank einrichten
1. Im Projekt links **SQL Editor** öffnen.
2. Den ganzen Inhalt der Datei `supabase/schema.sql` einfügen und **Run** drücken. Es sollte «Success» erscheinen.

## 3. Login für Marianne
1. **Authentication → Users → Add user → Create new user.** E-Mail `marianne.kaeser@bluewin.ch`, ein langes, einmaliges Passwort, «Auto Confirm User» anhaken.
2. **Authentication → Sign In / Providers** (je nach Ansicht): **«Allow new users to sign up» ausschalten.** So kann sich niemand sonst registrieren.
3. Empfohlen: Zwei-Faktor-Anmeldung aktivieren, sobald Supabase sie anbietet.
Auch bei einem fremden Konto sähe niemand Daten: Die Datenbank erlaubt den Zugriff nur der E-Mail, die in den Einstellungen als Inhaberin steht (`owner_email`, Standard `marianne.kaeser@bluewin.ch`).

## 4. Website verbinden
1. In Supabase: **Project Settings → API.** Dort stehen die **Project URL** und der Schlüssel **anon public**.
2. In `config.js` eintragen:
   ```js
   supabaseUrl: "https://xxxx.supabase.co",
   supabaseAnonKey: "eyJ…",
   ```
   Der anon-Schlüssel ist für Websites vorgesehen und darf öffentlich sein. **Niemals** den `service_role`-Schlüssel eintragen.
3. Datei auf GitHub speichern (commit). Nach 1–2 Minuten ist alles aktiv.

## 5. Erste Schritte in der Verwaltung
1. `https://ncioyanick3939.github.io/hypnosemarianne/admin/` öffnen und anmelden.
2. **Einstellungen:** IBAN eintragen (nötig für den QR-Zahlteil), Preis, Sprechzeiten und Texte prüfen.
3. Eine Testbuchung auf der Seite «Termin buchen» machen, in der Verwaltung bestätigen, dann absagen.
4. Eine Testrechnung erstellen und mit «PDF / Drucken» öffnen.

## So funktioniert es im Alltag
- Anfrage der Kundin → erscheint unter **Termine** als «Angefragt» (die Zeit ist sofort gesperrt).
- **Bestätigen**, dann mit **E-Mail** einen vorbereiteten Bestätigungstext an die Kundin senden. Automatische Mails kann das System ohne zusätzlichen Dienst nicht senden.
- **Als Kunde speichern** übernimmt die Angaben in die Kundendatenbank.
- **Rechnung** erzeugt aus dem Termin eine Rechnung (Nummer 2026-001, 002 …). «Bezahlt» markieren, sobald das Geld da ist.
- Absagen gibt die Zeit auf der Website wieder frei.

## QR-Rechnung: wichtig
- Die Rechnung enthält einen Zahlteil nach Schweizer Standard. Bei einer normalen IBAN gibt es keine Referenznummer. Bei einer QR-IBAN erzeugt das System eine QR-Referenz aus der Rechnungsnummer.
- Ob die Bank sie als gültig akzeptiert, bitte mit einer ersten Testzahlung oder dem Prüfwerkzeug der Bank kontrollieren.
- Für die Buchhaltung gibt es den CSV-Export. Anbindung an Tools wie bexio oder Billomat wäre ein späterer Ausbau (braucht deren API-Zugang).

## Datenschutz (wichtig)
- Die Kundendatenbank enthält Personendaten, Notizen können besonders schützenswerte Daten sein. Nur das Nötige notieren.
- In die Datenschutzerklärung gehören: Supabase als Dienstleister (Region), Zweck, Aufbewahrung.
- Regelmässig sichern: In den Tabellen «Export» oder die CSV-Exporte der Verwaltung nutzen. Im Gratis-Tarif gibt es keine automatischen Backups.
- Passwort nie weitergeben, nach dem Arbeiten abmelden.
