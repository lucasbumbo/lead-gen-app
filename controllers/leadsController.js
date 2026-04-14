/**
 * leadsController.js
 * Orchestrates the full lead generation pipeline:
 * Fetch (Google + Foursquare) → Clean → Score → Outreach → Export → Save History
 */

const { searchBusinesses }    = require('../services/placesService');
const { searchFoursquare }    = require('../services/foursquareService');
const { cleanLeads }          = require('../services/cleaningService');
const { scoreLeads }          = require('../services/scoringService');
const { addOutreachMessages } = require('../services/outreachService');
const { exportToCSV, getExportPath } = require('../services/exportService');
const { saveSearch, readHistory }    = require('../services/historyService');
const fs = require('fs');

/**
 * POST /api/leads
 * Accepts: { niche, city, brazilTab? }
 * Runs the full automated pipeline and returns processed leads + CSV filename.
 */
async function getLeads(req, res) {
  const { niche, city, brazilTab = false } = req.body;

  if (!niche || !city) {
    return res.status(400).json({ error: 'Both "niche" and "city" are required.' });
  }

  try {
    // 1. Fetch from Google Places + Foursquare in parallel
    const [googleRaw, foursquareRaw] = await Promise.all([
      searchBusinesses(niche.trim(), city.trim(), { brazilTab }),
      searchFoursquare(niche.trim(), city.trim(), { brazilTab }),
    ]);

    const raw = [...googleRaw, ...foursquareRaw];

    // 2. Normalize phone/website, remove duplicates
    const cleaned = cleanLeads(raw);

    // 3. Score and rank
    const scored = scoreLeads(cleaned);

    // 4. Generate outreach messages (EN or PT-BR based on brazilTab)
    const leads = addOutreachMessages(scored);

    // 5. Auto-export to CSV
    const csvFile = exportToCSV(leads, niche.trim(), city.trim());

    // 6. Save to local history
    saveSearch({
      niche:      niche.trim(),
      city:       city.trim(),
      brazilTab,
      totalLeads: leads.length,
      csvFile,
    });

    return res.json({ leads, csvFile });
  } catch (err) {
    console.error('[leadsController] Pipeline error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch leads.' });
  }
}

/**
 * GET /api/leads/history
 */
function getHistory(req, res) {
  try {
    return res.json({ history: readHistory() });
  } catch (err) {
    return res.status(500).json({ error: 'Could not read history.' });
  }
}

/**
 * GET /api/leads/export/:filename
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
