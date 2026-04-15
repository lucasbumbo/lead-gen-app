/**
 * cleaningService.js
 * Normalizes and deduplicates raw lead data.
 */

/**
 * Normalize a phone number.
 * - US 10-digit → (XXX) XXX-XXXX
 * - US 11-digit with country code 1 → (XXX) XXX-XXXX
 * - Brazilian +55 → +55 (XX) XXXXX-XXXX
 * - Unknown → returned as-is
 *
 * BUG FIX: Original code only handled US formats. Brazilian numbers from the
 * Google Places API arrive as "+55 11 98765-4321" (13 digits) and were returned
 * unformatted and inconsistent with US numbers in the same result set.
 */
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');

  // Brazilian number: starts with country code 55, 12–13 digits total
  // e.g. 55 + 11 (area) + 98765-4321 (9-digit mobile) = 13 digits
  // e.g. 55 + 11 (area) + 8765-4321  (8-digit landline) = 12 digits
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const local = digits.slice(2);           // strip country code
    const area  = local.slice(0, 2);
    const num   = local.slice(2);
    if (num.length === 9) {
      return `+55 (${area}) ${num.slice(0, 5)}-${num.slice(5)}`;
    }
    if (num.length === 8) {
      return `+55 (${area}) ${num.slice(0, 4)}-${num.slice(4)}`;
    }
  }

  // US number: 11 digits starting with 1 (country code) or 10 digits
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length === 10) {
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }

  return phone; // Return as-is if pattern unrecognised
}

/**
 * Normalize a website URL:
 * - Ensure it starts with https://
 * - Strip trailing slash
 */
function normalizeWebsite(website) {
  if (!website) return null;
  let url = website.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  url = url.replace(/^http:\/\//, 'https://');
  url = url.replace(/\/$/, '');
  return url;
}

/**
 * Remove duplicate leads.
 *
 * BUG FIX: Original code deduped by name only (case-insensitive), which caused
 * legitimate multi-location businesses (e.g. two "Pizza King" locations in the
 * same city) to be incorrectly dropped. Fix uses name + normalised address so
 * the same chain at a different address is kept.
 */
function deduplicate(leads) {
  const seen = new Set();
  return leads.filter((lead) => {
    const name    = (lead.name    || '').toLowerCase().trim();
    const address = (lead.address || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    const key     = `${name}|${address}`;
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract a 2-letter US state code from a city string.
 * "Providence, RI" → "RI"   |   "Miami, FL" → "FL"   |   "Boston" → null
 */
function extractStateCode(cityInput) {
  const m = String(cityInput || '').trim().match(/,\s*([A-Za-z]{2})\s*$/);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Strict location filter — rejects leads whose address belongs to a different US state.
 *
 * Google Places addresses arrive as: "123 Main St, Providence, RI 02903, USA"
 * The reliable signal is the pattern ", ST 12345" (state code immediately before ZIP).
 *
 * Rules:
 *  1. No 2-letter state in search query → skip (can't filter without it).
 *  2. Lead address contains a DIFFERENT state + ZIP → REJECT.
 *  3. Lead address matches the searched state → KEEP.
 *  4. Address missing or state+ZIP pattern absent → KEEP (benefit of the doubt).
 */
function filterByLocation(leads, searchedCity) {
  const stateCode = extractStateCode(searchedCity);
  if (!stateCode) return leads;

  return leads.filter((lead) => {
    const addr = (lead.address || '').toUpperCase().trim();
    if (!addr) return true; // no address → keep

    // Canonical US pattern: ", ST 12345"
    const m = addr.match(/,\s+([A-Z]{2})\s+\d{5}/);
    if (!m) return true; // state+ZIP not found → keep

    if (m[1] !== stateCode) {
      console.log(`[cleaningService] Removed out-of-state lead: "${lead.name}" (${m[1]} ≠ ${stateCode})`);
      return false;
    }
    return true;
  });
}

/**
 * Clean an array of raw leads.
 * Normalizes phone/website and removes duplicates.
 */
function cleanLeads(leads) {
  const normalized = leads.map((lead) => ({
    ...lead,
    phone:   normalizePhone(lead.phone),
    website: normalizeWebsite(lead.website),
  }));
  return deduplicate(normalized);
}

module.exports = { cleanLeads, filterByLocation };
