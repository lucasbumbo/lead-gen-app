/**
 * scoringService.js
 * Scores each lead based on data completeness and business potential.
 *
 * Scoring breakdown (max 5 points):
 *  +1  Has a phone number
 *  +1  Has a website
 *  +1  Google rating >= 3.5
 *  +1  Review count >= 10
 *  +1  Bonus: rating >= 4.5 AND reviews >= 50 (top prospect)
 *
 * Labels:
 *  5/5 → Hot Lead 🔥
 *  4/5 → Strong Lead ⭐
 *  3/5 → Good Lead 👍
 *  1–2 → Cold Lead ❄️
 */

const LABELS = {
  5: 'Hot Lead 🔥',
  4: 'Strong Lead ⭐',
  3: 'Good Lead 👍',
  2: 'Cold Lead ❄️',
  1: 'Cold Lead ❄️',
  0: 'Cold Lead ❄️',
};

function scoreLead(lead) {
  let points = 0;

  if (lead.phone) points++;
  if (lead.website) points++;
  if (lead.rating && lead.rating >= 3.5) points++;
  if (lead.reviewCount && lead.reviewCount >= 10) points++;
  if (lead.rating >= 4.5 && lead.reviewCount >= 50) points++; // bonus

  return {
    ...lead,
    scoreValue: points,
    score: `${points}/5`,
    scoreLabel: LABELS[points] || 'Cold Lead ❄️',
  };
}

function scoreLeads(leads) {
  return leads.map(scoreLead).sort((a, b) => b.scoreValue - a.scoreValue);
}

module.exports = { scoreLeads };
