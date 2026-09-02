import type { InternalTeam } from "./club";

export type MaterialId = "balls" | "cones" | "bibs" | "miniGoals" | "youthGoals" | "poles" | "rings";

export type MaterialRequirement = {
  id: MaterialId;
  count: number;
};

export const materialCatalog: Record<MaterialId, { name: string; unit: string }> = {
  balls: { name: "Fußbälle Größe 3", unit: "Stk." },
  cones: { name: "Markierungshütchen", unit: "Stk." },
  bibs: { name: "Leibchen", unit: "Stk." },
  miniGoals: { name: "Minitore", unit: "Stk." },
  youthGoals: { name: "Kleinfeldtore", unit: "Stk." },
  poles: { name: "Slalomstangen", unit: "Stk." },
  rings: { name: "Koordinationsringe", unit: "Stk." },
};

export type Exercise = {
  id: string;
  title: string;
  description: string;
  duration: number;
  players: string;
  ageGroup: "F-Jugend";
  ageRange: "U8" | "U9" | "U8/U9";
  category: "Ankommen" | "Einstieg" | "Hauptteil" | "Abschlussspiel";
  accent: string;
  intensity: "Niedrig" | "Mittel" | "Hoch";
  focus: string[];
  setup: string;
  coaching: string[];
  materials: MaterialRequirement[];
  fieldSize: string;
  variant: number;
  youtubeUrl?: string;
  trainerId?: string | null;
  internalTeam?: InternalTeam | null;
};

const baseLibrary: Exercise[] = [
  {
    id: "dribbling-zoo", title: "Dribbel-Zoo", description: "Die Kinder verwandeln sich mit Ball in schnelle Tiere und lösen spielerische Bewegungsaufgaben.",
    duration: 10, players: "6–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Ankommen", accent: "#45d875", intensity: "Niedrig",
    focus: ["Ballgefühl", "Bewegungsfreude"], setup: "Ein 20 × 20 m großes Feld markieren. Jedes Kind startet mit einem Ball.",
    coaching: ["Viele kleine Ballkontakte", "Beide Füße ausprobieren", "Fantasie und eigene Lösungen zulassen"],
    materials: [{ id: "balls", count: 16 }, { id: "cones", count: 8 }], fieldSize: "20 × 20 m", variant: 0,
  },
  {
    id: "farben-fangen", title: "Farben-Fänger", description: "Reaktionsspiel mit Ball: Auf ein Farbsignal dribbeln die Kinder zum passenden Hütchentor.",
    duration: 10, players: "6–14", ageGroup: "F-Jugend", ageRange: "U8", category: "Ankommen", accent: "#45d875", intensity: "Mittel",
    focus: ["Wahrnehmung", "Dribbling"], setup: "Vier verschiedenfarbige Hütchentore um ein 18 × 18 m großes Feld verteilen.",
    coaching: ["Kopf beim Dribbling heben", "Auf freie Wege achten", "Richtungswechsel mit Innen- und Außenseite"],
    materials: [{ id: "balls", count: 14 }, { id: "cones", count: 16 }], fieldSize: "18 × 18 m", variant: 1,
  },
  {
    id: "hütchen-schatz", title: "Hütchen-Schatzsuche", description: "Zwei Teams sammeln mit dem Ball möglichst viele Schätze aus der Feldmitte.",
    duration: 12, players: "8–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Einstieg", accent: "#58a6ff", intensity: "Mittel",
    focus: ["Dribbling", "Orientierung"], setup: "Zwei Hütchendepots anlegen. In der Mitte liegen 20 Markierungsteller als Schätze.",
    coaching: ["Ball eng führen", "Freie Schätze erkennen", "Jedes Kind sammelt im eigenen Tempo"],
    materials: [{ id: "balls", count: 16 }, { id: "cones", count: 28 }, { id: "bibs", count: 8 }], fieldSize: "22 × 18 m", variant: 2,
  },
  {
    id: "torschuss-duell", title: "Torschuss-Duell", description: "Zwei Kinder starten gleichzeitig, umdribbeln ein Hütchen und schließen auf ein Minitor ab.",
    duration: 12, players: "6–12", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Einstieg", accent: "#58a6ff", intensity: "Mittel",
    focus: ["Torschuss", "Dribbling"], setup: "Zwei identische Bahnen mit je einem Wendepunkt und einem Minitor aufbauen.",
    coaching: ["Ball vor dem Schuss kontrollieren", "Mit beiden Füßen abschließen", "Schnell neue Duelle starten"],
    materials: [{ id: "balls", count: 10 }, { id: "cones", count: 8 }, { id: "miniGoals", count: 2 }], fieldSize: "2 × 15 m", variant: 3,
  },
  {
    id: "one-v-one", title: "1 gegen 1 auf zwei Tore", description: "Angreifer und Verteidiger spielen im kleinen Feld auf zwei versetzte Minitore.",
    duration: 15, players: "6–12", ageGroup: "F-Jugend", ageRange: "U9", category: "Hauptteil", accent: "#f5c451", intensity: "Hoch",
    focus: ["Mut", "Finten"], setup: "Ein 14 × 10 m großes Feld mit zwei Minitoren auf den Grundlinien markieren.",
    coaching: ["Mutig ins Dribbling gehen", "Freies Tor erkennen", "Nach Ballverlust sofort weiterspielen"],
    materials: [{ id: "balls", count: 8 }, { id: "cones", count: 8 }, { id: "miniGoals", count: 2 }, { id: "bibs", count: 6 }], fieldSize: "14 × 10 m", variant: 4,
  },
  {
    id: "funino", title: "Funino 3 gegen 3", description: "Freies Drei-gegen-Drei auf vier Minitore mit vielen Ballaktionen und Erfolgserlebnissen.",
    duration: 18, players: "6–12", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Hauptteil", accent: "#f5c451", intensity: "Hoch",
    focus: ["Spielfreude", "Freilaufen"], setup: "Ein 27 × 21 m großes Feld mit einer 6-m-Schusszone und vier Minitoren aufbauen.",
    coaching: ["Alle Kinder spielen durchgehend", "Breite und Tiefe selbst entdecken", "Nach Toren zügig weiterspielen"],
    materials: [{ id: "balls", count: 6 }, { id: "cones", count: 16 }, { id: "miniGoals", count: 4 }, { id: "bibs", count: 6 }], fieldSize: "27 × 21 m", variant: 5,
  },
  {
    id: "zahlen-spiel", title: "Zahlen-Spiel 2 gegen 2", description: "Auf Zuruf starten zwei Kinder pro Team ins Feld und spielen sofort auf zwei Minitore.",
    duration: 15, players: "8–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Hauptteil", accent: "#f5c451", intensity: "Hoch",
    focus: ["Reaktion", "Zusammenspiel"], setup: "Feld mit zwei Minitoren. Teams stehen nummeriert neben dem Trainer an der Seitenlinie.",
    coaching: ["Sofort zum Ball orientieren", "Mitspieler wahrnehmen", "Kurze Runden, wenig Wartezeit"],
    materials: [{ id: "balls", count: 8 }, { id: "cones", count: 8 }, { id: "miniGoals", count: 2 }, { id: "bibs", count: 8 }], fieldSize: "18 × 14 m", variant: 6,
  },
  {
    id: "fuenf-gegen-fuenf", title: "5 gegen 5 mit Torhütern", description: "Kindgerechtes Abschlussspiel auf zwei Kleinfeldtore mit regelmäßiger Rotation.",
    duration: 20, players: "10–15", ageGroup: "F-Jugend", ageRange: "U9", category: "Abschlussspiel", accent: "#ff6b6b", intensity: "Hoch",
    focus: ["Freies Spiel", "Tore erzielen"], setup: "Ein 40 × 24 m großes Feld mit zwei Kleinfeldtoren markieren. Nach 4 Minuten wechseln.",
    coaching: ["Wenig unterbrechen", "Alle Positionen ausprobieren", "Neue Bälle schnell einspielen"],
    materials: [{ id: "balls", count: 6 }, { id: "cones", count: 12 }, { id: "youthGoals", count: 2 }, { id: "bibs", count: 8 }], fieldSize: "40 × 24 m", variant: 7,
  },
  {
    id: "vier-tore", title: "4 gegen 4 auf vier Tore", description: "Freies Spiel auf vier Minitore: Die Kinder erkennen offene Räume und wechseln die Spielrichtung.",
    duration: 18, players: "8–12", ageGroup: "F-Jugend", ageRange: "U9", category: "Abschlussspiel", accent: "#ff6b6b", intensity: "Hoch",
    focus: ["Orientierung", "Zusammenspiel"], setup: "Vier Minitore an den Ecken eines 25 × 20 m großen Feldes aufstellen.",
    coaching: ["Freie Tore selbst erkennen", "Breite schaffen", "Jedes Kind bekommt viel Spielzeit"],
    materials: [{ id: "balls", count: 6 }, { id: "cones", count: 8 }, { id: "miniGoals", count: 4 }, { id: "bibs", count: 8 }], fieldSize: "25 × 20 m", variant: 8,
  },
  {
    id: "bewegungs-parcours", title: "Ball-Abenteuer-Parcours", description: "Dribbeln, rollen, springen und schießen in einem abwechslungsreichen Rundlauf.",
    duration: 12, players: "6–14", ageGroup: "F-Jugend", ageRange: "U8", category: "Einstieg", accent: "#58a6ff", intensity: "Mittel",
    focus: ["Koordination", "Ballgefühl"], setup: "Vier kurze Stationen als Rundlauf aufbauen. Jedes Kind startet mit eigenem Ball.",
    coaching: ["Auf saubere Bewegung achten", "Schwierigkeit frei wählen lassen", "Kurze Wege und viele Wiederholungen"],
    materials: [{ id: "balls", count: 14 }, { id: "cones", count: 12 }, { id: "poles", count: 6 }, { id: "rings", count: 6 }, { id: "miniGoals", count: 1 }], fieldSize: "24 × 20 m", variant: 9,
  },
  {
    id: "tunnel-tore", title: "Tunnel-Tore", description: "Die Kinder dribbeln durch viele kleine Hütchentore und sammeln Punkte für jedes neue Tor.",
    duration: 10, players: "6–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Ankommen", accent: "#45d875", intensity: "Mittel",
    focus: ["Dribbling", "Orientierung"], setup: "Acht verschieden ausgerichtete Hütchentore in einem 22 × 18 m großen Feld verteilen.", coaching: ["Immer ein neues Tor wählen", "Beidfüßig durchdribbeln", "Kopf vor dem Tor heben"],
    materials: [{ id: "balls", count: 16 }, { id: "cones", count: 16 }], fieldSize: "22 × 18 m", variant: 10,
  },
  {
    id: "zwei-gegen-eins", title: "2 gegen 1 zum Tor", description: "Zwei Angreifer lösen eine Überzahlsituation gegen einen Verteidiger und schließen ab.",
    duration: 15, players: "6–12", ageGroup: "F-Jugend", ageRange: "U9", category: "Hauptteil", accent: "#f5c451", intensity: "Hoch",
    focus: ["Zusammenspiel", "Entscheidung"], setup: "Ein 18 × 14 m großes Feld mit einem Minitor. Angreifer starten nebeneinander.", coaching: ["Gegner gemeinsam angreifen", "Abspiel oder Dribbling selbst entscheiden", "Schnell zum Abschluss kommen"],
    materials: [{ id: "balls", count: 8 }, { id: "cones", count: 8 }, { id: "miniGoals", count: 1 }, { id: "bibs", count: 4 }], fieldSize: "18 × 14 m", variant: 11,
  },
  {
    id: "koenig-der-baelle", title: "König der Bälle", description: "Alle schützen den eigenen Ball und versuchen gleichzeitig, andere Bälle aus dem Feld zu spielen.",
    duration: 10, players: "6–14", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Einstieg", accent: "#58a6ff", intensity: "Hoch",
    focus: ["Ballkontrolle", "Zweikampf"], setup: "Ein 16 × 16 m großes Feld. Jedes Kind hat einen Ball; ausgeschiedene Kinder lösen eine Zusatzaufgabe.", coaching: ["Körper zwischen Gegner und Ball", "Fair und kontrolliert spielen", "Schnell wieder einsteigen"],
    materials: [{ id: "balls", count: 14 }, { id: "cones", count: 8 }], fieldSize: "16 × 16 m", variant: 12,
  },
  {
    id: "pass-tore", title: "Pass-Tore im Paar", description: "Zweiergruppen passen durch wechselnde Hütchentore und bewegen sich gemeinsam weiter.",
    duration: 12, players: "6–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Einstieg", accent: "#58a6ff", intensity: "Mittel",
    focus: ["Passspiel", "Erster Kontakt"], setup: "Mehrere zwei Meter breite Hütchentore frei im Feld verteilen. Ein Ball pro Paar.", coaching: ["Standbein zeigt zum Ziel", "Ball in den Lauf mitnehmen", "Nach jedem Pass neues Tor suchen"],
    materials: [{ id: "balls", count: 8 }, { id: "cones", count: 20 }], fieldSize: "24 × 20 m", variant: 13,
  },
  {
    id: "drei-gegen-drei-wechsel", title: "3 gegen 3 mit fliegendem Wechsel", description: "Kurze intensive Spiele auf zwei Tore; nach jedem Treffer kommt sofort ein neues Team ins Feld.",
    duration: 18, players: "9–15", ageGroup: "F-Jugend", ageRange: "U9", category: "Abschlussspiel", accent: "#ff6b6b", intensity: "Hoch",
    focus: ["Spielfreude", "Umschalten"], setup: "Ein 24 × 18 m großes Feld mit zwei Minitoren. Drei Teams stehen an unterschiedlichen Seiten.", coaching: ["Nach Tor sofort wechseln", "Neue Mannschaft startet mit Ball", "Viele kurze Spiele ohne Unterbrechung"],
    materials: [{ id: "balls", count: 6 }, { id: "cones", count: 8 }, { id: "miniGoals", count: 2 }, { id: "bibs", count: 9 }], fieldSize: "24 × 18 m", variant: 14,
  },
  {
    id: "brueckenfangen", title: "Brückenfangen", description: "Gefangene Kinder bilden eine Brücke und werden befreit, sobald ein Mitspieler darunter hindurchkrabbelt.",
    duration: 8, players: "8–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Ankommen", accent: "#45d875", intensity: "Mittel",
    focus: ["Laufgeschick", "Teamwork"], setup: "Ein 20 × 20 m großes Feld markieren. Zwei Fänger tragen Leibchen. Gefangene stellen sich mit breiten Beinen als Brücke auf.",
    coaching: ["Kopf beim Laufen heben", "Freie Brücken gemeinsam erkennen", "Beim Durchkrabbeln aufeinander achten"],
    materials: [{ id: "cones", count: 8 }, { id: "bibs", count: 2 }], fieldSize: "20 × 20 m", variant: 15,
  },
  {
    id: "krokodiljagd", title: "Krokodiljagd", description: "Die Kinder überqueren einen Fluss, während die Krokodile versuchen, sie innerhalb der Flusszone zu fangen.",
    duration: 8, players: "8–18", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Ankommen", accent: "#45d875", intensity: "Hoch",
    focus: ["Schnelligkeit", "Reaktion"], setup: "Eine 8 m breite Flusszone quer durch ein 24 × 18 m großes Feld markieren. Zwei Krokodile starten im Fluss.",
    coaching: ["Tempo und Laufrichtung variieren", "Freie Lücken erkennen", "Gefangene Kinder werden in der nächsten Runde zu Krokodilen"],
    materials: [{ id: "cones", count: 12 }, { id: "bibs", count: 3 }], fieldSize: "24 × 18 m", variant: 16,
  },
  {
    id: "waechtertor-passen", title: "Wächtertor-Passen", description: "Zwei Kinder passen durch ein Stangentor, das von einem Wächter verteidigt wird, und wechseln nach jedem Pass die Seite.",
    duration: 12, players: "8–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Einstieg", accent: "#58a6ff", intensity: "Mittel",
    focus: ["Passspiel", "Freilaufen", "Wahrnehmung"], setup: "Vier etwa 4 m breite Stangen- oder Hütchentore aufbauen. In jedem Tor steht ein Wächter. Die übrigen Kinder verteilen sich mit je einem Ball pro Gruppe gegenüber auf beide Seiten.",
    coaching: ["Vor dem Pass Blickkontakt aufnehmen", "Nach dem Abspiel außen am Tor vorbeilaufen", "Freie Passwege erkennen und notfalls am Tor vorbeispielen", "Wächter bleibt zunächst auf der Torlinie", "Nach Ballgewinn tauschen Wächter und Passgeber die Rollen"],
    materials: [{ id: "balls", count: 4 }, { id: "poles", count: 8 }, { id: "bibs", count: 4 }], fieldSize: "4 Felder à 10 × 8 m", variant: 17,
  },
  {
    id: "passkreuz-nachlaufen", title: "Passkreuz mit Nachlaufen", description: "Vier Gruppen passen flach durch die Mitte des Kreuzes. Nach jedem Abspiel läuft der Passgeber zur nächsten Gruppe weiter.",
    duration: 12, players: "8–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Einstieg", accent: "#58a6ff", intensity: "Mittel",
    focus: ["Passspiel", "Erster Kontakt", "Orientierung"], setup: "Vier Gruppen kreuzförmig mit 15–20 m Abstand aufstellen. Jede Gruppe wird durch ein Hütchen markiert. Zunächst mit einem Ball starten; sichere Gruppen können später einen zweiten Ball nutzen.",
    coaching: ["Flach und kontrolliert in den Vorderfuß passen", "Vor der Ballannahme zur nächsten Gruppe orientieren", "Den ersten Kontakt in die neue Spielrichtung mitnehmen", "Nach dem Pass sofort außen zur nächsten Gruppe laufen", "In der Mitte Blickkontakt halten und Zusammenstöße vermeiden"],
    materials: [{ id: "balls", count: 2 }, { id: "cones", count: 4 }], fieldSize: "Kreuz · 15–20 m", variant: 18,
  },
  {
    id: "technikerkreis-blitzwechsel", title: "Technikerkreis: Blitz-Richtungswechsel", description: "Die Kinder dribbeln aus einem großen Kreis zum Hütchen-Gegner in der Mitte, wenden mit einer Finte und passen zurück zum Partner.",
    duration: 12, players: "8–18", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Ankommen", accent: "#45d875", intensity: "Mittel",
    focus: ["Dribbling", "Richtungswechsel", "Finten"], setup: "Vier bis sechs Starttore kreisförmig aufstellen. Je zwei bis drei Kinder und ein Ball stehen an jedem Tor. Acht bis zehn Meter entfernt markiert ein kleiner Hütchenkreis in der Mitte den Gegenspieler.",
    coaching: ["Zunächst langsam und technisch sauber ausführen", "Mit vielen kleinen Kontakten zum Hütchenkreis dribbeln", "Vor dem Gegenspieler abbremsen und tief stehen", "Ball eng wenden und in die Gegenrichtung beschleunigen", "Beide Füße ausprobieren und vor der Mitte den Kopf heben"],
    materials: [{ id: "balls", count: 6 }, { id: "cones", count: 18 }], fieldSize: "Kreis · 20–24 m", variant: 19, youtubeUrl: "https://www.youtube.com/watch?v=8ZCRctHczgU",
  },
  {
    id: "farbenpass-kompass", title: "Farbenpass-Kompass", description: "Der Trainer ruft eine Farbe. Nur die Kinder am passenden Farbtor passen durch ihr Tor und tauschen anschließend die Plätze.",
    duration: 12, players: "8–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Einstieg", accent: "#58a6ff", intensity: "Mittel",
    focus: ["Passspiel", "Reaktion", "Orientierung"], setup: "Vier verschiedenfarbige Hütchentore mit viel Abstand als Kompass aufbauen. An jedem Tor stehen sich zwei kleine Gruppen gegenüber; die erste Gruppe hat einen Ball. Der Trainer ruft eine Farbe. Am gerufenen Tor passt das erste Kind flach durch das Tor, läuft dem Ball nach und stellt sich gegenüber an. Der Empfänger nimmt den Ball an und wartet auf das nächste Farbkommando.",
    coaching: ["Zuerst Farbe hören, dann starten", "Ball flach und mittig durch das Tor spielen", "Dem Pass sofort auf die andere Seite folgen", "Empfänger steht bereit und nimmt mit dem ersten Kontakt sauber an", "Zunächst nur eine Farbe rufen; später zwei Farben gleichzeitig"],
    materials: [{ id: "balls", count: 4 }, { id: "cones", count: 8 }, { id: "bibs", count: 4 }], fieldSize: "20 × 20 m", variant: 20,
  },
  {
    id: "drei-gegen-drei-chaosstart", title: "3 gegen 3 – Chaosstart", description: "Beide Teams starten aus unterschiedlichen Ecken. Der Trainer eröffnet jede Runde neu, sodass sofort überraschende Duelle entstehen.",
    duration: 15, players: "6–12", ageGroup: "F-Jugend", ageRange: "U9", category: "Hauptteil", accent: "#f5c451", intensity: "Hoch",
    focus: ["Orientierung", "Umschalten"], setup: "Ein 22 × 18 m großes Feld mit vier Dribbeltoren markieren. Drei Kinder pro Team verteilen sich diagonal in den Ecken.",
    coaching: ["Nach dem Startsignal zuerst den Raum erkennen", "Mutig ins freie Tor dribbeln", "Nach Ballverlust direkt weiterspielen"],
    materials: [{ id: "balls", count: 8 }, { id: "cones", count: 16 }, { id: "bibs", count: 6 }], fieldSize: "22 × 18 m", variant: 21,
  },
  {
    id: "dribbeltor-bumerang", title: "Dribbeltor-Bumerang", description: "Die Kinder durchdribbeln ein Tor, wenden dahinter und suchen mit hohem Tempo ein anderes freies Tor.",
    duration: 10, players: "6–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Ankommen", accent: "#45d875", intensity: "Mittel",
    focus: ["Dribbling", "Richtungswechsel"], setup: "Sechs kleine Hütchentore sternförmig in einem 22 × 22 m großen Feld verteilen. Jedes Kind hat einen Ball.",
    coaching: ["Vor dem Tor den Kopf heben", "Eng durch das Tor führen", "Nach der Wende deutlich beschleunigen"],
    materials: [{ id: "balls", count: 16 }, { id: "cones", count: 12 }], fieldSize: "22 × 22 m", variant: 22,
  },
  {
    id: "inselwechsel-mit-ball", title: "Inselwechsel mit Ball", description: "Vier Teams tauschen auf ein Signal ihre Insel. Punkte gibt es für kontrolliertes Dribbling und eine freie Zielinsel.",
    duration: 10, players: "8–16", ageGroup: "F-Jugend", ageRange: "U8", category: "Ankommen", accent: "#45d875", intensity: "Mittel",
    focus: ["Ballgefühl", "Reaktion"], setup: "Vier 4 × 4 m große Inseln in den Ecken eines 20 × 20 m großen Feldes markieren. Ein Ball pro Kind.",
    coaching: ["Ball beim Start nah am Fuß halten", "Zusammenstöße in der Mitte vermeiden", "Freie Wege selbst entdecken"],
    materials: [{ id: "balls", count: 16 }, { id: "cones", count: 16 }], fieldSize: "20 × 20 m", variant: 23,
  },
  {
    id: "torschuss-pendel", title: "Torschuss-Pendel", description: "Nach einem kurzen Zuspiel nimmt das Kind den Ball in die Bewegung mit und schließt abwechselnd auf zwei Tore ab.",
    duration: 12, players: "6–14", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Einstieg", accent: "#58a6ff", intensity: "Mittel",
    focus: ["Torschuss", "Erster Kontakt"], setup: "Zwei Minitore gegenüber aufstellen. In der Mitte zwei Startpositionen mit je einer Passstation markieren.",
    coaching: ["Ersten Kontakt in Richtung Tor mitnehmen", "Vor dem Abschluss kurz aufschauen", "Rechts und links im Wechsel schießen"],
    materials: [{ id: "balls", count: 8 }, { id: "cones", count: 6 }, { id: "miniGoals", count: 2 }], fieldSize: "24 × 14 m", variant: 24,
  },
  {
    id: "dreieck-vier-gegen-eins", title: "Dreieck: 4 gegen 1", description: "Vier Kinder halten den Ball an drei Außenseiten gegen einen Balljäger und dürfen freie Seiten jederzeit neu besetzen.",
    duration: 12, players: "5–15", ageGroup: "F-Jugend", ageRange: "U9", category: "Hauptteil", accent: "#f5c451", intensity: "Mittel",
    focus: ["Freilaufen", "Passspiel"], setup: "Pro Gruppe ein etwa 10 m großes Hütchendreieck markieren. Vier Ballbesitzer spielen gegen einen Balljäger.",
    coaching: ["Immer zwei Passwege anbieten", "Ball mit maximal drei Kontakten weiterspielen", "Nach einem Pass eine neue Seite besetzen"],
    materials: [{ id: "balls", count: 3 }, { id: "cones", count: 9 }, { id: "bibs", count: 3 }], fieldSize: "3 × Dreieck 10 m", variant: 25,
  },
];

type ReviewedExerciseContent = Pick<Exercise, "description" | "setup" | "coaching">;

// Die Kurzbeschreibung erklärt das Spielziel. Unter „Aufbau & Ablauf“ steht jede
// Übung vollständig, damit sie ohne zusätzliches Video auf dem Platz nutzbar ist.
const reviewedContent: Record<string, ReviewedExerciseContent> = {
  "dribbling-zoo": {
    description: "Jedes Kind dribbelt frei im Feld und stellt mit dem Ball verschiedene Tiere dar.",
    setup: "Ein 20 × 20 m großes Feld markieren; jedes Kind hat einen Ball. Der Trainer nennt nacheinander Tiere und eine passende Aufgabe, zum Beispiel: Maus = leise mit kleinen Kontakten, Gepard = schnell dribbeln, Krebs = Ball rückwärts ziehen. Nach 20–30 Sekunden folgt ein neues Tier.",
    coaching: ["Ball nah am Fuß halten", "Regelmäßig den Kopf heben", "Beide Füße benutzen", "Eigene Tierbewegungen der Kinder aufnehmen"],
  },
  "farben-fangen": {
    description: "Auf ein Farbkommando dribbeln alle durch ein Tor derselben Farbe und anschließend zurück ins Feld.",
    setup: "Vier verschiedenfarbige, etwa 2 m breite Hütchentore an den Seiten eines 18 × 18 m großen Feldes aufbauen. Alle Kinder dribbeln mit Ball in der Mitte. Der Trainer ruft eine Farbe; jedes Kind sucht ein freies Tor dieser Farbe, durchdribbelt es und kehrt ins Feld zurück.",
    coaching: ["Vor dem Kommando vom Ball lösen und umsehen", "Nicht alle zum selben Tor laufen", "Ball eng durch das Tor führen", "Als Steigerung Farbe und Dribbelfuß kombinieren"],
  },
  "hütchen-schatz": {
    description: "Zwei Teams dribbeln zur Mitte, holen jeweils einen Schatz und bringen ihn ins eigene Depot.",
    setup: "Zwei Teamdepots an gegenüberliegenden Seiten eines 22 × 18 m großen Feldes markieren. In der Mitte 20 Markierungsteller auslegen. Auf Start dribbelt pro Team jeweils ein Kind zur Mitte, nimmt genau einen Teller auf und dribbelt zurück. Nach der Übergabe startet das nächste Kind. Sind alle Schätze verteilt, gewinnt das Team mit den meisten Tellern.",
    coaching: ["Ball beim Aufheben mit der Sohle sichern", "Nur einen Schatz pro Lauf mitnehmen", "Auf dem Rückweg kontrolliert dribbeln", "Für weniger Wartezeit zwei Kinder je Team gleichzeitig starten lassen"],
  },
  "torschuss-duell": {
    description: "Zwei Kinder starten gleichzeitig auf parallelen Bahnen, umdribbeln ihr Hütchen und schießen auf ihr Minitor.",
    setup: "Zwei parallele, etwa 15 m lange Bahnen aufbauen. Pro Bahn liegen Startball, Wendepunkt und Minitor bereit. Auf Signal starten die ersten Kinder, dribbeln außen um das Hütchen und schließen vor einer markierten Schusslinie ab. Ball holen, außen zurücklaufen und hinten anstellen.",
    coaching: ["Vor dem Wendepunkt viele kleine Kontakte", "Nach der Wende in Richtung Tor beschleunigen", "Vor dem Schuss kurz aufschauen", "Abwechselnd mit rechts und links abschließen"],
  },
  "one-v-one": {
    description: "Ein Angreifer versucht im direkten Duell auf eines von zwei seitlich versetzten Minitoren zu treffen.",
    setup: "Ein 14 × 10 m großes Feld markieren und zwei Minitore versetzt auf der gegnerischen Grundlinie aufstellen. Angreifer und Verteidiger starten an der gegenüberliegenden Grundlinie; der Angreifer mit Ball. Die Aktion endet bei Tor, Aus oder Ballgewinn. Danach Rollen tauschen und das nächste Paar starten.",
    coaching: ["Mit Tempo auf den Verteidiger zudribbeln", "Beide Tore im Blick behalten", "Durch eine Finte ein Tor öffnen", "Nach Ballverlust sofort zurückerobern"],
  },
  "funino": {
    description: "Drei gegen drei auf vier Minitore: Jedes Team greift zwei Tore an und verteidigt zwei Tore.",
    setup: "Ein 27 × 21 m großes Feld mit je zwei Minitoren auf beiden Grundlinien aufbauen. Vor jeder Grundlinie eine 6 m tiefe Schusszone markieren; Tore zählen nur aus dieser Zone. Drei gegen drei ohne Torhüter spielen. Nach Tor oder Aus bringt der Trainer sofort einen neuen Ball ins Spiel.",
    coaching: ["In Ballbesitz Breite und Tiefe geben", "Vor dem Dribbling beide Tore ansehen", "Nach Ballverlust das Zentrum schließen", "Wenig unterbrechen und Lösungen entdecken lassen"],
  },
  "zahlen-spiel": {
    description: "Der Trainer ruft zwei Nummern; die entsprechenden Kinder beider Teams starten sofort ins Zwei-gegen-Zwei.",
    setup: "Ein 18 × 14 m großes Feld mit je einem Minitor auf den Grundlinien markieren. Beide Teams stehen nummeriert neben dem Trainer. Der Trainer spielt einen Ball ein und ruft zwei Nummern. Die vier aufgerufenen Kinder spielen bis Tor, Aus oder höchstens 30 Sekunden; danach verlassen sie das Feld und erhalten neue Nummern.",
    coaching: ["Beim Zuruf sofort Ball und Mitspieler finden", "In Ballbesitz auseinanderziehen", "Nach Ballverlust gemeinsam verteidigen", "Kurze Runden und wechselnde Paarungen nutzen"],
  },
  "fuenf-gegen-fuenf": {
    description: "Freies Fünf-gegen-Fünf mit Torhütern auf zwei Kleinfeldtore.",
    setup: "Ein etwa 40 × 24 m großes Feld mit zwei Kleinfeldtoren markieren. Zwei Teams mit je vier Feldspielern und einem Torhüter einteilen. Bei mehr als zehn Kindern nach jeweils vier Minuten durchwechseln. Bälle rund um das Feld bereitlegen, damit es nach Aus schnell weitergeht.",
    coaching: ["Nur bei Sicherheits- oder Regelproblemen unterbrechen", "Alle Kinder auf verschiedenen Positionen einsetzen", "Abstöße kurz eröffnen lassen", "Mutige Dribblings und Torabschlüsse bestärken"],
  },
  "vier-tore": {
    description: "Vier gegen vier auf vier Minitore; jedes Team darf auf die beiden Tore der gegnerischen Grundlinie angreifen.",
    setup: "Ein 25 × 20 m großes Feld markieren und auf jeder Grundlinie zwei Minitore mit großem Abstand aufstellen. Vier gegen vier ohne Torhüter spielen. Nach Tor oder Aus startet das ballberechtigte Team vom eigenen Tor aus neu.",
    coaching: ["Vor der Ballannahme beide Zielorte prüfen", "Das Feld breit machen", "Bei geschlossenem Tor die Seite wechseln", "Nach Ballverlust beide eigenen Tore sichern"],
  },
  "bewegungs-parcours": {
    description: "Ein Rundlauf verbindet Slalomdribbling, Koordinationsringe, Ballführung und Torschuss.",
    setup: "Vier Stationen als Rundlauf aufbauen: 1. mit Ball durch sechs Stangen dribbeln, 2. Ball neben sechs Ringen führen und durch die Ringe laufen, 3. um ein Hütchen wenden, 4. auf ein Minitor schießen. Nach dem Schuss Ball holen und wieder bei Station 1 beginnen. Mit Abstand nacheinander starten.",
    coaching: ["Erst sauber, dann schneller ausführen", "Beim Slalom beide Füße einsetzen", "Genügend Abstand zum Vordermann halten", "Aufgaben vereinfachen, wenn der Ablauf stockt"],
  },
  "tunnel-tore": {
    description: "Jedes Kind dribbelt durch möglichst viele unterschiedliche Hütchentore.",
    setup: "Acht etwa 1,5 m breite Hütchentore in verschiedenen Richtungen in einem 22 × 18 m großen Feld verteilen. Jedes Kind hat einen Ball. Ein durchdribbeltes Tor zählt einen Punkt; dasselbe Tor darf nicht zweimal hintereinander benutzt werden. Nach einer Minute beginnt eine neue Runde.",
    coaching: ["Vor dem Tor aufschauen und ein freies Ziel wählen", "Kontrolliert durch das Tor dribbeln", "Nach dem Tor deutlich die Richtung ändern", "Später nur mit dem schwächeren Fuß spielen"],
  },
  "zwei-gegen-eins": {
    description: "Zwei Angreifer entscheiden gegen einen Verteidiger zwischen Pass und eigenem Dribbling zum Tor.",
    setup: "Ein 18 × 14 m großes Feld mit einem Minitor markieren. Zwei Angreifer starten mit Ball nebeneinander an einer Grundlinie, ein Verteidiger einige Meter vor dem Tor. Die Aktion endet bei Tor, Aus oder Ballgewinn. Anschließend rückt der nächste Verteidiger ein und neue Angreifer starten.",
    coaching: ["Mit Tempo gemeinsam auf den Verteidiger zulaufen", "Ballführer bindet den Gegner", "Mitspieler seitlich anspielbar bleiben", "Entscheidung nicht vorgeben: Pass oder Dribbling selbst erkennen"],
  },
  "koenig-der-baelle": {
    description: "Alle schützen den eigenen Ball und versuchen gleichzeitig, gegnerische Bälle aus dem Feld zu spielen.",
    setup: "Ein 16 × 16 m großes Feld markieren; jedes Kind dribbelt mit einem Ball. Wer einen fremden Ball kontrolliert aus dem Feld spielt, erhält einen Punkt. Das betroffene Kind holt seinen Ball, absolviert außerhalb drei schnelle Ballkontakte und steigt sofort wieder ein. Mehrere kurze Runden spielen.",
    coaching: ["Körper zwischen Gegner und eigenen Ball bringen", "Nur den Ball und nicht die Beine angreifen", "Nach vorne dribbeln statt nur abzuschirmen", "Niemand scheidet dauerhaft aus"],
  },
  "pass-tore": {
    description: "Paare passen durch ein freies Hütchentor und suchen danach gemeinsam ein neues Tor.",
    setup: "Zehn etwa 2 m breite Hütchentore in einem 24 × 20 m großen Feld verteilen. Je zwei Kinder haben einen Ball. Ein Kind passt durch ein freies Tor, der Partner nimmt auf der anderen Seite an. Beide bewegen sich anschließend zu einem anderen Tor. Wie viele verschiedene Tore schafft das Paar in einer Minute?",
    coaching: ["Vor dem Pass Blickkontakt aufnehmen", "Flach und mittig durch das Tor passen", "Mit dem ersten Kontakt in Richtung des nächsten Tores öffnen", "Abstand zwischen den Paaren halten"],
  },
  "drei-gegen-drei-wechsel": {
    description: "Drei Teams spielen kurze Drei-gegen-Drei-Runden; nach einem Tor wechselt das unterlegene Team sofort aus.",
    setup: "Ein 24 × 18 m großes Feld mit zwei Minitoren aufbauen. Zwei Teams spielen, das dritte wartet mit Bällen an der Seite. Nach einem Tor bleibt das erfolgreiche Team im Feld; das andere Team verlässt sofort das Feld und das wartende Team startet mit Ball. Fällt 90 Sekunden kein Tor, wechselt das länger spielende Team.",
    coaching: ["Wechselweg vor Beginn festlegen", "Wartendes Team hält einen Ball bereit", "Nach dem Einwechseln sofort Breite geben", "Belastung durch kurze Runden hoch halten"],
  },
  "brueckenfangen": {
    description: "Gefangene Kinder werden zu Brücken und können von freien Mitspielern befreit werden.",
    setup: "Ein 20 × 20 m großes Feld markieren und zwei Fänger mit Leibchen kennzeichnen. Wer berührt wird, bleibt mit breiten Beinen stehen. Ein freies Kind befreit die Brücke, indem es vorsichtig von vorne nach hinten hindurchkrabbelt. Währenddessen dürfen beide nicht gefangen werden. Fänger regelmäßig wechseln.",
    coaching: ["Mit erhobenem Kopf laufen", "Nur leicht mit der Hand berühren", "Beim Befreien langsam und vorsichtig krabbeln", "Das Feld verkleinern oder vergrößern, damit Fangen gelingt"],
  },
  "krokodiljagd": {
    description: "Die Kinder laufen von Ufer zu Ufer und dürfen nur in der Flusszone von den Krokodilen gefangen werden.",
    setup: "Eine etwa 8 m breite Flusszone quer durch ein 24 × 18 m großes Feld markieren. Zwei Kinder mit Leibchen sind Krokodile und bewegen sich nur im Fluss. Die übrigen Kinder starten gemeinsam an einem Ufer. Auf Signal überqueren sie den Fluss. Gefangene Kinder werden in der nächsten Runde ebenfalls Krokodile; die letzte freie Person gewinnt.",
    coaching: ["Vor dem Start eine freie Lücke suchen", "Tempo und Laufrichtung verändern", "Fänger bleiben in der Flusszone", "Neue Runde starten, bevor zu viele Kinder warten"],
  },
  "waechtertor-passen": {
    description: "Zwei Passspieler versuchen, durch ein Tor zu passen, während ein Wächter den Passweg auf der Torlinie schließt.",
    setup: "Pro Gruppe ein etwa 4 m breites Stangen- oder Hütchentor in einem 10 × 8 m großen Feld aufbauen. Ein Wächter bewegt sich nur auf der Torlinie. Je ein Passspieler steht mit Abstand vor und hinter dem Tor. Sie passen durch eine freie Torhälfte und laufen nach jedem Pass außen auf die andere Seite. Erobert der Wächter den Ball, tauscht er mit dem Passgeber.",
    coaching: ["Vor dem Pass den Wächter beobachten", "Pass in die freie Torhälfte spielen", "Nach dem Pass außen am Tor vorbeilaufen", "Wächter bleibt auf der Linie und spielt kontrolliert"],
  },
  "passkreuz-nachlaufen": {
    description: "Vier Gruppen passen reihum durch die Mitte; jeder Passgeber läuft außen zur nächsten Gruppe.",
    setup: "Vier Starthütchen kreuzförmig mit 15–20 m Abstand aufstellen und die Kinder gleichmäßig dahinter verteilen. Mit einem Ball beginnen: Das erste Kind passt gerade durch die Mitte zur gegenüberliegenden Gruppe und läuft anschließend außen im Uhrzeigersinn zur nächsten Gruppe. Der Empfänger nimmt an und passt zur gegenüberliegenden Seite. Erst bei sicherem Ablauf einen zweiten Ball ergänzen.",
    coaching: ["Vor der Annahme über die Schulter schauen", "Flach in den Vorderfuß passen", "Ersten Kontakt in die Passrichtung mitnehmen", "Nach dem Pass außen laufen und die Mitte freihalten"],
  },
  "technikerkreis-blitzwechsel": {
    description: "Die ersten Kinder dribbeln zum Hütchenkreis, wenden dort und passen zurück zur eigenen Gruppe.",
    setup: "Vier bis sechs Starttore kreisförmig aufstellen; je zwei bis drei Kinder und ein Ball warten an jedem Tor. In 8–10 m Entfernung markiert ein kleiner Hütchenkreis in der Mitte den Gegenspieler. Die ersten Kinder dribbeln gleichzeitig bis kurz vor den Kreis, führen die vorgegebene Wende aus, beschleunigen zurück und passen durch ihr Starttor zum nächsten Kind.",
    coaching: ["Mit kleinen Kontakten zur Mitte dribbeln", "Vor der Wende abbremsen und tief stehen", "Ball eng mit Innen- oder Außenseite wenden", "Nach der Wende beschleunigen", "Bei viel Verkehr Gruppen zeitversetzt starten"],
  },
  "farbenpass-kompass": {
    description: "Der Trainer ruft eine Farbe. Nur die Kinder am passenden Farbtor passen durch ihr Tor und tauschen die Plätze.",
    setup: "Vier verschiedenfarbige Hütchentore mit viel Abstand als Kompass aufbauen. An jedem Tor stehen sich zwei kleine Gruppen gegenüber; eine Seite hat einen Ball. Der Trainer ruft eine Farbe. Nur am passenden Tor passt das erste Kind flach durch das Tor, läuft dem Ball nach und stellt sich gegenüber an. Der Empfänger kontrolliert den Ball und wartet auf das nächste Kommando.",
    coaching: ["Zuerst Farbe hören, dann starten", "Flach und mittig durch das Tor passen", "Dem Pass sofort auf die andere Seite folgen", "Später zwei Farben gleichzeitig aufrufen"],
  },
  "drei-gegen-drei-chaosstart": {
    description: "Zwei Dreierteams starten aus diagonal gegenüberliegenden Ecken und spielen auf vier Dribbeltore.",
    setup: "Ein 22 × 18 m großes Feld markieren und an jeder Seitenhälfte ein Dribbeltor aufbauen. Die drei Kinder eines Teams warten in einer Ecke, das andere Team diagonal gegenüber. Der Trainer spielt einen Ball in die Mitte; je drei Kinder starten ins Feld. Ein Punkt zählt, wenn ein Team kontrolliert durch eines der beiden gegnerischen Tore dribbelt. Danach starten neue Dreiergruppen.",
    coaching: ["Beim Start zuerst Ball, Gegner und freie Tore erfassen", "In Ballbesitz schnell Breite herstellen", "Kontrolliert durch das Tor dribbeln", "Nach Ballverlust sofort das nächste Tor sichern"],
  },
  "dribbeltor-bumerang": {
    description: "Jedes Kind dribbelt durch ein Tor, wendet direkt dahinter und sucht anschließend ein anderes Tor.",
    setup: "Sechs kleine Hütchentore sternförmig in einem 22 × 22 m großen Feld verteilen; jedes Kind hat einen Ball. Die Kinder dribbeln durch ein freies Tor, wenden spätestens zwei Meter dahinter und kehren durch dasselbe Tor zurück. Danach suchen sie ein anderes freies Tor. Jedes vollständig durchquerte Tor zählt einen Punkt.",
    coaching: ["Vor dem Tor aufschauen", "Ball eng durch das Tor führen", "Hinter dem Tor mit Sohle, Innen- oder Außenseite wenden", "Nach der Rückkehr Raum für ein neues Tor suchen"],
  },
  "inselwechsel-mit-ball": {
    description: "Vier Gruppen dribbeln auf Signal gleichzeitig von ihrer Insel zur nächsten freien Insel.",
    setup: "In jeder Ecke eines 20 × 20 m großen Feldes eine 4 × 4 m große Insel markieren. Die Kinder gleichmäßig auf die Inseln verteilen; jedes Kind hat einen Ball. Der Trainer gibt die Richtung vor, zum Beispiel im Uhrzeigersinn. Auf Signal dribbeln alle zur nächsten Insel. Ein Punkt gelingt, wenn die ganze Gruppe mit kontrollierten Bällen ankommt.",
    coaching: ["Vor dem Start Ziel und Laufweg ansehen", "Ball mit kleinen Kontakten kontrollieren", "In der Mitte nicht überholen oder kreuzen", "Später Richtung oder Zielinsel überraschend ändern"],
  },
  "torschuss-pendel": {
    description: "Ein Zuspieler passt in die Mitte; der Empfänger nimmt zum freien Tor mit und schließt ab.",
    setup: "Zwei Minitore gegenüber an den Enden eines 24 × 14 m großen Feldes aufstellen. Zwei Passstationen seitlich der Mitte markieren, die übrigen Kinder warten zentral. Ein Passgeber spielt zum ersten Kind in der Mitte. Dieses nimmt den Ball mit dem ersten Kontakt zu einem Tor mit und schließt ab. Danach wechselt es zur Passstation; der Passgeber stellt sich in der Mitte an. Seiten und Tore regelmäßig wechseln.",
    coaching: ["Vor dem Zuspiel zum Zieltor orientieren", "Ersten Kontakt aus dem Druck und Richtung Tor setzen", "Vor dem Abschluss aufschauen", "Mit rechts und links abschließen"],
  },
  "dreieck-vier-gegen-eins": {
    description: "Vier Ballbesitzer halten den Ball im Hütchendreieck gegen einen Balljäger und besetzen freie Seiten neu.",
    setup: "Pro Gruppe ein Hütchendreieck mit etwa 10 m Seitenlänge markieren. Drei Ballbesitzer stehen an den Ecken, der vierte bietet sich an einer freien Seite an; ein Balljäger verteidigt im Inneren. Die Außenspieler halten den Ball mit höchstens drei Kontakten. Nach einem Pass darf der Passgeber eine andere freie Position besetzen. Bei Ballgewinn wechselt der Balljäger mit dem Spieler, der den Ball verloren hat.",
    coaching: ["Ständig zwei Passwege anbieten", "Vor der Annahme zum nächsten Ziel schauen", "Passschärfe an die Entfernung anpassen", "Nach dem Pass nicht stehen bleiben"],
  },
};

export const library: Exercise[] = baseLibrary.map((exercise) => ({
  ...exercise,
  ...reviewedContent[exercise.id],
}));

export const exercises: Exercise[] = [library[0], library[3], library[5], library[7]];
