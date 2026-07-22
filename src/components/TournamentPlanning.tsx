"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarDays, Check, ChevronRight, MapPin, Plus, Search, ShieldCheck, Trash2, Trophy, UserRoundCheck, Users, X,
} from "lucide-react";
import type { AgeGroupOption, ClubEvent, ClubSettings, ClubUser, TournamentPlan, TournamentSquad } from "@/data/club";
import { duplicateTournamentPlayers, validateTournamentSquad } from "@/lib/tournament-planning";
import { Avatar } from "./ClubModules";

type Props = {
  events: ClubEvent[];
  users: ClubUser[];
  plans: TournamentPlan[];
  settings: ClubSettings;
  ageGroups: AgeGroupOption[];
  currentUser: ClubUser;
  onPlansChange: (eventId: string, squads: TournamentSquad[]) => Promise<boolean>;
  onCreateTournament: (event: ClubEvent) => Promise<boolean>;
};

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const eventDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });

export function TournamentPlanningPage(props: Props) {
  const { events, users, plans, settings, ageGroups, currentUser, onPlansChange, onCreateTournament } = props;
  const canManage = currentUser.role === "admin" || currentUser.role === "trainer";
  const tournaments = useMemo(() => events.filter((event) => event.type === "tournament").sort((a, b) => a.date.localeCompare(b.date)), [events]);
  const [selectedId, setSelectedId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (selectedId && tournaments.some((event) => event.id === selectedId)) return;
    setSelectedId(tournaments.find((event) => event.date >= today())?.id ?? tournaments[0]?.id ?? "");
  }, [selectedId, tournaments]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 2800); return () => window.clearTimeout(timer); }, [message]);

  const selected = tournaments.find((event) => event.id === selectedId) ?? null;
  const squads = plans.find((plan) => plan.eventId === selectedId)?.squads ?? [];

  if (!canManage) return <PlayerTournamentTeams tournaments={tournaments} plans={plans} users={users} />;

  return <section className="tournament-page module-page">
    {!tournaments.length ? <section className="tournament-empty"><Trophy /><h2>Noch kein Turnier vorhanden</h2><p>Lege zuerst ein Fußballturnier an. Danach kannst du Mannschaften und Trainer zuordnen.</p><button className="primary" onClick={() => setCreateOpen(true)}><Plus /> Erstes Turnier anlegen</button></section> : <>
      <div className="tournament-selector" role="tablist" aria-label="Turnier auswählen">{tournaments.map((event) => {
        const eventSquads = plans.find((plan) => plan.eventId === event.id)?.squads ?? [];
        return <button role="tab" aria-selected={selectedId === event.id} className={selectedId === event.id ? "active" : ""} key={event.id} onClick={() => setSelectedId(event.id)}><span className="tournament-date"><strong>{event.date.slice(-2)}</strong><small>{new Date(`${event.date}T12:00:00`).toLocaleDateString("de-DE", { month: "short" })}</small></span><span><strong>{event.title}</strong><small className="tournament-location"><MapPin /> {event.location}</small><small>{eventSquads.length ? `${eventSquads.length} Mannschaften` : "Planung offen"}</small></span><ChevronRight /></button>;
      })}</div>

      {selected && <MatchDayOverview event={selected} squads={squads} users={users} settings={settings} ageGroups={ageGroups} busy={busy} onCreateTournament={() => setCreateOpen(true)} onSave={async (nextSquads) => { setBusy(true); const saved = await onPlansChange(selected.id, nextSquads); setBusy(false); if (saved) setMessage("Mannschaftsplanung gespeichert."); return saved; }} />}
    </>}

    {createOpen && <TournamentCreateDialog settings={settings} busy={busy} onClose={() => setCreateOpen(false)} onSave={async (event) => { setBusy(true); const saved = await onCreateTournament(event); setBusy(false); if (saved) { setSelectedId(event.id); setCreateOpen(false); setMessage("Turnier angelegt – du kannst jetzt Mannschaften planen."); } }} />}
    {message && <div className="toast"><Check /> {message}</div>}
  </section>;
}

function MatchDayOverview({ event, squads, users, settings, ageGroups, busy, onCreateTournament, onSave }: { event: ClubEvent; squads: TournamentSquad[]; users: ClubUser[]; settings: ClubSettings; ageGroups: AgeGroupOption[]; busy: boolean; onCreateTournament: () => void; onSave: (squads: TournamentSquad[]) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TournamentSquad[]>(squads);
  const [error, setError] = useState("");
  useEffect(() => { setDraft(squads); setEditing(false); setError(""); }, [event.id, squads]);
  const playerList = users.filter((user) => user.role === "player");
  const players = new Map(playerList.map((user) => [user.id, user]));
  const trainerList = users.filter((user) => user.role !== "player");
  const trainers = new Map(trainerList.map((user) => [user.id, user]));
  const activeAgeNames = new Set(ageGroups.filter((ageGroup) => settings.ageGroupIds.includes(ageGroup.id)).map((ageGroup) => ageGroup.name));
  const assignedIds = new Set(draft.flatMap((squad) => squad.playerIds));
  const availablePlayers = playerList.filter((player) => activeAgeNames.has(player.ageGroup) && !assignedIds.has(player.id));
  const playerAgeGroups = Object.fromEntries(playerList.map((player) => [player.id, player.ageGroup]));

  function createSquad(index = draft.length) {
    return { id: `squad-${Date.now()}-${index}`, eventId: event.id, name: settings.tournamentDefaultSquadName.replace("{n}", String(index + 1)), trainerId: null, playerIds: [] } satisfies TournamentSquad;
  }

  function updateSquad(id: string, patch: Partial<TournamentSquad>) { setDraft((current) => current.map((squad) => squad.id === id ? { ...squad, ...patch } : squad)); setError(""); }
  function startEditing() { setDraft(squads); setEditing(true); setError(""); }
  function addFirstSquad() { setDraft([createSquad(0)]); setEditing(true); setError(""); }
  function addSquad() { setDraft((current) => [...current, createSquad(current.length)]); }
  function removeSquad(id: string) {
    const squad = draft.find((item) => item.id === id);
    if (squad?.playerIds.length && !window.confirm(`${squad.name} entfernen? Die Kinder werden wieder als nicht zugeteilt angezeigt.`)) return;
    setDraft((current) => current.filter((item) => item.id !== id));
  }
  function placePlayer(playerId: string, targetSquadId: string) {
    const target = draft.find((squad) => squad.id === targetSquadId);
    if (!target) return;
    if (!target.playerIds.includes(playerId) && settings.tournamentMaxTeamSize > 0 && target.playerIds.length >= settings.tournamentMaxTeamSize) return setError(`${target.name} hat bereits die maximale Teamgröße erreicht.`);
    setDraft((current) => current.map((squad) => ({ ...squad, playerIds: squad.id === targetSquadId ? [...squad.playerIds.filter((id) => id !== playerId), playerId] : squad.playerIds.filter((id) => id !== playerId) })));
    setError("");
  }
  function removePlayer(playerId: string) { setDraft((current) => current.map((squad) => ({ ...squad, playerIds: squad.playerIds.filter((id) => id !== playerId) }))); setError(""); }
  async function save() {
    if (!draft.length) return setError("Lege mindestens eine Mannschaft an.");
    if (draft.some((squad) => !squad.name.trim())) return setError("Jede Mannschaft benötigt einen Namen.");
    if (new Set(draft.map((squad) => squad.name.trim().toLocaleLowerCase("de-DE"))).size !== draft.length) return setError("Mannschaftsnamen dürfen nicht doppelt sein.");
    if (duplicateTournamentPlayers(draft).size) return setError("Ein Kind ist doppelt zugeteilt.");
    if (await onSave(draft.map((squad) => ({ ...squad, name: squad.name.trim() })))) setEditing(false);
  }

  const visibleSquads = editing ? draft : squads;
  return <section className={`matchday-view ${editing ? "is-editing" : ""}`}>
    <header className="matchday-topbar"><span><small>SPIELTAG</small><strong>{event.title}</strong></span><span className="matchday-team-count">{visibleSquads.length} Teams · {visibleSquads.reduce((sum, squad) => sum + squad.playerIds.length, 0)} Kinder</span>{editing ? <div className="matchday-edit-actions"><button onClick={() => { setDraft(squads); setEditing(false); setError(""); }}>Abbrechen</button><button className="primary" disabled={busy} onClick={() => void save()}><Check /> {busy ? "Speichert …" : "Speichern"}</button></div> : <div className="matchday-view-actions"><button onClick={onCreateTournament}><Plus /> Turnier anlegen</button><button className="matchday-edit-button" onClick={startEditing}><ShieldCheck /> Bearbeiten</button></div>}</header>
    {editing && <div className="matchday-edit-hint"><ShieldCheck /><span><strong>Bearbeitungsmodus</strong><small>Kinder über das Team-Menü verschieben oder aus der Liste entfernen. Alle Änderungen werden erst mit „Speichern“ übernommen.</small></span><button onClick={addSquad}><Plus /> Mannschaft</button></div>}
    {error && <div className="matchday-error"><AlertTriangle /> {error}</div>}
    {!visibleSquads.length ? <section className="matchday-empty-plan"><Users /><h2>Noch keine Mannschaft angelegt</h2><p>Starte direkt in dieser Ansicht und teile danach die Kinder zu.</p><button className="primary" onClick={addFirstSquad}><Plus /> Erste Mannschaft anlegen</button></section> : <div className="matchday-squad-grid">{visibleSquads.map((squad, squadIndex) => { const trainer = squad.trainerId ? trainers.get(squad.trainerId) : null; const validation = validateTournamentSquad(squad, playerAgeGroups, { minFYouth: settings.tournamentMinFYouth, maxTeamSize: settings.tournamentMaxTeamSize, trainerRequired: settings.tournamentTrainerRequired }); return <article className="matchday-squad" key={squad.id}><header><span>{String(squadIndex + 1).padStart(2, "0")}</span><div><small>MANNSCHAFT</small>{editing ? <input aria-label="Mannschaftsname" maxLength={80} value={squad.name} onChange={(event_) => updateSquad(squad.id, { name: event_.target.value })} /> : <h2>{squad.name}</h2>}</div>{editing ? <button className="matchday-delete-team" onClick={() => removeSquad(squad.id)} aria-label={`${squad.name} entfernen`}><Trash2 /></button> : <strong>{squad.playerIds.length}</strong>}</header><div className="matchday-trainer"><UserRoundCheck /><span><small>Verantwortlicher Trainer</small>{editing ? <select value={squad.trainerId ?? ""} onChange={(event_) => updateSquad(squad.id, { trainerId: event_.target.value || null })}><option value="">Noch nicht zugewiesen</option>{trainerList.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select> : <strong>{trainer?.name ?? "Noch nicht zugewiesen"}</strong>}</span></div><ol>{squad.playerIds.map((id, index) => { const player = players.get(id); return player ? <li className={editing ? "is-editing" : ""} key={id}><span>{index + 1}</span><Avatar user={player} size="small" /><strong>{player.name}</strong>{editing ? <select aria-label={`${player.name} verschieben`} value={squad.id} onChange={(event_) => placePlayer(id, event_.target.value)}>{draft.map((target) => <option disabled={target.id !== squad.id && settings.tournamentMaxTeamSize > 0 && target.playerIds.length >= settings.tournamentMaxTeamSize} value={target.id} key={target.id}>{target.name}</option>)}</select> : <><small>{player.ageGroup}</small>{player.number ? <em>#{player.number}</em> : null}</>}{editing && <button onClick={() => removePlayer(id)} aria-label={`${player.name} aus Mannschaft entfernen`}><Trash2 /></button>}</li> : null; })}</ol>{!squad.playerIds.length && <p className="matchday-empty-team">Noch keine Kinder zugeteilt.</p>}{editing && <div className="matchday-add-player"><Plus /><select value="" disabled={!availablePlayers.length || settings.tournamentMaxTeamSize > 0 && squad.playerIds.length >= settings.tournamentMaxTeamSize} onChange={(event_) => { if (event_.target.value) placePlayer(event_.target.value, squad.id); }}><option value="">{settings.tournamentMaxTeamSize > 0 && squad.playerIds.length >= settings.tournamentMaxTeamSize ? "Mannschaft ist voll" : availablePlayers.length ? "Kind hinzufügen …" : "Alle Kinder sind zugeteilt"}</option>{availablePlayers.map((player) => <option value={player.id} key={player.id}>{player.name} · {player.ageGroup}</option>)}</select></div>}<div className="matchday-validation"><span className={validation.minimumMet ? "ok" : "warning"}>{validation.minimumMet ? <Check /> : <AlertTriangle />}{validation.fYouthCount} F-Jugend</span><span className={validation.trainerMissing ? "warning" : "ok"}>{validation.trainerMissing ? <AlertTriangle /> : <ShieldCheck />}{validation.trainerMissing ? "Trainer fehlt" : "Trainer zugeteilt"}</span></div></article>; })}</div>}
    {editing && <section className="matchday-unassigned"><header><div><small>NOCH OFFEN</small><h2>Nicht zugeteilte Kinder</h2></div><strong>{availablePlayers.length}</strong></header>{availablePlayers.length ? <div>{availablePlayers.map((player) => <span key={player.id}><Avatar user={player} size="small" /><strong>{player.name}</strong><small>{player.ageGroup}</small></span>)}</div> : <p>Alle Kinder der aktivierten Altersklassen sind einer Mannschaft zugeteilt.</p>}</section>}
  </section>;
}

function PlayerTournamentTeams({ tournaments, plans, users }: { tournaments: ClubEvent[]; plans: TournamentPlan[]; users: ClubUser[] }) {
  const upcoming = tournaments.filter((event) => event.date >= today());
  return <section className="tournament-page module-page player-tournament-page"><div className="module-hero"><div><span className="eyebrow">MEINE TURNIERE</span><h1>Deine Mannschaft</h1><p>Hier siehst du deine Mannschaft und den zuständigen Trainer.</p></div></div><div className="player-team-list">{upcoming.map((event) => { const squad = plans.find((plan) => plan.eventId === event.id)?.squads[0]; const trainer = users.find((user) => user.id === squad?.trainerId); return <article key={event.id}><span className="event-icon tournament"><Trophy /></span><div><small>{eventDate(event.date)}</small><h2>{event.title}</h2>{squad ? <div className="player-assignment"><span><Users /><small>Mannschaft</small><strong>{squad.name}</strong></span><span><UserRoundCheck /><small>Trainer</small><strong>{trainer?.name ?? "Wird noch bekannt gegeben"}</strong></span></div> : <p>Du wurdest noch keiner Mannschaft zugewiesen.</p>}</div></article>; })}{!upcoming.length && <section className="tournament-empty"><CalendarDays /><h2>Keine anstehenden Turniere</h2><p>Sobald ein Turnier geplant ist, erscheint deine Zuordnung hier.</p></section>}</div></section>;
}

function SquadEditor({ squad, squads, players, trainers, ageGroups, event, settings, busy, onClose, onSave }: { squad: TournamentSquad; squads: TournamentSquad[]; players: ClubUser[]; trainers: ClubUser[]; ageGroups: AgeGroupOption[]; event: ClubEvent; settings: ClubSettings; busy: boolean; onClose: () => void; onSave: (squad: TournamentSquad) => void }) {
  const [form, setForm] = useState(squad);
  const [query, setQuery] = useState("");
  const [ageFilter, setAgeFilter] = useState("Alle");
  const [error, setError] = useState("");
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  const assignedElsewhere = new Map(squads.filter((item) => item.id !== squad.id).flatMap((item) => item.playerIds.map((id) => [id, item.name] as const)));
  const activeAgeGroups = ageGroups.filter((ageGroup) => settings.ageGroupIds.includes(ageGroup.id));
  const activeAgeNames = new Set(activeAgeGroups.map((ageGroup) => ageGroup.name));
  const ages = ["Alle", ...activeAgeGroups.map((ageGroup) => ageGroup.name)];
  const visible = players.filter((player) => (activeAgeNames.has(player.ageGroup) || form.playerIds.includes(player.id)) && (ageFilter === "Alle" || player.ageGroup === ageFilter) && player.name.toLowerCase().includes(query.toLowerCase()));
  const ageMap = Object.fromEntries(players.map((player) => [player.id, player.ageGroup]));
  const validation = validateTournamentSquad(form, ageMap, { minFYouth: settings.tournamentMinFYouth, maxTeamSize: settings.tournamentMaxTeamSize, trainerRequired: settings.tournamentTrainerRequired });

  function togglePlayer(id: string) {
    if (assignedElsewhere.has(id)) return;
    if (form.playerIds.includes(id)) { setForm({ ...form, playerIds: form.playerIds.filter((playerId) => playerId !== id) }); setError(""); return; }
    if (settings.tournamentMaxTeamSize > 0 && form.playerIds.length >= settings.tournamentMaxTeamSize) { setError(`Maximal ${settings.tournamentMaxTeamSize} Spieler pro Mannschaft.`); return; }
    setForm({ ...form, playerIds: [...form.playerIds, id] }); setError("");
  }

  return <div className="modal-backdrop squad-editor-backdrop" onMouseDown={onClose}><form className="squad-editor" role="dialog" aria-modal="true" aria-labelledby="squad-editor-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event_) => { event_.preventDefault(); if (!form.name.trim()) return setError("Bitte einen Mannschaftsnamen eingeben."); onSave({ ...form, name: form.name.trim() }); }}><header><div><span className="eyebrow">{event.title}</span><h2 id="squad-editor-title">Mannschaft bearbeiten</h2></div><button type="button" onClick={onClose} aria-label="Editor schließen"><X /></button></header><div className="squad-editor-fields"><label><span>Mannschaftsname</span><input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label><span>Verantwortlicher Trainer</span><select value={form.trainerId ?? ""} onChange={(e) => setForm({ ...form, trainerId: e.target.value || null })}><option value="">Noch nicht festgelegt</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></label></div><section className="player-picker"><div className="player-picker-title"><div><strong>Spieler auswählen</strong><small>{form.playerIds.length}{settings.tournamentMaxTeamSize ? ` / ${settings.tournamentMaxTeamSize}` : ""} ausgewählt</small></div><label><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Spieler suchen …" /></label></div><div className="age-filter-row">{ages.map((age) => <button type="button" className={ageFilter === age ? "active" : ""} key={age} onClick={() => setAgeFilter(age)}>{age}</button>)}</div><div className="player-picker-list">{visible.map((player) => { const selected = form.playerIds.includes(player.id); const otherTeam = assignedElsewhere.get(player.id); const response = event.responses[player.id]; return <button type="button" className={selected ? "selected" : ""} disabled={Boolean(otherTeam)} key={player.id} onClick={() => togglePlayer(player.id)} aria-pressed={selected}><Avatar user={player} size="small" /><span><strong>{player.name}</strong><small>{player.ageGroup || "F-Jugend"}{response ? ` · ${response === "yes" ? "Zusage" : response === "no" ? "Absage" : "Offen"}` : " · keine Rückmeldung"}</small></span>{otherTeam ? <em>{otherTeam}</em> : <i>{selected && <Check />}</i>}</button>; })}</div></section><div className="squad-editor-validation"><span className={validation.minimumMet ? "ok" : "warning"}>{validation.minimumMet ? <Check /> : <AlertTriangle />}<strong>{validation.fYouthCount} F-Jugend-Spieler</strong><small>Empfohlenes Minimum: {settings.tournamentMinFYouth}</small></span><span className={!validation.trainerMissing ? "ok" : "warning"}>{!validation.trainerMissing ? <Check /> : <AlertTriangle />}<strong>{validation.trainerMissing ? "Trainer fehlt noch" : "Trainer zugewiesen"}</strong><small>{validation.trainerMissing ? "Speichern ist trotzdem möglich." : "Mannschaft ist betreut."}</small></span></div>{error && <div className="squad-editor-error">{error}</div>}<footer><button type="button" onClick={onClose}>Abbrechen</button><button className="primary" disabled={busy} type="submit"><Check /> {busy ? "Wird gespeichert …" : "Mannschaft speichern"}</button></footer></form></div>;
}

function TournamentCreateDialog({ settings, busy, onClose, onSave }: { settings: ClubSettings; busy: boolean; onClose: () => void; onSave: (event: ClubEvent) => void }) {
  const [form, setForm] = useState({ title: "", date: today(), location: "", startTime: "10:00", endTime: "13:00", meetingTime: "09:15" });
  const [error, setError] = useState("");
  return <div className="modal-backdrop squad-editor-backdrop" onMouseDown={onClose}><form className="tournament-create" role="dialog" aria-modal="true" aria-labelledby="create-tournament-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event_) => { event_.preventDefault(); if (form.date < today()) return setError("Das Turnierdatum darf nicht in der Vergangenheit liegen."); onSave({ id: `event-${Date.now()}`, type: "tournament", title: form.title.trim(), date: form.date, location: form.location.trim(), address: "", startTime: form.startTime, endTime: form.endTime, meetingTime: form.meetingTime, description: "", trainerNote: "", maxParticipants: settings.defaultTournamentCapacity, responses: {} }); }}><header><div><span className="eyebrow">NEUES FUSSBALLTURNIER</span><h2 id="create-tournament-title">Turnier anlegen</h2></div><button type="button" onClick={onClose}><X /></button></header><label><span>Name des Turniers</span><input required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z. B. Kinderfußball-Festival" /></label><div className="form-row"><label><span>Datum</span><input required min={today()} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label><span>Ort</span><input required maxLength={180} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Sportanlage / Verein" /></label></div><div className="form-row tournament-times"><label><span>Treffen</span><input type="time" value={form.meetingTime} onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} /></label><label><span>Beginn</span><input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label><label><span>Ende</span><input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label></div>{error && <div className="squad-editor-error">{error}</div>}<footer><button type="button" onClick={onClose}>Abbrechen</button><button className="primary" disabled={busy} type="submit"><Plus /> {busy ? "Wird angelegt …" : "Turnier anlegen"}</button></footer></form></div>;
}
