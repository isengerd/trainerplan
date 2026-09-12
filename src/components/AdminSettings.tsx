"use client";

import { OwnershipCard } from "./OwnershipCard";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CalendarDays, CalendarRange, Check, Clock3, CreditCard, Download, FileText, LayoutList, Mail, Moon, Palette, Plus, RefreshCw, Server, Settings, Shield, Sun, Trash2, Trophy, Users } from "lucide-react";
import { type AgeGroupOption, type ClubSettings, type ClubUser, type OrganizationContext, type PushStatus, type SmtpStatus, type TeamGroup } from "@/data/club";


type Props = {
  onOpenTeam: () => void;
  settings: ClubSettings;
  groups: TeamGroup[];
  ageGroups: AgeGroupOption[];
  smtp: SmtpStatus;
  push: PushStatus;
  organization: OrganizationContext | null;
  onSave: (settings: ClubSettings) => void;
  onReload: () => void;
};

export function CalendarExportCard() {
  return <section className="settings-card settings-wide calendar-export-card">
    <div className="settings-title"><CalendarDays /><span><h2>Kalender exportieren</h2><p>Lade alle Termine als iCalendar-Datei für Apple Kalender, Google Kalender oder Outlook herunter.</p></span></div>
    <div className="calendar-export-content"><span><strong>NextSession-Kalender (.ics)</strong><small>Der Export enthält den aktuellen Stand. Für spätere Änderungen lädst du die Datei erneut herunter.</small></span><a className="primary" href="/api/v1/calendar.ics" download><Download /> Kalender herunterladen</a></div>
  </section>;
}

export function UserSettingsPage({ currentUser, onSave }: { currentUser: ClubUser; onSave: (user: ClubUser) => void }) {
  const [form, setForm] = useState(currentUser);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(currentUser), [currentUser]);

  function saveAttendanceDefaults() {
    onSave(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return <section className="settings-page module-page">
    <div className="module-hero"><div><span className="eyebrow">DEINE APP</span><h1>Einstellungen</h1><p>Persönliche Funktionen und Exporte verwalten.</p></div></div>
    <div className="settings-layout">{currentUser.role === "player" && <section className="settings-card settings-wide"><div className="settings-title"><Check /><span><h2>Meine Anwesenheits-Standards</h2><p>Lege fest, bei welchen neuen Terminen du automatisch als dabei eingetragen wirst. Du kannst jeden Termin weiterhin einzeln ab- oder zusagen.</p></span></div><div className="toggle-list"><label><span><strong>Bei Trainings immer anwesend</strong><small>Neue Trainings starten für dich mit „Dabei“.</small></span><input type="checkbox" checked={Boolean(form.defaultTrainingAttendance)} onChange={(event) => setForm({ ...form, defaultTrainingAttendance: event.target.checked })} /><i /></label><label><span><strong>Bei Turnieren und Ligaspielen immer anwesend</strong><small>Neue Turniere und Ligaspiele starten für dich mit „Dabei“.</small></span><input type="checkbox" checked={Boolean(form.defaultCompetitionAttendance)} onChange={(event) => setForm({ ...form, defaultCompetitionAttendance: event.target.checked })} /><i /></label></div><div className="profile-inline-actions"><button className="primary" onClick={saveAttendanceDefaults}><Check /> {saved ? "Gespeichert" : "Standards speichern"}</button></div></section>}<CalendarExportCard /></div>
  </section>;
}

export function LicensePage({ organization, ageGroups, onReload }: { organization: OrganizationContext; ageGroups: AgeGroupOption[]; onReload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [newTeam, setNewTeam] = useState({ name: "", ageGroup: ageGroups[0]?.id ?? "f1" });
  const activeTeam = organization.teams.find((team) => team.id === organization.activeTeamId) ?? organization.teams[0];

  async function upgrade(licenseType: "single_team_pro" | "club") {
    setBusy(true); setMessage("");
    const response = await fetch("/api/v1/organization/license", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ licenseType }) });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "Tarif konnte nicht geändert werden.");
    setMessage(licenseType === "club" ? "Vereinslizenz aktiviert." : "EM Pro aktiviert. Trainerzugänge und Rollenverwaltung sind jetzt verfügbar."); onReload();
  }

  async function downgrade(licenseType: "single_team_free" | "single_team_pro") {
    if (!activeTeam) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/v1/organization/license", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId: activeTeam.id, confirmation, licenseType }) });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "Tarif konnte nicht geändert werden.");
    setConfirmation(""); setMessage("Tarif umgestellt. Mannschafts- und Profildaten bleiben für ein späteres Upgrade erhalten."); onReload();
  }

  async function createTeam(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/v1/organization/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newTeam) });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "Mannschaft konnte nicht angelegt werden.");
    setNewTeam((current) => ({ ...current, name: "" })); setMessage("Mannschaft angelegt."); onReload();
  }

  return <section className="settings-page module-page license-page">
    <div className="module-hero"><div><span className="eyebrow">KONTO & VERTRAG</span><h1>Lizenz & Abrechnung</h1><p>Tarif, Zahlung und Rechnungen an einem festen Ort verwalten.</p></div></div>
    <div className="settings-layout">
      <section className="settings-card settings-wide license-overview"><div className="settings-title"><CreditCard /><span><h2>Aktueller Tarif</h2><p>Der Lizenzinhaber verwaltet den Vertrag unabhängig von den Mannschaftsrollen.</p></span></div><div className="license-status"><span><strong>{organization.licenseType === "club" ? "Vereinslizenz" : organization.licenseType === "single_team_pro" ? "Einzelmannschaft Pro" : "Einzelmannschaft Free"}</strong><small>{organization.licenseType === "club" ? `${organization.teams.length} aktive Mannschaften` : organization.licenseType === "single_team_pro" ? "Zugänge, Einladungen und Rollen für eine Mannschaft" : "Kader, Spieler- und Elternzugänge mit Rückmeldungen"}</small></span>{organization.licenseType === "single_team_free" && <button className="primary" disabled={busy || !organization.isOwner} onClick={() => void upgrade("single_team_pro")}>Auf EM Pro upgraden</button>}{organization.licenseType === "single_team_pro" && <button className="primary" disabled={busy || !organization.isOwner} onClick={() => void upgrade("club")}>Auf Vereinslizenz erweitern</button>}</div>{organization.licenseExpiresAt && <div className="license-expiry-warning"><AlertTriangle /><span><strong>Lizenz endet am {new Date(organization.licenseExpiresAt).toLocaleDateString("de-DE")}</strong><small>Danach wird EM Free aktiv. Der Inhaber behält den Trainerplatz; weitere Trainer- und Adminzugänge pausieren. Spieler- und Elternzugänge sowie Rückmeldungen bleiben in aktiven Mannschaften verfügbar.</small></span></div>}</section>
      <section className="settings-card"><div className="settings-title"><CreditCard /><span><h2>Zahlungsmethode</h2><p>Wird mit Einführung der kostenpflichtigen Tarife hier verwaltet.</p></span></div><div className="billing-placeholder">Noch keine Zahlungsmethode hinterlegt</div></section>
      <section className="settings-card"><div className="settings-title"><FileText /><span><h2>Rechnungen</h2><p>Spätere Rechnungen stehen hier zum Download bereit.</p></span></div><div className="billing-placeholder">Noch keine Rechnungen vorhanden</div></section>
      {organization.licenseType === "club" && <section className="settings-card settings-wide"><div className="settings-title"><Users /><span><h2>Mannschaften der Lizenz</h2><p>Aktive Mannschaften innerhalb des Vereinszugangs.</p></span></div><div className="organization-team-list">{organization.teams.map((team) => <article key={team.id}><span><strong>{team.name}</strong><small>{ageGroups.find((age) => age.id === team.ageGroup)?.name ?? team.ageGroup} · {team.memberCount} Mitglieder</small></span>{team.id === organization.activeTeamId && <em>Aktiv</em>}</article>)}</div><form className="create-organization-team" onSubmit={createTeam}><label><span>Name der Mannschaft</span><input required maxLength={120} value={newTeam.name} onChange={(event) => setNewTeam({ ...newTeam, name: event.target.value })} placeholder="z. B. E1 Grün" /></label><label><span>Altersklasse</span><select value={newTeam.ageGroup} onChange={(event) => setNewTeam({ ...newTeam, ageGroup: event.target.value })}>{ageGroups.map((age) => <option key={age.id} value={age.id}>{age.name}</option>)}</select></label><button className="primary" disabled={busy}><Plus /> Mannschaft anlegen</button></form></section>}
      {organization.isOwner && <OwnershipCard clubName={organization.clubName} clubLicense={organization.licenseType === "club"} platformAdmin={organization.isPlatformAdmin} />}
      {organization.isOwner && organization.licenseType !== "single_team_free" && <section className="settings-card settings-wide license-downgrade"><div className="settings-title"><AlertTriangle /><span><h2>Tarif herabstufen</h2><p>{organization.licenseType === "club" ? `„${activeTeam?.name}“ bleibt aktiv; weitere Mannschaften werden archiviert.` : "Du behältst den einzigen Trainerplatz. Weitere Trainer- und Adminzugänge sowie die Rollenverwaltung pausieren. Spieler und Eltern können weiterhin zu- und absagen."} Keine Mannschafts- oder Profildaten werden gelöscht.</p></span></div><div className="license-loss-list"><strong>Nach dem Wechsel nicht mehr verfügbar:</strong><span>• Zusätzliche Trainer- und Adminzugänge in EM Free</span><span>• Rollen- und Rechteverwaltung</span>{organization.licenseType === "club" && <span>• mehrere aktive Mannschaften</span>}</div><label><span>Zur Bestätigung TARIF WECHSELN eingeben</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><div className="profile-inline-actions">{organization.licenseType === "club" && <button disabled={busy || confirmation !== "TARIF WECHSELN"} onClick={() => void downgrade("single_team_pro")}>Zu EM Pro</button>}<button className="danger" disabled={busy || confirmation !== "TARIF WECHSELN"} onClick={() => void downgrade("single_team_free")}>Zu EM Free</button></div></section>}
    </div>
    {message && <div className="toast"><Check /> {message}</div>}
  </section>;
}

export function AdminSettingsPage({ onOpenTeam, settings, groups, ageGroups, smtp, push, organization, onSave, onReload }: Props) {
  const [form, setForm] = useState(settings);
  const [groupForm, setGroupForm] = useState(groups);
  const [newTeam, setNewTeam] = useState({ name: "", ageGroup: ageGroups[0]?.id ?? "f1" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [desktopSection, setDesktopSection] = useState<"general" | "calendar" | "groups" | "communication">("general");

  useEffect(() => { setForm({ ...settings, theme: settings.theme ?? "light", dashboardView: settings.dashboardView ?? "calendar" }); }, [settings]);
  useEffect(() => { setGroupForm(groups); }, [groups]);
  const set = <K extends keyof ClubSettings>(key: K, value: ClubSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const teamAgeGroup = form.teamAgeGroup ?? organization?.teams.find((team) => team.id === organization.activeTeamId)?.ageGroup ?? "";
  const activeAgeGroups = ageGroups.filter((ageGroup) => form.ageGroupIds.includes(ageGroup.id));

  function notify(text: string) { setMessage(text); window.setTimeout(() => setMessage(""), 3200); }

  function toggleAgeGroup(id: string) {
    if (form.ageGroupIds.includes(id) && form.ageGroupIds.length === 1) return notify("Mindestens eine Altersklasse muss aktiv bleiben.");
    const removing = form.ageGroupIds.includes(id);
    setForm((current) => ({ ...current, ageGroupIds: removing ? current.ageGroupIds.filter((item) => item !== id) : [...current.ageGroupIds, id], ...(!removing && (ageGroups.find((item) => item.id === id)?.sortOrder ?? 0) >= 40 ? { leagueMatchesEnabled: true } : {}) }));
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



  async function testSmtp() {
    setBusy(true);
    const response = await fetch("/api/v1/admin/smtp", { method: "POST" });
    const result = await response.json() as { message?: string; error?: string };
    setBusy(false); notify(result.message || result.error || "SMTP-Test beendet.");
  }

  async function testPush() {
    setBusy(true);
    const response = await fetch("/api/v1/admin/push", { method: "POST" });
    const result = await response.json() as { message?: string; error?: string };
    setBusy(false); notify(result.message || result.error || "Push-Test beendet.");
  }

  async function enableClubMode() {
    setBusy(true);
    const response = await fetch("/api/v1/organization/license", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ licenseType: "club" }) });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) return notify(result.error || "Vereinsmodus konnte nicht aktiviert werden.");
    notify("Vereinsmodus aktiviert. Die bestehende Mannschaft und alle Daten bleiben erhalten."); onReload();
  }

  async function createTeam(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    const response = await fetch("/api/v1/organization/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newTeam) });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) return notify(result.error || "Mannschaft konnte nicht angelegt werden.");
    setNewTeam((current) => ({ ...current, name: "" })); notify("Mannschaft angelegt."); onReload();
  }

  const toggleRows: { key: keyof ClubSettings; title: string; description: string }[] = [
    { key: "splitTeamsEnabled", title: "A-/B-Teams & Spielerentwicklung", description: "Interne Spielerbewertungen sowie Team- und Trainerzuordnungen in Trainings aktivieren." },
    { key: "leagueMatchesEnabled", title: "Ligaspiele", description: "Spieltermine mit Gegner sowie Heim- oder Auswärtsangabe im Kalender aktivieren." },
    { key: "attendanceEnabled", title: "Zu- und Absagen", description: "Spieler können auf Termine reagieren." },
    { key: "waitlistEnabled", title: "Warteliste", description: "Interessenten bei vollem Termin vormerken." },
    { key: "showResponsesToPlayers", title: "Antworten sichtbar", description: "Spieler sehen Rückmeldungen des Teams." },
    { key: "automaticReminders", title: "Erinnerungen", description: "Offene Rückmeldungen hervorheben." },
  ];

  const settingsSections = [
    { title: "Dashboard-Ansicht", label: "Dashboard" },
    { title: "Kalender exportieren", label: "Kalender" },
    { title: "Farbdesign", label: "Design" },
    { title: "Turniere & Mannschaftsplanung", label: "Turniere" },
    ...(organization?.isClubAdmin ? [{ title: "Funktionsgruppen", label: "Gruppen" }] : []),
    ...(organization?.isClubAdmin ? [{ title: "SMTP-Server", label: "Kommunikation" }] : []),
    { title: "Module & Sichtbarkeit", label: "Module" },
    { title: "Mannschaft & Standards", label: "Mannschaft" },
  ];

  function goToSettingsSection(title: string) {
    const heading = Array.from(document.querySelectorAll<HTMLElement>(".admin-settings-layout .settings-title h2")).find((item) => item.textContent?.trim() === title);
    heading?.closest(".settings-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <section className="settings-page module-page">
    <div className="module-hero"><div><span className="eyebrow">ADMINISTRATION</span><h1>Einstellungen</h1><p>Darstellung, Mannschaftsvorgaben und Funktionen einstellen.</p></div><button className="primary" onClick={() => { onSave(form); notify("Einstellungen gespeichert."); }}><Check /> Speichern</button></div>

    <div className="settings-person-shortcut"><button type="button" onClick={onOpenTeam}><Users /> Personen und Zugänge verwalten</button></div>

    <nav className="desktop-settings-nav" aria-label="Einstellungsbereiche">
      <span>MANNSCHAFT</span>
      <button className={desktopSection === "general" ? "active" : ""} onClick={() => setDesktopSection("general")}><Settings /> <span><strong>Allgemein</strong><small>Darstellung und Standards</small></span></button>
      <button className={desktopSection === "calendar" ? "active" : ""} onClick={() => setDesktopSection("calendar")}><CalendarDays /> <span><strong>Termine</strong><small>Kalender und Turniere</small></span></button>
      {organization?.isClubAdmin && <><span>VEREIN</span><button className={desktopSection === "groups" ? "active" : ""} onClick={() => setDesktopSection("groups")}><Users /> <span><strong>Gruppen</strong><small>Vereinsweite Gruppen</small></span></button><button className={desktopSection === "communication" ? "active" : ""} onClick={() => setDesktopSection("communication")}><Mail /> <span><strong>Kommunikation</strong><small>E-Mail und Push</small></span></button></>}
      <button className="desktop-settings-save" onClick={() => { onSave(form); notify("Einstellungen gespeichert."); }}><Check /> <span><strong>Speichern</strong><small>Änderungen übernehmen</small></span></button>
    </nav>

    <nav className="settings-subnav" aria-label="Einstellungsbereiche">
      {settingsSections.map((section) => <button type="button" key={section.title} onClick={() => goToSettingsSection(section.title)}>{section.label}</button>)}
    </nav>

    <div className={`settings-layout admin-settings-layout desktop-section-${desktopSection} ${organization?.isClubAdmin ? "account-owner-settings" : "team-admin-settings"}`}>
      <CalendarExportCard />
      <section className="settings-card settings-wide dashboard-view-settings"><div className="settings-title"><LayoutList /><span><h2>Dashboard-Ansicht</h2><p>Lege fest, womit Trainer und Admins auf dieser Mannschaft starten.</p></span></div><div className="dashboard-view-options"><button type="button" className={(form.dashboardView ?? "calendar") === "calendar" ? "active" : ""} onClick={() => set("dashboardView", "calendar")}><CalendarDays /><span><strong>Kalenderansicht</strong><small>Die nächsten drei Ereignisse als einzelne Karten</small></span>{(form.dashboardView ?? "calendar") === "calendar" && <Check />}</button><button type="button" className={form.dashboardView === "week" ? "active" : ""} onClick={() => set("dashboardView", "week")}><CalendarRange /><span><strong>Wochenansicht</strong><small>Woche, offene Aufgaben und Trainingsimpuls</small></span>{form.dashboardView === "week" && <Check />}</button></div></section>
      <section className="settings-card settings-wide theme-settings"><div className="settings-title"><Palette /><span><h2>Farbdesign</h2><p>Das Design gilt für alle Bereiche der Web-App und wird für das Team gespeichert.</p></span></div><div className="theme-options"><button className={(form.theme ?? "light") === "dark" ? "active" : ""} onClick={() => chooseTheme("dark")}><span className="theme-preview dark"><i /><i /><i /></span><span><Moon /><strong>Dunkelgrün</strong><small>Ruhiges Design für Abend und Flutlicht</small></span>{(form.theme ?? "light") === "dark" && <Check />}</button><button className={(form.theme ?? "light") === "light" ? "active" : ""} onClick={() => chooseTheme("light")}><span className="theme-preview light"><i /><i /><i /></span><span><Sun /><strong>Hell</strong><small>Weißer Hintergrund und klare Kontraste</small></span>{(form.theme ?? "light") === "light" && <Check />}</button></div></section>


      {organization?.isClubAdmin && false && <section />}

      <section className="settings-card settings-wide tournament-settings"><div className="settings-title"><Trophy /><span><h2>Turniere & Mannschaftsplanung</h2><p>Regeln für die Zusammenstellung der Fußballmannschaften.</p></span></div><div className="tournament-settings-grid"><label><span>Mindestens F-Jugend</span><div><input type="number" min="0" max="99" value={form.tournamentMinFYouth} onChange={(event) => set("tournamentMinFYouth", Number(event.target.value))} /><small>Spieler pro Team</small></div></label><label><span>Maximale Teamgröße</span><div><input type="number" min="0" max="99" value={form.tournamentMaxTeamSize} onChange={(event) => set("tournamentMaxTeamSize", Number(event.target.value))} /><small>0 = unbegrenzt</small></div></label><label className="squad-name-setting"><span>Standard-Teamname</span><input value={form.tournamentDefaultSquadName} maxLength={80} onChange={(event) => set("tournamentDefaultSquadName", event.target.value)} placeholder="Mannschaft {n}" /></label></div><div className="tournament-setting-toggles"><label><span><strong>Trainer pro Mannschaft</strong><small>Fehlende Trainer als Warnung anzeigen.</small></span><input type="checkbox" checked={form.tournamentTrainerRequired} onChange={(event) => set("tournamentTrainerRequired", event.target.checked)} /><i /></label><label><span><strong>Benachrichtigungen vorbereiten</strong><small>Teamzuweisungen für spätere Benachrichtigungen markieren.</small></span><input type="checkbox" checked={form.tournamentNotifications} onChange={(event) => set("tournamentNotifications", event.target.checked)} /><i /></label></div><div className="age-group-settings"><span>Verfügbare Altersklassen für Mannschaften</span><p>Diese Auswahl beschreibt mögliche Mannschaften. Die Altersklasse eines Spielers wird daraus nicht automatisch festgelegt.</p><div>{ageGroups.map((ageGroup) => { const active = form.ageGroupIds.includes(ageGroup.id); return <button type="button" className={active ? "active" : ""} aria-pressed={active} key={ageGroup.id} onClick={() => toggleAgeGroup(ageGroup.id)}><span><strong>{ageGroup.name}</strong><small>{ageGroup.ageRange}</small></span>{active ? <Check /> : <Plus />}</button>; })}</div></div></section>

      <section className="settings-card"><div className="settings-title"><Users /><span><h2>Funktionsgruppen</h2><p>Optionale Zusatzgruppen, etwa Trainerteam, Torwarttraining oder Fördergruppe. Mannschaften werden hier nicht angelegt.</p></span></div><div className="group-editor">{groupForm.map((group, index) => <div key={group.id}><input type="color" value={group.color} onChange={(event) => setGroupForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item))} /><span><input value={group.name} onChange={(event) => setGroupForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="z. B. Torwarttraining" /><input value={group.description} onChange={(event) => setGroupForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} placeholder="Kurze Beschreibung" /></span><button aria-label="Funktionsgruppe entfernen" onClick={() => setGroupForm((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button></div>)}</div><div className="settings-inline-actions"><button onClick={() => setGroupForm((current) => [...current, { id: `group-${Date.now()}`, name: "Neue Funktionsgruppe", description: "", color: "#45d875" }])}><Plus /> Gruppe</button><button className="primary" disabled={busy} onClick={saveGroups}><Check /> Gruppen speichern</button></div></section>

      <section className="settings-card"><div className="settings-title"><Server /><span><h2>SMTP-Server</h2><p>Zugangsdaten werden sicher über Umgebungsvariablen bereitgestellt.</p></span></div><div className={`smtp-status ${smtp.configured ? "ready" : "missing"}`}><i /><span><strong>{smtp.configured ? "SMTP konfiguriert" : "SMTP noch nicht konfiguriert"}</strong><small>{smtp.configured ? `${smtp.host}:${smtp.port} · ${smtp.from}` : "SMTP_HOST und SMTP_FROM in der Umgebung setzen."}</small></span></div><button className="smtp-test" disabled={!smtp.configured || busy} onClick={testSmtp}><RefreshCw /> Verbindung testen</button></section>

      <section className="settings-card"><div className="settings-title"><Bell /><span><h2>Push-Benachrichtigungen</h2><p>Firebase-Verbindung und dein aktuelles Gerät testen.</p></span></div><div className={`smtp-status ${push.configured && push.devices > 0 ? "ready" : "missing"}`}><i /><span><strong>{!push.configured ? "Firebase noch nicht konfiguriert" : push.devices > 0 ? "Push ist bereit" : "Noch kein Gerät registriert"}</strong><small>{push.configured ? `${push.devices} Gerät${push.devices === 1 ? "" : "e"} mit deinem Konto verbunden` : "Firebase-Variablen in Vercel prüfen."}</small></span></div><button className="smtp-test" disabled={!push.configured || push.devices < 1 || busy} onClick={testPush}><Bell /> Test-Push senden</button></section>

      <section className="settings-card"><div className="settings-title"><Shield /><span><h2>Module & Sichtbarkeit</h2></span></div><div className="toggle-list">{toggleRows.map((row) => <label key={row.key}><span><strong>{row.title}</strong><small>{row.description}</small></span><input type="checkbox" checked={Boolean(form[row.key])} onChange={(event) => set(row.key, event.target.checked as never)} /><i /></label>)}</div></section>
      <section className="settings-card"><div className="settings-title"><Clock3 /><span><h2>Rückmeldefristen</h2></span></div><div className="deadline-grid"><label><span>Training</span><div><input type="number" min="0" value={form.trainingDeadlineHours} onChange={(event) => set("trainingDeadlineHours", Number(event.target.value))} /><small>Std.</small></div></label><label><span>Turnier</span><div><input type="number" min="0" value={form.tournamentDeadlineHours} onChange={(event) => set("tournamentDeadlineHours", Number(event.target.value))} /><small>Std.</small></div></label><label><span>Ereignis</span><div><input type="number" min="0" value={form.eventDeadlineHours} onChange={(event) => set("eventDeadlineHours", Number(event.target.value))} /><small>Std.</small></div></label></div><div className="settings-hint"><Bell /><span>Nach Ablauf können nur Trainer und Admins ändern.</span></div></section>
      <section className="settings-card team-standards-card"><div className="settings-title"><Users /><span><h2>Mannschaft & Standards</h2><p>Mannschaftsname und Vorgaben gelten nur für die aktuell ausgewählte Mannschaft.</p></span></div><div className="settings-fields">{organization?.isClubAdmin && <label><span>Vereinsname</span><input value={form.clubName} onChange={(event) => set("clubName", event.target.value)} /></label>}<label><span>Mannschaftsname</span><input value={form.teamName} onChange={(event) => set("teamName", event.target.value)} /></label><label><span>Altersklasse</span><select value={teamAgeGroup} onChange={(event) => set("teamAgeGroup", event.target.value)}><option value="" disabled>Altersklasse auswählen</option>{ageGroups.map((age) => <option key={age.id} value={age.id}>{age.name}</option>)}</select></label></div><div className="deadline-grid"><label><span>Training</span><div><input type="number" min="1" value={form.defaultTrainingCapacity} onChange={(event) => set("defaultTrainingCapacity", Number(event.target.value))} /><small>Plätze</small></div></label><label><span>Turnier</span><div><input type="number" min="1" value={form.defaultTournamentCapacity} onChange={(event) => set("defaultTournamentCapacity", Number(event.target.value))} /><small>Plätze</small></div></label></div></section>
    </div>
    {message && <div className="toast"><Check /> {message}</div>}
  </section>;
}
