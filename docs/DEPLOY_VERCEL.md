# Kostenloses Deployment mit Vercel und Neon

Die Anwendung läuft als Next.js-Projekt auf Vercel. PostgreSQL wird von Neon verwaltet; lokal muss dafür kein Datenbankserver betrieben werden. Vercel Functions und Neon sollten beide in Frankfurt laufen.

## 1. Neon-Datenbank anlegen

1. Bei Neon ein kostenloses Projekt erstellen.
2. Als Region Frankfurt wählen.
3. Im Projekt auf **Connect** klicken und **Connection pooling** aktivieren.
4. Die vollständige `postgresql://...`-Adresse kopieren.

Die Zugangsdaten niemals committen. Für die einmalige Einrichtung lokal eine `.env` auf Basis von `.env.vercel.example` erstellen. Falls bereits eine `.env` für Docker existiert, diese nicht überschreiben, sondern sichern oder die Werte gezielt austauschen:

```bash
cp .env.vercel.example .env
```

Danach in `.env` mindestens diese Werte ersetzen:

- `DATABASE_URL`
- `INITIAL_ADMIN_NAME`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD` mit mindestens 12 zufälligen Zeichen

Demo-Daten bleiben mit `SEED_DEMO_DATA=false` abgeschaltet.

## 2. Datenbank initialisieren

Abhängigkeiten installieren und anschließend Migrationen sowie den ersten Admin anlegen:

```bash
npm ci
npm run db:setup
```

Der Seed ist wiederholbar: Bestehende Benutzer werden weder überschrieben noch mit einem bekannten Passwort zurückgesetzt. Nach erfolgreicher Einrichtung können `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL` und `INITIAL_ADMIN_PASSWORD` wieder aus der lokalen `.env` entfernt werden.

## 3. Repository mit Vercel verbinden

1. Das Git-Repository in Vercel über **Add New → Project** importieren.
2. Framework **Next.js** übernehmen; keine eigenen Build- oder Output-Befehle eintragen.
3. Unter **Settings → Environment Variables** zunächst `DATABASE_URL` und `SEED_DEMO_DATA=false` für **Production** setzen.
4. Deploy starten.

Die Datei `vercel.json` legt Frankfurt (`fra1`) als Region der Server-Funktionen fest. Statische Dateien werden weiterhin global ausgeliefert.

## 4. Öffentliche URL und E-Mail einrichten

Nach dem ersten Deploy die endgültige `https://...vercel.app`-Adresse kopieren und als `PUBLIC_APP_URL` in Vercel für **Production** hinterlegen. Danach erneut deployen. Ohne diese feste Adresse werden im Produktivbetrieb bewusst keine Einladungslinks erzeugt.

Für E-Mail-Einladungen zusätzlich die optionalen `SMTP_*`-Werte aus `.env.vercel.example` in Vercel hinterlegen. Secrets nur in Vercel bzw. lokal in `.env` speichern, nie im Repository.

## 5. Kontrolle

Nach dem Deploy prüfen:

- `https://DEINE-URL/api/health` liefert `database: "connected"`.
- Anmeldung mit dem initialen Admin funktioniert.
- Die bekannten lokalen Demo-Zugänge funktionieren nicht.
- Unter Einstellungen lässt sich ein Einladungslink erzeugen.
- `SEED_DEMO_DATA` bleibt in Production `false`.

## Weitere Schemaänderungen

Neue Prisma-Migrationen niemals automatisch in jedem Vercel-Preview ausführen. Sie werden vor einem Produktionsdeploy gezielt mit der produktiven, geheimen `DATABASE_URL` ausgeführt:

```bash
npm run db:deploy
```

Für einen späteren regelmäßigen Release-Prozess sollte dieser Schritt in eine geschützte CI/CD-Action mit einem Production-Environment und manueller Freigabe verschoben werden.
