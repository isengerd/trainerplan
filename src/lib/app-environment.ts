type Environment = { APP_ENV?: string; NODE_ENV?: string; PUBLIC_APP_URL?: string; STAGING_EMAIL_ALLOWLIST?: string };

export function appEnvironment(env: Environment = process.env) {
  if (env.APP_ENV && !["production", "staging", "development"].includes(env.APP_ENV)) throw new Error("APP_ENV ist ungültig.");
  return env.APP_ENV || (env.NODE_ENV === "production" ? "production" : "development");
}

export function publicAppOrigin(env: Environment = process.env, fallback?: string) {
  const environment = appEnvironment(env);
  // Preserve the existing production domain during the rollout.
  if (environment === "production") return "https://nextsession.de";
  if (environment === "staging") {
    if (env.PUBLIC_APP_URL !== "https://staging.nextsession.de") throw new Error("Staging benötigt seine eigene öffentliche Adresse.");
    return env.PUBLIC_APP_URL;
  }
  const url = new URL(env.PUBLIC_APP_URL || fallback || "http://localhost:3000");
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Ungültige öffentliche Adresse.");
  return url.origin;
}

export function assertEmailRecipient(email: string, env: Environment = process.env) {
  if (appEnvironment(env) !== "staging") return;
  const allowed = (env.STAGING_EMAIL_ALLOWLIST || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(email.trim().toLowerCase())) throw new Error("Staging versendet nur an freigegebene Testadressen.");
}
