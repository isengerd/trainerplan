# Sicherheitsprüfung vom 12.09.2026

## Umfang und Ergebnis

Geprüft wurden insbesondere Anmeldung, Mannschaftsberechtigungen, Profilfreigaben,
Lizenzprüfungen, Einladungsannahme sowie die Schreibwege für Termine und Übungen.
Die unten beschriebenen Korrekturen sind lokal umgesetzt. Es wurde weder ein
Deployment noch eine Änderung an Produktionsdaten durchgeführt. Eine
Datenbankmigration ist für diese Änderungen nicht erforderlich.

Die Prüfung ist keine vollständige Sicherheitszertifizierung und kein externer
Penetrationstest. Nicht jeder Endpunkt und nicht jede Kombination aus Rollen und
gleichzeitigen Anfragen wurde dynamisch geprüft.

## Behobene Befunde

| Priorität | Befund | Korrektur |
| --- | --- | --- |
| Hoch | Sammelspeicherung von Terminen und Speicherung von Übungen konnten bestehende IDs ohne ausreichende Prüfung der Mannschaftszuordnung aktualisieren. | Bestehende Datensätze werden vor dem Schreiben innerhalb einer serialisierbaren Transaktion auf Verein und Mannschaft geprüft. Fremde und unzugeordnete IDs werden abgewiesen. Systemübungen müssen als eigene Kopie gespeichert werden. |
| Hoch | Die Mitgliederantwort lieferte interne Bewertungen und interne Einteilungen auch an Spieler und Eltern aus. | Diese Felder werden für diese Rollen serverseitig neutralisiert; die gespeicherten Bewertungen bleiben erhalten. |
| Mittel | Profiländerungen und Änderungen der Mitgliedschaftsrolle wurden getrennt gespeichert. | Gemeinsame Transaktion mit erneuter Prüfung der aktuellen Mitgliedschaft und Berechtigung. Verwaltete Kinderprofile können über diesen Weg keine Personalrolle erhalten. |
| Mittel | Unbekannte Lizenzwerte konnten als Pro interpretiert werden. | Unbekannte Werte und ungültige Ablaufdaten fallen auf Free zurück; bekannte historische Lizenzbezeichnungen bleiben unterstützt. |
| Mittel | JSON-Größenbegrenzung griff erst nach vollständigem Einlesen des Bodys. | Begrenzung während des Einlesens, einschließlich Anfragen ohne Content-Length. |
| Härtung | Nicht alle Sitzungsprüfungen prüften standardmäßig den Firebase-Widerruf. | Widerrufsprüfung ist jetzt standardmäßig aktiv. Dadurch können zusätzliche Firebase-Abfragen entstehen. |
| Härtung | Einige Authentifizierungs-, Onboarding- und Push-Endpunkte konnten technische Fehlermeldungen ausgeben. | Nur ausdrücklich als Eingabefehler gekennzeichnete Meldungen werden dort weitergegeben. |
| Härtung | Einladungsannahme akzeptierte unzureichend geprüfte Eingabetypen. | Typ- und Längenprüfung der relevanten Felder sowie explizite Prüfung der Übergabebestätigung. |

Zusätzlich verwendet die Übungsbearbeitung jetzt den tatsächlich aktiven
Mannschaftskontext. Unzugeordnete Termine werden nicht mehr automatisch in allen
Mannschaften angezeigt. Dabei werden keine bestehenden Termine gelöscht.

## Verifikation

- `node --import tsx --test src/lib/*.test.ts`: 76 Tests bestanden, kein Fehler.
- Neue Regressionstests für fremde Ressourcen-IDs, Profilfreigaben, ungültige
  Lizenzen, gestreamte Größenbegrenzung, UTF-8-Grenzen und CSRF-Origin-Prüfung.
- `npm run build`: erfolgreich, einschließlich Typprüfung.
- `git diff --check`: erfolgreich.

Die neuen Integrationstests verwenden nachgebildete Datenbankzugriffe. Sie prüfen
die serverseitigen Kontrollflüsse, aber nicht das tatsächliche Sperrverhalten
einer Produktionsdatenbank bei konkurrierenden Transaktionen.

## Verbleibende Grenzen und nächste Schritte

- Der externe Abhängigkeitsabgleich mit `npm audit` wurde durch die automatische
  Freigabeprüfung blockiert, da dabei die Abhängigkeitsliste an npm übertragen
  wird. Ohne Zustimmung wurde dieser Schritt nicht erneut versucht. Es liegt
  deshalb keine aktuelle Aussage über bekannte Schwachstellen aller Pakete vor.
- Die bestehende Content Security Policy erlaubt weiterhin Inline-Skripte.
  Eine Umstellung auf Nonces sollte separat mit Next.js-Rendering und den
  verwendeten Diensten getestet werden.
- Ein Last- und Parallelitätstest, insbesondere für Teilnahmebegrenzungen und
  Rollenwechsel, sowie ein Test gegen die tatsächlich bereitgestellte Anwendung
  bleiben sinnvoll. Ein erfolgreicher Build belegt diese Eigenschaften nicht.
- Infrastruktur, Firebase-/APNs-Konfiguration und produktive Geheimnisse wurden
  nicht vollständig auditiert. Es wurden keine Testnachrichten versendet.

## Referenzen

Die Prüfung der Mannschafts- und Objektberechtigungen orientiert sich an
[OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html):
Berechtigungen serverseitig bei jeder Anfrage prüfen und Zugriff standardmäßig
verweigern.

Die Origin-Prüfung für schreibende Browseranfragen wurde anhand des
[OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
abgeglichen und mit Regressionstests ergänzt.
