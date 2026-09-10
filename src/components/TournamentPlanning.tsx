"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarDays, Check, Eye, EyeOff, Plus, Search, Trash2, Trophy, UserRoundCheck, Users,
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
  const initialSquads = () => squads.length ? squads : [{ id: `squad-${Date.now()}-0`, eventId: event.id, name: settings.tournamentDefaultSquadName.replace("{n}", "1"), trainerId: null, playerIds: [] }];
  const [draft, setDraft] = useState<TournamentSquad[]>(initialSquads);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const playerList = users.filter((user) => user.role === "player" && event.responses[user.id] === "yes").sort((left, right) => left.name.localeCompare(right.name, "de"));
  const trainerList = users.filter((user) => user.role === "trainer" || user.role === "admin");
  const playerAgeGroups = Object.fromEntries(playerList.map((player) => [player.id, player.ageGroup]));
  const assignedIds = new Set(draft.flatMap((squad) => squad.playerIds));
  const visiblePlayers = playerList.filter((player) => player.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    setDraft(squads.length ? squads : [{ id: `squad-${Date.now()}-0`, eventId: event.id, name: settings.tournamentDefaultSquadName.replace("{n}", "1"), trainerId: null, playerIds: [] }]);
    setQuery("");
    setError("");
  }, [event.id, squads, settings.tournamentDefaultSquadName]);

  function updateSquad(id: string, patch: Partial<TournamentSquad>) {
    setDraft((current) => current.map((squad) => squad.id === id ? { ...squad, ...patch } : squad));
    setError("");
  }

  function addSquad() {
    const index = draft.length;
    setDraft((current) => [...current, { id: `squad-${Date.now()}-${index}`, eventId: event.id, name: settings.tournamentDefaultSquadName.replace("{n}", String(index + 1)), trainerId: null, playerIds: [] }]);
  }

  function removeSquad(id: string) {
    if (draft.length === 1) return setError("Mindestens eine Mannschaft muss bestehen bleiben.");
    const squad = draft.find((item) => item.id === id);
    if (squad?.playerIds.length && !window.confirm(`${squad.name} entfernen? Die Kinder werden anschließend als nicht zugeteilt markiert.`)) return;
    setDraft((current) => current.filter((squad) => squad.id !== id));
  }

  function assignPlayer(playerId: string, squadId: string | null) {
    const target = squadId ? draft.find((squad) => squad.id === squadId) : null;
    if (target && !target.playerIds.includes(playerId) && settings.tournamentMaxTeamSize > 0 && target.playerIds.length >= settings.tournamentMaxTeamSize) {
      setError(`${target.name} hat bereits die maximale Teamgröße erreicht.`);
      return;
    }
    setDraft((current) => current.map((squad) => ({ ...squad, playerIds: squad.id === squadId ? [...squad.playerIds.filter((id) => id !== playerId), playerId] : squad.playerIds.filter((id) => id !== playerId) })));
    setError("");
  }

  async function save() {
    if (draft.some((squad) => !squad.name.trim())) return setError("Jede Mannschaft benötigt einen Namen.");
    if (new Set(draft.map((squad) => squad.name.trim().toLocaleLowerCase("de-DE"))).size !== draft.length) return setError("Mannschaftsnamen dürfen nicht doppelt sein.");
    if (duplicateTournamentPlayers(draft).size) return setError("Ein Kind ist doppelt zugeteilt.");
    await onSave(draft.map((squad) => ({ ...squad, name: squad.name.trim() })));
  }

  return <section className="squad-board">
    <header className="squad-board-heading"><div className="squad-board-heading-intro"><span className="team-planning-mascot" aria-hidden="true" /><div><span className="eyebrow">MANNSCHAFTEN ZUSAMMENSTELLEN</span><h1>{event.title}</h1><p>{playerList.length} gemeldete Kinder · {draft.length} {draft.length === 1 ? "Mannschaft" : "Mannschaften"}</p></div></div><button type="button" onClick={addSquad}><Plus /> Mannschaft</button></header>

    <div className="squad-board-teams">{draft.map((squad, index) => {
      const validation = validateTournamentSquad(squad, playerAgeGroups, { minFYouth: settings.tournamentMinFYouth, maxTeamSize: settings.tournamentMaxTeamSize, trainerRequired: settings.tournamentTrainerRequired });
      return <article className="squad-board-team" key={squad.id}><span className="squad-board-number">{index + 1}</span><label><small>Name</small><input maxLength={80} value={squad.name} onChange={(changeEvent) => updateSquad(squad.id, { name: changeEvent.target.value })} /></label><label><small>Trainer</small><select value={squad.trainerId ?? ""} onChange={(changeEvent) => updateSquad(squad.id, { trainerId: changeEvent.target.value || null })}><option value="">Noch nicht festgelegt</option>{trainerList.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></label><span className="squad-board-team-count"><strong>{squad.playerIds.length}</strong><small>Kinder</small></span><button type="button" className="squad-board-remove" onClick={() => removeSquad(squad.id)} aria-label={`${squad.name} entfernen`}><Trash2 /></button><div className="squad-board-team-state"><span className={validation.minimumMet ? "ok" : "warning"}>{validation.minimumMet ? <Check /> : <AlertTriangle />}{validation.fYouthCount} F-Jugend</span><span className={validation.trainerMissing ? "warning" : "ok"}>{validation.trainerMissing ? <AlertTriangle /> : <UserRoundCheck />}{validation.trainerMissing ? "Trainer offen" : "Trainer bereit"}</span></div></article>;
    })}</div>

    <section className="squad-assignment"><header><div><span className="eyebrow">SPIELER VERTEILEN</span><h2>{assignedIds.size} von {playerList.length} zugeteilt</h2></div>{playerList.length > 6 && <label><Search /><input value={query} onChange={(changeEvent) => setQuery(changeEvent.target.value)} placeholder="Spieler suchen …" /></label>}</header><div className="squad-assignment-list">{visiblePlayers.map((player) => {
      const assignedIndex = draft.findIndex((squad) => squad.playerIds.includes(player.id));
      return <article key={player.id} className={assignedIndex >= 0 ? "assigned" : ""}><Avatar user={player} size="small" /><span><strong>{player.name}</strong><small>{player.ageGroup || "Spieler"} · angemeldet</small></span><div className="squad-targets" aria-label={`Mannschaft für ${player.name}`}>{draft.map((squad, index) => <button type="button" className={assignedIndex === index ? "active" : ""} aria-pressed={assignedIndex === index} title={squad.name} key={squad.id} onClick={() => assignPlayer(player.id, squad.id)}>{index + 1}</button>)}<button type="button" className={assignedIndex < 0 ? "active unassigned" : "unassigned"} aria-pressed={assignedIndex < 0} title="Nicht zugeteilt" onClick={() => assignPlayer(player.id, null)}>–</button></div></article>;
    })}{visiblePlayers.length === 0 && <div className="squad-assignment-empty">{playerList.length ? "Keine Spieler gefunden." : "Noch kein Spieler hat für dieses Turnier zugesagt."}</div>}</div></section>

    {error && <div className="matchday-error"><AlertTriangle /> {error}</div>}
    <footer className="squad-board-actions"><span><strong>{assignedIds.size}/{playerList.length}</strong><small>Kinder verteilt</small></span>{squads.length > 0 && <button type="button" className="squad-board-publish" disabled={busy} onClick={() => void onPublicationChange(!published)}>{published ? <EyeOff /> : <Eye />}{published ? "Freigabe zurücknehmen" : "Für Spieler freigeben"}</button>}<button type="button" className="primary" disabled={busy} onClick={() => void save()}><Check /> {busy ? "Speichert …" : "Planung speichern"}</button></footer>
  </section>;
}

function PlayerTournamentTeams({ tournaments, plans, users, currentUser }: { tournaments: ClubEvent[]; plans: TournamentPlan[]; users: ClubUser[]; currentUser: ClubUser }) {
  const releasedEventIds = new Set(plans.filter((plan) => plan.publishedAt).map((plan) => plan.eventId));
  const upcoming = tournaments.filter((event) => event.date >= today() && releasedEventIds.has(event.id));
  const highlightedIds = new Set([currentUser.id, ...(currentUser.managedPlayerIds ?? [])]);
  return <section className="tournament-page module-page player-tournament-page"><div className="module-hero"><div><span className="eyebrow">MEINE TURNIERE</span><h1>Deine Mannschaft</h1><p>Hier siehst du freigegebene Mannschaften, Mitspieler und den zuständigen Trainer.</p></div></div><div className="player-team-list">{upcoming.map((event) => { const squad = plans.find((plan) => plan.eventId === event.id)?.squads[0]; const trainer = users.find((user) => user.id === squad?.trainerId); const squadPlayers = squad?.playerIds.map((id) => users.find((user) => user.id === id)).filter((player): player is ClubUser => Boolean(player)) ?? []; return <article key={event.id}><span className="event-icon tournament"><Trophy /></span><div><small>{eventDate(event.date)}</small><h2>{event.title}</h2>{squad ? <><div className="player-assignment"><span><Users /><small>Mannschaft</small><strong>{squad.name}</strong></span><span><UserRoundCheck /><small>Trainer</small><strong>{trainer?.name ?? "Wird noch bekannt gegeben"}</strong></span></div><section className="released-squad-roster"><header><span>KADER</span><strong>{squadPlayers.length} Spieler</strong></header><ul>{squadPlayers.map((player) => <li className={highlightedIds.has(player.id) ? "is-current" : ""} key={player.id}><Avatar user={player} size="small" /><span><strong>{player.name}</strong><small>{highlightedIds.has(player.id) ? "Dein Platz im Team" : player.position}</small></span>{player.number != null && <em>#{player.number}</em>}</li>)}</ul></section></> : <p>Du wurdest noch keiner Mannschaft zugewiesen.</p>}</div></article>; })}{!upcoming.length && <section className="tournament-empty"><CalendarDays /><h2>Noch keine Mannschaft freigegeben</h2><p>Sobald ein Trainer die Turnierplanung veröffentlicht, erscheint deine Zuordnung hier.</p></section>}</div></section>;
}
