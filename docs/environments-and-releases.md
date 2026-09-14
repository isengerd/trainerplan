# Vereinsbeta: Produktion, Staging und Releases

Stand: 14.09.2026. Der Code und die Workflows sind vorbereitet. Die Cloud-Projekte,
Secrets, Schutzregeln und native Test-App sind erst nach der Einrichtung betriebsbereit.
Ein erfolgreicher lokaler Build ist kein Nachweis einer eingerichteten Cloud-Trennung.

## Architektur

| | Vereinsbeta / Produktion | Staging |
|---|---|---|
| Domain | https://nextsession.de | https://staging.nextsession.de |
| Vercel | bestehendes Projekt | neues Projekt `nextsession-staging` |
| APP_ENV | production | staging |
| Neon | bestehende Datenbank | neues, leeres Projekt, eigene Zugangsdaten |
| Firebase | bestehendes Projekt | neues Projekt, eigene Web- und iOS-App |
| Daten | echte Vereinsdaten | ausschließlich synthetische Testdaten |
| iOS Bundle-ID | de.nextsession.kids | de.nextsession.kids.staging |
| GitHub Environment | production | staging |

Beide Vercel-Projekte nutzen ihre jeweilige **Production**-Konfiguration. Das ist
Vercels Deployment-Ziel, nicht die fachliche Umgebung. `NODE_ENV=production` gilt
auch in Staging; `APP_ENV` unterscheidet sie. Keine Produktionsdaten in Neon-Branches
für Tests kopieren. Die unabhängigen erwarteten Ressourcen-IDs in GitHub schützen
gegen vertauschte Vercel-Variablen; ihre erste Einrichtung muss man selbst prüfen.

## Einmalige Einrichtung (in dieser Reihenfolge)

1. Bestehendes Produktionssystem behalten. Keine Benutzer neu seeden und keine
   Produktions-Firebase-Projekte ersetzen. Backup-/Wiederherstellungsmöglichkeit in
   Neon prüfen und eine Wiederherstellung in eine isolierte Datenbank testen.
   Wiederhergestellte echte Daten dürfen nicht in das normale Staging gelangen.
2. Neues Neon-Projekt in Frankfurt erstellen. Eine leere Datenbank und eigene
   Zugangsdaten verwenden. Pooling-URL mit `sslmode=require` in Staging eintragen.
3. Neues Firebase-Projekt erstellen. Die benötigten Auth-Verfahren entsprechend
   Produktion aktivieren, eine eigene Web-App registrieren und
   `staging.nextsession.de` als autorisierte Domain setzen. Eigenes Servicekonto
   für das Backend. Die Web-API-Kennung muss zu demselben Projekt gehören.
4. Neues Vercel-Projekt erstellen. Der Workflow lädt den Code aus demselben
   Repository per CLI hoch; eine Vercel-Git-Verknüpfung ist dafür nicht notwendig. Domain
   `staging.nextsession.de` zuordnen und DNS nach Vercels konkreten Angaben setzen.
   Bestehende Domain `nextsession.de` nicht verschieben. Node.js 22 einstellen.
   Vercel Deployment Protection für Staging aktivieren; wenn für CI erforderlich,
   einen Automation-Bypass nur als GitHub-Environment-Secret hinterlegen.
5. Server-Variablen im neuen Projekt aus `.env.staging.example` setzen. Keine Datei
   aus der Produktion kopieren. `STAGING_EMAIL_ALLOWLIST` zunächst leer lassen;
   nur eigene Testpostfächer einzeln freigeben. Push bleibt zunächst ausgeschaltet.
6. Im bestehenden Vercel-Projekt `APP_ENV=production` und
   `PUBLIC_APP_URL=https://nextsession.de` ergänzen. Vorhandene produktive
   Firebase-/DB-Zugangsdaten und **PLATFORM_ADMIN_USER_IDS=admin-1 erhalten**.
   In Staging eine eigene tatsächliche Prisma-Benutzer-ID freischalten. Keine
   Namen oder Firebase-UIDs eintragen. Eine neue Staging-Datenbank benötigt ein
   eigenes initiales Konto; siehe `firebase-auth.md` und `ownership-rollout.md`.
7. GitHub Environments `staging` und `production` anlegen, nur Branch `main`
   zulassen. Für `production` manuelle Reviewer-Freigabe aktivieren, sofern der
   GitHub-Tarif das unterstützt. Andernfalls ist der Workflow-Start selbst die
   Freigabe; Schreibrechte im Repository entsprechend begrenzen. `main` schützen:
   Checks erforderlich, keine Force-Pushes, Änderungen an Workflows überprüfen.
8. Variablen und Secrets laut Tabelle eintragen. Vor dem ersten Push dieser
   Änderung beachten: `vercel.json` deaktiviert automatische Git-Deployments für
   beide Projekte. Zusätzlich alte Deploy-Hooks entfernen/deaktivieren und
   Vercel-Git-Integration trennen, wenn auch Änderungen an `vercel.json` keinen
   automatischen Produktionsdeploy auslösen dürfen. Das laufende Deployment bleibt.
9. Ersten Staging-Release ausführen, Testkonten einrichten und Checkliste unten
   abarbeiten. Erst danach Produktion freigeben.

### GitHub-Konfiguration

Repository-Variablen (keine Passwörter):

- `PRODUCTION_VERCEL_PROJECT_ID`: bestehende Vercel-Projekt-ID.
- `PRODUCTION_DATABASE_HOST`: bestehender Neon-Hostname, ohne Benutzer/Passwort.
- `PRODUCTION_FIREBASE_PROJECT_ID`: bestehende Firebase-Projekt-ID.

Je GitHub Environment eigene Variablen:

- `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: Ziel-Team und Ziel-Projekt bei Vercel.
- `DATABASE_HOST`: erwarteter Neon-Hostname dieses Environments.
- `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`: erwartetes Firebase-Projekt und dessen
  Web-API-Key (öffentlich im Webclient, keine Admin-Zugangsdaten).

Je GitHub Environment eigene Secrets:

- `VERCEL_TOKEN`: Deployment-Zugang, auf die nötigen Ressourcen begrenzen.
- `VERCEL_AUTOMATION_BYPASS_SECRET`: falls Deployment Protection die Health-Prüfung
  blockiert. Kein globaler öffentlicher Bypass.

Anwendungs-Secrets liegen in Vercel, nicht in GitHub-Variablen. Der Release lädt sie
kurzzeitig auf einen flüchtigen Runner, prüft Ressourcen, baut und migriert. Keine
`.vercel`-Ordner, Env-Dateien oder Build-Artefakte mit Secrets als Artefakte hochladen.
Die Token-/Provider-Berechtigungen sind die tatsächliche Sicherheitsgrenze: Ein
Administrator mit direktem Vercel-Zugriff kann den Workflow umgehen.

## Übergang: automatische Veröffentlichung bleibt aktiv

Bis Staging und der Release-Workflow vollständig eingerichtet und erfolgreich
geprüft sind, bleibt Vercels Git-Integration aktiv (`git.deploymentEnabled: true`).
Pushes auf `main` veröffentlichen weiterhin auf nextsession.de. Die unten
beschriebene Produktionsfreigabe schützt diesen bisherigen Git-Deployment-Weg
noch nicht. Den manuellen Produktionsworkflow nicht parallel verwenden.

Erst nach einem erfolgreichen Staging-Durchlauf und vollständiger Konfiguration
die automatische Veröffentlichung abschalten und auf den folgenden Ablauf wechseln.

## Geplanter täglicher Ablauf nach der Umstellung

1. Feature-Branch erstellen, lokal entwickeln, Pull Request öffnen.
2. `Checks` führt Tests und Build ohne Cloud-Zugangsdaten aus.
3. Geprüfte Änderungen nach `main` übernehmen. Noch keine Veröffentlichung.
4. GitHub Actions → **Release** → **Run workflow** → `main`, Ziel `staging`.
5. Staging im Browser und mit Test-App prüfen. Commit und Ergebnisse notieren.
6. **Denselben Stand von main** mit Ziel `production` starten und die Bestätigung
   setzen. Wurde main inzwischen verändert, zuerst diesen neuen Stand auf Staging
   testen. Der Workflow verlangt einen erfolgreichen Staging-Deployment-Nachweis
   für denselben Commit. Es wird derselbe Quellstand mit produktiven Variablen
   neu gebaut, nicht das Staging-Bundle kopiert.
7. Produktionsfreigabe im GitHub Environment bestätigen. Tests → Konfiguration →
   Build → geprüfte Migrationen → Deployment → Live-Health-Prüfung.

Der Release-Workflow startet nur manuell auf `main`; normale Pushes führen nur
Checks aus. Keine Migrationen in PR-Checks und kein Seed im Release. Die Health-Prüfung
kontrolliert Commit, APP_ENV und Datenbankverbindung, ersetzt jedoch keine Login-/Rollenprüfung.

### Migration und Rückkehr zur vorherigen Version

Migrationen müssen mit der alten und neuen App kompatibel sein: zunächst ergänzen,
Daten übernehmen, erst in späterem Release alte Felder entfernen. SQL vor Freigabe
prüfen. Ein erfolgreicher Build beweist keine sichere Migration.

Bei fehlgeschlagenem Build wurde noch nicht migriert. Scheitert die Migration,
wird nicht veröffentlicht. Scheitert Deployment/Health nach Migration, kann die
Datenbank bereits geändert sein. Nicht blind Migrationen erneut starten oder die
Datenbank zurücksetzen. Fehler prüfen, gegebenenfalls vorheriges Vercel-Deployment
wieder aktivieren. Datenbankwiederherstellung ist eine gesonderte, bewusste Maßnahme;
sie kann inzwischen entstandene Vereinsdaten verlieren.

## Native Test-App

Die vorhandenen Ordner `ios/` und `android/` bleiben Produktion. `MOBILE_APP_ENV=staging`
verwendet die neue Kennung, den Namen **NextSession Test** und die separaten Ordner
`ios-staging/` und `android-staging/`. Kein Server-Umschalter für Vereinsnutzer.

Einmalig nach eingerichteter Staging-Domain:

```bash
MOBILE_APP_ENV=staging npx cap add ios
# Nur falls Android getestet werden soll:
MOBILE_APP_ENV=staging npx cap add android
npm run mobile:sync:staging
npm run mobile:open:ios:staging
```

Das erzeugt zunächst einen Capacitor-Rahmen, keine fertige Push-fähige TestFlight-App.
Eigenen Apple-App-Identifier und App-Store-Connect-Eintrag anlegen, Signierung,
Firebase-SPM-Paket, AppDelegate-/SceneDelegate-Anbindung und Push-Capabilities aus
unserer nativen Integration übernehmen und überprüfen. **Nicht** die produktive
`GoogleService-Info.plist` übernehmen: eine Datei für die Staging-Bundle-ID aus dem
Staging-Firebase-Projekt verwenden. APNs-Production-Key für TestFlight konfigurieren.
Ein deutlich abweichendes Test-Icon fehlt noch und gehört vor der Verteilung dazu.
Erst danach `STAGING_PUSH_ENABLED=true` setzen und ausschließlich Testgeräte registrieren.
Lokale Entwicklung verwendet `MOBILE_APP_ENV=development` und die Test-App-Ordner.

## Prüfung vor Vereinsstart

- Produktions-TP_Admin kann sich anmelden; bestehende Daten unverändert.
- Staging-Login wird in Produktion abgewiesen und umgekehrt.
- Trainer, Eltern und Spieler mit mindestens zwei synthetischen Teams prüfen.
- Staging-Einladungen und Login-Links bleiben auf staging.nextsession.de.
- Nicht freigegebene E-Mail-Empfänger werden abgewiesen; kein Produktions-Push.
- Test-/Vereins-App nebeneinander installieren; Identität und Server kontrollieren.
- Rückmeldungen, Training starten, Offline-Modus und Rollenwechsel testen.
- Backup-Wiederherstellung sowie Code-Rollback dokumentieren.

## Lokale Prüfung dieser Änderung

101 Tests erfolgreich (`npm run test:ci`), Produktionsbuild erfolgreich, beide
Workflow-Dateien als YAML geprüft. Keine Live-Migration und kein Deployment dieser
Änderung. DNS wurde zusätzlich öffentlich und am autoritativen Nameserver geprüft;
der neue CNAME war dort beim letzten Check noch nicht sichtbar.
Neue Regressionstests prüfen Umgebungs-Links, Mail-Allowlist, native Identitäten und
vertauschte Datenbank-/Firebase-Konfigurationen. Keine echten Mails, Pushes oder
Migrationen durch diese Tests. Der Release-Workflow muss nach Einrichtung noch
in GitHub/Vercel erprobt werden. Kein vollständiger Pentest und kein erneuter
Dependency-Audit (keine Abhängigkeitsupdates dieser Änderung).

## Offizielle Grundlagen

- [Firebase: separate Projekte je Umgebung](https://firebase.google.com/docs/projects/dev-workflows/overview-environments)
- [Vercel: automatische Git-Deployments steuern](https://vercel.com/docs/project-configuration/git-configuration)
- [Vercel: vorkompilierte Deployments](https://vercel.com/docs/cli/deploy)
- [GitHub: Deployment-Nachweise](https://docs.github.com/en/rest/deployments/deployments)
- [Capacitor: App-Kennung und Plattformpfade](https://capacitorjs.com/docs/config)

## Tatsächlich eingerichteter Cloud-Stand

- Neon: `nextsession-staging`, Projekt `shy-sun-11719064`, Frankfurt, PostgreSQL 18,
  leer und ohne Datenkopie aus Produktion. PostgreSQL-Version von Produktion vor
  dem Migrationstest vergleichen; gegebenenfalls angleichen.
- Vercel: `trainerplan/nextsession-staging`, ID `prj_dQe8HUSNsJQoYxvSiljLUuWS18uS`,
  als leeres Projekt ohne Deployment erstellt. Kein Git-Autodeploy angeschlossen.
  Domain `staging.nextsession.de` zugeordnet. Vercel Authentication für **All
  Deployments** gespeichert. Elf öffentliche Konfigurationswerte hinterlegt:
  APP_ENV, PUBLIC_APP_URL, beide AUTH_PROVIDER-Werte, FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_API_KEY, SEED_DEMO_DATA, LICENSE_SELF_SERVICE_ENABLED,
  REGISTRATION_ENABLED, CLUB_REGISTRATION_ENABLED, STAGING_PUSH_ENABLED.
- Firebase: `nextsession-staging` im Spark-Tarif erstellt, Analytics und Gemini
  im Erstellungsdialog deaktiviert. Web-App `NextSession Staging Web` registriert,
  E-Mail/Passwort und E-Mail-Link aktiviert; `staging.nextsession.de` autorisiert.
- GitHub: Environment `staging` angelegt, Branchregel `main`. Bestehendes Environment
  `Production` mit Reviewer `isengerd`, kein Administrator-Bypass, Selbstfreigabe
  erlaubt (ein Betreiber), Branchregel `main`. Das betrifft Releases, keine App-Rollen.
- Produktions-Vercel-/Neon-/Firebase-Konfiguration und TP_Admin wurden nicht geändert.

Noch offen: DNS-Bestätigung, geheime Staging-Verbindungen, Rate-Limit-Secret, initiales
Staging-Konto/Plattformadmin-ID, GitHub-Environment-Variablen und Deployment-Token,
Automation-Bypass-Secret für die geschützte Health-Prüfung, Übernahme der Codeänderungen
in GitHub, erster Release/Migration und Anmeldung mit Testkonten. Native Test-App,
Backups/Wiederherstellungsprobe und Produktions-Rollout sind ebenfalls noch offen.

Von Vercel angeforderter DNS-Eintrag: `CNAME staging` auf
`db397fffe56150d5.vercel-dns-017.com.`. Die Nameserver der Domain sind
`ns1.neoteq.be`, `ns2.neoteq.be`, `ns3.neoteq.be`.
