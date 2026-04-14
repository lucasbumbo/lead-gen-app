/**
 * exportService.js
 * Generates a CSV file from leads and saves it to data/exports/.
 * Uses Node's built-in fs — no external libraries needed.
 */

const fs   = require('fs');
const path = require('path');

const EXPORTS_DIR = path.join(__dirname, '../data/exports');

function ensureExportsDir() {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
}

/** Escape a CSV cell: wrap in double-quotes if it contains commas, quotes, or newlines */
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a safe filename from niche + city + date */
function buildFilename(niche, city) {
  const slug = `${niche}_${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${slug}_${date}.csv`;
}

/** Convert leads array to a CSV string (Instagram column after Website) */
function leadsToCSV(leads) {
  const headers = [
    'Flag',
    'Name',
    'City',
    'Niche',
    'Phone',
    'Website',
    'Instagram',
    'Rating',
    'Reviews',
    'Score',
    'Score Label',
    'Outreach Message',
  ];

  const rows = leads.map((lead) => [
    lead.brazilTab ? '🇧🇷' : '🇺🇸',
    lead.name,
    lead.city,
    lead.niche,
    lead.phone,
    lead.website,
    lead.instagram,
    lead.rating,
    lead.reviewCount,
    lead.score,
    lead.scoreLabel,
    lead.outreachMessage,
  ]);

  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return lines.join('\n');
}

/**
 * Save leads as a CSV file.
 * Returns the filename (not full path) for use in download links.
 */
function exportToCSV(leads, niche, city) {
  ensureExportsDir();
  const filename = buildFilename(niche, city);
  const filepath = path.join(EXPORTS_DIR, filename);
  fs.writeFileSync(filepath, leadsToCSV(leads), 'utf-8');
  return filename;
}

/** Sanitize and return the full path to an export file */
function getExportPath(filename) {
  const safe = path.basename(filename);
  return path.join(EXPORTS_DIR, safe);
}

module.exports = { exportToCSV, getExportPath };
