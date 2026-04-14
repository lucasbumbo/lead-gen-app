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
 * Search businesses on Foursquare.
 * Returns leads in the same shape as placesService.
 */
async function searchFoursquare(niche, city, options = {}) {
  if (!FSQ_API_KEY) return [];

  const { brazilTab = false } = options;
  const query    = brazilTab ? `${niche} brasileiro` : niche;
  const params   = new URLSearchParams({
    query,
    near:   city,
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

  const results = data.results || [];

  return results.map((place) => {
    const loc  = place.location || {};
    const city = [loc.locality, loc.region].filter(Boolean).join(', ') || loc.formatted_address || '';

    return {
      name:        place.name || '',
      city,
      niche,
      phone:       place.tel || null,
      website:     place.website || null,
      instagram:   null,          // Foursquare doesn't provide Instagram
      rating:      place.rating ? parseFloat((place.rating / 2).toFixed(1)) : null, // FSQ uses 10-pt scale
      reviewCount: place.stats?.total_ratings || null,
      address:     loc.formatted_address || '',
      brazilTab,
      source:      'Foursquare',
    };
  });
}

module.exports = { searchFoursquare };
