"use client";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import type { Exercise } from "@/data/demo";
import { createFieldSession, prepareFieldOffline, saveFieldSession, setFieldOwner, storedFieldSessions, type FieldSession } from "@/lib/field-mode";

export function FieldModeLauncher(props: { owner: string; teamId: string; teamName: string; date: string; title: string; players: number; exercises: Exercise[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<FieldSession | null>(null);
  useEffect(() => {
    try { setFieldOwner(props.owner); setSaved(storedFieldSessions().filter(s => s.teamId === props.teamId && s.date === props.date && !s.finished).sort((a, b) => b.updatedAt - a.updatedAt)[0] || null); } catch { /* Save will explain unsupported storage. */ }
  }, [props.owner, props.teamId, props.date]);
  async function open(resume: boolean) {
    setBusy(true); setError("");
    try {
      setFieldOwner(props.owner);
      const session = resume && saved ? saved : createFieldSession(props);
      saveFieldSession(session);
      const offlineReady = await prepareFieldOffline();
      saveFieldSession({ ...session, offlineReady });
      window.location.assign(`/platz?session=${encodeURIComponent(session.id)}`);
    } catch { setError("Der Plan konnte nicht auf diesem Gerät gespeichert werden. Bitte prüfe den verfügbaren Browserspeicher."); setBusy(false); }
  }
  return <div className="field-launch"><button type="button" className="field-launch-button" disabled={busy || !props.exercises.length} onClick={() => void open(Boolean(saved))}><Play size={20} />{busy ? "Wird für den Platz gespeichert …" : saved ? "Training fortsetzen" : "Training starten"}</button>{saved && !busy && <button type="button" className="field-launch-reset" onClick={() => void open(false)}>Mit aktuellem Plan neu starten</button>}<small>{error || "Großer Timer, klare Coachingpunkte – dein Plan kommt mit auf den Platz."}</small></div>;
}
