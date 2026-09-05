"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { createServerSession, firebaseClientAuthEnabled, firebasePasswordSignInOrCreate } from "@/lib/firebase-client";

type InvitationInfo = { email: string; name: string; role: "admin" | "trainer" | "player" | "guardian"; group?: string; team?: string; club?: string; managedPlayer?: string; expiresAt: string };

export function InvitationAccept({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/invitations/accept?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as InvitationInfo & { error?: string };
        if (!response.ok) throw new Error(result.error || "Einladung konnte nicht geladen werden.");
        setInfo(result);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Einladung konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [token]);

  async function accept(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (password !== passwordConfirmation) return setError("Die Passwörter stimmen nicht überein.");
    if (password.length < 12) return setError("Das Passwort benötigt mindestens 12 Zeichen.");
    setLoading(true);
    try {
      if (!info) throw new Error("Die Einladung konnte nicht geladen werden.");
      const credential = firebaseClientAuthEnabled() ? await firebasePasswordSignInOrCreate(info.email, password) : null;
      const response = await fetch("/api/v1/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credential ? { token, idToken: credential.idToken } : { token, password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Einladung konnte nicht angenommen werden.");
      if (credential) await createServerSession(credential.idToken);
      router.replace("/"); router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Einladung konnte nicht angenommen werden.");
      setLoading(false);
    }
  }

  const passwordsMatch = password === passwordConfirmation;
  const role = info?.role === "admin" ? "Admin" : info?.role === "trainer" ? "Trainer" : info?.role === "guardian" ? "Elternteil" : "Spieler";

  return <main className="login-page invitation-page">
    <section className="login-brand invitation-brand"><span className="brand-mark"><Users /></span><span className="eyebrow">NEXTSESSION KIDS!</span><h1>Willkommen<br />im Team.</h1><p>Ein Zugang für Termine, Trainings und alles, was deine Mannschaft zusammenbringt.</p></section>
    <section className="login-panel invitation-panel"><form className="invitation-accept-form" onSubmit={accept}>
      <a className="back-to-login" href="/"><ChevronLeft /> Zur Anmeldung</a>
      <span className="eyebrow">PERSÖNLICHE EINLADUNG</span><h2>Zugang einrichten</h2><p className="invitation-intro">Lege ein Passwort fest, um deine Einladung anzunehmen.</p>
      {loading && !info ? <div className="invitation-loading">Einladung wird geprüft …</div> : info ? <>
        <div className="invitation-summary"><ShieldCheck /><span><small>{info.club || "NextSession Kids!"}</small><strong>{info.managedPlayer ? `Elternzugang für ${info.managedPlayer}` : info.team || info.group || "Deine Mannschaft"}</strong><em>Rolle: {role}</em></span></div>
        <div className="invitation-account"><Mail /><span><small>Dein Zugang</small><strong>{info.email}</strong></span></div>
        <div className="invitation-password-fields">
          <label><span>Passwort</span><div><LockKeyhole /><input required minLength={12} maxLength={256} type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mindestens 12 Zeichen" autoFocus /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Passwörter verbergen" : "Passwörter anzeigen"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
          <label><span>Passwort wiederholen</span><div className={passwordConfirmation && !passwordsMatch ? "has-error" : ""}><LockKeyhole /><input required minLength={12} maxLength={256} type={showPassword ? "text" : "password"} autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Passwort erneut eingeben" /></div></label>
        </div>
        <p className={`invitation-password-status ${passwordConfirmation && !passwordsMatch ? "invalid" : ""}`}>{passwordConfirmation && !passwordsMatch ? "Die Passwörter stimmen noch nicht überein." : "Verwende mindestens 12 Zeichen."}</p>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button className="primary login-submit invitation-submit" type="submit" disabled={loading || password.length < 12 || !passwordsMatch}>{loading ? "Einladung wird angenommen …" : <><Check /> Einladung annehmen</>}</button>
        <p className="invitation-existing-note">Du hast bereits einen Zugang? Gib dein bestehendes Passwort zweimal ein.</p>
      </> : error ? <div className="login-error" role="alert">{error}</div> : null}
    </form></section>
  </main>;
}
