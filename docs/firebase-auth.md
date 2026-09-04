# Firebase Authentication aktivieren

NextSession nutzt Firebase ausschließlich für Identität und Anmeldung. Profile,
Vereinsrollen, Mannschaften und Ressourcenrechte bleiben in PostgreSQL.

## Variablen

Serverseitig (niemals mit `NEXT_PUBLIC_` veröffentlichen):

```env
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="..."
AUTH_PROVIDER="firebase"
```

Im Browser öffentlich und daher kein Geheimnis:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_AUTH_PROVIDER="firebase"
```

Server- und Client-Schalter müssen immer denselben Wert besitzen. Zuerst in
Preview testen. Production erst nach der Kontenmigration umschalten.

## Reihenfolge

1. In Firebase Authentication den Anbieter **E-Mail/Passwort** aktivieren.
2. Datenbankmigration `202609040001_firebase_auth` in Preview ausführen.
3. Firebase-Variablen in Vercel ausschließlich für Preview eintragen.
4. Bestehende Konten mit `npm run auth:migrate` importieren.
5. Preview-Login, Einladung, Passwortwechsel, E-Mail-Wechsel und Rollen testen.
6. Datenbank sichern, Migration und Kontenimport in Production ausführen.
7. Erst danach beide `AUTH_PROVIDER`-Schalter in Production auf `firebase` setzen.

Kinderprofile mit `loginEnabled=false` werden bewusst nicht zu Firebase
übertragen. Eltern melden sich mit dem Elternkonto an.

## Sicherheitsmodell

- ID-Tokens werden nur serverseitig mit Firebase Admin ausgewertet.
- Der Client kann weder UID noch E-Mail für das Prisma-Mapping vorgeben.
- Nach dem Login wird das ID-Token gegen ein signiertes `HttpOnly`, `Secure`,
  `SameSite=Strict` Session-Cookie getauscht.
- Personenbezogene und administrative Endpunkte verlangen eine höchstens
  60 Minuten alte Anmeldung und prüfen Token-Widerruf.
- Rollen und Mandantenzugriff werden bei jeder Ressourcenabfrage aus den
  PostgreSQL-`Membership`-Datensätzen bestimmt.
- Schreibzugriffe auf die API werden zusätzlich über Origin und Fetch-Metadata
  gegen Cross-Site-Anfragen geschützt.
