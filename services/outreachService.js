/**
 * outreachService.js
 * Generates a personalized outreach message for each lead.
 * Tone: friendly, simple, video marketing focused.
 * No external API needed — template-based.
 */

// Templates vary based on whether the business has a website or not
const TEMPLATES_WITH_WEBSITE = [
  (name, niche, city) =>
    `Hi ${name} team! 👋\n\nI came across your ${niche} business in ${city} and I love what you're doing.\n\nI help local businesses like yours attract more customers through short, professional videos for Instagram, TikTok, and Google.\n\nI checked out your website — you've already got a solid foundation. A few well-made videos could really bring that to life and drive more foot traffic your way.\n\nWould you be open to a quick 10-minute chat? No commitment, just ideas.\n\nLooking forward to connecting! 😊`,

  (name, niche, city) =>
    `Hey ${name}! 👋\n\nI specialize in video marketing for ${niche} businesses in ${city} and I think yours has real potential.\n\nA short video showcasing your space and services can make a huge difference — people are 3x more likely to visit a business after watching a video about it.\n\nI'd love to show you a quick example of what I have in mind. When would be a good time to connect?`,
];

const TEMPLATES_WITHOUT_WEBSITE = [
  (name, niche, city) =>
    `Hi ${name} team! 👋\n\nI found your ${niche} business in ${city} and wanted to reach out.\n\nI help local businesses build their online presence with short, professional videos — perfect for Google, Instagram, and Facebook.\n\nA lot of businesses in your area are using video to show up higher in local searches and attract new customers. I'd love to help you do the same.\n\nWould you be open to a quick chat? Totally free, no strings attached.`,

  (name, niche, city) =>
    `Hey ${name}! 👋\n\nI work with ${niche} businesses in ${city} to help them get more visibility online using short videos.\n\nVideo content is one of the best ways to stand out locally right now, and it doesn't have to be complicated or expensive.\n\nI'd love to share a few ideas with you — would you have 10 minutes this week?`,
];

/**
 * Pick a template deterministically based on business name (no randomness = consistent output).
 */
function pickTemplate(name, hasWebsite) {
  const templates = hasWebsite ? TEMPLATES_WITH_WEBSITE : TEMPLATES_WITHOUT_WEBSITE;
  const index = (name || '').length % templates.length;
  return templates[index];
}

/**
 * Generate an outreach message for a single lead.
 */
function generateMessage(lead) {
  const hasWebsite = Boolean(lead.website);
  const template = pickTemplate(lead.name, hasWebsite);
  return template(lead.name || 'there', lead.niche || 'business', lead.city || 'your city');
}

/**
 * Add outreach messages to all leads.
 */
function addOutreachMessages(leads) {
  return leads.map((lead) => ({
    ...lead,
    outreachMessage: generateMessage(lead),
  }));
}

module.exports = { addOutreachMessages };
