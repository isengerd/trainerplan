type Player = { x: number; y: number; toX: number; toY: number; team: "yellow" | "blue"; delay?: number };
type Route = { x1: number; y1: number; x2: number; y2: number; kind?: "run" | "ball" };
type Scene = { title: string; players: Player[]; routes: Route[]; ball?: { x: number; y: number; toX: number; toY: number }; goals?: { x: number; y: number; vertical?: boolean }[]; cones?: { x: number; y: number }[]; bridges?: { x: number; y: number; rotate?: number }[]; poleGates?: { x: number; y: number; rotate?: number }[]; river?: boolean };

const scenes: Scene[] = [
  {
    title: "Freies Dribbling",
    players: [{ x: 20, y: 25, toX: 38, toY: 38, team: "yellow" }, { x: 45, y: 70, toX: 58, toY: 48, team: "yellow", delay: -.5 }, { x: 75, y: 28, toX: 62, toY: 62, team: "yellow", delay: -1 }],
    routes: [{ x1: 20, y1: 25, x2: 38, y2: 38 }, { x1: 45, y1: 70, x2: 58, y2: 48 }, { x1: 75, y1: 28, x2: 62, y2: 62 }],
    ball: { x: 22, y: 27, toX: 40, toY: 40 }, cones: [{ x: 12, y: 16 }, { x: 88, y: 16 }, { x: 12, y: 84 }, { x: 88, y: 84 }],
  },
  {
    title: "Auf Farbsignal zum Tor",
    players: [{ x: 50, y: 50, toX: 78, toY: 22, team: "yellow" }, { x: 42, y: 58, toX: 20, toY: 78, team: "yellow", delay: -.7 }],
    routes: [{ x1: 50, y1: 50, x2: 78, y2: 22 }, { x1: 42, y1: 58, x2: 20, y2: 78 }], ball: { x: 52, y: 52, toX: 80, toY: 24 },
    goals: [{ x: 80, y: 17 }, { x: 17, y: 80 }, { x: 18, y: 18 }, { x: 82, y: 82 }],
  },
  {
    title: "Schatz holen & zurück",
    players: [{ x: 18, y: 32, toX: 48, toY: 48, team: "yellow" }, { x: 82, y: 68, toX: 52, toY: 52, team: "blue", delay: -.6 }],
    routes: [{ x1: 18, y1: 32, x2: 48, y2: 48 }, { x1: 82, y1: 68, x2: 52, y2: 52 }],
    cones: [{ x: 46, y: 46 }, { x: 50, y: 42 }, { x: 54, y: 48 }, { x: 49, y: 55 }],
  },
  {
    title: "Dribbling & Abschluss",
    players: [{ x: 18, y: 30, toX: 62, toY: 30, team: "yellow" }, { x: 18, y: 70, toX: 62, toY: 70, team: "blue", delay: -.5 }],
    routes: [{ x1: 18, y1: 30, x2: 64, y2: 30 }, { x1: 18, y1: 70, x2: 64, y2: 70 }, { x1: 64, y1: 30, x2: 88, y2: 30, kind: "ball" }, { x1: 64, y1: 70, x2: 88, y2: 70, kind: "ball" }],
    ball: { x: 21, y: 32, toX: 87, toY: 30 }, goals: [{ x: 90, y: 30, vertical: true }, { x: 90, y: 70, vertical: true }], cones: [{ x: 48, y: 30 }, { x: 48, y: 70 }],
  },
  {
    title: "1 gegen 1 – freies Tor erkennen",
    players: [{ x: 28, y: 50, toX: 66, toY: 27, team: "yellow" }, { x: 52, y: 50, toX: 62, toY: 40, team: "blue", delay: -.4 }],
    routes: [{ x1: 28, y1: 50, x2: 66, y2: 27 }, { x1: 66, y1: 27, x2: 88, y2: 24, kind: "ball" }], ball: { x: 30, y: 52, toX: 87, toY: 24 },
    goals: [{ x: 90, y: 24, vertical: true }, { x: 90, y: 76, vertical: true }],
  },
  {
    title: "3 gegen 3 auf vier Minitore",
    players: [{ x: 30, y: 25, toX: 48, toY: 18, team: "yellow" }, { x: 30, y: 50, toX: 54, toY: 50, team: "yellow", delay: -.3 }, { x: 30, y: 75, toX: 50, toY: 82, team: "yellow", delay: -.6 }, { x: 65, y: 28, toX: 58, toY: 38, team: "blue" }, { x: 68, y: 50, toX: 60, toY: 50, team: "blue", delay: -.4 }, { x: 65, y: 72, toX: 58, toY: 62, team: "blue", delay: -.8 }],
    routes: [{ x1: 30, y1: 50, x2: 54, y2: 50, kind: "ball" }, { x1: 54, y1: 50, x2: 88, y2: 22, kind: "ball" }], ball: { x: 32, y: 52, toX: 87, toY: 22 },
    goals: [{ x: 9, y: 22, vertical: true }, { x: 9, y: 78, vertical: true }, { x: 91, y: 22, vertical: true }, { x: 91, y: 78, vertical: true }],
  },
  {
    title: "2 gegen 2 nach Zuruf",
    players: [{ x: 18, y: 35, toX: 48, toY: 38, team: "yellow" }, { x: 18, y: 65, toX: 45, toY: 62, team: "yellow", delay: -.4 }, { x: 82, y: 35, toX: 57, toY: 42, team: "blue" }, { x: 82, y: 65, toX: 60, toY: 62, team: "blue", delay: -.4 }],
    routes: [{ x1: 18, y1: 35, x2: 48, y2: 38 }, { x1: 82, y1: 35, x2: 57, y2: 42 }], ball: { x: 50, y: 50, toX: 72, toY: 50 }, goals: [{ x: 9, y: 50, vertical: true }, { x: 91, y: 50, vertical: true }],
  },
  {
    title: "5 gegen 5 – frei spielen",
    players: [{ x: 24, y: 22, toX: 37, toY: 30, team: "yellow" }, { x: 24, y: 42, toX: 42, toY: 44, team: "yellow" }, { x: 24, y: 65, toX: 40, toY: 62, team: "yellow" }, { x: 45, y: 78, toX: 58, toY: 70, team: "yellow" }, { x: 76, y: 22, toX: 62, toY: 30, team: "blue" }, { x: 76, y: 42, toX: 61, toY: 44, team: "blue" }, { x: 76, y: 65, toX: 63, toY: 62, team: "blue" }, { x: 58, y: 78, toX: 52, toY: 70, team: "blue" }],
    routes: [{ x1: 24, y1: 42, x2: 42, y2: 44, kind: "ball" }, { x1: 42, y1: 44, x2: 58, y2: 70, kind: "ball" }], ball: { x: 26, y: 44, toX: 58, toY: 70 }, goals: [{ x: 7, y: 50, vertical: true }, { x: 93, y: 50, vertical: true }],
  },
  {
    title: "4 gegen 4 – Spielrichtung wechseln",
    players: [{ x: 30, y: 25, toX: 45, toY: 22, team: "yellow" }, { x: 35, y: 45, toX: 52, toY: 35, team: "yellow" }, { x: 30, y: 70, toX: 45, toY: 78, team: "yellow" }, { x: 68, y: 25, toX: 58, toY: 35, team: "blue" }, { x: 65, y: 50, toX: 55, toY: 54, team: "blue" }, { x: 70, y: 72, toX: 58, toY: 65, team: "blue" }],
    routes: [{ x1: 35, y1: 45, x2: 52, y2: 35, kind: "ball" }, { x1: 52, y1: 35, x2: 88, y2: 78, kind: "ball" }], ball: { x: 37, y: 47, toX: 87, toY: 78 }, goals: [{ x: 9, y: 22, vertical: true }, { x: 9, y: 78, vertical: true }, { x: 91, y: 22, vertical: true }, { x: 91, y: 78, vertical: true }],
  },
  {
    title: "Parcours: Slalom, Ringe, Tor",
    players: [{ x: 14, y: 50, toX: 75, toY: 50, team: "yellow" }],
    routes: [{ x1: 14, y1: 50, x2: 75, y2: 50 }, { x1: 75, y1: 50, x2: 90, y2: 50, kind: "ball" }], ball: { x: 16, y: 52, toX: 89, toY: 50 }, goals: [{ x: 92, y: 50, vertical: true }],
    cones: [{ x: 30, y: 40 }, { x: 38, y: 60 }, { x: 46, y: 40 }, { x: 54, y: 60 }, { x: 64, y: 50 }],
  },
  {
    title: "Durch wechselnde Tunnel dribbeln",
    players: [{ x: 16, y: 24, toX: 75, toY: 72, team: "yellow" }, { x: 18, y: 76, toX: 78, toY: 28, team: "blue", delay: -.7 }],
    routes: [{ x1: 16, y1: 24, x2: 38, y2: 45 }, { x1: 38, y1: 45, x2: 75, y2: 72 }, { x1: 18, y1: 76, x2: 52, y2: 58 }, { x1: 52, y1: 58, x2: 78, y2: 28 }],
    ball: { x: 18, y: 26, toX: 74, toY: 72 }, cones: [{ x: 35, y: 40 }, { x: 40, y: 48 }, { x: 52, y: 54 }, { x: 57, y: 62 }, { x: 67, y: 24 }, { x: 72, y: 32 }],
  },
  {
    title: "2 gegen 1 – Pass oder Dribbling",
    players: [{ x: 18, y: 30, toX: 60, toY: 30, team: "yellow" }, { x: 18, y: 70, toX: 66, toY: 62, team: "yellow", delay: -.3 }, { x: 54, y: 50, toX: 65, toY: 48, team: "blue", delay: -.6 }],
    routes: [{ x1: 18, y1: 30, x2: 48, y2: 36 }, { x1: 48, y1: 36, x2: 66, y2: 62, kind: "ball" }, { x1: 66, y1: 62, x2: 90, y2: 50, kind: "ball" }],
    ball: { x: 20, y: 32, toX: 89, toY: 50 }, goals: [{ x: 92, y: 50, vertical: true }],
  },
  {
    title: "Ball schützen & erobern",
    players: [{ x: 28, y: 28, toX: 40, toY: 42, team: "yellow" }, { x: 68, y: 28, toX: 55, toY: 42, team: "blue", delay: -.4 }, { x: 28, y: 72, toX: 42, toY: 58, team: "blue", delay: -.8 }, { x: 70, y: 72, toX: 58, toY: 58, team: "yellow", delay: -1.2 }],
    routes: [{ x1: 28, y1: 28, x2: 40, y2: 42 }, { x1: 68, y1: 28, x2: 55, y2: 42 }, { x1: 28, y1: 72, x2: 42, y2: 58 }], ball: { x: 30, y: 30, toX: 42, toY: 44 },
    cones: [{ x: 13, y: 15 }, { x: 87, y: 15 }, { x: 13, y: 85 }, { x: 87, y: 85 }],
  },
  {
    title: "Passen, mitnehmen, neues Tor",
    players: [{ x: 18, y: 50, toX: 42, toY: 28, team: "yellow" }, { x: 38, y: 50, toX: 68, toY: 68, team: "blue", delay: -.4 }],
    routes: [{ x1: 18, y1: 50, x2: 38, y2: 50, kind: "ball" }, { x1: 38, y1: 50, x2: 68, y2: 68, kind: "ball" }], ball: { x: 20, y: 50, toX: 68, toY: 68 },
    cones: [{ x: 30, y: 44 }, { x: 30, y: 56 }, { x: 56, y: 62 }, { x: 61, y: 70 }, { x: 72, y: 30 }, { x: 77, y: 38 }],
  },
  {
    title: "3 gegen 3 – nach Tor sofort wechseln",
    players: [{ x: 30, y: 28, toX: 48, toY: 35, team: "yellow" }, { x: 28, y: 52, toX: 52, toY: 52, team: "yellow", delay: -.3 }, { x: 30, y: 74, toX: 48, toY: 66, team: "yellow", delay: -.6 }, { x: 68, y: 30, toX: 58, toY: 40, team: "blue" }, { x: 70, y: 52, toX: 60, toY: 52, team: "blue", delay: -.3 }, { x: 68, y: 72, toX: 58, toY: 62, team: "blue", delay: -.6 }],
    routes: [{ x1: 28, y1: 52, x2: 52, y2: 52, kind: "ball" }, { x1: 52, y1: 52, x2: 91, y2: 50, kind: "ball" }], ball: { x: 30, y: 52, toX: 90, toY: 50 }, goals: [{ x: 8, y: 50, vertical: true }, { x: 92, y: 50, vertical: true }],
  },
  {
    title: "Fangen, Brücke bilden, befreien",
    players: [{ x: 18, y: 24, toX: 65, toY: 32, team: "yellow" }, { x: 78, y: 30, toX: 58, toY: 36, team: "blue", delay: -.35 }, { x: 20, y: 76, toX: 48, toY: 64, team: "yellow", delay: -.7 }, { x: 72, y: 76, toX: 52, toY: 68, team: "blue", delay: -1 }],
    routes: [{ x1: 18, y1: 24, x2: 65, y2: 32 }, { x1: 78, y1: 30, x2: 58, y2: 36 }, { x1: 20, y1: 76, x2: 48, y2: 64 }],
    bridges: [{ x: 43, y: 48, rotate: 0 }, { x: 67, y: 58, rotate: 18 }], cones: [{ x: 10, y: 12 }, { x: 90, y: 12 }, { x: 10, y: 88 }, { x: 90, y: 88 }],
  },
  {
    title: "Den Krokodil-Fluss überqueren",
    players: [{ x: 16, y: 20, toX: 84, toY: 22, team: "yellow" }, { x: 16, y: 40, toX: 84, toY: 38, team: "yellow", delay: -.25 }, { x: 16, y: 62, toX: 84, toY: 65, team: "yellow", delay: -.5 }, { x: 16, y: 80, toX: 84, toY: 78, team: "yellow", delay: -.75 }, { x: 50, y: 34, toX: 50, toY: 62, team: "blue", delay: -.3 }, { x: 55, y: 70, toX: 52, toY: 42, team: "blue", delay: -.8 }],
    routes: [{ x1: 16, y1: 20, x2: 84, y2: 22 }, { x1: 16, y1: 40, x2: 84, y2: 38 }, { x1: 16, y1: 62, x2: 84, y2: 65 }, { x1: 16, y1: 80, x2: 84, y2: 78 }],
    river: true, cones: [{ x: 38, y: 10 }, { x: 62, y: 10 }, { x: 38, y: 90 }, { x: 62, y: 90 }],
  },
  {
    title: "Durch das Wächtertor passen & nachlaufen",
    players: [{ x: 30, y: 19, toX: 15, toY: 72, team: "yellow" }, { x: 30, y: 81, toX: 30, toY: 78, team: "yellow", delay: -.5 }, { x: 30, y: 50, toX: 36, toY: 50, team: "blue", delay: -.25 }, { x: 70, y: 19, toX: 84, toY: 72, team: "yellow", delay: -.7 }, { x: 70, y: 81, toX: 70, toY: 78, team: "yellow", delay: -1 }, { x: 70, y: 50, toX: 64, toY: 50, team: "blue", delay: -.6 }],
    routes: [{ x1: 30, y1: 20, x2: 30, y2: 79, kind: "ball" }, { x1: 30, y1: 20, x2: 15, y2: 72 }, { x1: 70, y1: 20, x2: 70, y2: 79, kind: "ball" }, { x1: 70, y1: 20, x2: 84, y2: 72 }],
    ball: { x: 30, y: 24, toX: 30, toY: 76 }, poleGates: [{ x: 30, y: 50 }, { x: 70, y: 50 }],
  },
  {
    title: "Passen, öffnen, zur nächsten Gruppe laufen",
    players: [{ x: 50, y: 14, toX: 79, toY: 45, team: "yellow" }, { x: 86, y: 50, toX: 55, toY: 79, team: "blue", delay: -.35 }, { x: 50, y: 86, toX: 20, toY: 55, team: "yellow", delay: -.7 }, { x: 14, y: 50, toX: 45, toY: 20, team: "blue", delay: -1.05 }, { x: 50, y: 8, toX: 50, toY: 11, team: "yellow", delay: -.2 }, { x: 92, y: 50, toX: 89, toY: 50, team: "blue", delay: -.55 }, { x: 50, y: 92, toX: 50, toY: 89, team: "yellow", delay: -.9 }, { x: 8, y: 50, toX: 11, toY: 50, team: "blue", delay: -1.2 }],
    routes: [{ x1: 14, y1: 50, x2: 86, y2: 50, kind: "ball" }, { x1: 50, y1: 86, x2: 50, y2: 14, kind: "ball" }, { x1: 50, y1: 14, x2: 79, y2: 45 }, { x1: 86, y1: 50, x2: 55, y2: 79 }, { x1: 50, y1: 86, x2: 20, y2: 55 }, { x1: 14, y1: 50, x2: 45, y2: 20 }],
    ball: { x: 15, y: 50, toX: 85, toY: 50 }, cones: [{ x: 50, y: 11 }, { x: 89, y: 50 }, { x: 50, y: 89 }, { x: 11, y: 50 }],
  },
  {
    title: "Andribbeln, wenden & explosiv zurück",
    players: [{ x: 50, y: 12, toX: 50, toY: 34, team: "yellow" }, { x: 82, y: 28, toX: 64, toY: 41, team: "blue", delay: -.3 }, { x: 82, y: 72, toX: 64, toY: 59, team: "yellow", delay: -.6 }, { x: 50, y: 88, toX: 50, toY: 66, team: "blue", delay: -.9 }, { x: 18, y: 72, toX: 36, toY: 59, team: "yellow", delay: -1.2 }, { x: 18, y: 28, toX: 36, toY: 41, team: "blue", delay: -1.5 }],
    routes: [{ x1: 50, y1: 12, x2: 50, y2: 34, kind: "ball" }, { x1: 82, y1: 28, x2: 64, y2: 41, kind: "ball" }, { x1: 82, y1: 72, x2: 64, y2: 59, kind: "ball" }, { x1: 50, y1: 88, x2: 50, y2: 66, kind: "ball" }, { x1: 18, y1: 72, x2: 36, y2: 59, kind: "ball" }, { x1: 18, y1: 28, x2: 36, y2: 41, kind: "ball" }],
    ball: { x: 50, y: 15, toX: 50, toY: 35 }, cones: [{ x: 45, y: 38 }, { x: 50, y: 36 }, { x: 55, y: 38 }, { x: 61, y: 45 }, { x: 63, y: 50 }, { x: 61, y: 55 }, { x: 55, y: 62 }, { x: 50, y: 64 }, { x: 45, y: 62 }, { x: 39, y: 55 }, { x: 37, y: 50 }, { x: 39, y: 45 }, { x: 50, y: 8 }, { x: 86, y: 25 }, { x: 86, y: 75 }, { x: 50, y: 92 }, { x: 14, y: 75 }, { x: 14, y: 25 }],
  },
  {
    title: "Farbtor erkennen und neu besetzen",
    players: [{ x: 50, y: 50, toX: 50, toY: 18, team: "yellow" }, { x: 25, y: 50, toX: 18, toY: 78, team: "blue" }, { x: 75, y: 50, toX: 82, toY: 22, team: "yellow" }, { x: 50, y: 75, toX: 78, toY: 82, team: "blue" }],
    routes: [{ x1: 25, y1: 50, x2: 50, y2: 50, kind: "ball" }, { x1: 50, y1: 50, x2: 50, y2: 18, kind: "ball" }, { x1: 50, y1: 50, x2: 78, y2: 82 }], ball: { x: 27, y: 50, toX: 50, toY: 18 },
    poleGates: [{ x: 50, y: 12 }, { x: 88, y: 50, rotate: 90 }, { x: 50, y: 88 }, { x: 12, y: 50, rotate: 90 }],
  },
  {
    title: "3 gegen 3 aus diagonalen Ecken",
    players: [{ x: 14, y: 18, toX: 44, toY: 42, team: "yellow" }, { x: 20, y: 26, toX: 46, toY: 56, team: "yellow" }, { x: 28, y: 18, toX: 52, toY: 34, team: "yellow" }, { x: 86, y: 82, toX: 58, toY: 60, team: "blue" }, { x: 80, y: 74, toX: 54, toY: 48, team: "blue" }, { x: 72, y: 82, toX: 48, toY: 68, team: "blue" }],
    routes: [{ x1: 14, y1: 18, x2: 44, y2: 42 }, { x1: 86, y1: 82, x2: 58, y2: 60 }, { x1: 50, y1: 50, x2: 88, y2: 22, kind: "ball" }], ball: { x: 50, y: 50, toX: 88, toY: 22 },
    poleGates: [{ x: 10, y: 25, rotate: 90 }, { x: 10, y: 75, rotate: 90 }, { x: 90, y: 25, rotate: 90 }, { x: 90, y: 75, rotate: 90 }],
  },
  {
    title: "Durchdribbeln, wenden, neues Tor",
    players: [{ x: 50, y: 50, toX: 76, toY: 22, team: "yellow" }, { x: 36, y: 60, toX: 20, toY: 78, team: "blue", delay: -.5 }, { x: 62, y: 64, toX: 80, toY: 76, team: "yellow", delay: -1 }],
    routes: [{ x1: 50, y1: 50, x2: 76, y2: 22, kind: "ball" }, { x1: 76, y1: 22, x2: 36, y2: 20, kind: "ball" }, { x1: 36, y1: 60, x2: 20, y2: 78, kind: "ball" }], ball: { x: 52, y: 52, toX: 36, toY: 20 },
    poleGates: [{ x: 50, y: 12 }, { x: 82, y: 27, rotate: 45 }, { x: 82, y: 73, rotate: 135 }, { x: 50, y: 88 }, { x: 18, y: 73, rotate: 45 }, { x: 18, y: 27, rotate: 135 }],
  },
  {
    title: "Mit Ball die Insel wechseln",
    players: [{ x: 18, y: 18, toX: 82, toY: 18, team: "yellow" }, { x: 82, y: 18, toX: 82, toY: 82, team: "blue" }, { x: 82, y: 82, toX: 18, toY: 82, team: "yellow" }, { x: 18, y: 82, toX: 18, toY: 18, team: "blue" }],
    routes: [{ x1: 18, y1: 18, x2: 82, y2: 18, kind: "ball" }, { x1: 82, y1: 18, x2: 82, y2: 82, kind: "ball" }, { x1: 82, y1: 82, x2: 18, y2: 82, kind: "ball" }, { x1: 18, y1: 82, x2: 18, y2: 18, kind: "ball" }], ball: { x: 20, y: 20, toX: 80, toY: 18 },
    cones: [{ x: 10, y: 10 }, { x: 26, y: 10 }, { x: 10, y: 26 }, { x: 90, y: 10 }, { x: 74, y: 10 }, { x: 90, y: 26 }, { x: 90, y: 90 }, { x: 74, y: 90 }, { x: 90, y: 74 }, { x: 10, y: 90 }, { x: 26, y: 90 }, { x: 10, y: 74 }],
  },
  {
    title: "Mitnahme und Abschluss im Wechsel",
    players: [{ x: 50, y: 32, toX: 76, toY: 50, team: "yellow" }, { x: 50, y: 68, toX: 24, toY: 50, team: "blue", delay: -.6 }, { x: 38, y: 50, toX: 48, toY: 34, team: "yellow", delay: -.3 }, { x: 62, y: 50, toX: 52, toY: 66, team: "blue", delay: -.9 }],
    routes: [{ x1: 38, y1: 50, x2: 50, y2: 32, kind: "ball" }, { x1: 50, y1: 32, x2: 90, y2: 50, kind: "ball" }, { x1: 62, y1: 50, x2: 50, y2: 68, kind: "ball" }, { x1: 50, y1: 68, x2: 10, y2: 50, kind: "ball" }], ball: { x: 38, y: 50, toX: 90, toY: 50 }, goals: [{ x: 8, y: 50, vertical: true }, { x: 92, y: 50, vertical: true }],
  },
  {
    title: "4 gegen 1 im Dreieck",
    players: [{ x: 50, y: 16, toX: 72, toY: 75, team: "yellow" }, { x: 20, y: 78, toX: 50, toY: 16, team: "yellow" }, { x: 80, y: 78, toX: 20, toY: 78, team: "yellow" }, { x: 50, y: 84, toX: 80, toY: 78, team: "yellow" }, { x: 50, y: 52, toX: 60, toY: 62, team: "blue" }],
    routes: [{ x1: 50, y1: 16, x2: 80, y2: 78, kind: "ball" }, { x1: 80, y1: 78, x2: 20, y2: 78, kind: "ball" }, { x1: 20, y1: 78, x2: 50, y2: 16, kind: "ball" }], ball: { x: 50, y: 18, toX: 78, toY: 76 }, cones: [{ x: 50, y: 10 }, { x: 12, y: 84 }, { x: 88, y: 84 }],
  },
];

type PitchProps = { variant?: number; animated?: boolean; label?: string };

export function Pitch({ variant = 0, animated = false, label }: PitchProps) {
  const scene = scenes[variant % scenes.length];
  return (
    <div className={`pitch scene-pitch ${animated ? "is-animated" : ""}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <span className="pitch-line center" /><span className="pitch-circle" /><span className="pitch-box left" /><span className="pitch-box right" />
      <svg className="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs><marker id={`route-arrow-${variant}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,.86)" /></marker></defs>
        {scene.routes.map((route, index) => <line key={index} className={route.kind === "ball" ? "ball-route" : "run-route"} x1={route.x1} y1={route.y1} x2={route.x2} y2={route.y2} markerEnd={`url(#route-arrow-${variant})`} />)}
      </svg>
      {scene.goals?.map((goal, index) => <span key={`goal-${index}`} className={`scene-goal ${goal.vertical ? "vertical" : ""}`} style={{ left: `${goal.x}%`, top: `${goal.y}%` }} />)}
      {scene.river && <span className="scene-river"><i>KROKODIL-ZONE</i></span>}
      {scene.bridges?.map((bridge, index) => <span key={`bridge-${index}`} className="scene-bridge" style={{ left: `${bridge.x}%`, top: `${bridge.y}%`, transform: `translate(-50%, -50%) rotate(${bridge.rotate ?? 0}deg)` }}><i /><b /></span>)}
      {scene.poleGates?.map((gate, index) => <span key={`pole-gate-${index}`} className="scene-pole-gate" style={{ left: `${gate.x}%`, top: `${gate.y}%`, transform: `translate(-50%, -50%) rotate(${gate.rotate ?? 0}deg)` }}><i /><b /></span>)}
      {scene.cones?.map((cone, index) => <span key={`cone-${index}`} className="scene-cone" style={{ left: `${cone.x}%`, top: `${cone.y}%` }} />)}
      {scene.players.map((player, index) => <span key={index} className={`scene-player team-${player.team}`} style={{ "--x": `${player.x}%`, "--y": `${player.y}%`, "--x2": `${player.toX}%`, "--y2": `${player.toY}%`, "--delay": `${player.delay ?? index * -.18}s` } as React.CSSProperties}><i /></span>)}
      {scene.ball && <span className="scene-ball" style={{ "--x": `${scene.ball.x}%`, "--y": `${scene.ball.y}%`, "--x2": `${scene.ball.toX}%`, "--y2": `${scene.ball.toY}%` } as React.CSSProperties} />}
      <span className="scene-caption">{scene.title}</span>
    </div>
  );
}
