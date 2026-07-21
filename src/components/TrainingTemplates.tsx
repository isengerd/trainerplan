"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BookmarkPlus, Check, Clock3, Layers3, Pin, Sparkles, Target, Trash2, X } from "lucide-react";
import type { Exercise } from "@/data/demo";

export type TrainingTemplate = {
  id: string;
  name: string;
  kind: "plan" | "phase";
  phase?: Exercise["category"];
  focus: string[];
  exercises: Exercise[];
  autoApply?: boolean;
  builtIn?: boolean;
};

type Props = {
  mode: "browse" | "save";
  plan: Exercise[];
  templates: TrainingTemplate[];
  onModeChange: (mode: "browse" | "save") => void;
  onApply: (template: TrainingTemplate) => void;
  onSave: (template: TrainingTemplate) => void;
  onDelete: (id: string) => void;
  onToggleDefault: (id: string) => void;
  onClose: () => void;
};

const phases: Exercise["category"][] = ["Ankommen", "Einstieg", "Hauptteil", "Abschlussspiel"];

export function TrainingTemplates({ mode, plan, templates, onModeChange, onApply, onSave, onDelete, onToggleDefault, onClose }: Props) {
  const availablePhases = phases.filter((phase) => plan.some((exercise) => exercise.category === phase));
  const [kind, setKind] = useState<"plan" | "phase">("plan");
  const [phase, setPhase] = useState<Exercise["category"]>(availablePhases[0] ?? "Ankommen");
  const [name, setName] = useState("");
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const focusOptions = useMemo(() => Array.from(new Set(plan.flatMap((exercise) => exercise.focus))).slice(0, 10), [plan]);
  const ownTemplates = templates.filter((template) => !template.builtIn);
  const featuredTemplates = templates.filter((template) => template.builtIn);

  function toggleFocus(focus: string) {
    setSelectedFocus((current) => current.includes(focus) ? current.filter((item) => item !== focus) : [...current, focus]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const selectedExercises = kind === "plan" ? plan : plan.filter((exercise) => exercise.category === phase);
    if (!selectedExercises.length) return;
    const fallbackName = kind === "plan" ? "Meine Trainingseinheit" : `${phase}-Standard`;
    onSave({
      id: `template-${Date.now()}`,
      name: name.trim() || fallbackName,
      kind,
      phase: kind === "phase" ? phase : undefined,
      focus: selectedFocus.length ? selectedFocus : Array.from(new Set(selectedExercises.flatMap((exercise) => exercise.focus))).slice(0, 3),
      exercises: selectedExercises,
      autoApply: false,
    });
  }

  return <div className="modal-backdrop template-backdrop" onMouseDown={onClose}>
    <section className="template-sheet" role="dialog" aria-modal="true" aria-labelledby="template-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="template-head">
        <div><span className="eyebrow">TRAINING SCHNELL PLANEN</span><h2 id="template-title">Plan- & Phasenvorlagen</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Vorlagen schließen"><X /></button>
      </div>
      <div className="template-tabs">
        <button className={mode === "browse" ? "active" : ""} onClick={() => onModeChange("browse")}><Sparkles /> Vorlagen wählen</button>
        <button className={mode === "save" ? "active" : ""} onClick={() => onModeChange("save")}><BookmarkPlus /> Aktuellen Plan sichern</button>
      </div>

      {mode === "browse" ? <div className="template-scroll">
        <div className="template-intro"><Layers3 /><span><strong>Komplett oder gezielt starten</strong><small>Komplette Pläne ersetzen die Einheit. Phasenvorlagen ändern nur die jeweilige Phase.</small></span></div>
        <TemplateGroup title="SCHWERPUNKT-PLÄNE" templates={featuredTemplates} onApply={onApply} />
        <TemplateGroup title="MEINE VORLAGEN" templates={ownTemplates} onApply={onApply} onDelete={onDelete} onToggleDefault={onToggleDefault} />
        {!ownTemplates.length && <div className="template-empty"><BookmarkPlus /><strong>Noch keine eigene Vorlage</strong><span>Sichere den aktuellen Plan komplett oder nur eine ausgefüllte Phase.</span><button onClick={() => onModeChange("save")}>Erste Vorlage erstellen</button></div>}
      </div> : <form className="template-save" onSubmit={submit}>
        <div className="save-scope">
          <button type="button" className={kind === "plan" ? "active" : ""} onClick={() => setKind("plan")}><Layers3 /><span><strong>Kompletter Plan</strong><small>Alle {plan.length} Übungen speichern</small></span></button>
          <button type="button" className={kind === "phase" ? "active" : ""} onClick={() => setKind("phase")} disabled={!availablePhases.length}><BookmarkPlus /><span><strong>Nur eine Phase</strong><small>Später einzeln einsetzen</small></span></button>
        </div>
        {kind === "phase" && <fieldset className="phase-choice"><legend>Welche Phase möchtest du dauerhaft sichern?</legend>{availablePhases.map((item) => <button type="button" className={phase === item ? "active" : ""} onClick={() => setPhase(item)} key={item}><span>{item}</span><strong>{plan.filter((exercise) => exercise.category === item).length} Übungen</strong></button>)}</fieldset>}
        <label className="template-name"><span>Name der Vorlage</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === "plan" ? "z. B. Dribbling & Mut" : `z. B. Mein ${phase}`} /></label>
        <fieldset className="focus-choice"><legend><Target /> Schwerpunkte auswählen</legend><div>{focusOptions.map((focus) => <button type="button" className={selectedFocus.includes(focus) ? "active" : ""} onClick={() => toggleFocus(focus)} key={focus}>{selectedFocus.includes(focus) && <Check />}{focus}</button>)}</div></fieldset>
        <div className="template-save-summary"><Clock3 /><span><strong>{kind === "plan" ? plan.length : plan.filter((exercise) => exercise.category === phase).length} Übungen</strong><small>{(kind === "plan" ? plan : plan.filter((exercise) => exercise.category === phase)).reduce((sum, exercise) => sum + exercise.duration, 0)} Minuten werden dauerhaft gespeichert.</small></span></div>
        <div className="template-form-actions"><button type="button" onClick={onClose}>Abbrechen</button><button className="primary" type="submit" disabled={!plan.length}><Check /> Vorlage speichern</button></div>
      </form>}
    </section>
  </div>;
}

function TemplateGroup({ title, templates, onApply, onDelete, onToggleDefault }: { title: string; templates: TrainingTemplate[]; onApply: (template: TrainingTemplate) => void; onDelete?: (id: string) => void; onToggleDefault?: (id: string) => void }) {
  if (!templates.length) return null;
  return <section className="template-group"><span className="eyebrow">{title}</span><div className="template-cards">{templates.map((template) => {
    const duration = template.exercises.reduce((sum, exercise) => sum + exercise.duration, 0);
    return <article className={template.autoApply ? "is-default" : ""} key={template.id}>
      <div className="template-card-top"><span className={`template-kind ${template.kind}`}>{template.kind === "plan" ? <Layers3 /> : <BookmarkPlus />}{template.kind === "plan" ? "Kompletter Plan" : template.phase}</span>{template.autoApply && <span className="default-badge"><Pin /> Standard</span>}</div>
      <h3>{template.name}</h3>
      <div className="template-focus">{template.focus.slice(0, 3).map((focus) => <span key={focus}>{focus}</span>)}</div>
      <p>{template.exercises.length} Übungen · {duration} Min{template.kind === "phase" ? " · ersetzt nur diese Phase" : ""}</p>
      <div className="template-card-actions">
        <button className="apply-template" onClick={() => onApply(template)}>{template.kind === "plan" ? "Plan auswählen" : "Phase einsetzen"}</button>
        {template.kind === "phase" && onToggleDefault && <button className={template.autoApply ? "pinned" : ""} onClick={() => onToggleDefault(template.id)} aria-label={template.autoApply ? "Nicht mehr automatisch einsetzen" : "Als dauerhafte Standardphase verwenden"}><Pin /></button>}
        {onDelete && <button onClick={() => onDelete(template.id)} aria-label={`${template.name} löschen`}><Trash2 /></button>}
      </div>
    </article>;
  })}</div></section>;
}
