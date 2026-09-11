/** Managed profile is a login model, not an age or a license flag. */
export function ageInYears(birthday?: string | null, today = new Date()): number | null {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;
  const date = new Date(`${birthday}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthday) return null;
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(today);
  if (birthday > day) return null;
  return Number(day.slice(0, 4)) - Number(birthday.slice(0, 4)) - (day.slice(5) < birthday.slice(5) ? 1 : 0);
}

/** Describe configured access independently of age and team. */
export function playerAccessLabel(profile: { managedProfile?: boolean; loginEnabled?: boolean; hasGuardianAccess?: boolean }) {
  const own = !profile.managedProfile && profile.loginEnabled !== false;
  if (own && profile.hasGuardianAccess) return "Eigener Zugang + Elternzugang";
  if (own) return "Eigener Zugang";
  return profile.hasGuardianAccess ? "Elternzugang" : "Noch kein Zugang";
}

export function shouldSuggestPlayerLogin(birthday?: string | null, teamAgeGroup?: string | null, today = new Date()) {
  return (ageInYears(birthday, today) ?? -1) >= 10 || /^(e|d|c|b|a)[12]$/i.test(teamAgeGroup ?? "");
}

export function visibleProfileEmail(email?: string | null): string {
  if (!email || /\.invalid$/i.test(email)) return "";
  return email;
}
