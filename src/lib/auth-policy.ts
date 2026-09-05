export const MAX_SESSION_LOGIN_AGE_SECONDS = 5 * 60;

export function isRecentFirebaseSignIn(authTime: number, nowSeconds = Date.now() / 1000) {
  return Number.isFinite(authTime) && authTime <= nowSeconds + 30 && nowSeconds - authTime <= MAX_SESSION_LOGIN_AGE_SECONDS;
}

export function firebaseIdentityMatches(
  account: { firebaseUid: string | null; email: string },
  identity: { uid: string; email?: string },
) {
  return Boolean(
    account.firebaseUid
    && account.firebaseUid === identity.uid
    && identity.email
    && account.email.trim().toLowerCase() === identity.email.trim().toLowerCase(),
  );
}

export async function tenantScopedResult<T>(hasScope: boolean, query: () => Promise<T[]>) {
  return hasScope ? query() : [];
}
