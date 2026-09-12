# Inhaberschaft und EM Free

Free enthält einen Trainerplatz: den Inhaber (`Club.ownerUserId`). Seine technische
Mannschaftsrolle bleibt `admin`, damit die bestehenden Trainer- und Verwaltungsfunktionen
weiter funktionieren. Weitere Admin- und Trainerzugänge pausieren in Free, auch bei
Lizenzablauf. Eltern und Spieler bleiben berechtigt. Pro schaltet zusätzliche
Mannschaftsrollen wieder frei.

## Vor dem Deployment: TP_Admin absichern

Das bestehende Konto wurde am 12.09.2026 ausschließlich lesend geprüft: `tp_admin`,
Prisma-ID `admin-1`, aktiv, Mannschaftsrolle `admin`, `clubAdmin=true`. Lokal ist die
Freischaltung gesetzt. In Vercel vor dem Deployment `PLATFORM_ADMIN_USER_IDS=admin-1`
hinterlegen (gegebenenfalls an vorhandene geprüfte IDs anhängen).

1. Bei einer anderen Umgebung das Betreiberkonto eindeutig prüfen: `node scripts/inspect-ownership.mjs <E-Mail>`.
   Der Befehl liest nur Konto-ID, Name und Mitgliedschaften; er verändert nichts.
2. Die geprüfte ID als `PLATFORM_ADMIN_USER_IDS` in der Serverumgebung (Vercel) setzen.
   Mehrere ausdrücklich berechtigte Betreiber-IDs sind kommasepariert möglich.
   Keine E-Mail, kein Anzeigename und keine `NEXT_PUBLIC_`-Variable verwenden.
3. Erst danach die Migration `202609120001_club_ownership` mit dem üblichen
   `npm run db:deploy` ausführen und die neue App veröffentlichen.

Die Migration übernimmt je Verein den ältesten aktiven Lizenzadministrator,
bevorzugt `clubAdmin`, ersatzweise einen vorhandenen Admin. Sie löscht oder sperrt
keine Konten. Vereine ohne gültigen Admin bleiben ohne Inhaber; hierfür muss ein
Betreiber die Zuordnung nach Prüfung korrigieren. Bei mehreren bisherigen Admins
vorher kontrollieren, wer tatsächlich verantwortlich sein soll. Der separate
Plattformzugang schützt TP_Admin unabhängig von dieser Zuordnung.

Plattformberechtigungen sind unabhängig vom Tarif, gelten für Daten aber weiterhin
nur in aktiv zugeordneten Mannschaften. Kein automatischer Zugriff auf fremde Vereine.
Ausdrücklich deaktivierte Konten bleiben gesperrt. Ohne aktive Zuordnung bleibt die
Anmeldung möglich, aber es werden keine fremden Mannschaftsdaten freigegeben.
Ein pauschales Support-/Impersonation-System ist nicht Bestandteil dieser Änderung.

## Übergabe

Unter Lizenz → Inhaberschaft erstellt der aktuelle Inhaber nach Bestätigung einen
sieben Tage gültigen, E-Mail-gebundenen Link. Er gibt ihn persönlich weiter. Ein
neuer Link ersetzt den vorherigen, Zurücknehmen macht ihn ungültig. Es werden keine
E-Mails automatisch versendet. Der Empfänger meldet sich über Firebase an und
bestätigt ausdrücklich die Übernahme. Claim und Übergabe erfolgen in einer
serialisierbaren Datenbanktransaktion. Ein konkurrierender Eigentümerwechsel,
Widerruf oder Tarifwechsel verhindert widersprüchliche Teiländerungen.

Bei Vereinslizenzen wird die gesamte Lizenz samt Verein übergeben, ausdrücklich in
beiden Ansichten erklärt. Der bisherige Inhaber verliert `clubAdmin` und wird Trainer;
in Free pausiert dadurch sein Zugang, in Pro bleibt er Trainer. Sein Konto, Historie
und Elternverknüpfungen werden nicht gelöscht. Ein ausdrücklich freigeschaltetes
Plattformkonto behält seine Administration in der zugeordneten Mannschaft.

## Prüfung nach Deployment

- TP_Admin anmelden und seine bestehende Mannschaft öffnen.
- Free mit Inhaber, zusätzlichem Admin, Trainer, Spieler und Elternkonto prüfen.
- Übergabe vorbereiten: alter Inhaber bleibt aktiv; zurückgenommener Link scheitert.
- Übergabe mit separatem Testkonto annehmen: neuer Inhaber aktiv, alter Trainer in
  Free pausiert, Spieler-/Elternrückmeldungen und Historie unverändert.
- Upgrade, Downgrade und Lizenzablauf prüfen; archivierte Teams bleiben geschützt.

Lokal wurden keine produktiven Rollen geändert und keine Migrationen auf eine
Produktionsdatenbank angewandt. Die Freischaltung des Betreiberkontos muss vor dem
Rollout anhand der echten Konto-ID erfolgen.

## Vereins-Beta: Lizenzverwaltung ausblenden

`LICENSE_SELF_SERVICE_ENABLED=false` sperrt Tarifwechsel für alle normalen Konten,
auch Mannschaftsinhaber. Ohne gesetzte Variable ist die Sperre ebenfalls aktiv.
Nur die ausdrücklich über `PLATFORM_ADMIN_USER_IDS` freigeschalteten Betreiber
sehen Lizenz & Abrechnung und können im bereits zugeordneten Vereinskontext den
Tarif ändern. Es entsteht kein Zugriff auf fremde Vereine.

Die App blendet Lizenzmenüs und Ablaufhinweise anhand einer serverseitig berechneten
Berechtigung aus. Beide Tarif-Endpunkte prüfen dieselbe Regel. Die Upgrade-Werbung
in der Mannschaftsansicht wurde durch neutrale Zugangsinformationen ersetzt.
Bestehende Tarife, Ablauffristen, Mannschaftsrollen und Daten werden nicht geändert.
Für einen ununterbrochenen Beta-Test daher weiterhin auf gültige Testfreischaltungen
achten. Die Einstellung verlängert keine ablaufenden Lizenzen automatisch.

Später schaltet ausschließlich der exakte Wert `true` die öffentliche
Lizenzverwaltung für Inhaber wieder ein. Andere Trainer erhalten dadurch keine
Tarifberechtigung. Für diese Änderung ist keine Datenbankmigration nötig, nur ein
neues Deployment. Die Zuordnung des geschützten Plattformkontos bleibt bestehen.
