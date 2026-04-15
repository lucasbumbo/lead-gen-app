/**
 * leadsController.js
 * Orchestrates the full lead generation pipeline:
 * Fetch (Google + Foursquare) → Clean → Score → Outreach → Export → Save History
 */

const { searchBusinesses }    = require('../services/placesService');
const { searchFoursquare }    = require('../services/foursquareService');
const { cleanLeads, filterByLocation } = require('../services/cleaningService');
const { scoreLeads }          = require('../services/scoringService');
const { addOutreachMessages } = require('../services/outreachService');
const { exportToCSV, getExportPath } = require('../services/exportService');
const { saveSearch, readHistory }    = require('../services/historyService');
const fs = require('fs');

// ── Simple in-memory search cache (30-minute TTL) ────────────────────────────
// BUG FIX: Identical searches previously re-hit the Google + Foursquare APIs
// every time, wasting API quota and slowing repeat queries.
const searchCache = new Map();
const CACHE_TTL   = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  // Limit cache size to 100 entries (simple LRU eviction: drop oldest)
  if (searchCache.size >= 100) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(key, { data, ts: Date.now() });
}

/**
 * POST /api/leads
 * Accepts: { niche, city, brazilTab? }
 * Runs the full automated pipeline and returns processed leads + CSV filename.
 */
async function getLeads(req, res) {
  const { niche, city, brazilTab = false } = req.body;

  // BUG FIX: Original check only caught empty strings. Added minimum length
  // validation to reject junk inputs that still fire API calls.
  if (!niche || !city) {
    return res.status(400).json({ error: 'Both "niche" and "city" are required.' });
  }
  const cleanNiche = niche.trim();
  const cleanCity  = city.trim();

  if (cleanNiche.length < 2 || cleanCity.length < 2) {
    return res.status(400).json({ error: 'Niche and city must each be at least 2 characters.' });
  }
  if (/^[^a-zA-Z0-9\u00C0-\u024F]+$/.test(cleanNiche)) {
    return res.status(400).json({ error: 'Niche contains no valid characters.' });
  }

  // Cache lookup
  const cacheKey = `${cleanNiche.toLowerCase()}:${cleanCity.toLowerCase()}:${brazilTab}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[leadsController] Cache hit: "${cacheKey}"`);
    return res.json(cached);
  }

  try {
    // 1. Fetch from Google Places + Foursquare in parallel
    // Google errors are non-fatal — Foursquare results still come through
    const [googleResult, foursquareRaw] = await Promise.all([
      searchBusinesses(cleanNiche, cleanCity, { brazilTab }).catch((err) => {
        console.warn('[leadsController] Google Places failed (non-fatal):', err.message);
        return [];
      }),
      searchFoursquare(cleanNiche, cleanCity, { brazilTab }),
    ]);
    const googleRaw = googleResult;

    const raw = [...googleRaw, ...foursquareRaw];

    // 2. Normalize phone/website, remove duplicates
    const cleaned = cleanLeads(raw);

    // 2b. Remove leads outside the searched city/state (e.g. FL results for Providence, RI)
    const located = filterByLocation(cleaned, cleanCity);

    // 3. Score and rank
    const scored = scoreLeads(located);

    // 4. Generate outreach messages (EN or PT-BR based on brazilTab)
    const leads = addOutreachMessages(scored);

    // 5. Auto-export to CSV
    const csvFile = exportToCSV(leads, cleanNiche, cleanCity);

    // 6. Save to local history
    saveSearch({
      niche:      cleanNiche,
      city:       cleanCity,
      brazilTab,
      totalLeads: leads.length,
      csvFile,
    });

    const result = { leads, csvFile };

    // Store in cache (don't cache empty results)
    if (leads.length > 0) setCached(cacheKey, result);

    return res.json(result);
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
