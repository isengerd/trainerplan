import { isPlatformAdmin } from "./platform-admin";

export function licenseSelfServiceEnabled() {
  return process.env.LICENSE_SELF_SERVICE_ENABLED === "true";
}

export function canManageLicense(userId: string, ownerUserId: string | null) {
  return isPlatformAdmin(userId) || (licenseSelfServiceEnabled() && userId === ownerUserId);
}
