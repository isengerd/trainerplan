export function publicRegistrationEnabled() {
  return process.env.CLUB_REGISTRATION_ENABLED === "true" || process.env.REGISTRATION_ENABLED === "true";
}
