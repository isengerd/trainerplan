# NextSession Kids! für iOS und Android

Die native App verwendet Capacitor und lädt die produktive Next.js-Anwendung über HTTPS. Dadurch bleiben Web-App, API und mobile App auf derselben Origin; die vorhandene HTTP-only-Cookie-Sitzung funktioniert unverändert.

## Voraussetzungen

- Node.js 22 oder neuer und npm
- iOS: aktuelles Xcode, bestätigte Xcode-Lizenz und CocoaPods/SPM-Unterstützung
- Android: Android Studio mit aktuellem Android SDK
- eine öffentlich erreichbare HTTPS-Installation von NextSession

## Erstmalige Einrichtung

```bash
npm install
npx cap add ios
npx cap add android
```

Die Plattformverzeichnisse `ios/` und `android/` werden eingecheckt. Sie enthalten keine Zugangsdaten.

## Synchronisieren

Standardmäßig verwendet Capacitor die bereits vorhandene `PUBLIC_APP_URL`. Sie kann für einen einzelnen Sync-Prozess überschrieben werden:

```bash
CAPACITOR_SERVER_URL=https://app.example.org npm run mobile:sync
```

Ohne Überschreibung genügt daher:

```bash
npm run mobile:sync
```

Danach das gewünschte native Projekt öffnen:

```bash
npm run mobile:open:ios
npm run mobile:open:android
```

Für lokale Android-Emulator-Tests kann `http://10.0.2.2:3000` verwendet werden. Auf einem iOS-Simulator ist `http://localhost:3000` möglich. Release-Builds müssen HTTPS verwenden.

## Hinweise

- Bundle-ID: `de.trainerplan.app`
- App-Name: `NextSession Kids!`
- Der native Zurück-Button navigiert zunächst im Verlauf und minimiert die App auf der obersten Ebene.
- Statusleiste, Splashscreen, Safe Areas und natives Overscroll-Verhalten werden beim Start konfiguriert.
- Vor einer Store-Einreichung müssen eigene Icons, Splash-Assets, Universal/App Links, Datenschutztexte und Signierung ergänzt werden.
- Bei einer späteren lokal gebündelten UI muss die API-Schicht auf absolute URLs und sichere Bearer-Token-Speicherung umgestellt werden.
