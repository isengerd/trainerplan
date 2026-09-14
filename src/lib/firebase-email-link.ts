import { assertEmailRecipient, publicAppOrigin } from "./app-environment";
const FIREBASE_IDENTITY_URL = "https://identitytoolkit.googleapis.com/v1/accounts";

type FirebaseErrorResponse = { error?: { message?: string } };
type FirebaseEmailLinkResult = FirebaseErrorResponse & {
  idToken?: string;
  email?: string;
  localId?: string;
  expiresIn?: string;
};

function firebaseApiKey() {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!key) throw new Error("Firebase Authentication ist noch nicht vollständig konfiguriert.");
  return key;
}

export function emailLinkContinueUrl() {
  return new URL("/login/email-link", publicAppOrigin()).toString();
}

export async function requestFirebaseEmailLink(email: string) {
  assertEmailRecipient(email);
  const response = await fetch(`${FIREBASE_IDENTITY_URL}:sendOobCode?key=${encodeURIComponent(firebaseApiKey())}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestType: "EMAIL_SIGNIN",
      email,
      continueUrl: emailLinkContinueUrl(),
      canHandleCodeInApp: true,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as FirebaseErrorResponse;
    throw new Error(`Firebase email link error: ${result.error?.message || response.status}`);
  }
}

export async function redeemFirebaseEmailLink(email: string, oobCode: string) {
  const response = await fetch(`${FIREBASE_IDENTITY_URL}:signInWithEmailLink?key=${encodeURIComponent(firebaseApiKey())}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, oobCode }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as FirebaseEmailLinkResult;
  if (!response.ok || !result.idToken) throw new Error(`Firebase email link verification error: ${result.error?.message || response.status}`);
  return result.idToken;
}
