type FirebasePasswordResult = { idToken: string; email: string; localId: string; expiresIn: string };

export const firebaseClientAuthEnabled = () => process.env.NEXT_PUBLIC_AUTH_PROVIDER === "firebase";

const firebaseErrors: Record<string, string> = {
  EMAIL_EXISTS: "Für diese E-Mail-Adresse existiert bereits ein Zugang.",
  EMAIL_NOT_FOUND: "E-Mail oder Passwort ist nicht korrekt.",
  INVALID_LOGIN_CREDENTIALS: "E-Mail oder Passwort ist nicht korrekt.",
  INVALID_PASSWORD: "E-Mail oder Passwort ist nicht korrekt.",
  USER_DISABLED: "Dieser Zugang wurde gesperrt.",
  WEAK_PASSWORD: "Das Passwort erfüllt die Sicherheitsanforderungen nicht.",
  TOO_MANY_ATTEMPTS_TRY_LATER: "Zu viele Versuche. Bitte später erneut versuchen.",
};

async function firebasePasswordRequest(action: "signInWithPassword" | "signUp", email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase Authentication ist noch nicht vollständig konfiguriert.");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const result = await response.json() as FirebasePasswordResult & { error?: { message?: string } };
  if (!response.ok || !result.idToken) throw new Error(firebaseErrors[result.error?.message?.split(" : ")[0] || ""] || "Die Anmeldung bei Firebase ist fehlgeschlagen.");
  return result;
}

export const firebasePasswordSignIn = (email: string, password: string) => firebasePasswordRequest("signInWithPassword", email, password);
export const firebasePasswordSignUp = (email: string, password: string) => firebasePasswordRequest("signUp", email, password);

export async function firebasePasswordSignInOrCreate(email: string, password: string) {
  try { return await firebasePasswordSignIn(email, password); }
  catch (loginError) {
    try { return await firebasePasswordSignUp(email, password); }
    catch { throw loginError; }
  }
}

export async function createServerSession(idToken: string) {
  const response = await fetch("/api/v1/auth/session", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error || "Die sichere Sitzung konnte nicht erstellt werden.");
}

export async function firebaseChangePassword(email: string, currentPassword: string, newPassword: string) {
  const credential = await firebasePasswordSignIn(email, currentPassword);
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase Authentication ist noch nicht vollständig konfiguriert.");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: credential.idToken, password: newPassword, returnSecureToken: true }),
  });
  const result = await response.json() as FirebasePasswordResult & { error?: { message?: string } };
  if (!response.ok || !result.idToken) throw new Error(firebaseErrors[result.error?.message?.split(" : ")[0] || ""] || "Das Passwort konnte nicht geändert werden.");
  await createServerSession(result.idToken);
}
