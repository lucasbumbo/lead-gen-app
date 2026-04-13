/**
 * historyService.js
 * Saves and reads local search history to/from data/history.json
 */

const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../data/history.json');
const DATA_DIR = path.join(__dirname, '../data');

/** Ensure the data directory exists */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Read the full history array */
function readHistory() {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Save a new search entry to history */
function saveSearch({ niche, city, totalLeads, csvFile }) {
  const history = readHistory();
  const entry = {
    id: Date.now(),
    niche,
    city,
    date: new Date().toISOString(),
    totalLeads,
    csvFile: csvFile || null,
  };
  history.unshift(entry); // newest first
  // Keep only the last 50 searches
  const trimmed = history.slice(0, 50);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  return entry;
}

module.exports = { readHistory, saveSearch };
