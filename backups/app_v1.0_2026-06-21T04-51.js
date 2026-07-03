import {
  GlassCard,
  Badge,
  StatCard,
  ProgressBar,
  ThinBar,
} from './components.js';

const API = location.origin;
let evtSource = null;
let currentData = null;
let boardTasks = [];
let modalState = null;

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function fmtPct(n) {
  if (n == null) return '—';
  return n.toFixed(1) + '%';
}

function statusBadge(s) {
  const cls = s === 'completed' ? 'var(--status-success)' : s === 'failed' ? 'var(--status-error)' : s === 'in_progress' ? 'var(--status-warning)' : 'var(--text-muted)';
  return Badge({ text: s, color: cls });
}

function relativeTime(ts) {
  if (!ts) return '—';
  try {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  } catch (e) {
    return '—';
  }
}

// ---------- Overview ----------
function renderRadar(container, activity) {
  if (!container) return;
  const total = (activity?.totals?.total) || 0;
  const agents = activity?.agents || [];
  const names = ['orchestrator', 'analyst', 'writer', 'marketer', 'coder'];
  const shares = names.map(n => {
    const a = agents.find(x => (x.name || '').toLowerCase() === n);
    return total > 0 ? (a?.total || 0) / total : 0;
  });
  const cx = 70, cy = 70, R = 60;
  const circles = [15, 30, 45, 60].map(r => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-glass)" stroke-width="0.5"/>`).join('');
  const cross = `<line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="var(--border-glass)" stroke-width="0.5"/><line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="var(--border-glass)" stroke-width="0.5"/>`;
  const colors = ['var(--agent-orchestrator)', 'var(--agent-analyst)', 'var(--agent-writer)', 'var(--agent-marketer)', 'var(--agent-coder)'];
  let angle = -Math.PI / 2;
  const slices = shares.map((s, i) => {
    const a1 = angle;
    const a2 = angle + Math.PI * 2 * (s || 0.001);
    angle = a2;
    const large = (s || 0) > 0.5 ? 1 : 0;
    if (s <= 0) return '';
    const x1 = cx + Math.cos(a1) * R;
    const y1 = cy + Math.sin(a1) * R;
    const x2 = cx + Math.cos(a2) * R;
    const y2 = cy + Math.sin(a2) * R;
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z" fill="${colors[i]}" fill-opacity="0.25" stroke="${colors[i]}" stroke-width="1"/>`;
  }).join('');
  const dots = shares.map((s, i) => {
    if (s <= 0) return '';
    const mid = angleForIndex(i, shares);
    const px = cx + Math.cos(mid) * R * 0.85;
    const py = cy + Math.sin(mid) * R * 0.85;
    return `<circle cx="${px}" cy="${py}" r="3" fill="${colors[i]}"><animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite"/></circle>`;
  }).join('');
  container.innerHTML = `
    <svg viewBox="0 0 140 140" width="180" height="180">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g>${circles}${cross}</g>
      <g filter="url(#glow)">${slices}${dots}</g>
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="8s" repeatCount="indefinite"/>
        <line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="var(--brand-cyan)" stroke-width="1.5" stroke-opacity="0.6"/>
      </g>
    </svg>
  `;
}
function angleForIndex(i, shares) {
  let a = -Math.PI / 2;
  for (let j = 0; j < i; j++) a += Math.PI * 2 * (shares[j] || 0.001);
  return a + Math.PI * 2 * (shares[i] || 0.001) / 2;
}
let dirIndex = 0;
function renderDirective(container, activity) {
  if (!container) return;
  const entries = (activity?.entries || []).slice(0, 12);
  if (!entries.length) { container.innerHTML = Badge({ text: 'Awaiting logs', color: 'var(--text-muted)' }); return; }
  const text = entries[dirIndex % entries.length];
  dirIndex++;
  container.innerHTML = `${esc(text.agent || '?')} · ${esc(text.task || '—')}`;
}
function renderContext(container, activity) {
  if (!container) return;
  const agents = activity?.agents || [];
  if (!agents.length) { container.innerHTML = '<div class="hint">No agent data</div>'; return; }
  const maxTotal = Math.max(...agents.map(a => a.total || 0), 1);
  container.innerHTML = agents.map(a => {
    const pct = ((a.total || 0) / maxTotal) * 100;
    const status = (a.last_seen || '').slice(0, 19).replace('T', ' ') || '—';
    return `
      <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-1) 0;border-bottom:1px solid var(--border-glass)">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name)}</span>
        ${ProgressBar({ pct, color: 'var(--brand-cyan)' })}
        <span class="hint" style="width:120px;text-align:right">${status}</span>
      </div>
    `;
  }).join('');
}
function renderVpsHealth(container, vps) {
  if (!container) return;
  if (!vps || vps.error) { container.innerHTML = Badge({ text: v && v.error || 'unavailable', color: 'var(--status-error)' }); return; }
  const cpuColor = vps.cpu_percent > 85 ? 'var(--status-error)' : vps.cpu_percent > 70 ? 'var(--status-warning)' : 'var(--brand-cyan)';
  const memColor = vps.memory.percent > 85 ? 'var(--status-error)' : vps.memory.percent > 70 ? 'var(--status-warning)' : 'var(--brand-cyan)';
  const diskColor = vps.disk.percent > 85 ? 'var(--status-error)' : vps.disk.percent > 70 ? 'var(--status-warning)' : 'var(--brand-cyan)';
  container.innerHTML = `
    <div style="margin-bottom:var(--space-2)">
      <div style="display:flex;justify-content:space-between;align-items:center"><span>CPU</span><strong class="num">${fmtPct(vps.cpu_percent)}</strong></div>
      ${ProgressBar({ pct: vps.cpu_percent, color: cpuColor })}
    </div>
    <div style="margin-bottom:var(--space-2)">
      <div style="display:flex;justify-content:space-between;align-items:center"><span>Memory</span><span class="num">${vps.memory.used_human} / ${vps.memory.total_human}</span></div>
      ${ProgressBar({ pct: vps.memory.percent, color: memColor })}
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center"><span>Disk</span><span class="num">${vps.disk.used_human} / ${vps.disk.total_human}</span></div>
      ${ProgressBar({ pct: vps.disk.percent, color: diskColor })}
    </div>
  `;
}
function renderDbFooter(container, dbs) {
  if (!container) return;
  const total = dbs?.total_human || '—';
  container.innerHTML = `<div class="hint">Total ${total}</div>`;
}
function renderDashFooter(container, data) {
  if (!container) return;
  const queue = '—';
  const sessions = (data?.sessions?.totals?.session_count) ?? '—';
  const errors = (data?.activity?.totals?.failed) ?? 0;
  const today = (data?.activity?.daily && data.activity.daily[0]?.count) ?? '—';
  let uptime = '—';
  try {
    const st = data?.gateway?.start_time;
    if (st) {
      const diff = Date.now() - new Date(st).getTime();
      const h = Math.floor(diff / 3600000);
      uptime = h + 'h';
    }
  } catch (e) {}
  const errColor = (typeof errors === 'number' && errors === 0) ? 'var(--status-success)' : 'var(--status-error)';
  const cells = container.querySelectorAll('.footer-cell');
  if (cells.length >= 5) {
    cells[0].querySelector('.num').textContent = queue;
    cells[1].querySelector('.num').textContent = fmtNum(sessions);
    cells[2].querySelector('.num').textContent = fmtNum(errors);
    cells[2].querySelector('.num').style.color = errColor;
    cells[3].querySelector('.num').textContent = today;
    cells[4].querySelector('.num').textContent = uptime;
  }
}
function renderStatsStrip(container, data) {
  if (!container) return;
  const totals = data?.activity?.totals || {};
  const sessions = data?.sessions?.totals || {};
  const successRate = totals.total ? ((totals.completed || 0) / totals.total * 100) : 0;
  container.innerHTML = `
    ${StatCard({ label: 'Integrity', value: fmtPct(successRate), accent: 'var(--status-active)', subtext: 'success rate', barWidth: successRate + '%' })}
    ${StatCard({ label: 'Agent Calls', value: fmtNum(totals.total), accent: 'var(--brand-cyan)', barWidth: '100%' })}
    ${StatCard({ label: 'Messages', value: fmtNum(sessions.message_count), accent: 'var(--agent-orchestrator)', barWidth: '100%' })}
    ${StatCard({ label: 'Tokens In', value: fmtNum(sessions.input_tokens), accent: 'var(--brand-gold)', barWidth: '100%' })}
    ${StatCard({ label: 'Cache Hits', value: fmtNum(sessions.cache_read_tokens), accent: 'var(--brand-pink)', barWidth: '100%' })}
  `;
}
let sparkData = new Array(28).fill(0);
function renderThroughput(container, activity) {
  if (!container) return;
  const count = activity?.totals?.total || 0;
  sparkData.push(count);
  sparkData.shift();
  const canvas = document.getElementById('throughput-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * 2;
  const h = canvas.height = canvas.clientHeight * 2;
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...sparkData, 1);
  const step = w / (sparkData.length - 1);
  ctx.beginPath();
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand-cyan').trim() || '#7DD3FC';
  ctx.lineWidth = 2;
  sparkData.forEach((v, i) => {
    const x = i * step;
    const y = h - (v / max) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(139,92,246,0.2)');
  grad.addColorStop(1, 'rgba(125,211,252,0.2)');
  ctx.fillStyle = grad;
  ctx.fill();
  const last = sparkData[sparkData.length - 1];
  const ly = h - (last / max) * h;
  ctx.beginPath();
  ctx.arc(w - 2, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand-cyan').trim() || '#7DD3FC';
  ctx.shadowColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-cyan').trim() || '#7DD3FC';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
}
function renderActivityFeed(container, activity) {
  if (!container) return;
  const entries = (activity?.entries || []).slice(0, 8);
  container.innerHTML = entries.map(r => `
    <div style="display:flex;gap:var(--space-2);align-items:center;padding:var(--space-1) 0;border-bottom:1px solid var(--border-glass)">
      ${Badge({ text: r.agent, color: 'var(--agent-orchestrator)' })}
      ${statusBadge(r.status)}
      <span class="hint" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.task)}">${esc(r.task)}</span>
      <span class="num" style="font-size:var(--font-size-xs)">${(r.created_at || '').slice(11,16) || '—'}</span>
    </div>
  `).join('');
}
function renderOverview(data) {
  currentData = data;
  const radar = document.getElementById('radar-container');
  const directive = document.getElementById('directive-text');
  const context = document.getElementById('context-window');
  const vpsHealth = document.getElementById('vps-health');
  const dbFooter = document.getElementById('db-footer');
  const dashFooter = document.getElementById('dash-footer');
  const statsStrip = document.getElementById('stats-strip');
  const throughContainer = document.getElementById('throughput-container');
  const activityFeed = document.getElementById('activity-feed');
  renderRadar(radar, data.activity);
  renderDirective(directive, data.activity);
  renderContext(context, data.activity);
  renderVpsHealth(vpsHealth, data.vps);
  renderDbFooter(dbFooter, data.dbs);
  renderDashFooter(dashFooter, data);
  renderStatsStrip(statsStrip, data);
  renderThroughput(throughContainer, data.activity);
  renderActivityFeed(activityFeed, data.activity);
}

// ---------- Agents ----------
const AGENT_META = {
  orchestrator: { badge: 'ORCH', color: 'var(--agent-orchestrator)', role: 'Routes tasks, manages agent concurrency, enforces boundaries.' },
  analyst:     { badge: 'ANAL', color: 'var(--agent-analyst)', role: 'Researches domains, builds context packs, validates sources.' },
  writer:      { badge: 'WRTR', color: 'var(--agent-writer)', role: 'Drafts copy, edits for clarity, maintains tone guides.' },
  marketer:    { badge: 'MRKT', color: 'var(--agent-marketer)', role: 'Builds funnels, writes promos, tracks conversion signals.' },
  coder:       { badge: 'CODR', color: 'var(--agent-coder)', role: 'Writes production code, owns deploys, enforces standards.' },
};
function buildAgents() {
  return `
    <div class="agents-header">
      <div>
        <div class="agents-eyebrow">SUBAGENTS</div>
        <div class="agents-heading">The Crew.</div>
      </div>
      <div id="agent-status-card"></div>
    </div>
    <div class="agents-cards" id="agent-cards"></div>
    <div id="agent-log-area"></div>
  `;
}
function renderAgents(data) {
  const act = data?.activity || {};
  const agents = (act?.agents || []).slice();
  const entries = (act?.entries || []);
  const status = data?.agent_status || { active: 0, idle: 0, dormant: 0 };
  const statusCard = document.getElementById('agent-status-card');
  if (statusCard) {
    statusCard.innerHTML = GlassCard({
      children: `
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); text-align:center;">
          <div><div style="font: 500 20px var(--font-display); color: var(--status-active)">${status.active}</div><div class="hint">Active</div></div>
          <div><div style="font: 500 20px var(--font-display); color: var(--status-idle)">${status.idle}</div><div class="hint">Idle</div></div>
          <div><div style="font: 500 20px var(--font-display); color: var(--status-dormant)">${status.dormant}</div><div class="hint">Dormant</div></div>
        </div>
      `,
      style: { padding: 'var(--space-3) var(--space-4)' }
    });
  }
  const cardsContainer = document.getElementById('agent-cards');
  if (cardsContainer) {
    const names = Object.keys(AGENT_META);
    const totalResponses = agents.reduce((s, a) => s + (a.total || 0), 0) || 1;
    cardsContainer.innerHTML = names.map(name => {
      const meta = AGENT_META[name];
      const a = agents.find(x => (x.name || '').toLowerCase() === name) || {};
      const total = a.total || 0;
      const completed = a.completed || 0;
      const successRate = total ? (completed / total) * 100 : 100;
      const successColor = successRate >= 100 ? 'var(--status-success)' : successRate >= 80 ? 'var(--status-warning)' : 'var(--status-error)';
      const loadPct = (total / totalResponses) * 100;
      const lastEntry = entries.find(e => (e.agent || '').toLowerCase() === name);
      const lastTask = lastEntry?.task || 'No recent tasks';
      const lastSeen = relativeTime(lastEntry?.created_at || a.last_seen);
      return `
        <div class="agent-card">
          <div class="agent-card-top">
            ${Badge({ text: meta.badge, color: meta.color, variant: 'solid' })}
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <span class="hint">${name === 'orchestrator' ? 'Telegram' : 'Discord'}</span>
              <span class="pulse-dot mint" style="width:8px;height:8px"></span>
            </div>
          </div>
          <div class="agent-name">${esc(name)}</div>
          <div class="agent-role">${esc(meta.role)}</div>
          <div>${ThinBar({ pct: Math.min(loadPct, 100), color: meta.color })}</div>
          <div class="agent-stats">
            <div><div class="num">${fmtNum(total)}</div><div class="lbl">Responses</div></div>
            <div><div class="num" style="color:${successColor}">${fmtPct(successRate)}</div><div class="lbl">Success</div></div>
            <div><div class="num" style="font-family:var(--font-mono);color:var(--text-muted);font-size:var(--font-size-xs)">${esc(lastEntry?.model || '—').slice(0, 10)}</div><div class="lbl">Model</div></div>
          </div>
          <div class="agent-load"><div style="width:${Math.min(loadPct, 100)}%"></div></div>
          <div class="agent-last">
            <div class="agent-last-task">↳ ${esc(lastTask)}</div>
            <div class="agent-last-ts">${lastSeen}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  const logArea = document.getElementById('agent-log-area');
  if (logArea) {
    const uniqueAgents = Array.from(new Set(entries.map(e => e.agent))).filter(Boolean).sort();
    logArea.innerHTML = `
      ${GlassCard({
        children: `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">
            <div style="font:400 var(--font-size-xs) var(--font-mono);color:var(--text-muted);letter-spacing:var(--letter-spacing-wide);text-transform:uppercase">Agent Log</div>
            <div class="log-filters" id="log-filters">
              <button class="tab active" data-filter="all">ALL</button>
              ${uniqueAgents.map(a => `<button class="tab" data-filter="${esc(a)}">${esc(a).toUpperCase()}</button>`).join('')}
            </div>
          </div>
          <div style="overflow:auto;max-height:420px">
            <table class="log-table">
              <thead><tr><th>Time</th><th>Agent</th><th>Task</th><th>Model</th><th>Status</th></tr></thead>
              <tbody id="log-tbody"></tbody>
            </table>
          </div>
        `
      })}
    `;
    renderLogRows(entries.slice(0, 50));
    const filters = logArea.querySelectorAll('#log-filters .tab');
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        const rows = entries.filter(e => f === 'all' || (e.agent || '').toLowerCase() === f);
        renderLogRows(rows.slice(0, 50));
      });
    });
  }
}
function renderLogRows(rows) {
  const tbody = document.getElementById('log-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="cell-time">${esc((r.created_at || '').slice(11,16) || '—')}</td>
      <td class="cell-agent">${esc(r.agent || '—')}</td>
      <td title="${esc(r.task)}">${esc(r.task)}</td>
      <td class="cell-model">${esc(r.model || '—')}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>
  `).join('');
}
function renderAgentsTab(data) { renderAgents(data); }

// ---------- Tasks ----------
function priorityClass(p) {
  const k = (p || '').toLowerCase();
  if (k === 'high') return 'high';
  if (k === 'medium') return 'medium';
  return 'low';
}
function priorityColor(p) {
  const k = (p || '').toLowerCase();
  if (k === 'high') return 'var(--status-error)';
  if (k === 'medium') return 'var(--status-warning)';
  return 'var(--status-active)';
}
const STATUS_FLOW = ['pending', 'in_progress', 'completed'];
function moveStatus(status, dir) {
  const idx = STATUS_FLOW.indexOf(status);
  const next = idx + dir;
  if (next < 0 || next >= STATUS_FLOW.length) return null;
  return STATUS_FLOW[next];
}
async function createTaskApi(values) {
  const res = await fetch('/api/board', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
  if (!res.ok) throw new Error('create ' + res.status);
  return res.json();
}
async function updateTaskStatus(taskId, nextStatus) {
  const res = await fetch('/api/board/update?id=' + taskId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
  if (!res.ok) throw new Error('update ' + res.status);
  return res.json();
}
async function deleteTaskApi(taskId) {
  const res = await fetch('/api/board/delete?id=' + taskId, { method: 'POST' });
  if (!res.ok) throw new Error('delete ' + res.status);
  return res.json();
}
async function fetchBoard() {
  const res = await fetch('/api/board');
  if (!res.ok) throw new Error('board fetch ' + res.status);
  return res.json();
}
async function refreshBoard() {
  try {
    const data = await fetchBoard();
    boardTasks = Array.isArray(data?.tasks) ? data.tasks : [];
  } catch (e) { boardTasks = boardTasks || []; }
}
function renderBoard() { renderTasksTab(currentData); }
function openAddModal() {
  modalState = { title: '', priority: 'medium', notes: '' };
  renderModal();
}
function closeModal() {
  modalState = null;
  renderModal();
}
function renderModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  if (!modalState) { root.innerHTML = ''; return; }
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" onclick="event.stopPropagation()">
        <div style="font:500 var(--font-size-base) var(--font-display); margin-bottom: var(--space-3)">New Task</div>
        <div class="field">
          <label>Title</label>
          <input id="task-title" value="${esc(modalState.title)}" placeholder="What needs doing?">
        </div>
        <div class="field">
          <label>Priority</label>
          <select id="task-priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea id="task-notes" placeholder="Optional context...">${esc(modalState.notes)}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" id="modal-cancel">Cancel</button>
          <button class="btn-primary" id="modal-save" style="background:var(--brand-cyan); color: var(--bg-base); border-color: var(--brand-cyan);">Save</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-cancel').onclick = closeModal;
  document.getElementById('modal-save').onclick = async () => {
    const title = document.getElementById('task-title').value.trim();
    const priority = document.getElementById('task-priority').value;
    const notes = document.getElementById('task-notes').value.trim();
    if (!title) { const el = document.getElementById('task-title'); el.style.borderColor = 'var(--status-error)'; return; }
    closeModal();
    const tempId = 'tmp_' + Date.now();
    const optimistic = { id: tempId, title, priority, notes, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    boardTasks.unshift(optimistic);
    renderBoard();
    try {
      const res = await createTaskApi({ title, priority, notes, status: 'pending' });
      const serverTask = res?.task || res;
      const idx = boardTasks.findIndex(t => t.id === tempId);
      if (idx !== -1) boardTasks[idx] = { ...boardTasks[idx], ...serverTask };
    } catch (err) {
      boardTasks = boardTasks.filter(t => t.id !== tempId);
    } finally {
      await refreshBoard();
      renderBoard();
    }
  };
  document.getElementById('modal-backdrop').onclick = (e) => { if (e.target.id === 'modal-backdrop') closeModal(); };
  setTimeout(() => document.getElementById('task-title')?.focus(), 0);
}
function taskCardHTML(task) {
  const title = esc(task.title);
  const notes = task.notes ? `<div class="task-notes">${esc(task.notes)}</div>` : '';
  const status = task.status || 'pending';
  const canForward = status !== 'completed';
  const canBack = status !== 'pending';
  return `
    <div class="task-card" data-id="${esc(task.id)}">
      <div class="task-top">
        <div class="task-title">${title}</div>
        <span class="priority-chip ${priorityClass(task.priority)}" style="color:${priorityColor(task.priority)}; border-color:${priorityColor(task.priority)}">${esc((task.priority || 'medium')).toUpperCase()}</span>
      </div>
      ${notes}
      <div class="task-footer">
        <span class="task-time">${relativeTime(task.created_at || task.updated_at)}</span>
        <div class="task-actions">
          <button class="btn-icon" data-act="back" ${canBack ? '' : 'disabled'} title="Move back">◀</button>
          <button class="btn-icon" data-act="forward" ${canForward ? '' : 'disabled'} title="Move forward">▶</button>
          <button class="btn-icon" data-act="delete" title="Delete">✕</button>
        </div>
      </div>
    </div>
  `;
}
function columnHTML(status, tasks) {
  const count = tasks.length;
  return `
    <div class="column" data-status="${status}">
      <div class="column-header">
        <span class="column-title">${status.replace('_', ' ').toUpperCase()}</span>
        ${Badge({ text: String(count), color: 'var(--brand-cyan)' })}
        ${status === 'pending' ? `<button class="btn-primary" data-add="true">+ Add task</button>` : ''}
      </div>
      <div class="cards" data-status="${status}">
        ${tasks.map(taskCardHTML).join('')}
      </div>
    </div>
  `;
}
function buildTasks() {
  const board = document.getElementById('board-root');
  if (!board) return '';
  board.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act], button[data-add]');
    if (!btn) return;
    const addBtn = btn.closest('[data-add]');
    if (addBtn) { openAddModal(); return; }
    const act = btn.dataset.act;
    const card = btn.closest('.task-card');
    const id = card?.dataset.id;
    const task = boardTasks.find(t => t.id === id);
    if (!task) return;
    if (act === 'delete') {
      card.style.opacity = '0.4'; card.style.pointerEvents = 'none';
      try { await deleteTaskApi(task.id); boardTasks = boardTasks.filter(t => t.id !== task.id); }
      catch (err) { card.style.opacity = '1'; card.style.pointerEvents = 'auto'; }
      finally { await refreshBoard(); renderBoard(); }
      return;
    }
    if (act === 'forward' || act === 'back') {
      const dir = act === 'forward' ? 1 : -1;
      const next = moveStatus(task.status, dir);
      if (!next) return;
      card.style.opacity = '0.5';
      try { await updateTaskStatus(task.id, next); task.status = next; }
      catch (err) { card.style.opacity = '1'; }
      finally { await refreshBoard(); renderBoard(); }
    }
  });
  return `
    <div class="board" id="board-root">
      ${STATUS_FLOW.map(s => columnHTML(s, boardTasks.filter(t => (t.status || 'pending') === s))).join('')}
    </div>
    <div id="modal-root"></div>
  `;
}
function renderTasksTab(data) {
  currentData = data;
  const boardRoot = document.getElementById('board-root');
  if (!boardRoot) return;
  const pending = boardTasks.filter(t => (t.status || 'pending') === 'pending');
  const inProg = boardTasks.filter(t => (t.status || 'pending') === 'in_progress');
  const done = boardTasks.filter(t => (t.status || 'pending') === 'completed');
  boardRoot.innerHTML = [pending, inProg, done].map((list, i) => {
    const s = STATUS_FLOW[i];
    return columnHTML(s, list);
  }).join('');
}

// ---------- Shell ----------
function buildShell() {
  const app = document.getElementById('app');
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.innerHTML = `
    <div class="nav-left">
      <div class="brand-mark">
        <div class="pulse-dot"></div>
        <div class="ring"></div>
      </div>
      <span class="brand-text">Hermes / ORCHESTRATOR</span>
      ${Badge({ text: 'v1.0', color: 'var(--text-muted)', variant: 'subtle' })}
    </div>
    <div class="nav-tabs">
      ${['Overview', 'Agents', 'Tasks', 'Schedule', 'Content'].map((tab, i) => `
        <button class="tab ${i === 0 ? 'active' : ''}" data-tab="${tab.toLowerCase()}">${tab}</button>
      `).join('')}
    </div>
    <div class="nav-right">
      <div class="status-pill" id="status">
        <span class="pulse-dot mint"></span>
        <span>All systems operational</span>
        <span class="clock"></span>
      </div>
    </div>
  `;
  const main = document.createElement('main');
  main.id = 'main';
  ['overview', 'agents', 'tasks', 'schedule', 'content'].forEach((tab, i) => {
    const section = document.createElement('section');
    section.id = `tab-${tab}`;
    section.className = `${i === 0 ? 'active' : ''}`;
    if (tab === 'overview') section.innerHTML = buildOverview();
    else if (tab === 'agents') section.innerHTML = buildAgents();
    else if (tab === 'tasks') section.innerHTML = buildTasks();
    else if (tab === 'schedule') section.innerHTML = buildSchedule();
    else if (tab === 'content') section.innerHTML = '<div class="placeholder">Content tab — coming soon</div>';
    else section.innerHTML = '<div class="placeholder">Panel coming soon</div>';
    main.appendChild(section);
  });
  app.appendChild(nav);
  app.appendChild(main);
  const tabButtons = nav.querySelectorAll('.tab');
  const panels = main.querySelectorAll('section');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      panels.forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'tasks') renderBoard();
    });
  });
  const clockEl = nav.querySelector('.clock');
  const tick = () => { clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false }); };
  tick();
  setInterval(tick, 1000);
}
function buildOverview() {
  return `
    <div class="overview-grid">
      ${GlassCard({
        children: `
          <div style="display:grid; grid-template-columns: 180px 1fr 1fr; gap: var(--space-5);">
            <div>
              <div style="font: 500 var(--font-size-xs) var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; margin-bottom: var(--space-2)">Agent Radar</div>
              <div id="radar-container"></div>
            </div>
            <div>
              <div style="font: 400 var(--font-size-xs) var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; margin-bottom: var(--space-1">Current Directive</div>
              <div id="directive-text" style="font: 500 var(--font-size-base) var(--font-mono); color: var(--brand-cyan); margin-bottom: var(--space-3); min-height: 1.5em;"></div>
              <div style="font: 400 var(--font-size-xs) var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; margin-bottom: var(--space-1)">Context Window</div>
              <div id="context-window"></div>
            </div>
            <div>
              <div style="font: 400 var(--font-size-xs) var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; margin-bottom: var(--space-1)">VPS Health</div>
              <div id="vps-health"></div>
              <div style="font: 400 var(--font-size-xs) var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; margin-top: var(--space-3); margin-bottom: var(--space-1)">Hermes DBs</div>
              <div id="db-footer"></div>
            </div>
          </div>
          <div class="footer-grid">
            <div class="footer-cell"><div class="hint">Queue</div><div class="num">—</div></div>
            <div class="footer-cell"><div class="hint">Sessions</div><div class="num">—</div></div>
            <div class="footer-cell"><div class="hint">Errors</div><div class="num">—</div></div>
            <div class="footer-cell"><div class="hint">Today</div><div class="num">—</div></div>
            <div class="footer-cell"><div class="hint">Uptime</div><div class="num">—</div></div>
          </div>
        `
      })}
      <div class="stats-strip" id="stats-strip"></div>
      <div class="bottom-grid">
        ${GlassCard({
          children: `
            <div style="font: 400 var(--font-size-xs) var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; margin-bottom: var(--space-2)">Throughput</div>
            <div id="throughput-container" style="height: 120px; position: relative;">
              <canvas id="throughput-canvas" style="width: 100%; height: 100%;"></canvas>
            </div>
          `
        })}
        ${GlassCard({
          children: `
            <div style="font: 400 var(--font-size-xs) var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; margin-bottom: var(--space-2)">Activity</div>
            <div id="activity-feed"></div>
          `
        })}
      </div>
    </div>
  `;
}

// ---------- Lifecycle ----------
function refresh() {
  fetch('/api/snapshot').then(r => r.json()).then(d => {
    currentData = d;
    const activeTab = document.querySelector('.tab.active')?.dataset.tab;
    if (activeTab === 'overview') renderOverview(d);
    else if (activeTab === 'agents') renderAgentsTab(d);
    else if (activeTab === 'tasks') renderBoard();
    else if (activeTab === 'schedule') renderScheduleTab(d);
  }).catch(() => {});
}
function init() {
  buildShell();
  refreshBoard().then(() => {
    refresh();
    try {
      evtSource = new EventSource('/events');
      evtSource.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          currentData = d;
          const activeTab = document.querySelector('.tab.active')?.dataset.tab;
          if (activeTab === 'overview') renderOverview(d);
          else if (activeTab === 'agents') renderAgentsTab(d);
          else if (activeTab === 'tasks') renderBoard();
        } catch (err) {}
      };
      evtSource.onerror = () => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
          statusEl.textContent = 'polling';
          statusEl.className = 'status-pill pill warn';
        }
        setTimeout(() => { evtSource?.close(); initPolling(); }, 1000);
      };
    } catch (e) { initPolling(); }
    setInterval(refreshBoard, 8000);
    refreshBoard().then(renderBoard);
  });
}
function initPolling() { refresh(); setInterval(refresh, 8000); }
init();
// ---------- Schedule ----------
function buildSchedule() {
  return `
    <div class="schedule-root">
      ${GlassCard({
        children: `
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4);">
            <div>
              <div style="font:400 var(--font-size-xs) var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; margin-bottom: var(--space-2)">HERMES Jobs</div>
              <div id="hermes-jobs" class="job-grid">
                <div class="empty-jobs">No scheduled jobs in this group.</div>
              </div>
            </div>
            <div>
              <div style="font:400 var(--font-size-xs) var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; margin-bottom: var(--space-2)">System Jobs</div>
              <div id="system-jobs" class="job-grid">
                <div class="empty-jobs">No scheduled jobs in this group.</div>
              </div>
            </div>
          </div>
        `
      })}
    </div>
  `;
}
function renderScheduleTab(data) {
  const jobs = (data?.cron?.jobs || []);
  const valid = jobs.filter(j => !j.error);
  const groups = {
    hermes: valid.filter(j => j.label === 'hermes'),
    system: valid.filter(j => j.label === 'system'),
  };
  Object.keys(groups).forEach(label => {
    const root = document.getElementById(label === 'hermes' ? 'hermes-jobs' : 'system-jobs');
    if (!root) return;
    const list = groups[label];
    if (!list.length) {
      root.innerHTML = '<div class="empty-jobs">No scheduled jobs in this group.</div>';
      return;
    }
    root.innerHTML = list.map(job => `
      ${GlassCard({
        children: `
          <div>
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-2)">
              <div style="font:500 var(--font-size-base) var(--font-display);color:var(--text-primary)">${esc(job.command.slice(0, 80))}</div>
              ${Badge({ text: label.toUpperCase(), color: label === 'hermes' ? 'var(--brand-violet)' : 'var(--text-muted)', variant: 'subtle' })}
            </div>
            <div style="font: 13px var(--font-mono); color: var(--text-primary); margin-bottom: var(--space-2); word-break: break-all; cursor: default;" title="${esc(job.command)}">${esc(job.command.slice(0, 90))}${job.command.length > 90 ? '…' : ''}</div>
            <div style="display:flex; gap: var(--space-3); margin-bottom: var(--space-1);">
              <span style="font: 500 11px var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase">SCHEDULE</span>
              <span style="font: 500 11px var(--font-mono); color: var(--brand-cyan)">${esc(job.schedule_raw)}</span>
            </div>
            <div style="display:flex; gap: var(--space-3); margin-bottom: var(--space-2);">
              <span style="font: 500 11px var(--font-mono); color: var(--text-muted); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase">NEXT RUN</span>
              <span style="font: 500 11px var(--font-mono); color: var(--text-primary)">${esc(job.schedule_human)}</span>
            </div>
            <div style="font: var(--font-size-sm) var(--font-mono); color: var(--text-muted); margin-bottom: var(--space-2);">Runs ${esc(job.schedule_human)}</div>
            <div style="font: var(--font-size-xs) var(--font-mono); color: var(--text-muted); word-break: break-all; border-top: 1px solid var(--border-glass); padding-top: var(--space-2);">Source: ${esc(job.source)}</div>
          </div>
        `
      })}
    `).join('');
  });
}
