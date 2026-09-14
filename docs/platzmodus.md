# Platzmodus

## Ablauf

Im Trainingsplan öffnet **Training starten** eine eigene Ansicht unter `/platz`.
Der aktuelle Plan wird vorher als lokale Momentaufnahme gespeichert. Übungen
folgen der Phasenreihenfolge. Ein laufendes Training lässt sich fortsetzen oder
mit dem aktuellen Plan neu beginnen, ohne den alten Ablauf zu überschreiben.

- Große Übungsüberschrift, Aufbauskizze und maximal drei vorhandene Coachingpunkte.
- Skizze als vergrößerbarer Dialog; Escape/Zurück schließt ihn entsprechend der
  Browserunterstützung. Material und Organisationsbeschreibung sind aufklappbar.
- Timer mit Start/Pause und +2 Minuten. Kein automatischer Übungswechsel.
- Die gespeicherte Endzeit übersteht Neuladen und Hintergrundphasen. Nach Ablauf
  zeigt der Timer die zusätzliche Zeit. Spätere Übungen werden nicht gekürzt.
- Nächste Übung, Überspringen und Rückgängig. Horizontales Wischen in der
  Übungsfläche ist eine zusätzliche Bedienmöglichkeit; Buttons bleiben verfügbar.
  Bildschirmränder und interaktive Felder lösen keine Übungswechsel aus.
- Die vorgesehene Spielerzahl steht unter „Aufbau & Material“. Das Ändern der
  Spielerzahl ist vorerst entfernt, bis eine sinnvolle Übungsanpassung umgesetzt ist.
- Freiwillige Bewertung nach der Übung oder gesammelt am Ende. Bei „Schwierig“
  sind drei optionale Gründe verfügbar. Übersprungene Übungen müssen nicht bewertet
  werden. Diese Daten erzeugen noch keine automatischen Übungsempfehlungen.

## Offline und Speicherung

Der lokale Snapshot enthält Übungen, Aufbauskizzen-Varianten, Fortschritt, Timer,
Spieleranzahl und Bewertungen. Individuelle Trainerzuordnungen und interne
Einteilungen werden entfernt; es wird keine Kaderliste kopiert.

Ein auf `/platz` begrenzter Service Worker speichert ausschließlich die öffentliche
Ansicht und ihre statischen Build-Dateien. Keine API-Antworten, Cookies oder
authentifizierten HTML-Seiten werden gecacht. Der Worker wird nach jedem
Produktionsbuild mit einer neuen Cache-Version erzeugt. Die generierte Datei
`public/platz-sw.js` ist absichtlich nicht versioniert.

Nach erfolgreicher Vorbereitung ist `/platz?session=…` auch ohne Serververbindung
neu ladbar. Ohne Service-Worker-Unterstützung bleiben Plan und Fortschritt lokal;
die geöffnete Ansicht funktioniert ohne Netz weiter. Ein entsprechender Hinweis
erklärt, dass ein Offline-Neustart dann nicht zugesichert ist.

Die gespeicherten Einheiten sind an das lokale Konto und die jeweilige Mannschaft
gebunden. Kontowechsel oder explizites Abmelden entfernt die lokalen Einheiten
einschließlich noch nicht synchronisierter Bewertungen. Snapshots werden nach
30 Tagen nicht mehr geöffnet. Browser können lokalen Speicher eigenständig
löschen. Offline-Zugriff auf bereits heruntergeladene Inhalte lässt sich nicht
sofort durch einen serverseitigen Rechteentzug widerrufen.

Bewertungen werden mit Wiederholbarkeit ohne Duplikate an die API gesendet.
Die Sitzung muss zum gespeicherten Benutzer und zur aktiven Mannschaft passen.
Bei Fehlern bleiben Bewertungen lokal; erneutes Öffnen des Platzmodus bzw. der
passenden Mannschaft versucht die Übertragung erneut. Die lokale Speicherung
ist keine geräteübergreifende Fortschrittssynchronisierung.

## Einführung

Vor dem Deployment die Migration ausführen:

```sh
npm run db:deploy
```

Die Migration `202609140001_training_feedback` legt ausschließlich die Tabelle
für Übungsbewertungen an. Sie wurde vorbereitet, aber nicht auf Produktion
ausgeführt. Danach wie gewohnt mit `npm run build` bauen/deployen; dieses Kommando
erzeugt auch den Worker. Ohne Migration bleibt die Bewertungsübertragung erfolglos,
die Bewertungen bleiben lokal erhalten.

## Verifikation

- 96 lokale Tests bestanden, einschließlich neuer Timer-/Snapshot- und
  Autorisierungstests für die Bewertungs-API.
- Produktionsbuild und Typprüfung erfolgreich.
- Browserprüfung bei 390 × 844 Pixeln sowie Desktopansicht mit synthetischem
  Training: Timer, +2 Minuten, Neuladen, Pause, Wechsel, Überspringen/Rückgängig,
  Spielerzahl, vergrößerte Skizze, Abschluss und Bewertung.
- Lokalen Server gestoppt und Seite erneut geladen: Übungen, Timer und Skizzen
  weiterhin verfügbar. Bewertung und Grund über erneutes Neuladen erhalten.
- Kein Versand an reale Nutzer, keine Produktionsdatenänderung. Die temporäre
  Vorschauseite wurde entfernt.

Noch auf realem iPhone/TestFlight prüfen: Zurück-/Wischgesten, Display-Sperre,
optional unterstütztes Screen Wake Lock und App-Kaltstart. Das Offline-Laden des
Platzmodus erweitert nicht automatisch die ganze Anwendung um einen Offline-Start.
Eine echte Bewertungssynchronisierung auf dem Zielsystem ist nach der Migration
mit Testkonto zu verifizieren.

Technische Orientierung:
[MDN: Offline-Funktionalität](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
und [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).
