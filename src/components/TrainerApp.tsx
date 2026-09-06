"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, BookmarkPlus, Boxes, CalendarDays, Check, ChevronRight, CircleGauge, Clock3, CreditCard, Dumbbell, Edit3,
  Home, Library, LogOut, MapPin, Menu, MessageCircle, MoreVertical, Plus, Settings, Shield,
  Sparkles, Target, Trash2, Trophy, Users, X,
} from "lucide-react";
import { library, materialCatalog, type Exercise, type MaterialId } from "@/data/demo";
import { initialSettings, type AgeGroupOption, type ClubEvent, type ClubInvitation, type ClubSettings, type ClubUser, type InternalTeam, type OrganizationContext, type PushStatus, type SmtpStatus, type TeamGroup, type TournamentPlan, type TournamentSquad, type TrainingPlanMeta } from "@/data/club";
import { ageGroupForBirthday } from "@/lib/age-groups";
import { Pitch } from "./Pitch";
import { Avatar, CalendarPage, ProfilePage, TeamPage } from "./ClubModules";
import { AdminSettingsPage, LicensePage, UserSettingsPage } from "./AdminSettings";
import { ExerciseCreator } from "./ExerciseCreator";
import { ExerciseLibrary } from "./ExerciseBrowser";
import { TrainingTemplates, type TrainingTemplate } from "./TrainingTemplates";
import { TournamentPlanningPage } from "./TournamentPlanning";
import { FirstLoginSetup } from "./FirstLoginSetup";
import { firebaseChangePassword, firebaseClientAuthEnabled } from "@/lib/firebase-client";

const kidsCrew = {
  freilaufen: { src: "/illustrations/kids-crew/freilaufen.jpg", alt: "Kind macht sich zum Anspiel bereit" },
  dribbling: { src: "/illustrations/kids-crew/dribbling.jpg", alt: "Kind dribbelt mit engem Ballkontakt" },
  passspiel: { src: "/illustrations/kids-crew/passspiel.jpg", alt: "Kind spielt einen kontrollierten Pass" },
  torschuss: { src: "/illustrations/kids-crew/torschuss.jpg", alt: "Kind schließt kontrolliert auf das Tor ab" },
  torwart: { src: "/illustrations/kids-crew/torwart.jpg", alt: "Torwartkind eröffnet das Spiel" },
} as const;

function kidsCrewForExercise(exercise: Exercise) {
  const keywords = `${exercise.title} ${exercise.focus.join(" ")}`.toLowerCase();
  if (/torwart|torhüter|keeper|abwurf/.test(keywords)) return kidsCrew.torwart;
  if (/torschuss|abschluss|tore erzielen|zielschießen/.test(keywords)) return kidsCrew.torschuss;
  if (/pass|zusammenspiel|ballannahme/.test(keywords)) return kidsCrew.passspiel;
  if (/dribbl|ballgefühl|ballkontrolle|finte/.test(keywords)) return kidsCrew.dribbling;
  return kidsCrew.freilaufen;
}

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
type AppView = "overview" | "plan" | "exercises" | "calendar" | "tournaments" | "team" | "profile" | "settings" | "license";
const appViews = new Set<AppView>(["overview", "plan", "exercises", "calendar", "tournaments", "team", "profile", "settings", "license"]);

function viewFromLocation(): AppView {
  const requested = new URL(window.location.href).searchParams.get("bereich") as AppView | null;
  return requested && appViews.has(requested) ? requested : "overview";
}

const exerciseById = new Map(library.map((exercise) => [exercise.id, exercise]));
const templateExercises = (ids: string[]) => ids.map((id) => exerciseById.get(id)).filter((exercise): exercise is Exercise => Boolean(exercise));
const featuredTemplates: TrainingTemplate[] = [
  { id: "featured-dribbling", name: "Ballgefühl & Dribbling", kind: "plan", focus: ["Ballgefühl", "Dribbling", "Orientierung"], exercises: templateExercises(["dribbling-zoo", "hütchen-schatz", "one-v-one", "vier-tore"]), builtIn: true },
  { id: "featured-tore", name: "Mutig zum Tor", kind: "plan", focus: ["Torschuss", "Mut", "1 gegen 1"], exercises: templateExercises(["krokodiljagd", "torschuss-duell", "one-v-one", "drei-gegen-drei-wechsel"]), builtIn: true },
  { id: "featured-spielfreude", name: "Spielfreude & Teamwork", kind: "plan", focus: ["Teamwork", "Freilaufen", "Freies Spiel"], exercises: templateExercises(["brueckenfangen", "bewegungs-parcours", "funino", "fuenf-gegen-fuenf"]), builtIn: true },
];

type BootstrapData = {
  currentUser: ClubUser;
  setupRequired?: boolean;
  users: ClubUser[];
  events: ClubEvent[];
  exercises: Exercise[];
  settings: ClubSettings;
  plans: Record<string, Exercise[]>;
  templates: TrainingTemplate[];
  planMeta: Record<string, TrainingPlanMeta>;
  groups: TeamGroup[];
  ageGroups: AgeGroupOption[];
  invitations: ClubInvitation[];
  smtp: SmtpStatus;
  push: PushStatus;
  tournamentPlans: TournamentPlan[];
  organization: OrganizationContext | null;
};

function youtubeEmbed(url?: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) return null;
    const id = host === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).pop();
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}

export function TrainerApp() {
  const router = useRouter();
  const [view, setViewState] = useState<AppView>("overview");
  const [selectedDay, setSelectedDay] = useState(initialPlanKey);
  const [targetPhase, setTargetPhase] = useState<Exercise["category"]>("Einstieg");
  const [plans, setPlans] = useState<Record<string, Exercise[]>>({});
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [planSaveState, setPlanSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [users, setUsers] = useState<ClubUser[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>(library);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [clubSettings, setClubSettings] = useState<ClubSettings>(initialSettings);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroupOption[]>([]);
  const [invitations, setInvitations] = useState<ClubInvitation[]>([]);
  const [smtp, setSmtp] = useState<SmtpStatus>({ configured: false });
  const [push, setPush] = useState<PushStatus>({ configured: false, devices: 0 });
  const [tournamentPlans, setTournamentPlans] = useState<TournamentPlan[]>([]);
  const [organization, setOrganization] = useState<OrganizationContext | null>(null);
  const [trainingTemplates, setTrainingTemplates] = useState<TrainingTemplate[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [assignmentExerciseId, setAssignmentExerciseId] = useState<string | null>(null);
  const [templateMode, setTemplateMode] = useState<"browse" | "save">("browse");
  const [planMeta, setPlanMeta] = useState<Record<string, TrainingPlanMeta>>({});
  const [toastMessage, setToastMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const planDataReady = useRef(false);
  const lastPersistedPlan = useRef("");
  const latestPlanSnapshot = useRef("");
  const autoSaveChain = useRef<Promise<void>>(Promise.resolve());

  function usesMobileExerciseNavigation() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
  }

  function updateExerciseDialogHistory(dialog: "library" | "detail", replace = false) {
    if (!usesMobileExerciseNavigation()) return;
    const url = new URL(window.location.href);
    url.searchParams.set("dialog", dialog === "library" ? "uebungen" : "uebung");
    const state = { ...window.history.state, nextSessionExerciseDialog: dialog };
    if (replace) window.history.replaceState(state, "", url);
    else window.history.pushState(state, "", url);
  }

  function openExerciseLibrary(phase: Exercise["category"]) {
    setTargetPhase(phase);
    updateExerciseDialogHistory("library", Boolean(window.history.state?.nextSessionExerciseDialog));
    setLibraryOpen(true);
  }

  function openExerciseDetail(exercise: Exercise) {
    updateExerciseDialogHistory("detail", Boolean(window.history.state?.nextSessionExerciseDialog));
    setLibraryOpen(false);
    setDetail(exercise);
  }

  function closeExerciseDialog() {
    if (usesMobileExerciseNavigation() && window.history.state?.nextSessionExerciseDialog) {
      window.history.back();
      return;
    }
    setLibraryOpen(false);
    setDetail(null);
  }

  function setView(nextView: AppView) {
    if (nextView === view) return;
    const url = new URL(window.location.href);
    if (nextView === "overview") url.searchParams.delete("bereich");
    else url.searchParams.set("bereich", nextView);
    window.history.pushState({ ...window.history.state, nextSessionView: nextView }, "", url);
    setViewState(nextView);
  }

  useEffect(() => { void loadBootstrap(); }, []);

  useEffect(() => {
    const syncViewFromHistory = () => {
      setViewState(viewFromLocation());
      setAccountMenuOpen(false);
      setMobileMenuOpen(false);
      if (!window.history.state?.nextSessionExerciseDialog) {
        setLibraryOpen(false);
        setDetail(null);
      }
    };
    syncViewFromHistory();
    window.addEventListener("popstate", syncViewFromHistory);
    return () => window.removeEventListener("popstate", syncViewFromHistory);
  }, []);

  useEffect(() => {
    const refreshPushStatus = () => void loadBootstrap();
    window.addEventListener("trainerplan:push-registered", refreshPushStatus);
    return () => window.removeEventListener("trainerplan:push-registered", refreshPushStatus);
  }, []);

  useEffect(() => {
    if (authReady && !currentUserId) router.replace("/login");
  }, [authReady, currentUserId, router]);

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
        const didSave = await syncTrainingPlans(payload);
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
    // Frühere Versionen speicherten Team und Trainer global am Trainingstag. Beim
    // ersten Laden übernehmen wir diese Werte in die einzelnen Übungen und entfernen
    // anschließend die alte globale Zuordnung über den bestehenden Autosave.
    const legacyMeta = data.planMeta as Record<string, TrainingPlanMeta & { trainerId?: string | null; internalTeam?: InternalTeam | null }>;
    const migratedPlans = Object.fromEntries(Object.entries(data.plans).map(([date, exercises]) => [date, exercises.map((exercise) => ({
      ...exercise,
      trainerId: exercise.trainerId ?? legacyMeta[date]?.trainerId ?? null,
      internalTeam: exercise.internalTeam ?? legacyMeta[date]?.internalTeam ?? null,
    }))]));
    const migratedPlanMeta = Object.fromEntries(Object.entries(data.planMeta).map(([date, meta]) => [date, { name: meta.name, focus: meta.focus }]));
    setUsers(data.users);
    setEvents(data.events);
    setCurrentUserId(data.currentUser.id);
    setSetupRequired(Boolean(data.setupRequired));
    setExerciseLibrary(data.exercises);
    setClubSettings({ ...initialSettings, ...data.settings });
    setPlans(migratedPlans);
    setTrainingTemplates(data.templates);
    setPlanMeta(migratedPlanMeta);
    setGroups(data.groups);
    setAgeGroups(data.ageGroups);
    setInvitations(data.invitations);
    setSmtp(data.smtp);
    setPush(data.push);
    setTournamentPlans(data.tournamentPlans ?? []);
    setOrganization(data.organization ?? null);
  }

  async function switchTeam(teamId: string) {
    if (!teamId || teamId === organization?.activeTeamId) return;
    const response = await fetch("/api/v1/organization/context", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return showToast(result.error || "Mannschaft konnte nicht gewechselt werden.");
    setSelectedDay(initialPlanKey); setProfileUserId(null); await loadBootstrap(); showToast("Mannschaft gewechselt.");
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

  async function logout() {
    const pushToken = window.localStorage.getItem("trainerplan-push-token");
    if (pushToken) await fetch("/api/v1/push-tokens", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: pushToken }) }).catch(() => undefined);
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setCurrentUserId(null);
    planDataReady.current = false;
    setUsers([]);
  }

  async function syncResource(resource: "users" | "settings", data: unknown) {
    try {
      const endpoint = resource === "users" ? "/api/v1/users" : "/api/v1/settings";
      const response = await fetch(endpoint, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Speichern fehlgeschlagen.");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
      return false;
    }
  }

  async function syncTrainingPlans(data: { plans: Record<string, Exercise[]>; planMeta: Record<string, TrainingPlanMeta> }) {
    try {
      const response = await fetch("/api/v1/training-plans", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Trainingsplan konnte nicht gespeichert werden.");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Trainingsplan konnte nicht gespeichert werden.");
      return false;
    }
  }

  function updateUsers(next: ClubUser[]) {
    const normalized = next.map((user) => user.role === "player" ? { ...user, ageGroup: ageGroupForBirthday(user.birthday) ?? "" } : user);
    setUsers(normalized); void syncResource("users", normalized).then((saved) => { if (!saved) void loadBootstrap(); });
  }
  function eventDetails(event: ClubEvent) {
    const { responses: _responses, ...details } = event;
    return details;
  }

  async function syncEvents(next: ClubEvent[]) {
    const previous = events;
    const previousById = new Map(previous.map((event) => [event.id, event]));
    const nextById = new Map(next.map((event) => [event.id, event]));
    try {
      for (const event of previous) {
        if (nextById.has(event.id)) continue;
        const response = await fetch(`/api/v1/events/${encodeURIComponent(event.id)}`, { method: "DELETE", credentials: "include" });
        if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? "Termin konnte nicht gelöscht werden.");
      }
      for (const event of next) {
        if (!previousById.has(event.id)) {
          const response = await fetch("/api/v1/events", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) });
          if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? "Termin konnte nicht erstellt werden.");
          continue;
        }
        const previousEvent = previousById.get(event.id)!;
        if (JSON.stringify(eventDetails(previousEvent)) !== JSON.stringify(eventDetails(event))) {
          const response = await fetch(`/api/v1/events/${encodeURIComponent(event.id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) });
          if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? "Termin konnte nicht geändert werden.");
        }
        const responseSubjects = currentUserId ? [currentUserId, ...(currentUser?.managedPlayerIds ?? [])] : [];
        for (const responseUserId of responseSubjects) if (previousEvent.responses[responseUserId] !== event.responses[responseUserId]) {
          const response = await fetch(`/api/v1/events/${encodeURIComponent(event.id)}/attendance`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: event.responses[responseUserId] ?? null, ...(responseUserId !== currentUserId ? { playerId: responseUserId } : {}) }) });
          if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? "Teilnahme konnte nicht gespeichert werden.");
        }
      }
      const response = await fetch("/api/v1/events", { credentials: "include", cache: "no-store" });
      const result = await response.json() as { events?: ClubEvent[]; error?: string };
      if (!response.ok || !result.events) throw new Error(result.error ?? "Termine konnten nicht geladen werden.");
      setEvents(result.events);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Termine konnten nicht gespeichert werden.");
      return false;
    }
  }

  function updateEvents(next: ClubEvent[]) { setEvents(next); void syncEvents(next); }

  function updateUser(nextUser: ClubUser) { updateUsers(users.map((user) => user.id === nextUser.id ? nextUser : user)); }
  function updateSettings(next: ClubSettings) { setClubSettings(next); void syncResource("settings", next); }

  function deletePlannedTraining(date: string) {
    setPlans((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== date)));
    setPlanMeta((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== date)));
    showToast("Training und Trainingsplan wurden gelöscht.");
  }

  async function updateTournamentPlan(eventId: string, squads: TournamentSquad[]) {
    const previous = tournamentPlans;
    const next = [...previous.filter((plan) => plan.eventId !== eventId), { eventId, squads }];
    setTournamentPlans(next);
    try {
      const response = await fetch(`/api/v1/events/${encodeURIComponent(eventId)}/squads`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ squads }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Mannschaft konnte nicht gespeichert werden.");
      return true;
    } catch (error) {
      setTournamentPlans(previous);
      showToast(error instanceof Error ? error.message : "Mannschaft konnte nicht gespeichert werden.");
      return false;
    }
  }

  async function createTournament(event: ClubEvent) {
    const previous = events;
    const next = [...events, event];
    setEvents(next);
    const saved = await syncEvents(next);
    if (!saved) setEvents(previous);
    return saved;
  }

  async function changePassword(currentPassword: string, newPassword: string, confirmation: string) {
    try {
      if (newPassword !== confirmation) return "Die beiden neuen Passwörter stimmen nicht überein.";
      if (firebaseClientAuthEnabled()) {
        const account = users.find((entry) => entry.id === currentUserId);
        if (!account?.email) return "Das Konto besitzt keine gültige E-Mail-Adresse.";
        await firebaseChangePassword(account.email, currentPassword, newPassword);
        return null;
      }
      const response = await fetch("/api/v1/auth/password", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword, confirmation }) });
      const result = await response.json() as { error?: string };
      return response.ok ? null : result.error ?? "Passwort konnte nicht geändert werden.";
    } catch (error) {
      return error instanceof Error ? error.message : "Das Passwort konnte nicht geändert werden.";
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
    void syncTemplates(next);
  }

  async function syncTemplates(next: TrainingTemplate[]) {
    const previous = trainingTemplates;
    const previousById = new Map(previous.map((template) => [template.id, template]));
    const nextById = new Map(next.map((template) => [template.id, template]));
    try {
      for (const template of previous) {
        if (nextById.has(template.id)) continue;
        const response = await fetch(`/api/v1/templates/${encodeURIComponent(template.id)}`, { method: "DELETE", credentials: "include" });
        if (!response.ok) throw new Error("Vorlage konnte nicht gelöscht werden.");
      }
      for (const template of next) {
        const existing = previousById.get(template.id);
        const response = await fetch(existing ? `/api/v1/templates/${encodeURIComponent(template.id)}` : "/api/v1/templates", { method: existing ? "PATCH" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(template) });
        if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error ?? "Vorlage konnte nicht gespeichert werden.");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Vorlage konnte nicht gespeichert werden.");
    }
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
        ? { ...current[selectedDay], name: template.name, focus: template.focus }
        : { ...current[selectedDay], name: current[selectedDay]?.name ?? currentDay.theme, focus: Array.from(new Set([...(current[selectedDay]?.focus ?? []), ...template.focus])).slice(0, 4) },
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

  function mobileNavigate(nextView: AppView) {
    setMobileMenuOpen(false);
    setView(nextView);
  }

  function mobileBack() {
    if (mobileMenuOpen) return setMobileMenuOpen(false);
    if (libraryOpen || detail) return closeExerciseDialog();
    if (view === "profile" && profileUserId && profileUserId !== currentUserId) return setView("team");
    if (view !== "overview") setView("overview");
  }

  const plan = plans[selectedDay] ?? [];

  const total = plan.reduce((sum, item) => sum + item.duration, 0);
  const currentPlanMeta = planMeta[selectedDay] ?? { name: currentDay.theme, focus: [] };
  const availableTrainers = users.filter((user) => user.role === "admin" || user.role === "trainer");
  const trainerName = (id?: string | null) => users.find((user) => user.id === id)?.name;
  const assignmentExercise = plan.find((exercise) => exercise.id === assignmentExerciseId) ?? null;
  const exerciseAssignmentLabel = (exercise: Exercise) => clubSettings.splitTeamsEnabled
    ? [exercise.internalTeam ? `Team ${exercise.internalTeam}` : "", trainerName(exercise.trainerId) ? `Trainer: ${trainerName(exercise.trainerId)}` : ""].filter(Boolean).join(" · ")
    : "";
  const exerciseAssignmentSummary = (items: Exercise[]) => {
    if (!clubSettings.splitTeamsEnabled) return [];
    const teams = [...new Set(items.map((exercise) => exercise.internalTeam).filter(Boolean))].map((team) => `Team ${team}`);
    const trainers = [...new Set(items.map((exercise) => trainerName(exercise.trainerId)).filter((name): name is string => Boolean(name)))];
    return [...teams, ...trainers];
  };
  function updateExerciseAssignment(id: string, patch: Pick<Exercise, "trainerId"> | Pick<Exercise, "internalTeam">) {
    setPlans((current) => ({ ...current, [selectedDay]: (current[selectedDay] ?? []).map((exercise) => exercise.id === id ? { ...exercise, ...patch } : exercise) }));
  }
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

  async function syncExercise(item: Exercise, exists: boolean) {
    try {
      const response = await fetch(exists ? `/api/v1/exercises/${encodeURIComponent(item.id)}` : "/api/v1/exercises", { method: exists ? "PATCH" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Übung konnte nicht gespeichert werden.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Übung konnte nicht gespeichert werden.");
    }
  }

  function saveExercise(item: Exercise) {
    const exists = exerciseLibrary.some((exercise) => exercise.id === item.id);
    const nextLibrary = exists ? exerciseLibrary.map((exercise) => exercise.id === item.id ? item : exercise) : [...exerciseLibrary, item];
    setExerciseLibrary(nextLibrary);
    setPlans((current) => Object.fromEntries(Object.entries(current).map(([day, dayPlan]) => [day, dayPlan.map((planned) => planned.id === item.id || planned.id.startsWith(`${item.id}-`) ? { ...item, id: planned.id, category: planned.category, trainerId: planned.trainerId, internalTeam: planned.internalTeam } : planned)])));
    void syncExercise(item, exists);
    setCreatorOpen(false);
    setEditingExercise(null);
  }

  function deleteLibraryExercise(item: Exercise) {
    if (!canManageClub || !window.confirm(`„${item.title}“ wirklich aus der Übungsbibliothek löschen? Bereits geplante Trainings bleiben unverändert.`)) return;
    const nextLibrary = exerciseLibrary.filter((exercise) => exercise.id !== item.id);
    setExerciseLibrary(nextLibrary);
    void fetch(`/api/v1/exercises/${encodeURIComponent(item.id)}`, { method: "DELETE", credentials: "include" }).then(async (response) => {
      if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error ?? "Übung konnte nicht gelöscht werden.");
    }).catch((error: unknown) => showToast(error instanceof Error ? error.message : "Übung konnte nicht gelöscht werden."));
    showToast(`${item.title} wurde gelöscht`);
  }

  async function retryPlanSave() {
    const payload = { plans, planMeta };
    const serialized = JSON.stringify(payload);
    setPlanSaveState("saving");
    const didSave = await syncTrainingPlans(payload);
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
      onDetail={openExerciseDetail}
      onEdit={(item) => { setEditingExercise(item); setCreatorOpen(true); }}
      onDelete={deleteLibraryExercise}
      onAdd={(item) => addExercise(item, item.category)}
      onCreate={() => { setEditingExercise(null); setCreatorOpen(true); }}
    />
  );

  const plannedDays = days.map((day) => ({ day, exercises: plans[day.key] ?? [] })).filter((entry) => entry.exercises.length > 0);
  const nextPlannedDay = plannedDays.find((entry) => entry.day.key >= todayKey) ?? null;
  const upcomingEvents = [...events].filter((event) => event.date >= todayKey).sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  const nextTrainingEvent = upcomingEvents.find((event) => event.type === "training") ?? null;
  const nextOtherEvent = upcomingEvents.find((event) => event.type !== "training") ?? null;
  const nextTournament = upcomingEvents.find((event) => event.type === "tournament") ?? null;
  const nextTournamentSquads = tournamentPlans.find((plan) => plan.eventId === nextTournament?.id)?.squads ?? [];
  const nextTrainingCoaches = (nextTrainingEvent?.trainerIds ?? []).map((id) => users.find((user) => user.id === id)).filter((user): user is ClubUser => Boolean(user));
  const trainingDate = nextTrainingEvent?.date ?? nextPlannedDay?.day.key ?? null;
  const trainingDay = trainingDate ? days.find((day) => day.key === trainingDate) ?? null : null;
  const trainingExercises = trainingDate ? plans[trainingDate] ?? [] : [];
  const playerCount = users.filter((user) => user.role === "player").length;
  const openResponses = nextTrainingEvent ? Math.max(0, playerCount - Object.keys(nextTrainingEvent.responses).length) : 0;
  const nextPlanDuration = trainingExercises.reduce((sum, item) => sum + item.duration, 0);
  const nextPlanLabel = trainingExercises.length ? "Plan öffnen" : "Training planen";
  const trainingSortKey = trainingDate ? `${trainingDate}T${nextTrainingEvent?.startTime ?? trainingDay?.time ?? "23:59"}` : "9999-12-31T23:59";
  const otherEventSortKey = nextOtherEvent ? `${nextOtherEvent.date}T${nextOtherEvent.startTime}` : "9999-12-31T23:59";
  const otherEventComesFirst = otherEventSortKey < trainingSortKey;
  const firstName = currentUser?.name.trim().split(/\s+/)[0] || "Coach";
  const overviewDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" });
  const overviewSquadName = (name: string, index: number) => {
    const shortTeam = name.trim().match(/^T\s*(\d+)$/i);
    return shortTeam ? `Team ${shortTeam[1]}` : name.trim() || `Team ${index + 1}`;
  };
  const openPlan = () => {
    if (trainingDate) selectDay(trainingDate);
    else goToToday();
    setView("plan");
  };
  const overview = (
    <section className="overview-page">
      <div className="overview-welcome">
        <div><span className="eyebrow">GUTEN TAG, {firstName.toUpperCase()}</span><h1>Das steht als Nächstes an</h1><p>Training, Termine und offene Aufgaben auf einen Blick.</p></div>
      </div>
      <section style={{ order: otherEventComesFirst ? 2 : 1 }} className={`overview-card next-session overview-primary ${trainingDate ? "has-session" : "empty-session"}`}>
        <div className="overview-card-title"><div><span className="eyebrow">NÄCHSTES TRAINING</span><h2>{trainingDate ? `${overviewDate(trainingDate)} · ${nextTrainingEvent?.startTime ?? trainingDay?.time ?? "Zeit offen"}${nextTrainingEvent?.startTime || trainingDay?.time ? " Uhr" : ""}` : "Noch kein Training eingetragen"}</h2></div></div>
        {trainingDate ? <>
          <div className="next-session-main"><div className="date-tile"><strong>{new Date(`${trainingDate}T12:00:00`).getDate()}</strong><span>{new Date(`${trainingDate}T12:00:00`).toLocaleDateString("de-DE", { month: "short" })}</span></div><div className="next-session-copy"><span className={`session-status ${trainingExercises.length ? "" : "is-open"}`}><i /> {trainingExercises.length ? "PLAN VORBEREITET" : "PLAN NOCH OFFEN"}</span><h3>{planMeta[trainingDate]?.name ?? nextTrainingEvent?.title ?? trainingDay?.theme ?? "Training"}</h3><p><MapPin /> {nextTrainingEvent?.location || "Ort noch nicht eingetragen"}</p><p>{trainingExercises.length} Übungen · {nextPlanDuration} Minuten{nextTrainingEvent ? ` · ${users.filter((user) => user.role === "player" && nextTrainingEvent.responses[user.id] === "yes").length} Zusagen` : ""}</p></div>{nextTrainingCoaches.length > 0 && <div className="next-training-coaches" aria-label="Verantwortliche Trainer">{nextTrainingCoaches.slice(0, 4).map((trainer) => <span key={trainer.id} title={trainer.name}><Avatar user={trainer} size="small" /></span>)}</div>}</div>
          <div className="overview-primary-actions"><button className="primary" onClick={openPlan}>{nextPlanLabel} <ChevronRight /></button>{nextTrainingEvent && <button onClick={() => setView("calendar")}><Users /> Teilnehmer</button>}</div>
        </> : <div className="overview-empty"><CalendarDays /><div><strong>Plane deine nächste Einheit</strong><p>Lege einen Trainingstag fest und stelle anschließend die Übungen zusammen.</p></div>{canManageClub && <button className="primary" onClick={openPlan}><Plus /> Training planen</button>}</div>}
      </section>

      {(openResponses > 0 || (nextPlannedDay && !nextTrainingEvent)) && <section className="overview-card overview-todos"><div className="overview-card-title"><div><span className="eyebrow">NOCH ZU ERLEDIGEN</span><h2>Offene Aufgaben</h2></div></div>{openResponses > 0 && <button onClick={() => setView("calendar")}><AlertTriangle /><span><strong>{openResponses} Rückmeldungen fehlen</strong><small>Verfügbarkeit für das nächste Training prüfen</small></span><ChevronRight /></button>}{nextPlannedDay && !nextTrainingEvent && <button onClick={() => setView("calendar")}><AlertTriangle /><span><strong>Termindetails fehlen</strong><small>Ort und Teilnehmer zum Training ergänzen</small></span><ChevronRight /></button>}</section>}

      <div style={{ order: otherEventComesFirst ? 1 : 2 }} className="overview-next-grid">
        <section className="overview-card overview-next-event">
          <div className="overview-card-title"><div><span className="eyebrow">NÄCHSTES TURNIER / EVENT</span><h2>{nextOtherEvent ? nextOtherEvent.title : "Nichts eingetragen"}</h2></div>{nextOtherEvent && <button onClick={() => setView("calendar")}>Details <ChevronRight /></button>}</div>
          {nextOtherEvent ? <button className="overview-next-event-main" onClick={() => setView("calendar")}><span className="overview-next-date"><strong>{new Date(`${nextOtherEvent.date}T12:00:00`).getDate()}</strong><small>{new Date(`${nextOtherEvent.date}T12:00:00`).toLocaleDateString("de-DE", { month: "short" })}</small></span><span><em>{nextOtherEvent.type === "tournament" ? "Turnier" : nextOtherEvent.type === "match" ? "Ligaspiel" : "Event"}</em><strong>{overviewDate(nextOtherEvent.date)} · {nextOtherEvent.startTime} Uhr</strong><small><MapPin /> {nextOtherEvent.location || "Ort noch offen"}</small></span><ChevronRight /></button> : <p className="overview-no-events">Derzeit ist kein Turnier, Ligaspiel oder Event geplant.</p>}
          {nextOtherEvent?.id === nextTournament?.id && nextTournamentSquads.length > 0 && <div className="overview-event-squads"><div className="overview-squad-list">{nextTournamentSquads.slice(0, 4).map((squad, index) => {
            const trainer = users.find((user) => user.id === squad.trainerId);
            const teamName = overviewSquadName(squad.name, index);
            return <button key={squad.id} title={`${teamName}: ${trainer?.name || "Trainer offen"}`} aria-label={`${teamName}, ${trainer?.name || "Trainer offen"}, Mannschaftsplanung öffnen`} onClick={() => setView("tournaments")}><span className={`overview-squad-avatar ${trainer ? "" : "is-open"}`}>{trainer ? <Avatar user={trainer} size="small" /> : <Plus />}</span><strong>{teamName}</strong></button>;
          })}</div></div>}
        </section>
      </div>
    </section>
  );

  // Der Login bleibt auch während der kurzen Sitzungsprüfung bedienbar. So hängt die
  // App bei einem veralteten Browser-Bundle oder einer langsamen API nie im Splashscreen.
  if (!authReady) return <div className="auth-loading">NextSession wird geladen …</div>;
  if (!currentUser) return null;
  if (setupRequired) return <FirstLoginSetup user={currentUser} onComplete={loadBootstrap} />;
  const accessManagementEnabled = organization?.licenseType !== "single_team_free";
  const licenseDaysLeft = organization?.licenseExpiresAt ? Math.ceil((new Date(organization.licenseExpiresAt).getTime() - Date.now()) / 86_400_000) : null;

  const viewTitle = view === "overview" ? "Übersicht" : view === "plan" ? "Trainingsplan" : view === "exercises" ? "Übungen" : view === "calendar" ? "Kalender" : view === "tournaments" ? "Mannschaftsplanung" : view === "team" ? "Mannschaft" : view === "settings" ? "Einstellungen" : view === "license" ? "Lizenz & Abrechnung" : "Profil";
  const moduleContent = view === "calendar"
    ? <CalendarPage events={events} plannedTrainings={Object.entries(plans).filter(([, exercises]) => exercises.length > 0).map(([date]) => { const day = days.find((item) => item.key === date); return { date, title: planMeta[date]?.name ?? day?.theme ?? "Training", startTime: day?.time ?? "17:00" }; })} users={users} settings={clubSettings} currentUser={currentUser} onEventsChange={updateEvents} onDeletePlannedTraining={deletePlannedTraining} />
    : view === "tournaments"
      ? <TournamentPlanningPage events={events} users={users} plans={tournamentPlans} settings={clubSettings} ageGroups={ageGroups} currentUser={currentUser} onPlansChange={updateTournamentPlan} onCreateTournament={createTournament} />
    : view === "team"
      ? (accessManagementEnabled || currentUser.role === "admin" ? <TeamPage users={users} invitations={invitations} currentUser={currentUser} accessManagementEnabled={accessManagementEnabled} onUsersChange={updateUsers} onProfile={(user) => { setProfileUserId(user.id); setView("profile"); }} smtpConfigured={smtp.configured} onInvited={() => void loadBootstrap()} /> : overview)
      : view === "profile" && profileUser
        ? <ProfilePage user={profileUser} editable={profileUser.id === currentUser.id || currentUser.role === "admin"} canChangePassword={!profileUser.managedProfile && profileUser.id === currentUser.id} canRequestEmailChange={!profileUser.managedProfile && (profileUser.id === currentUser.id || currentUser.role === "admin")} emailChangeByAdmin={currentUser.role === "admin" && profileUser.id !== currentUser.id} canManageAccess={currentUser.role === "admin" && accessManagementEnabled} canManageDevelopment={canManageClub} splitTeamsEnabled={clubSettings.splitTeamsEnabled} onSave={updateUser} onChangePassword={changePassword} onBack={profileUser.id !== currentUser.id ? () => setView("team") : undefined} />
        : view === "license" && organization?.isClubAdmin
          ? <LicensePage organization={organization} ageGroups={ageGroups} onReload={() => void loadBootstrap()} />
        : view === "settings"
          ? currentUser.role === "admin"
            ? <AdminSettingsPage settings={clubSettings} currentUser={currentUser} users={users} groups={groups} ageGroups={ageGroups} smtp={smtp} push={push} organization={organization} onSave={updateSettings} onUsersChange={updateUsers} onReload={() => void loadBootstrap()} />
            : <UserSettingsPage />
          : null;

  return (
    <main className="app-shell">
      <aside className="main-nav">
        <div className="brand"><span className="brand-mark"><Shield /></span><span><strong>NEXT</strong>SESSION<small>KIDS!</small></span></div>
        <span className="nav-label">MENÜ</span>
        <nav>
          <a className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}><Home /> Übersicht</a>
          <a className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}><CalendarDays /> Kalender</a>
          <a className={view === "tournaments" ? "active" : ""} onClick={() => setView("tournaments")}><Trophy /> Mannschaftsplanung</a>
          <a className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}><CalendarDays /> Trainingsplan</a>
          <a className={view === "exercises" ? "active" : ""} onClick={() => setView("exercises")}><Library /> Übungen</a>
          {(accessManagementEnabled || currentUser.role === "admin") && <a className={view === "team" ? "active" : ""} onClick={() => setView("team")}><Dumbbell /> {accessManagementEnabled ? "Mannschaft" : "Spieler"}</a>}
        </nav>
        <div className="account-card" onClick={() => { setProfileUserId(currentUser.id); setView("profile"); }}><Avatar user={currentUser} size="small" /><span><strong>{currentUser.name}</strong><small>{currentUser.role === "admin" ? "Admin" : currentUser.role === "trainer" ? "Trainer" : currentUser.role === "guardian" ? "Elternteil" : "Spieler"}</small></span><button onClick={(event) => { event.stopPropagation(); logout(); }} aria-label="Abmelden"><LogOut /></button></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">{organization?.clubName ?? clubSettings.clubName} · {organization?.teams.find((team) => team.id === organization.activeTeamId)?.name ?? clubSettings.teamName}</span><h1>{viewTitle}</h1><p>{view === "plan" ? `${days[0].full} – ${days[days.length - 1].full}` : view === "calendar" ? "Termine und Verfügbarkeiten" : view === "settings" ? "Mannschaft und Zugänge verwalten" : view === "license" ? "Tarif und Vertragsdaten verwalten" : "Dein Team auf einen Blick"}</p></div>
          <div className="top-actions">
            {(organization?.teams.length ?? 0) > 1 && <label className="team-switcher"><span>Mannschaft</span><select value={organization?.activeTeamId ?? ""} onChange={(event) => void switchTeam(event.target.value)}>{organization?.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
            {view === "plan" && canManageClub && planSaveState === "error" && <button className="auto-save-status error" onClick={retryPlanSave}><Check /><span>Speichern fehlgeschlagen – erneut versuchen</span></button>}
            <div className="account-menu-wrap">
              <button className="avatar top-avatar" onClick={() => setAccountMenuOpen((open) => !open)} aria-label="Benutzermenü öffnen" aria-expanded={accountMenuOpen}><Avatar user={currentUser} size="small" /></button>
              {accountMenuOpen && <div className="account-menu" role="menu" onMouseDown={(event) => event.stopPropagation()}>
                <div className="account-menu-head"><Avatar user={currentUser} size="medium" /><span><strong>{currentUser.name}</strong><small>{currentUser.email}</small></span></div>
                <button role="menuitem" onClick={() => { setAccountMenuOpen(false); setProfileUserId(currentUser.id); setView("profile"); }}><Users /><span>Mein Profil</span><ChevronRight /></button>
                <button role="menuitem" onClick={() => { setAccountMenuOpen(false); setView("settings"); }}><Settings /><span>Einstellungen</span><ChevronRight /></button>
                {organization?.isClubAdmin && <button role="menuitem" onClick={() => { setAccountMenuOpen(false); setView("license"); }}><CreditCard /><span>Lizenz & Abrechnung</span><ChevronRight /></button>}
                <button role="menuitem" onClick={() => { setAccountMenuOpen(false); void logout(); }}><LogOut /><span>Abmelden</span><ChevronRight /></button>
              </div>}
            </div>
          </div>
        </header>

        <div className="mobile-head">
          {view === "overview" ? <span className="mobile-head-spacer" aria-hidden="true" /> : <button className="icon-button" onClick={mobileBack} aria-label="Zurück zur Übersicht"><ArrowLeft /></button>}
          <div><span>{view === "plan" ? `${currentDay.month} ${currentDay.key.slice(0, 4)}` : organization?.teams.find((team) => team.id === organization.activeTeamId)?.name ?? clubSettings.teamName}</span><strong>{viewTitle}</strong></div>
          <button className="icon-button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"} aria-expanded={mobileMenuOpen}><Menu /></button>
        </div>

        {mobileMenuOpen && <div className="mobile-menu-backdrop" onMouseDown={() => setMobileMenuOpen(false)}><nav className="mobile-menu-sheet" aria-label="Mobile Hauptnavigation" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><span className="eyebrow">{organization?.clubName ?? clubSettings.clubName}</span><strong>Navigation</strong></div><button onClick={() => setMobileMenuOpen(false)} aria-label="Menü schließen"><X /></button></header>
          {(organization?.teams.length ?? 0) > 1 && <label className="mobile-team-switcher"><span>Aktive Mannschaft</span><select value={organization?.activeTeamId ?? ""} onChange={(event) => { setMobileMenuOpen(false); void switchTeam(event.target.value); }}>{organization?.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
          <div>
            <button className={view === "overview" ? "active" : ""} onClick={() => mobileNavigate("overview")}><Home /><span><strong>Übersicht</strong><small>Dashboard und nächste Termine</small></span><ChevronRight /></button>
            <button className={view === "calendar" ? "active" : ""} onClick={() => mobileNavigate("calendar")}><CalendarDays /><span><strong>Kalender</strong><small>Training, Turniere und Ereignisse</small></span><ChevronRight /></button>
            <button className={view === "tournaments" ? "active" : ""} onClick={() => mobileNavigate("tournaments")}><Trophy /><span><strong>Mannschaftsplanung</strong><small>Turnierteams und Trainer zuordnen</small></span><ChevronRight /></button>
            <button className={view === "plan" ? "active" : ""} onClick={() => mobileNavigate("plan")}><CalendarDays /><span><strong>Trainingsplan</strong><small>Einheiten planen und bearbeiten</small></span><ChevronRight /></button>
            <button className={view === "exercises" ? "active" : ""} onClick={() => mobileNavigate("exercises")}><Library /><span><strong>Übungen</strong><small>Übungsbibliothek durchsuchen</small></span><ChevronRight /></button>
            {(accessManagementEnabled || currentUser.role === "admin") && <button className={view === "team" ? "active" : ""} onClick={() => mobileNavigate("team")}><Users /><span><strong>{accessManagementEnabled ? "Mannschaft" : "Spieler"}</strong><small>{accessManagementEnabled ? "Kader und Rollen verwalten" : "Spielerprofile verwalten"}</small></span><ChevronRight /></button>}
            <button className={view === "settings" ? "active" : ""} onClick={() => mobileNavigate("settings")}><Settings /><span><strong>Einstellungen</strong><small>{currentUser.role === "admin" ? "Verein, Rechte und Kalender" : "Kalender und persönliche Funktionen"}</small></span><ChevronRight /></button>
            {organization?.isClubAdmin && <button className={view === "license" ? "active" : ""} onClick={() => mobileNavigate("license")}><CreditCard /><span><strong>Lizenz & Abrechnung</strong><small>Tarif, Zahlung und Rechnungen</small></span><ChevronRight /></button>}
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

        {organization?.isClubAdmin && licenseDaysLeft !== null && licenseDaysLeft >= 0 && licenseDaysLeft <= 14 && <div className="global-license-warning"><AlertTriangle /><span><strong>Deine Lizenz endet {licenseDaysLeft === 0 ? "heute" : `in ${licenseDaysLeft} Tagen`}.</strong><small>Danach wird EM Free aktiv. Daten bleiben erhalten, Zugänge und Pro-Funktionen werden gesperrt.</small></span><button onClick={() => setView("license")}>Lizenz prüfen</button></div>}
        {moduleContent ?? (view === "overview" ? overview : view === "plan" ? <div className="content-grid plan-only-layout">
          <section className="plan-panel card">
            {canManageClub && <div className="plan-template-tools">
              <button onClick={() => { setTemplateMode("browse"); setTemplateOpen(true); }}><Sparkles /> <span><strong>Vorlage wählen</strong><small>Schwerpunkt oder Standardphase</small></span></button>
              <button onClick={() => { setTemplateMode("save"); setTemplateOpen(true); }}><BookmarkPlus /> <span><strong>Als Vorlage sichern</strong><small>Komplett oder einzelne Phase</small></span></button>
              {planSaveState === "error" && <div className="mobile-plan-save auto-save-info error"><Check /> <span><strong>Speichern fehlgeschlagen</strong><small>Bitte erneut versuchen.</small></span><button onClick={retryPlanSave}>Erneut</button></div>}
            </div>}
            <div className="plan-heading">
              <div><span className="eyebrow">{currentDay.time} UHR · DAUER {total} MIN</span><h2>{currentPlanMeta.name}</h2><p>{currentDay.full} · Sportplatz Nord</p>{currentPlanMeta.focus.length > 0 && <div className="plan-focus-tags">{currentPlanMeta.focus.map((focus) => <span key={focus}><Target />{focus}</span>)}</div>}</div>
              <div className="plan-heading-actions"><div className="plan-duration"><Clock3 /><span><strong>{total}</strong> Min</span></div></div>
            </div>
            {assignmentExercise && clubSettings.splitTeamsEnabled && <div className="modal-backdrop assignment-editor-backdrop" onMouseDown={() => setAssignmentExerciseId(null)}><section className="assignment-editor" role="dialog" aria-modal="true" aria-labelledby="assignment-editor-title" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow">ÜBUNG ZUORDNEN</span><h2 id="assignment-editor-title">{assignmentExercise.title}</h2><p>Team und Trainer gelten nur für diese Übung.</p></div><button onClick={() => setAssignmentExerciseId(null)} aria-label="Zuordnung schließen"><X /></button></header><div className="training-assignment-fields"><label><span>Internes Team</span><select value={assignmentExercise.internalTeam ?? ""} onChange={(event) => updateExerciseAssignment(assignmentExercise.id, { internalTeam: (event.target.value || null) as InternalTeam | null })}><option value="">Gesamte Mannschaft</option><option value="A">Team A</option><option value="B">Team B</option></select></label><label><span>Verantwortlicher Trainer</span><select value={assignmentExercise.trainerId ?? ""} onChange={(event) => updateExerciseAssignment(assignmentExercise.id, { trainerId: event.target.value || null })}><option value="">Noch nicht zugeordnet</option>{availableTrainers.map((trainer) => <option value={trainer.id} key={trainer.id}>{trainer.name}</option>)}</select></label></div><button className="primary assignment-editor-done" onClick={() => setAssignmentExerciseId(null)}><Check /> Fertig</button></section></div>}

            <div className="phase-schedule">
              {phases.map((phase) => {
                const phaseExercises = plan.filter((item) => item.category === phase);
                const phaseDuration = phaseExercises.reduce((sum, item) => sum + item.duration, 0);
                return <section className="phase-block" key={phase}>
                  <header><div><span>{phase}</span><small>{phaseExercises.length} Übungen · {phaseDuration} Min</small></div>{canManageClub && <button onClick={() => openExerciseLibrary(phase)}><Plus /> Übung</button>}</header>
                  <div className="timeline">
                    {phaseExercises.map((item) => {
                      const index = plan.findIndex((planned) => planned.id === item.id);
                      return <article className="exercise" key={item.id} style={{ "--accent": item.accent } as React.CSSProperties}>
                        <div className="stage"><i /><span>{String(index + 1).padStart(2, "0")}</span><select className="phase-select" value={item.category} onChange={(event) => changeExercisePhase(item.id, event.target.value as Exercise["category"])}>{phases.map((option) => <option key={option}>{option}</option>)}</select></div>
                        <button className="exercise-preview" onClick={() => openExerciseDetail(item)} aria-label={`${item.title} öffnen`}><Pitch variant={item.variant} caption={item.title} /></button>
                        <button className="exercise-copy" onClick={() => openExerciseDetail(item)}>{exerciseAssignmentLabel(item) && <span className="mobile-stage with-assignment">{exerciseAssignmentLabel(item)}</span>}<h3>{item.title}</h3><p>{item.description}</p><small><Users /> {item.players}<Clock3 /> {item.duration} Min <CircleGauge /> {item.intensity}</small></button>
                        {canManageClub && <div className="exercise-row-actions">{clubSettings.splitTeamsEnabled && <button className="exercise-assignment-button" onClick={() => setAssignmentExerciseId(item.id)} aria-label={`Team und Trainer für ${item.title} festlegen`} title="Team und Trainer"><Users /></button>}<button className="remove-button" onClick={() => removeExercise(item.id)} aria-label={`${item.title} entfernen`}><Trash2 /></button></div>}
                      </article>;
                    })}
                    {!phaseExercises.length && canManageClub && <button className="phase-dropzone" onClick={() => openExerciseLibrary(phase)}><Plus /> Übung für {phase === "Abschlussspiel" ? "Abschluss" : phase} hinzufügen</button>}
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
          <button className={view === "plan" ? "active" : ""} onClick={openPlan} aria-label="Trainingsplanung öffnen"><Dumbbell /><span>Training</span></button>
          <button className={view === "team" ? "active" : ""} onClick={() => setView(accessManagementEnabled || currentUser.role === "admin" ? "team" : "profile")}><Users /><span>Team</span></button>
          <button className={view === "tournaments" ? "active" : ""} onClick={() => setView("tournaments")}><Trophy /><span>Mannschaftsplanung</span></button>
        </nav>
      </section>

      {libraryOpen && <div className="picker-backdrop" onMouseDown={closeExerciseDialog}><aside className="exercise-picker" role="dialog" aria-modal="true" aria-label="Übungsbibliothek" onMouseDown={(event) => event.stopPropagation()}><ExerciseLibrary mode="pick" exercises={exerciseLibrary} initialPhase={targetPhase} canManage={Boolean(canManageClub)} onClose={closeExerciseDialog} onDetail={openExerciseDetail} onEdit={(item) => { setEditingExercise(item); setCreatorOpen(true); closeExerciseDialog(); }} onDelete={deleteLibraryExercise} onAdd={(item) => { addExercise(item, targetPhase); closeExerciseDialog(); }} onCreate={() => { setEditingExercise(null); setCreatorOpen(true); closeExerciseDialog(); }} /></aside></div>}
      {creatorOpen && <ExerciseCreator phase={targetPhase} exercise={editingExercise} onClose={() => { setCreatorOpen(false); setEditingExercise(null); }} onSave={saveExercise} />}
      {templateOpen && <TrainingTemplates mode={templateMode} plan={plan} templates={[...featuredTemplates, ...trainingTemplates]} onModeChange={setTemplateMode} onApply={applyTrainingTemplate} onSave={saveTrainingTemplate} onDelete={deleteTrainingTemplate} onToggleDefault={toggleDefaultPhase} onClose={() => setTemplateOpen(false)} />}

      {detail && (
        <div className="modal-backdrop exercise-detail-backdrop" onMouseDown={closeExerciseDialog}>
          <section className="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="exercise-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="detail-top"><div className="detail-badges"><span className="category-pill" style={{ "--accent": detail.accent } as React.CSSProperties}>{detail.category}</span><span className="age-detail-badge">{detail.ageGroup} · {detail.ageRange}</span></div><button className="icon-button" onClick={closeExerciseDialog} aria-label="Details schließen"><X /></button></div>
            <div className="detail-hero">
              <Pitch variant={detail.variant} caption={detail.title} label={`Aufbauskizze für ${detail.title}`} />
            </div>
            {youtubeEmbed(detail.youtubeUrl) && <div className="youtube-embed"><iframe src={youtubeEmbed(detail.youtubeUrl)!} title={`Video zu ${detail.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>}
            <div className="detail-content">
              <span className="eyebrow">ÜBUNGSDETAILS</span><h2 id="exercise-title">{detail.title}</h2><p className="detail-lead">{detail.description}</p>
              <div className="detail-stats"><span><Clock3 /><small>Dauer</small><strong>{detail.duration} Min</strong></span><span><Users /><small>Spieler</small><strong>{detail.players}</strong></span><span><CircleGauge /><small>Intensität</small><strong>{detail.intensity}</strong></span></div>
              <div className="focus-tags">{detail.focus.map((focus) => <span key={focus}>{focus}</span>)}</div>
              <div className="detail-section"><h3>Organisation</h3><p>{detail.setup}</p></div>
              <section className="kids-coaching"><header><span><MessageCircle /><strong>Kindgerechte Trainer-Kommandos</strong></span><figure className="kids-coaching-crew" title="NextSession Kids Crew"><img src={kidsCrewForExercise(detail).src} alt={kidsCrewForExercise(detail).alt} loading="lazy" /></figure></header><div className="kids-command-grid">{detail.coaching.slice(0, 3).map((point, index) => <article key={point}><span className="kids-command-number">{index + 1}</span><div><small>{index === 0 ? "STARTIMPULS" : index === 1 ? "IM SPIEL" : "BESTÄRKEN"}</small><strong>„{point.replace(/[.!?]+$/, "")}!“</strong><span><Target /> Ziel: {detail.focus[index % Math.max(detail.focus.length, 1)] ?? "Spielfreude"}</span></div></article>)}</div></section>
              <section className="trainer-cheatsheet"><article className="trainer-tip-cell"><span><Sparkles /> Trainer-Tipps</span><ul>{detail.coaching.slice(3).map((point) => <li key={point}>{point}</li>)}<li>Kurze Erklärung, viele Wiederholungen</li><li>Erfolge konkret und positiv benennen</li></ul></article><article><Clock3 /><span><small>Dauer</small><strong>{detail.duration} Min.</strong></span></article><article><Users /><span><small>Spielerzahl</small><strong>{detail.players}</strong></span></article><article><Boxes /><span><small>Material</small><strong>{detail.materials.map((material) => `${material.count} ${materialCatalog[material.id].name}`).join(" · ") || "Ohne Material"}</strong></span></article></section>
              {detail.variations?.length ? <div className="detail-section detail-variations"><h3>Varianten</h3><ul>{detail.variations.map((variation) => <li key={variation}><Sparkles />{variation}</li>)}</ul></div> : null}
            </div>
            <div className="detail-actions"><button className="secondary" onClick={closeExerciseDialog}>Schließen</button>{canManageClub && <button className="secondary" onClick={() => { setEditingExercise(detail); setCreatorOpen(true); closeExerciseDialog(); }}><Edit3 /> Bearbeiten</button>}{canManageClub && <button className="primary" onClick={() => { addExercise(detail); closeExerciseDialog(); }}><Plus /> Zum Training</button>}</div>
          </section>
        </div>
      )}

      {toastMessage && <div className="toast"><Check /> {toastMessage}</div>}
    </main>
  );
}
