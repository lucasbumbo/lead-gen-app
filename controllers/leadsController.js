/**
 * leadsController.js
 * Orchestrates the full lead generation pipeline:
 * Fetch → Clean → Score → Outreach → Export → Save History
 */

const { searchBusinesses }   = require('../services/placesService');
const { cleanLeads }         = require('../services/cleaningService');
const { scoreLeads }         = require('../services/scoringService');
const { addOutreachMessages } = require('../services/outreachService');
const { exportToCSV }        = require('../services/exportService');
const { saveSearch, readHistory } = require('../services/historyService');
const { getExportPath }      = require('../services/exportService');
const path = require('path');
const fs   = require('fs');

/**
 * POST /api/leads
 * Main search endpoint — runs the full automated pipeline.
 */
async function getLeads(req, res) {
  const { niche, city } = req.body;

  if (!niche || !city) {
    return res.status(400).json({ error: 'Both "niche" and "city" are required.' });
  }

  try {
    // 1. Fetch raw leads from Google Places
    const raw = await searchBusinesses(niche.trim(), city.trim());

    // 2. Clean: normalize phone/website, remove duplicates
    const cleaned = cleanLeads(raw);

    // 3. Score: rank by completeness + business potential
    const scored = scoreLeads(cleaned);

    // 4. Outreach: generate a message per lead
    const leads = addOutreachMessages(scored);

    // 5. Export to CSV automatically
    const csvFile = exportToCSV(leads, niche.trim(), city.trim());

    // 6. Save to search history
    saveSearch({ niche: niche.trim(), city: city.trim(), totalLeads: leads.length, csvFile });

    return res.json({ leads, csvFile });
  } catch (err) {
    console.error('Pipeline error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch leads. Check your API key and try again.' });
  }
}

/**
 * GET /api/history
 * Returns the saved search history.
 */
function getHistory(req, res) {
  try {
    const history = readHistory();
    return res.json({ history });
  } catch (err) {
    return res.status(500).json({ error: 'Could not read history.' });
  }
}

/**
 * GET /api/export/:filename
 * Download a previously generated CSV file.
 */
function downloadExport(req, res) {
  const { filename } = req.params;
  const filepath = getExportPath(filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Export file not found.' });
  }

  res.download(filepath, filename);
}

module.exports = { getLeads, getHistory, downloadExport };
