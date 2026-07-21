"use client";

import { useMemo, useState } from "react";
import {
  Bell, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Clock3, Cloud, CloudSun, Edit3,
  Info, KeyRound, Lock, Mail, Megaphone, Navigation, Plus, Search, Shield, Sun,
  ThumbsDown, ThumbsUp, Trash2, Trophy, Users, X,
} from "lucide-react";
import { eventLabels, roleLabels, type Attendance, type ClubEvent, type ClubSettings, type ClubUser, type EventType, type Role } from "@/data/club";

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
    <section className="login-brand"><span className="brand-mark"><Shield /></span><span className="eyebrow">TRAINERPLAN CLUB</span><h1>Ein Team.<br />Ein gemeinsamer Plan.</h1><p>Training, Termine und Zusagen für deine Mannschaft – übersichtlich an einem Ort.</p><div className="login-feature"><CalendarDays /><span><strong>Kalender & Termine</strong><small>Alle wissen, wann und wo es losgeht.</small></span></div><div className="login-feature"><Users /><span><strong>Mannschaft organisieren</strong><small>Rollen, Profile und Teilnahme verwalten.</small></span></div></section>
    <section className="login-panel"><form onSubmit={submit}><span className="eyebrow">WILLKOMMEN ZURÜCK</span><h2>Anmelden</h2><p>Melde dich mit deinem persönlichen Zugang an.</p><label><span>E-Mail-Adresse</span><div><Mail /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label><label><span>Passwort</span><div><Lock /><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>{error && <div className="login-error">{error}</div>}<button className="primary login-submit" type="submit" disabled={loading}>{loading ? "Anmeldung läuft …" : <>Anmelden <ChevronRight /></>}</button></form></section>
  </main>;
}

export function TeamPage({ users, currentUser, onUsersChange, onProfile, onInvite }: { users: ClubUser[]; currentUser: ClubUser; onUsersChange: (users: ClubUser[]) => void; onProfile: (user: ClubUser) => void; onInvite?: () => void }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const visible = users.filter((user) => (role === "all" || user.role === role) && user.name.toLowerCase().includes(query.toLowerCase()));
  const players = users.filter((user) => user.role === "player");

  function setUserRole(id: string, nextRole: Role) {
    onUsersChange(users.map((user) => user.id === id ? { ...user, role: nextRole } : user));
  }

  return <section className="team-page module-page">
    <div className="module-hero"><div><span className="eyebrow">FC KICKER · F1</span><h1>Unsere Mannschaft</h1><p>F‑Jugend · U8/U9 · Saison 2025/26</p></div>{currentUser.role === "admin" && <button className="primary" onClick={onInvite}><Plus /> Mitglied einladen</button>}</div>
    <div className="team-stats"><article><Users /><span><strong>{players.length}</strong><small>Spieler</small></span></article><article><Shield /><span><strong>{users.filter((user) => user.role === "trainer").length}</strong><small>Trainer</small></span></article><article><CalendarDays /><span><strong>2×</strong><small>Training / Woche</small></span></article></div>
    <div className="module-tools"><label className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mitglied suchen" /></label><div className="filters">{(["all", "player", "trainer", "admin"] as const).map((item) => <button className={role === item ? "on" : ""} onClick={() => setRole(item)} key={item}>{item === "all" ? "Alle" : roleLabels[item]}</button>)}</div></div>
    <div className="team-list-head"><span>MITGLIED</span><span>POSITION</span><span>ROLLE & RECHTE</span><span>KONTAKT</span></div>
    <div className="team-list">{visible.map((user) => <article key={user.id} onClick={() => onProfile(user)}><Avatar user={user} /><span className="member-name"><strong>{user.name}</strong><small>{user.number ? `Trikot #${user.number}` : user.position}</small></span><span className="member-position">{user.position}</span>{currentUser.role === "admin" ? <select value={user.role} onClick={(event) => event.stopPropagation()} onChange={(event) => setUserRole(user.id, event.target.value as Role)}><option value="player">Spieler</option><option value="trainer">Trainer</option><option value="admin">Admin</option></select> : <span className={`role-badge ${user.role}`}>{roleLabels[user.role]}</span>}<span className="member-contact">{user.email}</span><ChevronRight /></article>)}</div>
    <div className="rights-info"><Shield /><span><strong>Rollen und Rechte</strong><small>Admins verwalten Rollen und Zugänge. Trainer verwalten Termine, Trainings und Teilnahmen. Spieler sehen Termine und melden ihre Teilnahme.</small></span></div>
  </section>;
}

const emptyEvent: ClubEvent = { id: "", type: "training", title: "", date: "2026-07-16", startTime: "17:00", endTime: "18:15", meetingTime: "16:50", location: "Sportplatz Nord", address: "", description: "", trainerNote: "", maxParticipants: 14, responses: {} };

export function CalendarPage({ events, users, settings, currentUser, onEventsChange }: { events: ClubEvent[]; users: ClubUser[]; settings: ClubSettings; currentUser: ClubUser; onEventsChange: (events: ClubEvent[]) => void }) {
  const [selected, setSelected] = useState<ClubEvent | null>(null);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const canManage = currentUser.role === "admin" || currentUser.role === "trainer";
  const monthDays = Array.from({ length: 35 }, (_, index) => index - 2).map((day) => day > 0 && day <= 31 ? day : null);
  const upcoming = [...events].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  function saveEvent(event: ClubEvent) {
    const next = event.id ? events.map((item) => item.id === event.id ? event : item) : [...events, { ...event, id: `event-${Date.now()}` }];
    onEventsChange(next); setEditing(null); setSelected(event.id ? event : next[next.length - 1]);
  }

  function respond(value: Attendance) {
    if (!selected || !settings.attendanceEnabled) return;
    const deadlineHours = selected.type === "training" ? settings.trainingDeadlineHours : selected.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
    const deadline = new Date(`${selected.date}T${selected.startTime}:00`).getTime() - deadlineHours * 60 * 60 * 1000;
    if (Date.now() > deadline) return;
    const yesCount = Object.values(selected.responses).filter((answer) => answer === "yes").length;
    const previous = selected.responses[currentUser.id];
    if (value === "yes" && previous !== "yes" && yesCount >= selected.maxParticipants) {
      if (settings.waitlistEnabled) {
        const waiting = { ...selected, responses: { ...selected.responses, [currentUser.id]: "maybe" as Attendance } };
        setSelected(waiting); onEventsChange(events.map((event) => event.id === waiting.id ? waiting : event));
      }
      return;
    }
    const updated = { ...selected, responses: { ...selected.responses, [currentUser.id]: value } };
    setSelected(updated); onEventsChange(events.map((event) => event.id === updated.id ? updated : event));
  }

  function saveTrainerNote(note: string) {
    if (!selected || !canManage) return;
    const updated = { ...selected, trainerNote: note };
    setSelected(updated);
    onEventsChange(events.map((event) => event.id === updated.id ? updated : event));
  }

  return <section className="calendar-page module-page">
    <div className="module-hero"><div><span className="eyebrow">TEAMKALENDER</span><h1>Termine & Verfügbarkeiten</h1><p>Training, Turniere und Vereinsereignisse auf einen Blick.</p></div>{canManage && <button className="primary" onClick={() => setEditing({ ...emptyEvent, maxParticipants: settings.defaultTrainingCapacity })}><Plus /> Termin erstellen</button>}</div>
    <div className="calendar-layout"><section className="month-card"><div className="month-head"><button><ChevronLeft /></button><h2>Juli 2026</h2><button><ChevronRight /></button></div><div className="month-grid">{["MO", "DI", "MI", "DO", "FR", "SA", "SO"].map((day) => <span className="weekday" key={day}>{day}</span>)}{monthDays.map((day, index) => { const dayEvents = day ? events.filter((event) => Number(event.date.slice(-2)) === day) : []; return <button className={`${day === 15 ? "today" : ""} ${dayEvents.length ? "has-event" : ""}`} key={index} disabled={!day} onClick={() => dayEvents[0] && setSelected(dayEvents[0])}>{day}<span>{dayEvents.map((event) => <i className={event.type} key={event.id} />)}</span></button>; })}</div><div className="calendar-legend"><span><i className="training" />Training</span><span><i className="tournament" />Turnier</span><span><i className="event" />Ereignis</span></div></section>
      <section className="upcoming-card"><div className="overview-card-title"><div><span className="eyebrow">ANSTEHEND</span><h2>Nächste Termine</h2></div></div>{upcoming.map((event) => { const yes = Object.values(event.responses).filter((item) => item === "yes").length; return <button className={selected?.id === event.id ? "active" : ""} key={event.id} onClick={() => setSelected(event)}><span className={`event-icon ${event.type}`}>{event.type === "tournament" ? <Trophy /> : <CalendarDays />}</span><span><small>{new Date(`${event.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" })}</small><strong>{event.title}</strong><p>{event.startTime} Uhr · {event.location}</p></span><span className="capacity-mini">{yes}/{event.maxParticipants}</span></button>; })}</section>
    </div>
    {selected && <EventDetail event={selected} settings={settings} users={users} currentUser={currentUser} onRespond={respond} onEdit={() => { setEditing({ ...selected }); setSelected(null); }} onClose={() => setSelected(null)} onSaveNote={saveTrainerNote} canManage={canManage} onDelete={() => { onEventsChange(events.filter((event) => event.id !== selected.id)); setSelected(null); }} />}
    {editing && <EventEditor event={editing} onClose={() => setEditing(null)} onSave={saveEvent} />}
  </section>;
}

function EventDetail({ event, settings, users, currentUser, onRespond, onEdit, onDelete, onClose, onSaveNote, canManage }: { event: ClubEvent; settings: ClubSettings; users: ClubUser[]; currentUser: ClubUser; onRespond: (value: Attendance) => void; onEdit: () => void; onDelete: () => void; onClose: () => void; onSaveNote: (note: string) => void; canManage: boolean }) {
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | Attendance | "open">("all");
  const [note, setNote] = useState(event.trainerNote ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const players = users.filter((user) => user.role === "player");
  const counts = { yes: 0, maybe: 0, no: 0 }; Object.values(event.responses).forEach((value) => counts[value]++);
  const unanswered = players.filter((player) => !event.responses[player.id]).length;
  const full = counts.yes >= event.maxParticipants && event.responses[currentUser.id] !== "yes";
  const deadlineHours = event.type === "training" ? settings.trainingDeadlineHours : event.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
  const deadline = new Date(new Date(`${event.date}T${event.startTime}:00`).getTime() - deadlineHours * 60 * 60 * 1000);
  const responseClosed = Date.now() > deadline.getTime();
  const visiblePlayers = players.filter((player) => attendanceFilter === "all" || attendanceFilter === "open" ? attendanceFilter === "all" || !event.responses[player.id] || event.responses[player.id] === "maybe" : event.responses[player.id] === attendanceFilter);
  const dateLabel = new Date(`${event.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || event.location)}`;
  const WeatherIcon = event.weather?.condition === "sunny" ? Sun : event.weather?.condition === "partly-cloudy" ? CloudSun : Cloud;

  function saveNote() {
    onSaveNote(note.trim());
    setNoteSaved(true);
    window.setTimeout(() => setNoteSaved(false), 1800);
  }

  return <div className="modal-backdrop event-popup-backdrop" onMouseDown={onClose}>
    <section className="event-popup" role="dialog" aria-modal="true" aria-labelledby="event-popup-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className={`event-popup-hero ${event.type}`}>
        <div className="event-popup-topline"><span className="event-type-label">{eventLabels[event.type]}</span>{event.weather ? <span className="event-weather"><WeatherIcon /><strong>{event.weather.temperature}°</strong><small>{event.weather.label}</small></span> : <span className="event-weather"><Cloud /><small>Vorhersage folgt</small></span>}<button className="event-popup-close" onClick={onClose} aria-label="Termin schließen"><X /></button></div>
        <div className="event-popup-title"><span className={`event-flag ${event.type}`}>{event.type === "tournament" ? <Trophy /> : <CalendarDays />}</span><div><p>{dateLabel}</p><h2 id="event-popup-title">{event.title}</h2><span>{event.location}</span></div></div>
      </header>

      <div className="event-popup-body">
        <div className="event-facts">
          <article><Clock3 /><span><small>Treffen</small><strong>{event.meetingTime} Uhr</strong></span></article>
          <article><Trophy /><span><small>{event.type === "tournament" ? "Anstoß" : "Beginn"}</small><strong>{event.startTime} Uhr</strong></span></article>
          <article><Clock3 /><span><small>Ende</small><strong>{event.endTime} Uhr</strong></span></article>
          <a href={mapsUrl} target="_blank" rel="noreferrer"><Navigation /><span><small>Adresse & Route</small><strong>{event.address || event.location}</strong></span><ChevronRight /></a>
        </div>

        <div className="event-popup-columns">
          <div className="event-main-column">
            <section className="event-information"><div className="event-section-title"><Info /><span><small>INFORMATIONEN</small><strong>Das Wichtigste zum Termin</strong></span></div><p>{event.description || "Für diesen Termin wurden noch keine weiteren Informationen hinterlegt."}</p></section>
            <section className="trainer-message"><div className="event-section-title"><Megaphone /><span><small>MITTEILUNG DES TRAINERS</small><strong>Hinweise an die Mannschaft</strong></span></div>{canManage ? <><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Treffpunkt, Ausrüstung, Fahrgemeinschaften …" /><button onClick={saveNote}><Check /> {noteSaved ? "Gespeichert" : "Mitteilung speichern"}</button></> : <p>{event.trainerNote || "Aktuell gibt es keine zusätzliche Mitteilung des Trainers."}</p>}</section>
            {settings.attendanceEnabled && <div className="my-response"><div><strong>Deine Teilnahme</strong><small>{responseClosed ? `Rückmeldung geschlossen · Frist war ${deadline.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr` : full ? "Die maximale Teilnehmerzahl ist erreicht." : `Änderbar bis ${deadline.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr`}</small></div><button className={event.responses[currentUser.id] === "yes" ? "yes active" : "yes"} disabled={full || responseClosed} onClick={() => onRespond("yes")}><ThumbsUp /> Dabei</button><button className={event.responses[currentUser.id] === "maybe" ? "maybe active" : "maybe"} disabled={responseClosed} onClick={() => onRespond("maybe")}>?</button><button className={event.responses[currentUser.id] === "no" ? "no active" : "no"} disabled={responseClosed} onClick={() => onRespond("no")}><ThumbsDown /></button></div>}
          </div>

          <aside className="event-attendance-column">
            <div className="capacity-block"><div><span>TEILNAHME</span><strong>{counts.yes} / {event.maxParticipants} Plätze</strong></div><div className="capacity-bar"><i style={{ width: `${Math.min(100, counts.yes / event.maxParticipants * 100)}%` }} /></div><div className="attendance-counts"><span className="yes">● {counts.yes} dabei</span><span className="maybe">● {counts.maybe + unanswered} offen</span><span className="no">● {counts.no} nicht dabei</span></div></div>
            {(settings.showResponsesToPlayers || canManage) && <div className="popup-attendees"><div className="attendance-tabs"><button className={attendanceFilter === "all" ? "active" : ""} onClick={() => setAttendanceFilter("all")}>Alle <span>{players.length}</span></button><button className={attendanceFilter === "yes" ? "active" : ""} onClick={() => setAttendanceFilter("yes")}>Dabei <span>{counts.yes}</span></button><button className={attendanceFilter === "open" ? "active" : ""} onClick={() => setAttendanceFilter("open")}>Offen <span>{unanswered + counts.maybe}</span></button><button className={attendanceFilter === "no" ? "active" : ""} onClick={() => setAttendanceFilter("no")}>Absagen <span>{counts.no}</span></button></div><div className="attendee-list"><div className="attendee-head"><span>SPIELER ({visiblePlayers.length})</span><span>STATUS</span></div>{visiblePlayers.map((player) => { const answer = event.responses[player.id]; return <article key={player.id}><Avatar user={player} size="small" /><span><strong>{player.name}</strong><small>{player.position}</small></span><span className={`answer-pill ${answer ?? "open"}`}>{answer === "yes" ? <><ThumbsUp /> Dabei</> : answer === "no" ? <><ThumbsDown /> Absage</> : answer === "maybe" ? "Vielleicht" : "Keine Antwort"}</span></article>; })}{!visiblePlayers.length && <div className="attendee-empty">Keine Spieler in dieser Auswahl.</div>}</div></div>}
          </aside>
        </div>
      </div>

      {canManage && <footer className="event-popup-actions"><button onClick={onDelete}><Trash2 /> Termin löschen</button><button onClick={onEdit}><Edit3 /> Termin bearbeiten</button></footer>}
    </section>
  </div>;
}

function EventEditor({ event, onClose, onSave }: { event: ClubEvent; onClose: () => void; onSave: (event: ClubEvent) => void }) {
  const [form, setForm] = useState(event);
  const set = (key: keyof ClubEvent, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="modal-backdrop"><form className="event-editor" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><div className="editor-head"><div><span className="eyebrow">TERMIN VERWALTEN</span><h2>{event.id ? "Termin bearbeiten" : "Neuen Termin erstellen"}</h2></div><button type="button" onClick={onClose}><X /></button></div><div className="event-type-select">{(["training", "tournament", "event"] as EventType[]).map((type) => <button type="button" className={form.type === type ? "active" : ""} onClick={() => set("type", type)} key={type}>{eventLabels[type]}</button>)}</div><label><span>Titel</span><input required value={form.title} onChange={(e) => set("title", e.target.value)} /></label><div className="form-row"><label><span>Datum</span><input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} /></label><label><span>Max. Teilnehmer</span><input type="number" min="1" max="99" required value={form.maxParticipants} onChange={(e) => set("maxParticipants", Number(e.target.value))} /></label></div><div className="form-row"><label><span>Beginn</span><input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></label><label><span>Ende</span><input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} /></label><label><span>Treffen</span><input type="time" value={form.meetingTime} onChange={(e) => set("meetingTime", e.target.value)} /></label></div><label><span>Kurzer Ortsname</span><input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="z. B. Sportplatz Nord" /></label><label><span>Vollständige Adresse für Navigation</span><input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Straße, Hausnummer, PLZ, Ort" /></label><label><span>Beschreibung</span><textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></label><div className="editor-actions"><button type="button" onClick={onClose}>Abbrechen</button><button className="primary" type="submit"><Check /> Speichern</button></div></form></div>;
}

export function ProfilePage({ user, editable, canChangePassword, onSave, onChangePassword, onBack }: { user: ClubUser; editable: boolean; canChangePassword: boolean; onSave: (user: ClubUser) => void; onChangePassword: (currentPassword: string, newPassword: string) => Promise<string | null>; onBack?: () => void }) {
  const [form, setForm] = useState(user);
  const [oldPassword, setOldPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [message, setMessage] = useState("");
  function photo(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setMessage("Bitte PNG, JPEG oder WebP mit maximal 1 MB auswählen."); event.target.value = ""; return; } const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, avatar: String(reader.result) })); reader.readAsDataURL(file); }
  function saveProfile() { onSave(form); setMessage("Profil gespeichert."); }
  async function changePassword() { if (newPassword.length < 12) return setMessage("Das neue Passwort benötigt mindestens 12 Zeichen."); const error = await onChangePassword(oldPassword, newPassword); if (error) return setMessage(error); setOldPassword(""); setNewPassword(""); setMessage("Passwort geändert."); }
  return <section className="profile-page module-page"><div className="profile-cover" /><div className="profile-heading">{onBack && <button className="profile-back" onClick={onBack}><ChevronLeft /></button>}<div className="profile-photo"><Avatar user={form} size="large" />{editable && <label><Camera /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={photo} /></label>}</div><div><span className={`role-badge ${form.role}`}>{roleLabels[form.role]}</span><h1>{form.name}</h1><p>{form.position} · FC Kicker F1</p></div></div><div className="profile-grid"><section className="profile-card"><span className="eyebrow">PERSÖNLICHE DATEN</span><h2>Profilinformationen</h2><div className="form-row"><label><span>Vor- und Nachname</span><input disabled={!editable} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label><span>E-Mail-Adresse</span><input disabled={!editable} maxLength={254} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label></div><div className="form-row"><label><span>Telefon</span><input disabled={!editable} maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label><span>Geburtsdatum</span><input disabled={!editable} type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></label></div><label><span>Position / Funktion</span><input disabled={!editable} maxLength={100} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></label>{editable && <button className="primary profile-save" onClick={saveProfile}><Check /> Änderungen speichern</button>}</section>{canChangePassword && <section className="profile-card password-card"><KeyRound /><span className="eyebrow">SICHERHEIT</span><h2>Passwort ändern</h2><p>Verwende mindestens zwölf Zeichen für dein neues Passwort.</p><label><span>Aktuelles Passwort</span><input maxLength={256} type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} /></label><label><span>Neues Passwort</span><input minLength={12} maxLength={256} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><button onClick={changePassword}>Passwort aktualisieren</button></section>}</div>{message && <div className="profile-message">{message}</div>}</section>;
}

export function AdminSettingsPage({ settings, onSave }: { settings: ClubSettings; onSave: (settings: ClubSettings) => void }) {
  const [form, setForm] = useState(settings); const [saved, setSaved] = useState(false);
  const set = <K extends keyof ClubSettings>(key: K, value: ClubSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleRows: { key: keyof ClubSettings; title: string; description: string }[] = [
    { key: "teamFeatureEnabled", title: "Mannschaftsbereich", description: "Mannschaft, Mitgliederliste und Rollen für das Team aktivieren." },
    { key: "attendanceEnabled", title: "Zu- und Absagen", description: "Spieler können auf Termine mit Dabei, Offen oder Absage reagieren." },
    { key: "waitlistEnabled", title: "Warteliste bei vollem Termin", description: "Weitere Interessenten werden vorgemerkt, sobald das Teilnehmerlimit erreicht ist." },
    { key: "showResponsesToPlayers", title: "Antworten im Team sichtbar", description: "Spieler sehen die Rückmeldungen der anderen Mannschaftsmitglieder." },
    { key: "automaticReminders", title: "Automatische Erinnerungen", description: "Offene Rückmeldungen werden vor Ablauf der Frist hervorgehoben." },
  ];
  function save() { onSave(form); setSaved(true); window.setTimeout(() => setSaved(false), 2200); }
  return <section className="settings-page module-page"><div className="module-hero"><div><span className="eyebrow">ADMINISTRATION</span><h1>Einstellungen</h1><p>Steuere Funktionen, Fristen und Standards für deine Mannschaft.</p></div><button className="primary" onClick={save}><Check /> Speichern</button></div><div className="settings-layout"><section className="settings-card"><div className="settings-title"><Shield /><span><h2>Module & Rechte</h2><p>Funktionen lassen sich für die ganze Mannschaft ein- oder ausschalten.</p></span></div><div className="toggle-list">{toggleRows.map((row) => <label key={row.key}><span><strong>{row.title}</strong><small>{row.description}</small></span><input type="checkbox" checked={Boolean(form[row.key])} onChange={(event) => set(row.key, event.target.checked as never)} /><i /></label>)}</div></section><section className="settings-card"><div className="settings-title"><Clock3 /><span><h2>Rückmeldefristen</h2><p>Bis wie viele Stunden vor Beginn darf die Teilnahme geändert werden?</p></span></div><div className="deadline-grid"><label><span>Training</span><div><input type="number" min="0" max="168" value={form.trainingDeadlineHours} onChange={(e) => set("trainingDeadlineHours", Number(e.target.value))} /><small>Stunden vorher</small></div></label><label><span>Turnier</span><div><input type="number" min="0" max="336" value={form.tournamentDeadlineHours} onChange={(e) => set("tournamentDeadlineHours", Number(e.target.value))} /><small>Stunden vorher</small></div></label><label><span>Ereignis</span><div><input type="number" min="0" max="336" value={form.eventDeadlineHours} onChange={(e) => set("eventDeadlineHours", Number(e.target.value))} /><small>Stunden vorher</small></div></label></div><div className="settings-hint"><Bell /><span>Die konkrete Frist wird bei jedem Termin angezeigt. Nach Ablauf sind Änderungen für Spieler gesperrt; Admins und Trainer können weiterhin verwalten.</span></div></section><section className="settings-card"><div className="settings-title"><Users /><span><h2>Standards für neue Termine</h2><p>Diese Werte werden beim Erstellen vorausgefüllt und bleiben pro Termin anpassbar.</p></span></div><div className="deadline-grid"><label><span>Training: Teilnehmer</span><div><input type="number" min="1" max="99" value={form.defaultTrainingCapacity} onChange={(e) => set("defaultTrainingCapacity", Number(e.target.value))} /><small>Plätze</small></div></label><label><span>Turnier: Teilnehmer</span><div><input type="number" min="1" max="99" value={form.defaultTournamentCapacity} onChange={(e) => set("defaultTournamentCapacity", Number(e.target.value))} /><small>Plätze</small></div></label></div></section><section className="settings-card"><div className="settings-title"><Shield /><span><h2>Verein & Mannschaft</h2></span></div><div className="settings-fields"><label><span>Vereinsname</span><input value={form.clubName} onChange={(e) => set("clubName", e.target.value)} /></label><label><span>Mannschaft</span><input value={form.teamName} onChange={(e) => set("teamName", e.target.value)} /></label></div></section></div>{saved && <div className="toast"><Check /> Einstellungen gespeichert</div>}</section>;
}
