"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarDays, Check, Eye, EyeOff, Plus, Search, ShieldCheck, Trash2, Trophy, UserRoundCheck, Users, X,
} from "lucide-react";
import type { ClubEvent, ClubSettings, ClubUser, TournamentPlan, TournamentSquad } from "@/data/club";
import { duplicateTournamentPlayers, validateTournamentSquad } from "@/lib/tournament-planning";
import { Avatar } from "./ClubModules";

type Props = {
  events: ClubEvent[];
  users: ClubUser[];
  plans: TournamentPlan[];
  settings: ClubSettings;
  currentUser: ClubUser;
  selectedEventId?: string | null;
  onPlansChange: (eventId: string, squads: TournamentSquad[]) => Promise<boolean>;
  onPublicationChange: (eventId: string, published: boolean) => Promise<boolean>;
};

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const eventDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
const EMPTY_TOURNAMENT_SQUADS: TournamentSquad[] = [];

export function TournamentPlanningPage(props: Props) {
  const { events, users, plans, settings, currentUser, selectedEventId, onPlansChange, onPublicationChange } = props;
  const canManage = currentUser.role === "admin" || currentUser.role === "trainer";
  const tournaments = useMemo(() => {
    const todayKey = today();
    return events.filter((event) => event.type === "tournament" && !event.cancelledAt && event.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (selectedId && tournaments.some((event) => event.id === selectedId)) return;
    setSelectedId(tournaments[0]?.id ?? "");
  }, [selectedId, tournaments]);
  useEffect(() => {
    if (selectedEventId && tournaments.some((event) => event.id === selectedEventId)) setSelectedId(selectedEventId);
  }, [selectedEventId, tournaments]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 2800); return () => window.clearTimeout(timer); }, [message]);

  const selected = tournaments.find((event) => event.id === selectedId) ?? null;
  const selectedPlan = plans.find((plan) => plan.eventId === selectedId);
  const squads = selectedPlan?.squads ?? EMPTY_TOURNAMENT_SQUADS;

  if (!canManage) return <PlayerTournamentTeams tournaments={tournaments} plans={plans} users={users} currentUser={currentUser} />;

  return <section className="tournament-page tournament-roster-page module-page">
    {!selected ? <section className="tournament-empty"><Trophy /><h2>Turnier nicht gefunden</h2><p>Öffne die Mannschaftsplanung direkt aus einer Turnierkarte.</p></section> : <MatchDayOverview event={selected} squads={squads} published={Boolean(selectedPlan?.publishedAt)} users={users} settings={settings} busy={busy} onPublicationChange={async (published) => { setBusy(true); const saved = await onPublicationChange(selected.id, published); setBusy(false); if (saved) setMessage(published ? "Planung für Spieler freigegeben." : "Freigabe zurückgenommen."); return saved; }} onSave={async (nextSquads) => { setBusy(true); const saved = await onPlansChange(selected.id, nextSquads); setBusy(false); if (saved) setMessage("Mannschaftsplanung als Entwurf gespeichert."); return saved; }} />}
    {message && <div className="toast"><Check /> {message}</div>}
  </section>;
}

function MatchDayOverview({ event, squads, published, users, settings, busy, onPublicationChange, onSave }: { event: ClubEvent; squads: TournamentSquad[]; published: boolean; users: ClubUser[]; settings: ClubSettings; busy: boolean; onPublicationChange: (published: boolean) => Promise<boolean>; onSave: (squads: TournamentSquad[]) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TournamentSquad[]>(squads);
  const [editingSquadId, setEditingSquadId] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!squads.length) {
      const initialSquad = createSquad(0);
      setDraft([initialSquad]);
      setEditing(true);
      setEditingSquadId(initialSquad.id);
    } else {
      setDraft(squads);
      setEditing(false);
      setEditingSquadId(null);
    }
    setError("");
  }, [event.id, squads]);
  const playerList = users.filter((user) => user.role === "player" && event.responses[user.id] === "yes");
  const players = new Map(playerList.map((user) => [user.id, user]));
  const trainerList = users.filter((user) => user.role === "trainer" || user.role === "admin");
  const trainers = new Map(trainerList.map((user) => [user.id, user]));
  const assignedIds = new Set(draft.flatMap((squad) => squad.playerIds));
  const availablePlayers = playerList.filter((player) => !assignedIds.has(player.id));
  const playerAgeGroups = Object.fromEntries(playerList.map((player) => [player.id, player.ageGroup]));

  function createSquad(index = draft.length) {
    return { id: `squad-${Date.now()}-${index}`, eventId: event.id, name: settings.tournamentDefaultSquadName.replace("{n}", String(index + 1)), trainerId: null, playerIds: [] } satisfies TournamentSquad;
  }

  function updateSquad(id: string, patch: Partial<TournamentSquad>) { setDraft((current) => current.map((squad) => squad.id === id ? { ...squad, ...patch } : squad)); setError(""); }
  function startEditing() { setDraft(squads); setEditing(true); setError(""); }
  function beginNewSquad() { const squad = createSquad(squads.length); setDraft([...squads, squad]); setEditing(true); setEditingSquadId(squad.id); setError(""); }
  function addFirstSquad() { const squad = createSquad(0); setDraft([squad]); setEditing(true); setEditingSquadId(squad.id); setError(""); }
  function addSquad() { const squad = createSquad(draft.length); setDraft((current) => [...current, squad]); setEditingSquadId(squad.id); setError(""); }
  function removeSquad(id: string) {
    const squad = draft.find((item) => item.id === id);
    if (squad?.playerIds.length && !window.confirm(`${squad.name} entfernen? Die Kinder werden wieder als nicht zugeteilt angezeigt.`)) return;
    setDraft((current) => current.filter((item) => item.id !== id));
  }
  async function save() {
    if (!draft.length) return setError("Lege mindestens eine Mannschaft an.");
    if (draft.some((squad) => !squad.name.trim())) return setError("Jede Mannschaft benötigt einen Namen.");
    if (new Set(draft.map((squad) => squad.name.trim().toLocaleLowerCase("de-DE"))).size !== draft.length) return setError("Mannschaftsnamen dürfen nicht doppelt sein.");
    if (duplicateTournamentPlayers(draft).size) return setError("Ein Kind ist doppelt zugeteilt.");
    if (await onSave(draft.map((squad) => ({ ...squad, name: squad.name.trim() })))) setEditing(false);
  }

  const visibleSquads = editing ? draft : squads;
  return <section className={`matchday-view ${editing ? "is-editing" : ""}`}>
    <header className="matchday-topbar"><span><small>SPIELTAG · {published ? "FREIGEGEBEN" : "ENTWURF"}</small><strong>{event.title}</strong></span><span className="matchday-team-count">{visibleSquads.length} Teams · {visibleSquads.reduce((sum, squad) => sum + squad.playerIds.length, 0)} Kinder</span>{editing ? <div className="matchday-edit-actions"><button onClick={() => { setDraft(squads); setEditing(false); setError(""); }}>Abbrechen</button><button className="primary" disabled={busy} onClick={() => void save()}><Check /> {busy ? "Speichert …" : "Als Entwurf speichern"}</button></div> : <div className="matchday-view-actions"><button className="primary" onClick={beginNewSquad}><Plus /> Mannschaft</button>{squads.length > 0 && <button className={published ? "matchday-unpublish-button" : "matchday-publish-button"} disabled={busy} onClick={() => void onPublicationChange(!published)}>{published ? <EyeOff /> : <Eye />}{published ? "Freigabe zurücknehmen" : "Für Spieler freigeben"}</button>}<button className="matchday-edit-button" onClick={startEditing}><ShieldCheck /> Bearbeiten</button></div>}</header>
    {editing && <div className="matchday-edit-hint"><ShieldCheck /><span><strong>Mannschaften zusammenstellen</strong><small>Öffne eine Mannschaft und markiere alle Kinder direkt in der Spielerliste.</small></span><button onClick={addSquad}><Plus /> Mannschaft</button></div>}
    {error && <div className="matchday-error"><AlertTriangle /> {error}</div>}
    {!visibleSquads.length ? <section className="matchday-empty-plan"><Users /><h2>Noch keine Mannschaft angelegt</h2><p>Markiere die Kinder einfach in einer gemeinsamen Spielerliste.</p><button className="primary" onClick={addFirstSquad}><Plus /> Mannschaft anlegen</button></section> : <div className="matchday-squad-grid">{visibleSquads.map((squad, squadIndex) => { const trainer = squad.trainerId ? trainers.get(squad.trainerId) : null; const validation = validateTournamentSquad(squad, playerAgeGroups, { minFYouth: settings.tournamentMinFYouth, maxTeamSize: settings.tournamentMaxTeamSize, trainerRequired: settings.tournamentTrainerRequired }); return <article className="matchday-squad" key={squad.id}><header><span>{String(squadIndex + 1).padStart(2, "0")}</span><div><small>MANNSCHAFT</small><h2>{squad.name}</h2></div>{editing ? <button className="matchday-delete-team" onClick={() => removeSquad(squad.id)} aria-label={`${squad.name} entfernen`}><Trash2 /></button> : <strong>{squad.playerIds.length}</strong>}</header><div className="matchday-trainer"><UserRoundCheck /><span><small>Verantwortlicher Trainer</small><strong>{trainer?.name ?? "Noch nicht zugewiesen"}</strong></span></div><ol>{squad.playerIds.map((id, index) => { const player = players.get(id); return player ? <li key={id}><span>{index + 1}</span><Avatar user={player} size="small" /><strong>{player.name}</strong><small>{player.ageGroup}</small>{player.number ? <em>#{player.number}</em> : null}</li> : null; })}</ol>{!squad.playerIds.length && <p className="matchday-empty-team">Noch keine Kinder zugeteilt.</p>}{editing && <button className="matchday-open-picker" onClick={() => setEditingSquadId(squad.id)}><Users /> Spieler auswählen <span>{squad.playerIds.length}</span></button>}<div className="matchday-validation"><span className={validation.minimumMet ? "ok" : "warning"}>{validation.minimumMet ? <Check /> : <AlertTriangle />}{validation.fYouthCount} F-Jugend</span><span className={validation.trainerMissing ? "warning" : "ok"}>{validation.trainerMissing ? <AlertTriangle /> : <ShieldCheck />}{validation.trainerMissing ? "Trainer fehlt" : "Trainer zugeteilt"}</span></div></article>; })}</div>}
    {editing && <section className="matchday-unassigned"><header><div><small>NOCH OFFEN</small><h2>Nicht zugeteilte Kinder</h2></div><strong>{availablePlayers.length}</strong></header>{availablePlayers.length ? <div>{availablePlayers.map((player) => <span key={player.id}><Avatar user={player} size="small" /><strong>{player.name}</strong><small>{player.ageGroup}</small></span>)}</div> : <p>Alle Kinder der aktivierten Altersklassen sind einer Mannschaft zugeteilt.</p>}</section>}
    {editingSquadId && draft.find((squad) => squad.id === editingSquadId) && <SquadEditor embedded squad={draft.find((squad) => squad.id === editingSquadId)!} squads={draft} players={playerList} trainers={trainerList} event={event} settings={settings} busy={busy} onClose={() => setEditingSquadId(null)} onSave={(squad) => { const next = draft.map((item) => item.id === squad.id ? squad : item); setDraft(next); setEditingSquadId(null); void onSave(next).then((saved) => { if (saved) setEditing(false); }); }} />}
  </section>;
}

function PlayerTournamentTeams({ tournaments, plans, users, currentUser }: { tournaments: ClubEvent[]; plans: TournamentPlan[]; users: ClubUser[]; currentUser: ClubUser }) {
  const releasedEventIds = new Set(plans.filter((plan) => plan.publishedAt).map((plan) => plan.eventId));
  const upcoming = tournaments.filter((event) => event.date >= today() && releasedEventIds.has(event.id));
  const highlightedIds = new Set([currentUser.id, ...(currentUser.managedPlayerIds ?? [])]);
  return <section className="tournament-page module-page player-tournament-page"><div className="module-hero"><div><span className="eyebrow">MEINE TURNIERE</span><h1>Deine Mannschaft</h1><p>Hier siehst du freigegebene Mannschaften, Mitspieler und den zuständigen Trainer.</p></div></div><div className="player-team-list">{upcoming.map((event) => { const squad = plans.find((plan) => plan.eventId === event.id)?.squads[0]; const trainer = users.find((user) => user.id === squad?.trainerId); const squadPlayers = squad?.playerIds.map((id) => users.find((user) => user.id === id)).filter((player): player is ClubUser => Boolean(player)) ?? []; return <article key={event.id}><span className="event-icon tournament"><Trophy /></span><div><small>{eventDate(event.date)}</small><h2>{event.title}</h2>{squad ? <><div className="player-assignment"><span><Users /><small>Mannschaft</small><strong>{squad.name}</strong></span><span><UserRoundCheck /><small>Trainer</small><strong>{trainer?.name ?? "Wird noch bekannt gegeben"}</strong></span></div><section className="released-squad-roster"><header><span>KADER</span><strong>{squadPlayers.length} Spieler</strong></header><ul>{squadPlayers.map((player) => <li className={highlightedIds.has(player.id) ? "is-current" : ""} key={player.id}><Avatar user={player} size="small" /><span><strong>{player.name}</strong><small>{highlightedIds.has(player.id) ? "Dein Platz im Team" : player.position}</small></span>{player.number != null && <em>#{player.number}</em>}</li>)}</ul></section></> : <p>Du wurdest noch keiner Mannschaft zugewiesen.</p>}</div></article>; })}{!upcoming.length && <section className="tournament-empty"><CalendarDays /><h2>Noch keine Mannschaft freigegeben</h2><p>Sobald ein Trainer die Turnierplanung veröffentlicht, erscheint deine Zuordnung hier.</p></section>}</div></section>;
}

function SquadEditor({ squad, squads, players, trainers, event, settings, busy, onClose, onSave, embedded = false }: { squad: TournamentSquad; squads: TournamentSquad[]; players: ClubUser[]; trainers: ClubUser[]; event: ClubEvent; settings: ClubSettings; busy: boolean; onClose: () => void; onSave: (squad: TournamentSquad) => void; embedded?: boolean }) {
  const [form, setForm] = useState(squad);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  const assignedElsewhere = new Map(squads.filter((item) => item.id !== squad.id).flatMap((item) => item.playerIds.map((id) => [id, item.name] as const)));
  const visible = players
    .filter((player) => event.responses[player.id] === "yes" && player.name.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name, "de"));
  const ageMap = Object.fromEntries(players.map((player) => [player.id, player.ageGroup]));
  const validation = validateTournamentSquad(form, ageMap, { minFYouth: settings.tournamentMinFYouth, maxTeamSize: settings.tournamentMaxTeamSize, trainerRequired: settings.tournamentTrainerRequired });

  function togglePlayer(id: string) {
    if (assignedElsewhere.has(id)) return;
    if (form.playerIds.includes(id)) { setForm({ ...form, playerIds: form.playerIds.filter((playerId) => playerId !== id) }); setError(""); return; }
    if (settings.tournamentMaxTeamSize > 0 && form.playerIds.length >= settings.tournamentMaxTeamSize) { setError(`Maximal ${settings.tournamentMaxTeamSize} Spieler pro Mannschaft.`); return; }
    setForm({ ...form, playerIds: [...form.playerIds, id] }); setError("");
  }

  return <div className={embedded ? "squad-editor-inline" : "modal-backdrop squad-editor-backdrop"} onMouseDown={embedded ? undefined : onClose}><form className="squad-editor" role={embedded ? "region" : "dialog"} aria-modal={embedded ? undefined : true} aria-labelledby="squad-editor-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event_) => { event_.preventDefault(); if (!form.name.trim()) return setError("Bitte einen Mannschaftsnamen eingeben."); onSave({ ...form, name: form.name.trim() }); }}><header><div><span className="eyebrow">{event.title}</span><h2 id="squad-editor-title">Mannschaft zusammenstellen</h2></div><button type="button" onClick={onClose} aria-label="Editor schließen"><X /></button></header><div className="squad-editor-fields"><label><span>Mannschaftsname</span><input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label><span>Verantwortlicher Trainer</span><select value={form.trainerId ?? ""} onChange={(e) => setForm({ ...form, trainerId: e.target.value || null })}><option value="">Noch nicht festgelegt</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></label></div><section className="player-picker"><div className="player-picker-title"><div><strong>Spieler auswählen</strong><small>{form.playerIds.length}{settings.tournamentMaxTeamSize ? ` / ${settings.tournamentMaxTeamSize}` : ""} ausgewählt</small></div><label><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Spieler suchen …" /></label></div><div className="player-picker-list">{visible.map((player) => { const selected = form.playerIds.includes(player.id); const otherTeam = assignedElsewhere.get(player.id); return <button type="button" className={`player-pick-card ${selected ? "selected" : ""}`} disabled={Boolean(otherTeam)} key={player.id} onClick={() => togglePlayer(player.id)} aria-pressed={selected}><span className="player-pick-avatar"><Avatar user={player} size="small" />{selected && <i><Check /></i>}</span><span><strong>{player.name}</strong><small>{player.ageGroup || "Spieler"} · zum Turnier angemeldet</small></span>{otherTeam ? <em>{otherTeam}</em> : <b>{selected ? "Ausgewählt" : "Antippen"}</b>}</button>; })}</div></section><div className="squad-editor-validation"><span className={validation.minimumMet ? "ok" : "warning"}>{validation.minimumMet ? <Check /> : <AlertTriangle />}<strong>{validation.fYouthCount} F-Jugend-Spieler</strong><small>Empfohlenes Minimum: {settings.tournamentMinFYouth}</small></span><span className={!validation.trainerMissing ? "ok" : "warning"}>{!validation.trainerMissing ? <Check /> : <AlertTriangle />}<strong>{validation.trainerMissing ? "Trainer fehlt noch" : "Trainer zugewiesen"}</strong><small>{validation.trainerMissing ? "Speichern ist trotzdem möglich." : "Mannschaft ist betreut."}</small></span></div>{error && <div className="squad-editor-error">{error}</div>}<footer><button type="button" onClick={onClose}>Abbrechen</button><button className="primary" disabled={busy} type="submit"><Check /> {busy ? "Wird gespeichert …" : "Mannschaft speichern"}</button></footer></form></div>;
}
