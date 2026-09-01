export function publicRegistrationEnabled() {
  return process.env.REGISTRATION_ENABLED === "true";
}
