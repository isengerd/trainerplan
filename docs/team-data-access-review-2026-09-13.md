# Datenabruf und Abhängigkeiten – 13.09.2026

## Antwort zur Mannschaftstrennung

Die Benutzer-ID wird aus der geprüften Sitzung bestimmt. `accountMembershipAccess`
lädt Mitgliedschaften mit `where: { userId }`. `membershipAllowsAccess` prüft den
Status, eine aktive Mannschaft und die lizenzabhängige Zugangsberechtigung.
`activeClubScope` leitet daraus Verein und Mannschaft ab. Die Datenabfragen
verwenden anschließend diese serverseitig ermittelten IDs. Eine Team-ID aus einer
URL ist keine Zugangsberechtigung; Benutzer-ID und Team-ID müssen nicht identisch
sein, sondern durch eine gültige Mitgliedschaft verbunden sein.

Bei Einzelressourcen muss zusätzlich die angeforderte ID innerhalb dieses
Bereichs gefunden werden. Beispielsweise lädt der Turnier-Endpunkt das Ereignis
mit `id`, `clubId` und `teamId`, bevor er Einteilungen ausliefert.

Dieses Vorgehen entspricht dem
[OWASP-Leitfaden zur Vermeidung von IDOR](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html).

## Nachprüfung und Korrekturen

Die vorherige Korrektur des Kalenderabrufs deckte den separaten Bootstrap-Abruf
nicht ab. Dort wurden weiterhin unzugeordnete Termine und Turniereinteilungen
zusätzlich ausgeliefert. Diese Ausnahme wurde jetzt auch dort entfernt.

- Bootstrap lädt Termine und Einteilungen ausschließlich im aktiven Teamkontext.
- Ohne Mitgliedschaft liefert Bootstrap keine Termine, Einteilungen, Pläne,
  Vorlagen oder Planmetadaten. Auch der separate Trainingsplanabruf liefert keine
  globalen Ersatzpläne mehr.
- Der gemeinsame Datenbankfilter enthält `teamId` auch dann ausdrücklich, wenn
  sie null ist. Ein fehlendes Team erweitert ihn nicht auf den ganzen Verein.
- Beim erstmaligen Anlegen einer fehlenden Teamkonfiguration werden keine
  privaten Pläne, Vorlagen oder Planmetadaten aus alten Konfigurationen kopiert.
  Bereits vorhandene Teamkonfigurationen werden nicht verändert oder gelöscht.

## Geprüfte Abrufwege und beabsichtigte Ausnahmen

| Bereich | Zugangskontrolle |
| --- | --- |
| Bootstrap, Termine, Kalenderexport | Authentifizierter Benutzer und aktiver Mannschaftskontext |
| Benutzerliste | Mitgliedschaften der aktiven Mannschaft, zusätzliche Feld-/Rollensichtbarkeit |
| Trainingspläne, Vorlagen, Übungen | Trainer-/Adminrolle und aktiver Mannschaftskontext; gemeinsame Systemübungen sind ausdrücklich freigegeben |
| Turniereinteilungen | Ereignis-ID innerhalb der Mannschaft; Veröffentlichung und Zuordnung für Spieler/Eltern |
| Eltern- und Spielereinladungen im Profil | Rolle und Zielspieler-/Einladungszuordnung im aktiven Team |
| Familienübersicht | Verknüpftes Kind und zugängliche Mannschaft aus dem Organisationskontext; bewusst mehrere Mannschaften möglich |
| Organisationsübersicht | Aktive Mitgliedschaften; Vereinsadministration darf im Rahmen ihrer Rechte weitere Mannschaften sehen |
| Eigene Sitzung | Identität aus der Sitzung, keine beliebige Benutzer-ID aus dem Request |
| Einladungsannahme | Bewusst vor Mitgliedschaft nutzbar; Einladungstoken mit Ablaufprüfung statt Teammitgliedschaft |

Altersklassen und Systemübungen sind gemeinsame Kataloge. Vereinsweite
Funktionsgruppen sind vereinsbezogen. Diese Daten sollen nicht wie private
Mannschaftstermine behandelt werden.

## Tests

82 Tests erfolgreich; Produktionsbuild und `git diff --check` erfolgreich.
Die sechs zusätzlichen Tests prüfen insbesondere:

- fremde Benutzer-/Team-/Vereins-Parameter im Bootstrap-Abruf;
- 401 ohne Sitzung, ohne vorherigen Zugriff auf Mannschaftstermine;
- keine Mannschaftsinhalte beim Onboarding ohne Mitgliedschaft;
- kein vereinsweiter Filter bei fehlender Team-ID;
- 404 bei fremder Termin-ID vor Laden der Einteilung;
- keine Übernahme privater Trainingsinhalte beim Konfigurations-Fallback.

Die Integrationstests führen echte Route-/Servicefunktionen mit nachgebildeten
Datenbankzugriffen aus. Eine Prüfung gegen zwei reale Produktionsteams oder ein
vollständiger Parallelitäts-/Penetrationstest wurde nicht durchgeführt.

## npm-Audit nach Freigabe

`npm audit --omit=dev --json` meldete zunächst 15 betroffene Pakete: einen
kritischen, sechs hohe und acht mittlere Befunde. Das sind Paketmeldungen,
nicht 15 unabhängig nachgewiesene Angriffswege in NextSession.

Aktualisiert wurden Next.js auf 15.5.25, Nodemailer auf mindestens 9.1.1,
Firebase Admin auf 14.4.0 sowie kompatible indirekte Pakete, einschließlich
Sharp und Nanoid. Firebase Admin 14 benötigt Node.js ab 22; diese Voraussetzung
ist jetzt in `package.json` angegeben. Vor dem Deployment muss die Vercel-Runtime
dazu passen. Die verwendeten modularen Auth-/Messaging-Imports bleiben kompatibel.
Siehe [offizielle Firebase-Migrationshinweise](https://firebase.google.com/support/release-notes/admin/node).

Der abschließende Produktionsaudit meldet **5 betroffene Pakete, keine kritischen
Befunde, 3 hohe und 2 mittlere**:

- `deepmerge-ts`, `@prisma/config`, `prisma`: dieselbe transitive Meldung zur
  Erschöpfung des Stacks beim Mischen rekursiver Objekte. Im geprüften Projekt
  liegt dieser Code im Prisma-Konfigurationswerkzeug; kein direkter Import in
  API-Routen wurde gefunden. npm schlägt einen Prisma-Downgrade auf 6.12.0 vor.
  Dieser wurde nicht automatisch durchgeführt. Das ist ein offener Befund,
  keine bestätigte Unbedenklichkeit.
- `uuid`, `gaxios`: transitive Meldung zu Buffer-Grenzprüfungen bestimmter
  UUID-Funktionen im Cloud-Storage-Abhängigkeitszweig. Ein kompatibles `npm update`
  beseitigte diese Meldung nicht. NextSession verwendet dort aktuell Auth und
  Messaging, nicht direkt Cloud Storage; die Pakete bleiben dennoch betroffen.

Es wurden keine erzwungenen Major-Overrides zum bloßen Unterdrücken von
Auditmeldungen gesetzt. Für die verbleibenden Befunde sind gezielte
Abhängigkeitsmigrationen mit Kompatibilitätsprüfung erforderlich. Der Audit
umfasst Produktionsabhängigkeiten, nicht den gesamten Entwicklungswerkzeugbaum.

Alle Änderungen sind lokal. Kein Deployment, keine Produktionsdatenänderung,
keine versendeten E-Mails oder Push-Nachrichten. TP_Admins Identität und
Plattformadmin-Konfiguration wurden nicht geändert.
