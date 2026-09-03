"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bell, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Clock3, Cloud, CloudSun, Copy, Edit3,
  Info, KeyRound, Lock, Mail, Megaphone, Navigation, Plus, Search, Shield, Star, Sun,
  ThumbsDown, ThumbsUp, Trash2, Trophy, Users, X,
} from "lucide-react";
import { defaultPosition, eventLabels, positionOptions, roleLabels, type Attendance, type ClubEvent, type ClubSettings, type ClubUser, type EventType, type RepeatFrequency, type Role } from "@/data/club";

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
    <section className="login-panel"><form onSubmit={submit}><span className="eyebrow">WILLKOMMEN ZURÜCK</span><h2>Anmelden</h2><p>Melde dich mit deinem persönlichen Zugang an.</p><label><span>E-Mail-Adresse</span><div><Mail /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label><label><span>Passwort</span><div><Lock /><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>{error && <div className="login-error">{error}</div>}<button className="primary login-submit" type="submit" disabled={loading}>{loading ? "Anmeldung läuft …" : <>Anmelden <ChevronRight /></>}</button><div className="login-links"><span>Zugang nur über persönliche Einladung</span></div></form></section>
  </main>;
}

export function TeamPage({ users, currentUser, onUsersChange, onProfile, onInvite }: { users: ClubUser[]; currentUser: ClubUser; onUsersChange: (users: ClubUser[]) => void; onProfile: (user: ClubUser) => void; onInvite?: () => void }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const visible = users.filter((user) => (role === "all" || user.role === role) && user.name.toLowerCase().includes(query.toLowerCase()));
  const players = users.filter((user) => user.role === "player");

  function setUserRole(id: string, nextRole: Role) {
    onUsersChange(users.map((user) => user.id === id ? { ...user, role: nextRole, position: defaultPosition[nextRole] } : user));
  }

  return <section className="team-page module-page">
    <div className="module-hero"><div><span className="eyebrow">FC KICKER · F1</span><h1>Unsere Mannschaft</h1><p>F‑Jugend · U8/U9 · Saison 2025/26</p></div>{currentUser.role === "admin" && <button className="primary" onClick={onInvite}><Plus /> <span>Einladen</span></button>}</div>
    <div className="team-stats"><article><Users /><span><strong>{players.length}</strong><small>Spieler</small></span></article><article><Shield /><span><strong>{users.filter((user) => user.role === "trainer").length}</strong><small>Trainer</small></span></article><article><CalendarDays /><span><strong>2×</strong><small>Training / Woche</small></span></article></div>
    <div className="module-tools"><label className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mitglied suchen" /></label><div className="filters">{(["all", "player", "trainer", "admin"] as const).map((item) => <button className={role === item ? "on" : ""} onClick={() => setRole(item)} key={item}>{item === "all" ? "Alle" : roleLabels[item]}</button>)}</div></div>
    <div className="team-list-head"><span>MITGLIED</span><span>POSITION</span><span>ROLLE & RECHTE</span><span>KONTAKT</span></div>
    <div className="team-list">{visible.map((user) => <article key={user.id} onClick={() => onProfile(user)}><Avatar user={user} /><span className="member-name"><strong>{user.name}</strong><small>{user.number ? `Trikot #${user.number}` : user.position}</small></span><span className="member-position">{user.position}</span>{currentUser.role === "admin" ? <select value={user.role} disabled={user.id === currentUser.id} title={user.id === currentUser.id ? "Die eigene Adminrolle kann nicht geändert werden." : "Rolle ändern"} onClick={(event) => event.stopPropagation()} onChange={(event) => setUserRole(user.id, event.target.value as Role)}><option value="player">Spieler</option><option value="trainer">Trainer</option><option value="admin">Admin</option></select> : <span className={`role-badge ${user.role}`}>{roleLabels[user.role]}</span>}<span className="member-contact">{user.email}</span><ChevronRight /></article>)}</div>
    <div className="rights-info"><Shield /><span><strong>Rollen und Rechte</strong><small>Admins verwalten Rollen und Zugänge. Trainer verwalten Termine, Trainings und Teilnahmen. Spieler sehen Termine und melden ihre Teilnahme.</small></span></div>
  </section>;
}

const emptyEvent: ClubEvent = { id: "", type: "training", title: "", date: "2026-07-16", startTime: "17:00", endTime: "18:15", meetingTime: "16:50", location: "Sportplatz Nord", address: "", description: "", trainerNote: "", trainerIds: [], repeatFrequency: "none", maxParticipants: 14, responses: {} };

type PlannedCalendarTraining = { date: string; title: string; startTime: string };

function shiftedTime(time: string, minutes: number) {
  const [hours, minute] = time.split(":").map(Number);
  const total = (hours * 60 + minute + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function CalendarPage({ events, plannedTrainings = [], users, settings, currentUser, onEventsChange, onDeletePlannedTraining }: { events: ClubEvent[]; plannedTrainings?: PlannedCalendarTraining[]; users: ClubUser[]; settings: ClubSettings; currentUser: ClubUser; onEventsChange: (events: ClubEvent[]) => void; onDeletePlannedTraining?: (date: string) => void }) {
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

  function saveEvent(event: ClubEvent) {
    const next = event.id ? events.map((item) => item.id === event.id ? event : item) : [...events, { ...event, id: `event-${Date.now()}` }];
    onEventsChange(next); setEditing(null); setEditingPlannedDate(null); setSelected(event.id ? event : next[next.length - 1]);
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
    const responsibleTrainers = selected.trainerIds ?? [];
    if (selected.type === "training" && currentUser.role !== "player" && value !== "yes" && responsibleTrainers.includes(currentUser.id) && responsibleTrainers.length === 1) return;
    const trainerIds = selected.type === "training" && currentUser.role !== "player"
      ? value === "yes" ? [...new Set([...responsibleTrainers, currentUser.id])] : responsibleTrainers.filter((id) => id !== currentUser.id)
      : responsibleTrainers;
    const updated = { ...selected, trainerIds, responses: { ...selected.responses, [currentUser.id]: value } };
    setSelected(updated); onEventsChange(events.map((event) => event.id === updated.id ? updated : event));
  }

  function saveTrainerNote(note: string) {
    if (!selected || !canManage) return;
    const updated = { ...selected, trainerNote: note };
    setSelected(updated);
    onEventsChange(events.map((event) => event.id === updated.id ? updated : event));
  }

  function openCalendarDay(dateKey: string, dayEvents: ClubEvent[]) {
    const trainingEvent = dayEvents.find((event) => event.type === "training");
    if (trainingEvent) return setSelected(trainingEvent);
    const plannedTraining = plannedTrainingByDate.get(dateKey);
    if (plannedTraining && canManage) {
      setEditingPlannedDate(dateKey);
      setEditing({ ...emptyEvent, date: dateKey, title: plannedTraining.title, startTime: plannedTraining.startTime, meetingTime: shiftedTime(plannedTraining.startTime, -10), endTime: shiftedTime(plannedTraining.startTime, 75), location: "" });
      return;
    }
    if (dayEvents[0]) setSelected(dayEvents[0]);
  }

  return <section className="calendar-page module-page">
    <div className="module-hero"><div><span className="eyebrow">TEAMKALENDER</span><h1>Termine & Verfügbarkeiten</h1><p>Training, Turniere und Vereinsereignisse auf einen Blick.</p></div>{canManage && <button className="primary" onClick={() => { setEditingPlannedDate(null); setEditing({ ...emptyEvent, date: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }), maxParticipants: settings.defaultTrainingCapacity }); }}><Plus /> Termin erstellen</button>}</div>
    <div className="calendar-layout"><section className="month-card"><div className="month-head"><button type="button" onClick={() => changeMonth(-1)} aria-label="Vorheriger Monat"><ChevronLeft /></button><h2>{monthLabel}</h2><button type="button" onClick={() => changeMonth(1)} aria-label="Nächster Monat"><ChevronRight /></button></div><div className="month-grid">{["MO", "DI", "MI", "DO", "FR", "SA", "SO"].map((day) => <span className="weekday" key={day}>{day}</span>)}{monthDays.map((day, index) => { const dateKey = day ? `${monthYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : ""; const dayEvents = day ? events.filter((event) => event.date === dateKey) : []; const hasPlannedTraining = plannedTrainingByDate.has(dateKey) && !dayEvents.some((event) => event.type === "training"); return <button className={dateKey === selectedDate ? "selected-day" : ""} key={`${monthYear}-${monthIndex}-${index}`} disabled={!day} onClick={(clickEvent) => { if (!day) return; setSelectedDate(dateKey); clickEvent.currentTarget.blur(); openCalendarDay(dateKey, dayEvents); }}>{day}<span>{dayEvents.map((event) => <i className={event.type} key={event.id} />)}{hasPlannedTraining && <i className="training" />}</span></button>; })}</div><div className="calendar-legend"><span><i className="training" />Training</span><span><i className="tournament" />Turnier</span><span><i className="event" />Ereignis</span></div></section>
      <section className="upcoming-card"><div className="overview-card-title"><div><span className="eyebrow">ANSTEHEND</span><h2>Nächste Termine</h2></div></div>{upcoming.map((event) => { const yes = Object.values(event.responses).filter((item) => item === "yes").length; return <button className={selected?.id === event.id ? "active" : ""} key={event.id} onClick={() => setSelected(event)}><span className={`event-icon ${event.type}`}>{event.type === "tournament" ? <Trophy /> : <CalendarDays />}</span><span><small>{new Date(`${event.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" })}</small><strong>{event.title}</strong><p>{event.startTime} Uhr · {event.location}</p></span><span className="capacity-mini">{yes}/{event.maxParticipants}</span></button>; })}</section>
    </div>
    {selected && <EventDetail event={selected} settings={settings} users={users} currentUser={currentUser} onRespond={respond} onEdit={() => { setEditingPlannedDate(null); setEditing({ ...selected }); setSelected(null); }} onDuplicate={() => { setEditingPlannedDate(null); setEditing({ ...selected, id: "", title: `${selected.title} – Kopie`, responses: {} }); setSelected(null); }} onClose={() => setSelected(null)} onSaveNote={saveTrainerNote} canManage={canManage} onDelete={() => { onEventsChange(events.filter((event) => event.id !== selected.id)); setSelected(null); }} />}
    {editing && <EventEditor event={editing} plannedTraining={Boolean(editingPlannedDate)} settings={settings} users={users} onClose={() => { setEditing(null); setEditingPlannedDate(null); }} onDelete={editingPlannedDate && onDeletePlannedTraining ? () => { if (!window.confirm("Training und den zugehörigen Trainingsplan wirklich löschen?")) return; onDeletePlannedTraining(editingPlannedDate); setEditing(null); setEditingPlannedDate(null); } : undefined} onSave={saveEvent} />}
  </section>;
}

function EventDetail({ event, settings, users, currentUser, onRespond, onEdit, onDuplicate, onDelete, onClose, onSaveNote, canManage }: { event: ClubEvent; settings: ClubSettings; users: ClubUser[]; currentUser: ClubUser; onRespond: (value: Attendance) => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onClose: () => void; onSaveNote: (note: string) => void; canManage: boolean }) {
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | Attendance | "open">("all");
  const [note, setNote] = useState(event.trainerNote ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const players = users.filter((user) => user.role === "player");
  const playerIds = new Set(players.map((player) => player.id));
  const counts = { yes: 0, maybe: 0, no: 0 }; Object.entries(event.responses).forEach(([userId, value]) => { if (playerIds.has(userId)) counts[value]++; });
  const unanswered = players.filter((player) => !event.responses[player.id]).length;
  const full = counts.yes >= event.maxParticipants && event.responses[currentUser.id] !== "yes";
  const deadlineHours = event.type === "training" ? settings.trainingDeadlineHours : event.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
  const deadline = new Date(new Date(`${event.date}T${event.startTime}:00`).getTime() - deadlineHours * 60 * 60 * 1000);
  const responseClosed = Date.now() > deadline.getTime();
  const visiblePlayers = players.filter((player) => attendanceFilter === "all" || attendanceFilter === "open" ? attendanceFilter === "all" || !event.responses[player.id] || event.responses[player.id] === "maybe" : event.responses[player.id] === attendanceFilter);
  const dateLabel = new Date(`${event.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || event.location)}`;
  const WeatherIcon = event.weather?.condition === "sunny" ? Sun : event.weather?.condition === "partly-cloudy" ? CloudSun : Cloud;
  const isOnlyResponsibleTrainer = event.type === "training" && currentUser.role !== "player" && (event.trainerIds ?? []).includes(currentUser.id) && event.trainerIds?.length === 1;

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
            {settings.attendanceEnabled && <div className="my-response"><div><strong>Deine Teilnahme</strong><small>{isOnlyResponsibleTrainer ? "Du bist aktuell der einzige verantwortliche Trainer." : responseClosed ? `Rückmeldung geschlossen · Frist war ${deadline.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr` : full ? "Die maximale Teilnehmerzahl ist erreicht." : `Änderbar bis ${deadline.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr`}</small></div><button className={event.responses[currentUser.id] === "yes" ? "yes active" : "yes"} disabled={full || responseClosed} onClick={() => onRespond("yes")}><ThumbsUp /> Dabei</button><button className={event.responses[currentUser.id] === "maybe" ? "maybe active" : "maybe"} disabled={responseClosed || isOnlyResponsibleTrainer} onClick={() => onRespond("maybe")}>?</button><button className={event.responses[currentUser.id] === "no" ? "no active" : "no"} disabled={responseClosed || isOnlyResponsibleTrainer} onClick={() => onRespond("no")}><ThumbsDown /></button></div>}
          </div>

          <aside className="event-attendance-column">
            <div className="capacity-block"><div><span>TEILNAHME</span><strong>{counts.yes} / {event.maxParticipants} Plätze</strong></div><div className="capacity-bar"><i style={{ width: `${Math.min(100, counts.yes / event.maxParticipants * 100)}%` }} /></div><div className="attendance-counts"><span className="yes">● {counts.yes} dabei</span><span className="maybe">● {counts.maybe + unanswered} offen</span><span className="no">● {counts.no} nicht dabei</span></div></div>
            {(settings.showResponsesToPlayers || canManage) && <div className="popup-attendees"><div className="attendance-tabs"><button className={attendanceFilter === "all" ? "active" : ""} onClick={() => setAttendanceFilter("all")}>Alle <span>{players.length}</span></button><button className={attendanceFilter === "yes" ? "active" : ""} onClick={() => setAttendanceFilter("yes")}>Dabei <span>{counts.yes}</span></button><button className={attendanceFilter === "open" ? "active" : ""} onClick={() => setAttendanceFilter("open")}>Offen <span>{unanswered + counts.maybe}</span></button><button className={attendanceFilter === "no" ? "active" : ""} onClick={() => setAttendanceFilter("no")}>Absagen <span>{counts.no}</span></button></div><div className="attendee-list"><div className="attendee-head"><span>SPIELER ({visiblePlayers.length})</span><span>STATUS</span></div>{visiblePlayers.map((player) => { const answer = event.responses[player.id]; return <article key={player.id}><Avatar user={player} size="small" /><span><strong>{player.name}</strong><small>{player.position}</small></span><span className={`answer-pill ${answer ?? "open"}`}>{answer === "yes" ? <><ThumbsUp /> Dabei</> : answer === "no" ? <><ThumbsDown /> Absage</> : answer === "maybe" ? "Vielleicht" : "Keine Antwort"}</span></article>; })}{!visiblePlayers.length && <div className="attendee-empty">Keine Spieler in dieser Auswahl.</div>}</div></div>}
          </aside>
        </div>
      </div>

      {canManage && <footer className="event-popup-actions"><button className="event-delete-action" onClick={onDelete}><Trash2 /> Löschen</button><button onClick={onDuplicate}><Copy /> Kopieren</button><button className="primary" onClick={onEdit}><Edit3 /> Bearbeiten</button></footer>}
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
    <div className="event-type-select">{(["training", "tournament", ...(settings.leagueMatchesEnabled ? ["match" as const] : []), "event"] as EventType[]).map((type) => <button type="button" className={form.type === type ? "active" : ""} onClick={() => setForm((current) => ({ ...current, type, maxParticipants: type === "tournament" || type === "match" ? settings.defaultTournamentCapacity : type === "training" ? settings.defaultTrainingCapacity : current.maxParticipants }))} key={type}>{eventLabels[type]}</button>)}</div>

    <section className="event-editor-section"><header><Info /><span><strong>Informationen</strong><small>Was findet statt?</small></span></header><label><span>Name des Termins</span><input required maxLength={160} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={form.type === "training" ? "z. B. Training – Dribbling & Torschuss" : form.type === "tournament" ? "z. B. Kinderfußball-Festival" : "z. B. Mannschaftsabend"} /></label><label><span>Zusätzliche Informationen <em>optional</em></span><textarea rows={3} maxLength={5000} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ausrüstung, Ablauf oder wichtige Hinweise für das Team …" /></label></section>

    {form.type === "match" && <section className="event-editor-section"><header><Trophy /><span><strong>Ligaspiel</strong><small>Gegner und Wettbewerb</small></span></header><div className="form-row"><label><span>Gegner</span><input required maxLength={160} value={form.opponent ?? ""} onChange={(e) => setForm((current) => ({ ...current, opponent: e.target.value }))} placeholder="z. B. SV Grün-Weiß" /></label><label><span>Heim oder auswärts</span><select value={form.homeAway ?? "home"} onChange={(e) => setForm((current) => ({ ...current, homeAway: e.target.value as "home" | "away" }))}><option value="home">Heimspiel</option><option value="away">Auswärtsspiel</option></select></label></div><label><span>Wettbewerb / Staffel <em>optional</em></span><input maxLength={160} value={form.competition ?? ""} onChange={(e) => setForm((current) => ({ ...current, competition: e.target.value }))} placeholder="z. B. Kreisliga Staffel 2" /></label></section>}

    <section className="event-editor-section"><header><Clock3 /><span><strong>Datum und Uhrzeit</strong><small>Treffen, Beginn und Ende</small></span></header><div className="editor-date-row"><label><span>Datum</span><input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} /></label><label><span>Treffen</span><input type="time" required value={form.meetingTime} onChange={(e) => set("meetingTime", e.target.value)} /></label><label><span>Beginn</span><input type="time" required value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></label><label><span>Ende</span><input type="time" required value={form.endTime} onChange={(e) => set("endTime", e.target.value)} /></label></div></section>

    {canRepeat && <section className="event-editor-section event-repeat-section"><header><CalendarDays /><span><strong>Wiederholung</strong><small>Wie im Kalender: Rhythmus wählen und Ende festlegen</small></span></header><div className="event-repeat-row"><label><span>Wiederholen</span><select value={form.repeatFrequency ?? "none"} onChange={(e) => setRepeatFrequency(e.target.value as RepeatFrequency)}><option value="none">Nie</option><option value="daily">Täglich</option><option value="weekly">Wöchentlich</option><option value="biweekly">Alle zwei Wochen</option><option value="monthly">Monatlich</option><option value="yearly">Jährlich</option></select></label>{form.repeatFrequency && form.repeatFrequency !== "none" && <label><span>Wiederholung beenden</span><input type="date" required min={form.date} value={form.repeatUntil ?? ""} onChange={(e) => set("repeatUntil", e.target.value)} /></label>}</div>{form.repeatFrequency && form.repeatFrequency !== "none" && <p className="event-repeat-hint">Alle Termine werden bis einschließlich dieses Datums angelegt und können anschließend einzeln bearbeitet werden.</p>}</section>}

    <section className="event-editor-section"><header><Navigation /><span><strong>Ort und Anfahrt</strong><small>Damit alle den Treffpunkt finden</small></span></header><div className="form-row"><label><span>Ort / Platz</span><input required maxLength={180} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="z. B. Sportplatz Nord" /></label><label><span>Vollständige Adresse <em>optional</em></span><input maxLength={300} value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Straße, Hausnummer, PLZ, Ort" /></label></div></section>

    {form.type === "training" && <section className="event-editor-section"><header><Users /><span><strong>Verantwortliche Trainer</strong><small>Mehrere Trainer sind möglich. Die Auswahl setzt die Teilnahme automatisch auf „Dabei“.</small></span></header><div className="event-trainer-select">{trainers.map((trainer) => { const active = (form.trainerIds ?? []).includes(trainer.id); return <button type="button" className={active ? "active" : ""} aria-pressed={active} key={trainer.id} onClick={() => toggleTrainer(trainer.id)}><Avatar user={trainer} size="small" /><span><strong>{trainer.name}</strong><small>{active ? "Verantwortlich · dabei" : "Nicht zugewiesen"}</small></span>{active && <Check />}</button>; })}</div></section>}

    <section className="event-editor-section"><header><Users /><span><strong>Teilnahme</strong><small>Wer wird eingeplant?</small></span></header><div className="event-audience"><Check /><span><strong>Alle aktiven Spieler</strong><small>{players} Spieler erhalten den Termin und können {settings.attendanceEnabled ? "zu- oder absagen" : "den Termin ansehen"}.</small></span></div><div className="form-row"><label><span>Teilnehmerlimit</span><input type="number" inputMode="numeric" min="1" max="99" required value={form.maxParticipants} onChange={(e) => set("maxParticipants", Number(e.target.value))} /></label><div className="event-setting-summary"><Clock3 /><span><strong>Rückmeldefrist</strong><small>{settings.attendanceEnabled && deadline ? `${deadline.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr` : "Zu-/Absagen sind deaktiviert"}</small></span></div></div></section>

    <section className="event-editor-section event-notification-summary"><header><Bell /><span><strong>Benachrichtigungen</strong><small>{settings.automaticReminders ? "Offene Rückmeldungen werden automatisch erinnert." : "Automatische Erinnerungen sind in den Einstellungen deaktiviert."}</small></span></header></section>
    {error && <div className="event-editor-error"><AlertTriangle />{error}</div>}
    <div className={`editor-actions ${onDelete ? "with-delete" : ""}`}>{onDelete && <button className="event-delete-action icon-only-delete" type="button" onClick={onDelete} aria-label="Training löschen" title="Training löschen"><Trash2 /></button>}<button type="button" onClick={onClose}>Abbrechen</button><button className="primary" type="submit"><Check /> {plannedTraining || event.id ? "Änderungen speichern" : "Termin erstellen"}</button></div>
  </form></div>;
}

function RatingRow({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return <div className="player-rating-row"><span>{label}<small>{value ? `${value} von 5` : "Noch nicht bewertet"}</small></span><div role="radiogroup" aria-label={`${label} bewerten`}>{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} disabled={disabled} className={rating <= value ? "active" : ""} role="radio" aria-checked={rating === value} aria-label={`${rating} von 5 Sternen`} onClick={() => onChange(rating)}><Star /></button>)}</div></div>;
}

export function ProfilePage({ user, editable, canChangePassword, canRequestEmailChange, emailChangeByAdmin, canManageDevelopment, splitTeamsEnabled, onSave, onChangePassword, onBack }: { user: ClubUser; editable: boolean; canChangePassword: boolean; canRequestEmailChange: boolean; emailChangeByAdmin: boolean; canManageDevelopment: boolean; splitTeamsEnabled: boolean; onSave: (user: ClubUser) => void; onChangePassword: (currentPassword: string, newPassword: string, confirmation: string) => Promise<string | null>; onBack?: () => void }) {
  const [form, setForm] = useState(user);
  const [message, setMessage] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => { setForm(user); setMessage(""); setEmailOpen(false); setPasswordOpen(false); }, [user]);
  function photo(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setMessage("Bitte PNG, JPEG oder WebP mit maximal 1 MB auswählen."); event.target.value = ""; return; } const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, avatar: String(reader.result) })); reader.readAsDataURL(file); }
  function saveProfile() { onSave(form); setMessage("Profil gespeichert."); }
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
      const response = await fetch("/api/v1/auth/email-change", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: user.id, newEmail, currentPassword: emailPassword }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) return setMessage(result.error || "Bestätigungs-E-Mail konnte nicht versendet werden.");
      setMessage(result.message || "Bestätigungs-E-Mail wurde versendet."); setNewEmail(""); setEmailPassword(""); setEmailOpen(false);
    } catch { setMessage("Der Server ist gerade nicht erreichbar."); }
    finally { setEmailBusy(false); }
  }

  return <section className="profile-page module-page">
    <div className="profile-cover" />
    <div className="profile-heading">{onBack && <button className="profile-back" onClick={onBack}><ChevronLeft /></button>}<div className="profile-photo"><Avatar user={form} size="large" />{editable && <label><Camera /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={photo} /></label>}</div><div><span className={`role-badge ${form.role}`}>{roleLabels[form.role]}</span><h1>{form.name}</h1><p>{form.position} · FC Kicker F1</p></div></div>
    <div className="profile-grid">
      <section className="profile-card"><span className="eyebrow">PERSÖNLICHE DATEN</span><h2>Profilinformationen</h2><div className="form-row"><label><span>Vor- und Nachname</span><input disabled={!editable} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="protected-email"><span>E-Mail-Adresse</span><div><input disabled type="email" value={form.email} />{canRequestEmailChange && <button type="button" onClick={() => setEmailOpen((open) => !open)}><Mail /> Ändern</button>}</div><small>Eine neue Adresse wird erst nach Bestätigung übernommen.</small></label></div>{emailOpen && <div className="email-change-panel"><div><Mail /><span><strong>{emailChangeByAdmin ? `E-Mail-Adresse für ${form.name} ändern` : "Neue E-Mail-Adresse bestätigen"}</strong><small>Wir senden einen 60 Minuten gültigen Bestätigungslink an die neue Adresse.</small></span></div><div className="form-row"><label><span>Neue E-Mail-Adresse</span><input type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /></label><label><span>{emailChangeByAdmin ? "Dein Admin-Passwort" : "Aktuelles Passwort"}</span><input type="password" autoComplete="current-password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} /></label></div>{emailChangeByAdmin && <p className="admin-email-hint"><Shield /> Die Änderung wird vom Vereinsadmin angestoßen und erst durch den Link an die neue Adresse wirksam.</p>}<div className="profile-inline-actions"><button onClick={() => setEmailOpen(false)}>Abbrechen</button><button className="primary" disabled={emailBusy || !newEmail || !emailPassword} onClick={requestEmailChange}>{emailBusy ? "Wird versendet …" : "Bestätigungs-E-Mail senden"}</button></div></div>}<div className="form-row"><label><span>Telefon</span><input disabled={!editable} maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label><span>Geburtsdatum</span><input disabled={!editable} type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></label></div>{form.role === "player" && <div className="form-row profile-number-fields"><label><span>Trikotnummer</span><input disabled={!editable} type="number" inputMode="numeric" min="0" max="999" value={form.number ?? ""} onChange={(event) => setForm({ ...form, number: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="z. B. 10" /></label><label><span>Ballnummer</span><input disabled={!editable} type="number" inputMode="numeric" min="0" max="999" value={form.ballNumber ?? ""} onChange={(event) => setForm({ ...form, ballNumber: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="z. B. 7" /></label></div>}<label><span>Position / Funktion</span><select disabled={!editable || form.role === "admin"} value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })}>{positionOptions[form.role].map((position) => <option value={position} key={position}>{position}</option>)}</select></label>{editable && <button className="primary profile-save" onClick={saveProfile}><Check /> Änderungen speichern</button>}</section>
      {canChangePassword && <section className={`profile-card password-card ${passwordOpen ? "open" : ""}`}><KeyRound /><span className="eyebrow">SICHERHEIT</span><h2>Passwort</h2><p>Verwende mindestens zwölf Zeichen und bestätige das neue Passwort durch eine zweite Eingabe.</p>{!passwordOpen ? <button className="password-open-button" onClick={() => setPasswordOpen(true)}><KeyRound /> Passwort ändern</button> : <><label><span>Aktuelles Passwort</span><input maxLength={256} type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} /></label><label><span>Neues Passwort</span><input minLength={12} maxLength={256} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><label><span>Neues Passwort wiederholen</span><input minLength={12} maxLength={256} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} /></label><div className="profile-inline-actions"><button onClick={() => { setPasswordOpen(false); setOldPassword(""); setNewPassword(""); setPasswordConfirmation(""); }}>Abbrechen</button><button className="primary" onClick={changePassword}>Passwort aktualisieren</button></div></>}</section>}
      {splitTeamsEnabled && form.role === "player" && canManageDevelopment && <section className="profile-card player-development-card"><div className="development-card-head"><span><span className="eyebrow">INTERNER STECKBRIEF</span><h2>Spielerentwicklung</h2><p>Kurze Einschätzung für die Trainingsplanung. Die Angaben sind nur für Trainer und Admins gedacht.</p></span><span className="development-team-badge">{form.internalTeam ? `Team ${form.internalTeam}` : "Ohne Team"}</span></div><div className="player-ratings"><RatingRow label="Dribbeln" value={form.dribblingRating} disabled={!canManageDevelopment} onChange={(value) => setForm((current) => ({ ...current, dribblingRating: value }))} /><RatingRow label="Schuss" value={form.shootingRating} disabled={!canManageDevelopment} onChange={(value) => setForm((current) => ({ ...current, shootingRating: value }))} /><RatingRow label="Passen" value={form.passingRating} disabled={!canManageDevelopment} onChange={(value) => setForm((current) => ({ ...current, passingRating: value }))} /></div><label className="internal-team-select"><span>Interne Trainingsgruppe</span><select value={form.internalTeam ?? ""} onChange={(event) => setForm((current) => ({ ...current, internalTeam: (event.target.value || null) as ClubUser["internalTeam"] }))}><option value="">Noch nicht zugeordnet</option><option value="A">Team A</option><option value="B">Team B</option></select><small>Unabhängig von Altersklasse und Turniermannschaften.</small></label><button className="primary development-save" onClick={saveProfile}><Check /> Steckbrief speichern</button></section>}
    </div>{message && <div className="profile-message">{message}</div>}
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
