import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGoogleSheetCsvUrl,
  parseCsvRows,
  parseTeamsFromCsv,
  isPaidValue,
} from '../src/utils/googleSheets.js';

describe('Google Sheets Live Sync', () => {
  it('converts standard Google Sheet URL to CSV export URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1Aktx3Tom9oojykV_o-heJLOLWrSLE5o4idCwhRlxR_Y/edit?usp=sharing';
    const csvUrl = getGoogleSheetCsvUrl(url);
    assert.equal(
      csvUrl,
      'https://docs.google.com/spreadsheets/d/1Aktx3Tom9oojykV_o-heJLOLWrSLE5o4idCwhRlxR_Y/gviz/tq?tqx=out:csv'
    );
  });

  it('correctly parses CSV with commas, quotes, and newlines', () => {
    const csv = `"Timestamp","Team Name","Team Member 1","Team Member 2","Skill Level"
"2026/09/18 1:00 PM","Los Tigres, NYC","Carlos","Miguel","Intermediate"
"2026/09/18 1:05 PM","El Barrio","Danny","Julio","Expert"`;

    const rows = parseCsvRows(csv);
    assert.equal(rows.length, 3);
    assert.equal(rows[1][1], 'Los Tigres, NYC');
    assert.equal(rows[2][1], 'El Barrio');
  });

  it('identifies truthy paid values', () => {
    assert.equal(isPaidValue('TRUE'), true);
    assert.equal(isPaidValue('true'), true);
    assert.equal(isPaidValue('yes'), true);
    assert.equal(isPaidValue('paid'), true);
    assert.equal(isPaidValue('1'), true);
    assert.equal(isPaidValue('FALSE'), false);
    assert.equal(isPaidValue(''), false);
    assert.equal(isPaidValue(null), false);
  });

  it('filters only paid teams when Paid column exists', () => {
    const csv = `"Timestamp","Team Name","Team Member 1","Team Member 2","Skill Level","Paid"
"2026/09/18","Team A","Alice","Bob","Pro","TRUE"
"2026/09/18","Team B","Charlie","Dave","Amateur","FALSE"
"2026/09/18","Team C","Eve","Frank","Intermediate","yes"`;

    const result = parseTeamsFromCsv(csv);
    assert.equal(result.rawCount, 3);
    assert.equal(result.paidCount, 2);
    assert.equal(result.teams.length, 2);
    assert.equal(result.teams[0].name, 'Team A');
    assert.equal(result.teams[1].name, 'Team C');
    assert.equal(result.missingPaidColumn, false);
  });

  it('flags missingPaidColumn when Paid column is absent', () => {
    const csv = `"Timestamp","Team Name","Team Member 1","Team Member 2","Skill Level"
"2026/09/18","Team A","Alice","Bob","Pro"`;

    const result = parseTeamsFromCsv(csv);
    assert.equal(result.rawCount, 1);
    assert.equal(result.paidCount, 0);
    assert.equal(result.teams.length, 0);
    assert.equal(result.missingPaidColumn, true);
  });

  it('safely ignores blank rows with FALSE paid values', () => {
    const csv = `"Timestamp","Team Name","Team Member 1","Team Member 2","Skill Level","Paid"
"","","","","","FALSE"
"","","","","","FALSE"
"2026/09/18","Gabe & Victor","Gabe","Victor","Expert","TRUE"
"","","","","","FALSE"`;

    const result = parseTeamsFromCsv(csv);
    assert.equal(result.rawCount, 1);
    assert.equal(result.paidCount, 1);
    assert.equal(result.teams.length, 1);
    assert.equal(result.teams[0].name, 'Gabe & Victor');
    assert.equal(result.teams[0].player1, 'Gabe');
    assert.equal(result.teams[0].player2, 'Victor');
  });

  it('trims whitespace on team and player names', () => {
    const csv = `"Timestamp","Team Name","Team Member 1","Team Member 2","Skill Level","Paid"
"2026/09/18","  Los Tigres  "," Carlos "," Miguel  ","Expert","yes"`;

    const result = parseTeamsFromCsv(csv);
    assert.equal(result.teams.length, 1);
    assert.equal(result.teams[0].name, 'Los Tigres');
    assert.equal(result.teams[0].player1, 'Carlos');
    assert.equal(result.teams[0].player2, 'Miguel');
  });
});
