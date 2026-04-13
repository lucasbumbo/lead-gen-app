/**
 * cleaningService.js
 * Normalizes and deduplicates raw lead data.
 */

/**
 * Normalize a phone number to (XXX) XXX-XXXX format.
 * Returns the original string if it can't be parsed cleanly.
 */
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  // Handle US numbers: 10 digits or 11 digits starting with 1
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length === 10) {
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return phone; // Return as-is if not parseable
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
  // Upgrade http to https
  url = url.replace(/^http:\/\//, 'https://');
  // Remove trailing slash
  url = url.replace(/\/$/, '');
  return url;
}

/**
 * Remove duplicate leads by name (case-insensitive).
 * Keeps the first occurrence.
 */
function deduplicate(leads) {
  const seen = new Set();
  return leads.filter((lead) => {
    const key = (lead.name || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
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
    phone: normalizePhone(lead.phone),
    website: normalizeWebsite(lead.website),
  }));
  return deduplicate(normalized);
}

module.exports = { cleanLeads };
