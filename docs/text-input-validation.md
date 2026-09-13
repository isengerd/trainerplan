# Texteingaben und sichere Ausgabe

Die API behandelt Namen, Notizen, Übungsbeschreibungen und ähnliche Felder als
Klartext. HTML wird nicht als ausführbarer Inhalt akzeptiert oder gerendert.
Zeichen wie `<`, `>`, `&` und Apostrophe bleiben als Text erhalten. HTML-Escaping
beim Speichern würde zu doppeltem Escaping führen und ist deshalb nicht vorgesehen.

## Eingabeprüfung

- `readJson` begrenzt die tatsächlich eingelesenen Bytes, lehnt primitive
  JSON-Bodies, zu tiefe Verschachtelung und gefährliche Objektschlüssel ab.
- `textValue` und `optionalText` prüfen Typ und Länge, lehnen unzulässige
  Steuerzeichen ab und vereinheitlichen Zeilenumbrüche. Mehrzeilige Notizen bleiben
  möglich. Passwörter und Tokens werden nicht global getrimmt oder umgeschrieben.
- Die fachlichen Validatoren prüfen zusätzlich Datumswerte, Uhrzeiten, Zahlen,
  Rollen, Farben und zugelassene Werte. YouTube-Links benötigen HTTPS und einen
  erlaubten Host ohne eingebettete Zugangsdaten oder abweichenden Port.
- E-Mail-Felder akzeptieren eine einzelne Adresse ohne Anzeigenamen,
  Empfängerlisten oder Zeilenumbrüche innerhalb der Adresse.
- Trainingspläne und Vorlagen geben jetzt neue Objekte mit ausschließlich
  geprüften Feldern zurück. Zuvor wurden verschachtelte Übungen zwar geprüft,
  anschließend aber teilweise die ungeprüften Originalobjekte gespeichert.
- Vorlagen prüfen jetzt auch Fokus, Phase und den Typ von `autoApply`.
- Elternnamen werden validiert statt still abgeschnitten; die Passwortänderung
  prüft tatsächliche String-Typen vor der Übergabe an bcrypt.

## Ausgabe

- React escaped Textausgaben automatisch. Die gefundene Verwendung von
  `dangerouslySetInnerHTML` in `layout.tsx` enthält ein festes Skript ohne
  Nutzereingaben.
- E-Mails verwenden `text`, kein aus Nutzereingaben zusammengesetztes HTML.
  Betreffzeilen werden auf eine Zeile begrenzt, auch bei älteren gespeicherten
  Werten. Der SMTP-Transport erlaubt keine Datei- oder URL-Inhaltsauflösung.
- Kalenderexporte maskieren Backslashes, Kommas, Semikolons und sämtliche
  Zeilenumbruchvarianten einschließlich einzelner Wagenrücklaufzeichen.
- Datenbankwerte werden über Prisma übergeben. Die Prüfung fand keine
  Verwendung von `$queryRawUnsafe` oder `$executeRawUnsafe` im Anwendungscode.

Neue HTML-E-Mails, Rich-Text-Editoren, CSV-Exporte oder andere Ausgabekontexte
brauchen jeweils eine eigene passende Ausgabeaufbereitung. Diese Regeln sind
kein universeller HTML-Sanitizer und ersetzen keine Berechtigungsprüfung.

## Verifikation

Regressionstests prüfen HTML als ungefährlichen Text, mehrzeilige Notizen,
Steuerzeichen, E-Mail-Injektion, JSON-Schlüssel und Verschachtelung, unveränderte
Passwörter sowie die tatsächlich zurückgegebenen Plan-/Vorlagenobjekte und
Kalender-/Mail-Encoding. Änderungen erfolgen lokal ohne Datenmigration oder
Versand von Nachrichten.
