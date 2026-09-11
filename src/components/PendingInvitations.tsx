"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { roleLabels, type Role } from "@/data/club";

type PendingInvitation = { expiresAt?: string; id: string; email: string; name?: string; role: Role; acceptedAt?: string | null; managedPlayerId?: string | null };
export function PendingInvitations({ invitations, users = [], onChanged, canResend = true, title = "Ausstehende Einladungen" }: { title?: string; invitations: PendingInvitation[]; users?: Array<{ id: string; name: string }>; onChanged: () => void; canResend?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const pending = invitations.filter((item) => !item.acceptedAt && !removed.includes(item.id));
  async function act(item: PendingInvitation, remove: boolean) {
    if (busy) return;
    if (remove && !window.confirm("Einladung zurücknehmen? Der Einladungslink wird ungültig. Bestehende Profile und Konten bleiben erhalten.")) return;
    setBusy(item.id); setMessage(""); setLink("");
    try {
      const response = await fetch(`/api/v1/invitations/${encodeURIComponent(item.id)}`, { method: remove ? "DELETE" : "POST" });
      const result = await response.json() as { error?: string; link?: string; emailSent?: boolean };
      if (!response.ok) throw new Error(result.error || "Einladung konnte nicht aktualisiert werden.");
      if (remove) { setRemoved((current) => [...current, item.id]); setMessage("Einladung zurückgenommen."); }
      else if (result.emailSent) setMessage("Einladung erneut gesendet. Der bisherige Link ist ungültig.");
      else { setLink(result.link || ""); setMessage(item.email ? "Die E-Mail konnte nicht versendet werden. Teile den erneuerten Link direkt." : "Link erneuert. Der bisherige Link ist ungültig."); }
      onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Aktion fehlgeschlagen."); }
    finally { setBusy(null); }
  }
  return <section className="team-pending-invites pending-invitations-panel">
    <header><span><strong>{title}</strong><small>{pending.length ? `${pending.length} noch nicht angenommen` : "Keine ausstehenden Einladungen"}</small></span></header>
    {pending.map((item) => <article key={item.id}><span><strong>{users.find((user) => user.id === item.managedPlayerId)?.name || item.name || item.email || "Einladung"}</strong><small>{item.role === "guardian" ? "Elternzugang" : item.role === "player" ? "Eigener Spielerzugang" : roleLabels[item.role]} · {item.email || "Ohne E-Mail-Adresse"}{item.expiresAt && new Date(item.expiresAt) <= new Date() ? " · Link abgelaufen" : " · Einladung offen"}</small></span><div className="pending-invite-actions"><button type="button" disabled={Boolean(busy) || !canResend} onClick={() => void act(item, false)}><Send /><span>{item.email ? "Erneut senden" : "Link erneuern"}</span></button><button type="button" className="danger invitation-revoke" disabled={Boolean(busy)} title="Einladung zurücknehmen" aria-label={`Einladung für ${item.email || item.name || "diese Person"} zurücknehmen`} onClick={() => void act(item, true)}><X /></button></div></article>)}
    {message && <p role="status">{message}</p>}
    {link && <label><span>Erneuerter Einladungslink</span><input readOnly value={link} onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setMessage("Link kopiert."); } catch { setMessage("Bitte den Link markieren und kopieren."); } }}>Link kopieren</button></label>}
  </section>;
}
