/**
 * scoringService.js
 * Scores each lead on a 0–100 point scale based on data completeness
 * and business potential as a videography prospect.
 *
 * Base criteria:
 *   +20  Has a phone number
 *   +20  Has a website
 *   +15  Google rating >= 3.5
 *   +15  Review count >= 10
 *   +10  Top bonus: rating >= 4.5 AND reviews >= 50
 *
 * Videographer prospect boosts:
 *   +15  Has website but NO Instagram → needs social media presence
 *   +10  Fewer than 50 reviews → small/growing business, more likely to invest in marketing
 *   +10  Rating between 3.5 and 4.3 → good but not dominant, room to grow
 *
 * Score is capped at 100.
 *
 * Labels:
 *   80–100 → Hot Lead 🔥
 *   60–79  → Strong Lead ⭐
 *   40–59  → Good Lead 👍
 *   0–39   → Cold Lead ❄️
 */

function scoreLead(lead) {
  let pts = 0;

  // ── Base criteria ──────────────────────────────────────────────
  if (lead.phone)                                          pts += 20;
  if (lead.website)                                        pts += 20;
  if (lead.rating   && lead.rating   >= 3.5)               pts += 15;
  if (lead.reviewCount && lead.reviewCount >= 10)          pts += 15;
  if (lead.rating   >= 4.5 && lead.reviewCount >= 50)      pts += 10; // top prospect

  // ── Videographer prospect boosts ───────────────────────────────
  if (lead.website && !lead.instagram)                     pts += 15; // needs social presence
  if (lead.reviewCount != null && lead.reviewCount < 50)   pts += 10; // growing business
  if (lead.rating != null && lead.rating >= 3.5 && lead.rating <= 4.3) pts += 10; // good but not dominant

  // Cap at 100
  const score = Math.min(pts, 100);

  let label;
  if (score >= 80)      label = 'Hot Lead 🔥';
  else if (score >= 60) label = 'Strong Lead ⭐';
  else if (score >= 40) label = 'Good Lead 👍';
  else                  label = 'Cold Lead ❄️';

  return {
    ...lead,
    scoreValue: score,
    score:      `${score}`,
    scoreLabel: label,
  };
}

function scoreLeads(leads) {
  return leads.map(scoreLead).sort((a, b) => b.scoreValue - a.scoreValue);
}

module.exports = { scoreLeads };
