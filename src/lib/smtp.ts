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
