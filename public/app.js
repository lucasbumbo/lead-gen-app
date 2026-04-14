/* ─────────────────────────────────────────────────
   VideoLead Finder — frontend logic
   ───────────────────────────────────────────────── */

const statusEl      = document.getElementById('status');
const tabsWrapper   = document.getElementById('tabs-wrapper');
const resultsTitle  = document.getElementById('results-title');
const resultsBody   = document.getElementById('results-body');
const exportBtn     = document.getElementById('export-btn');
const outreachList  = document.getElementById('outreach-list');
const historyList   = document.getElementById('history-list');

let currentCsvFile = null;
let activeMarket   = 'us'; // 'us' | 'brazil'

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

/* ─── Core search function ─── */
async function runSearch(niche, city, brazilTab) {
  setStatus('⏳ Buscando e processando leads…');
  disableSearchBtns(true);
  tabsWrapper.classList.add('hidden');
  resultsBody.innerHTML   = '';
  outreachList.innerHTML  = '';
  currentCsvFile = null;

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

    currentCsvFile = data.csvFile || null;
    renderResults(leads, niche, city, brazilTab);
    renderOutreach(leads);
    tabsWrapper.classList.remove('hidden');
    setStatus('');
    switchResultTab('results');

  } catch (err) {
    setStatus('Network error — make sure the server is running.', true);
  } finally {
    disableSearchBtns(false);
  }
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
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach((c) => {
    c.classList.toggle('active', c.id === `tab-${name}`);
  });
}

/* ─── Render: Results Table ─── */
function renderResults(leads, niche, city, brazilTab) {
  const flag = brazilTab ? '🇧🇷' : '🇺🇸';
  resultsTitle.textContent = `${flag} ${leads.length} leads — "${niche}" in ${city}`;
  resultsBody.innerHTML = '';

  leads.forEach((lead, i) => {
    const row = document.createElement('tr');

    // Instagram cell
    let igCell = '<span class="na">—</span>';
    if (lead.instagram) {
      const handle = lead.instagram.replace('https://instagram.com/', '');
      igCell = `<a class="ig-link" href="${esc(lead.instagram)}" target="_blank" rel="noopener">📸 @${esc(handle)}</a>`;
    }

    // Score cell — color badge based on label
    const scoreColor = badgeClass(lead.scoreLabel);

    row.innerHTML = `
      <td>${i + 1}</td>
      <td style="font-size:1.1rem">${lead.brazilTab ? '🇧🇷' : '🇺🇸'}</td>
      <td><strong>${esc(lead.name)}</strong></td>
      <td>${lead.phone || '<span class="na">—</span>'}</td>
      <td>${lead.website
        ? `<a href="${esc(lead.website)}" target="_blank" rel="noopener">${shortenUrl(lead.website)}</a>`
        : '<span class="na">—</span>'}</td>
      <td>${igCell}</td>
      <td>${lead.rating != null ? `⭐ ${lead.rating}` : '<span class="na">—</span>'}</td>
      <td>${lead.reviewCount != null ? lead.reviewCount : '<span class="na">—</span>'}</td>
      <td>
        <span class="badge ${scoreColor}">${lead.scoreLabel}</span>
        <span class="score-num" style="margin-left:4px;color:#888;font-size:0.75rem">${lead.score}pts</span>
      </td>
      <td><span class="source-badge source-${(lead.source||'').toLowerCase()}">${esc(lead.source||'—')}</span></td>
    `;
    resultsBody.appendChild(row);
  });
}

/* ─── Render: Outreach Messages ─── */
function renderOutreach(leads) {
  outreachList.innerHTML = '';

  leads.forEach((lead) => {
    const card  = document.createElement('div');
    card.className = 'outreach-card';

    const msgId  = `msg-${Math.random().toString(36).slice(2)}`;
    const hintId = `hint-${Math.random().toString(36).slice(2)}`;
    const flag   = lead.brazilTab ? '🇧🇷' : '🇺🇸';

    // Instagram quick-link inside card
    let igLine = '';
    if (lead.instagram) {
      const handle = lead.instagram.replace('https://instagram.com/', '');
      igLine = `<a class="outreach-ig-link" href="${esc(lead.instagram)}" target="_blank" rel="noopener">📸 @${esc(handle)}</a>`;
    }

    card.innerHTML = `
      <div class="outreach-header" onclick="toggleOutreach(this)">
        <div>
          <div class="outreach-name">${flag} ${esc(lead.name)}</div>
          <div class="outreach-meta">${esc(lead.city)} · <span class="badge ${badgeClass(lead.scoreLabel)}">${lead.scoreLabel}</span></div>
        </div>
        <span class="outreach-toggle">Show message ▾</span>
      </div>
      <div class="outreach-body">
        ${igLine}
        <pre class="outreach-message" id="${msgId}" onclick="copyMessage('${msgId}','${hintId}')">${esc(lead.outreachMessage)}</pre>
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

/* ─── Utility functions ─── */
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

function disableSearchBtns(state) {
  document.querySelectorAll('.btn-search').forEach((b) => (b.disabled = state));
}
