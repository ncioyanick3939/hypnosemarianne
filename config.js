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
  cancellation:    "",   // z. B. "Kostenlose Absage bis 24 Stunden vorher"

  // Datenbank (Supabase). Beide Werte aus Supabase > Project Settings > API. Der "anon"-Schlüssel ist öffentlich vorgesehen.
  supabaseUrl: "https://hdkhaxgqfjrvkblndepy.supabase.co",
  supabaseAnonKey: "",

  // Link zum OneDoc-Profil von Marianne (leer = Button zeigt "Link folgt")
  onedocUrl: "",

  // Link zum Kundenkonto der Buchungsplattform (leer = kein Link im Footer)
  loginUrl: "",

  // Sprechzeiten für den Kalender: Wochentag (0=So … 5=Fr, 6=Sa) -> Startzeiten (je 60 Min.)
  hours: { 5: ["13:00","14:00","15:00","16:00"], 6: ["08:00","09:00","10:00","11:00"] },
  bookingWeeks: 12,   // so weit im Voraus anzeigen
  leadDays: 2         // frühestens in x Tagen
};
