# Push auf dem iPhone

Die native iOS-App registriert sich bei Apple (APNs). Firebase Messaging verbindet
anschließend das APNs-Token mit einem FCM-Token. Nur das FCM-Token wird über den
Capacitor-Registrierungsevent an `/api/v1/push-tokens` übergeben. Der Server versendet
über Firebase Admin Messaging. Ein reines APNs-Token funktioniert hier nicht.

Die Firebase-Abhängigkeit ist direkt im Xcode-Projekt hinterlegt, damit `cap sync`
sie nicht aus dem automatisch erzeugten CapApp-SPM-Paket entfernt. Registrierungen
werden nach Anmeldung, bei Wiederherstellung der Verbindung und beim erneuten
Aktivieren der App wiederholt. Tokenwechsel entfernen den lokal bekannten Vorgänger
nur für das aktuell angemeldete Konto. Der Test-Push adressiert die registrierten
Geräte des angemeldeten Kontos, nicht automatisch alle Mannschaftsmitglieder.

## Aktualisierung

1. Webänderungen auf Vercel veröffentlichen.
2. Mit der richtigen Produktions-URL `npm run mobile:sync` ausführen.
3. `ios/App/App.xcodeproj` in Xcode öffnen, Swift-Pakete auflösen lassen und die App
   neu auf dem iPhone installieren bzw. einen neuen TestFlight-Build verteilen.
   Ein Vercel-Deployment allein aktualisiert den nativen Firebase-Code nicht.
4. Anmelden, Mitteilungen erlauben und die App einmal in den Hintergrund und zurück
   holen. In Einstellungen sollte nun mindestens ein registriertes Gerät erscheinen.
5. „Test-Push senden“ mit demselben Konto testen. Auch mit App im Hintergrund prüfen.

## Externe Voraussetzungen

- Die Firebase-iOS-App muss die Bundle-ID `de.nextsession.kids` verwenden.
- `GoogleService-Info.plist` und die Firebase-Serverkonfiguration müssen zum selben
  Firebase-Projekt gehören.
- In Firebase → Projekteinstellungen → Cloud Messaging muss ein gültiger APNs-Key
  bzw. die passende Apple-Push-Konfiguration hinterlegt sein. Dies lässt sich nicht
  durch Hinzufügen der plist-Datei ersetzen.
- Apple-Signierung/Provisioning muss Push Notifications erlauben. Für TestFlight
  gelten die von Xcode beim Archivieren gesetzten Distribution-Entitlements.
- iPhone → Einstellungen → Mitteilungen → NextSession: Mitteilungen erlauben;
  Fokus-Modus und Mitteilungszusammenfassung bei der Prüfung berücksichtigen.

Der Simulator-Build prüft Kompilierung und Verknüpfung. Tatsächliche Zustellung auf
dem physischen Gerät und die extern hinterlegten APNs-Zugangsdaten müssen separat
geprüft werden. Die Firebase-Erfolgsmeldung bestätigt die Annahme durch Firebase,
nicht, dass iOS die Nachricht bereits angezeigt hat.

Referenzen:
- https://capacitorjs.com/docs/guides/push-notifications-firebase
- https://firebase.google.com/docs/cloud-messaging/ios/get-started
