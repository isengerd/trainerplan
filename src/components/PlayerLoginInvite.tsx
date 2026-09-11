"use client";

import { useEffect, useState } from "react";
import { PendingInvitations } from "./PendingInvitations";
import type { Role } from "@/data/club";
import { shouldSuggestPlayerLogin } from "@/lib/player-profile";

export function PlayerLoginInvite({ playerId, enabled, birthday, teamAgeGroup }: { playerId: string; enabled: boolean; birthday?: string; teamAgeGroup?: string }) {
  const [pending, setPending] = useState<Array<{ id: string; email: string; name: string; role: Role }>>([]);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/v1/players/${encodeURIComponent(playerId)}/login`, { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!cancelled && response.ok) setPending(result.invitations);
    }).catch(() => { if (!cancelled) setMessage("Ausstehende Einladungen konnten nicht geladen werden."); });
    return () => { cancelled = true; };
  }, [playerId, revision]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(""); setLink("");
    try {
      const response = await fetch(`/api/v1/players/${encodeURIComponent(playerId)}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json() as { error?: string; link?: string; emailSent?: boolean };
      if (!response.ok || !result.link) throw new Error(result.error || "Einladung konnte nicht erstellt werden.");
      setLink(result.link); setRevision((current) => current + 1);
      setMessage(result.emailSent ? "Einladung versendet. Der Spieler richtet darüber seinen eigenen Zugang ein." : "Die E-Mail konnte nicht versendet werden. Teile den Einladungslink direkt mit dem Spieler.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Einladung fehlgeschlagen."); }
    finally { setBusy(false); }
  }
  return <section id="player-login-setup" className="profile-card player-login-invite">
    <h2>Eigenen Spielerzugang einrichten</h2>
    {shouldSuggestPlayerLogin(birthday, teamAgeGroup) && <p className="player-login-suggestion"><strong>Bereit für einen eigenen Zugang?</strong><br />Ab E2 oder etwa zehn Jahren lohnt sich die Absprache: Hat das Kind ein eigenes Smartphone, kann es zusätzlich zu den Eltern selbst zu- und absagen.</p>}
    <p>Der Spieler erhält eine Einladung an seine eigene E-Mail-Adresse. Sein Profil, bisherige Daten und Elternverknüpfungen bleiben erhalten. Der Login wird erst beim Annehmen der Einladung aktiviert.</p>
    {enabled ? <form onSubmit={invite}><label><span>E-Mail-Adresse des Spielers</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="spieler@beispiel.de" /></label><button type="submit" className="primary" disabled={busy}>{busy ? "Wird erstellt …" : "Einladung senden"}</button></form> : <p>Verfügbar mit EM Pro oder Vereinslizenz. Nach dem Upgrade richtest du den Zugang an diesem bestehenden Profil ein.</p>}
    <PendingInvitations invitations={pending} canResend={enabled} onChanged={() => { setLink(""); setMessage(""); setRevision((current) => current + 1); }} />
    {message && <p role="status">{message}</p>}
    {link && <label><span>Einladungslink</span><input readOnly value={link} onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setMessage("Einladungslink kopiert."); } catch { setMessage("Bitte den Link markieren und kopieren."); } }}>Link kopieren</button></label>}
  </section>;
}
