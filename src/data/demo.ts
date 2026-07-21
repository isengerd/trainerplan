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
};

export const library: Exercise[] = [
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
    id: "farbenpass-kompass", title: "Farbenpass-Kompass", description: "Nach einem Farbzeichen lösen sich die Kinder vom Zentrum, spielen durch das passende Passtor und besetzen eine neue Position.",
    duration: 12, players: "8–16", ageGroup: "F-Jugend", ageRange: "U8/U9", category: "Einstieg", accent: "#58a6ff", intensity: "Mittel",
    focus: ["Passspiel", "Wahrnehmung"], setup: "Vier farblich markierte Hütchentore als Kompass um ein 16 × 16 m großes Zentrum stellen. Je zwei bis vier Kinder starten an jeder Seite.",
    coaching: ["Vor der Ballannahme zur Farbe orientieren", "Flach durch das Tor passen", "Nach dem Pass sofort eine freie Seite anlaufen"],
    materials: [{ id: "balls", count: 4 }, { id: "cones", count: 16 }], fieldSize: "20 × 20 m", variant: 20,
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

export const exercises: Exercise[] = [library[0], library[3], library[5], library[7]];
