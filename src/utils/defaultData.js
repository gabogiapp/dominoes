// ─── Default demo data — 8 bodega-style teams ──────────────────────

let _nextId = 1;
function tid() { return `team_${_nextId++}`; }

export const DEFAULT_TEAMS = [
  { id: tid(), name: 'Los Tigres', player1: 'Carlos', player2: 'Miguel' },
  { id: tid(), name: 'El Barrio', player1: 'Danny', player2: 'Julio' },
  { id: tid(), name: 'Mambo Kings', player1: 'Raul', player2: 'Hector' },
  { id: tid(), name: 'Domino Boys', player1: 'Papi', player2: 'Luis' },
  { id: tid(), name: 'La Familia', player1: 'Abuela', player2: 'Tio' },
  { id: tid(), name: 'Calle Ocho', player1: 'Manny', player2: 'Oscar' },
  { id: tid(), name: 'Los Campeones', player1: 'Ricky', player2: 'Eddie' },
  { id: tid(), name: 'Bodega Cats', player1: 'Smokey', player2: 'Shadow' },
];

export const DEFAULT_TABLES_COUNT = 2;

export const DEFAULT_CONFIG = {
  tournamentName: 'Dominoes Tournament',
  eventDate: 'October 17th 2026',
  googleFormUrl: 'https://forms.gle/2iurkc1sxYMzaka66',
  googleSheetUrl: 'https://docs.google.com/spreadsheets/d/1Aktx3Tom9oojykV_o-heJLOLWrSLE5o4idCwhRlxR_Y/edit?usp=sharing',
};
