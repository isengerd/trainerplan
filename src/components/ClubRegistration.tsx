"use client";

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServerSession, firebaseClientAuthEnabled, firebasePasswordSignUp } from "@/lib/firebase-client";

export function ClubRegistration() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function continueWithEmail(event: React.FormEvent) {
    event.preventDefault(); setError(""); setStep("password");
  }

  async function createAccount(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const credential = firebaseClientAuthEnabled() ? await firebasePasswordSignUp(email, password) : null;
      const response = await fetch("/api/v1/auth/register", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credential ? { idToken: credential.idToken } : { email, password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Der Account konnte nicht erstellt werden.");
      if (credential) await createServerSession(credential.idToken);
      router.replace("/app"); router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Der Account konnte nicht erstellt werden.");
      setLoading(false);
    }
  }

  return <main className="simple-registration"><section className="simple-registration-card"><a className="standalone-close" href="/" aria-label="Registrierung schließen">×</a>{step === "email" ? <form onSubmit={continueWithEmail}><h1>Wie lautet deine E-Mail?</h1><label><span>E-Mail</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus /></label><p className="registration-legal">Mit der Registrierung akzeptierst du unsere <a href="/agb">Allgemeinen Geschäftsbedingungen</a> und die <a href="/datenschutz">Datenschutzerklärung</a>.</p><button className="standalone-submit" type="submit">Weiter <ArrowRight /></button><div className="simple-registration-footer"><a href="/login">Ich habe bereits ein Konto</a></div></form> : <form onSubmit={createAccount}><button className="simple-back" type="button" onClick={() => { setStep("email"); setError(""); }}><ArrowLeft /> E-Mail ändern</button><span className="standalone-kicker">FAST GESCHAFFT</span><h1>Lege dein Passwort fest.</h1><p className="simple-registration-intro">Dein Verein und dein Profil werden nach der ersten Anmeldung eingerichtet.</p><label><span>Passwort · mindestens 12 Zeichen</span><div className="standalone-password"><LockKeyhole /><input required minLength={12} maxLength={256} type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>{error && <div className="standalone-error">{error}</div>}<button className="standalone-submit" type="submit" disabled={loading}>{loading ? "Account wird erstellt …" : <>Account erstellen <ArrowRight /></>}</button><p className="setup-note"><Check /> Danach richtest du Verein und Mannschaft ein.</p></form>}</section></main>;
}
