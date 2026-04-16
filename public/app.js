/* ─────────────────────────────────────────────────
   LenzLead — frontend logic
   ───────────────────────────────────────────────── */

const statusEl     = document.getElementById('status');
const tabsWrapper  = document.getElementById('tabs-wrapper');
const resultsTitle = document.getElementById('results-title');
const resultsBody  = document.getElementById('results-body');
const mobileCards  = document.getElementById('mobile-cards');
const exportBtn    = document.getElementById('export-btn');
const outreachList = document.getElementById('outreach-list');
const historyList  = document.getElementById('history-list');

let currentCsvFile = null;
let activeMarket   = 'us';
let leadsMap       = {}; // name → lead, for Quick Actions

/* ─── Global state for filtering / sorting ─── */
let allLeads      = [];
let sortCol       = 'score';
let sortDir       = -1; // -1 = desc, 1 = asc
let currentNiche  = '';
let currentCity   = '';
let currentBrazil = false;

/* ─── Contacted leads (persisted in localStorage) ─── */
let contactedSet = new Set(JSON.parse(localStorage.getItem('vl_contacted') || '[]'));

function saveContacted() {
  localStorage.setItem('vl_contacted', JSON.stringify([...contactedSet]));
}

/* ─── Notes per lead (persisted in localStorage) ─── */
let notesMap = JSON.parse(localStorage.getItem('vl_notes') || '{}');

function saveNote(name, text) {
  if (text.trim()) notesMap[name] = text.trim();
  else delete notesMap[name];
  localStorage.setItem('vl_notes', JSON.stringify(notesMap));
}

/* ─── Demo leads preview (shown on first load) ─── */
const DEMO_LEADS = [
  { name: 'Brickell Barbershop',      city: 'Miami, FL',       niche: 'barbershop',  phone: '(305) 555-0182', website: 'https://brickellbarbershop.com', instagram: null,       rating: 4.2, reviewCount: 38,  scoreValue: 85, scoreLabel: '🔥 High Opportunity', address: '801 Brickell Ave, Miami, FL', source: 'Google',     brazilTab: false },
  { name: 'South Beach Yoga Studio',  city: 'Miami, FL',       niche: 'yoga studio', phone: null,              website: 'https://sbeyoga.com',            instagram: null,       rating: 4.7, reviewCount: 112, scoreValue: 72, scoreLabel: '⭐ Good Lead',        address: '1234 Ocean Dr, Miami Beach, FL', source: 'Google',  brazilTab: false },
  { name: 'Midtown Fitness Club',     city: 'Miami, FL',       niche: 'gym',         phone: '(305) 555-0341', website: null,                            instagram: null,       rating: 3.9, reviewCount: 21,  scoreValue: 61, scoreLabel: '⭐ Good Lead',        address: '3400 NW 2nd Ave, Miami, FL',    source: 'Google',  brazilTab: false },
  { name: "Marco's Pizzeria",         city: 'Miami, FL',       niche: 'restaurant',  phone: '(305) 555-0099', website: 'https://marcospizzeria.com',     instagram: null,       rating: 4.5, reviewCount: 204, scoreValue: 78, scoreLabel: '⭐ Good Lead',        address: '200 SE 1st St, Miami, FL',      source: 'Google',  brazilTab: false },
  { name: 'Coral Gables Pet Salon',   city: 'Miami, FL',       niche: 'pet salon',   phone: '(305) 555-0774', website: null,                            instagram: null,       rating: 4.8, reviewCount: 9,   scoreValue: 55, scoreLabel: '👍 Solid Lead',       address: '2525 Ponce De Leon Blvd, FL',   source: 'Google',  brazilTab: false },
  { name: 'Downtown Dental Care',     city: 'Miami, FL',       niche: 'dentist',     phone: '(786) 555-0213', website: 'https://downtowndental.com',     instagram: null,       rating: 3.6, reviewCount: 44,  scoreValue: 80, scoreLabel: '🔥 High Opportunity', address: '100 SE 2nd Ave Ste 400, FL',    source: 'Google',  brazilTab: false },
  { name: 'Wynwood Coffee Roasters',  city: 'Miami, FL',       niche: 'coffee shop', phone: null,              website: null,                            instagram: null,       rating: 4.1, reviewCount: 17,  scoreValue: 90, scoreLabel: '🔥 High Opportunity', address: '2750 NW 3rd Ave, Miami, FL',    source: 'Foursquare', brazilTab: false },
  { name: 'Little Havana Auto Detailing', city: 'Miami, FL',  niche: 'auto',        phone: '(305) 555-0465', website: null,                            instagram: null,       rating: null, reviewCount: null, scoreValue: 30, scoreLabel: '❄️ Cold Lead',       address: '1540 SW 8th St, Miami, FL',     source: 'Google',  brazilTab: false },
];

function loadDemoLeads() {
  // Score + sort like the real pipeline
  const scored = DEMO_LEADS.map(l => ({ ...l, score: String(l.scoreValue) }))
    .sort((a, b) => b.scoreValue - a.scoreValue);

  allLeads = scored;
  scored.forEach(l => { leadsMap[l.name] = l; });

  resultsTitle.innerHTML = `🇺🇸 <strong>${scored.length} leads</strong> de exemplo — <strong>barbershop</strong> em <strong>Miami, FL</strong>`;
  renderResults(scored, 'barbershop', 'Miami, FL', false);
  renderMobileCards(scored);

  document.getElementById('demo-banner').style.display = 'flex';
  tabsWrapper.classList.remove('hidden');
  currentCsvFile = null;
}

// Load demo on page ready
window.addEventListener('DOMContentLoaded', loadDemoLeads);

/* ─── Market tab switching ─── */
document.querySelectorAll('.market-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeMarket = btn.dataset.market;
    document.querySelectorAll('.market-tab').forEach((b) => b.classList.remove('active', 'brazil-active'));
    btn.classList.add('active');
    if (activeMarket === 'brazil') btn.classList.add('brazil-active');
    document.getElementById('form-us').style.display     = activeMarket === 'us'     ? '' : 'none';
    document.getElementById('form-brazil').style.display = activeMarket === 'brazil' ? '' : 'none';
  });
});

/* ─── US form submit ─── */
document.getElementById('form-us').addEventListener('submit', async (e) => {
  e.preventDefault();
  const niche = document.getElementById('us-niche').value.trim();
  const city  = document.getElementById('us-city').value.trim();
  if (niche && city) await runSearch(niche, city, false);
});

/* ─── Brazilian form submit ─── */
document.getElementById('form-brazil').addEventListener('submit', async (e) => {
  e.preventDefault();
  const niche = document.getElementById('br-niche').value.trim();
  const city  = document.getElementById('br-city').value.trim();
  if (niche && city) await runSearch(niche, city, true);
});

/* ─── ESC closes the Lead Detail drawer ─── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && _drawerLead) closeLeadDetail();
});

/* ─── Filter bar listeners ─── */
document.getElementById('filter-pt').addEventListener('change',          () => applyFilters());
document.getElementById('filter-source').addEventListener('change',      () => applyFilters());
document.getElementById('filter-uncontacted').addEventListener('change', () => applyFilters());

/* ─── Sort headers ─── */
document.querySelectorAll('th[data-sort]').forEach((th) => {
  th.addEventListener('click', () => {
    if (sortCol === th.dataset.sort) sortDir *= -1;
    else { sortCol = th.dataset.sort; sortDir = -1; }
    document.querySelectorAll('th[data-sort]').forEach((h) => h.classList.remove('sort-asc', 'sort-desc'));
    th.classList.add(sortDir === -1 ? 'sort-desc' : 'sort-asc');
    applyFilters();
  });
});

/* ─── Core search function ─── */
async function runSearch(niche, city, brazilTab) {
  setStatus('⏳ Buscando e processando leads…', false, true);
  disableSearchBtns(true);
  tabsWrapper.classList.add('hidden');
  resultsBody.innerHTML  = '';
  mobileCards.innerHTML  = '';
  outreachList.innerHTML = '';
  currentCsvFile = null;
  allLeads = [];

  try {
    const res  = await fetch('/api/leads', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ niche, city, brazilTab }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || 'Something went wrong.', true);
      return;
    }

    const leads = data.leads || [];

    if (leads.length === 0) {
      setStatus(brazilTab
        ? 'Nenhum resultado encontrado. Tente outro nicho ou cidade.'
        : 'No results found. Try a different niche or city.');
      return;
    }

    allLeads      = leads;
    currentNiche  = niche;
    currentCity   = city;
    currentBrazil = brazilTab;
    currentCsvFile = data.csvFile || null;

    // Auto-populate CRM board with new leads
    crmAddLeads(leads);

    applyFilters();
    tabsWrapper.classList.remove('hidden');
    setStatus('');
    switchResultTab('results');

  } catch {
    setStatus('Network error — make sure the server is running.', true);
  } finally {
    disableSearchBtns(false);
  }
}

/* ─── Filter + Sort pipeline ─── */
function applyFilters() {
  const ptOnly        = document.getElementById('filter-pt').checked;
  const srcFilter     = document.getElementById('filter-source').value;
  const uncontacted   = document.getElementById('filter-uncontacted').checked;

  let filtered = allLeads;
  if (ptOnly)              filtered = filtered.filter((l) => l.portugueseSite);
  if (srcFilter !== 'all') filtered = filtered.filter((l) => (l.source || '').toLowerCase() === srcFilter);
  if (uncontacted)         filtered = filtered.filter((l) => !contactedSet.has(l.name));

  filtered = [...filtered].sort((a, b) => {
    const av = a[sortCol] ?? (typeof a[sortCol] === 'string' ? '' : -999);
    const bv = b[sortCol] ?? (typeof b[sortCol] === 'string' ? '' : -999);
    if (av > bv) return sortDir;
    if (av < bv) return -sortDir;
    return 0;
  });

  renderResults(filtered, currentNiche, currentCity, currentBrazil);
  renderMobileCards(filtered);
  renderOutreach(filtered);
}

/* ─── Export ─── */
exportBtn.addEventListener('click', () => {
  if (currentCsvFile) {
    window.location.href = `/api/leads/export/${encodeURIComponent(currentCsvFile)}`;
  }
});

/* ─── Result tab switching ─── */
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchResultTab(btn.dataset.tab);
    if (btn.dataset.tab === 'history') loadHistory();
  });
});

function switchResultTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.toggle('active', c.id === `tab-${name}`));
}

/* ─── Render: Results Table ─── */
function renderResults(leads, niche, city, brazilTab) {
  const flag = brazilTab ? '🇧🇷' : '🇺🇸';
  resultsTitle.innerHTML = `${flag} <strong>${leads.length} leads</strong> encontrados para <strong>${esc(niche)}</strong> em <strong>${esc(city)}</strong>`;
  resultsBody.innerHTML = '';
  leadsMap = {};

  leads.forEach((lead) => {
    leadsMap[lead.name] = lead;

    const row = document.createElement('tr');
    row.dataset.name = lead.name || '';
    if (contactedSet.has(lead.name)) row.classList.add('contacted');

    // Phone cell — with copy + WhatsApp
    let phoneCell = '<span class="na">—</span>';
    if (lead.phone) {
      const waNum = formatWAPhone(lead.phone);
      const waBtn = waNum
        ? `<a class="wa-btn" href="https://wa.me/${waNum}" target="_blank" rel="noopener" title="WhatsApp">💬</a>`
        : '';
      phoneCell = `<span class="phone-copy" onclick="copyText('${esc(lead.phone)}', this)" title="Click to copy">${esc(lead.phone)}</span>${waBtn}`;
    }

    // Name cell — checkbox + address + insight line + notes
    const nameEscaped = esc(lead.name).replace(/'/g, '&#39;');
    const addrLine    = lead.address ? `<div class="lead-address">${esc(lead.address)}</div>` : '';
    const insightLine = `<div class="lead-insight">${generateInsight(lead)}</div>`;
    const savedNote   = notesMap[lead.name] || '';
    const nameCell = `
      <label class="contacted-wrap" title="${contactedSet.has(lead.name) ? 'Contactado' : 'Marcar como contactado'}">
        <input type="checkbox" class="contacted-cb" ${contactedSet.has(lead.name) ? 'checked' : ''}
          onchange="toggleContacted('${nameEscaped}', this)">
        <strong class="lead-name-link" onclick="openLeadDetail('${nameEscaped}')" title="Ver detalhes">${esc(lead.name)}</strong>
      </label>
      ${addrLine}
      ${insightLine}
      <textarea class="lead-note" placeholder="📝 Anotação…" rows="1"
        onblur="saveNote('${nameEscaped}', this.value)"
        oninput="autoResize(this)">${esc(savedNote)}</textarea>`;

    // Quick Actions cell
    const siteBtn = lead.website
      ? `<a class="action-btn action-site" href="${esc(lead.website)}" target="_blank" rel="noopener" title="${esc(lead.website)}">🌐 Site</a>`
      : `<span class="action-btn action-disabled" title="No website">🌐 Site</span>`;
    // IG button: direct profile if we have the URL, otherwise a clearly-labelled search fallback
    const igBtn = lead.instagram
      ? `<a class="action-btn action-ig" href="${esc(lead.instagram)}" target="_blank" rel="noopener" title="Open Instagram Profile">📸 Profile</a>`
      : `<a class="action-btn action-ig-search" href="https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(lead.name)}" target="_blank" rel="noopener" title="Search Instagram">🔍 Search IG</a>`;
    const pitchBtn = `<button class="action-btn action-pitch" onclick="copyPitch('${nameEscaped}')" title="Copy pitch message">📋 Pitch</button>`;
    const actionsCell = `<div class="action-row">${siteBtn}${igBtn}${pitchBtn}</div>`;

    const scoreColor = badgeClass(lead.scoreLabel);

    row.innerHTML = `
      <td style="font-size:1.1rem">${lead.brazilTab ? '🇧🇷' : '🇺🇸'}</td>
      <td style="white-space:normal; min-width:200px">${nameCell}</td>
      <td>${phoneCell}</td>
      <td>${lead.rating != null ? `⭐ ${lead.rating}` : '<span class="na">—</span>'}</td>
      <td>${lead.reviewCount != null ? lead.reviewCount : '<span class="na">—</span>'}</td>
      <td><span class="badge ${scoreColor}">${lead.scoreLabel}</span></td>
      <td>${actionsCell}</td>
    `;
    resultsBody.appendChild(row);
  });
}

/* ─── Render: Mobile Cards ─── */
function renderMobileCards(leads) {
  mobileCards.innerHTML = '';
  leads.forEach((lead) => {
    const nameEscaped = esc(lead.name).replace(/'/g, '&#39;');
    const scoreColor  = badgeClass(lead.scoreLabel);

    const waNum  = lead.phone ? formatWAPhone(lead.phone) : null;
    const waLink = waNum ? `<a class="action-btn action-site" href="https://wa.me/${waNum}" target="_blank" rel="noopener" style="color:#4ade80;border-color:rgba(74,222,128,0.3)">💬 WhatsApp</a>` : '';

    const siteBtn = lead.website
      ? `<a class="action-btn action-site" href="${esc(lead.website)}" target="_blank" rel="noopener">🌐 Site</a>`
      : `<span class="action-btn action-disabled">🌐 Site</span>`;
    const igBtn = lead.instagram
      ? `<a class="action-btn action-ig" href="${esc(lead.instagram)}" target="_blank" rel="noopener">📸 IG</a>`
      : `<a class="action-btn action-ig-search" href="https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(lead.name)}" target="_blank" rel="noopener">🔍 IG</a>`;
    const pitchBtn = `<button class="action-btn action-pitch" onclick="copyPitch('${nameEscaped}')">📋 Pitch</button>`;

    const metaParts = [];
    if (lead.rating   != null) metaParts.push(`⭐ ${lead.rating}`);
    if (lead.reviewCount != null) metaParts.push(`${lead.reviewCount} reviews`);
    if (lead.phone)              metaParts.push(`📞 ${esc(lead.phone)}`);

    const card = document.createElement('div');
    card.className = 'm-card';
    card.innerHTML = `
      <div class="m-card-top">
        <span class="m-card-name" onclick="openLeadDetail('${nameEscaped}')">${esc(lead.name)}</span>
        <span class="badge ${scoreColor}">${lead.scoreLabel}</span>
      </div>
      <div class="m-card-insight">${generateInsight(lead)}</div>
      <div class="m-card-meta">${metaParts.join(' · ')}</div>
      <div class="m-card-actions">${siteBtn}${igBtn}${pitchBtn}${waLink}</div>
    `;
    mobileCards.appendChild(card);
  });
}

/* ─── Render: Outreach Messages ─── */
function renderOutreach(leads) {
  outreachList.innerHTML = '';

  leads.forEach((lead) => {
    const card    = document.createElement('div');
    card.className = 'outreach-card';

    const msgId   = `msg-${Math.random().toString(36).slice(2)}`;
    const waMsgId = `wamsg-${Math.random().toString(36).slice(2)}`;
    const hintId  = `hint-${Math.random().toString(36).slice(2)}`;
    const waHintId= `wahint-${Math.random().toString(36).slice(2)}`;
    const flag    = lead.brazilTab ? '🇧🇷' : '🇺🇸';

    let igLine = '';
    if (lead.instagram) {
      const handle = lead.instagram.replace('https://instagram.com/', '');
      igLine = `<a class="outreach-ig-link" href="${esc(lead.instagram)}" target="_blank" rel="noopener">📸 @${esc(handle)}</a>`;
    }

    const waSection = lead.whatsappMessage ? `
      <div class="wa-msg-label">💬 Versão WhatsApp (curta)</div>
      <pre class="outreach-message wa-message" id="${waMsgId}" onclick="copyMessage('${waMsgId}','${waHintId}')">${esc(lead.whatsappMessage)}</pre>
      <div class="copy-hint" id="${waHintId}">Click to copy</div>
    ` : '';

    card.innerHTML = `
      <div class="outreach-header" onclick="toggleOutreach(this)">
        <div>
          <div class="outreach-name">${flag} ${esc(lead.name)}</div>
          <div class="outreach-meta">${esc(lead.city)} · <span class="badge ${badgeClass(lead.scoreLabel)}">${lead.scoreLabel}</span></div>
        </div>
        <span class="outreach-toggle">Mostrar mensagem ▾</span>
      </div>
      <div class="outreach-body">
        ${igLine}
        <pre class="outreach-message" id="${msgId}" onclick="copyMessage('${msgId}','${hintId}')">${esc(lead.outreachMessage)}</pre>
        <div class="copy-hint" id="${hintId}">Clique na mensagem para copiar</div>
        ${waSection}
      </div>
    `;

    outreachList.appendChild(card);
  });
}

/* ─── Render: History ─── */
async function loadHistory() {
  historyList.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const res  = await fetch('/api/leads/history');
    const data = await res.json();
    const hist = data.history || [];

    if (hist.length === 0) {
      historyList.innerHTML = '<p class="empty-state">No searches yet.</p>';
      return;
    }

    historyList.innerHTML = '';
    hist.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      const flag = entry.brazilTab ? '🇧🇷' : '🇺🇸';
      const date = new Date(entry.date).toLocaleString();
      item.innerHTML = `
        <div class="history-info">
          <div class="niche-city">${flag} ${esc(entry.niche)} — ${esc(entry.city)}</div>
          <div class="meta">${date} · ${entry.totalLeads} leads</div>
        </div>
        <div class="history-actions">
          <button class="btn-rerun" onclick="rerunSearch('${esc(entry.niche)}','${esc(entry.city)}',${!!entry.brazilTab})">↩ Repetir</button>
          ${entry.csvFile
            ? `<a href="/api/leads/export/${encodeURIComponent(entry.csvFile)}">⬇️ CSV</a>`
            : ''}
        </div>
      `;
      historyList.appendChild(item);
    });
  } catch {
    historyList.innerHTML = '<p class="empty-state">Could not load history.</p>';
  }
}

/* ─── Re-run search from history ─── */
async function rerunSearch(niche, city, brazilTab) {
  switchResultTab('results');
  await runSearch(niche, city, brazilTab);
}

/* ─── Utility: Contacted toggle ─── */
function toggleContacted(name, checkbox) {
  if (checkbox.checked) contactedSet.add(name);
  else contactedSet.delete(name);
  saveContacted();
  document.querySelectorAll(`tr[data-name="${name.replace(/"/g, '\\"')}"]`).forEach((row) => {
    row.classList.toggle('contacted', checkbox.checked);
  });
  // If uncontacted filter is active, re-apply to hide newly contacted
  if (document.getElementById('filter-uncontacted').checked) applyFilters();
}

/* ─── Utility: Copy text (phone) ─── */
function copyText(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = el.textContent;
    el.textContent = '✅ Copiado!';
    el.classList.add('copied-inline');
    setTimeout(() => {
      el.textContent = orig;
      el.classList.remove('copied-inline');
    }, 1500);
  });
}

/* ─── Utility: WhatsApp phone formatter ─── */
// BUG FIX: Original code assumed 11+ digit numbers already had a country code,
// which fails for Brazilian numbers stored as "(011) 98765-4321" (11 digits
// with area code but no country code). WhatsApp needs +55 prepended for Brazil.
function formatWAPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');

  // Already has Brazilian country code: 55 + 2-digit area + 8-9 digit number
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Brazilian number without country code: 11 digits starting with area code
  // (e.g. 011 + 9-digit mobile = 11 digits, or 11 + 9-digit = 11 digits)
  if (digits.length === 11 && !digits.startsWith('1')) {
    return '55' + digits;
  }

  // US number: 10 digits (no country code) → prepend 1
  if (digits.length === 10) return '1' + digits;

  // US number: 11 digits starting with 1 (country code already present)
  if (digits.length === 11 && digits.startsWith('1')) return digits;

  return null;
}

/* ─── Utility: Outreach toggle ─── */
function toggleOutreach(header) {
  const body   = header.nextElementSibling;
  const toggle = header.querySelector('.outreach-toggle');
  const isOpen = body.classList.toggle('open');
  toggle.textContent = isOpen ? 'Ocultar mensagem ▴' : 'Mostrar mensagem ▾';
}

/* ─── Utility: Copy outreach message ─── */
function copyMessage(msgId, hintId) {
  const el   = document.getElementById(msgId);
  const hint = document.getElementById(hintId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    hint.textContent = '✅ Copiado!';
    hint.classList.add('copied');
    setTimeout(() => {
      hint.textContent = 'Clique na mensagem para copiar';
      hint.classList.remove('copied');
    }, 2000);
  });
}

/* ─── Utility: Auto-resize textarea ─── */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/* ─── Utility: Badge class ─── */
function badgeClass(label) {
  if (!label) return 'badge-cold';
  if (label.includes('High'))  return 'badge-hot';    // 🔥 High Opportunity → red
  if (label.includes('Good'))  return 'badge-good';   // ⭐ Good Lead → yellow
  if (label.includes('Solid')) return 'badge-strong'; // 👍 Solid Lead → green
  return 'badge-cold';
}

/* ─── Utility: Generate insight line for a lead ─── */
function generateInsight(lead) {
  if (!lead.website && !lead.instagram) return '🚀 No web presence — full opportunity';
  if (lead.website && !lead.instagram)  return '📸 No Instagram — needs social media';
  if (!lead.website && lead.instagram)  return '🌐 No website — digital presence gap';
  if (lead.reviewCount != null && lead.reviewCount < 15) return '🌱 Growing business — open to marketing';
  if (lead.rating != null && lead.rating >= 4.5 && lead.reviewCount >= 50) return '⭐ Top-rated — premium client potential';
  if (lead.rating != null && lead.rating >= 4.0) return '✅ Established business — solid prospect';
  return '📍 Local business — ready to reach out';
}

/* ─── Utility: Copy pitch from Quick Actions ─── */
function copyPitch(name) {
  const lead = leadsMap[name];
  if (!lead || !lead.outreachMessage) return;
  navigator.clipboard.writeText(lead.outreachMessage).then(() => {
    // Find the pitch button and flash it
    document.querySelectorAll('.action-pitch').forEach((btn) => {
      if (btn.getAttribute('onclick') === `copyPitch('${name}')`) {
        const orig = btn.textContent;
        btn.textContent = '✅ Copiado!';
        btn.classList.add('action-copied');
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove('action-copied');
        }, 1800);
      }
    });
  });
}

/* ═══════════════════════════════════════════════════
   LEAD DETAIL DRAWER
   ═══════════════════════════════════════════════════ */

let _drawerLead = null; // currently open lead

function openLeadDetail(name) {
  const lead = leadsMap[name];
  if (!lead) return;
  _drawerLead = lead;

  // Header
  document.getElementById('drawer-flag').textContent    = lead.brazilTab ? '🇧🇷' : '🇺🇸';
  document.getElementById('drawer-name').textContent    = lead.name;
  document.getElementById('drawer-insight').textContent = generateInsight(lead);
  document.getElementById('drawer-badge').innerHTML     =
    `<span class="badge ${badgeClass(lead.scoreLabel)}">${lead.scoreLabel}</span>`;

  // Actions bar — Contacted toggle + WhatsApp
  const waNum       = lead.phone ? formatWAPhone(lead.phone) : null;
  const isContacted = contactedSet.has(lead.name);
  const waBarBtn    = waNum
    ? `<a class="drawer-bar-btn drawer-bar-wa" href="https://wa.me/${waNum}" target="_blank" rel="noopener">💬 WhatsApp</a>`
    : '';
  document.getElementById('drawer-actions-bar').innerHTML = `
    <button class="drawer-bar-btn drawer-contacted-btn ${isContacted ? 'is-contacted' : ''}"
            onclick="drawerToggleContacted()">
      ${isContacted ? '✅ Contactado' : '◯ Marcar Contactado'}
    </button>
    ${waBarBtn}`;

  // Info grid — phone row includes WA link inline
  const phoneVal = lead.phone
    ? `${esc(lead.phone)}${waNum ? ` <a class="drawer-wa-inline" href="https://wa.me/${waNum}" target="_blank" rel="noopener">💬</a>` : ''}`
    : null;
  const rows = [
    ['CIDADE',    esc(lead.city)],
    ['TELEFONE',  phoneVal],
    ['WEBSITE',   lead.website ? `<a href="${esc(lead.website)}" target="_blank" rel="noopener">🌐 ${esc(shortenUrl(lead.website))}</a>` : null],
    ['INSTAGRAM', lead.instagram ? `<a href="${esc(lead.instagram)}" target="_blank" rel="noopener" class="ig-link">📸 ${esc(lead.instagram.replace('https://instagram.com/','@'))}</a>` : null],
    ['AVALIAÇÃO', lead.rating     != null ? `⭐ ${lead.rating}` : null],
    ['REVIEWS',   lead.reviewCount != null ? `${lead.reviewCount} reviews` : null],
    ['ENDEREÇO',  lead.address ? esc(lead.address) : null],
    ['FONTE',     lead.source  ? esc(lead.source)  : null],
  ].filter(([, v]) => v != null);

  document.getElementById('drawer-info-grid').innerHTML = rows.map(([label, val]) => `
    <div class="drawer-info-row">
      <span class="drawer-info-label">${label}</span>
      <span class="drawer-info-value">${val}</span>
    </div>`).join('');

  // CRM status pills
  const currentCol = crmState[name]?.column || null;
  document.getElementById('drawer-crm-pills').innerHTML = CRM_COLS.map((col) => `
    <button class="drawer-crm-pill drawer-crm-pill-${col.id} ${currentCol === col.id ? 'active' : ''}"
            onclick="drawerMoveLead('${esc(name).replace(/'/g,"\\'")}','${col.id}')">
      ${col.icon} ${col.label}
    </button>`).join('');

  // Outreach message
  const msg = lead.outreachMessage || '';
  document.getElementById('drawer-message').textContent    = msg;
  document.getElementById('drawer-copy-hint').textContent  = msg ? 'Clique na mensagem para copiar' : 'Nenhuma mensagem gerada';

  // Notes
  const notesEl = document.getElementById('drawer-notes');
  notesEl.value = notesMap[name] || '';
  setTimeout(() => autoResize(notesEl), 0);

  // Open
  document.getElementById('lead-drawer-backdrop').classList.add('open');
  document.getElementById('lead-drawer').classList.add('open');
  document.body.classList.add('drawer-open');
}

function closeLeadDetail() {
  document.getElementById('lead-drawer-backdrop').classList.remove('open');
  document.getElementById('lead-drawer').classList.remove('open');
  document.body.classList.remove('drawer-open');
  _drawerLead = null;
}

function drawerCopyPitch() {
  const msg  = document.getElementById('drawer-message').textContent;
  const hint = document.getElementById('drawer-copy-hint');
  if (!msg) return;
  navigator.clipboard.writeText(msg).then(() => {
    hint.textContent = '✅ Copiado!';
    hint.classList.add('copied');
    setTimeout(() => {
      hint.textContent = 'Clique na mensagem para copiar';
      hint.classList.remove('copied');
    }, 2000);
  });
}

function drawerSaveNote() {
  if (!_drawerLead) return;
  const text = document.getElementById('drawer-notes').value;
  saveNote(_drawerLead.name, text);
  // Sync back to table row note if visible
  const tableNote = document.querySelector(`tr[data-name="${_drawerLead.name.replace(/"/g,'\\"')}"] .lead-note`);
  if (tableNote) tableNote.value = text;
}

function drawerMoveLead(name, colId) {
  // Add to CRM if not already there
  if (!crmState[name]) {
    const lead = leadsMap[name];
    if (lead) crmState[name] = { column: colId, addedAt: new Date().toISOString(), lead };
  } else {
    crmState[name].column = colId;
  }
  saveCrm();
  // Refresh pills
  document.querySelectorAll('.drawer-crm-pill').forEach((btn) => btn.classList.remove('active'));
  const active = document.querySelector(`.drawer-crm-pill-${colId}`);
  if (active) active.classList.add('active');
}

/* ═══════════════════════════════════════════════════
   CRM BOARD
   ═══════════════════════════════════════════════════ */

const CRM_COLS = [
  { id: 'new',       label: 'New Leads', icon: '🆕', accentVar: 'cyan'   },
  { id: 'contacted', label: 'Contacted',  icon: '📤', accentVar: 'blue'   },
  { id: 'followup',  label: 'Follow-up',  icon: '🔔', accentVar: 'yellow' },
  { id: 'closed',    label: 'Closed',     icon: '✅', accentVar: 'green'  },
];

/* ─── CRM persistent state ─── */
let crmState = {};
try { crmState = JSON.parse(localStorage.getItem('vl_crm') || '{}'); } catch { crmState = {}; }

function saveCrm() {
  localStorage.setItem('vl_crm', JSON.stringify(crmState));
}

/**
 * Auto-add new leads to the "new" column.
 * Leads already on the board keep their existing column.
 * Lead data (score, insight, etc.) is always refreshed.
 */
function crmAddLeads(leads) {
  leads.forEach((lead) => {
    if (!lead.name) return;
    if (!crmState[lead.name]) {
      crmState[lead.name] = { column: 'new', addedAt: new Date().toISOString(), lead };
    } else {
      crmState[lead.name].lead = lead; // refresh data, keep column
    }
  });
  saveCrm();
}

/* ─── View toggle ─── */
function openCrm() {
  document.querySelector('.container').style.display = 'none';
  document.getElementById('crm-view').style.display  = 'block';
  renderCrmBoard();
}

function closeCrm() {
  document.getElementById('crm-view').style.display  = 'none';
  document.querySelector('.container').style.display = '';
}

/* ─── Board render ─── */
function renderCrmBoard() {
  const board    = document.getElementById('crm-board');
  const subtitle = document.getElementById('crm-subtitle');
  const total    = Object.keys(crmState).length;

  subtitle.textContent = total === 0
    ? 'Nenhum lead ainda — faça uma busca primeiro'
    : `${total} lead${total !== 1 ? 's' : ''} rastreados`;

  board.innerHTML = CRM_COLS.map((col) => {
    const entries = Object.values(crmState)
      .filter((v) => v.column === col.id)
      .sort((a, b) => (b.lead?.score || 0) - (a.lead?.score || 0));
    return renderCrmColumn(col, entries);
  }).join('');
}

function renderCrmColumn(col, entries) {
  const cards = entries.map((e) => renderCrmCard(e, col.id)).join('');
  const empty = entries.length === 0
    ? `<div class="crm-empty-col">Arraste leads aqui</div>`
    : '';

  return `
    <div class="crm-col crm-col-${col.id}"
         data-col="${col.id}"
         ondragover="onDragOver(event)"
         ondragleave="onDragLeave(event)"
         ondrop="onDrop(event,'${col.id}')">
      <div class="crm-col-header crm-col-header-${col.id}">
        <span class="crm-col-name">${col.icon} ${col.label}</span>
        <span class="crm-col-count crm-count-${col.id}">${entries.length}</span>
      </div>
      <div class="crm-col-body">
        ${cards}${empty}
      </div>
    </div>`;
}

function renderCrmCard(entry, colId) {
  const { lead } = entry;
  if (!lead) return '';
  const flag    = lead.brazilTab ? '🇧🇷' : '🇺🇸';
  const nameEsc = esc(lead.name).replace(/'/g, '&#39;');
  const sitePart = lead.website
    ? `<a class="crm-btn crm-btn-site" href="${esc(lead.website)}" target="_blank" rel="noopener">🌐 Site</a>`
    : '';

  return `
    <div class="crm-card crm-card-${colId}"
         draggable="true"
         data-name="${nameEsc}"
         ondragstart="onDragStart(event)"
         ondragend="onDragEnd(event)">
      <div class="crm-card-top">
        <span class="crm-card-name">${flag} ${esc(lead.name)}</span>
        <span class="badge ${badgeClass(lead.scoreLabel)} crm-badge">${lead.scoreLabel}</span>
      </div>
      <div class="crm-card-meta">${esc(lead.city)}${lead.niche ? ` · ${esc(lead.niche)}` : ''}</div>
      <div class="crm-card-insight">${generateInsight(lead)}</div>
      <div class="crm-card-actions">
        <button class="crm-btn crm-btn-pitch" onclick="crmCopyPitch('${nameEsc}')">📋 Pitch</button>
        ${sitePart}
        <button class="crm-btn crm-btn-remove" onclick="removeCrmLead('${nameEsc}')" title="Remover do board">✕</button>
      </div>
    </div>`;
}

/* ─── Drag & Drop ─── */
let _dragName = null;

function onDragStart(e) {
  _dragName = e.currentTarget.dataset.name;
  e.currentTarget.classList.add('crm-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', _dragName);
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('crm-dragging');
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('crm-drag-over');
}

function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.classList.remove('crm-drag-over');
  }
}

function onDrop(e, colId) {
  e.preventDefault();
  e.currentTarget.classList.remove('crm-drag-over');
  const name = _dragName || e.dataTransfer.getData('text/plain');
  if (!name || !crmState[name]) return;
  if (crmState[name].column === colId) return; // no-op: same column
  crmState[name].column = colId;
  saveCrm();
  renderCrmBoard();
  _dragName = null;
}

/* ─── CRM Actions ─── */
function removeCrmLead(name) {
  if (!crmState[name]) return;
  delete crmState[name];
  saveCrm();
  renderCrmBoard();
}

function confirmClearCrm() {
  if (confirm('Limpar todos os leads do CRM? Essa ação não pode ser desfeita.')) {
    crmState = {};
    saveCrm();
    renderCrmBoard();
  }
}

function crmCopyPitch(name) {
  const entry = crmState[name];
  if (!entry?.lead?.outreachMessage) return;
  navigator.clipboard.writeText(entry.lead.outreachMessage).then(() => {
    const sel = `.crm-card[data-name="${name.replace(/"/g, '\\"')}"] .crm-btn-pitch`;
    const btn = document.querySelector(sel);
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  });
}

function drawerToggleContacted() {
  if (!_drawerLead) return;
  const name    = _drawerLead.name;
  const newVal  = !contactedSet.has(name);
  toggleContacted(name, { checked: newVal }); // reuses existing logic + saves to localStorage
  const btn = document.querySelector('.drawer-contacted-btn');
  if (!btn) return;
  btn.textContent = newVal ? '✅ Contactado' : '◯ Marcar Contactado';
  btn.classList.toggle('is-contacted', newVal);
}

/* ═══════════════════════════════════════════════════
   END CRM BOARD
   ═══════════════════════════════════════════════════ */

function shortenUrl(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function setStatus(msg, isError = false, isLoading = false) {
  if (isLoading) {
    statusEl.innerHTML = `${msg}<span class="dot-pulse"><span></span><span></span><span></span></span>`;
  } else {
    statusEl.textContent = msg;
  }
  statusEl.className = isError ? 'error' : isLoading ? 'loading' : '';
}

function disableSearchBtns(state) {
  document.querySelectorAll('.btn-search').forEach((b) => {
    b.disabled = state;
    if (state) {
      b._originalHTML = b.innerHTML;
      b.innerHTML = '🔍 Finding<span class="dot-pulse"><span></span><span></span><span></span></span>';
      b.classList.add('loading-state');
    } else {
      if (b._originalHTML) b.innerHTML = b._originalHTML;
      b.classList.remove('loading-state');
    }
  });
}
