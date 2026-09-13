# Firebase-Login: CommonJS-Kompatibilität

Am 13.09.2026 scheiterten die Vercel-Anmelderouten schon beim Laden mit
`ERR_REQUIRE_ESM`. Firebase Admin 14.4.0 verwendete jwks-rsa 4.1.0, das jose 6
über `require()` lädt. In der betroffenen Laufzeit war dies nicht unterstützt.
Der Browser versuchte anschließend, die HTML-500-Antwort als JSON zu lesen.

Der gezielte npm-Override `jwks-rsa -> jose: 5.10.0` verwendet eine Version mit
CommonJS-Unterstützung. Firebase Admin bleibt auf 14.4.0. Der Override ist eine
bewusste Abweichung vom deklarierten jose-6-Versionsbereich von jwks-rsa und muss
bei künftigen Updates erneut geprüft werden; er darf nicht kommentarlos entfernt
oder global auf andere jose-Verbraucher ausgeweitet werden.

Verifikation:
- Fehler vor dem Fix mit `node --no-experimental-require-module` reproduziert.
- Firebase-Auth-Import und beide gebauten Anmelderouten laden nach dem Fix auch
  mit dieser Einschränkung.
- Regressionstest `src/lib/firebase-runtime.test.ts` verarbeitet einen lokal
  erzeugten RSA-JWK und prüft gültige sowie manipulierte signierte Daten.
- 90 Tests und Produktionsbuild erfolgreich.
- Produktionsaudit: keine Meldung für jose/jwks-rsa; die fünf zuvor bekannten
  Paketmeldungen in anderen Abhängigkeiten bleiben bestehen.

Bei Sicherheits-/SDK-Updates diesen Laufzeittest zusätzlich zum Build ausführen.
Der Test benötigt keine echten Zugangsdaten und kontaktiert Firebase nicht.
Nach Deployment zusätzlich den unauthentifizierten `/api/v1/auth/me`-Abruf prüfen
(erwartet 401 mit JSON, kein HTML-500) und eine tatsächliche Anmeldung verifizieren.
Konten, Passwörter und Rechte werden durch diesen Fix nicht verändert.
