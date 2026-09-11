"use client";

import { useEffect, useRef, useState } from "react";

export function PlayerRemoveDialog({ name, onClose, onRemove }: { name: string; onClose: () => void; onRemove: () => Promise<void> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function remove() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await onRemove();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Spieler konnte nicht entfernt werden.");
      setPending(false);
    }
  }

  return <dialog ref={dialogRef} className="event-delete-dialog player-remove-dialog" aria-labelledby="remove-player-title" aria-describedby="remove-player-description" onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }}>
    <form onSubmit={(event) => { event.preventDefault(); void remove(); }}>
      <h2 id="remove-player-title">Spieler aus Mannschaft entfernen?</h2>
      <div id="remove-player-description">
        <p>Bist du sicher, dass du <strong>{name}</strong> aus dieser Mannschaft entfernen möchtest?</p>
        <p>Künftige Zusagen und Einteilungen in dieser Mannschaft werden entfernt. Das Spielerprofil, Elternkonten und bisherige Daten bleiben erhalten.</p>
      </div>
      {error && <p role="alert" className="event-delete-error">{error}</p>}
      <footer><button type="button" autoFocus disabled={pending} onClick={onClose}>Abbrechen</button><button type="submit" className="event-delete-confirm" disabled={pending}>{pending ? "Wird entfernt …" : "Spieler entfernen"}</button></footer>
    </form>
  </dialog>;
}
