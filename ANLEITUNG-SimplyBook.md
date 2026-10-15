# Online-Buchung und Logins mit SimplyBook.me einrichten

Die Website hat keinen eigenen Server. Anmeldungen und Passwörter übernimmt deshalb die Buchungsplattform. Das ist sicherer als ein selbstgebautes Login.

## 1. Konto für Marianne anlegen (ca. 15 Minuten)
1. Auf simplybook.me ein Konto eröffnen (Gratis-Tarif, Limiten und Preise vorher auf der Preisseite prüfen).
2. Beim Anlegen ein gutes, einmaliges Passwort wählen. Wenn möglich Zwei-Faktor-Anmeldung aktivieren.
3. Mit der Admin-Adresse (`IhrName.simplybook.me/admin`) meldet sich Marianne später an. Dort sieht sie alle Termine, Anfragen und den Kalender. Das ist ihr Login.

## 2. Leistung und Zeiten
1. Leistung «Hypnose-Sitzung»: 60 Minuten, CHF 125.-.
2. Arbeitszeiten: Freitag Nachmittag (13–17 Uhr) und Samstag Vormittag (8–12 Uhr). Zeiten bei Bedarf anpassen.
3. Benachrichtigungen per E-Mail an marianne.kaeser@bluewin.ch aktivieren.
4. Möglichst wenige Pflichtfelder (Name, E-Mail, Telefon). Keine Gesundheitsangaben abfragen.

## 3. Kundenkonto (optional)
In der Admin-Oberfläche unter den zusätzlichen Funktionen («Custom Features») nach «Client login» bzw. Kundenkonto suchen und aktivieren. Prüfen, ob die Funktion im gewählten Tarif enthalten ist oder extra kostet. Kundinnen und Kunden können dann ihre Termine selbst ansehen. Für die Buchung selbst ist kein Konto nötig.

## 4. In die Website einbinden
1. In SimplyBook die öffentliche Buchungsseite öffnen und deren Adresse kopieren (zum Beispiel `https://IhrName.simplybook.me`).
2. In `config.js` bei `bookingUrl` eintragen. Die Seite «Termin buchen» zeigt dann statt des Wunschtermin-Kalenders die Live-Buchung mit freien Zeiten.
3. Die Adresse des Kundenkontos bei `loginUrl` eintragen. Im Fusszeilenbereich erscheint dann «Kundenkonto».
4. Handy und Desktop testen, eine Testbuchung machen und wieder löschen.

## 5. Datenschutz
SimplyBook verarbeitet Namen und Kontaktdaten. Das muss in der Datenschutzerklärung stehen, und mit dem Anbieter ist eine Auftragsverarbeitung zu klären. Impressum und Datenschutz sollte Marianne rechtlich prüfen lassen.
