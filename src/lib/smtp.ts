import nodemailer from "nodemailer";

export function smtpStatus() {
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
    host: process.env.SMTP_HOST || undefined,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    from: process.env.SMTP_FROM || undefined,
  };
}

export function smtpTransport() {
  const status = smtpStatus();
  if (!status.configured || !status.host) throw new Error("SMTP ist noch nicht konfiguriert.");
  return nodemailer.createTransport({
    host: status.host,
    port: status.port,
    secure: status.secure,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || "" } : undefined,
  });
}

export async function sendInvitationMail(input: { to: string; name: string; inviter: string; clubName: string; link: string }) {
  const transport = smtpTransport();
  const greeting = input.name ? `Hallo ${input.name},` : "Hallo,";
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: `Einladung zu ${input.clubName}`,
    text: `${greeting}\n\n${input.inviter} hat dich zu ${input.clubName} eingeladen.\n\nEinladung annehmen: ${input.link}\n\nDer Link ist 7 Tage gültig.`,
  });
}

export async function sendEmailChangeMail(input: { to: string; name: string; link: string; requestedBy?: string }) {
  const transport = smtpTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: "Neue E-Mail-Adresse für NextSession Kids! bestätigen",
    text: `Hallo ${input.name},\n\n${input.requestedBy ? `${input.requestedBy} hat als Vereinsadmin eine neue E-Mail-Adresse für dein NextSession-Konto hinterlegt.` : "du hast eine neue E-Mail-Adresse für dein NextSession-Konto hinterlegt."}\n\nBitte bestätige die neue Adresse über diesen Link:\n\n${input.link}\n\nDer Link ist 60 Minuten gültig. Falls du die Änderung nicht erwartest, öffne den Link nicht und informiere deinen Verein.`,
  });
}

export async function sendEventMail(input: { to: string; name: string; actor: string; action: "created" | "updated" | "deleted"; event: { title: string; date: string; startTime: string; meetingTime: string; location: string; address?: string }; link: string }) {
  const transport = smtpTransport();
  const date = new Date(`${input.event.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const action = input.action === "created" ? "erstellt" : input.action === "updated" ? "aktualisiert" : "abgesagt";
  const subject = input.action === "created" ? "Neuer Termin" : input.action === "updated" ? "Termin aktualisiert" : "Termin abgesagt";
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: `${subject}: ${input.event.title}`,
    text: `Hallo ${input.name},\n\n${input.actor} hat den Termin „${input.event.title}“ ${action}.\n\nDatum: ${date}\nTreffen: ${input.event.meetingTime} Uhr\nBeginn: ${input.event.startTime} Uhr\nOrt: ${input.event.location}${input.event.address ? `\nAdresse: ${input.event.address}` : ""}${input.action === "deleted" ? "" : `\n\nTermin in NextSession öffnen: ${input.link}\n\nBitte gib deine Zu- oder Absage in NextSession ab.`}`,
  });
}
