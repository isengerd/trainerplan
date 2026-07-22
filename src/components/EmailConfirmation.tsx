"use client";

import { Check, LoaderCircle, Mail, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";

export function EmailConfirmation({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("E-Mail-Adresse wird bestätigt …");

  useEffect(() => {
    fetch("/api/v1/auth/email-change/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => {
        const result = await response.json() as { message?: string; error?: string };
        if (!response.ok) throw new Error(result.error || "E-Mail-Adresse konnte nicht bestätigt werden.");
        setState("success"); setMessage(result.message || "E-Mail-Adresse wurde bestätigt.");
      })
      .catch((error) => { setState("error"); setMessage(error instanceof Error ? error.message : "E-Mail-Adresse konnte nicht bestätigt werden."); });
  }, [token]);

  return <main className="login-page email-confirmation-page"><section className="login-brand"><span className="brand-mark"><Shield /></span><span className="eyebrow">TRAINERPLAN CLUB</span><h1>Sicher.<br />Bestätigt.</h1><p>E-Mail-Adressen werden erst nach dem Klick auf den persönlichen Bestätigungslink übernommen.</p></section><section className="login-panel"><div className="email-confirmation-card"><span className={`email-confirmation-icon ${state}`}>{state === "loading" ? <LoaderCircle /> : state === "success" ? <Check /> : <X />}</span><span className="eyebrow">E-MAIL-ÄNDERUNG</span><h2>{state === "loading" ? "Wird geprüft" : state === "success" ? "Adresse bestätigt" : "Bestätigung fehlgeschlagen"}</h2><p>{message}</p>{state !== "loading" && <a href="/"><Mail /> Zur Anmeldung</a>}</div></section></main>;
}
