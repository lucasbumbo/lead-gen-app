/**
 * outreachService.js
 * Generates personalized outreach messages for videographers.
 *
 * - Brazilian tab leads → messages in Brazilian Portuguese (PT-BR)
 * - US tab leads        → messages in English
 *
 * Template selection is deterministic (based on name length) — no randomness,
 * so the same lead always gets the same message.
 */

// ─── English templates (US Market) ───────────────────────────────────────────

const EN_WITH_WEBSITE = [
  (name, niche, city) =>
    `Hey ${name}! 👋\n\nI came across your ${niche} business in ${city} and love what you're doing.\n\nI'm a local videographer and I'd love to create a short, professional video to showcase your business on Instagram and Google — the kind that drives real foot traffic.\n\nYou've already got a solid website. A great video would bring it to life and set you apart from the competition.\n\nWould you be open to a quick 10-minute chat? No commitment — just ideas. 😊`,

  (name, niche, city) =>
    `Hi ${name}! 👋\n\nI specialize in video content for ${niche} businesses in ${city} and I think yours has real potential.\n\nA 30–60 second video showcasing your space and services can make a huge difference — people are 3x more likely to visit a business after watching a video about it.\n\nI'd love to show you a quick example of what I have in mind. Want to connect?`,
];

const EN_WITHOUT_WEBSITE = [
  (name, niche, city) =>
    `Hey ${name}! 👋\n\nI found your ${niche} business in ${city} and wanted to reach out.\n\nI'm a videographer who helps local businesses build their online presence with short, professional videos — perfect for Instagram, TikTok, and Google.\n\nBusinesses in your area are using video to show up higher in local searches and attract new customers. I'd love to help you do the same.\n\nWould you be open to a quick chat? Totally free, no strings attached.`,

  (name, niche, city) =>
    `Hi ${name}! 👋\n\nI work with ${niche} businesses in ${city} to help them get more visibility with short videos.\n\nVideo is one of the best ways to stand out locally right now, and it doesn't have to be complicated or expensive.\n\nI'd love to share a few ideas with you — do you have 10 minutes this week?`,
];

// ─── Portuguese templates (Brazilian Community) ───────────────────────────────

const PT_WITH_WEBSITE = [
  (name, niche, city) =>
    `Oi ${name}! 👋\n\nVi o perfil de vocês e achei incrível o que estão fazendo com o ${niche} em ${city}!\n\nSou videomaker e trabalho aqui nos Estados Unidos criando vídeos profissionais para negócios brasileiros — o tipo de conteúdo que aparece bem no Instagram, TikTok e Google.\n\nVocês já têm um site ótimo. Um vídeo bem feito seria o passo perfeito pra destacar ainda mais o negócio nas redes.\n\nPosso mandar alguns exemplos do meu trabalho? Seria ótimo conversar! 😊`,

  (name, niche, city) =>
    `Olá ${name}! 👋\n\nEncontrei o ${niche} de vocês em ${city} e fiquei com vontade de entrar em contato.\n\nSou videomaker especializado em negócios da comunidade brasileira aqui nos EUA. Crio vídeos curtos e profissionais que ajudam a atrair mais clientes nas redes sociais e no Google Maps.\n\nAcho que o negócio de vocês tem muito potencial pra crescer com o conteúdo certo. Posso mostrar alguns exemplos? Sem compromisso! 🎬`,
];

const PT_WITHOUT_WEBSITE = [
  (name, niche, city) =>
    `Oi ${name}! 👋\n\nVi o ${niche} de vocês em ${city} e queria me apresentar!\n\nSou videomaker e trabalho com negócios brasileiros aqui nos Estados Unidos. Crio vídeos profissionais pra Instagram, TikTok e Google — o tipo de conteúdo que aumenta a visibilidade e traz mais clientes.\n\nAdoraria criar algo especial pra vocês. Posso mandar uns exemplos do meu trabalho?`,

  (name, niche, city) =>
    `Olá ${name}! 👋\n\nEncontrei o ${niche} de vocês em ${city} e achei que vocês mereciam um contato.\n\nSou videomaker aqui nos EUA e ajudo negócios da comunidade brasileira a crescer nas redes com vídeos curtos e profissionais. É uma forma poderosa de atrair novos clientes sem complicação.\n\nTem 10 minutinhos pra gente conversar? 🎬`,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickIndex(name, total) {
  return (name || '').length % total;
}

function generateMessage(lead) {
  const isBrazil     = lead.brazilTab === true;
  const hasWebsite   = Boolean(lead.website);
  const name         = lead.name  || (isBrazil ? 'equipe' : 'there');
  const niche        = lead.niche || (isBrazil ? 'negócio' : 'business');
  const city         = lead.city  || (isBrazil ? 'sua cidade' : 'your city');

  if (isBrazil) {
    const templates = hasWebsite ? PT_WITH_WEBSITE : PT_WITHOUT_WEBSITE;
    return templates[pickIndex(lead.name, templates.length)](name, niche, city);
  } else {
    const templates = hasWebsite ? EN_WITH_WEBSITE : EN_WITHOUT_WEBSITE;
    return templates[pickIndex(lead.name, templates.length)](name, niche, city);
  }
}

function addOutreachMessages(leads) {
  return leads.map((lead) => ({
    ...lead,
    outreachMessage: generateMessage(lead),
  }));
}

module.exports = { addOutreachMessages };
