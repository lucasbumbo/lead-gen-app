/**
 * foursquareService.js
 * Searches for local businesses using Foursquare Places API v3.
 */

const https = require('https');

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY || '';
const BASE_URL    = 'api.foursquare.com';

/** Simple HTTPS GET helper — returns parsed JSON */
function getJson(path, headers) {
  return new Promise((resolve, reject) => {
    const options = { hostname: BASE_URL, path, method: 'GET', headers };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from Foursquare')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Foursquare timeout')); });
    req.end();
  });
}

/**
 * Normalize Foursquare rating to 0–5 scale.
 * Foursquare v3 returns ratings on a 10-pt scale, but some endpoints may
 * already be 5-pt. We detect the scale by checking if the value exceeds 5.
 */
function normalizeRating(raw) {
  if (raw == null) return null;
  const n = parseFloat(raw);
  if (isNaN(n)) return null;
  // BUG FIX: validate scale before dividing — avoids halving a 5-pt value
  const normalized = n > 5 ? parseFloat((n / 2).toFixed(1)) : parseFloat(n.toFixed(1));
  return normalized;
}

/**
 * Search businesses on Foursquare.
 * Returns leads in the same shape as placesService.
 *
 * BUG FIX: The original code overwrote the user's searched city with whatever
 * Foursquare returned (loc.locality + loc.region), causing results to show
 * "Hallandale Beach, FL" when the user searched "Miami, FL".
 * Fix: preserve the input city; use Foursquare's location only for the address field.
 */
async function searchFoursquare(niche, inputCity, options = {}) {
  if (!FSQ_API_KEY) return [];

  const { brazilTab = false } = options;
  // Avoid duplicating "brasileiro" if niche already contains it
  const nicheHasBr = /brasileiro/i.test(niche);
  const query      = brazilTab && !nicheHasBr ? `${niche} brasileiro` : niche;
  const params   = new URLSearchParams({
    query,
    near:   inputCity,
    limit:  '50',
    fields: 'name,tel,website,location,rating,stats',
  });

  const path    = `/v3/places/search?${params.toString()}`;
  const headers = {
    Accept:        'application/json',
    Authorization: FSQ_API_KEY,
  };

  let data;
  try {
    data = await getJson(path, headers);
  } catch (err) {
    console.error('[foursquareService] Request error:', err.message);
    return [];
  }

  // Handle Foursquare API-level errors
  if (data.message) {
    console.warn('[foursquareService] API warning:', data.message);
  }

  const results = data.results || [];

  return results.map((place) => {
    const loc = place.location || {};
    // BUG FIX: preserve inputCity instead of overwriting with API response city
    // Foursquare's locality may be an adjacent suburb or different city entirely.
    // We keep the user's searched city for consistency and use loc data only for address.
    const address = loc.formatted_address || [loc.address, loc.locality, loc.region]
      .filter(Boolean).join(', ') || '';

    return {
      name:        place.name || '',
      city:        inputCity,          // ← fixed: was [loc.locality, loc.region].join(', ')
      niche,
      phone:       place.tel || null,
      website:     place.website || null,
      instagram:   null,               // Foursquare doesn't expose Instagram
      rating:      normalizeRating(place.rating),  // ← fixed: validates 5 vs 10 pt scale
      reviewCount: place.stats?.total_ratings ?? place.stats?.total_tips ?? null,
      address,
      brazilTab,
      source:      'Foursquare',
    };
  });
}

module.exports = { searchFoursquare };
