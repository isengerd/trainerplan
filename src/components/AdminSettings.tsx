"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Clipboard, Clock3, Link2, Mail, Moon, Palette, Plus, RefreshCw, Send, Server, Shield, Sun, Trash2, Trophy, UserPlus, Users } from "lucide-react";
import { defaultPosition, roleLabels, type AgeGroupOption, type ClubInvitation, type ClubSettings, type ClubUser, type Role, type SmtpStatus, type TeamGroup } from "@/data/club";

type Props = {
  settings: ClubSettings;
  users: ClubUser[];
  groups: TeamGroup[];
  ageGroups: AgeGroupOption[];
  invitations: ClubInvitation[];
  smtp: SmtpStatus;
  onSave: (settings: ClubSettings) => void;
  onUsersChange: (users: ClubUser[]) => void;
  onReload: () => void;
};

const roleDescriptions: Record<Role, string[]> = {
  admin: ["Mitglieder und Rollen", "Gruppen und Einstellungen", "Alle Trainings und Termine"],
  trainer: ["Trainings und Übungen", "Termine und Turnierteams", "Keine Systemeinstellungen"],
  player: ["Termine ansehen", "Eigenes Turnierteam sehen", "Eigene Teilnahme melden"],
};

export function AdminSettingsPage({ settings, users, groups, ageGroups, invitations, smtp, onSave, onUsersChange, onReload }: Props) {
  const [form, setForm] = useState(settings);
  const [groupForm, setGroupForm] = useState(groups);
  const [invite, setInvite] = useState<{ name: string; email: string; role: Role; ageGroupId: string; groupId: string; sendEmail: boolean }>({ name: "", email: "", role: "player", ageGroupId: settings.ageGroupIds[0] || "f-jugend", groupId: groups[0]?.id || "", sendEmail: smtp.configured });
  const [inviteLink, setInviteLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setForm({ ...settings, theme: settings.theme ?? "light" }); }, [settings]);
  useEffect(() => { setGroupForm(groups); }, [groups]);
  useEffect(() => { if (!invite.groupId && groups[0]) setInvite((current) => ({ ...current, groupId: groups[0].id })); }, [groups, invite.groupId]);
  useEffect(() => {
    if (!form.ageGroupIds.includes(invite.ageGroupId)) setInvite((current) => ({ ...current, ageGroupId: form.ageGroupIds[0] || ageGroups[0]?.id || "" }));
  }, [ageGroups, form.ageGroupIds, invite.ageGroupId]);
  const set = <K extends keyof ClubSettings>(key: K, value: ClubSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const activeAgeGroups = ageGroups.filter((ageGroup) => form.ageGroupIds.includes(ageGroup.id));

  function notify(text: string) { setMessage(text); window.setTimeout(() => setMessage(""), 3200); }

  function toggleAgeGroup(id: string) {
    if (form.ageGroupIds.includes(id) && form.ageGroupIds.length === 1) return notify("Mindestens eine Altersklasse muss aktiv bleiben.");
    set("ageGroupIds", form.ageGroupIds.includes(id) ? form.ageGroupIds.filter((item) => item !== id) : [...form.ageGroupIds, id]);
  }

  function chooseTheme(theme: ClubSettings["theme"]) {
    const next = { ...form, theme };
    setForm(next);
    onSave(next);
    notify(theme === "light" ? "Helles Design aktiviert." : "Dunkles Design aktiviert.");
  }

  async function saveGroups() {
    setBusy(true);
    const response = await fetch("/api/v1/groups", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groups: groupForm }) });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) return notify(result.error || "Gruppen konnten nicht gespeichert werden.");
    notify("Gruppen gespeichert."); onReload();
  }

  function updateMembership(userId: string, patch: Partial<Pick<ClubUser, "role" | "groupId" | "ageGroup">>) {
    onUsersChange(users.map((user) => user.id === userId ? { ...user, ...patch, ...(patch.role ? { position: defaultPosition[patch.role] } : {}) } : user));
  }

  async function createInvite(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setInviteLink("");
    const response = await fetch("/api/v1/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...invite, groupId: invite.groupId || null }) });
    const result = await response.json() as { error?: string; emailSent?: boolean; emailError?: string; link?: string };
    setBusy(false);
    if (!response.ok) return notify(result.error || "Einladung konnte nicht erstellt werden.");
    setInviteLink(result.link || "");
    notify(result.emailSent ? "Einladung wurde per E-Mail versendet." : result.emailError || "Einladungslink wurde erstellt.");
    onReload();
  }

  async function copyLink(link: string) {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(link);
      else {
        const textarea = document.createElement("textarea"); textarea.value = link; document.body.appendChild(textarea); textarea.select(); document.execCommand("copy"); textarea.remove();
      }
      notify("Einladungslink kopiert.");
    } catch { notify("Link markieren und manuell kopieren."); }
  }

  async function removeInvitation(id: string) {
    const response = await fetch(`/api/v1/invitations/${id}`, { method: "DELETE" });
    if (!response.ok) return notify("Einladung konnte nicht gelöscht werden.");
    notify("Einladung zurückgezogen."); onReload();
  }

  async function renewInvitation(item: ClubInvitation) {
    setBusy(true);
    const response = await fetch("/api/v1/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: item.email, name: item.name, role: item.role, ageGroupId: ageGroups.find((ageGroup) => ageGroup.name === item.ageGroup)?.id || form.ageGroupIds[0], groupId: item.groupId || null, sendEmail: false }) });
    const result = await response.json() as { error?: string; link?: string };
    setBusy(false);
    if (!response.ok || !result.link) return notify(result.error || "Link konnte nicht erneuert werden.");
    setInviteLink(result.link); notify("Neuer Einladungslink erstellt."); onReload();
  }

  async function testSmtp() {
    setBusy(true);
    const response = await fetch("/api/v1/admin/smtp", { method: "POST" });
    const result = await response.json() as { message?: string; error?: string };
    setBusy(false); notify(result.message || result.error || "SMTP-Test beendet.");
  }

  const toggleRows: { key: keyof ClubSettings; title: string; description: string }[] = [
    { key: "splitTeamsEnabled", title: "A-/B-Teams & Spielerentwicklung", description: "Interne Spielerbewertungen sowie Team- und Trainerzuordnungen in Trainings aktivieren." },
    { key: "teamFeatureEnabled", title: "Mannschaftsbereich", description: "Mannschaft, Mitgliederliste und Rollen aktivieren." },
    { key: "attendanceEnabled", title: "Zu- und Absagen", description: "Spieler können auf Termine reagieren." },
    { key: "waitlistEnabled", title: "Warteliste", description: "Interessenten bei vollem Termin vormerken." },
    { key: "showResponsesToPlayers", title: "Antworten sichtbar", description: "Spieler sehen Rückmeldungen des Teams." },
    { key: "automaticReminders", title: "Erinnerungen", description: "Offene Rückmeldungen hervorheben." },
  ];

  return <section className="settings-page module-page">
    <div className="module-hero"><div><span className="eyebrow">ADMINISTRATION</span><h1>Einstellungen</h1><p>Mitglieder, Rechte, Gruppen und Einladungen zentral verwalten.</p></div><button className="primary" onClick={() => { onSave(form); notify("Einstellungen gespeichert."); }}><Check /> Speichern</button></div>

    <div className="settings-layout admin-settings-layout">
      <section className="settings-card settings-wide theme-settings"><div className="settings-title"><Palette /><span><h2>Farbdesign</h2><p>Das Design gilt für alle Bereiche der Web-App und wird für das Team gespeichert.</p></span></div><div className="theme-options"><button className={(form.theme ?? "light") === "dark" ? "active" : ""} onClick={() => chooseTheme("dark")}><span className="theme-preview dark"><i /><i /><i /></span><span><Moon /><strong>Dunkelgrün</strong><small>Ruhiges Design für Abend und Flutlicht</small></span>{(form.theme ?? "light") === "dark" && <Check />}</button><button className={(form.theme ?? "light") === "light" ? "active" : ""} onClick={() => chooseTheme("light")}><span className="theme-preview light"><i /><i /><i /></span><span><Sun /><strong>Hell</strong><small>Weißer Hintergrund und klare Kontraste</small></span>{(form.theme ?? "light") === "light" && <Check />}</button></div></section>

      <section className="settings-card settings-wide"><div className="settings-title"><Shield /><span><h2>Rollen & Rechte</h2><p>Die Rechte werden serverseitig geprüft und gelten in Web-App und späterer iOS-App.</p></span></div><div className="role-matrix">{(["admin", "trainer", "player"] as Role[]).map((role) => <article key={role} className={role}><span className={`role-badge ${role}`}>{roleLabels[role]}</span>{roleDescriptions[role].map((right) => <small key={right}><Check /> {right}</small>)}</article>)}</div><div className="member-rights-table"><div className="member-rights-head"><span>Person</span><span>Gruppe</span><span>Altersklasse</span><span>Rolle</span></div>{users.map((user) => <div key={user.id}><span><strong>{user.name}</strong><small>{user.email}</small></span><select value={user.groupId || ""} onChange={(event) => updateMembership(user.id, { groupId: event.target.value || null })}><option value="">Ohne Gruppe</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><select disabled={user.role !== "player"} value={user.ageGroup || activeAgeGroups[0]?.name || ""} onChange={(event) => updateMembership(user.id, { ageGroup: event.target.value })}>{user.ageGroup && !activeAgeGroups.some((ageGroup) => ageGroup.name === user.ageGroup) && <option value={user.ageGroup}>{user.ageGroup} (inaktiv)</option>}{activeAgeGroups.map((ageGroup) => <option key={ageGroup.id} value={ageGroup.name}>{ageGroup.name}</option>)}</select><select value={user.role} onChange={(event) => updateMembership(user.id, { role: event.target.value as Role })}>{(["player", "trainer", "admin"] as Role[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></div>)}</div></section>

      <section className="settings-card settings-wide tournament-settings"><div className="settings-title"><Trophy /><span><h2>Turniere & Mannschaftsplanung</h2><p>Regeln für die Zusammenstellung der Fußballmannschaften.</p></span></div><div className="tournament-settings-grid"><label><span>Mindestens F-Jugend</span><div><input type="number" min="0" max="99" value={form.tournamentMinFYouth} onChange={(event) => set("tournamentMinFYouth", Number(event.target.value))} /><small>Spieler pro Team</small></div></label><label><span>Maximale Teamgröße</span><div><input type="number" min="0" max="99" value={form.tournamentMaxTeamSize} onChange={(event) => set("tournamentMaxTeamSize", Number(event.target.value))} /><small>0 = unbegrenzt</small></div></label><label className="squad-name-setting"><span>Standard-Teamname</span><input value={form.tournamentDefaultSquadName} maxLength={80} onChange={(event) => set("tournamentDefaultSquadName", event.target.value)} placeholder="Mannschaft {n}" /></label></div><div className="tournament-setting-toggles"><label><span><strong>Trainer pro Mannschaft</strong><small>Fehlende Trainer als Warnung anzeigen.</small></span><input type="checkbox" checked={form.tournamentTrainerRequired} onChange={(event) => set("tournamentTrainerRequired", event.target.checked)} /><i /></label><label><span><strong>Benachrichtigungen vorbereiten</strong><small>Teamzuweisungen für spätere Benachrichtigungen markieren.</small></span><input type="checkbox" checked={form.tournamentNotifications} onChange={(event) => set("tournamentNotifications", event.target.checked)} /><i /></label></div><div className="age-group-settings"><span>Aktive Altersklassen</span><p>Die Auswahl stammt aus der Datenbank und begrenzt die Spielerlisten in der Mannschaftsplanung.</p><div>{ageGroups.map((ageGroup) => { const active = form.ageGroupIds.includes(ageGroup.id); return <button type="button" className={active ? "active" : ""} aria-pressed={active} key={ageGroup.id} onClick={() => toggleAgeGroup(ageGroup.id)}><span><strong>{ageGroup.name}</strong><small>{ageGroup.ageRange}</small></span>{active ? <Check /> : <Plus />}</button>; })}</div></div></section>

      <section className="settings-card"><div className="settings-title"><Users /><span><h2>Gruppen</h2><p>Mannschaften, Trainerteams oder Funktionsgruppen.</p></span></div><div className="group-editor">{groupForm.map((group, index) => <div key={group.id}><input type="color" value={group.color} onChange={(event) => setGroupForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item))} /><span><input value={group.name} onChange={(event) => setGroupForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Gruppenname" /><input value={group.description} onChange={(event) => setGroupForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} placeholder="Kurze Beschreibung" /></span><button aria-label="Gruppe entfernen" onClick={() => setGroupForm((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button></div>)}</div><div className="settings-inline-actions"><button onClick={() => setGroupForm((current) => [...current, { id: `group-${Date.now()}`, name: "Neue Gruppe", description: "", color: "#45d875" }])}><Plus /> Gruppe</button><button className="primary" disabled={busy} onClick={saveGroups}><Check /> Gruppen speichern</button></div></section>

      <section className="settings-card invitation-card"><div className="settings-title"><UserPlus /><span><h2>Person einladen</h2><p>Zugang vorbereiten und anschließend per E-Mail oder Einladungslink teilen.</p></span></div><form className="invite-form" onSubmit={createInvite}><div className="invite-fields"><label><span>Name <small>optional</small></span><input value={invite.name} onChange={(event) => setInvite({ ...invite, name: event.target.value })} placeholder="Vor- und Nachname" /></label><label><span>E-Mail-Adresse</span><input required type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} placeholder="name@verein.de" /></label><label><span>Rolle</span><select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as Role })}>{(["player", "trainer", "admin"] as Role[]).map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select></label>{invite.role === "player" && <label><span>Altersklasse</span><select value={invite.ageGroupId} onChange={(event) => setInvite({ ...invite, ageGroupId: event.target.value })}>{activeAgeGroups.map((ageGroup) => <option value={ageGroup.id} key={ageGroup.id}>{ageGroup.name} · {ageGroup.ageRange}</option>)}</select></label>}<label className={invite.role === "player" ? "invite-group-field" : ""}><span>Gruppe</span><select value={invite.groupId} onChange={(event) => setInvite({ ...invite, groupId: event.target.value })}><option value="">Ohne Gruppe</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label></div><label className="send-mail-toggle"><input type="checkbox" checked={invite.sendEmail} onChange={(event) => setInvite({ ...invite, sendEmail: event.target.checked })} /><span><Mail /><strong>Einladung per E-Mail senden</strong><small>{smtp.configured ? "SMTP ist bereit. Der Link wird zusätzlich angezeigt." : "SMTP fehlt – du kannst den Link trotzdem kopieren."}</small></span></label><button className="primary invite-submit" disabled={busy}><Send /> {busy ? "Einladung wird erstellt …" : "Einladung erstellen"}</button></form>{inviteLink && <div className="generated-link"><Link2 /><span><strong>Einladungslink ist bereit</strong><input readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} /></span><button onClick={() => copyLink(inviteLink)}><Clipboard /> Link kopieren</button></div>}</section>

      <section className="settings-card"><div className="settings-title"><Server /><span><h2>SMTP-Server</h2><p>Zugangsdaten werden sicher über Umgebungsvariablen bereitgestellt.</p></span></div><div className={`smtp-status ${smtp.configured ? "ready" : "missing"}`}><i /><span><strong>{smtp.configured ? "SMTP konfiguriert" : "SMTP noch nicht konfiguriert"}</strong><small>{smtp.configured ? `${smtp.host}:${smtp.port} · ${smtp.from}` : "SMTP_HOST und SMTP_FROM in der Umgebung setzen."}</small></span></div><button className="smtp-test" disabled={!smtp.configured || busy} onClick={testSmtp}><RefreshCw /> Verbindung testen</button></section>

      <section className="settings-card settings-wide"><div className="settings-title"><Mail /><span><h2>Offene Einladungen</h2><p>Links sind sieben Tage gültig und können erneuert oder zurückgezogen werden.</p></span></div><div className="invitation-list">{invitations.filter((item) => !item.acceptedAt).map((item) => <article key={item.id}><span className={`role-badge ${item.role}`}>{roleLabels[item.role]}</span><span><strong>{item.name || item.email}</strong><small>{item.name ? item.email : groups.find((group) => group.id === item.groupId)?.name || "Ohne Gruppe"} · bis {new Date(item.expiresAt).toLocaleDateString("de-DE")}</small></span><span className="invitation-actions"><button title="Neuen Link erzeugen" disabled={busy} onClick={() => renewInvitation(item)}><RefreshCw /></button><button title="Einladung zurückziehen" onClick={() => removeInvitation(item.id)}><Trash2 /></button></span></article>)}{!invitations.some((item) => !item.acceptedAt) && <p className="empty-invitations">Keine offenen Einladungen.</p>}</div></section>

      <section className="settings-card"><div className="settings-title"><Shield /><span><h2>Module & Sichtbarkeit</h2></span></div><div className="toggle-list">{toggleRows.map((row) => <label key={row.key}><span><strong>{row.title}</strong><small>{row.description}</small></span><input type="checkbox" checked={Boolean(form[row.key])} onChange={(event) => set(row.key, event.target.checked as never)} /><i /></label>)}</div></section>
      <section className="settings-card"><div className="settings-title"><Clock3 /><span><h2>Rückmeldefristen</h2></span></div><div className="deadline-grid"><label><span>Training</span><div><input type="number" min="0" value={form.trainingDeadlineHours} onChange={(event) => set("trainingDeadlineHours", Number(event.target.value))} /><small>Std.</small></div></label><label><span>Turnier</span><div><input type="number" min="0" value={form.tournamentDeadlineHours} onChange={(event) => set("tournamentDeadlineHours", Number(event.target.value))} /><small>Std.</small></div></label><label><span>Ereignis</span><div><input type="number" min="0" value={form.eventDeadlineHours} onChange={(event) => set("eventDeadlineHours", Number(event.target.value))} /><small>Std.</small></div></label></div><div className="settings-hint"><Bell /><span>Nach Ablauf können nur Trainer und Admins ändern.</span></div></section>
      <section className="settings-card"><div className="settings-title"><Users /><span><h2>Verein & Standards</h2></span></div><div className="settings-fields"><label><span>Vereinsname</span><input value={form.clubName} onChange={(event) => set("clubName", event.target.value)} /></label><label><span>Mannschaft</span><input value={form.teamName} onChange={(event) => set("teamName", event.target.value)} /></label></div><div className="deadline-grid"><label><span>Training</span><div><input type="number" min="1" value={form.defaultTrainingCapacity} onChange={(event) => set("defaultTrainingCapacity", Number(event.target.value))} /><small>Plätze</small></div></label><label><span>Turnier</span><div><input type="number" min="1" value={form.defaultTournamentCapacity} onChange={(event) => set("defaultTournamentCapacity", Number(event.target.value))} /><small>Plätze</small></div></label></div></section>
    </div>
    {message && <div className="toast"><Check /> {message}</div>}
  </section>;
}
