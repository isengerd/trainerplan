# Sicherheitschecks

Bei zukünftigen Sicherheitsprüfungen in diesem Repository zuerst
`docs/security-checks.local.txt` lesen und die dort beschriebenen Verfahren auf
die betroffenen Änderungen anwenden. Ergebnisse, nicht ausgeführte Prüfungen
und verbleibende Befunde ausdrücklich dokumentieren.

Die Checkliste ist absichtlich lokal und durch `.gitignore` ausgeschlossen.
Falls sie in einem anderen Checkout fehlt, die versionierten Sicherheitsberichte
und Regressionstests als Grundlage verwenden und die fehlende lokale Checkliste
im Ergebnis erwähnen. Keine erfolgreiche Prüfung behaupten, ohne sie auszuführen.

Keine Geheimnisse oder personenbezogenen Produktionsdaten in Berichte aufnehmen.
Sicherheitsprüfungen allein autorisieren weder Produktionsdatenänderungen noch
das Versenden von E-Mails oder Push-Nachrichten.
