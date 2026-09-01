"use client";

import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Shield } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/v1/auth/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error || "Anmeldung fehlgeschlagen."); setLoading(false); return; }
    router.replace("/app"); router.refresh();
  }

  return <main className="standalone-login"><section className="standalone-login-showcase"><a className="marketing-logo" href="/" aria-label="Zur Startseite"><span>TP</span><strong>TRAINERPLAN</strong></a><div><span className="marketing-eyebrow">DEIN TEAM. DEIN TRAINING. DEINE PLANUNG.</span><h1>Alles, was dein Team braucht.</h1><p>Ein ruhiger Ort für Trainingsplanung, Termine und Mannschaft.</p><div className="login-showcase-points"><span><Shield /> Rollen und Rechte</span><span><ArrowRight /> Web-App für Trainer und Teams</span></div></div><a className="back-home" href="/"><ArrowLeft /> Zur Startseite</a></section><section className="standalone-login-panel"><form onSubmit={submit}><a className="standalone-close" href="/" aria-label="Login schließen">×</a><span className="standalone-kicker">TRAINERPLAN CLUB</span><h2>Einloggen</h2><p className="standalone-intro">Melde dich mit deinem persönlichen Zugang an.</p><label><span>E-Mail</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label><span>Passwort</span><div className="standalone-password"><input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>{error && <div className="standalone-error">{error}</div>}<button className="standalone-submit" type="submit" disabled={loading}>{loading ? "Anmeldung läuft …" : <>Einloggen <ArrowRight /></>}</button><a className="standalone-help" href="mailto:support@trainerplan.local">Probleme beim Einloggen?</a><p className="standalone-invite">Neue Zugänge werden ausschließlich über persönliche Einladungen eines Admins erstellt.</p></form></section></main>;
}
