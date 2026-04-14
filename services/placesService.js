/**
 * placesService.js
 * Fetches local businesses from the Google Places API.
 * Also scrapes Instagram handles from business websites.
 */

const axios = require('axios');

const TEXT_SEARCH_URL   = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

// Instagram handles to ignore (generic/system paths)
const IGNORED_HANDLES = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'tv', 'share', 'direct', 'ar', 'about']);

/**
 * Fetch place details (phone + website) for a given place_id.
 * Returns nulls on failure so one bad result never kills the batch.
 */
async function getPlaceDetails(placeId, apiKey) {
  try {
    const res = await axios.get(PLACE_DETAILS_URL, {
      params: {
        place_id: placeId,
        fields: 'formatted_phone_number,website',
        key: apiKey,
      },
    });
    const result = res.data.result || {};
    return {
      phone:   result.formatted_phone_number || null,
      website: result.website || null,
    };
  } catch (err) {
    console.warn(`[placesService] getPlaceDetails failed for ${placeId}:`, err.message);
    return { phone: null, website: null };
  }
}

/**
 * Check if HTML content appears to be in Portuguese.
 */
function detectPortuguese(html) {
  if (!html) return false;
  if (/lang=["'][Pp][Tt]/i.test(html)) return true;
  const lower = html.toLowerCase();
  const ptWords = [
    'serviços', 'sobre nós', 'contato', 'produtos', 'empresa',
    'atendimento', 'bem-vindo', 'nosso', 'nossa', 'também',
    'clique aqui', 'saiba mais', 'fale conosco', 'início',
  ];
  return ptWords.filter((w) => lower.includes(w)).length >= 2;
}

/**
 * Scrape a business website for Instagram handle + Portuguese language signal.
 * Returns { instagram, portugueseSite } — one HTTP request, two insights.
 */
async function scrapeWebsite(websiteUrl) {
  if (!websiteUrl) return { instagram: null, portugueseSite: false };

  try {
    const res = await axios.get(websiteUrl, {
      timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadGenBot/1.0)' },
      maxRedirects: 3,
    });

    const html           = res.data || '';
    const portugueseSite = detectPortuguese(html);

    const pattern = /instagram\.com\/([a-zA-Z0-9._]+)/g;
    let instagram = null;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const handle = match[1].replace(/[/?#].*$/, '');
      if (!IGNORED_HANDLES.has(handle.toLowerCase()) && handle.length > 1) {
        instagram = `https://instagram.com/${handle}`;
        break;
      }
    }

    return { instagram, portugueseSite };
  } catch {
    return { instagram: null, portugueseSite: false };
  }
}

// Keep old export for any external callers
const scrapeInstagram = async (url) => (await scrapeWebsite(url)).instagram;

/**
 * Search for local businesses by niche and city.
 *
 * Options:
 *   brazilTab {boolean} — if true, appends "brasileiro" to query and
 *                         passes language=pt + region=us to the API
 *
 * Returns raw lead objects (not yet cleaned or scored).
 */
async function searchBusinesses(niche, city, options = {}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not set. Add it to your environment variables.');
  }

  const { brazilTab = false } = options;

  // Build query
  const query = brazilTab
    ? `${niche} brasileiro in ${city}`
    : `${niche} in ${city}`;

  console.log(`[placesService] Searching: "${query}" (brazilTab=${brazilTab})`);

  const params = { query, key: apiKey };
  if (brazilTab) {
    params.language = 'pt';
    params.region   = 'us';
  }

  const searchRes = await axios.get(TEXT_SEARCH_URL, { params });

  const { status, error_message, results } = searchRes.data;
  console.log(`[placesService] Google API status: ${status}`);

  if (status !== 'OK' && status !== 'ZERO_RESULTS') {
    const detail = error_message ? ` — ${error_message}` : '';
    throw new Error(`Google Places API error: ${status}${detail}`);
  }

  const places = results || [];
  if (places.length === 0) {
    console.log('[placesService] No results from Google for this query.');
    return [];
  }

  // Fetch details + scrape Instagram for up to 10 results in parallel
  const leads = await Promise.all(
    places.slice(0, 10).map(async (place) => {
      const details                    = await getPlaceDetails(place.place_id, apiKey);
      const { instagram, portugueseSite } = await scrapeWebsite(details.website);

      return {
        name:          place.name || null,
        city,
        niche,
        phone:         details.phone,
        website:       details.website,
        instagram,
        portugueseSite,
        rating:        place.rating || null,
        reviewCount:   place.user_ratings_total || null,
        address:       place.formatted_address || null,
        brazilTab,
        source:        'Google',
      };
    })
  );

  return leads;
}

module.exports = { searchBusinesses, scrapeInstagram };
