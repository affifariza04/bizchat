// Customer messages and KB entries are untrusted: escape before using innerHTML.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Page / nav switching ----------
const pages = { preview: document.getElementById('page-preview'), dashboard: document.getElementById('page-dashboard'), kb: document.getElementById('page-kb') };
function goToPage(name) {
  Object.entries(pages).forEach(([key, el]) => el.classList.toggle('active', key === name));
  document.querySelectorAll('.navlist button').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  if (name === 'dashboard') refreshDashboard();
  if (name === 'kb') refreshKb();
}
document.querySelectorAll('.navlist button').forEach(btn => {
  btn.addEventListener('click', () => goToPage(btn.dataset.page));
});

// ---------- Widget open/close ----------
const fab = document.getElementById('widgetFab');
const panel = document.getElementById('widgetPanel');
fab.addEventListener('click', () => panel.classList.toggle('open'));

// ---------- Chat ----------
const chatBody = document.getElementById('chatBody');
const chatInput = document.getElementById('chatInput');

function addMsg(text, cls) {
  const div = document.createElement('div');
  div.className = 'msg ' + cls;
  div.textContent = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

async function handleQuestion(text) {
  if (!text || !text.trim()) return;
  addMsg(text, 'user');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    addMsg(data.answer, data.source === 'escalate' ? 'escalate' : 'bot');
  } catch (err) {
    addMsg('Maaf, terjadi gangguan koneksi ke server. Coba lagi sebentar lagi.', 'escalate');
  }
}

document.getElementById('sendBtn').addEventListener('click', () => {
  const val = chatInput.value; chatInput.value = '';
  handleQuestion(val);
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { const val = chatInput.value; chatInput.value = ''; handleQuestion(val); }
});
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => { panel.classList.add('open'); handleQuestion(chip.dataset.q); });
});

// ---------- AI status pill ----------
async function checkAiStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const pill = document.getElementById('aiStatusPill');
    const text = document.getElementById('aiStatusText');
    if (data.aiEnabled) {
      pill.classList.add('on'); pill.classList.remove('off');
      text.textContent = 'aktif';
    } else {
      pill.classList.add('off'); pill.classList.remove('on');
      text.textContent = 'nonaktif';
    }
  } catch (e) { /* biarkan default */ }
}
checkAiStatus();

// ---------- Dashboard ----------
async function refreshDashboard() {
  const [stats, kb, escalations] = await Promise.all([
    fetch('/api/stats').then(r => r.json()),
    fetch('/api/kb').then(r => r.json()),
    fetch('/api/escalations').then(r => r.json()),
  ]);

  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statKb').textContent = stats.kbMatched;
  document.getElementById('statAi').textContent = stats.aiAnswered;
  document.getElementById('statEsc').textContent = stats.escalated;

  const barList = document.getElementById('barList');
  const sorted = [...kb].filter(k => (k.hits || 0) > 0).sort((a, b) => (b.hits || 0) - (a.hits || 0)).slice(0, 6);
  barList.innerHTML = '';
  if (sorted.length === 0) {
    barList.innerHTML = '<div class="empty-note">Belum ada data pemakaian. Coba kirim beberapa pertanyaan di halaman Live Preview.</div>';
  } else {
    const max = sorted[0].hits || 1;
    sorted.forEach(item => {
      const row = document.createElement('div');
      row.className = 'barrow';
      const pct = Math.max(6, Math.round((item.hits / max) * 100));
      row.innerHTML = `<div class="lbl">${escapeHtml(item.key)}</div><div class="track"><div class="fill" style="width:${pct}%"></div></div><div class="ct">${item.hits}</div>`;
      barList.appendChild(row);
    });
  }

  const feed = document.getElementById('escList');
  const empty = document.getElementById('escEmpty');
  feed.innerHTML = '';
  if (escalations.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    escalations.slice().reverse().slice(0, 8).forEach(e => {
      const li = document.createElement('li');
      const t = new Date(e.time).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
      li.innerHTML = `<div><div class="fq">"${escapeHtml(e.question)}"</div><div class="ft">${t}</div></div>`;
      feed.appendChild(li);
    });
  }
}

// ---------- Knowledge base page ----------
let kbCache = [];
async function refreshKb() {
  kbCache = await fetch('/api/kb').then(r => r.json());
  renderKbTable(kbCache);
}
function renderKbTable(list) {
  const body = document.getElementById('kbBody');
  body.innerHTML = '';
  list.forEach((item) => {
    const realIndex = kbCache.indexOf(item);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="kw-chip">${escapeHtml(item.key)}</span></td>
      <td>${escapeHtml(item.answer)}</td>
      <td class="hitcount">${item.hits || 0}×</td>
      <td><button class="row-del" data-idx="${realIndex}">Hapus</button></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('.row-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch('/api/kb/' + btn.dataset.idx, { method: 'DELETE' });
      refreshKb();
    });
  });
}
document.getElementById('kbSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderKbTable(kbCache.filter(k => k.key.includes(q) || k.answer.toLowerCase().includes(q)));
});
document.getElementById('toggleAdd').addEventListener('click', () => {
  const panelEl = document.getElementById('addPanel');
  panelEl.style.display = panelEl.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('addKb').addEventListener('click', async () => {
  const key = document.getElementById('newKey').value.trim();
  const answer = document.getElementById('newVal').value.trim();
  if (!key || !answer) return;
  await fetch('/api/kb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, answer }),
  });
  document.getElementById('newKey').value = '';
  document.getElementById('newVal').value = '';
  refreshKb();
});

// init
checkAiStatus();
