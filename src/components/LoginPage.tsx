"use client";

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Mail, Shield } from "lucide-react";
import { useState } from "react";
import { createServerSession, firebaseClientAuthEnabled, firebasePasswordSignIn } from "@/lib/firebase-client";

const EMAIL_LINK_STORAGE_KEY = "nextsession-email-for-sign-in";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordless, setPasswordless] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      if (firebaseClientAuthEnabled()) {
        const credential = await firebasePasswordSignIn(email, password);
        await createServerSession(credential.idToken);
      } else {
        const response = await fetch("/api/v1/auth/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "Anmeldung fehlgeschlagen.");
      }
      window.location.assign("/app");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Anmeldung fehlgeschlagen.");
      setLoading(false);
    }
  }

  async function sendEmailLink(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/v1/auth/email-link/send", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Der Anmeldelink konnte nicht angefordert werden.");
      window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email.trim().toLowerCase());
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Der Anmeldelink konnte nicht angefordert werden.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="standalone-login">
    <section className="standalone-login-showcase">
      <a className="marketing-logo" href="/" aria-label="NextSession Kids! Startseite"><img src="/brand/nextsession-kids-transparent.svg" alt="NextSession Kids!" /></a>
      <div><span className="marketing-eyebrow">DEIN TEAM. DEIN TRAINING. DEINE PLANUNG.</span><h1>Alles, was dein Team braucht.</h1><p>Ein lebendiger Ort für Trainingsplanung, Termine und Mannschaft.</p><div className="login-showcase-points"><span><Shield /> Rollen und Rechte</span><span><ArrowRight /> Web-App für Trainer und Teams</span></div></div>
      <a className="back-home" href="/"><ArrowLeft /> Zur Startseite</a>
    </section>
    <section className="standalone-login-panel">
      <form onSubmit={passwordless ? sendEmailLink : submitPassword}>
        <a className="standalone-close" href="/" aria-label="Login schließen">×</a>
        <span className="standalone-kicker">NEXTSESSION KIDS!</span>
        <h2>{passwordless ? "Ohne Passwort" : "Einloggen"}</h2>
        {sent ? <div className="email-link-sent"><Check /><h3>Schau in dein Postfach</h3><p>Falls ein aktiver Zugang besteht, haben wir einen persönlichen Anmeldelink gesendet. Er kann nur einmal verwendet werden.</p><button type="button" onClick={() => setSent(false)}>Link erneut anfordern</button></div> : <>
          <p className="standalone-intro">{passwordless ? "Wir senden dir einen persönlichen Anmeldelink." : "Melde dich mit deinem persönlichen Zugang an."}</p>
          <label><span>E-Mail</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {!passwordless && <label><span>Passwort</span><div className="standalone-password"><input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>}
          {error && <div className="standalone-error">{error}</div>}
          <button className="standalone-submit" type="submit" disabled={loading}>{loading ? "Bitte warten …" : passwordless ? <><Mail /> Anmeldelink senden</> : <>Einloggen <ArrowRight /></>}</button>
        </>}
        {firebaseClientAuthEnabled() && <button className="passwordless-switch" type="button" onClick={() => { setPasswordless((value) => !value); setSent(false); setError(""); }}>{passwordless ? "Mit Passwort anmelden" : "Ohne Passwort anmelden"}</button>}
        <a className="standalone-help" href="mailto:support@nextsession.app">Probleme beim Einloggen?</a>
        <p className="standalone-invite">Neue Zugänge werden ausschließlich über persönliche Einladungen eines Admins erstellt.</p>
      </form>
    </section>
  </main>;
}
