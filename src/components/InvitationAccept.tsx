"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, Lock, Mail, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";

type InvitationInfo = { email: string; name: string; role: "admin" | "trainer" | "player" | "guardian"; group?: string; team?: string; club?: string; managedPlayer?: string; expiresAt: string };

export function InvitationAccept({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/invitations/accept?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as InvitationInfo & { error?: string };
        if (!response.ok) throw new Error(result.error || "Einladung konnte nicht geladen werden.");
        setInfo(result); setName(result.name || "");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Einladung konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [token]);

  async function accept(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/v1/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name, password }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error || "Einladung konnte nicht angenommen werden."); setLoading(false); return; }
    router.replace("/"); router.refresh();
  }

  return <main className="login-page invitation-page">
    <section className="login-brand"><span className="brand-mark"><Users /></span><span className="eyebrow">TRAINERPLAN CLUB</span><h1>Willkommen<br />im Team.</h1><p>Lege dein persönliches Passwort fest und starte direkt mit deiner Mannschaft.</p></section>
    <section className="login-panel"><form onSubmit={accept}><a className="back-to-login" href="/"><ChevronLeft /> Zur Anmeldung</a><span className="eyebrow">EINLADUNG ANNEHMEN</span><h2>Zugang erstellen</h2>{loading && !info ? <p>Einladung wird geprüft …</p> : info ? <><div className="invitation-summary"><Shield /><span><strong>{info.managedPlayer ? `Elternzugang für ${info.managedPlayer}` : info.team || info.group || "Mannschaft"}</strong><small>{info.club ? `${info.club} · ` : ""}Rolle: {info.role === "admin" ? "Admin" : info.role === "trainer" ? "Trainer" : info.role === "guardian" ? "Elternteil" : "Spieler"}</small></span></div><label><span>E-Mail-Adresse</span><div><Mail /><input value={info.email} disabled /></div></label><label><span>Vor- und Nachname</span><div><Users /><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></div></label><label><span>Passwort für den Zugang · mindestens 12 Zeichen</span><div><Lock /><input required minLength={12} maxLength={256} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></label><p className="invitation-password-hint">Falls du bereits einen Zugang hast, gib hier dein bestehendes Passwort ein.</p><button className="primary login-submit" type="submit" disabled={loading}>{loading ? "Einladung wird angenommen …" : <><Check /> Einladung annehmen</>}</button></> : null}{error && <div className="login-error">{error}</div>}</form></section>
  </main>;
}
