/**
 * placesService.js
 * Fetches local businesses from the Google Places API.
 * Returns raw lead data including rating and review count for scoring.
 */

const axios = require('axios');

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

/**
 * Fetch place details (phone + website) for a given place_id
 */
async function getPlaceDetails(placeId) {
  const res = await axios.get(PLACE_DETAILS_URL, {
    params: {
      place_id: placeId,
      fields: 'formatted_phone_number,website',
      key: PLACES_API_KEY,
    },
  });
  const result = res.data.result || {};
  return {
    phone: result.formatted_phone_number || null,
    website: result.website || null,
  };
}

/**
 * Search for local businesses by niche and city.
 * Returns raw lead objects (not yet cleaned or scored).
 */
async function searchBusinesses(niche, city) {
  const query = `${niche} in ${city}`;

  const searchRes = await axios.get(TEXT_SEARCH_URL, {
    params: {
      query,
      key: PLACES_API_KEY,
    },
  });

  const places = searchRes.data.results || [];

  // Fetch details for up to 10 results in parallel
  const leads = await Promise.all(
    places.slice(0, 10).map(async (place) => {
      const details = await getPlaceDetails(place.place_id);

      return {
        name: place.name || null,
        city: city,
        niche: niche,
        phone: details.phone,
        website: details.website,
        rating: place.rating || null,
        reviewCount: place.user_ratings_total || null,
        address: place.formatted_address || null,
      };
    })
  );

  return leads;
}

module.exports = { searchBusinesses };
