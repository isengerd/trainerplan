# Trainerplan API v1

Die Web-App verwendet dieselbe JSON-API, die später von der iOS-App angesprochen wird. Im Browser liegt die Sitzung in einem HTTP-only-Cookie. Native Clients senden das beim Login erhaltene Token als `Authorization: Bearer <token>` und speichern es im iOS Keychain.

## Anmeldung

`POST /api/v1/auth/login`

```json
{ "email": "trainer@trainerplan.de", "password": "trainer123" }
```

Die Antwort enthält `user`, `token` und `expiresAt`. Weitere Auth-Endpunkte sind:

- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `PUT /api/v1/auth/password`

## Daten laden und speichern

`GET /api/v1/bootstrap` liefert den angemeldeten Benutzer sowie Mannschaft, Termine, Übungen, Einstellungen, Pläne und Vorlagen für den initialen App-Zustand.

`PUT /api/v1/state` speichert eine Ressource:

```json
{ "resource": "plans", "data": { "plans": {}, "planMeta": {} } }
```

Unterstützte Ressourcen sind `users`, `events`, `exercises`, `settings`, `plans` und `templates`. Die API prüft die Rolle serverseitig: Spieler dürfen nur das eigene Profil und die eigene Teilnahme ändern; Trainer verwalten sportliche Inhalte und Termine; Admins zusätzlich Rollen und globale Einstellungen.

## Gruppen und Einladungen

- `PUT /api/v1/groups` speichert die Gruppenstruktur (Admin).
- `POST /api/v1/invitations` erzeugt einen einmaligen, sieben Tage gültigen Link und versendet ihn optional per SMTP (Admin).
- `DELETE /api/v1/invitations/:id` zieht eine offene Einladung zurück (Admin).
- `GET /api/v1/invitations/accept?token=…` prüft einen öffentlichen Einladungslink.
- `POST /api/v1/invitations/accept` erstellt den eingeladenen Zugang und meldet ihn an.
- `POST /api/v1/admin/smtp` prüft SMTP-Verbindung und Anmeldung, ohne eine Nachricht zu senden (Admin).

SMTP-Zugangsdaten werden nicht über die API gespeichert oder ausgeliefert, sondern ausschließlich als Server-Umgebungsvariablen konfiguriert.

## iOS-Hinweise

- Transport ausschließlich über HTTPS.
- Token im Keychain, nicht in `UserDefaults`, speichern.
- Datumswerte werden als `YYYY-MM-DD`, Uhrzeiten als `HH:mm` übertragen.
- Die API ist bereits unter `/api/v1` versioniert, sodass spätere Änderungen kompatibel eingeführt werden können.
- Profilbilder sind derzeit als Daten-URL gespeichert. Vor dem öffentlichen Produktivbetrieb sollte dafür ein S3-kompatibler Objektspeicher mit signierten Uploads ergänzt werden.
