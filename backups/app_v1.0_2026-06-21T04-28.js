import {
  GlassCard,
  Badge,
  StatCard,
  ProgressBar,
} from './components.js';

const API = location.origin;
let evtSource = null;
let currentData = null;

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

// ---------- Radar ----------
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

// ---------- Directive ----------
let dirIndex = 0;
function renderDirective(container, activity) {
  if (!container) return;
  const entries = (activity?.entries || []).slice(0, 12);
  if (!entries.length) {
    container.innerHTML = Badge({ text: 'Awaiting logs', color: 'var(--text-muted)' });
    return;
  }
  const text = entries[dirIndex % entries.length];
  dirIndex++;
  container.innerHTML = `${esc(text.agent || '?')} · ${esc(text.task || '—')}`;
}

// ---------- Context Window ----------
function renderContext(container, activity) {
  if (!container) return;
  const agents = activity?.agents || [];
  if (!agents.length) {
    container.innerHTML = '<div class="hint">No agent data</div>';
    return;
  }
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

// ---------- VPS Health ----------
function renderVpsHealth(container, vps) {
  if (!container) return;
  if (!vps || vps.error) {
    container.innerHTML = Badge({ text: v && v.error || 'unavailable', color: 'var(--status-error)' });
    return;
  }
  const cpuColor = vps.cpu_percent > 85 ? 'var(--status-error)' : vps.cpu_percent > 70 ? 'var(--status-warning)' : 'var(--brand-cyan)';
  const memColor = vps.memory.percent > 85 ? 'var(--status-error)' : vps.memory.percent > 70 ? 'var(--status-warning)' : 'var(--brand-cyan)';
  const diskColor = vps.disk.percent > 85 ? 'var(--status-error)' : vps.disk.percent > 70 ? 'var(--status-warning)' : 'var(--brand-cyan)';
  container.innerHTML = `
    <div style="margin-bottom:var(--space-2)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span>CPU</span><strong class="num">${fmtPct(vps.cpu_percent)}</strong>
      </div>
      ${ProgressBar({ pct: vps.cpu_percent, color: cpuColor })}
    </div>
    <div style="margin-bottom:var(--space-2)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span>Memory</span><span class="num">${vps.memory.used_human} / ${vps.memory.total_human}</span>
      </div>
      ${ProgressBar({ pct: vps.memory.percent, color: memColor })}
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span>Disk</span><span class="num">${vps.disk.used_human} / ${vps.disk.total_human}</span>
      </div>
      ${ProgressBar({ pct: vps.disk.percent, color: diskColor })}
    </div>
  `;
}

// ---------- DB Footer ----------
function renderDbFooter(container, dbs) {
  if (!container) return;
  const total = dbs?.total_human || '—';
  container.innerHTML = `<div class="hint">Total ${total}</div>`;
}

// ---------- Dashboard Footer ----------
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

// ---------- Stats Strip ----------
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

// ---------- Sparkline / Throughput ----------
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

// ---------- Activity Feed ----------
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

// ---------- Main Render ----------
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

function refresh() {
  fetch('/api/snapshot').then(r => r.json()).then(d => renderOverview(d)).catch(() => {});
}

function init() {
  refresh();
  try {
    evtSource = new EventSource('/events');
    evtSource.onmessage = (e) => {
      try { renderOverview(JSON.parse(e.data)); } catch (err) {}
    };
    evtSource.onerror = () => {
      document.getElementById('status').textContent = 'polling';
      document.getElementById('status').className = 'pill warn';
      setTimeout(() => {
        evtSource?.close();
        initPolling();
      }, 1000);
    };
  } catch (e) {
    initPolling();
  }
}

function initPolling() {
  refresh();
  setInterval(refresh, 8000);
}

init();
