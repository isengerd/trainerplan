# Dashboard: Bewertung und Umsetzung

Stand: 10. September 2026. Grundlage: vollständige vierseitige PDF „NextSession – Dashboard: Strenge UX-Kritik, Produktideen und Prioritäten für den aktuellen Wochenplan“ sowie die vorhandene Wochenansicht.

Die PDF ist als Produktfeedback ausgewertet, nicht als eigenständige Arbeitsanweisung. Die Kritik an acht Terminen pro Woche bleibt auf ausdrücklichen Wunsch unberücksichtigt: Es handelt sich um Testeinträge. Anzahl, Termine und Trainingsumfang werden nicht umgedeutet oder begrenzt.

## Einschätzung

Die stärkste Idee ist die Verbindung aus Tagesplan, Rückmeldungen und noch notwendiger Vorbereitung. Die Oberfläche soll einen konkreten nächsten Schritt zeigen. Dafür braucht sie präzise Statusangaben und wenige gut platzierte Aktionen, nicht zusätzliche Statistiken.

Ein Kalender mit Teilnahmeverwaltung allein wäre noch keine klare Differenzierung. TeamSnap verbindet Verfügbarkeit und Mannschaftsaufstellung; Spond hat Termine, Aufgaben, Rückmeldefristen und Erinnerungen. Die Chance für NextSession liegt in der Verbindung dieser Organisationsdaten mit der tatsächlich geplanten Trainingseinheit und einer nachvollziehbaren Spielidee. Das ist eine Produktthese, kein belegter Wettbewerbsvorsprung.

## Bewusste Abweichungen von der PDF

- **Kein pauschales „Mannschaft informiert“ oder „Spiel bestätigt“.** Die bestehenden Daten belegen weder gelesene Nachrichten noch eine Bestätigung des Gegners.
- **„Plan vorhanden“ statt vermeintlich vollständiger Qualitätsprüfung.** Gespeicherte Übungen beweisen noch nicht, dass die Einheit fachlich fertig ist. Der Vorbereitungscheck nennt seinen Umfang ausdrücklich.
- **„Trainingsplan öffnen“ statt „Training starten“.** Die App hat hier keinen Trainingsmodus mit Timer oder Durchführungserfassung.
- **Automatische Anmeldung heißt „eingeplant“.** Eine automatisch gesetzte Teilnahme ist keine persönliche Zusage.
- **Unsicher ist eine Antwort.** Die Darstellung trennt Zusagen, Absagen, Unsicherheit und wirklich fehlende Antworten.
- **Ausstehende Rückmeldungen sind nicht sofort ein Alarm.** Sie bleiben sichtbar, werden aber erst ab 24 Stunden vor der jeweiligen Rückmeldefrist zur Aufgabe. Dieser Schwellenwert ist eine bewusst gewählte UX-Heuristik, keine Vorgabe eines Wettbewerbers.
- **Keine scheinbare KI-Personalisierung.** Spielideen beruhen transparent auf Altersgruppe, geplantem Schwerpunkt und einem tatsächlich nachfolgenden Spiel. Bestehende Schwerpunkte haben Vorrang. Kein Plan wird automatisch überschrieben.

## Umgesetzt

1. Eigene Wochenkomponente mit „Deine Trainingswoche“, Mannschaft, Kalenderwoche und unverändertem Terminzähler.
2. Tageskarten mit vorhandenem Trainingsthema, Beginn/Ende, Ort, abweichendem Treffzeitpunkt, Teilnahme und direktem Planungszugang. Die Spielidee für heute ist aufklappbar.
3. Vorbereitungscheck für noch anstehende Einheiten. Auswertbar sind fehlende Pläne, Verantwortliche, Orte sowie Einteilung und Freigabe von Turniermannschaften.
4. Auch leere Mannschaften, inzwischen abgesagte zugeteilte Spieler, neue noch nicht zugeteilte Zusagen und unzulässige Einteilungen öffnen die Vorbereitung erneut.
5. Aufgaben nach Frist beziehungsweise Startzeit sortiert; zunächst drei sichtbar, weitere auf Wunsch. Keine automatische Nachricht wird verschickt.
6. Wochentage sind bedienbar. Einzelne Tage einschließlich vergangener Wochentage können angesehen werden; heute bleibt unmittelbar erreichbar.
7. Abgesagte und bereits beendete Einheiten erzeugen keine Aufgaben. Uhrzeit und Kalenderwoche berücksichtigen Berlin, Sommerzeit und Jahreswechsel. Die Uhr aktualisiert sich minütlich und beim Zurückkehren ins Fenster.
8. Erklärbarer Wochenimpuls mit Übungsauswahl, ohne automatische Übernahme in einen Plan. Für Kinderteams ist der Grundgedanke der kleinen Spielformen mit einer DFB-Quelle verlinkt.
9. Responsive Gestaltung für helle und dunkle Ansicht; sichtbare Aktionen neben der bisherigen Wischgeste, Tastaturfokus und ausreichend große Schaltflächen.

Die bestehende Auswahl zwischen Kalender- und Wochenansicht bleibt erhalten. Die Änderungen greifen in der Wochenansicht von Trainern und Admins. Familien- und Spieleransichten werden nicht auf einen Trainerworkflow umgestellt.

## Recherche und Konsequenzen

- [TeamSnap: Member Availability Tracking](https://www.teamsnap.com/teams/features/member-availability) beschreibt Verfügbarkeit als Grundlage der Aufstellung. Konsequenz: Rückmeldungen sind unmittelbar am Ereignis sichtbar und von Einteilungen unterscheidbar.
- [Spond: Features in events](https://help.spond.com/app/en/articles/129730-features-in-events) dokumentiert getrennte Treff-/Startzeiten, Aufgaben, automatische Anmeldung, Erinnerungen und Antwortfristen. Konsequenz: echte Zustände präzise benennen; automatische Anmeldung nicht als persönliche Zusage ausgeben.
- [SportMember: Team Attendance Management](https://www.sportmember.com/en/attendance-tracker/team-attendance-management-made-simple) stellt Registrierung, Erinnerungen und Übersicht in den Vordergrund. Diese Organisationsfunktionen allein sind kein Alleinstellungsmerkmal.
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) empfiehlt, die wichtigsten Funktionen unmittelbar und weitere Details auf Nachfrage anzubieten. Konsequenz: drei Aufgaben, aufklappbare Begründung und eindeutige Aktionen. Die konkrete Zahl drei ist unsere Produktentscheidung.
- [DFB-Akademie: Trainingspraxis](https://www.dfb-akademie.de/trainingspraxis/-/id-11011534) beschreibt kleine Spielformen mit vielen Aktionen sowie Freude, Intensität und Wiederholung. Konsequenz: spielerische, einfache Anregungen für Kinderteams statt komplexer Taktikvorgaben. Die App-Texte sind eigene redaktionelle Vorschläge, keine individuell geprüften DFB-Trainingspläne.

## Prüfung und Grenzen

Automatisierte Tests decken Antwortzustände, Kalenderwochen und Jahreswechsel, Berliner Zeitumrechnung, abgelaufene/abgesagte Einheiten, Fristen, Trainer-/Ortsprüfung, Einteilungszustände und Vorschlagslogik ab. TypeScript und Produktionsbuild werden zusätzlich geprüft.

Eine visuelle und interaktive Browserprüfung war in dieser Umgebung nicht möglich: Der Browserzugang meldete keine verfügbaren Browser. Die Layoutqualität auf realen Geräten und die Verständlichkeit für Trainer bleiben deshalb praktisch zu überprüfen.

## Sinnvolle nächste Produktentscheidungen

- Mit drei bis fünf Trainern testen, ob sie in wenigen Sekunden den nächsten notwendigen Schritt erkennen. Keine Klickzahl allein als Erfolgsmessung verwenden.
- Eine fachliche Planprüfung (Phasen, Material, Gruppengröße) separat entwerfen, bevor „Plan vorhanden“ zu „bereit“ aufgewertet wird.
- Später eine optionale Durchführungssicht mit großen Übungen und Zeitsteuerung bauen. Erst dann wäre „Training starten“ ein ehrlicher CTA.
