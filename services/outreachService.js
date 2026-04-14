/**
 * outreachService.js
 * Generates personalized outreach messages for videographers.
 *
 * - Brazilian tab leads → PT-BR (niche-specific + WhatsApp version)
 * - US tab leads        → English (niche-specific + WhatsApp version)
 */

/* ─── Niche detection ─── */
const NICHE_MAP = {
  beauty:       ['salão', 'beleza', 'hair', 'nail', 'spa', 'estética', 'barbeiro', 'barbearia', 'barber', 'lash', 'unhas'],
  food:         ['restaurante', 'restaurant', 'padaria', 'bakery', 'café', 'coffee', 'buffet', 'açougue', 'food', 'pizza', 'sushi', 'churrasco'],
  cleaning:     ['limpeza', 'cleaning', 'cleaner', 'housekeeping', 'janitorial'],
  construction: ['construção', 'construction', 'reforma', 'remodel', 'painting', 'pintura', 'roofing', 'flooring', 'piso'],
  landscaping:  ['paisagismo', 'landscaping', 'lawn', 'garden', 'jardinagem', 'tree'],
  health:       ['clínica', 'clinic', 'dentist', 'dentista', 'médico', 'doctor', 'health', 'saúde', 'therapy', 'terapia'],
  church:       ['igreja', 'church', 'evangelical', 'evangélica', 'ministério'],
};

function detectNicheCategory(niche = '') {
  const lower = niche.toLowerCase();
  for (const [cat, kws] of Object.entries(NICHE_MAP)) {
    if (kws.some((k) => lower.includes(k))) return cat;
  }
  return 'general';
}

/* ─── Niche-specific hook lines ─── */
const HOOK_PT = {
  beauty:       'Vídeos de transformação — antes e depois — são o tipo de conteúdo que viraliza no Instagram e traz clientes novos toda semana.',
  food:         'Vídeos de comida convertem muito: as pessoas comem com os olhos antes mesmo de chegar no restaurante.',
  cleaning:     'Antes e depois em vídeo gera muita confiança e ajuda a fechar contratos novos sem precisar dar desconto.',
  construction: 'Timelapse de obra ou antes/depois de reforma são dos conteúdos que mais geram credibilidade e engajamento nas redes.',
  landscaping:  'Transformação de jardim em vídeo é um dos formatos que mais viraliza no TikTok e Instagram aqui nos EUA.',
  health:       'Um vídeo apresentando a clínica e a equipe aumenta muito a confiança de novos pacientes antes da primeira consulta.',
  church:       'Vídeos de culto e testemunhos alcançam muito mais pessoas nas redes — membros novos aparecem toda semana por causa disso.',
  general:      'Um vídeo profissional bem feito aumenta muito a visibilidade do negócio no Google Maps e nas redes sociais.',
};

const HOOK_EN = {
  beauty:       'Transformation videos — before and after — are the kind of content that goes viral on Instagram and brings in new clients every week.',
  food:         'Food videos convert incredibly well: people eat with their eyes before they even walk through the door.',
  cleaning:     'Before/after videos build massive trust and help close new contracts without having to offer discounts.',
  construction: 'Timelapse of a job or before/after remodels generate huge credibility and engagement on social media.',
  landscaping:  'Lawn transformation videos are among the most viral content on TikTok and Instagram right now.',
  health:       'A video introducing your clinic and team dramatically increases trust with new patients before their first visit.',
  church:       'Service highlights and testimonial videos reach far more people on social — new members show up every week from that.',
  general:      'A well-made professional video dramatically increases your visibility on Google Maps and social media.',
};

/* ─── Full message templates (English) ─── */
const EN_WITH_WEBSITE = [
  (name, niche, city, hook) =>
    `Hey ${name}! 👋\n\nI came across your ${niche} business in ${city} and love what you're doing.\n\n${hook}\n\nYou've already got a solid website — a great video would bring it to life and set you apart from the competition.\n\nWould you be open to a quick 10-minute chat? No commitment — just ideas. 😊`,

  (name, niche, city, hook) =>
    `Hi ${name}! 👋\n\nI specialize in video content for ${niche} businesses in ${city} and yours has real potential.\n\n${hook}\n\nI'd love to show you a quick example of what I have in mind. Want to connect?`,
];

const EN_WITHOUT_WEBSITE = [
  (name, niche, city, hook) =>
    `Hey ${name}! 👋\n\nI found your ${niche} business in ${city} and wanted to reach out.\n\n${hook}\n\nBusinesses in your area are already using video to show up higher in local searches and attract new customers. I'd love to help you do the same.\n\nWould you be open to a quick chat? Totally free, no strings attached.`,

  (name, niche, city, hook) =>
    `Hi ${name}! 👋\n\nI work with ${niche} businesses in ${city} to help them get more visibility with short videos.\n\n${hook}\n\nI'd love to share a few ideas with you — do you have 10 minutes this week?`,
];

/* ─── Full message templates (Portuguese) ─── */
const PT_WITH_WEBSITE = [
  (name, niche, city, hook) =>
    `Oi ${name}! 👋\n\nVi o perfil de vocês e achei incrível o que estão fazendo com o ${niche} em ${city}!\n\n${hook}\n\nVocês já têm um site ótimo. Um vídeo bem feito seria o passo perfeito pra destacar ainda mais o negócio nas redes.\n\nPosso mandar uns exemplos do meu trabalho? Seria ótimo conversar! 😊`,

  (name, niche, city, hook) =>
    `Olá ${name}! 👋\n\nEncontrei o ${niche} de vocês em ${city} e fiquei com vontade de entrar em contato.\n\n${hook}\n\nAcho que o negócio de vocês tem muito potencial pra crescer com o conteúdo certo. Posso mostrar alguns exemplos? Sem compromisso! 🎬`,
];

const PT_WITHOUT_WEBSITE = [
  (name, niche, city, hook) =>
    `Oi ${name}! 👋\n\nVi o ${niche} de vocês em ${city} e queria me apresentar!\n\n${hook}\n\nSou videomaker e trabalho com negócios brasileiros aqui nos Estados Unidos. Adoraria criar algo especial pra vocês. Posso mandar uns exemplos do meu trabalho?`,

  (name, niche, city, hook) =>
    `Olá ${name}! 👋\n\nEncontrei o ${niche} de vocês em ${city} e achei que vocês mereciam um contato.\n\n${hook}\n\nTem 10 minutinhos pra gente conversar? 🎬`,
];

/* ─── WhatsApp short messages ─── */
function makeWhatsAppPT(name, niche, city) {
  return `Oi ${name}! 👋 Sou videomaker aqui nos EUA e trabalho com negócios brasileiros em ${city}. Vi o ${niche} de vocês e adoraria criar um vídeo profissional pra vocês. Posso mandar uns exemplos? 🎬`;
}

function makeWhatsAppEN(name, niche, city) {
  return `Hey ${name}! 👋 I'm a local videographer in ${city} and I'd love to create a short pro video for your ${niche}. Want to see some examples? 🎬`;
}

/* ─── Helpers ─── */
function pickIndex(name, total) {
  return (name || '').length % total;
}

function generateMessage(lead) {
  const isBrazil   = lead.brazilTab === true;
  const hasWebsite = Boolean(lead.website);
  const name       = lead.name  || (isBrazil ? 'equipe' : 'there');
  const niche      = lead.niche || (isBrazil ? 'negócio' : 'business');
  const city       = lead.city  || (isBrazil ? 'sua cidade' : 'your city');
  const cat        = detectNicheCategory(niche);
  const hook       = isBrazil ? HOOK_PT[cat] : HOOK_EN[cat];

  if (isBrazil) {
    const templates = hasWebsite ? PT_WITH_WEBSITE : PT_WITHOUT_WEBSITE;
    return templates[pickIndex(lead.name, templates.length)](name, niche, city, hook);
  } else {
    const templates = hasWebsite ? EN_WITH_WEBSITE : EN_WITHOUT_WEBSITE;
    return templates[pickIndex(lead.name, templates.length)](name, niche, city, hook);
  }
}

function generateWhatsApp(lead) {
  const isBrazil = lead.brazilTab === true;
  const name     = lead.name  || (isBrazil ? 'equipe' : 'there');
  const niche    = lead.niche || (isBrazil ? 'negócio' : 'business');
  const city     = lead.city  || (isBrazil ? 'sua cidade' : 'your city');
  return isBrazil ? makeWhatsAppPT(name, niche, city) : makeWhatsAppEN(name, niche, city);
}

function addOutreachMessages(leads) {
  return leads.map((lead) => ({
    ...lead,
    outreachMessage:  generateMessage(lead),
    whatsappMessage:  generateWhatsApp(lead),
  }));
}

module.exports = { addOutreachMessages };
