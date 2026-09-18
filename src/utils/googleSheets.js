// ─── Google Sheets Live Sync ──────────────────────────────────────────
// Converts Google Sheet link to CSV, parses rows, and extracts paid teams.

export const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Aktx3Tom9oojykV_o-heJLOLWrSLE5o4idCwhRlxR_Y/edit?usp=sharing';

/**
 * Normalizes any Google Sheets URL into its public CSV export URL.
 */
export function getGoogleSheetCsvUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  // If already a CSV export URL
  if (trimmed.includes('output=csv') || trimmed.includes('tqx=out:csv')) {
    return trimmed;
  }

  // Extract sheet ID from standard URL /spreadsheets/d/<ID>/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
  }

  return trimmed;
}

/**
 * Standard CSV line parser taking quotes and escaped quotes into account.
 */
export function parseCsvRows(csvText) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      currentVal = '';
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Checks if a cell value indicates "Paid".
 */
export function isPaidValue(val) {
  if (!val) return false;
  const cleaned = String(val).trim().toLowerCase();
  return ['true', 'yes', 'y', 'paid', 'x', '1', 'ok', 'checked', 'confirmed'].includes(cleaned);
}

/**
 * Parses CSV text into team objects according to detected columns.
 */
export function parseTeamsFromCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return {
      teams: [],
      allSubmissions: [],
      missingPaidColumn: false,
      rawCount: 0,
      paidCount: 0,
    };
  }

  const headers = rows[0].map(h => h.toLowerCase());

  // Find column indices
  let teamIdx = headers.findIndex(h => h.includes('team name') || h.includes('team'));
  if (teamIdx === -1) teamIdx = 1; // standard Google Form column B

  let p1Idx = headers.findIndex(h => h.includes('member 1') || h.includes('player 1') || h.includes('p1'));
  if (p1Idx === -1) p1Idx = 2; // standard Google Form column C

  let p2Idx = headers.findIndex(h => h.includes('member 2') || h.includes('player 2') || h.includes('p2'));
  if (p2Idx === -1) p2Idx = 3; // standard Google Form column D

  const paidIdx = headers.findIndex(h =>
    h.includes('paid') || h.includes('fee') || h.includes('status') || h.includes('confirmed')
  );

  const missingPaidColumn = (paidIdx === -1);

  const allSubmissions = [];
  const paidTeams = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const teamName = row[teamIdx] || '';
    if (!teamName.trim()) continue;

    const player1 = row[p1Idx] || 'Player 1';
    const player2 = row[p2Idx] || 'Player 2';
    const paidRaw = paidIdx !== -1 ? row[paidIdx] : '';
    const isPaid = paidIdx !== -1 ? isPaidValue(paidRaw) : false;

    const submission = {
      id: `sheet_team_${i}`,
      name: teamName.trim(),
      player1: player1.trim(),
      player2: player2.trim(),
      isPaid,
      withdrawn: false,
    };

    allSubmissions.push(submission);
    if (isPaid) {
      paidTeams.push(submission);
    }
  }

  return {
    teams: paidTeams,
    allSubmissions,
    missingPaidColumn,
    rawCount: allSubmissions.length,
    paidCount: paidTeams.length,
  };
}

/**
 * Fetches and parses teams directly from a Google Sheet.
 */
export async function fetchTeamsFromGoogleSheet(sheetUrl = DEFAULT_SHEET_URL) {
  try {
    const csvUrl = getGoogleSheetCsvUrl(sheetUrl);
    if (!csvUrl) {
      throw new Error('Invalid Google Sheet URL provided.');
    }

    const response = await fetch(csvUrl, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet (Status: ${response.status})`);
    }

    const csvText = await response.text();
    const result = parseTeamsFromCsv(csvText);

    return {
      success: true,
      ...result,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      teams: [],
      allSubmissions: [],
      missingPaidColumn: false,
      rawCount: 0,
      paidCount: 0,
      error: err.message || 'Error fetching teams from Google Sheet',
    };
  }
}
