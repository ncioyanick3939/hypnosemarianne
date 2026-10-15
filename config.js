/* ==========================================================
   HIER ERSETZEN: Kontaktdaten und Formular-Adresse.
   Gilt für alle Seiten. Texte stehen direkt in index.html.
   ========================================================== */
var CONFIG = {
  practice: "Praxis Soleil",
  person:   "Marianne Kaeser",
  street:   "Kleinschönberg 109",
  zipCity:  "1700 Freiburg",
  phone:    "079 217 41 67",
  email:    "marianne.kaeser@bluewin.ch",
  // Adresse, an die Terminanfragen gesendet werden, z. B. https://formsubmit.co/marianne.kaeser@bluewin.ch
  // Leer = Testmodus, es wird nichts versendet.
  // Foto von Marianne: Datei in den Ordner legen und den Namen eintragen, z. B. "marianne.jpg". Leer = Sonnen-Bild.
  portrait: "marianne.jpg",
  formAction: "",

  // Online-Buchung (z. B. SimplyBook.me): Link zur Buchungsseite eintragen, z. B. "https://praxissoleil.simplybook.me/v2/".
  // Leer = Seite "Termin buchen" zeigt die Terminanfrage statt der Online-Buchung.
  bookingUrl: "",

  // Rahmen einer Sitzung. Leer = es erscheint ein freundlicher Standardtext.
  sessionDuration: "60 Minuten",   // z. B. "60 Minuten"
  sessionPrice:    "CHF 125.-",   // z. B. "CHF 150 pro Sitzung"
  cancellation:    ""    // z. B. "Kostenlose Absage bis 24 Stunden vorher"
};
