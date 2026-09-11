"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bell, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Clock3, Cloud, CloudSun, Copy, Edit3,
  Info, KeyRound, Lock, Mail, Megaphone, Navigation, Plus, Search, Send, Shield, Star, Sun,
  ThumbsDown, ThumbsUp, Trash2, Trophy, Users, X,
} from "lucide-react";
import { defaultPosition, eventLabels, positionOptions, roleLabels, type Attendance, type ClubEvent, type ClubInvitation, type ClubSettings, type ClubUser, type EventType, type RepeatFrequency, type Role, type TournamentPlan } from "@/data/club";
import { PlayerLoginInvite } from "./PlayerLoginInvite";
import { PlayerRemoveDialog } from "./PlayerRemoveDialog";
import { ageInYears, playerAccessLabel, visibleProfileEmail } from "@/lib/player-profile";
import { firebaseClientAuthEnabled, firebasePasswordSignIn } from "@/lib/firebase-client";

function AttendanceTabIcon({ type }: { type: "all" | "yes" | "open" | "no" }) {
  return <span className={`attendance-tab-icon mascot-${type}`} aria-hidden="true" />;
}

export function Avatar({ user, size = "medium" }: { user: ClubUser; size?: "small" | "medium" | "large" }) {
  return user.avatar
    ? <span className={`club-avatar ${size}`}><img src={user.avatar} alt="" /></span>
    : <span className={`club-avatar ${size}`}>{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>;
}

export function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<string | null> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const loginError = await onLogin(email, password);
    if (loginError) setError(loginError);
    setLoading(false);
  }

  return <main className="login-page">
    <section className="login-brand"><span className="brand-mark"><Shield /></span><span className="eyebrow">NEXTSESSION KIDS!</span><h1>Ein Team.<br />Ein gemeinsamer Plan.</h1><p>Training, Termine und Zusagen für deine Mannschaft – übersichtlich an einem Ort.</p><div className="login-feature"><CalendarDays /><span><strong>Kalender & Termine</strong><small>Alle wissen, wann und wo es losgeht.</small></span></div><div className="login-feature"><Users /><span><strong>Mannschaft organisieren</strong><small>Rollen, Profile und Teilnahme verwalten.</small></span></div></section>
    <section className="login-panel"><form onSubmit={submit}><span className="eyebrow">WILLKOMMEN ZURÜCK</span><h2>Anmelden</h2><p>Melde dich mit deinem persönlichen Zugang an.</p><label><span>E-Mail-Adresse</span><div><Mail /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label><label><span>Passwort</span><div><Lock /><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>{error && <div className="login-error">{error}</div>}<button className="primary login-submit" type="submit" disabled={loading}>{loading ? "Anmeldung läuft …" : <>Anmelden <ChevronRight /></>}</button><div className="login-links"><span>Zugang nur über persönliche Einladung</span></div></form></section>
  </main>;
}

export function TeamPage({ teamAgeGroup, users, invitations, currentUser, accessManagementEnabled, onUsersChange, onProfile, smtpConfigured, onInvited }: { teamAgeGroup?: string; users: ClubUser[]; invitations: ClubInvitation[]; currentUser: ClubUser; accessManagementEnabled: boolean; onUsersChange: (users: ClubUser[]) => void; onProfile: (user: ClubUser) => void; smtpConfigured: boolean; onInvited: () => void }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const [numberSort, setNumberSort] = useState<{ key: "ballNumber" | "number"; direction: "asc" | "desc" } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const visible = users
    .filter((user) => (accessManagementEnabled || user.role === "player") && (role === "all" || user.role === role) && user.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (!numberSort) return 0;
      const aValue = a[numberSort.key];
      const bValue = b[numberSort.key];
      if (aValue == null && bValue == null) return a.name.localeCompare(b.name, "de");
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      const difference = aValue - bValue;
      return difference === 0 ? a.name.localeCompare(b.name, "de") : numberSort.direction === "asc" ? difference : -difference;
    });
  const players = users.filter((user) => user.role === "player");

  function toggleNumberSort(key: "ballNumber" | "number") {
    setNumberSort((current) => current?.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
  }

  function setUserRole(id: string, nextRole: Role) {
    onUsersChange(users.map((user) => user.id === id ? { ...user, role: nextRole, position: defaultPosition[nextRole] } : user));
  }

  return <section className="team-page module-page">
    <div className="module-hero"><div><span className="eyebrow">MANNSCHAFT</span><h1>{accessManagementEnabled ? "Unsere Mannschaft" : "Spieler verwalten"}</h1><p>{accessManagementEnabled ? "Kader, Rollen und Zugänge an einem Ort" : "Dein einfacher Kader in EM Free"}</p></div>{currentUser.role === "admin" && <button className="primary" onClick={() => setInviteOpen(true)}><Plus /> <span>{accessManagementEnabled ? "Einladen" : "Spieler hinzufügen"}</span></button>}</div>
    <div className="team-stats"><article><Users /><span><strong>{players.length}</strong><small>Spieler</small></span></article><article><Shield /><span><strong>{users.filter((user) => user.role === "trainer").length}</strong><small>Trainer</small></span></article><article><CalendarDays /><span><strong>2×</strong><small>Training / Woche</small></span></article></div>
    <div className="module-tools"><label className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mitglied suchen" /></label>{accessManagementEnabled && <div className="filters">{(["all", "player", "guardian", "trainer", "admin"] as const).map((item) => <button className={role === item ? "on" : ""} onClick={() => setRole(item)} key={item}>{item === "all" ? "Alle" : roleLabels[item]}</button>)}</div>}</div>
    <div className="team-list-head"><span>MITGLIED</span><span>POSITION</span><span>ROLLE & RECHTE</span><button type="button" className={numberSort?.key === "ballNumber" ? "active" : ""} onClick={() => toggleNumberSort("ballNumber")} aria-label="Nach Ballnummer sortieren">BALL{numberSort?.key === "ballNumber" ? numberSort.direction === "asc" ? " 1–9" : " 9–1" : ""}</button><button type="button" className={numberSort?.key === "number" ? "active" : ""} onClick={() => toggleNumberSort("number")} aria-label="Nach Trikotnummer sortieren">TRIKOT{numberSort?.key === "number" ? numberSort.direction === "asc" ? " 1–9" : " 9–1" : ""}</button></div>
    <div className="team-list">{visible.map((user) => <article key={user.id} onClick={() => onProfile(user)}><Avatar user={user} /><span className="member-name"><strong>{user.name}</strong><small>{user.role === "player" ? playerAccessLabel(user) : user.number != null ? `Trikot #${user.number}` : user.position}</small></span><span className="member-position">{user.position}</span>{currentUser.role === "admin" ? <select value={user.role} disabled={user.id === currentUser.id || user.managedProfile} title={user.id === currentUser.id ? "Die eigene Adminrolle kann nicht geändert werden." : user.managedProfile ? "Verwaltete Profile bleiben Spieler." : "Rolle ändern"} onClick={(event) => event.stopPropagation()} onChange={(event) => setUserRole(user.id, event.target.value as Role)}><option value="player">Spieler</option><option value="guardian">Elternteil</option><option value="trainer">Trainer</option><option value="admin">Admin</option></select> : <span className={`role-badge ${user.role}`}>{roleLabels[user.role]}</span>}<span className="member-equipment">{user.ballNumber ?? "–"}</span><span className="member-equipment">{user.number ?? "–"}</span></article>)}</div>
    {accessManagementEnabled ? <><div className="rights-info"><Shield /><span><strong>Rollen und Rechte</strong><small>Admins verwalten Rollen und Zugänge. Trainer verwalten Termine, Trainings und Teilnahmen.</small></span></div>{currentUser.role === "admin" && players.some((player) => player.managedProfile) && <div className="access-migration-card"><div><KeyRound /><span><strong>Zugänge für vorhandene Spieler einrichten</strong><small>{players.filter((player) => player.managedProfile).length} Kinderprofile können schrittweise mit einem Elternzugang verbunden werden. Es wird nichts automatisch versendet.</small></span></div><button className="primary" onClick={() => setInviteOpen(true)}>Zugänge einrichten</button></div>}</> : <div className="rights-info"><Lock /><span><strong>Mehr mit EM Pro</strong><small>Elternzugänge, Einladungen sowie Rollen und Rechte sind in EM Pro enthalten. Deine Spielerdaten bleiben erhalten.</small></span></div>}
    {currentUser.role === "admin" && inviteOpen && <TeamInviteDialog teamAgeGroup={teamAgeGroup} users={users} invitations={invitations} accessManagementEnabled={accessManagementEnabled} smtpConfigured={smtpConfigured} onClose={() => setInviteOpen(false)} onInvited={onInvited} />}
  </section>;
}

function TeamInviteDialog({ teamAgeGroup, users, invitations, accessManagementEnabled, smtpConfigured, onClose, onInvited }: { teamAgeGroup?: string; users: ClubUser[]; invitations: ClubInvitation[]; accessManagementEnabled: boolean; smtpConfigured: boolean; onClose: () => void; onInvited: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"player" | "trainer" | "admin">("player");
  const [playerKind, setPlayerKind] = useState<"account" | "child">("child");
  const [birthday, setBirthday] = useState("");
  const [sendEmail, setSendEmail] = useState(smtpConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState("");
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const pending = invitations.filter((item) => !item.acceptedAt);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  async function invite(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const childProfile = !accessManagementEnabled || (role === "player" && playerKind === "child");
      const response = await fetch(childProfile ? "/api/v1/players" : "/api/v1/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(childProfile ? { name, birthday, guardianEmail: email, sendEmail: Boolean(email && sendEmail) } : { name, email, role, sendEmail: Boolean(email && sendEmail), groupId: null }) });
      const result = await response.json() as { error?: string; emailSent?: boolean; emailError?: string; link?: string };
      if (!response.ok) throw new Error(result.error || "Einladung konnte nicht erstellt werden.");
      setLink(result.link || "");
      setCreated(true);
      onInvited();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Einladung konnte nicht erstellt werden.");
    } finally { setBusy(false); }
  }

  async function copyInvitation() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  async function resendPending(id: string) {
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/invitations/${id}`, { method: "POST" });
      const result = await response.json() as { link?: string; emailSent?: boolean; emailError?: string; error?: string };
      if (!response.ok || !result.link) throw new Error(result.error || "Link konnte nicht erstellt werden.");
      if (!result.emailSent) await navigator.clipboard.writeText(result.link);
      setNotice(result.emailSent ? "Einladung wurde erneut per E-Mail gesendet." : result.emailError || "Einladungslink wurde erneuert und kopiert.");
      onInvited();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Einladung konnte nicht erneut gesendet werden."); }
  }

  async function removePending(id: string) {
    if (!window.confirm("Offene Einladung wirklich löschen? Das Spielerprofil bleibt erhalten.")) return;
    setError("");
    const response = await fetch(`/api/v1/invitations/${id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) return setError(result.error || "Einladung konnte nicht gelöscht werden.");
    onInvited();
  }

  return <div className="team-invite-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="team-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="team-invite-title">
      <header><span><small>MANNSCHAFT</small><h2 id="team-invite-title">{accessManagementEnabled ? "Person einladen" : "Spieler hinzufügen"}</h2></span><button type="button" onClick={onClose} aria-label="Einladung schließen"><X /></button></header>
      {!created ? <form onSubmit={invite}>
        <p>Lege die Person an. Kontaktdaten kannst du auch später ergänzen.</p>
        <label className="team-invite-email"><span>Vor- und Nachname</span><div><Users /><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name der Person" autoFocus /></div></label>
        {accessManagementEnabled && <fieldset><legend>Rolle</legend><div>{(["player", "trainer", "admin"] as const).map((item) => <button type="button" className={role === item ? "active" : ""} aria-pressed={role === item} onClick={() => setRole(item)} key={item}>{roleLabels[item]}</button>)}</div></fieldset>}
        {accessManagementEnabled && role === "player" && <fieldset className="team-player-kind"><legend>Spielerzugang</legend><div><button type="button" className={playerKind === "child" ? "active" : ""} onClick={() => setPlayerKind("child")}><strong>Ohne eigenen Zugang</strong><small>Eltern können mitverwalten</small></button><button type="button" className={playerKind === "account" ? "active" : ""} onClick={() => setPlayerKind("account")}><strong>Eigener Zugang</strong><small>Selbst verwalten · per Einladung</small></button></div></fieldset>}
        {role === "player" && playerKind === "child" && <label className="team-invite-email"><span>Geburtsdatum <small>optional</small></span><div><CalendarDays /><input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} /></div></label>}
        {role === "player" && playerKind === "child" && <p className="team-invite-profile-hint">{birthday ? `Altersangabe: ${ageInYears(birthday) ?? "–"} Jahre.` : `Ohne Geburtsdatum gilt die Mannschafts-Altersklasse ${teamAgeGroup?.toUpperCase() || "der aktiven Mannschaft"}.`} Ein eigener Login wird nie automatisch eingerichtet. Bestehende Elternzuordnungen bleiben erhalten.</p>}
        {accessManagementEnabled && <label className="team-invite-email"><span>{role === "player" && playerKind === "child" ? "E-Mail eines Elternteils" : "E-Mail-Adresse"} {role !== "admin" && <small>optional</small>}</span><div><Mail /><input required={role === "admin"} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={role === "admin" ? "Für Admins erforderlich" : "Kann später ergänzt werden"} /></div></label>}
        {accessManagementEnabled && (smtpConfigured && email ? <label className="team-invite-delivery"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} /><span><strong>Einladung direkt senden</strong><small>Der Link bleibt auch unten verfügbar.</small></span></label> : <p className="team-invite-mail-note">Ohne E-Mail bleibt ein persönlicher Link unter „Ausstehend“ bereit.</p>)}
        {error && <div className="login-error" role="alert">{error}</div>}{notice && <div className="invite-notice" role="status">{notice}</div>}
        <footer><button type="button" onClick={onClose}>Abbrechen</button><button className="primary" disabled={busy || name.trim().length < 2 || (role === "admin" && !email)}>{busy ? "Wird angelegt …" : <><Plus /> {accessManagementEnabled ? "Person anlegen" : "Spieler hinzufügen"}</>}</button></footer>
        {accessManagementEnabled && <div className="team-pending-invites"><header><span><strong>Ausstehende Einladungen</strong><small>{pending.length ? `${pending.length} noch nicht angenommen` : "Keine offenen Links"}</small></span></header>{pending.map((item) => { const player = item.managedPlayerId ? users.find((entry) => entry.id === item.managedPlayerId) : null; return <article key={item.id}><span><strong>{player?.name || item.name || item.email || "Einladung"}</strong><small>{item.managedPlayerId ? "Elternzugang" : roleLabels[item.role]}{item.email ? ` · ${item.email}` : " · E-Mail offen"}</small></span><div className="pending-invite-actions"><button type="button" onClick={() => void resendPending(item.id)}><Send /><span>{item.email ? "Erneut senden" : "Link erneuern"}</span></button><button type="button" className="danger" onClick={() => void removePending(item.id)}><Trash2 /><span>Löschen</span></button></div></article>; })}</div>}
      </form> : <div className="team-invite-success"><span><Check /></span><h3>{role === "player" && playerKind === "child" ? "Spieler ist angelegt" : "Einladung ist bereit"}</h3><p>{sendEmail && email && smtpConfigured ? `Die Einladung wurde an ${email} gesendet.` : link ? "Der persönliche Link kann jetzt oder später weitergegeben werden." : !accessManagementEnabled ? "Das Spielerprofil ist jetzt im Kader. Bei einem Upgrade können Eltern mit diesem bestehenden Profil verbunden werden." : "Der vorhandene Elternzugang wurde direkt mit dem Spieler verbunden."}</p>{link && <div><input readOnly value={link} onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={copyInvitation}>{copied ? <Check /> : <Copy />}{copied ? "Kopiert" : "Link kopieren"}</button></div>}<button className="primary" type="button" onClick={onClose}>Fertig</button></div>}
    </section>
  </div>;
}

const emptyEvent: ClubEvent = { id: "", type: "training", title: "", date: "2026-07-16", startTime: "17:00", endTime: "18:15", meetingTime: "16:50", location: "Sportplatz Nord", address: "", description: "", trainerNote: "", trainerIds: [], repeatFrequency: "none", maxParticipants: 0, autoSetPlayersPresent: false, responses: {} };

type PlannedCalendarTraining = { date: string; title: string; startTime: string };

function shiftedTime(time: string, minutes: number) {
  const [hours, minute] = time.split(":").map(Number);
  const total = (hours * 60 + minute + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function CalendarPage({ events, plannedTrainings = [], tournamentPlans = [], users, settings, currentUser, selectedEventId, selectedPlannedDate, onSelectedEventHandled, onSelectedPlannedDateHandled, onEventsChange, onDeleteEvent, onDeletePlannedTraining, onOpenTournamentPlanning }: { events: ClubEvent[]; plannedTrainings?: PlannedCalendarTraining[]; tournamentPlans?: TournamentPlan[]; users: ClubUser[]; settings: ClubSettings; currentUser: ClubUser; selectedEventId?: string | null; selectedPlannedDate?: string | null; onSelectedEventHandled?: () => void; onSelectedPlannedDateHandled?: () => void; onEventsChange: (events: ClubEvent[]) => void; onDeleteEvent: (event: ClubEvent, onDeleted: () => void) => void; onDeletePlannedTraining?: (date: string) => void; onOpenTournamentPlanning?: (eventId: string) => void }) {
  const [selected, setSelected] = useState<ClubEvent | null>(null);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const [editingPlannedDate, setEditingPlannedDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const canManage = currentUser.role === "admin" || currentUser.role === "trainer";
  const plannedTrainingByDate = new Map(plannedTrainings.map((training) => [training.date, training]));
  const homeTraining = events.find((event) => event.type === "training" && event.location.trim());
  const defaultTrainingLocation = homeTraining?.location ?? emptyEvent.location;
  const defaultTrainingAddress = homeTraining?.address ?? "";

  function plannedTrainingDraft(training: PlannedCalendarTraining): ClubEvent {
    return { ...emptyEvent, date: training.date, title: training.title, startTime: training.startTime, meetingTime: shiftedTime(training.startTime, -10), endTime: shiftedTime(training.startTime, 75), location: defaultTrainingLocation, address: defaultTrainingAddress, maxParticipants: 0 };
  }

  function usesMobileEventNavigation() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
  }

  function openEventDetail(event: ClubEvent, replaceHistory = false) {
    if (usesMobileEventNavigation()) {
      const url = new URL(window.location.href);
      url.searchParams.set("termin", event.id);
      const state = { ...window.history.state, nextSessionEventDialog: event.id };
      if (replaceHistory) window.history.replaceState(state, "", url);
      else window.history.pushState(state, "", url);
    }
    setSelected(event);
  }

  function closeEventDetail() {
    if (usesMobileEventNavigation() && window.history.state?.nextSessionEventDialog) {
      window.history.back();
      return;
    }
    setSelected(null);
  }

  function openTournamentPlanningFromDetail(eventId: string) {
    // Keep the event dialog as the previous history entry. The planning view
    // creates its own entry, so an iOS back swipe can restore this exact event.
    setSelected(null);
    onOpenTournamentPlanning?.(eventId);
  }

  useEffect(() => {
    if (!selectedEventId) return;
    const focusedEvent = events.find((event) => event.id === selectedEventId);
    if (!focusedEvent) return;
    openEventDetail(focusedEvent, true);
    setSelectedDate(focusedEvent.date);
    const date = new Date(`${focusedEvent.date}T12:00:00`);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    onSelectedEventHandled?.();
  }, [events, selectedEventId, onSelectedEventHandled]);

  useEffect(() => {
    if (!selectedPlannedDate || !canManage) return;
    const plannedTraining = plannedTrainingByDate.get(selectedPlannedDate);
    if (!plannedTraining) return;
    setSelectedDate(selectedPlannedDate);
    const date = new Date(`${selectedPlannedDate}T12:00:00`);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    setEditingPlannedDate(selectedPlannedDate);
    setEditing(plannedTrainingDraft(plannedTraining));
    onSelectedPlannedDateHandled?.();
  }, [selectedPlannedDate]);

  useEffect(() => {
    const syncEventFromHistory = () => {
      const eventId = window.history.state?.nextSessionEventDialog as string | undefined;
      if (!eventId) {
        setSelected(null);
        return;
      }
      setSelected(events.find((event) => event.id === eventId) ?? null);
    };
    window.addEventListener("popstate", syncEventFromHistory);
    return () => window.removeEventListener("popstate", syncEventFromHistory);
  }, [events]);
  const monthYear = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const leadingDays = (new Date(monthYear, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
  const monthDays = Array.from({ length: Math.ceil((leadingDays + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - leadingDays + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const monthLabel = visibleMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
    setSelectedDate(null);
  };
  const todayKey = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const upcoming = events.filter((event) => event.date >= todayKey).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const orderedEvents = [...events].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const selectedEventIndex = selected ? orderedEvents.findIndex((event) => event.id === selected.id) : -1;

  function saveEvent(event: ClubEvent) {
    const next = event.id ? events.map((item) => item.id === event.id ? event : item) : [...events, { ...event, id: `event-${Date.now()}` }];
    onEventsChange(next); setEditing(null); setEditingPlannedDate(null); openEventDetail(event.id ? event : next[next.length - 1]);
  }

  function respond(responseUserId: string, value: Attendance) {
    if (!selected || selected.cancelledAt || !settings.attendanceEnabled) return;
    const deadlineHours = selected.type === "training" ? settings.trainingDeadlineHours : selected.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
    const deadline = new Date(`${selected.date}T${selected.startTime}:00`).getTime() - deadlineHours * 60 * 60 * 1000;
    if (Date.now() > deadline && !canManage) return;
    const yesCount = Object.values(selected.responses).filter((answer) => answer === "yes").length;
    const previous = selected.responses[responseUserId];
    if (value === "yes" && previous !== "yes" && selected.maxParticipants > 0 && yesCount >= selected.maxParticipants) {
      if (settings.waitlistEnabled) {
        const waiting = { ...selected, responses: { ...selected.responses, [responseUserId]: "maybe" as Attendance } };
        setSelected(waiting); onEventsChange(events.map((event) => event.id === waiting.id ? waiting : event));
      }
      return;
    }
    const responsibleTrainers = selected.trainerIds ?? [];
    if (responseUserId === currentUser.id && selected.type === "training" && currentUser.role !== "player" && currentUser.role !== "guardian" && value !== "yes" && responsibleTrainers.includes(currentUser.id) && responsibleTrainers.length === 1) return;
    const trainerIds = responseUserId === currentUser.id && selected.type === "training" && currentUser.role !== "player" && currentUser.role !== "guardian"
      ? value === "yes" ? [...new Set([...responsibleTrainers, currentUser.id])] : responsibleTrainers.filter((id) => id !== currentUser.id)
      : responsibleTrainers;
    const updated = { ...selected, trainerIds, responses: { ...selected.responses, [responseUserId]: value } };
    setSelected(updated); onEventsChange(events.map((event) => event.id === updated.id ? updated : event));
  }

  function toggleCancellation(event: ClubEvent) {
    const cancelling = !event.cancelledAt;
    const question = cancelling
      ? `„${event.title}“ wirklich absagen? Der Termin bleibt sichtbar und wird als abgesagt markiert.`
      : `Absage für „${event.title}“ wirklich zurücknehmen?`;
    if (!window.confirm(question)) return;
    const updated = { ...event, cancelledAt: cancelling ? new Date().toISOString() : null };
    setSelected(updated);
    onEventsChange(events.map((item) => item.id === updated.id ? updated : item));
  }

  function openCalendarDay(dateKey: string, dayEvents: ClubEvent[]) {
    const trainingEvent = dayEvents.find((event) => event.type === "training");
    if (trainingEvent) return openEventDetail(trainingEvent);
    const plannedTraining = plannedTrainingByDate.get(dateKey);
    if (plannedTraining && canManage) {
      setEditingPlannedDate(dateKey);
      setEditing(plannedTrainingDraft(plannedTraining));
      return;
    }
    if (dayEvents[0]) openEventDetail(dayEvents[0]);
  }

  return <section className="calendar-page module-page">
    <div className="module-hero"><div><span className="eyebrow">TEAMKALENDER</span><h1>Termine & Verfügbarkeiten</h1><p>Training, Turniere und Vereinsereignisse auf einen Blick.</p></div>{canManage && <button className="primary" onClick={() => { setEditingPlannedDate(null); setEditing({ ...emptyEvent, date: selectedDate ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }), location: defaultTrainingLocation, address: defaultTrainingAddress, maxParticipants: 0 }); }}><Plus /> Termin erstellen</button>}</div>
    <div className="calendar-layout"><section className="month-card"><div className="month-head"><button type="button" onClick={() => changeMonth(-1)} aria-label="Vorheriger Monat"><ChevronLeft /></button><h2>{monthLabel}</h2><button type="button" onClick={() => changeMonth(1)} aria-label="Nächster Monat"><ChevronRight /></button></div><div className="month-grid">{["MO", "DI", "MI", "DO", "FR", "SA", "SO"].map((day) => <span className="weekday" key={day}>{day}</span>)}{monthDays.map((day, index) => { const dateKey = day ? `${monthYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : ""; const dayEvents = day ? events.filter((event) => event.date === dateKey) : []; const hasPlannedTraining = plannedTrainingByDate.has(dateKey) && !dayEvents.some((event) => event.type === "training"); return <button className={dateKey === selectedDate ? "selected-day" : ""} key={`${monthYear}-${monthIndex}-${index}`} disabled={!day} onClick={(clickEvent) => { if (!day) return; setSelectedDate(dateKey); clickEvent.currentTarget.blur(); openCalendarDay(dateKey, dayEvents); }}>{day}<span>{dayEvents.map((event) => <i className={`${event.type} ${event.cancelledAt ? "cancelled" : ""}`} key={event.id} />)}{hasPlannedTraining && <i className="training" />}</span></button>; })}</div><div className="calendar-legend"><span><i className="training" />Training</span><span><i className="tournament" />Turnier</span><span><i className="event" />Ereignis</span></div></section>
      <section className="upcoming-card"><div className="overview-card-title"><div><span className="eyebrow">ANSTEHEND</span><h2>Nächste Termine</h2></div></div>{upcoming.map((event) => { const yes = Object.values(event.responses).filter((item) => item === "yes").length; const no = Object.values(event.responses).filter((item) => item === "no").length; const open = Math.max(0, users.filter((user) => user.role === "player").length - yes - no); return <button className={`${selected?.id === event.id ? "active " : ""}${event.cancelledAt ? "cancelled" : ""}`} key={event.id} onClick={() => openEventDetail(event)}><span className={`event-icon ${event.type}`}>{event.type === "tournament" ? <Trophy /> : <CalendarDays />}</span><span><small>{new Date(`${event.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" })}</small><strong>{event.title}</strong><p>{event.cancelledAt ? "ABGESAGT" : <><Clock3 /> {event.startTime}–{event.endTime} <span>·</span> {event.location}</>}</p></span><span className="capacity-mini">{event.cancelledAt ? "Absage" : <><strong>{yes}</strong><small>dabei</small><i>{open} offen</i></>}</span></button>; })}</section>
    </div>
    {selected && <EventDetail event={selected} tournamentPlan={tournamentPlans.find((plan) => plan.eventId === selected.id)} settings={settings} users={users} currentUser={currentUser} onRespond={respond} onPrevious={selectedEventIndex > 0 ? () => openEventDetail(orderedEvents[selectedEventIndex - 1], true) : undefined} onNext={selectedEventIndex >= 0 && selectedEventIndex < orderedEvents.length - 1 ? () => openEventDetail(orderedEvents[selectedEventIndex + 1], true) : undefined} position={{ current: selectedEventIndex + 1, total: orderedEvents.length }} onEdit={() => { setEditingPlannedDate(null); setEditing({ ...selected }); setSelected(null); }} onDuplicate={() => { setEditingPlannedDate(null); setEditing({ ...selected, id: "", seriesId: undefined, title: `${selected.title} – Kopie`, cancelledAt: null, responses: {} }); setSelected(null); }} onOpenTournamentPlanning={onOpenTournamentPlanning ? () => openTournamentPlanningFromDetail(selected.id) : undefined} onClose={closeEventDetail} canManage={canManage} onCancel={() => toggleCancellation(selected)} onDelete={() => onDeleteEvent(selected, closeEventDetail)} />}
    {editing && <EventEditor event={editing} plannedTraining={Boolean(editingPlannedDate)} settings={settings} users={users} onClose={() => { setEditing(null); setEditingPlannedDate(null); }} onDelete={editingPlannedDate && onDeletePlannedTraining ? () => { if (!window.confirm("Training und den zugehörigen Trainingsplan wirklich löschen?")) return; onDeletePlannedTraining(editingPlannedDate); setEditing(null); setEditingPlannedDate(null); } : undefined} onSave={saveEvent} />}
  </section>;
}

function EventDetail({ event, tournamentPlan, settings, users, currentUser, onRespond, onPrevious, onNext, position, onEdit, onDuplicate, onDelete, onCancel, onClose, onOpenTournamentPlanning, canManage }: { event: ClubEvent; tournamentPlan?: TournamentPlan; settings: ClubSettings; users: ClubUser[]; currentUser: ClubUser; onRespond: (userId: string, value: Attendance) => void; onPrevious?: () => void; onNext?: () => void; position: { current: number; total: number }; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onCancel: () => void; onClose: () => void; onOpenTournamentPlanning?: () => void; canManage: boolean }) {
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | Attendance | "open">("all");
  const players = users.filter((user) => user.role === "player");
  const teamAgeGroup = players.find((player) => player.ageGroup.trim())?.ageGroup ?? settings.teamName;
  const mascotStage: "kids" | "youth" = /^[A-D](?:\d|\b)/i.test(teamAgeGroup.trim()) ? "youth" : "kids";
  const playerIds = new Set(players.map((player) => player.id));
  const counts = { yes: 0, maybe: 0, no: 0 }; Object.entries(event.responses).forEach(([userId, value]) => { if (playerIds.has(userId)) counts[value]++; });
  const unanswered = players.filter((player) => !event.responses[player.id]).length;
  const visiblePlayers = players.filter((player) => attendanceFilter === "all" || attendanceFilter === "open" ? attendanceFilter === "all" || !event.responses[player.id] || event.responses[player.id] === "maybe" : event.responses[player.id] === attendanceFilter);
  const eventDate = new Date(`${event.date}T12:00:00`);
  const dateDay = eventDate.toLocaleDateString("de-DE", { day: "numeric" });
  const dateMonth = eventDate.toLocaleDateString("de-DE", { month: "short" }).replace(".", "").toUpperCase();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || event.location)}`;
  const WeatherIcon = event.weather?.condition === "sunny" ? Sun : event.weather?.condition === "partly-cloudy" ? CloudSun : Cloud;
  const tournamentSquads = tournamentPlan?.squads ?? [];
  const assignedTournamentPlayers = new Set(tournamentSquads.flatMap((squad) => squad.playerIds)).size;

  useEffect(() => {
    setAttendanceFilter("all");
  }, [event.id]);

  return <div className="modal-backdrop event-popup-backdrop" onMouseDown={onClose}>
    <section className="event-popup" role="dialog" aria-modal="true" aria-labelledby="event-popup-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className={`event-popup-hero ${event.type} ${event.cancelledAt ? "cancelled" : ""}`}>
        <div className="event-popup-topline"><span className="event-type-label">{eventLabels[event.type]}</span><div className="event-stepper"><button disabled={!onPrevious} onClick={onPrevious} aria-label="Vorheriger Termin"><ChevronLeft /></button><span>{position.current} / {position.total}</span><button disabled={!onNext} onClick={onNext} aria-label="Nächster Termin"><ChevronRight /></button></div>{event.weather ? <span className="event-weather"><WeatherIcon /><strong>{event.weather.temperature}°</strong><small>{event.weather.label}</small></span> : <span className="event-weather"><Cloud /><small>Vorhersage folgt</small></span>}<button className="event-popup-close" onClick={onClose} aria-label="Termin schließen"><X /></button></div>
        <div className="event-popup-title"><time className={`event-date-tile ${event.type}`} dateTime={event.date}><strong>{dateDay}</strong><small>{dateMonth}</small></time><div className="event-title-content"><h2 id="event-popup-title">{event.title}</h2><div className="event-header-times"><span><small>Treffen</small><strong>{event.meetingTime}</strong></span><span><small>{event.type === "tournament" ? "Anstoß" : "Beginn"}</small><strong>{event.startTime}</strong></span><span><small>Ende</small><strong>{event.endTime}</strong></span></div></div></div>
      </header>

      <div className="event-popup-body">
        {event.cancelledAt && <section className="event-cancelled-notice event-cancelled-compact"><AlertTriangle /><span><strong>Dieser Termin wurde abgesagt</strong><small>Der Termin bleibt zur Information sichtbar.</small></span></section>}

        <section className={`event-overview-panel ${event.maxParticipants === 0 ? "without-capacity" : ""}`}>
          {event.maxParticipants > 0 && <><div className="event-attendance-inline">
            <div className="event-attendance-label"><small>TEILNAHME</small><strong>{event.maxParticipants === 0 ? "Ohne Limit" : `${counts.yes} / ${event.maxParticipants} Plätze`}</strong></div>
            <div className="event-attendance-stat yes"><ThumbsUp /><strong>{counts.yes}</strong><small>Dabei</small></div>
            <div className="event-attendance-stat open"><span>?</span><strong>{counts.maybe + unanswered}</strong><small>Offen</small></div>
            <div className="event-attendance-stat no"><ThumbsDown /><strong>{counts.no}</strong><small>Absagen</small></div>
          </div>
          <div className="event-attendance-meter" aria-label={`${counts.yes} dabei, ${counts.maybe + unanswered} offen, ${counts.no} Absagen`}><i className="yes" style={{ width: `${players.length ? counts.yes / players.length * 100 : 0}%` }} /><i className="open" style={{ width: `${players.length ? (counts.maybe + unanswered) / players.length * 100 : 0}%` }} /><i className="no" style={{ width: `${players.length ? counts.no / players.length * 100 : 0}%` }} /></div></>}
          <div className="event-facts address-only">
            <a href={mapsUrl} target="_blank" rel="noreferrer"><Navigation /><span><small>Adresse & Route</small><strong>{event.address || event.location}</strong></span><ChevronRight /></a>
          </div>
        </section>

        {event.type === "tournament" && canManage && <section className="event-tournament-planning"><div className="event-section-title"><span className="team-planning-mascot" aria-hidden="true" /><span><small>MANNSCHAFTEN</small><strong>{tournamentSquads.length ? `${tournamentSquads.length} ${tournamentSquads.length === 1 ? "Mannschaft" : "Mannschaften"} · ${assignedTournamentPlayers} Kinder` : "Mannschaften für dieses Turnier planen"}</strong></span></div>{tournamentSquads.length > 0 && <div className="event-tournament-squads">{tournamentSquads.map((squad) => <span key={squad.id}><strong>{squad.name}</strong><small>{squad.playerIds.length} Kinder</small></span>)}</div>}<button onClick={onOpenTournamentPlanning}><Plus /> {tournamentSquads.length ? "Mannschaften bearbeiten" : "Mannschaft anlegen"}<ChevronRight /></button></section>}

        <div className="event-popup-columns event-content-columns">
          <div className="event-main-column">
            <section className="event-information"><div className="event-section-title"><Info /><span><small>INFORMATIONEN</small><strong>Das Wichtigste zum Termin</strong></span></div><p>{event.description || "Für diesen Termin wurden noch keine weiteren Informationen hinterlegt."}</p></section>
            {event.trainerNote?.trim() && <section className="trainer-message"><div className="event-section-title"><Megaphone /><span><small>MITTEILUNG DES TRAINERS</small><strong>Hinweis an die Mannschaft</strong></span></div><p>{event.trainerNote}</p></section>}
          </div>

          <aside className={`event-attendance-column mascot-${mascotStage}`}>
            {(settings.showResponsesToPlayers || canManage) && <div className="popup-attendees" id="termin-teilnehmer"><div className="attendance-tabs"><button className={attendanceFilter === "all" ? "active" : ""} onClick={() => setAttendanceFilter("all")}><AttendanceTabIcon type="all" />Alle <span>{players.length}</span></button><button className={attendanceFilter === "yes" ? "active" : ""} onClick={() => setAttendanceFilter("yes")}><AttendanceTabIcon type="yes" />Dabei <span>{counts.yes}</span></button><button className={attendanceFilter === "open" ? "active" : ""} onClick={() => setAttendanceFilter("open")}><AttendanceTabIcon type="open" />Offen <span>{unanswered + counts.maybe}</span></button><button className={attendanceFilter === "no" ? "active" : ""} onClick={() => setAttendanceFilter("no")}><AttendanceTabIcon type="no" />Absagen <span>{counts.no}</span></button></div><div className="attendee-list"><div className="attendee-head"><span>SPIELER ({visiblePlayers.length})</span><span>STATUS</span></div>{visiblePlayers.map((player) => { const answer = event.responses[player.id]; return <article key={player.id}><Avatar user={player} size="small" /><span><strong>{player.name}</strong><small>{player.position}</small></span>{canManage ? <div className="attendance-admin-actions" aria-label={`Teilnahme von ${player.name}`}><button disabled={Boolean(event.cancelledAt)} className={answer === "yes" ? "yes active" : "yes"} onClick={() => onRespond(player.id, "yes")} aria-label={`${player.name}: Dabei`}><ThumbsUp /></button><button disabled={Boolean(event.cancelledAt)} className={answer === "maybe" ? "maybe active" : "maybe"} onClick={() => onRespond(player.id, "maybe")} aria-label={`${player.name}: Unsicher`}>?</button><button disabled={Boolean(event.cancelledAt)} className={answer === "no" ? "no active" : "no"} onClick={() => onRespond(player.id, "no")} aria-label={`${player.name}: Absage`}><ThumbsDown /></button></div> : <span className={`answer-pill ${answer ?? "open"}`}>{answer === "yes" ? <><ThumbsUp /> Dabei</> : answer === "no" ? <><ThumbsDown /> Absage</> : answer === "maybe" ? "Unsicher" : "Keine Antwort"}</span>}</article>; })}{!visiblePlayers.length && <div className="attendee-empty">Keine Spieler in dieser Auswahl.</div>}</div></div>}
          </aside>
        </div>
      </div>

      {canManage && <footer className="event-popup-actions"><button className="event-delete-action" onClick={onDelete}><Trash2 /> Löschen</button><button className={event.cancelledAt ? "event-restore-action" : "event-cancel-action"} onClick={onCancel}><AlertTriangle /> {event.cancelledAt ? "Absage zurücknehmen" : "Termin absagen"}</button><button onClick={onDuplicate}><Copy /> Kopieren</button><button className="primary" onClick={onEdit}><Edit3 /> Bearbeiten</button></footer>}
    </section>
  </div>;
}

function EventEditor({ event, plannedTraining = false, settings, users, onClose, onSave, onDelete }: { event: ClubEvent; plannedTraining?: boolean; settings: ClubSettings; users: ClubUser[]; onClose: () => void; onSave: (event: ClubEvent) => void; onDelete?: () => void }) {
  const [form, setForm] = useState(event);
  const [error, setError] = useState("");
  const set = (key: keyof ClubEvent, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const deadlineHours = form.type === "training" ? settings.trainingDeadlineHours : form.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
  const deadline = form.date && form.startTime ? new Date(new Date(`${form.date}T${form.startTime}:00`).getTime() - deadlineHours * 60 * 60 * 1000) : null;
  const players = users.filter((user) => user.role === "player").length;
  const trainers = users.filter((user) => user.role === "trainer" || user.role === "admin");
  const canRepeat = !event.id && !plannedTraining;
  function setRepeatFrequency(value: RepeatFrequency) {
    setForm((current) => {
      if (value === "none") return { ...current, repeatFrequency: value, repeatUntil: undefined };
      const start = new Date(`${current.date}T12:00:00Z`);
      start.setUTCMonth(start.getUTCMonth() + 3);
      return { ...current, repeatFrequency: value, repeatUntil: current.repeatUntil ?? start.toISOString().slice(0, 10) };
    });
  }
  function toggleTrainer(id: string) {
    const selected = form.trainerIds ?? [];
    if (selected.includes(id) && selected.length === 1 && (event.trainerIds?.length ?? 0) > 0) return setError("Der einzige verantwortliche Trainer kann nicht entfernt werden. Weise zuerst einen weiteren Trainer zu.");
    const trainerIds = selected.includes(id) ? selected.filter((trainerId) => trainerId !== id) : [...selected, id];
    setForm((current) => ({ ...current, trainerIds, responses: trainerIds.includes(id) ? { ...current.responses, [id]: "yes" } : current.responses }));
    setError("");
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.meetingTime > form.startTime) return setError("Die Treffzeit muss vor dem Beginn liegen.");
    if (form.endTime <= form.startTime) return setError("Das Ende muss nach dem Beginn liegen.");
    if (canRepeat && form.repeatFrequency !== "none" && (!form.repeatUntil || form.repeatUntil < form.date)) return setError("Bitte wähle ein gültiges Enddatum für die Wiederholung.");
    setError(""); onSave(form);
  }
  return <div className="modal-backdrop event-editor-backdrop" onMouseDown={onClose}><form className="event-editor" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
    <div className="editor-head"><div><span className="eyebrow">TERMINPLANUNG</span><h2>{plannedTraining ? "Training bearbeiten" : event.id ? "Termin bearbeiten" : "Neuen Termin erstellen"}</h2><p>{plannedTraining ? "Ergänze oder ändere die Termindetails des geplanten Trainings." : "Alle wichtigen Angaben für Mannschaft und Trainer."}</p></div><button type="button" onClick={onClose} aria-label="Terminplanung schließen"><X /></button></div>
    <div className="event-type-select">{(["training", "tournament", ...(settings.leagueMatchesEnabled ? ["match" as const] : []), "event"] as EventType[]).map((type) => <button type="button" className={form.type === type ? "active" : ""} onClick={() => setForm((current) => ({ ...current, type, maxParticipants: type === "training" || type === "tournament" || type === "match" ? 0 : current.maxParticipants }))} key={type}>{eventLabels[type]}</button>)}</div>

    <section className="event-editor-section"><header><Info /><span><strong>Informationen</strong><small>Was findet statt?</small></span></header><label><span>Name des Termins</span><input required maxLength={160} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={form.type === "training" ? "z. B. Training – Dribbling & Torschuss" : form.type === "tournament" ? "z. B. Kinderfußball-Festival" : "z. B. Mannschaftsabend"} /></label><label><span>Zusätzliche Informationen <em>optional</em></span><textarea rows={3} maxLength={5000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ausrüstung, Ablauf oder wichtige Hinweise für das Team …" /></label></section>

    <section className="event-editor-section"><header><Megaphone /><span><strong>Hinweis an die Mannschaft</strong><small>Wird im Termin nur angezeigt, wenn du etwas einträgst.</small></span></header><label><span>Mitteilung <em>optional</em></span><textarea rows={3} maxLength={5000} value={form.trainerNote ?? ""} onChange={(e) => setForm((current) => ({ ...current, trainerNote: e.target.value }))} placeholder="z. B. Treffpunkt, Ausrüstung oder Fahrgemeinschaften …" /></label></section>

    {form.type === "match" && <section className="event-editor-section"><header><Trophy /><span><strong>Ligaspiel</strong><small>Gegner und Wettbewerb</small></span></header><div className="form-row"><label><span>Gegner</span><input required maxLength={160} value={form.opponent ?? ""} onChange={(e) => setForm((current) => ({ ...current, opponent: e.target.value }))} placeholder="z. B. SV Grün-Weiß" /></label><label><span>Heim oder auswärts</span><select value={form.homeAway ?? "home"} onChange={(e) => setForm((current) => ({ ...current, homeAway: e.target.value as "home" | "away" }))}><option value="home">Heimspiel</option><option value="away">Auswärtsspiel</option></select></label></div><label><span>Wettbewerb / Staffel <em>optional</em></span><input maxLength={160} value={form.competition ?? ""} onChange={(e) => setForm((current) => ({ ...current, competition: e.target.value }))} placeholder="z. B. Kreisliga Staffel 2" /></label></section>}

    <section className="event-editor-section"><header><Clock3 /><span><strong>Datum und Uhrzeit</strong><small>Treffen, Beginn und Ende</small></span></header><div className="editor-date-row"><label><span>Datum</span><input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} /></label><label><span>Treffen</span><input type="time" required value={form.meetingTime} onChange={(e) => set("meetingTime", e.target.value)} /></label><label><span>Beginn</span><input type="time" required value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></label><label><span>Ende</span><input type="time" required value={form.endTime} onChange={(e) => set("endTime", e.target.value)} /></label></div></section>

    {canRepeat && <section className="event-editor-section event-repeat-section"><header><CalendarDays /><span><strong>Wiederholung</strong><small>Wie im Kalender: Rhythmus wählen und Ende festlegen</small></span></header><div className="event-repeat-row"><label><span>Wiederholen</span><select value={form.repeatFrequency ?? "none"} onChange={(e) => setRepeatFrequency(e.target.value as RepeatFrequency)}><option value="none">Nie</option><option value="daily">Täglich</option><option value="weekly">Wöchentlich</option><option value="biweekly">Alle zwei Wochen</option><option value="monthly">Monatlich</option><option value="yearly">Jährlich</option></select></label>{form.repeatFrequency && form.repeatFrequency !== "none" && <label><span>Wiederholung beenden</span><input type="date" required min={form.date} value={form.repeatUntil ?? ""} onChange={(e) => set("repeatUntil", e.target.value)} /></label>}</div>{form.repeatFrequency && form.repeatFrequency !== "none" && <p className="event-repeat-hint">Alle Termine werden bis einschließlich dieses Datums angelegt und können anschließend einzeln bearbeitet werden.</p>}</section>}

    <section className="event-editor-section"><header><Navigation /><span><strong>Ort und Anfahrt</strong><small>Damit alle den Treffpunkt finden</small></span></header><div className="form-row"><label><span>Ort / Platz</span><input required maxLength={180} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="z. B. Sportplatz Nord" /></label><label><span>Vollständige Adresse <em>optional</em></span><input maxLength={300} value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Straße, Hausnummer, PLZ, Ort" /></label></div></section>

    {form.type === "training" && <section className="event-editor-section"><header><Users /><span><strong>Verantwortliche Trainer</strong><small>Mehrere Trainer sind möglich. Die Auswahl setzt die Teilnahme automatisch auf „Dabei“.</small></span></header><div className="event-trainer-select">{trainers.map((trainer) => { const active = (form.trainerIds ?? []).includes(trainer.id); return <button type="button" className={active ? "active" : ""} aria-pressed={active} key={trainer.id} onClick={() => toggleTrainer(trainer.id)}><Avatar user={trainer} size="small" /><span><strong>{trainer.name}</strong><small>{active ? "Verantwortlich · dabei" : "Nicht zugewiesen"}</small></span>{active && <Check />}</button>; })}</div></section>}

    <section className="event-editor-section"><header><Users /><span><strong>Teilnahme</strong><small>Wer wird eingeplant?</small></span></header><div className="event-audience"><Check /><span><strong>Alle aktiven Spieler</strong><small>{players} Spieler erhalten den Termin und können {settings.attendanceEnabled ? "zu- oder absagen" : "den Termin ansehen"}.</small></span></div>{settings.attendanceEnabled && form.type !== "event" && <fieldset className="event-attendance-mode"><legend>Wie soll die Teilnahme starten?</legend><div><button type="button" className={!form.autoSetPlayersPresent ? "active" : ""} aria-pressed={!form.autoSetPlayersPresent} onClick={() => setForm((current) => ({ ...current, autoSetPlayersPresent: false }))}><span><strong>Rückmeldung einholen</strong><small>Spieler sagen selbst zu. Persönliche Standards werden berücksichtigt.</small></span>{!form.autoSetPlayersPresent && <Check />}</button><button type="button" className={form.autoSetPlayersPresent ? "active" : ""} aria-pressed={Boolean(form.autoSetPlayersPresent)} onClick={() => setForm((current) => ({ ...current, autoSetPlayersPresent: true, maxParticipants: current.maxParticipants === 0 ? 0 : Math.max(current.maxParticipants, players) }))}><span><strong>Absage erforderlich</strong><small>Alle starten als dabei und melden sich nur, wenn sie fehlen.</small></span>{form.autoSetPlayersPresent && <Check />}</button></div></fieldset>}<div className="form-row"><label><span>Teilnehmerlimit</span><input type="number" inputMode="numeric" min="0" max="99" required value={form.maxParticipants} onChange={(e) => set("maxParticipants", Number(e.target.value))} /><small>{form.maxParticipants === 0 ? "Kein Teilnehmerlimit" : `Maximal ${form.maxParticipants} Teilnehmer`}</small></label><div className="event-setting-summary"><Clock3 /><span><strong>Rückmeldefrist</strong><small>{settings.attendanceEnabled && deadline ? `${deadline.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr` : "Zu-/Absagen sind deaktiviert"}</small></span></div></div></section>

    <section className="event-editor-section event-notification-summary"><header><Bell /><span><strong>Benachrichtigungen</strong><small>{settings.automaticReminders ? "Offene Rückmeldungen werden automatisch erinnert." : "Automatische Erinnerungen sind in den Einstellungen deaktiviert."}</small></span></header></section>
    {error && <div className="event-editor-error"><AlertTriangle />{error}</div>}
    <div className={`editor-actions ${onDelete ? "with-delete" : ""}`}>{onDelete && <button className="event-delete-action icon-only-delete" type="button" onClick={onDelete} aria-label="Training löschen" title="Training löschen"><Trash2 /></button>}<button type="button" onClick={onClose}>Abbrechen</button><button className="primary" type="submit"><Check /> {plannedTraining || event.id ? "Änderungen speichern" : "Termin erstellen"}</button></div>
  </form></div>;
}

function RatingRow({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return <div className="player-rating-row"><span>{label}<small>{value ? `${value} von 5` : "Noch nicht bewertet"}</small></span><div role="radiogroup" aria-label={`${label} bewerten`}>{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} disabled={disabled} className={rating <= value ? "active" : ""} role="radio" aria-checked={rating === value} aria-label={`${rating} von 5 Sternen`} onClick={() => onChange(rating)}><Star /></button>)}</div></div>;
}

export function ProfilePage({ teamAgeGroup, onRemove, user, editable, canChangePassword, canRequestEmailChange, emailChangeByAdmin, canManageAccess, canManageDevelopment, canManagePlayerEquipment, splitTeamsEnabled, onSave, onChangePassword, onBack }: { teamAgeGroup?: string; onRemove?: () => Promise<void>; user: ClubUser; editable: boolean; canChangePassword: boolean; canRequestEmailChange: boolean; emailChangeByAdmin: boolean; canManageAccess: boolean; canManageDevelopment: boolean; canManagePlayerEquipment: boolean; splitTeamsEnabled: boolean; onSave: (user: ClubUser) => Promise<void>; onChangePassword: (currentPassword: string, newPassword: string, confirmation: string) => Promise<string | null>; onBack?: () => void }) {
  const [form, setForm] = useState(user);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessLink, setAccessLink] = useState("");
  const [familyAccess, setFamilyAccess] = useState<{ guardians: Array<{ id: string; name: string; email: string }>; invitations: Array<{ id: string; email: string; expiresAt: string }> }>({ guardians: [], invitations: [] });

  useEffect(() => { setForm(user); }, [user]);
  useEffect(() => { setMessage(""); setEmailOpen(false); setPasswordOpen(false); }, [user.id]);
  useEffect(() => {
    if (!canManageAccess || user.role !== "player") return;
    void loadFamilyAccess();
  }, [canManageAccess, user.id, user.managedProfile]);
  async function loadFamilyAccess() {
    const response = await fetch(`/api/v1/players/${user.id}/access`, { credentials: "include", cache: "no-store" });
    const result = await response.json().catch(() => ({})) as typeof familyAccess & { error?: string };
    if (response.ok) { setFamilyAccess({ guardians: result.guardians, invitations: result.invitations }); setForm((current) => ({ ...current, hasGuardianAccess: result.guardians.length > 0 })); }
  }
  function photo(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setMessage("Bitte PNG, JPEG oder WebP mit maximal 1 MB auswählen."); event.target.value = ""; return; } const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, avatar: String(reader.result) })); reader.readAsDataURL(file); }
  const [saving, setSaving] = useState(false);
  async function saveProfile() {
    setSaving(true); setMessage("");
    try { await onSave(form); setMessage("Profil gespeichert."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden."); }
    finally { setSaving(false); }
  }
  async function changePassword() {
    if (newPassword.length < 12) return setMessage("Das neue Passwort benötigt mindestens 12 Zeichen.");
    if (newPassword !== passwordConfirmation) return setMessage("Die beiden neuen Passwörter stimmen nicht überein.");
    const error = await onChangePassword(oldPassword, newPassword, passwordConfirmation);
    if (error) return setMessage(error);
    setOldPassword(""); setNewPassword(""); setPasswordConfirmation(""); setPasswordOpen(false); setMessage("Passwort geändert.");
  }
  async function requestEmailChange() {
    setEmailBusy(true); setMessage("");
    try {
      const idToken = firebaseClientAuthEnabled() ? (await firebasePasswordSignIn(form.email, emailPassword)).idToken : undefined;
      const response = await fetch("/api/v1/auth/email-change", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: user.id, newEmail, currentPassword: firebaseClientAuthEnabled() ? undefined : emailPassword, idToken }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) return setMessage(result.error || "Bestätigungs-E-Mail konnte nicht versendet werden.");
      setMessage(result.message || "Bestätigungs-E-Mail wurde versendet."); setNewEmail(""); setEmailPassword(""); setEmailOpen(false);
    } catch { setMessage("Der Server ist gerade nicht erreichbar."); }
    finally { setEmailBusy(false); }
  }
  async function prepareAccess() {
    setEmailBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/players/${user.id}/access`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: accessEmail }) });
      const result = await response.json() as { link?: string; error?: string };
      if (!response.ok || !result.link) return setMessage(result.error || "Zugang konnte nicht vorbereitet werden.");
      setAccessLink(result.link); setMessage("Einladung für ein weiteres Elternteil erstellt."); await loadFamilyAccess();
    } finally { setEmailBusy(false); }
  }
  async function removeFamilyAccess(target: { guardianId?: string; invitationId?: string }, label: string) {
    if (!window.confirm(`Zugriff von ${label} wirklich entfernen?`)) return;
    const response = await fetch(`/api/v1/players/${user.id}/access`, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) return setMessage(result.error || "Elternzugang konnte nicht entfernt werden.");
    setMessage("Elternzugang entfernt."); setAccessLink(""); await loadFamilyAccess();
  }
  async function resendFamilyInvitation(id: string) {
    setEmailBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/invitations/${id}`, { method: "POST", credentials: "include" });
      const result = await response.json().catch(() => ({})) as { link?: string; emailSent?: boolean; emailError?: string; error?: string };
      if (!response.ok || !result.link) return setMessage(result.error || "Einladung konnte nicht erneut gesendet werden.");
      setAccessLink(result.link);
      if (!result.emailSent) await navigator.clipboard.writeText(result.link);
      setMessage(result.emailSent ? "Einladung wurde erneut per E-Mail gesendet." : result.emailError || "Einladungslink wurde erneuert und kopiert.");
      await loadFamilyAccess();
    } finally { setEmailBusy(false); }
  }

  return <section className="profile-page module-page">
    <div className="profile-cover" />
    <div className="profile-heading">{onBack && <button className="profile-back" onClick={onBack} aria-label="Zurück"><ChevronLeft /></button>}<div className="profile-photo"><Avatar user={form} size="large" />{editable && <label title="Profilbild ändern"><Camera /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={photo} /></label>}</div><div className="profile-identity"><span className={`role-badge ${form.role}`}>{roleLabels[form.role]}</span><h1>{form.name}</h1><p>{form.position}</p></div>{form.role === "player" && <div className="profile-quickfacts"><article><small>Trikot</small><strong>{form.number ?? "–"}</strong></article><article><small>Ball</small><strong>{form.ballNumber ?? "–"}</strong></article><article><small>Altersklasse</small><strong>{(form.birthday ? form.ageGroup : teamAgeGroup?.toUpperCase() || form.ageGroup) || "–"}</strong></article>{splitTeamsEnabled && <article><small>Trainingsgruppe</small><strong>{form.internalTeam ? `Team ${form.internalTeam}` : "–"}</strong></article>}</div>}</div>
    <div className="profile-grid">
      <section className="profile-card profile-information-card"><div className="profile-section-title"><Users /><span><span className="eyebrow">{form.role === "player" ? "SPIELERPROFIL" : "PROFIL"}</span><h2>Persönliche Angaben</h2><p>Stammdaten und Ausrüstung an einem Ort.</p></span></div><div className="form-row"><label><span>Vor- und Nachname</span><input disabled={!editable} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>{form.managedProfile || !visibleProfileEmail(form.email) ? <div className="profile-access-summary"><span>Zugang</span><strong>{playerAccessLabel(form)}</strong><small>Dieses Profil hat keinen eigenen Login. Verbundene Eltern nutzen ihren eigenen Zugang.</small>{form.managedProfile && editable && <button type="button" onClick={() => document.getElementById("player-login-setup")?.scrollIntoView({ block: "center", behavior: "smooth" })}>{canManageAccess ? "Eigenen Zugang einrichten" : "Informationen zum eigenen Zugang"}</button>}</div> : <div className="protected-email profile-email-field"><span>{form.role === "player" ? playerAccessLabel(form) : "E-Mail-Adresse"}</span><p>{visibleProfileEmail(form.email)}</p>{canRequestEmailChange && <button type="button" onClick={() => setEmailOpen((open) => !open)}><Mail /> E-Mail ändern</button>}{emailOpen && <small>Die neue Adresse wird erst nach Bestätigung übernommen.</small>}</div>}</div>{emailOpen && <div className="email-change-panel"><div><Mail /><span><strong>{emailChangeByAdmin ? `E-Mail-Adresse für ${form.name} ändern` : "Neue E-Mail-Adresse bestätigen"}</strong><small>Wir senden einen 60 Minuten gültigen Bestätigungslink an die neue Adresse.</small></span></div><div className="form-row"><label><span>Neue E-Mail-Adresse</span><input type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /></label><label><span>{emailChangeByAdmin ? "Dein Admin-Passwort" : "Aktuelles Passwort"}</span><input type="password" autoComplete="current-password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} /></label></div>{emailChangeByAdmin && <p className="admin-email-hint"><Shield /> Die Änderung wird vom Vereinsadmin angestoßen und erst durch den Link an die neue Adresse wirksam.</p>}<div className="profile-inline-actions"><button onClick={() => setEmailOpen(false)}>Abbrechen</button><button className="primary" disabled={emailBusy || !newEmail || !emailPassword} onClick={requestEmailChange}>{emailBusy ? "Wird versendet …" : "Bestätigungs-E-Mail senden"}</button></div></div>}<div className="form-row"><label><span>Telefon</span><input disabled={!editable} maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label><span>Geburtsdatum</span><input disabled={!editable} type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></label></div>{form.role === "player" && <><div className="profile-subsection-label">Mannschaft & Ausrüstung</div><div className="form-row profile-number-fields"><label><span>Trikotnummer</span><input disabled={!canManagePlayerEquipment} type="number" inputMode="numeric" min="0" max="999" value={form.number ?? ""} onChange={(event) => setForm({ ...form, number: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="z. B. 10" /></label><label><span>Ballnummer</span><input disabled={!canManagePlayerEquipment} type="number" inputMode="numeric" min="0" max="999" value={form.ballNumber ?? ""} onChange={(event) => setForm({ ...form, ballNumber: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="z. B. 7" /></label></div></>}<label><span>Position / Funktion</span><select disabled={form.role === "player" ? !canManagePlayerEquipment : !editable || form.role === "admin"} value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })}>{positionOptions[form.role].map((position) => <option value={position} key={position}>{position}</option>)}</select></label>{(editable || (form.role === "player" && canManagePlayerEquipment)) && <button className="primary profile-save" disabled={saving} onClick={saveProfile}><Check /> Änderungen speichern</button>}</section>
      {canChangePassword && <section className={`profile-card password-card ${passwordOpen ? "open" : ""}`}><KeyRound /><span className="eyebrow">SICHERHEIT</span><h2>Passwort</h2><p>Verwende mindestens zwölf Zeichen und bestätige das neue Passwort durch eine zweite Eingabe.</p>{!passwordOpen ? <button className="password-open-button" onClick={() => setPasswordOpen(true)}><KeyRound /> Passwort ändern</button> : <><label><span>Aktuelles Passwort</span><input maxLength={256} type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} /></label><label><span>Neues Passwort</span><input minLength={12} maxLength={256} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><label><span>Neues Passwort wiederholen</span><input minLength={12} maxLength={256} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} /></label><div className="profile-inline-actions"><button onClick={() => { setPasswordOpen(false); setOldPassword(""); setNewPassword(""); setPasswordConfirmation(""); }}>Abbrechen</button><button className="primary" onClick={changePassword}>Passwort aktualisieren</button></div></>}</section>}
      {splitTeamsEnabled && form.role === "player" && canManageDevelopment && <section className="profile-card player-development-card"><div className="development-card-head"><span><span className="eyebrow">INTERNER STECKBRIEF</span><h2>Spielerentwicklung</h2><p>Kurze Einschätzung für die Trainingsplanung. Die Angaben sind nur für Trainer und Admins gedacht.</p></span><span className="development-team-badge">{form.internalTeam ? `Team ${form.internalTeam}` : "Ohne Team"}</span></div><div className="player-ratings"><RatingRow label="Dribbeln" value={form.dribblingRating} disabled={!canManageDevelopment} onChange={(value) => setForm((current) => ({ ...current, dribblingRating: value }))} /><RatingRow label="Schuss" value={form.shootingRating} disabled={!canManageDevelopment} onChange={(value) => setForm((current) => ({ ...current, shootingRating: value }))} /><RatingRow label="Passen" value={form.passingRating} disabled={!canManageDevelopment} onChange={(value) => setForm((current) => ({ ...current, passingRating: value }))} /></div><label className="internal-team-select"><span>Interne Trainingsgruppe</span><select value={form.internalTeam ?? ""} onChange={(event) => setForm((current) => ({ ...current, internalTeam: (event.target.value || null) as ClubUser["internalTeam"] }))}><option value="">Noch nicht zugeordnet</option><option value="A">Team A</option><option value="B">Team B</option></select><small>Unabhängig von Altersklasse und Turniermannschaften.</small></label><button className="primary development-save" disabled={saving} onClick={saveProfile}><Check /> Steckbrief speichern</button></section>}
    </div>{canManageAccess && form.role === "player" && <section className="profile-card managed-access-card"><div className="profile-section-title"><Users /><span><span className="eyebrow">FAMILIE & ZUGÄNGE</span><h2>{form.managedProfile ? "Elternverwaltung" : "Zusätzliche Elternzugänge"}</h2><p>{form.managedProfile ? `Verbundene Eltern verwalten das Profil von ${form.name} über ihren eigenen Zugang.` : `${form.name} hat einen eigenen Spielerzugang. Bereits verbundene Eltern behalten ihre zusätzlichen Berechtigungen, bis sie ausdrücklich entfernt werden.`}</p></span></div><div className="guardian-access-list">{familyAccess.guardians.map((guardian) => <article key={guardian.id}><span className="guardian-access-avatar">{guardian.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><span><strong>{guardian.name || "Elternteil"}</strong><small>{guardian.email} · Aktiv</small></span><div className="guardian-row-actions"><button type="button" className="danger" onClick={() => void removeFamilyAccess({ guardianId: guardian.id }, guardian.name || guardian.email)}><Trash2 /><span>Zugriff entfernen</span></button></div></article>)}{familyAccess.invitations.map((invitation) => <article className="pending" key={invitation.id}><span className="guardian-access-avatar"><Mail /></span><span><strong>{invitation.email || "Einladung per Link"}</strong><small>Einladung ausstehend</small></span><div className="guardian-row-actions"><button type="button" onClick={() => void resendFamilyInvitation(invitation.id)}><Send /><span>{invitation.email ? "Erneut senden" : "Link erneuern"}</span></button><button type="button" className="danger" onClick={() => void removeFamilyAccess({ invitationId: invitation.id }, invitation.email || "dieser Einladung")}><Trash2 /><span>Löschen</span></button></div></article>)}{familyAccess.guardians.length === 0 && familyAccess.invitations.length === 0 && <p>Noch kein Elternteil verbunden.</p>}</div><div className="guardian-invite-form"><h3>Weiteres Elternteil einladen</h3><label><span>E-Mail-Adresse <small>optional</small></span><input type="email" value={accessEmail} onChange={(event) => setAccessEmail(event.target.value)} placeholder="eltern@beispiel.de" /></label>{accessLink && <div className="access-link-result"><input readOnly value={accessLink} onFocus={(event) => event.currentTarget.select()} /><button className="button-secondary" onClick={() => void navigator.clipboard.writeText(accessLink)}><Copy /> Link kopieren</button></div>}<button className="guardian-invite-button" disabled={emailBusy} onClick={() => void prepareAccess()}><Plus /><span>Elternteil einladen</span></button></div></section>}{form.managedProfile && editable && <PlayerLoginInvite key={form.id} playerId={form.id} birthday={form.birthday} teamAgeGroup={teamAgeGroup} enabled={canManageAccess} />}{onRemove && <div className="profile-remove-action"><button type="button" onClick={() => setRemoveOpen(true)}>Spieler aus Mannschaft entfernen</button></div>}{removeOpen && onRemove && <PlayerRemoveDialog name={form.name} onClose={() => setRemoveOpen(false)} onRemove={onRemove} />}{message && <div className="profile-message">{message}</div>}
  </section>;
}

export function AdminSettingsPage({ settings, onSave }: { settings: ClubSettings; onSave: (settings: ClubSettings) => void }) {
  const [form, setForm] = useState(settings); const [saved, setSaved] = useState(false);
  const set = <K extends keyof ClubSettings>(key: K, value: ClubSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleRows: { key: keyof ClubSettings; title: string; description: string }[] = [
    { key: "splitTeamsEnabled", title: "A-/B-Teams & Spielerentwicklung", description: "Interne Spielerbewertungen und getrennte Trainingsgruppen aktivieren." },
    { key: "teamFeatureEnabled", title: "Mannschaftsbereich", description: "Mannschaft, Mitgliederliste und Rollen für das Team aktivieren." },
    { key: "attendanceEnabled", title: "Zu- und Absagen", description: "Spieler können auf Termine mit Dabei, Offen oder Absage reagieren." },
    { key: "waitlistEnabled", title: "Warteliste bei vollem Termin", description: "Weitere Interessenten werden vorgemerkt, sobald das Teilnehmerlimit erreicht ist." },
    { key: "showResponsesToPlayers", title: "Antworten im Team sichtbar", description: "Spieler sehen die Rückmeldungen der anderen Mannschaftsmitglieder." },
    { key: "automaticReminders", title: "Automatische Erinnerungen", description: "Offene Rückmeldungen werden vor Ablauf der Frist hervorgehoben." },
  ];
  function save() { onSave(form); setSaved(true); window.setTimeout(() => setSaved(false), 2200); }
  return <section className="settings-page module-page"><div className="module-hero"><div><span className="eyebrow">ADMINISTRATION</span><h1>Einstellungen</h1><p>Steuere Funktionen, Fristen und Standards für deine Mannschaft.</p></div><button className="primary" onClick={save}><Check /> Speichern</button></div><div className="settings-layout"><section className="settings-card"><div className="settings-title"><Shield /><span><h2>Module & Rechte</h2><p>Funktionen lassen sich für die ganze Mannschaft ein- oder ausschalten.</p></span></div><div className="toggle-list">{toggleRows.map((row) => <label key={row.key}><span><strong>{row.title}</strong><small>{row.description}</small></span><input type="checkbox" checked={Boolean(form[row.key])} onChange={(event) => set(row.key, event.target.checked as never)} /><i /></label>)}</div></section><section className="settings-card"><div className="settings-title"><Clock3 /><span><h2>Rückmeldefristen</h2><p>Bis wie viele Stunden vor Beginn darf die Teilnahme geändert werden?</p></span></div><div className="deadline-grid"><label><span>Training</span><div><input type="number" min="0" max="168" value={form.trainingDeadlineHours} onChange={(e) => set("trainingDeadlineHours", Number(e.target.value))} /><small>Stunden vorher</small></div></label><label><span>Turnier</span><div><input type="number" min="0" max="336" value={form.tournamentDeadlineHours} onChange={(e) => set("tournamentDeadlineHours", Number(e.target.value))} /><small>Stunden vorher</small></div></label><label><span>Ereignis</span><div><input type="number" min="0" max="336" value={form.eventDeadlineHours} onChange={(e) => set("eventDeadlineHours", Number(e.target.value))} /><small>Stunden vorher</small></div></label></div><div className="settings-hint"><Bell /><span>Die konkrete Frist wird bei jedem Termin angezeigt. Nach Ablauf sind Änderungen für Spieler gesperrt; Admins und Trainer können weiterhin verwalten.</span></div></section><section className="settings-card"><div className="settings-title"><Users /><span><h2>Standards für neue Termine</h2><p>Diese Werte werden beim Erstellen vorausgefüllt und bleiben pro Termin anpassbar.</p></span></div><div className="deadline-grid"><label><span>Training: Teilnehmer</span><div><input type="number" min="1" max="99" value={form.defaultTrainingCapacity} onChange={(e) => set("defaultTrainingCapacity", Number(e.target.value))} /><small>Plätze</small></div></label><label><span>Turnier: Teilnehmer</span><div><input type="number" min="1" max="99" value={form.defaultTournamentCapacity} onChange={(e) => set("defaultTournamentCapacity", Number(e.target.value))} /><small>Plätze</small></div></label></div></section><section className="settings-card"><div className="settings-title"><Shield /><span><h2>Verein & Mannschaft</h2></span></div><div className="settings-fields"><label><span>Vereinsname</span><input value={form.clubName} onChange={(e) => set("clubName", e.target.value)} /></label><label><span>Mannschaft</span><input value={form.teamName} onChange={(e) => set("teamName", e.target.value)} /></label></div></section></div>{saved && <div className="toast"><Check /> Einstellungen gespeichert</div>}</section>;
}
