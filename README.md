# Trainerplan MVP

Responsive Fußball-Trainingsplanungsplattform mit einem API-first-Backend. Web-App und eine spätere native iOS-App verwenden dieselbe versionierte HTTP-API.

## Funktionen

- responsive Desktop- und Mobile-Ansicht
- Wochenkalender mit auswählbaren Tagen
- filterbare Übungsbibliothek
- Übungen per Klick zum Trainingsplan hinzufügen
- automatische Berechnung der Gesamtdauer
- Spieler- und Materialübersicht
- PostgreSQL-Datenbank für Benutzer, Termine, Übungen, Trainingspläne und Einstellungen
- serverseitige Rollenprüfung für Admin, Trainer und Spieler
- Gruppen- und Rechteverwaltung sowie ablaufende Einladungslinks
- optionaler Einladungsversand über einen eigenen SMTP-Server
- sichere Passwort-Hashes und widerrufbare Datenbank-Sitzungen
- versionierte API unter `/api/v1` für Web und eine spätere iOS-App

## Tech-Stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Lucide Icons
- PostgreSQL 16
- Prisma ORM 6
- bcryptjs
- Nodemailer

## Einladungen und SMTP

Admins verwalten unter **Einstellungen** Rollen, Gruppen und offene Einladungen. Jeder Einladungslink ist einmalig, sieben Tage gültig und kann auch ohne Mailserver kopiert werden.

Für den E-Mail-Versand die Werte aus [`.env.example`](.env.example) in einer lokalen `.env` setzen. Besonders relevant sind `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` und `SMTP_FROM`. `PUBLIC_APP_URL` ist im Produktivbetrieb verpflichtend und muss die öffentliche HTTPS-Adresse enthalten. Nur für lokale Tests ist eine HTTP-Adresse mit `localhost` erlaubt.

## Mit Docker starten (empfohlen)

```bash
cp .env.example .env
# In .env sichere, individuelle Werte setzen
docker compose up --build -d
```

Danach `http://localhost:3000` öffnen. PostgreSQL läuft als eigener Container; Migrationen und die Erstkonfiguration werden vor dem App-Start automatisch eingespielt. Das benannte Volume `trainerplan_postgres_data` erhält die Daten über Container-Neustarts hinweg. Beim ersten Start werden `INITIAL_ADMIN_EMAIL` und `INITIAL_ADMIN_PASSWORD` verwendet. Das Passwort muss mindestens zwölf Zeichen lang sein.

`SEED_DEMO_DATA=true` legt bekannte Demo-Zugänge und Beispieldaten an und darf deshalb ausschließlich lokal verwendet werden. Der Entwicklungs-Compose aktiviert diese Demo-Daten bewusst; die Produktionskonfiguration standardmäßig nicht.

## Produktions-Build

```bash
npm run build
npm start
```

## Als Git-Repository verwenden

```bash
git init
git add .
git commit -m "Initial Trainerplan MVP"
```

Anschließend kann ein Remote-Repository bei GitHub, GitLab oder einer eigenen Git-Instanz hinzugefügt werden.

Die API-Verwendung für eine spätere iOS-App ist in [`docs/API.md`](docs/API.md) dokumentiert.

### Produktionsmodus

Vor dem Start `.env` wie oben beschrieben konfigurieren. Für einen öffentlichen Betrieb müssen `POSTGRES_PASSWORD`, `DATABASE_URL`, `PUBLIC_APP_URL` und der initiale Admin individuell gesetzt sein. `PUBLIC_APP_URL` verwendet HTTPS.

```bash
docker compose up --build -d
```

Die Anwendung ist anschließend unter `http://localhost:3000` erreichbar.
Der Healthcheck ist unter `http://localhost:3000/api/health` verfügbar.

Status und Logs anzeigen:

```bash
docker compose ps
docker compose logs -f trainerplan
```

Container stoppen:

```bash
docker compose down
```

### Entwicklungsmodus mit Hot Reload

```bash
docker compose -f compose.dev.yaml up
```

Die lokalen Dateien werden in den Container eingebunden. Änderungen unter `src/` werden automatisch übernommen.

Die Anmelde- und Einladungsendpunkte besitzen eine anwendungsseitige Begrenzung pro IP. Bei mehreren App-Instanzen sollte der vorgeschaltete Reverse Proxy zusätzlich ein zentrales Rate-Limit setzen und eingehende `X-Forwarded-For`-Header selbst zuverlässig überschreiben.

### Image manuell bauen und starten

```bash
docker build -t trainerplan-mvp .
docker run --rm -p 3000:3000 trainerplan-mvp
```

### Hinter Traefik betreiben

Für einen Betrieb hinter einem bestehenden Reverse Proxy kann der `ports`-Eintrag in `compose.yaml` durch `expose: ["3000"]` und die passenden Traefik-Labels ersetzt werden. Die Anwendung lauscht im Container auf `0.0.0.0:3000`.
