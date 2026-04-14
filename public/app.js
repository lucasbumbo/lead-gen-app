/* ─────────────────────────────────────────────────
   VideoLead Finder — frontend logic
   ───────────────────────────────────────────────── */

const statusEl     = document.getElementById('status');
const tabsWrapper  = document.getElementById('tabs-wrapper');
const resultsTitle = document.getElementById('results-title');
const resultsBody  = document.getElementById('results-body');
const exportBtn    = document.getElementById('export-btn');
const outreachList = document.getElementById('outreach-list');
const historyList  = document.getElementById('history-list');

let currentCsvFile = null;
let activeMarket   = 'us';

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

/* ─── Filter bar listeners ─── */
document.getElementById('filter-pt').addEventListener('change',     () => applyFilters());
document.getElementById('filter-source').addEventListener('change', () => applyFilters());

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
  const ptOnly    = document.getElementById('filter-pt').checked;
  const srcFilter = document.getElementById('filter-source').value;

  let filtered = allLeads;
  if (ptOnly)              filtered = filtered.filter((l) => l.portugueseSite);
  if (srcFilter !== 'all') filtered = filtered.filter((l) => (l.source || '').toLowerCase() === srcFilter);

  filtered = [...filtered].sort((a, b) => {
    const av = a[sortCol] ?? (typeof a[sortCol] === 'string' ? '' : -999);
    const bv = b[sortCol] ?? (typeof b[sortCol] === 'string' ? '' : -999);
    if (av > bv) return sortDir;
    if (av < bv) return -sortDir;
    return 0;
  });

  renderResults(filtered, currentNiche, currentCity, currentBrazil);
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
  resultsTitle.textContent = `${flag} ${leads.length} leads — "${niche}" in ${city}`;
  resultsBody.innerHTML = '';

  leads.forEach((lead, i) => {
    const row = document.createElement('tr');
    row.dataset.name = lead.name || '';
    if (contactedSet.has(lead.name)) row.classList.add('contacted');

    // Instagram cell
    let igCell = '<span class="na">—</span>';
    if (lead.instagram) {
      const handle = lead.instagram.replace('https://instagram.com/', '');
      igCell = `<a class="ig-link" href="${esc(lead.instagram)}" target="_blank" rel="noopener">📸 @${esc(handle)}</a>`;
    }

    // Phone cell — with copy + WhatsApp
    let phoneCell = '<span class="na">—</span>';
    if (lead.phone) {
      const waNum = formatWAPhone(lead.phone);
      const waBtn = waNum
        ? `<a class="wa-btn" href="https://wa.me/${waNum}" target="_blank" rel="noopener" title="WhatsApp">💬</a>`
        : '';
      phoneCell = `<span class="phone-copy" onclick="copyText('${esc(lead.phone)}', this)" title="Click to copy">${esc(lead.phone)}</span>${waBtn}`;
    }

    // Name cell — with address + contacted checkbox
    const addrLine = lead.address
      ? `<div class="lead-address">${esc(lead.address)}</div>`
      : '';
    const nameCell = `
      <label class="contacted-wrap" title="${contactedSet.has(lead.name) ? 'Contactado' : 'Marcar como contactado'}">
        <input type="checkbox" class="contacted-cb" ${contactedSet.has(lead.name) ? 'checked' : ''}
          onchange="toggleContacted('${esc(lead.name)}', this)">
        <strong>${esc(lead.name)}</strong>
      </label>
      ${addrLine}`;

    const scoreColor = badgeClass(lead.scoreLabel);

    row.innerHTML = `
      <td>${i + 1}</td>
      <td style="font-size:1.1rem">${lead.brazilTab ? '🇧🇷' : '🇺🇸'}</td>
      <td>${nameCell}</td>
      <td>${phoneCell}</td>
      <td>${lead.website
        ? `<a href="${esc(lead.website)}" target="_blank" rel="noopener">${shortenUrl(lead.website)}</a>`
        : '<span class="na">—</span>'}</td>
      <td>${igCell}</td>
      <td>${lead.rating != null ? `⭐ ${lead.rating}` : '<span class="na">—</span>'}</td>
      <td>${lead.reviewCount != null ? lead.reviewCount : '<span class="na">—</span>'}</td>
      <td>
        <span class="badge ${scoreColor}">${lead.scoreLabel}</span>
        <span class="score-num">${lead.score}pts</span>
      </td>
      <td><span class="source-badge source-${(lead.source||'').toLowerCase()}">${esc(lead.source||'—')}</span></td>
      <td>${lead.portugueseSite ? '<span class="pt-badge">🇧🇷 PT</span>' : '<span class="na">—</span>'}</td>
    `;
    resultsBody.appendChild(row);
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

/* ─── Utility: Contacted toggle ─── */
function toggleContacted(name, checkbox) {
  if (checkbox.checked) contactedSet.add(name);
  else contactedSet.delete(name);
  saveContacted();
  document.querySelectorAll(`tr[data-name="${name.replace(/"/g, '\\"')}"]`).forEach((row) => {
    row.classList.toggle('contacted', checkbox.checked);
  });
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
function formatWAPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '1' + digits;     // US number without country code
  if (digits.length >= 11)  return digits;            // already has country code
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

/* ─── Utility: Badge class ─── */
function badgeClass(label) {
  if (!label) return 'badge-cold';
  if (label.includes('Hot'))    return 'badge-hot';
  if (label.includes('Strong')) return 'badge-strong';
  if (label.includes('Good'))   return 'badge-good';
  return 'badge-cold';
}

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
  statusEl.textContent = msg;
  statusEl.className   = isError ? 'error' : isLoading ? 'loading' : '';
}

function disableSearchBtns(state) {
  document.querySelectorAll('.btn-search').forEach((b) => (b.disabled = state));
}
