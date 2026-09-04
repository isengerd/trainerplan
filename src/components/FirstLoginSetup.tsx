"use client";

import { useState } from "react";
import { ArrowRight, Building2, Check, Shield, Users } from "lucide-react";
import type { ClubUser } from "@/data/club";
import { FIRST_TEAM_AGE_GROUPS } from "@/lib/age-groups";

const AGE_GROUP_LABELS: Record<string, string> = {
  g2: "G2", g1: "G1", f2: "F2", f1: "F1", e2: "E2", e1: "E1", d2: "D2", d1: "D1",
  c2: "C2", c1: "C1", b2: "B2", b1: "B1", a2: "A2", a1: "A1",
};

export function FirstLoginSetup({ user, onComplete }: { user: ClubUser; onComplete: () => Promise<void> }) {
  const [form, setForm] = useState({ name: user.name === "Neuer Nutzer" ? "" : user.name, clubName: "", designation: "", ageGroup: "f1" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/v1/onboarding/club", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error || "Die Einrichtung konnte nicht gespeichert werden."); setLoading(false); return; }
    await onComplete();
  }

  return <main className="setup-page"><section className="setup-card"><div className="setup-mark"><Shield /></div><span className="standalone-kicker">WILLKOMMEN BEI NEXTSESSION KIDS!</span><h1>Richte deinen Verein ein.</h1><p className="setup-intro">Wähle deine erste Mannschaft. Die Altersklasse bleibt gespeichert und kann später mit deiner Mannschaft mitwachsen.</p><form onSubmit={submit}><label><span>Dein Name</span><input required maxLength={100} value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Vor- und Nachname" /></label><label><span>Vereinsname</span><div className="setup-input"><Building2 /><input required maxLength={120} value={form.clubName} onChange={(event) => set("clubName", event.target.value)} placeholder="z. B. FC Kicker" /></div></label><fieldset className="age-group-field"><legend>Erste Mannschaft</legend><div className="age-group-grid">{FIRST_TEAM_AGE_GROUPS.map((ageGroup) => <button key={ageGroup} type="button" className={form.ageGroup === ageGroup ? "age-group-option selected" : "age-group-option"} onClick={() => set("ageGroup", ageGroup)}>{AGE_GROUP_LABELS[ageGroup]}</button>)}</div><p className="field-help">Die Altersklasse deiner ersten Mannschaft.</p></fieldset><label><span>Zusatzbezeichnung <em>(optional)</em></span><div className="setup-input"><Users /><input maxLength={80} value={form.designation} onChange={(event) => set("designation", event.target.value)} placeholder="z. B. Blau oder Mädchen" /></div></label><p className="team-preview">Deine Mannschaft: <strong>{AGE_GROUP_LABELS[form.ageGroup]}{form.designation.trim() ? ` · ${form.designation.trim()}` : ""}</strong></p>{error && <div className="standalone-error">{error}</div>}<button className="standalone-submit" type="submit" disabled={loading}>{loading ? "Wird eingerichtet …" : <>Verein einrichten <ArrowRight /></>}</button><p className="setup-note"><Check /> Du wirst als Vereinsadmin angelegt.</p></form></section></main>;
}
