export function mobileEnvironment(env: { [key: string]: string | undefined; MOBILE_APP_ENV?: string; CAPACITOR_SERVER_URL?: string; PUBLIC_APP_URL?: string } = process.env) {
  const target = env.MOBILE_APP_ENV || "production";
  if (!["production", "staging", "development"].includes(target)) throw new Error("MOBILE_APP_ENV muss production, staging oder development sein.");
  const expected = target === "staging" ? "https://staging.nextsession.de" : "https://nextsession.de";
  const value = env.CAPACITOR_SERVER_URL?.trim() || (target === "development" ? env.PUBLIC_APP_URL?.trim() : undefined) || (target === "development" ? "http://localhost:3000" : expected);
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Die mobile Server-Adresse muss eine reine Origin sein.");
  if (target !== "development" && url.origin !== expected) throw new Error("Die mobile Server-Adresse passt nicht zur App-Umgebung.");
  if (target === "development" && (!['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol))) throw new Error("Entwicklungs-App darf nur einen lokalen Server öffnen.");
  const testApp = target !== "production";
  return { target, serverUrl: url.origin, appId: testApp ? "de.nextsession.kids.staging" : "de.nextsession.kids", appName: testApp ? "NextSession Test" : "NextSession Kids!", iosPath: testApp ? "ios-staging" : "ios", androidPath: testApp ? "android-staging" : "android" };
}
