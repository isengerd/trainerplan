# Trainerplan API v1

Die maschinenlesbare Spezifikation liegt unter [`openapi.yaml`](./openapi.yaml) und kann direkt in Swagger UI, Redoc oder Xcode/OpenAPI Generator verwendet werden.

Die Web-App verwendet dieselbe JSON-API, die später von der iOS-App angesprochen wird. Im Browser liegt die Sitzung in einem HTTP-only-Cookie. Native Clients senden das beim Login erhaltene Token als `Authorization: Bearer <token>` und speichern es im iOS Keychain.

## Anmeldung

`POST /api/v1/auth/login`

```json
{ "email": "trainer@example.org", "password": "ein-langes-individuelles-passwort" }
```

Die Antwort enthält `user`, `token` und `expiresAt`. Weitere Auth-Endpunkte sind:

- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `PUT /api/v1/auth/password`

Passwörter müssen 12 bis 256 Zeichen lang sein. Login- und Einladungsversuche werden begrenzt; Clients behandeln HTTP `429` und den Header `Retry-After` entsprechend.

## Daten laden und speichern

`GET /api/v1/bootstrap` liefert den angemeldeten Benutzer sowie Mannschaft, Termine, Übungen, Einstellungen, Pläne und Vorlagen für den initialen App-Zustand.

Die API prüft die Rolle serverseitig: Spieler dürfen nur das eigene Profil und die eigene Teilnahme ändern; Trainer verwalten sportliche Inhalte und Termine; Admins zusätzlich Rollen und globale Einstellungen.

### Trainingspläne

Trainingspläne besitzen zusätzlich einen eigenen REST-Endpunkt:

- `GET /api/v1/training-plans` liefert `plans` und `planMeta`.
- `PUT /api/v1/training-plans` speichert `plans` und `planMeta`. Zugriff haben Admins und Trainer.

### Termine

- `GET /api/v1/events` liefert die für den angemeldeten Benutzer sichtbaren Termine.
- `POST /api/v1/events` erstellt einen einzelnen Termin (Trainer/Admin).
- `PATCH /api/v1/events/:id` ändert einen einzelnen Termin (Trainer/Admin).
- `DELETE /api/v1/events/:id` löscht einen einzelnen Termin (Trainer/Admin).
- `PUT /api/v1/events/:id/attendance` setzt oder entfernt die eigene Teilnahme (Spieler).
- `PUT /api/v1/events` speichert die Terminliste für Trainer/Admins oder die eigenen Teilnahmeänderungen für Spieler.

### Mannschaftsplanung

- `GET /api/v1/events/:id/squads` liefert die Mannschaftsaufteilung eines Turniers.
- `PUT /api/v1/events/:id/squads` ersetzt die Mannschaftsaufteilung (Trainer/Admin).

### Übungen

- `GET /api/v1/exercises` liefert die Übungsbibliothek.
- `POST /api/v1/exercises` erstellt eine Übung (Trainer/Admin).
- `PATCH /api/v1/exercises/:id` ändert eine Übung (Trainer/Admin).
- `DELETE /api/v1/exercises/:id` löscht eine Übung (Trainer/Admin).

### Mannschaft und Einstellungen

- `GET /api/v1/users` liefert die sichtbaren Mannschaftsmitglieder.
- `PUT /api/v1/users` speichert Profil-, Rollen- und Entwicklungsdaten mit serverseitiger Rechteprüfung.
- `GET /api/v1/settings` liefert die Vereinseinstellungen.
- `PUT /api/v1/settings` speichert Vereinseinstellungen (Admin).

Gruppen werden weiterhin über `GET/PUT /api/v1/groups` verwaltet.

### Trainingsvorlagen

- `GET /api/v1/templates` liefert eigene Trainingsvorlagen.
- `POST /api/v1/templates` erstellt eine Vorlage (Trainer/Admin).
- `PATCH /api/v1/templates/:id` ändert eine Vorlage (Trainer/Admin).
- `DELETE /api/v1/templates/:id` löscht eine Vorlage (Trainer/Admin).

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
