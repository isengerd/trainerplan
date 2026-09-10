"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, ClipboardCheck, Clock3, Dumbbell, MapPin, MoreHorizontal, Sparkles, Trophy, Users, X } from "lucide-react";
import type { ClubEvent } from "@/data/club";
import { attendanceCounts, berlinDateKey, eventHasEnded, getWeek, preparationTasks, trainingIdea, trainingTitle, type DashboardInput, type PreparationTask } from "@/lib/weekly-dashboard";

type Props = DashboardInput & {
  firstName: string;
  teamName: string;
  ageGroup: string;
  onOpenPlan: (date: string) => void;
  onOpenEvent: (id: string) => void;
  onOpenSquads: (id: string) => void;
  onOpenCalendar: () => void;
  onOpenTeam: () => void;
  onBrowseExercises: (date: string) => void;
  onDeleteEvent: (event: ClubEvent) => void;
};

const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) => new Date(`${date}T12:00:00Z`).toLocaleDateString("de-DE", { ...options, timeZone: "UTC" });
const eventLabel = (event: ClubEvent) => event.type === "training" ? "Training" : event.type === "match" ? "Spiel" : event.type === "tournament" ? /spielfest|festival/i.test(event.title) ? "Spielfest" : "Turnier" : "Teamtermin";

export function WeeklyDashboard(props: Props) {
  const { events, users, plans, planMeta, tournamentPlans, settings } = props;
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [taskLimit, setTaskLimit] = useState(3);
  const [menuEventId, setMenuEventId] = useState<string | null>(null);
  const swipeStart = useRef<{ id: string; x: number; y: number } | null>(null);
  const todayHeading = useRef<HTMLHeadingElement>(null);
  const taskHeading = useRef<HTMLHeadingElement>(null);
  const today = berlinDateKey(now);
  const week = getWeek(today);
  const young = /^[gfe]/i.test(props.ageGroup);
  const sortedEvents = [...events].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  const weekEvents = sortedEvents.filter((event) => event.date >= week.start && event.date <= week.end);
  const remaining = weekEvents.filter((event) => !event.cancelledAt && !eventHasEnded(event, now));
  const todayEvents = weekEvents.filter((event) => event.date === today);
  const laterEvents = weekEvents.filter((event) => event.date > today);
  const tasks = preparationTasks(props, weekEvents, now);
  const counts = remaining.map((event) => attendanceCounts(event, users));
  const unanswered = settings.attendanceEnabled ? counts.reduce((sum, count) => sum + count.unanswered, 0) : 0;
  const uncertain = settings.attendanceEnabled ? counts.reduce((sum, count) => sum + count.maybe, 0) : 0;
  const preparation = tasks.filter((task) => task.kind !== "responses");
  const hasPlayers = users.some((user) => user.role === "player");
  const nextTraining = remaining.find((event) => event.type === "training");
  const idea = trainingIdea(nextTraining, weekEvents, young, nextTraining ? planMeta[nextTraining.date] : undefined);
  const todayTraining = todayEvents.find((event) => event.type === "training" && !event.cancelledAt);
  const ideaTraining = todayTraining ?? sortedEvents.find((event) => event.type === "training" && event.date > today && !event.cancelledAt);
  const dailyIdea = trainingIdea(ideaTraining, weekEvents, young, ideaTraining ? planMeta[ideaTraining.date] : undefined);
  const dailyIdeaDate = ideaTraining?.date ?? today;
  const displayedEvents = selectedDate ? weekEvents.filter((event) => event.date === selectedDate) : laterEvents;
  const nextEvent = sortedEvents.find((event) => event.date > today && !event.cancelledAt);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hourCycle: "h23" }).format(now));
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const reviewed = remaining.length > 0 && hasPlayers && !preparation.length;

  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  useEffect(() => { setSelectedDate(null); setTaskLimit(3); setMenuEventId(null); }, [props.teamName, week.start]);

  function openTask(task: PreparationTask) {
    if (task.action === "plan") props.onOpenPlan(task.date);
    else if (task.action === "squads") props.onOpenSquads(task.eventId);
    else props.onOpenEvent(task.eventId);
  }

  function attendance(event: ClubEvent) {
    if (!settings.attendanceEnabled || event.cancelledAt) return null;
    const count = attendanceCounts(event, users);
    if (!count.total) return <span className="coach-week-muted">Noch keine Spieler im Kader</span>;
    return <span className="coach-week-attendance"><span><Users size={15} /><strong>{count.yes} von {count.total}</strong> {event.autoSetPlayersPresent ? "eingeplant" : "zugesagt"}</span><span>{count.unanswered > 0 ? `${count.unanswered} ohne Antwort` : "Keine unbeantworteten Rückmeldungen"}{count.maybe > 0 && ` · ${count.maybe} unsicher`}{count.no > 0 && ` · ${count.no} abgesagt`}</span></span>;
  }

  function status(event: ClubEvent) {
    if (event.cancelledAt) return { text: "Abgesagt", tone: "cancelled" };
    if (eventHasEnded(event, now)) return { text: "Vorbei", tone: "neutral" };
    if (event.type === "training") return plans[event.date]?.length ? { text: "Plan vorhanden", tone: "ready" } : { text: "Training noch nicht geplant", tone: "open" };
    if (event.type === "tournament") {
      const task = tasks.find((item) => item.eventId === event.id && item.kind === "squad");
      if (task) return { text: task.title, tone: "open" };
      return { text: tournamentPlans.find((item) => item.eventId === event.id)?.publishedAt ? "Einteilung freigegeben" : "Einteilung offen", tone: "neutral" };
    }
    return event.location.trim() ? null : { text: "Ort noch offen", tone: "open" };
  }

  function primaryAction(event: ClubEvent) {
    if (event.type === "training") props.onOpenPlan(event.date);
    else if (event.type === "tournament") props.onOpenSquads(event.id);
    else props.onOpenEvent(event.id);
  }

  function eventCard(event: ClubEvent, featured = false) {
    const state = status(event);
    const ended = eventHasEnded(event, now);
    const training = event.type === "training";
    const eventTasks = tasks.filter((task) => task.eventId === event.id && task.kind !== "responses");
    const coaches = (event.trainerIds ?? []).map((id) => users.find((user) => user.id === id)).filter(Boolean);
    return <article key={event.id} className={`coach-week-event ${featured ? "featured" : ""} ${event.cancelledAt ? "cancelled" : ""}`} onTouchStart={(e) => { const touch = e.touches[0]; swipeStart.current = { id: event.id, x: touch.clientX, y: touch.clientY }; }} onTouchEnd={(e) => {
      const start = swipeStart.current;
      const touch = e.changedTouches[0];
      swipeStart.current = null;
      if (!start || start.id !== event.id || Math.abs(touch.clientX - start.x) <= Math.abs(touch.clientY - start.y) || Math.abs(touch.clientX - start.x) < 48) return;
      setMenuEventId(touch.clientX < start.x ? event.id : null);
    }}>
      <div className="coach-week-event-top"><span className={`coach-week-type ${event.type}`}>{training ? <Dumbbell size={15} /> : event.type === "event" ? <CalendarDays size={15} /> : <Trophy size={15} />}{eventLabel(event)}{!featured && ` · ${dateLabel(event.date)}`}</span><button type="button" className="coach-week-menu-toggle" aria-label={`Aktionen für ${event.title}`} aria-expanded={menuEventId === event.id} onClick={() => setMenuEventId(menuEventId === event.id ? null : event.id)}><MoreHorizontal size={19} /></button></div>
      {menuEventId === event.id && <div className="coach-week-event-menu"><button type="button" onClick={() => { setMenuEventId(null); props.onOpenEvent(event.id); }}>Details öffnen</button><button type="button" onClick={() => { setMenuEventId(null); props.onDeleteEvent(event); }}>Löschen</button><button type="button" aria-label="Aktionen schließen" onClick={() => setMenuEventId(null)}><X size={16} /></button></div>}
      <button type="button" className="coach-week-event-title coach-week-card-link" aria-label={`${event.title}: Details öffnen`} onClick={() => props.onOpenEvent(event.id)}><h3>{trainingTitle(event, planMeta[event.date])}</h3><ChevronRight size={18} /></button>
      <div className="coach-week-logistics"><span><Clock3 size={15} />{event.startTime}–{event.endTime} Uhr</span><span><MapPin size={15} />{event.location.trim() || "Ort noch offen"}</span></div>
      {event.meetingTime && event.meetingTime !== event.startTime && <p className="coach-week-meeting">Treffen um {event.meetingTime} Uhr</p>}
      {attendance(event)}
      <div className="coach-week-state-line">{state && <span className={`coach-week-state ${state.tone}`}><i />{state.text}</span>}{featured && coaches.length > 0 && <span className="coach-week-muted">Mit {coaches.map((coach) => coach!.name).join(" & ")}</span>}{!featured && eventTasks.length > 0 && <span className="coach-week-muted">{eventTasks.length} {eventTasks.length === 1 ? "Vorbereitungspunkt" : "Vorbereitungspunkte"} offen</span>}</div>

      {featured && !event.cancelledAt && !ended && <div className="coach-week-event-actions"><button type="button" className="coach-week-primary" onClick={() => primaryAction(event)}>{training ? plans[event.date]?.length ? "Trainingsplan öffnen" : "Training planen" : event.type === "tournament" ? "Mannschaften öffnen" : "Details öffnen"}<ArrowRight size={16} /></button>{settings.attendanceEnabled && <button type="button" className="coach-week-text-button" onClick={() => props.onOpenEvent(event.id)}>Rückmeldungen ansehen</button>}</div>}
    </article>;
  }

  return <section className="coach-week" aria-label="Deine Trainingswoche">
    <header className="coach-week-header"><div><span className="eyebrow">{greeting}, {props.firstName}</span><h1>Deine Trainingswoche</h1><p>{props.teamName} · KW {week.number} <span>· {weekEvents.length} {weekEvents.length === 1 ? "Termin" : "Termine"}</span></p></div><button type="button" className="coach-week-calendar" onClick={props.onOpenCalendar}><CalendarDays size={17} /><span>Kalender</span></button></header>

    <nav className="coach-week-days" aria-label="Wochentag auswählen">{week.days.map((day) => {
      const dayEvents = weekEvents.filter((event) => event.date === day.key);
      return <button type="button" key={day.key} className={`${day.key === today ? "today" : ""} ${day.key === selectedDate ? "selected" : ""}`} aria-current={day.key === today ? "date" : undefined} aria-pressed={day.key === selectedDate} aria-label={`${dateLabel(day.key, { weekday: "long", day: "numeric", month: "long" })}, ${dayEvents.length} Termine${day.key === today ? ", heute" : ""}`} onClick={() => {
        if (day.key === today) { setSelectedDate(null); todayHeading.current?.focus(); todayHeading.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
        else setSelectedDate(selectedDate === day.key ? null : day.key);
      }}><span>{dateLabel(day.key, { weekday: "short" }).replace(".", "")}</span><strong>{day.date.getUTCDate()}</strong><i aria-hidden="true">{dayEvents.slice(0, 3).map((event) => <b key={event.id} className={`${event.type} ${event.cancelledAt ? "cancelled" : ""}`} />)}</i></button>;
    })}</nav>

    <section className="coach-week-today" aria-labelledby="coach-today-heading"><div className="coach-week-section-heading"><div><span className="eyebrow">DAS STEHT JETZT AN</span><h2 ref={todayHeading} tabIndex={-1} id="coach-today-heading">Heute{todayEvents.length ? `, ${dateLabel(today, { weekday: "long" })}` : " ist frei"}</h2></div><time dateTime={today}>{dateLabel(today, { day: "numeric", month: "short" })}</time></div>
      {todayEvents.map((event) => eventCard(event, true))}
      {!todayEvents.length && <div className="coach-week-free coach-week-linked-card"><span className="coach-week-free-icon"><Check size={23} /></span><div><h3>Heute steht nichts im Kalender.</h3><p>{nextEvent ? `Weiter geht’s am ${dateLabel(nextEvent.date)} mit „${trainingTitle(nextEvent, planMeta[nextEvent.date])}“.` : "Zeit zum Durchatmen. Neue Trainings und Spiele erscheinen hier."}</p><button type="button" className="coach-week-text-button coach-week-card-link" onClick={() => nextEvent ? props.onOpenEvent(nextEvent.id) : props.onOpenCalendar()}>{nextEvent ? `Nächstes ${eventLabel(nextEvent) === "Training" ? "Training" : "Ereignis"} ansehen` : "Kalender öffnen"} <ArrowRight size={15} /></button></div></div>}
      <button type="button" className="coach-week-daily-idea" onClick={() => props.onOpenPlan(dailyIdeaDate)} aria-label={`Spielidee für heute: ${dailyIdea.title}. ${ideaTraining && ideaTraining.date !== today ? `Zum Training am ${dateLabel(dailyIdeaDate)}` : "Zum Training"}`}>
        <Sparkles className="coach-week-daily-spark" aria-hidden="true" />
        <span className="coach-week-daily-copy"><span>SPIELIDEE FÜR HEUTE</span><strong>{dailyIdea.title}</strong><small>{dailyIdea.text}</small>{ideaTraining && ideaTraining.date !== today && <em>Für dein nächstes Training am {dateLabel(dailyIdeaDate)}</em>}</span>
        <span className="coach-week-daily-cta">Zum Training <ArrowRight size={16} /></span>
      </button>
    </section>

    <section className={`coach-week-readiness coach-week-linked-card ${reviewed ? "ready" : ""}`} aria-label="Vorbereitung für den Rest der Woche"><span className="coach-week-readiness-icon"><ClipboardCheck size={24} /></span><div><span className="eyebrow">VORBEREITUNG DIESER WOCHE</span><h2>{!remaining.length ? "Für diese Woche steht nichts mehr an" : !hasPlayers ? "Dein Kader fehlt noch" : preparation.length ? `Noch ${preparation.length} ${preparation.length === 1 ? "Vorbereitungspunkt" : "Vorbereitungspunkte"} offen` : "Die Vorbereitung steht"}</h2><p>{!remaining.length ? "Neue Aufgaben erscheinen mit dem nächsten Training oder Spiel." : !hasPlayers ? "Ergänze deine Spieler, damit Rückmeldungen und Einteilungen aussagekräftig sind." : preparation.length ? "Pläne, Orte, Verantwortliche und Einteilungen im Blick." : "Pläne vorhanden, Orte und Verantwortliche hinterlegt; Einteilungen geprüft."}</p>{remaining.length > 0 && hasPlayers && settings.attendanceEnabled && <p className="coach-week-response-note">{unanswered + uncertain ? `${unanswered} Antworten stehen aus${uncertain ? ` · ${uncertain} Rückmeldungen noch unsicher` : ""}.` : "Alle Rückmeldungen liegen vor."}</p>}</div>{remaining.length > 0 && (!hasPlayers ? <button type="button" className="coach-week-card-link" onClick={props.onOpenTeam}>Kader ergänzen <ArrowRight size={16} /></button> : tasks.length > 0 ? <button type="button" className="coach-week-card-link" onClick={() => { taskHeading.current?.focus(); taskHeading.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Offene Punkte <ArrowRight size={16} /></button> : <button type="button" className="coach-week-card-link" onClick={props.onOpenCalendar}>Woche ansehen <ArrowRight size={16} /></button>)}{!remaining.length && <button type="button" className="coach-week-card-link" onClick={props.onOpenCalendar}>Kalender öffnen <ArrowRight size={16} /></button>}</section>

    <div className="coach-week-columns"><section className="coach-week-agenda" aria-labelledby="coach-agenda-heading"><div className="coach-week-section-heading"><div><span className="eyebrow">DEIN WOCHENPLAN</span><h2 id="coach-agenda-heading">{selectedDate ? dateLabel(selectedDate, { weekday: "long", day: "numeric", month: "short" }) : "Als Nächstes diese Woche"}</h2></div>{selectedDate && <button type="button" className="coach-week-text-button" onClick={() => setSelectedDate(null)}>Zurück <X size={14} /></button>}</div><div aria-live="polite">{displayedEvents.map((event) => eventCard(event))}{!displayedEvents.length && <div className="coach-week-empty coach-week-linked-card"><CalendarDays size={22} /><p>{selectedDate ? "Für diesen Tag ist nichts eingetragen." : "Für den Rest der Woche ist nichts weiter eingetragen."}</p><button type="button" className="coach-week-text-button coach-week-card-link" onClick={props.onOpenCalendar}>Kalender öffnen <ArrowRight size={15} /></button></div>}</div></section>

    <aside className="coach-week-sidebar"><section className="coach-week-tasks" aria-labelledby="coach-tasks-heading"><div className="coach-week-section-heading"><div><span className="eyebrow">DEIN NÄCHSTER SCHRITT</span><h2 ref={taskHeading} tabIndex={-1} id="coach-tasks-heading">{tasks.length ? "Das braucht dich noch" : "Keine offenen Aufgaben"}</h2></div>{tasks.length > 0 && <span className="coach-week-count">{tasks.length}</span>}</div>{tasks.slice(0, taskLimit).map((task) => <button type="button" key={task.id} className="coach-week-task" onClick={() => openTask(task)}><span className={`coach-week-task-dot ${task.urgent ? "urgent" : ""}`} /><span><small>{dateLabel(task.date)}{task.urgent ? " · Zeitnah" : ""}</small><strong>{task.title}</strong><em>{task.detail}</em><b>{task.label} <ArrowRight size={13} /></b></span></button>)}{!tasks.length && <p className="coach-week-task-empty">{!remaining.length ? "Genieß die freie Zeit. Hier meldet sich die nächste Vorbereitung." : "Aktuell musst du nichts nacharbeiten. Ausstehende Rückmeldungen werden nahe an der Frist hier sichtbar."}</p>}{tasks.length > 3 && <button type="button" className="coach-week-more" onClick={() => setTaskLimit(taskLimit >= tasks.length ? 3 : tasks.length)}>{taskLimit >= tasks.length ? "Weniger anzeigen" : `${tasks.length - taskLimit} weitere Aufgaben anzeigen`}</button>}</section>

    {nextTraining && nextTraining.date !== dailyIdeaDate && <section className="coach-week-idea coach-week-linked-card"><div className="coach-week-idea-label"><Sparkles size={17} /><span>{idea.planned ? "DEIN GEPLANTER SCHWERPUNKT" : "SPIELIDEE FÜR DEINE WOCHE"}</span></div><h2>{idea.title}</h2><p>{idea.text}</p><details><summary>{idea.planned ? "Woher kommt der Schwerpunkt?" : "Warum diese Idee?"}</summary><p>{idea.reason}</p>{!idea.planned && young && <a href="https://www.dfb-akademie.de/trainingspraxis/-/id-11011534" target="_blank" rel="noreferrer">Grundgedanke: kleine Spielformen · DFB-Akademie</a>}</details><button type="button" className="coach-week-card-link" onClick={() => props.onBrowseExercises(nextTraining.date)}>Übungen für {dateLabel(nextTraining.date, { weekday: "short" })} auswählen <ArrowRight size={16} /></button></section>}
    </aside></div>
  </section>;
}
