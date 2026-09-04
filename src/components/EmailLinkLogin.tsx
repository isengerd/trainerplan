"use client";

import { ArrowRight, Check, LoaderCircle, Mail, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

const EMAIL_LINK_STORAGE_KEY = "nextsession-email-for-sign-in";

export function EmailLinkLogin() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showAppLink, setShowAppLink] = useState(false);
  const [error, setError] = useState("");
  const [oobCode, setOobCode] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY) || "";
    setEmail(stored);
    setOobCode(new URL(window.location.href).searchParams.get("oobCode") || "");
    setShowAppLink(/Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent));
  }, []);

  async function verify(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      if (!oobCode) throw new Error("Dieser Anmeldelink ist unvollständig.");
      const response = await fetch("/api/v1/auth/email-link/verify", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, oobCode }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Der Anmeldelink konnte nicht bestätigt werden.");
      window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
      setComplete(true);
      window.setTimeout(() => window.location.replace("/app"), 500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Der Anmeldelink konnte nicht bestätigt werden.");
      setLoading(false);
    }
  }

  const appLink = oobCode ? `de.trainerplan.app://login/email-link?oobCode=${encodeURIComponent(oobCode)}` : "";

  return <main className="email-link-page"><section className="email-link-card">
    <span className={`email-link-icon ${complete ? "success" : error ? "error" : ""}`}>{loading ? <LoaderCircle /> : complete ? <Check /> : error ? <X /> : <Mail />}</span>
    <span className="standalone-kicker">NEXTSESSION KIDS!</span>
    <h1>{complete ? "Du bist angemeldet" : "Anmeldung bestätigen"}</h1>
    {complete ? <p>NextSession wird geöffnet …</p> : <form onSubmit={verify}><p>Bestätige die E-Mail-Adresse, an die dieser persönliche Link geschickt wurde.</p><label><span>E-Mail-Adresse</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <div className="standalone-error">{error}</div>}<button className="standalone-submit" type="submit" disabled={loading || !oobCode}>{loading ? "Link wird geprüft …" : <>Sicher anmelden <ArrowRight /></>}</button></form>}
    {!complete && showAppLink && appLink && <a className="open-native-app" href={appLink}><Smartphone /> In der NextSession-App öffnen</a>}
    <a className="email-link-back" href="/login">Neuen Link anfordern</a>
  </section></main>;
}
