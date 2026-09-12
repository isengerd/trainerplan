"use client";
import { useEffect, useState } from "react";
import { Shield, Copy, X } from "lucide-react";

export function OwnershipCard({ clubName, clubLicense, platformAdmin }: { clubName: string; clubLicense: boolean; platformAdmin?: boolean }) {
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<{ email: string; expiresAt: string } | null>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch("/api/v1/organization/ownership", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Übergabe konnte nicht geladen werden.");
    setPending(result.pending);
  }
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, []);
  async function change(method: "POST" | "DELETE") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/organization/ownership", { method, headers: { "Content-Type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ email, confirmed }) } : {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Übergabe konnte nicht gespeichert werden.");
      setLink(result.link || ""); setOpen(false); setConfirmed(false);
      await load();
      setMessage(method === "POST" ? "Link erstellt. Gib ihn persönlich an deinen Nachfolger weiter. Es wurde keine E-Mail versendet." : "Übergabe zurückgenommen. Der Link ist jetzt ungültig.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Bitte versuche es erneut."); }
    finally { setBusy(false); }
  }
  return <section className="settings-card settings-wide ownership-card">
    <div className="settings-title"><Shield /><span><h2>Inhaberschaft</h2><p>Du verwaltest {clubName} und die Lizenz. In EM Free bist du gleichzeitig der einzige Trainer.</p></span></div>
    {platformAdmin && <p>Dein Plattformadministrator-Zugang bleibt unabhängig von Tarif und Übergabe erhalten.</p>}
    {pending && <div className="ownership-pending"><span><strong>Übergabe an {pending.email}</strong><small>{new Date(pending.expiresAt) <= new Date() ? "Link abgelaufen – dein Zugang bleibt erhalten." : `Noch nicht angenommen · gültig bis ${new Date(pending.expiresAt).toLocaleDateString("de-DE")}`}</small></span><button type="button" disabled={busy} aria-label="Übergabe zurücknehmen" onClick={() => void change("DELETE")}><X /></button></div>}
    {link && <label><span>Persönlicher Übergabelink</span><input readOnly value={link} onFocus={(event) => event.target.select()} /><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setMessage("Link kopiert."); } catch { setMessage("Bitte markiere und kopiere den Link aus dem Textfeld."); } }}><Copy /> Link kopieren</button></label>}
    {!open ? <button type="button" disabled={busy} onClick={() => { setOpen(true); setEmail(pending?.email || ""); }}>{pending ? "Neuen Übergabelink vorbereiten" : "Inhaberschaft übertragen"}</button> : <form onSubmit={(event) => { event.preventDefault(); void change("POST"); }}>
      <p>Du behältst deinen Zugang, bis dein Nachfolger die Übernahme bestätigt. Danach entfällt deine Inhaberschaft. {platformAdmin ? "Dein Plattformadministrator-Zugang bleibt erhalten." : "In Free pausiert anschließend dein Trainerzugang."} Spieler, Eltern und bisherige Daten bleiben erhalten.{clubLicense && " Achtung: Die Übergabe umfasst den gesamten Verein mit allen Mannschaften."}</p>
      <label><span>E-Mail-Adresse des Nachfolgers</span><input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="ownership-confirm"><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Ich möchte die Inhaberschaft und Lizenzverwaltung an diese Person übertragen.</span></label>
      <div className="profile-inline-actions"><button type="button" disabled={busy} onClick={() => setOpen(false)}>Abbrechen</button><button className="primary" disabled={busy || !confirmed}>{busy ? "Wird vorbereitet …" : "Übergabelink erstellen"}</button></div>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
