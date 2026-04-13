/* ─── Element References ─── */
const form          = document.getElementById('search-form');
const nicheInput    = document.getElementById('niche');
const cityInput     = document.getElementById('city');
const searchBtn     = document.getElementById('search-btn');
const statusEl      = document.getElementById('status');
const tabsWrapper   = document.getElementById('tabs-wrapper');
const resultsTitle  = document.getElementById('results-title');
const resultsBody   = document.getElementById('results-body');
const exportBtn     = document.getElementById('export-btn');
const outreachList  = document.getElementById('outreach-list');
const historyList   = document.getElementById('history-list');

let currentCsvFile = null;

/* ─── Tab Switching ─── */
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

    // Load history when switching to that tab
    if (btn.dataset.tab === 'history') loadHistory();
  });
});

/* ─── Search Form ─── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const niche = nicheInput.value.trim();
  const city  = cityInput.value.trim();
  if (!niche || !city) return;

  setStatus('⏳ Searching and processing leads…');
  searchBtn.disabled = true;
  tabsWrapper.classList.add('hidden');
  resultsBody.innerHTML = '';
  outreachList.innerHTML = '';
  currentCsvFile = null;

  try {
    const res  = await fetch('/api/leads', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ niche, city }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || 'Something went wrong.', true);
      return;
    }

    const leads = data.leads || [];

    if (leads.length === 0) {
      setStatus('No results found. Try a different niche or city.');
      return;
    }

    currentCsvFile = data.csvFile || null;

    renderResults(leads, niche, city);
    renderOutreach(leads);
    tabsWrapper.classList.remove('hidden');
    setStatus('');

    // Switch to results tab
    switchTab('results');

  } catch (err) {
    setStatus('Network error. Make sure the server is running.', true);
  } finally {
    searchBtn.disabled = false;
  }
});

/* ─── Export Button ─── */
exportBtn.addEventListener('click', () => {
  if (!currentCsvFile) return;
  window.location.href = `/api/leads/export/${encodeURIComponent(currentCsvFile)}`;
});

/* ─── Render: Results Table ─── */
function renderResults(leads, niche, city) {
  resultsTitle.textContent = `${leads.length} leads found for "${niche}" in ${city}`;
  resultsBody.innerHTML = '';

  leads.forEach((lead, i) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td><strong>${esc(lead.name)}</strong></td>
      <td>${lead.phone || '<span class="na">—</span>'}</td>
      <td>${lead.website
        ? `<a href="${esc(lead.website)}" target="_blank" rel="noopener">${shortenUrl(lead.website)}</a>`
        : '<span class="na">—</span>'}</td>
      <td>${lead.rating ? `⭐ ${lead.rating}` : '<span class="na">—</span>'}</td>
      <td>${lead.reviewCount != null ? lead.reviewCount : '<span class="na">—</span>'}</td>
      <td><span class="badge ${badgeClass(lead.scoreLabel)}">${lead.scoreLabel}</span></td>
    `;
    resultsBody.appendChild(row);
  });
}

/* ─── Render: Outreach Messages ─── */
function renderOutreach(leads) {
  outreachList.innerHTML = '';

  leads.forEach((lead) => {
    const card = document.createElement('div');
    card.className = 'outreach-card';

    const msgId = `msg-${Math.random().toString(36).slice(2)}`;
    const hintId = `hint-${Math.random().toString(36).slice(2)}`;

    card.innerHTML = `
      <div class="outreach-header" onclick="toggleOutreach(this)">
        <div>
          <div class="outreach-name">${esc(lead.name)}</div>
          <div class="outreach-meta">${esc(lead.city)} · <span class="badge ${badgeClass(lead.scoreLabel)}">${lead.scoreLabel}</span></div>
        </div>
        <span class="outreach-toggle">Show message ▾</span>
      </div>
      <div class="outreach-body">
        <pre class="outreach-message" id="${msgId}" onclick="copyMessage('${msgId}', '${hintId}')">${esc(lead.outreachMessage)}</pre>
        <div class="copy-hint" id="${hintId}">Click message to copy</div>
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
      const date = new Date(entry.date).toLocaleString();
      item.innerHTML = `
        <div class="history-info">
          <div class="niche-city">${esc(entry.niche)} — ${esc(entry.city)}</div>
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

/* ─── Helpers ─── */
function toggleOutreach(header) {
  const body   = header.nextElementSibling;
  const toggle = header.querySelector('.outreach-toggle');
  const isOpen = body.classList.toggle('open');
  toggle.textContent = isOpen ? 'Hide message ▴' : 'Show message ▾';
}

function copyMessage(msgId, hintId) {
  const el   = document.getElementById(msgId);
  const hint = document.getElementById(hintId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    hint.textContent = '✅ Copied!';
    hint.classList.add('copied');
    setTimeout(() => {
      hint.textContent = 'Click message to copy';
      hint.classList.remove('copied');
    }, 2000);
  });
}

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach((c) => {
    c.classList.toggle('active', c.id === `tab-${name}`);
  });
}

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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className   = isError ? 'error' : '';
}
