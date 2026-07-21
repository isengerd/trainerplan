"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BookmarkPlus, Boxes, CalendarDays, Check, ChevronRight, CircleGauge, Clock3, Dumbbell, Edit3,
  Home, Library, LogOut, Menu, MoreVertical, Pause, Play, Plus, Settings, Share2, Shield,
  Sparkles, Target, Trash2, Users, X,
} from "lucide-react";
import { library, materialCatalog, type Exercise, type MaterialId } from "@/data/demo";
import { initialSettings, type ClubEvent, type ClubInvitation, type ClubSettings, type ClubUser, type SmtpStatus, type TeamGroup } from "@/data/club";
import { Pitch } from "./Pitch";
import { Avatar, CalendarPage, LoginScreen, ProfilePage, TeamPage } from "./ClubModules";
import { AdminSettingsPage } from "./AdminSettings";
import { ExerciseCreator } from "./ExerciseCreator";
import { ExerciseLibrary } from "./ExerciseBrowser";
import { TrainingTemplates, type TrainingTemplate } from "./TrainingTemplates";

function localToday() {
  const parts = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(value("year"), value("month") - 1, value("day"), 12);
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = localToday();
const todayKey = isoDate(today);
const calendarStart = new Date(today);
calendarStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
const weekdayPresets = [
  { label: "Frei", theme: "Noch kein Training", time: "17:00" },
  { label: "Technik", theme: "Ballgefühl & Dribbling", time: "17:00" },
  { label: "Spielfreude", theme: "Dribbeln, Tore, Spielen", time: "17:00" },
  { label: "Frei", theme: "Noch kein Training", time: "17:00" },
  { label: "Tore", theme: "Torschuss & kleine Spiele", time: "16:30" },
  { label: "Festival", theme: "Kinderfußball-Festival", time: "10:00" },
  { label: "Frei", theme: "Noch kein Training", time: "10:00" },
];
const days = Array.from({ length: 112 }, (_, index) => {
  const value = new Date(calendarStart);
  value.setDate(calendarStart.getDate() + index);
  const preset = weekdayPresets[index % 7];
  return {
    key: isoDate(value),
    short: new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(value).replace(".", "").toUpperCase(),
    date: String(value.getDate()),
    month: new Intl.DateTimeFormat("de-DE", { month: "short" }).format(value).replace(".", "").toUpperCase(),
    full: new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(value),
    ...preset,
  };
});
const todayIndex = days.findIndex((day) => day.key === todayKey);
const initialPlanKey = todayKey;

const phases: Exercise["category"][] = ["Ankommen", "Einstieg", "Hauptteil", "Abschlussspiel"];

const exerciseById = new Map(library.map((exercise) => [exercise.id, exercise]));
const templateExercises = (ids: string[]) => ids.map((id) => exerciseById.get(id)).filter((exercise): exercise is Exercise => Boolean(exercise));
const featuredTemplates: TrainingTemplate[] = [
  { id: "featured-dribbling", name: "Ballgefühl & Dribbling", kind: "plan", focus: ["Ballgefühl", "Dribbling", "Orientierung"], exercises: templateExercises(["dribbling-zoo", "hütchen-schatz", "one-v-one", "vier-tore"]), builtIn: true },
  { id: "featured-tore", name: "Mutig zum Tor", kind: "plan", focus: ["Torschuss", "Mut", "1 gegen 1"], exercises: templateExercises(["krokodiljagd", "torschuss-duell", "one-v-one", "drei-gegen-drei-wechsel"]), builtIn: true },
  { id: "featured-spielfreude", name: "Spielfreude & Teamwork", kind: "plan", focus: ["Teamwork", "Freilaufen", "Freies Spiel"], exercises: templateExercises(["brueckenfangen", "bewegungs-parcours", "funino", "fuenf-gegen-fuenf"]), builtIn: true },
];

type PlanMeta = { name: string; focus: string[] };
type BootstrapData = {
  currentUser: ClubUser;
  users: ClubUser[];
  events: ClubEvent[];
  exercises: Exercise[];
  settings: ClubSettings;
  plans: Record<string, Exercise[]>;
  templates: TrainingTemplate[];
  planMeta: Record<string, PlanMeta>;
  groups: TeamGroup[];
  invitations: ClubInvitation[];
  smtp: SmtpStatus;
};

function youtubeEmbed(url?: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1) : parsed.searchParams.get("v") ?? parsed.pathname.split("/").pop();
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}

export function TrainerApp() {
  const [view, setView] = useState<"overview" | "plan" | "exercises" | "calendar" | "team" | "profile" | "settings">("overview");
  const [selectedDay, setSelectedDay] = useState(initialPlanKey);
  const [targetPhase, setTargetPhase] = useState<Exercise["category"]>("Einstieg");
  const [plans, setPlans] = useState<Record<string, Exercise[]>>({});
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [animation, setAnimation] = useState(true);
  const [planSaveState, setPlanSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [users, setUsers] = useState<ClubUser[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>(library);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [clubSettings, setClubSettings] = useState<ClubSettings>(initialSettings);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [invitations, setInvitations] = useState<ClubInvitation[]>([]);
  const [smtp, setSmtp] = useState<SmtpStatus>({ configured: false });
  const [trainingTemplates, setTrainingTemplates] = useState<TrainingTemplate[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateMode, setTemplateMode] = useState<"browse" | "save">("browse");
  const [planMeta, setPlanMeta] = useState<Record<string, PlanMeta>>({});
  const [toastMessage, setToastMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const planDataReady = useRef(false);
  const lastPersistedPlan = useRef("");
  const latestPlanSnapshot = useRef("");
  const autoSaveChain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => { void loadBootstrap(); }, []);

  useEffect(() => {
    const theme = clubSettings.theme ?? "light";
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem("trainerplan-theme", theme); } catch { /* Die serverseitige Einstellung bleibt maßgeblich. */ }
  }, [clubSettings.theme]);

  useEffect(() => {
    if (!planDataReady.current || !currentUserId) return;
    const payload = { plans, planMeta };
    const serialized = JSON.stringify(payload);
    latestPlanSnapshot.current = serialized;
    if (serialized === lastPersistedPlan.current) return;
    setPlanSaveState("saving");
    const timer = window.setTimeout(() => {
      autoSaveChain.current = autoSaveChain.current.then(async () => {
        const didSave = await syncResource("plans", payload);
        if (!didSave) {
          setPlanSaveState("error");
          return;
        }
        lastPersistedPlan.current = serialized;
        if (latestPlanSnapshot.current === serialized) setPlanSaveState("saved");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [plans, planMeta, currentUserId]);

  useEffect(() => {
    if (view !== "plan") return;
    const frame = window.requestAnimationFrame(() => scrollToDay(selectedDay, "auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  useEffect(() => { setMobileMenuOpen(false); }, [view]);

  const currentUser = users.find((user) => user.id === currentUserId) ?? null;
  const profileUser = users.find((user) => user.id === (profileUserId ?? currentUserId)) ?? currentUser;
  const canManageClub = currentUser?.role === "admin" || currentUser?.role === "trainer";
  const currentDay = days.find((day) => day.key === selectedDay) ?? days[todayIndex];

  function applyBootstrap(data: BootstrapData) {
    lastPersistedPlan.current = JSON.stringify({ plans: data.plans, planMeta: data.planMeta });
    planDataReady.current = true;
    setUsers(data.users);
    setEvents(data.events);
    setCurrentUserId(data.currentUser.id);
    setExerciseLibrary(data.exercises);
    setClubSettings({ ...initialSettings, ...data.settings });
    setPlans(data.plans);
    setTrainingTemplates(data.templates);
    setPlanMeta(data.planMeta);
    setGroups(data.groups);
    setInvitations(data.invitations);
    setSmtp(data.smtp);
  }

  async function loadBootstrap() {
    try {
      const response = await fetch("/api/v1/bootstrap", { credentials: "include", cache: "no-store" });
      if (response.ok) applyBootstrap(await response.json() as BootstrapData);
      else setCurrentUserId(null);
    } catch {
      setCurrentUserId(null);
    } finally {
      setAuthReady(true);
    }
  }

  async function login(email: string, password: string) {
    try {
      const response = await fetch("/api/v1/auth/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) return result.error ?? "Anmeldung fehlgeschlagen.";
      await loadBootstrap();
      return null;
    } catch {
      return "Der Server ist gerade nicht erreichbar.";
    }
  }

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setCurrentUserId(null);
    planDataReady.current = false;
    setUsers([]);
  }

  async function syncResource(resource: "users" | "events" | "exercises" | "settings" | "plans" | "templates", data: unknown) {
    try {
      const response = await fetch("/api/v1/state", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, data }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Speichern fehlgeschlagen.");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
      return false;
    }
  }

  function updateUsers(next: ClubUser[]) { setUsers(next); void syncResource("users", next); }
  function updateEvents(next: ClubEvent[]) { setEvents(next); void syncResource("events", next); }
  function updateUser(nextUser: ClubUser) { updateUsers(users.map((user) => user.id === nextUser.id ? nextUser : user)); }
  function updateSettings(next: ClubSettings) { setClubSettings(next); void syncResource("settings", next); }

  async function changePassword(currentPassword: string, newPassword: string) {
    try {
      const response = await fetch("/api/v1/auth/password", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const result = await response.json() as { error?: string };
      return response.ok ? null : result.error ?? "Passwort konnte nicht geändert werden.";
    } catch {
      return "Der Server ist gerade nicht erreichbar.";
    }
  }

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2600);
  }

  function cloneExercises(items: Exercise[], source: string) {
    const stamp = Date.now();
    return items.map((exercise, index) => ({ ...exercise, id: `${exercise.id}-${source}-${stamp}-${index}` }));
  }

  function persistTemplates(next: TrainingTemplate[]) {
    setTrainingTemplates(next);
    void syncResource("templates", next);
  }

  function saveTrainingTemplate(template: TrainingTemplate) {
    persistTemplates([...trainingTemplates, template]);
    setTemplateOpen(false);
    showToast(template.kind === "plan" ? "Komplette Planvorlage gespeichert" : `${template.phase} dauerhaft als Vorlage gespeichert`);
  }

  function deleteTrainingTemplate(id: string) {
    persistTemplates(trainingTemplates.filter((template) => template.id !== id));
  }

  function applyTrainingTemplate(template: TrainingTemplate) {
    const inserted = cloneExercises(template.exercises, "template");
    setPlans((current) => {
      const currentPlan = current[selectedDay] ?? [];
      if (template.kind === "plan") return { ...current, [selectedDay]: inserted };
      const phase = template.phase!;
      const merged = [...currentPlan.filter((exercise) => exercise.category !== phase), ...inserted]
        .sort((a, b) => phases.indexOf(a.category) - phases.indexOf(b.category));
      return { ...current, [selectedDay]: merged };
    });
    setPlanMeta((current) => ({
      ...current,
      [selectedDay]: template.kind === "plan"
        ? { name: template.name, focus: template.focus }
        : { name: current[selectedDay]?.name ?? currentDay.theme, focus: Array.from(new Set([...(current[selectedDay]?.focus ?? []), ...template.focus])).slice(0, 4) },
    }));
    setTemplateOpen(false);
    showToast(template.kind === "plan" ? `„${template.name}“ ausgewählt` : `${template.phase} eingesetzt – übriger Plan bleibt erhalten`);
  }

  function toggleDefaultPhase(id: string) {
    const selected = trainingTemplates.find((template) => template.id === id);
    if (!selected || selected.kind !== "phase") return;
    const willEnable = !selected.autoApply;
    const next = trainingTemplates.map((template) => template.id === id
      ? { ...template, autoApply: willEnable }
      : willEnable && template.kind === "phase" && template.phase === selected.phase ? { ...template, autoApply: false } : template);
    persistTemplates(next);
    if (willEnable && !(plans[selectedDay] ?? []).some((exercise) => exercise.category === selected.phase)) {
      setPlans((current) => ({ ...current, [selectedDay]: [...(current[selectedDay] ?? []), ...cloneExercises(selected.exercises, "default")].sort((a, b) => phases.indexOf(a.category) - phases.indexOf(b.category)) }));
    }
    showToast(willEnable ? `${selected.phase} wird in neuen Plänen automatisch eingesetzt` : `${selected.phase} ist nicht mehr als Standard gesetzt`);
  }

  function scrollToDay(key: string, behavior: ScrollBehavior = "smooth") {
    calendarRef.current?.querySelector<HTMLElement>(`[data-day="${key}"]`)?.scrollIntoView({ behavior, inline: "center", block: "nearest" });
  }

  function selectDay(key: string) {
    setSelectedDay(key);
    const defaults = trainingTemplates.filter((template) => template.kind === "phase" && template.autoApply);
    if (!defaults.length) return;
    setPlans((current) => {
      let dayPlan = [...(current[key] ?? [])];
      defaults.forEach((template) => {
        if (!dayPlan.some((exercise) => exercise.category === template.phase)) dayPlan.push(...cloneExercises(template.exercises, "default"));
      });
      return { ...current, [key]: dayPlan.sort((a, b) => phases.indexOf(a.category) - phases.indexOf(b.category)) };
    });
  }

  function goToToday() {
    selectDay(todayKey);
    window.setTimeout(() => scrollToDay(todayKey), 0);
  }

  function mobileNavigate(nextView: typeof view) {
    setMobileMenuOpen(false);
    setView(nextView);
  }

  function mobileBack() {
    if (mobileMenuOpen) return setMobileMenuOpen(false);
    if (libraryOpen) return setLibraryOpen(false);
    if (view === "profile" && profileUserId && profileUserId !== currentUserId) return setView("team");
    if (view !== "overview") setView("overview");
  }

  const plan = plans[selectedDay] ?? [];

  const total = plan.reduce((sum, item) => sum + item.duration, 0);
  const currentPlanMeta = planMeta[selectedDay] ?? { name: currentDay.theme, focus: [] };
  const requiredMaterials = useMemo(() => {
    const required = new Map<MaterialId, number>();
    plan.forEach((exercise) => exercise.materials.forEach((material) => {
      required.set(material.id, Math.max(required.get(material.id) ?? 0, material.count));
    }));
    return Array.from(required.entries()).map(([id, count]) => ({ id, count, ...materialCatalog[id] }));
  }, [plan]);

  function addExercise(item: Exercise, phase: Exercise["category"] = targetPhase) {
    if (!canManageClub) return;
    setPlans((current) => ({ ...current, [selectedDay]: [...(current[selectedDay] ?? []), { ...item, category: phase, id: `${item.id}-${Date.now()}` }] }));
    setLibraryOpen(false);
  }

  function removeExercise(id: string) {
    setPlans((current) => ({ ...current, [selectedDay]: (current[selectedDay] ?? []).filter((item) => item.id !== id) }));
  }

  function changeExercisePhase(id: string, category: Exercise["category"]) {
    setPlans((current) => ({ ...current, [selectedDay]: (current[selectedDay] ?? []).map((item) => item.id === id ? { ...item, category } : item) }));
  }

  function saveExercise(item: Exercise) {
    const exists = exerciseLibrary.some((exercise) => exercise.id === item.id);
    const nextLibrary = exists ? exerciseLibrary.map((exercise) => exercise.id === item.id ? item : exercise) : [...exerciseLibrary, item];
    setExerciseLibrary(nextLibrary);
    setPlans((current) => Object.fromEntries(Object.entries(current).map(([day, dayPlan]) => [day, dayPlan.map((planned) => planned.id === item.id || planned.id.startsWith(`${item.id}-`) ? { ...item, id: planned.id, category: planned.category } : planned)])));
    void syncResource("exercises", nextLibrary);
    setCreatorOpen(false);
    setEditingExercise(null);
  }

  function deleteLibraryExercise(item: Exercise) {
    if (!canManageClub || !window.confirm(`„${item.title}“ wirklich aus der Übungsbibliothek löschen? Bereits geplante Trainings bleiben unverändert.`)) return;
    const nextLibrary = exerciseLibrary.filter((exercise) => exercise.id !== item.id);
    setExerciseLibrary(nextLibrary);
    void syncResource("exercises", nextLibrary);
    showToast(`${item.title} wurde gelöscht`);
  }

  async function retryPlanSave() {
    const payload = { plans, planMeta };
    const serialized = JSON.stringify(payload);
    setPlanSaveState("saving");
    const didSave = await syncResource("plans", payload);
    if (didSave) {
      lastPersistedPlan.current = serialized;
      latestPlanSnapshot.current = serialized;
      setPlanSaveState("saved");
    } else setPlanSaveState("error");
  }

  const exerciseDatabase = (
    <ExerciseLibrary
      mode="manage"
      exercises={exerciseLibrary}
      canManage={Boolean(canManageClub)}
      onDetail={setDetail}
      onEdit={(item) => { setEditingExercise(item); setCreatorOpen(true); }}
      onDelete={deleteLibraryExercise}
      onAdd={(item) => addExercise(item, item.category)}
      onCreate={() => { setEditingExercise(null); setCreatorOpen(true); }}
    />
  );

  const plannedDays = days.map((day) => ({ day, exercises: plans[day.key] ?? [] })).filter((entry) => entry.exercises.length > 0);
  const currentWeekDays = days.slice(0, 7);
  const nextPlannedDay = plannedDays.find((entry) => entry.day.key >= todayKey) ?? plannedDays[0] ?? { day: days[todayIndex], exercises: [] };
  const overview = (
    <section className="overview-page">
      <div className="overview-welcome">
        <div><span className="eyebrow">GUTEN TAG, COACH</span><h1>Bereit für die nächste Einheit?</h1><p>Plane abwechslungsreiche F‑Jugend-Trainings mit viel Spielzeit und Ballaktionen.</p></div>
        {canManageClub && <button className="primary" onClick={() => { goToToday(); setView("plan"); }}><Plus /> Training planen</button>}
      </div>
      <div className="overview-stats">
        <article><span className="stat-icon green"><CalendarDays /></span><span><small>GEPLANTE EINHEITEN</small><strong>{plannedDays.length}</strong><p>im Planungszeitraum</p></span></article>
        <article><span className="stat-icon blue"><Clock3 /></span><span><small>TRAININGSZEIT</small><strong>{plannedDays.reduce((sum, entry) => sum + entry.exercises.reduce((duration, item) => duration + item.duration, 0), 0)} Min</strong><p>für deine F‑Jugend</p></span></article>
        <article><span className="stat-icon yellow"><Library /></span><span><small>ÜBUNGSDATENBANK</small><strong>{exerciseLibrary.length}</strong><p>altersgerechte Übungen</p></span></article>
      </div>
      <div className="overview-grid">
        <section className="overview-card next-session">
          <div className="overview-card-title"><div><span className="eyebrow">NÄCHSTES TRAINING</span><h2>{nextPlannedDay.day.short} · {nextPlannedDay.day.time} Uhr</h2></div><button onClick={() => { selectDay(nextPlannedDay.day.key); setView("plan"); }}>Plan öffnen <ChevronRight /></button></div>
          <div className="next-session-main"><div className="date-tile"><strong>{nextPlannedDay.day.date}</strong><span>{nextPlannedDay.day.month}</span></div><div><span className="session-status"><i /> GEPLANT & GESPEICHERT</span><h3>{planMeta[nextPlannedDay.day.key]?.name ?? nextPlannedDay.day.theme}</h3><p>Sportplatz Nord · {nextPlannedDay.exercises.length} Übungen · {nextPlannedDay.exercises.reduce((sum, item) => sum + item.duration, 0)} Minuten</p></div></div>
          <div className="session-exercises">{nextPlannedDay.exercises.slice(0, 4).map((item) => <button key={item.id} onClick={() => setDetail(item)}><Pitch variant={item.variant} /><span>{item.title}</span></button>)}</div>
        </section>
        <section className="overview-card week-plans">
          <div className="overview-card-title"><div><span className="eyebrow">DIESE WOCHE</span><h2>Trainingspläne</h2></div></div>
          {currentWeekDays.map((day) => {
            const dayPlan = plans[day.key] ?? [];
            const dayTotal = dayPlan.reduce((sum, item) => sum + item.duration, 0);
            return <button className="week-plan-row" key={day.key} onClick={() => { selectDay(day.key); setView("plan"); }}><span className={dayPlan.length ? "has-plan" : ""}>{day.short}<strong>{day.date}</strong></span><span><strong>{dayPlan.length ? planMeta[day.key]?.name ?? day.theme : "Training anlegen"}</strong><small>{dayPlan.length ? `${dayPlan.length} Übungen · ${dayTotal} Min` : "Noch nicht geplant"}</small></span><ChevronRight /></button>;
          })}
        </section>
      </div>
      <section className="overview-card quick-library"><div className="overview-card-title"><div><span className="eyebrow">EMPFOHLEN FÜR U8/U9</span><h2>Beliebte Übungen</h2></div><button onClick={() => setView("exercises")}>Alle Übungen <ChevronRight /></button></div><div>{exerciseLibrary.slice(4, 8).map((item) => <article key={item.id}><button onClick={() => setDetail(item)}><Pitch variant={item.variant} /></button><span><small>in jeder Phase</small><strong>{item.title}</strong><p>{item.duration} Min · {item.ageRange}</p></span>{canManageClub && <button className="quick-add" onClick={() => addExercise(item)}><Plus /></button>}</article>)}</div></section>
    </section>
  );

  if (!authReady) return <main className="login-page"><section className="login-panel"><div className="login-loading"><span className="brand-mark"><Shield /></span><strong>Trainerplan wird geladen …</strong></div></section></main>;
  if (!currentUser) return <LoginScreen onLogin={login} />;

  const viewTitle = view === "overview" ? "Übersicht" : view === "plan" ? "Trainingsplan" : view === "exercises" ? "Übungen" : view === "calendar" ? "Kalender" : view === "team" ? "Mannschaft" : view === "settings" ? "Einstellungen" : "Profil";
  const moduleContent = view === "calendar"
    ? <CalendarPage events={events} users={users} settings={clubSettings} currentUser={currentUser} onEventsChange={updateEvents} />
    : view === "team"
      ? (clubSettings.teamFeatureEnabled || currentUser.role === "admin" ? <TeamPage users={users} currentUser={currentUser} onUsersChange={updateUsers} onProfile={(user) => { setProfileUserId(user.id); setView("profile"); }} onInvite={() => setView("settings")} /> : overview)
      : view === "profile" && profileUser
        ? <ProfilePage user={profileUser} editable={profileUser.id === currentUser.id || currentUser.role === "admin"} canChangePassword={profileUser.id === currentUser.id} onSave={updateUser} onChangePassword={changePassword} onBack={profileUser.id !== currentUser.id ? () => setView("team") : undefined} />
        : view === "settings" && currentUser.role === "admin"
          ? <AdminSettingsPage settings={clubSettings} users={users} groups={groups} invitations={invitations} smtp={smtp} onSave={updateSettings} onUsersChange={updateUsers} onReload={() => void loadBootstrap()} />
          : null;

  return (
    <main className="app-shell">
      <aside className="main-nav">
        <div className="brand"><span className="brand-mark"><Shield /></span><span><strong>TRAINER</strong>PLAN</span></div>
        <span className="nav-label">MENÜ</span>
        <nav>
          <a className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}><Home /> Übersicht</a>
          <a className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}><CalendarDays /> Kalender</a>
          <a className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}><CalendarDays /> Trainingsplan</a>
          <a className={view === "exercises" ? "active" : ""} onClick={() => setView("exercises")}><Library /> Übungen</a>
          {(clubSettings.teamFeatureEnabled || currentUser.role === "admin") && <a className={view === "team" ? "active" : ""} onClick={() => setView("team")}><Dumbbell /> Mannschaft</a>}
          {currentUser.role === "admin" && <a className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}><Settings /> Einstellungen</a>}
        </nav>
        <div className="account-card" onClick={() => { setProfileUserId(currentUser.id); setView("profile"); }}><Avatar user={currentUser} size="small" /><span><strong>{currentUser.name}</strong><small>{currentUser.role === "admin" ? "Admin" : currentUser.role === "trainer" ? "Trainer" : "Spieler"}</small></span><button onClick={(event) => { event.stopPropagation(); logout(); }} aria-label="Abmelden"><LogOut /></button></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">FC KICKER · F-JUGEND</span><h1>{viewTitle}</h1><p>{view === "plan" ? `${days[0].full} – ${days[days.length - 1].full}` : view === "calendar" ? "Termine und Verfügbarkeiten" : "Dein Team auf einen Blick"}</p></div>
          <div className="top-actions">
            {view === "plan" && canManageClub && <><button className="ghost"><Share2 /> <span>Teilen</span></button><button className={`auto-save-status ${planSaveState}`} onClick={planSaveState === "error" ? retryPlanSave : undefined} disabled={planSaveState !== "error"}><Check /><span>{planSaveState === "saving" ? "Wird gespeichert …" : planSaveState === "error" ? "Erneut versuchen" : "Automatisch gespeichert"}</span></button></>}
            <button className="avatar top-avatar" onClick={() => { setProfileUserId(currentUser.id); setView("profile"); }}><Avatar user={currentUser} size="small" /></button>
          </div>
        </header>

        <div className="mobile-head">
          <button className="icon-button" onClick={mobileBack} aria-label={view === "overview" ? "Zur Übersicht" : "Zurück zur Übersicht"}><ArrowLeft /></button>
          <div><span>{view === "plan" ? `${currentDay.month} ${currentDay.key.slice(0, 4)}` : "F-JUGEND"}</span><strong>{viewTitle}</strong></div>
          <button className="icon-button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"} aria-expanded={mobileMenuOpen}><Menu /></button>
        </div>

        {mobileMenuOpen && <div className="mobile-menu-backdrop" onMouseDown={() => setMobileMenuOpen(false)}><nav className="mobile-menu-sheet" aria-label="Mobile Hauptnavigation" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><span className="eyebrow">FC KICKER · F-JUGEND</span><strong>Navigation</strong></div><button onClick={() => setMobileMenuOpen(false)} aria-label="Menü schließen"><X /></button></header>
          <div>
            <button className={view === "overview" ? "active" : ""} onClick={() => mobileNavigate("overview")}><Home /><span><strong>Übersicht</strong><small>Dashboard und nächste Termine</small></span><ChevronRight /></button>
            <button className={view === "calendar" ? "active" : ""} onClick={() => mobileNavigate("calendar")}><CalendarDays /><span><strong>Kalender</strong><small>Training, Turniere und Ereignisse</small></span><ChevronRight /></button>
            <button className={view === "plan" ? "active" : ""} onClick={() => mobileNavigate("plan")}><CalendarDays /><span><strong>Trainingsplan</strong><small>Einheiten planen und bearbeiten</small></span><ChevronRight /></button>
            <button className={view === "exercises" ? "active" : ""} onClick={() => mobileNavigate("exercises")}><Library /><span><strong>Übungen</strong><small>Übungsbibliothek durchsuchen</small></span><ChevronRight /></button>
            {(clubSettings.teamFeatureEnabled || currentUser.role === "admin") && <button className={view === "team" ? "active" : ""} onClick={() => mobileNavigate("team")}><Users /><span><strong>Mannschaft</strong><small>Kader und Rollen verwalten</small></span><ChevronRight /></button>}
            {currentUser.role === "admin" && <button className={view === "settings" ? "active" : ""} onClick={() => mobileNavigate("settings")}><Settings /><span><strong>Einstellungen</strong><small>Verein, Rechte und Einladungen</small></span><ChevronRight /></button>}
            <button className={view === "profile" ? "active" : ""} onClick={() => { setProfileUserId(currentUser.id); mobileNavigate("profile"); }}><MoreVertical /><span><strong>Mein Profil</strong><small>Profil und Passwort</small></span><ChevronRight /></button>
          </div>
          <button className="mobile-menu-logout" onClick={() => { setMobileMenuOpen(false); void logout(); }}><LogOut /> Abmelden</button>
        </nav></div>}

        {view === "plan" && <><div className="date-strip-row">
          <div className="week-strip" ref={calendarRef} aria-label="Trainingstage – horizontal nach rechts scrollen">
            {days.map((day) => (
              <button data-day={day.key} key={day.key} className={`${selectedDay === day.key ? "selected" : ""} ${day.key === todayKey ? "today" : ""}`} onClick={() => selectDay(day.key)}>
                <span>{day.short}</span><strong>{day.date}</strong><em>{day.month}</em><small>{day.label}</small>
                {(plans[day.key]?.length ?? 0) > 0 && <i />}
              </button>
            ))}
          </div>
          <button className="today-button" onClick={goToToday} aria-label="Zum aktuellen Datum springen"><CalendarDays /><span>Heute</span></button>
        </div>

        <div className="mobile-summary">
          <div><span className="status-dot" /><span><small>AUSGEWÄHLTER TAG</small><strong>{currentDay.full} · {currentDay.time} Uhr</strong></span></div>
          <span>{total} Min</span>
        </div></>}

        {moduleContent ?? (view === "overview" ? overview : view === "plan" ? <div className="content-grid plan-only-layout">
          <section className="plan-panel card">
            {canManageClub && <div className="plan-template-tools">
              <button onClick={() => { setTemplateMode("browse"); setTemplateOpen(true); }}><Sparkles /> <span><strong>Vorlage wählen</strong><small>Schwerpunkt oder Standardphase</small></span></button>
              <button onClick={() => { setTemplateMode("save"); setTemplateOpen(true); }}><BookmarkPlus /> <span><strong>Als Vorlage sichern</strong><small>Komplett oder einzelne Phase</small></span></button>
              <div className={`mobile-plan-save auto-save-info ${planSaveState}`}><Check /> <span><strong>{planSaveState === "saving" ? "Wird gespeichert …" : planSaveState === "error" ? "Speichern fehlgeschlagen" : "Automatisch gespeichert"}</strong><small>{planSaveState === "error" ? "Antippen zum Wiederholen" : "Jede Änderung bleibt dauerhaft erhalten"}</small></span>{planSaveState === "error" && <button onClick={retryPlanSave}>Erneut</button>}</div>
            </div>}
            <div className="plan-heading">
              <div><span className="eyebrow">{currentDay.time} UHR · DAUER {total} MIN</span><h2>{currentPlanMeta.name}</h2><p>{currentDay.full} · Sportplatz Nord</p>{currentPlanMeta.focus.length > 0 && <div className="plan-focus-tags">{currentPlanMeta.focus.map((focus) => <span key={focus}><Target />{focus}</span>)}</div>}</div>
              <div className="plan-duration"><Clock3 /><span><strong>{total}</strong> Min</span></div>
            </div>

            <div className="phase-schedule">
              {phases.map((phase) => {
                const phaseExercises = plan.filter((item) => item.category === phase);
                const phaseDuration = phaseExercises.reduce((sum, item) => sum + item.duration, 0);
                return <section className="phase-block" key={phase}>
                  <header><div><span>{phase}</span><small>{phaseExercises.length} Übungen · {phaseDuration} Min</small></div>{canManageClub && <button onClick={() => { setTargetPhase(phase); setLibraryOpen(true); }}><Plus /> Übung</button>}</header>
                  <div className="timeline">
                    {phaseExercises.map((item) => {
                      const index = plan.findIndex((planned) => planned.id === item.id);
                      return <article className="exercise" key={item.id} style={{ "--accent": item.accent } as React.CSSProperties}>
                        <div className="stage"><i /><span>{String(index + 1).padStart(2, "0")}</span><select className="phase-select" value={item.category} onChange={(event) => changeExercisePhase(item.id, event.target.value as Exercise["category"])}>{phases.map((option) => <option key={option}>{option}</option>)}</select></div>
                        <button className="exercise-preview" onClick={() => setDetail(item)} aria-label={`${item.title} öffnen`}><Pitch variant={item.variant} /></button>
                        <button className="exercise-copy" onClick={() => setDetail(item)}><span className="mobile-stage">{item.category} · Phase änderbar</span><h3>{item.title}</h3><p>{item.description}</p><small><Users /> {item.players}<Clock3 /> {item.duration} Min <CircleGauge /> {item.intensity}</small></button>
                        {canManageClub && <button className="remove-button" onClick={() => removeExercise(item.id)} aria-label={`${item.title} entfernen`}><Trash2 /></button>}
                      </article>;
                    })}
                    {!phaseExercises.length && canManageClub && <button className="phase-dropzone" onClick={() => { setTargetPhase(phase); setLibraryOpen(true); }}><Plus /> Übung für {phase === "Abschlussspiel" ? "Abschluss" : phase} hinzufügen</button>}
                    {!phaseExercises.length && !canManageClub && <p className="phase-empty-readonly">Noch keine Übung eingeplant.</p>}
                  </div>
                </section>;
              })}
            </div>
            <section className="mobile-material-list">
              <div><span className="eyebrow">AUTOMATISCH BERECHNET</span><h2>Material für diese Einheit</h2></div>
              {requiredMaterials.map((material) => <div className="material" key={material.id}><span>{material.name}</span><strong>{material.count} <small>{material.unit}</small></strong></div>)}
              {!requiredMaterials.length && <p className="no-material">Noch kein Material benötigt.</p>}
            </section>
          </section>

        </div> : exerciseDatabase)}

        <nav className="bottom-nav">
          <button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}><Home /><span>Übersicht</span></button>
          <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}><CalendarDays /><span>Kalender</span></button>
          <button className="fab" onClick={() => view === "plan" ? setLibraryOpen(true) : setView("plan")} aria-label={view === "plan" ? "Übung hinzufügen" : "Trainingsplan öffnen"}>{view === "plan" ? <Plus /> : <CalendarDays />}</button>
          <button className={view === "team" ? "active" : ""} onClick={() => setView(clubSettings.teamFeatureEnabled || currentUser.role === "admin" ? "team" : "profile")}><Users /><span>Team</span></button>
          <button className={view === "settings" || view === "profile" ? "active" : ""} onClick={() => { if (currentUser.role === "admin") setView("settings"); else { setProfileUserId(currentUser.id); setView("profile"); } }}>{currentUser.role === "admin" ? <Settings /> : <MoreVertical />}<span>{currentUser.role === "admin" ? "Setup" : "Profil"}</span></button>
        </nav>
      </section>

      {libraryOpen && <div className="picker-backdrop" onMouseDown={() => setLibraryOpen(false)}><aside className="exercise-picker" role="dialog" aria-modal="true" aria-label="Übungsbibliothek" onMouseDown={(event) => event.stopPropagation()}><ExerciseLibrary mode="pick" exercises={exerciseLibrary} initialPhase={targetPhase} canManage={Boolean(canManageClub)} onClose={() => setLibraryOpen(false)} onDetail={(item) => { setLibraryOpen(false); setDetail(item); }} onEdit={(item) => { setLibraryOpen(false); setEditingExercise(item); setCreatorOpen(true); }} onDelete={deleteLibraryExercise} onAdd={(item) => addExercise(item, targetPhase)} onCreate={() => { setLibraryOpen(false); setEditingExercise(null); setCreatorOpen(true); }} /></aside></div>}
      {creatorOpen && <ExerciseCreator phase={targetPhase} exercise={editingExercise} onClose={() => { setCreatorOpen(false); setEditingExercise(null); }} onSave={saveExercise} />}
      {templateOpen && <TrainingTemplates mode={templateMode} plan={plan} templates={[...featuredTemplates, ...trainingTemplates]} onModeChange={setTemplateMode} onApply={applyTrainingTemplate} onSave={saveTrainingTemplate} onDelete={deleteTrainingTemplate} onToggleDefault={toggleDefaultPhase} onClose={() => setTemplateOpen(false)} />}

      {detail && (
        <div className="modal-backdrop" onMouseDown={() => setDetail(null)}>
          <section className="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="exercise-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="detail-top"><div className="detail-badges"><span className="category-pill" style={{ "--accent": detail.accent } as React.CSSProperties}>{detail.category}</span><span className="age-detail-badge">{detail.ageGroup} · {detail.ageRange}</span></div><button className="icon-button" onClick={() => setDetail(null)} aria-label="Details schließen"><X /></button></div>
            <div className="detail-hero">
              <Pitch variant={detail.variant} animated={animation} label={`Animierte Darstellung für ${detail.title}`} />
              <button className="play-button" onClick={() => setAnimation((current) => !current)}>{animation ? <Pause /> : <Play />}{animation ? "Animation pausieren" : "Animation starten"}</button>
            </div>
            {youtubeEmbed(detail.youtubeUrl) && <div className="youtube-embed"><iframe src={youtubeEmbed(detail.youtubeUrl)!} title={`Video zu ${detail.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>}
            <div className="detail-content">
              <span className="eyebrow">ÜBUNGSDETAILS</span><h2 id="exercise-title">{detail.title}</h2><p className="detail-lead">{detail.description}</p>
              <div className="detail-stats"><span><Clock3 /><small>Dauer</small><strong>{detail.duration} Min</strong></span><span><Users /><small>Spieler</small><strong>{detail.players}</strong></span><span><CircleGauge /><small>Intensität</small><strong>{detail.intensity}</strong></span></div>
              <div className="focus-tags">{detail.focus.map((focus) => <span key={focus}>{focus}</span>)}</div>
              <div className="detail-section"><h3>Organisation</h3><p>{detail.setup}</p></div>
              <div className="detail-section"><h3>Material</h3><div className="detail-materials">{detail.materials.map((material) => <span key={material.id}><Boxes /> <strong>{material.count}</strong> {materialCatalog[material.id].name}</span>)}</div></div>
              <div className="detail-section"><h3>Coachingpunkte</h3><ul>{detail.coaching.map((point) => <li key={point}><Check />{point}</li>)}</ul></div>
            </div>
            <div className="detail-actions"><button className="secondary" onClick={() => setDetail(null)}>Schließen</button>{canManageClub && <button className="secondary" onClick={() => { setEditingExercise(detail); setCreatorOpen(true); setDetail(null); }}><Edit3 /> Bearbeiten</button>}{canManageClub && <button className="primary" onClick={() => { addExercise(detail); setDetail(null); }}><Plus /> Zum Training</button>}</div>
          </section>
        </div>
      )}

      {toastMessage && <div className="toast"><Check /> {toastMessage}</div>}
    </main>
  );
}
