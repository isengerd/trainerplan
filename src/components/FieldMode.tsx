"use client";

import { useEffect, useRef, useState } from "react";
import { Pitch } from "./Pitch";
import { materialCatalog } from "@/data/demo";
import { pauseTimer, readFieldSession, remainingTime, saveFieldSession, syncFieldFeedback, type FieldSession } from "@/lib/field-mode";
import { ArrowLeft, Check, Pause, Play, Plus, Users, WifiOff, Maximize2 } from "lucide-react";

const labels = ["😕 Schwierig", "🙂 Gut", "🤩 Richtig gut"];
export function FieldMode() {
  const [session, setSession] = useState<FieldSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState("");
  const [last, setLast] = useState<number | null>(null);
  const [undo, setUndo] = useState<FieldSession | null>(null);
  const [zoom, setZoom] = useState(false);
  const [changePlayers, setChangePlayers] = useState(false);
  const [playerDraft, setPlayerDraft] = useState("");
  const [syncing, setSyncing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const live = useRef(session); live.current = session;
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const syncBusy = useRef(false);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("session") || "";
    setSession(readFieldSession(id)); setLoaded(true);
    const tick = () => { setNow(Date.now()); setOffline(!navigator.onLine); };
    tick(); const timer = setInterval(tick, 1000);
    window.addEventListener("online", tick); window.addEventListener("offline", tick);
    const storage = () => { if (!readFieldSession(id)) setSession(null); };
    window.addEventListener("storage", storage);
    return () => { clearInterval(timer); window.removeEventListener("online", tick); window.removeEventListener("offline", tick); window.removeEventListener("storage", storage); };
  }, []);
  useEffect(() => {
    if (!session) return;
    try { saveFieldSession(session); }
    catch { setMessage("Speichern auf diesem Gerät klappt gerade nicht. Lass die Ansicht geöffnet."); }
  }, [session]);
  useEffect(() => { if (zoom) dialog.current?.showModal(); else dialog.current?.close(); }, [zoom]);
  useEffect(() => {
    if (!session?.started || session.finished || session.endAt === null) return;
    let cancelled = false;
    let lock: { release: () => Promise<void> } | undefined;
    const acquire = async () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      try { const result = await navigator.wakeLock?.request("screen"); if (cancelled) await result?.release(); else lock = result; } catch { /* Optional device support. */ }
    };
    void acquire(); document.addEventListener("visibilitychange", acquire);
    return () => { cancelled = true; void lock?.release(); document.removeEventListener("visibilitychange", acquire); };
  }, [session?.started, session?.finished, session?.endAt]);
  useEffect(() => {
    if (!offline && session && Object.values(session.ratings).some(r => !r.synced)) void sync();
    // Retry on connectivity changes; explicit retry is available after a failure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, session?.ratings]);

  async function sync() {
    const value = live.current;
    if (!value || syncBusy.current || !navigator.onLine) return;
    syncBusy.current = true; setSyncing(true);
    try {
      const synced = await syncFieldFeedback(value);
      setSession(current => {
        if (!current || current.id !== value.id) return current;
        const ratings = { ...current.ratings };
        for (const [id, rating] of Object.entries(synced)) if (ratings[id]?.revision === rating.revision) ratings[id] = rating;
        return { ...current, ratings };
      });
      setMessage("Bewertungen synchronisiert.");
    } catch (error) { setMessage(error instanceof TypeError ? "Gerade keine Verbindung zum Server. Deine Bewertungen bleiben auf diesem Gerät." : error instanceof Error ? error.message : "Bewertungen bleiben auf diesem Gerät."); }
    finally { syncBusy.current = false; setSyncing(false); }
  }
  function advance(skip = false) {
    if (!session) return;
    setUndo(pauseTimer(session)); setLast(skip ? null : session.index);
    const index = session.index + 1;
    setSession({ ...session, skipped: skip ? [...new Set([...session.skipped, session.exercises[session.index].id])] : session.skipped, index: Math.min(index, session.exercises.length - 1), finished: index >= session.exercises.length, endAt: null, remaining: index < session.exercises.length ? session.exercises[index].duration * 60000 : 0 });
    setNow(Date.now()); heading.current?.focus(); window.scrollTo({ top: 0 });
  }
  function rate(index: number, rating: number, reason?: string) {
    if (!session) return;
    const id = session.exercises[index].id;
    setSession({ ...session, ratings: { ...session.ratings, [id]: { rating, reason, revision: crypto.randomUUID(), synced: false } } });
  }
  function feedback(index: number) {
    if (!session) return null;
    const exercise = session.exercises[index]; const rating = session.ratings[exercise.id];
    return <section className="field-feedback" aria-label={`Bewertung für ${exercise.title}`}><p><strong>Wie lief’s?</strong> {exercise.title}</p><div>{labels.map((label, i) => <button key={label} aria-pressed={rating?.rating === i + 1} onClick={() => rate(index, i + 1)}>{label}</button>)}</div>{rating?.rating === 1 && <div aria-label="Optionaler Grund">{["Zu schwer", "Zu viel Warten", "Aufbau aufwendig"].map(reason => <button key={reason} aria-pressed={rating.reason === reason} onClick={() => rate(index, 1, reason)}>{reason}</button>)}</div>}</section>;
  }
  if (!loaded) return <main className="field-mode"><p>Dein Training wird geladen …</p></main>;
  if (!session) return <main className="field-mode"><h1>Hier ist noch kein Training gespeichert.</h1><p>Öffne deinen Trainingsplan mit Verbindung und tippe auf „Training starten“.</p><a href="/app">Zur Trainingsplanung</a></main>;
  const exercise = session.exercises[session.index];
  const time = remainingTime(session, now);
  const seconds = Math.floor(Math.abs(time) / 1000);
  const clock = `${time < 0 ? "+" : ""}${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const pending = Object.values(session.ratings).some(r => !r.synced);
  const totalRemaining = Math.max(0, time) + session.exercises.slice(session.index + 1).reduce((sum, item) => sum + item.duration * 60000, 0);
  return <main className="field-mode">
    <header className="field-top"><a href="/app" aria-label="Platzmodus verlassen"><ArrowLeft size={20} /></a><span><strong>PLATZMODUS</strong><small>{session.teamName} · {new Date(`${session.date}T12:00:00`).toLocaleDateString("de-DE")}</small></span><span className="field-connection">{offline ? <><WifiOff size={17} /> Offline</> : <><Check size={17} /> Auf dem Gerät</>}</span></header>
    {!session.offlineReady && <p className="field-status">Der Plan ist gespeichert. Lass diese Ansicht ohne Verbindung geöffnet – Offline-Neustart ist auf diesem Gerät noch nicht verfügbar.</p>}
    {!session.finished && <><div className="field-progress" aria-label={`Übung ${session.index + 1} von ${session.exercises.length}`}>{session.exercises.map((item, i) => <i key={item.id} className={i <= session.index ? "done" : ""} />)}</div>
    <section onTouchStart={event => {
      const touch = event.touches[0];
      if (event.touches.length !== 1 || touch.clientX < 32 || touch.clientX > innerWidth - 32 || (event.target as Element).closest("button, a, input, details, dialog")) return;
      swipe.current = { x: touch.clientX, y: touch.clientY };
    }} onTouchEnd={event => {
      const start = swipe.current; swipe.current = null;
      if (!start || event.changedTouches.length !== 1 || !session.started) return;
      const dx = event.changedTouches[0].clientX - start.x; const dy = event.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) < 90 || Math.abs(dy) > Math.abs(dx) / 2) return;
      if (dx < 0) advance(); else if (undo) { setSession({ ...undo, ratings: session.ratings, players: session.players }); setUndo(null); setLast(null); }
    }}>
      <p className="field-eyebrow">{session.started ? exercise.category : "DEIN TRAINING LIEGT BEREIT"} · {session.index + 1}/{session.exercises.length}</p>
      <h1 ref={heading} tabIndex={-1}>{exercise.title}</h1>
      <button className="field-sketch" onClick={() => setZoom(true)} aria-label="Aufbauskizze vergrößern"><Pitch variant={exercise.variant} caption={exercise.fieldSize} /><span><Maximize2 size={17} /> Aufbau ansehen</span></button>
      <div className={`field-clock ${time < 0 ? "overtime" : ""}`}><span>{session.endAt === null ? session.started ? "PAUSE · DU GIBST DAS TEMPO VOR" : "GEPLANTE ÜBUNGSZEIT" : time < 0 ? "LÄUFT GERADE GUT? SPIELT WEITER." : "ZEIT FÜR DIESE ÜBUNG"}</span><strong role="timer" aria-label={`${clock} Minuten und Sekunden`}>{clock}</strong><div><button className="field-primary" onClick={() => setSession(session.endAt === null ? { ...session, started: true, endAt: Date.now() + session.remaining } : pauseTimer(session))}>{session.endAt === null ? <Play size={20} /> : <Pause size={20} />}{session.endAt !== null ? "Pause" : session.started ? "Weiter geht’s" : "Los geht’s"}</button><button onClick={() => setSession({ ...session, remaining: session.remaining + 120000, endAt: session.endAt === null ? null : session.endAt + 120000 })}><Plus size={18} /> 2 Minuten</button></div><small>Noch etwa {Math.ceil(totalRemaining / 60000)} Minuten im Plan</small></div>
      <section className="field-coaching"><h2>Darauf achten</h2><ul>{exercise.coaching.slice(0, 3).map((point, i) => <li key={i}><span>{i + 1}</span>{point}</li>)}</ul></section>
      <details className="field-details"><summary>Aufbau & Material</summary><p>{exercise.setup}</p><ul>{exercise.materials.map(m => <li key={m.id}>{m.count} {materialCatalog[m.id].name}</li>)}</ul><p>{exercise.description}</p></details>
      {!session.started && <details className="field-details"><summary>Material für das ganze Training</summary><ul>{Object.entries(materialCatalog).map(([id, info]) => { const count = Math.max(...session.exercises.map(e => e.materials.find(m => m.id === id)?.count || 0)); return count ? <li key={id}>{count} {info.name}</li> : null; })}</ul><p>Material kann zwischen den Übungen wiederverwendet werden.</p></details>}
    </section>
    <button className="field-player-button" onClick={() => { setPlayerDraft(String(session.players)); setChangePlayers(!changePlayers); }}><Users size={19} /> {session.players} Spieler · Anzahl ändern</button>
    {changePlayers && <form className="field-player-form" onSubmit={e => { e.preventDefault(); const players = Number(playerDraft); if (!Number.isInteger(players) || players < 1 || players > 100) return; setSession({ ...session, players }); setChangePlayers(false); }}><label>Wie viele sind dabei?<input type="number" inputMode="numeric" min="1" max="100" required value={playerDraft} onChange={e => setPlayerDraft(e.target.value)} /></label><p>Diese Übung ist für {exercise.players} gedacht. Prüfe Gruppen und Wartezeiten – der Aufbau wird nicht automatisch verändert.</p><button type="submit">Anzahl übernehmen</button></form>}
    {last !== null && feedback(last)}
    <footer className="field-controls"><span>{session.index + 1 < session.exercises.length ? `Danach: ${session.exercises[session.index + 1].title}` : "Letzte Übung · guter Einsatz!"}</span><button className="field-primary" onClick={() => advance()}>{session.index + 1 < session.exercises.length ? "Nächste Übung" : "Training abschließen"}</button><div><button onClick={() => advance(true)}>Überspringen</button>{undo && <button onClick={() => { setSession({ ...undo, ratings: session.ratings, players: session.players }); setUndo(null); setLast(null); }}>Rückgängig</button>}</div></footer></>}
    {session.finished && <section className="field-finish"><span className="field-eyebrow">ABPFIFF FÜR HEUTE</span><h1 ref={heading} tabIndex={-1}>Guter Einsatz!</h1><p>{session.title} ist durch. Welche Spiele haben gezündet? Deine Rückmeldung ist freiwillig.</p>{session.exercises.map((e, index) => <div key={e.id}>{session.skipped.includes(e.id) ? <p>Übersprungen: {e.title}</p> : feedback(index)}</div>)}<a className="field-primary" href="/app">Zurück zur Mannschaft</a>{undo && <button onClick={() => { setSession({ ...undo, ratings: session.ratings, players: session.players }); setUndo(null); }}>Zur letzten Übung</button>}</section>}
    <p className="field-status" role="status">{message || (pending ? "Bewertungen auf diesem Gerät gespeichert. Synchronisierung bei Verbindung." : "Fortschritt wird auf diesem Gerät gespeichert.")}</p>
    {pending && !offline && <button disabled={syncing} onClick={() => void sync()}>{syncing ? "Wird synchronisiert …" : "Bewertungen synchronisieren"}</button>}
    <dialog ref={dialog} className="field-dialog" onCancel={() => setZoom(false)} onClick={e => { if (e.target === e.currentTarget) setZoom(false); }}><button onClick={() => setZoom(false)}>Schließen</button><h2>{exercise.title}</h2><Pitch variant={exercise.variant} caption={exercise.fieldSize} /><p>{exercise.setup}</p></dialog>
  </main>;
}
