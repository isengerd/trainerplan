import "dotenv/config";

const value = process.env.CAPACITOR_SERVER_URL?.trim() || process.env.PUBLIC_APP_URL?.trim();

if (!value) {
  console.error("CAPACITOR_SERVER_URL oder PUBLIC_APP_URL fehlt. Für native Builds muss die öffentliche HTTPS-Adresse gesetzt sein.");
  process.exit(1);
}

let url;
try {
  url = new URL(value);
} catch {
  console.error("CAPACITOR_SERVER_URL ist keine gültige URL.");
  process.exit(1);
}

const localDevelopment = ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname);
if (url.protocol !== "https:" && !localDevelopment) {
  console.error("CAPACITOR_SERVER_URL muss außerhalb der lokalen Entwicklung HTTPS verwenden.");
  process.exit(1);
}

console.log("Mobile Server: gültige URL konfiguriert");
