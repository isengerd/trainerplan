"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Heart, MoreVertical, Plus, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import type { Exercise } from "@/data/demo";
import { Pitch } from "./Pitch";

type Phase = Exercise["category"];
type Difficulty = Exercise["intensity"];
type LibraryMode = "manage" | "pick";
type SortMode = "recommended" | "shortest" | "title";

const phases: Phase[] = ["Ankommen", "Einstieg", "Hauptteil", "Abschlussspiel"];
const ages = Array.from({ length: 13 }, (_, index) => `U${index + 6}`);
const categories = ["Alle Kategorien", "Technik", "Spielformen", "Athletik", "Funspiele", "Kognition", "Torwartspiel"];

function categoryFor(exercise: Exercise) {
  const text = `${exercise.title} ${exercise.description} ${exercise.focus.join(" ")}`.toLowerCase();
  if (/torwart|torhüter/.test(text)) return "Torwartspiel";
  if (/fangen|jagd|laufspiel|wettbewerb/.test(text)) return "Funspiele";
  if (/schnellig|koordination|beweglichkeit|parcours/.test(text)) return "Athletik";
  if (/wahrnehm|entscheidung|reaktion|orientierung/.test(text)) return "Kognition";
  if (/gegen|funino|freies spiel|spielfreude/.test(text)) return "Spielformen";
  return "Technik";
}

function playerRange(value: string) {
  const numbers = value.match(/\d+/g)?.map(Number) ?? [1, 99];
  return { min: numbers[0], max: numbers[1] ?? numbers[0] };
}

export function ExerciseLibrary({ mode, exercises, initialPhase, canManage, onClose, onDetail, onEdit, onDelete, onAdd, onCreate }: {
  mode: LibraryMode;
  exercises: Exercise[];
  initialPhase?: Phase;
  canManage: boolean;
  onClose?: () => void;
  onDetail: (exercise: Exercise) => void;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
  onAdd: (exercise: Exercise) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [phase, setPhase] = useState<Phase | "">(mode === "pick" ? initialPhase ?? "" : "");
  const [category, setCategory] = useState("Alle Kategorien");
  const [age, setAge] = useState(mode === "pick" ? "U9" : "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [maxDuration, setMaxDuration] = useState(60);
  const [playerCount, setPlayerCount] = useState(22);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [addedId, setAddedId] = useState("");
  const [sort, setSort] = useState<SortMode>("recommended");

  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => { try { setFavorites(new Set(JSON.parse(window.localStorage.getItem("trainerplan-exercise-favorites") || "[]") as string[])); } catch { setFavorites(new Set()); } }, []);
  useEffect(() => { if (mode === "pick" && initialPhase) setPhase(initialPhase); }, [initialPhase, mode]);

  const results = useMemo(() => {
    const filtered = exercises.filter((exercise) => {
    const text = `${exercise.title} ${exercise.description} ${exercise.focus.join(" ")}`.toLowerCase();
    const range = playerRange(exercise.players);
    return (!debouncedSearch || text.includes(debouncedSearch))
      && (!phase || exercise.category === phase)
      && (category === "Alle Kategorien" || categoryFor(exercise) === category)
      && (!age || exercise.ageRange.split("/").includes(age))
      && (!difficulty || exercise.intensity === difficulty)
      && exercise.duration <= maxDuration
      && (playerCount === 22 || (range.min <= playerCount && range.max >= playerCount))
      && (!favoritesOnly || favorites.has(exercise.id));
    });
    if (sort === "shortest") return Array.from(filtered).sort((a, b) => a.duration - b.duration);
    if (sort === "title") return Array.from(filtered).sort((a, b) => a.title.localeCompare(b.title, "de"));
    return filtered;
  }, [exercises, debouncedSearch, phase, category, age, difficulty, maxDuration, playerCount, favoritesOnly, favorites, sort]);

  const categoryCounts = useMemo(() => Object.fromEntries(categories.map((item) => [item, item === "Alle Kategorien" ? exercises.length : exercises.filter((exercise) => categoryFor(exercise) === item).length])), [exercises]);

  function toggleFavorite(id: string) {
    setFavorites((current) => {
      const next = new Set(Array.from(current));
      next.has(id) ? next.delete(id) : next.add(id);
      try { window.localStorage.setItem("trainerplan-exercise-favorites", JSON.stringify(Array.from(next))); } catch { /* Favoriten funktionieren auch ohne verfügbaren Browser-Speicher. */ }
      return next;
    });
  }
  function reset() { setSearch(""); setPhase(""); setCategory("Alle Kategorien"); setAge(""); setDifficulty(""); setMaxDuration(60); setPlayerCount(22); setFavoritesOnly(false); }
  function add(exercise: Exercise) { onAdd(exercise); setAddedId(exercise.id); window.setTimeout(() => setAddedId(""), 1400); }

  const filters = [
    ...(phase ? [{ label: phase, clear: () => setPhase("") }] : []),
    ...(category !== "Alle Kategorien" ? [{ label: category, clear: () => setCategory("Alle Kategorien") }] : []),
    ...(age ? [{ label: age, clear: () => setAge("") }] : []),
    ...(difficulty ? [{ label: difficulty, clear: () => setDifficulty("") }] : []),
    ...(maxDuration < 60 ? [{ label: `bis ${maxDuration} Min`, clear: () => setMaxDuration(60) }] : []),
    ...(playerCount < 22 ? [{ label: `${playerCount} Spieler`, clear: () => setPlayerCount(22) }] : []),
    ...(favoritesOnly ? [{ label: "Nur Favoriten", clear: () => setFavoritesOnly(false) }] : []),
  ];
  const filterCount = filters.length;

  return <section className={`unified-library ${mode}`}>
    <header className="unified-library-heading">
      <div><span className="eyebrow">{mode === "manage" ? "ÜBUNGSDATENBANK · F-JUGEND" : `ZIELPHASE · ${initialPhase ?? "FREI"}`}</span><h1>{mode === "manage" ? "Übungen" : "Übung auswählen"}</h1>{mode === "manage" && <p>Finde, verwalte und öffne alle Übungen an einem Ort.</p>}</div>
      <div>{mode === "manage" && canManage && <button className="library-create primary" onClick={onCreate}><Plus /> Neue Übung</button>}{onClose && <button className="library-close" onClick={onClose} aria-label="Bibliothek schließen"><X /></button>}</div>
    </header>

    <div className="library-command-bar">
      <label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Suche nach Übung oder Schwerpunkt..." /></label>
      <button className={filterCount ? "library-filter-button active" : "library-filter-button"} onClick={() => setFilterOpen(true)}><SlidersHorizontal /> Filter{filterCount ? ` (${filterCount})` : ""}</button>
      <button type="button" aria-pressed={favoritesOnly} className={favoritesOnly ? "library-favorite-toggle active" : "library-favorite-toggle"} onClick={() => setFavoritesOnly((value) => !value)}>{favoritesOnly ? <X /> : <Heart />} <span>{favoritesOnly ? "Alle Übungen" : "Favoriten"}</span></button>
    </div>

    <div className="library-category-strip" aria-label="Übungskategorien">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}><span>{item === "Alle Kategorien" ? "Alle" : item}</span><small>{categoryCounts[item]}</small></button>)}</div>

    {filters.length > 0 && <div className="library-active-filters"><div>{filters.map((filter) => <button key={filter.label} onClick={filter.clear}><X /> {filter.label}</button>)}</div><button onClick={reset}>Alle zurücksetzen</button></div>}

    <div className="library-result-summary"><div><strong>{results.length} Übungen</strong>{mode === "pick" && initialPhase && <span>Hinzufügen zu: <b>{initialPhase}</b></span>}</div><label>Sortieren <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="recommended">Empfohlen</option><option value="shortest">Kürzeste zuerst</option><option value="title">Name A–Z</option></select></label></div>
    {results.length > 0 ? <div className="unified-exercise-grid">{results.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} mode={mode} canManage={canManage} favorite={favorites.has(exercise.id)} added={addedId === exercise.id} onFavorite={() => toggleFavorite(exercise.id)} onDetail={() => onDetail(exercise)} onEdit={() => onEdit(exercise)} onDelete={() => onDelete(exercise)} onAdd={() => add(exercise)} />)}</div> : <div className="library-empty"><Search /><h2>{favoritesOnly ? "Noch keine passenden Favoriten" : "Keine Übungen gefunden"}</h2><p>{favoritesOnly ? "Zeige wieder alle Übungen oder passe die übrigen Filter an." : "Entferne einzelne Filter oder setze die Auswahl zurück."}</p><button onClick={favoritesOnly ? () => setFavoritesOnly(false) : reset}>{favoritesOnly ? <><X /> Alle Übungen anzeigen</> : <><RotateCcw /> Filter zurücksetzen</>}</button></div>}

    {filterOpen && <FilterDrawer phase={phase} category={category} age={age} difficulty={difficulty} maxDuration={maxDuration} playerCount={playerCount} resultCount={results.length} onPhase={setPhase} onCategory={setCategory} onAge={setAge} onDifficulty={setDifficulty} onDuration={setMaxDuration} onPlayers={setPlayerCount} onReset={reset} onClose={() => setFilterOpen(false)} />}
  </section>;
}

export function FilterDrawer({ phase, category, age, difficulty, maxDuration, playerCount, resultCount, onPhase, onCategory, onAge, onDifficulty, onDuration, onPlayers, onReset, onClose }: {
  phase: Phase | ""; category: string; age: string; difficulty: Difficulty | ""; maxDuration: number; playerCount: number; resultCount: number;
  onPhase: (value: Phase | "") => void; onCategory: (value: string) => void; onAge: (value: string) => void; onDifficulty: (value: Difficulty | "") => void; onDuration: (value: number) => void; onPlayers: (value: number) => void; onReset: () => void; onClose: () => void;
}) {
  return <div className="filter-drawer-backdrop" onMouseDown={onClose}><aside className="filter-drawer" role="dialog" aria-modal="true" aria-label="Übungen filtern" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span className="eyebrow">ÜBUNGEN EINGRENZEN</span><h2>Filter</h2></div><button onClick={onClose} aria-label="Filter schließen"><X /></button></header>
    <div className="filter-drawer-content">
      <fieldset><legend>Phase</legend><div className="drawer-chip-row">{phases.map((item) => <button className={phase === item ? "active" : ""} key={item} onClick={() => onPhase(phase === item ? "" : item)}>{item === "Abschlussspiel" ? "Abschluss" : item}</button>)}</div></fieldset>
      <label className="drawer-select"><span>Kategorie</span><select value={category} onChange={(event) => onCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <fieldset><legend>Altersklasse</legend><div className="drawer-chip-row ages">{ages.map((item) => <button className={age === item ? "active" : ""} key={item} onClick={() => onAge(age === item ? "" : item)}>{item}</button>)}</div></fieldset>
      <fieldset><legend>Schwierigkeit</legend><div className="drawer-chip-row">{(["Niedrig", "Mittel", "Hoch"] as Difficulty[]).map((item) => <button className={difficulty === item ? "active" : ""} key={item} onClick={() => onDifficulty(difficulty === item ? "" : item)}>{item}</button>)}</div></fieldset>
      <label className="drawer-range"><span><b>Dauer</b><em>bis {maxDuration} Minuten</em></span><input type="range" min="5" max="60" step="5" value={maxDuration} onChange={(event) => onDuration(Number(event.target.value))} /></label>
      <label className="drawer-range"><span><b>Spieler</b><em>{playerCount === 22 ? "beliebig" : playerCount}</em></span><input type="range" min="4" max="22" value={playerCount} onChange={(event) => onPlayers(Number(event.target.value))} /></label>
    </div>
    <footer><button onClick={onReset}><RotateCcw /> Zurücksetzen</button><button className="primary" onClick={onClose}>{resultCount} Ergebnisse anzeigen</button></footer>
  </aside></div>;
}

export function ExerciseCard({ exercise, mode, canManage, favorite, added, onFavorite, onDetail, onEdit, onDelete, onAdd }: {
  exercise: Exercise; mode: LibraryMode; canManage: boolean; favorite: boolean; added: boolean; onFavorite: () => void; onDetail: () => void; onEdit: () => void; onDelete: () => void; onAdd: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <article className="unified-exercise-card">
    <div className="unified-card-visual"><button type="button" onClick={onDetail} aria-label={`${exercise.title} öffnen`}><Pitch variant={exercise.variant} /></button><span>{exercise.ageRange}</span><button type="button" aria-pressed={favorite} className={favorite ? "card-heart active" : "card-heart"} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onFavorite(); }} aria-label={favorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}><Heart fill={favorite ? "currentColor" : "none"} /></button></div>
    <div className="unified-card-body"><button className="unified-card-title" onClick={onDetail}><strong>{exercise.title}</strong></button><p>{exercise.duration} Min · {exercise.players} Spieler · {exercise.intensity}</p><div>{exercise.focus.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div></div>
    <footer><button className="card-detail" onClick={onDetail}>Details</button>{mode === "pick" && canManage && <button className="card-add primary" onClick={onAdd}>{added ? <><Check /> Hinzugefügt</> : <><Plus /> Hinzufügen</>}</button>}{mode === "manage" && canManage && <div className="card-menu"><button onClick={() => setMenuOpen((value) => !value)} aria-label="Übungsaktionen"><MoreVertical /></button>{menuOpen && <div><button onClick={() => { setMenuOpen(false); onEdit(); }}>Bearbeiten</button><button className="danger" onClick={() => { setMenuOpen(false); onDelete(); }}>Löschen</button></div>}</div>}</footer>
  </article>;
}

// Kompatibler Export für ältere Imports während des Refactorings.
export const ExerciseBrowser = ExerciseLibrary;
