"use client";

import { useEffect, useRef, useState } from "react";
import type { ClubEvent } from "@/data/club";
import type { EventDeleteScope } from "@/lib/event-series";

type Props = {
  event: ClubEvent;
  followingCount: number;
  pending: boolean;
  error: string;
  onClose: () => void;
  onDelete: (scope: EventDeleteScope) => void;
};

export function EventDeleteDialog({ event, followingCount, pending, error, onClose, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [scope, setScope] = useState<EventDeleteScope>("single");
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={dialogRef} className="event-delete-dialog" aria-labelledby="delete-event-title" aria-describedby="delete-event-description" onCancel={(e) => { e.preventDefault(); if (!pending) onClose(); }}>
    <form onSubmit={(e) => { e.preventDefault(); if (!pending) onDelete(scope); }}>
      <h2 id="delete-event-title">{event.seriesId ? "Serientermin löschen" : "Termin löschen"}</h2>
      <p id="delete-event-description"><strong>{event.title}</strong><br />{new Date(`${event.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {event.startTime} Uhr</p>
      {event.seriesId && <fieldset disabled={pending}>
        <legend>Welche Termine möchtest du löschen?</legend>
        <label><input type="radio" name="delete-scope" value="single" checked={scope === "single"} onChange={() => setScope("single")} /><span><strong>Nur diesen Termin</strong><small>Alle anderen Termine der Serie bleiben erhalten.</small></span></label>
        <label><input type="radio" name="delete-scope" value="following" checked={scope === "following"} onChange={() => setScope("following")} /><span><strong>Diesen und alle folgenden Termine</strong><small>{followingCount} {followingCount === 1 ? "Termin" : "Termine"} ab diesem Datum. Frühere Termine bleiben erhalten.</small></span></label>
      </fieldset>}
      <p className="event-delete-warning">Das Löschen kann nicht rückgängig gemacht werden.</p>
      {error && <p role="alert" className="event-delete-error">{error}</p>}
      <footer><button type="button" autoFocus disabled={pending} onClick={onClose}>Abbrechen</button><button type="submit" className="event-delete-confirm" disabled={pending}>{pending ? "Wird gelöscht …" : scope === "following" && followingCount > 1 ? `${followingCount} Termine löschen` : "Termin löschen"}</button></footer>
    </form>
  </dialog>;
}
