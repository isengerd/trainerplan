/** Managed profile is a login model, not an age or a license flag. */
export function ageInYears(birthday?: string | null, today = new Date()): number | null {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;
  const date = new Date(`${birthday}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthday) return null;
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(today);
  if (birthday > day) return null;
  return Number(day.slice(0, 4)) - Number(birthday.slice(0, 4)) - (day.slice(5) < birthday.slice(5) ? 1 : 0);
}

export function managedProfileLabel(birthday?: string | null, teamAgeGroup?: string | null, today = new Date()) {
  const age = ageInYears(birthday, today);
  if (age !== null) return age < 16 ? "Kinderprofil" : "Spielerprofil";
  return /^(g|f|e|d|c)[12]$/i.test(teamAgeGroup ?? "") ? "Kinderprofil" : "Spielerprofil";
}

export function visibleProfileEmail(email?: string | null): string {
  if (!email || /\.invalid$/i.test(email)) return "";
  return email;
}
