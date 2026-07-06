# INTENT.md — J1-PIPELINE Phase -1 (ORACLE)

**Repository:** `OneByJorah/agent-mission-control`
**Analysis Date:** 2026-07-05
**Analyst:** J1-PIPELINE ORACLE (read-only)
**Status:** Intent Reconstructed

---

## What This System Does

**Hermes Mission Control** is a real-time AI Agent Operations Dashboard — a web-based monitoring, task management, and observability interface for the Hermes AgentOS subagent fleet. It is the operational window into the J1-FLEET agent orchestration system.

### Technical Role

A single-file Python HTTP server (`server.py`, 661 lines, pure stdlib) serves a dark-themed single-page application (`app.js`, 1601 lines) with six operational tabs:

| Tab | Function |
|-----|----------|
| **Overview** | Agent radar chart, current directive ticker, context window (agent load bars), VPS health (CPU/memory/disk), Hermes DB sizes, throughput sparkline, activity feed, and a footer strip (queue, sessions, errors, today's count, uptime) |
| **Agents** | Per-agent cards (orchestrator, analyst, writer, marketer, coder) showing task counts, success rates, last-seen model, last task, and a filterable agent log table |
| **Tasks** | Kanban board (pending / in-progress / completed) with CRUD operations, priority tagging, optimistic UI updates, and modal task creation |
| **Schedule** | Cron job viewer — reads `/etc/crontab`, `/etc/cron.d/`, and `/var/spool/cron/crontabs/root` with human-readable schedule translations |
| **Content** | Markdown document browser/editor for agent-generated content under `/root/.hermes/content/`, organized by agent, with inline editing and `marked` rendering |
| **Office** | Three.js 3D scene with agent avatars at desks (status orbs, screen glow, floating animation) and a fleet islands map (Homelab, VIDE STT, VIDE STX) with animated data pulse wires |

### Operational Role

The dashboard is consumed by **human operators** managing the Hermes AgentOS fleet. It replaces raw SQLite queries and SSH sessions with a real-time, visual operations interface. It is read-only toward Hermes internal databases (state.db, agent-logs.db, kanban.db) and read-write only to its own project-local task board (board.db).

### Architecture

```
Browser (HTML/JS + Three.js) ──SSE──▶ Python HTTP Server ──▶ board.db (local SQLite)
                                            │
                                            ▼
                                    Hermes Gateway API
                                    (gateway_state.json,
                                     agent-logs.db,
                                     state.db,
                                     kanban.db)
```

- **Backend:** Pure Python 3.10+ stdlib — `http.server.BaseHTTPRequestHandler` + `socketserver.ThreadingTCPServer`. No framework dependencies.
- **Frontend:** Vanilla JavaScript with modular components (`components.js`), CSS design tokens (`tokens.css`), Three.js (CDN) for 3D, `marked` (CDN) for markdown rendering.
- **Data:** Read-only SQLite connections via URI-mode `?mode=ro` + `PRAGMA query_only = 1` to Hermes internal DBs. Read-write to project-local `board.db`.
- **Port:** 51763, binds `0.0.0.0` (changed from `127.0.0.1` in v1.0 → `0.0.0.0` in v1.1).
- **Real-time:** Server-Sent Events at `/events` pushes full snapshot every 5 seconds. Polling fallback every 8 seconds.

### API Surface

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main dashboard UI (index.html) |
| `/api/snapshot` | GET | Full system snapshot (gateway, activity, sessions, VPS, cron, board, DBs) |
| `/events` | GET | SSE stream — pushes snapshot every 5s |
| `/api/board` | GET/POST | Task board CRUD |
| `/api/board/update?id=` | POST | Update task status/fields |
| `/api/board/delete?id=` | POST | Delete a task |
| `/api/content` | GET | List content documents |
| `/api/content/get?path=` | GET | Get content document body |
| `/api/content/save` | POST | Save/update content document |

---

## Why This Was Built

### Real Problem

Hermes AgentOS is a multi-agent orchestration system that spawns and manages subagents (orchestrator, analyst, writer, marketer, coder) across platforms (Telegram, Discord). These agents operate autonomously — routing tasks, researching domains, drafting content, writing code, and managing deployments. **There was no operational visibility into what the agent fleet was doing.**

Without Mission Control, operators had to:
- SSH into the server and query SQLite databases manually
- Parse raw `gateway_state.json` to check agent status
- Have no real-time view of task progress or agent health
- No centralized task management tied to agent operations
- No way to quickly assess system resource usage alongside agent activity

### Why Existing Tools Were Insufficient

- **Generic monitoring tools** (Grafana, Prometheus) require instrumentation, exporters, and configuration — overkill for a single-server agent orchestration system, and they don't understand Hermes-specific data models (agent logs, session tokens, gateway state).
- **SQLite CLI** is the raw interface but provides no visualization, no real-time updates, and no multi-user access.
- **Hermes CLI** is command-line only — no dashboard, no persistent task board, no 3D spatial representation of the agent fleet.
- **No existing tool** could read Hermes internal databases (`state.db`, `agent-logs.db`, `kanban.db`) and present them in a unified, real-time, dark-themed operations interface.

### What Triggered Development

Development began around **June 21, 2026** (earliest backup timestamps show v1.0 iterations). The initial git commit (`40e031f`, 2026-07-03) was already tagged **v1.1**, indicating ~2 weeks of pre-git iteration. The trigger was the operational gap created by deploying Hermes AgentOS in production — once agents were running autonomously, the need for a dashboard became immediate.

The repo was built rapidly to fill this gap, with 9+ backup snapshots in the first 24 hours of development (June 21), followed by a security audit (July 5) that redacted a hardcoded Tailscale IP and sanitized paths.

### Ecosystem Fit

`agent-mission-control` is the **observability layer** of the J1-FLEET / Hermes AgentOS ecosystem:

```
J1-FLEET (orchestration infrastructure)
    └── Hermes AgentOS (agent runtime, gateway, session management)
            └── agent-mission-control (operations dashboard)
                    ├── gateway_state.json — Gateway process state
                    ├── agent-logs.db — Agent execution logs
                    ├── state.db — Session & token usage
                    ├── kanban.db — Kanban state (read-only)
                    └── /root/.hermes/content/ — Agent-generated docs
```

The 3D Office tab's fleet islands (Homelab in St. Thomas as primary, VIDE STT in St. Thomas as district, VIDE STX in St. Croix as district) with animated data pulse wires reflects the broader J1 infrastructure topology — connecting agent operations to physical site locations across the US Virgin Islands.

Agent platform mapping (from code):
- **Orchestrator** → Telegram
- **Analyst, Writer, Marketer, Coder** → Discord

---

## Operational Classification

**Classification: PRODUCTION**

Evidence:
- Live operations dashboard serving real-time data from a production Hermes AgentOS deployment
- Runs on port 51763, binds all interfaces (`0.0.0.0`)
- Started via `sudo` on boot (`start.sh`)
- Has a security audit in git history (commit `2f676a7` — redacted hardcoded Tailscale IP)
- Has CodeQL CI/CD workflow configured
- Has Dependabot configured for dependency updates
- Has issue templates, PR template, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY policy
- MIT License with copyright assigned to Jhonattan L. Jimenez
- Version-labeled (v1.0 → v1.1) with structured backup history

**Secondary classifications:** Observability (core purpose is monitoring), Automation (task board + content management)

---

## Key Architectural Decisions

1. **Zero external dependencies** — The Python backend uses only stdlib (`http.server`, `sqlite3`, `json`, `socketserver`). No pip install required beyond what the OS provides. This was intentional for deployment simplicity.

2. **Read-only access to Hermes internals** — Uses SQLite URI-mode `?mode=ro` with `PRAGMA query_only = 1` to prevent accidental writes to Hermes databases. The only writable database is the project-local `board.db`.

3. **SSE over WebSocket** — Uses Server-Sent Events (simpler, unidirectional) rather than WebSocket (bidirectional) since the dashboard is read-only from the server's perspective. SSE is natively supported by browsers and requires no special client library.

4. **Design token system** — `tokens.css` provides a complete design system (colors, spacing, typography, radii, blur, transitions) enabling consistent theming without a CSS framework. Agent-specific colors are defined as CSS custom properties.

5. **3D visualization** — Three.js for the Office tab provides spatial intuition about agent fleet topology, going beyond traditional flat dashboards. Includes interactive agent selection, WASD camera controls, auto-rotate, and fleet island pulse animations.

6. **Path traversal protection** — Content file access validates paths against `CONTENT_DIR` to prevent directory traversal attacks (`_safe_content_path` function).

7. **Optimistic UI** — The task board updates the UI immediately on user action, then reconciles with the server response. Failed operations roll back the optimistic update.

8. **BIND change from 127.0.0.1 to 0.0.0.0** — v1.0 bound to localhost only; v1.1 changed to all interfaces. This was likely to allow access from other machines on the network/VPN but has security implications.

---

## Repository Structure

```
agent-mission-control/
├── server.py              # Python backend (661 lines) — HTTP + SSE + API + DB
├── app.js                 # Frontend application (1601 lines) — UI logic + 3D
├── components.js          # Reusable UI components (50 lines)
├── index.html             # Main dashboard page (423 lines) — inline CSS + CDN scripts
├── tokens.css             # Design token system (59 lines)
├── test.html              # API diagnostic test page (basic connectivity check)
├── board.db               # SQLite task database (auto-created, seeded with 8 tasks)
├── server.log             # Runtime logs (currently empty)
├── start.sh               # Quick-start script (sudo -n python3 server.py)
├── backups/               # Historical backups (v1.0 → v1.1 iterations, June 21 - July 3)
│   ├── server_v1.0_*.py   # 9 backup versions of server.py
│   ├── app_v1.0_*.js      # 2 backup versions of app.js
│   ├── app_v1.1_*.js      # 2 backup versions of app.js (v1.1)
│   ├── index_v1.0_*.html  # 8 backup versions of index.html
│   └── index_v1.1_*.html  # 1 backup version of index.html (v1.1)
├── .github/
│   ├── workflows/codeql.yml          # CodeQL security analysis
│   ├── dependabot.yml                # Dependency update config (pip, npm, docker, actions)
│   ├── ISSUE_TEMPLATE/bug_report.md
│   ├── ISSUE_TEMPLATE/feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── CODE_OF_CONDUCT.md    # Contributor Covenant v2.1
├── CONTRIBUTING.md       # Standard JorahOne contributing guide
├── SECURITY.md            # 90-day disclosure policy, report to j1admin@onebyjorah.com
├── LICENSE                # MIT, Copyright (c) 2026 Jhonattan L. Jimenez
├── .gitignore             # Standard Python/JS/IDE/OS ignores
└── README.md              # Branded as "Hermes Mission Control"
```

---

## Commit History

| Hash | Date | Message |
|------|------|---------|
| `5c77f83` | 2026-07-05 | audit(agent-mission-control): sanitize paths, emails, and gitignore |
| `2f676a7` | 2026-07-05 | security: redact hardcoded Tailscale IP |
| `ad3c460` | 2026-07-04 | Apply ruff auto-fixes and portfolio standardization |
| `ff0ca78` | 2026-07-04 | docs: align README to J1 brand standard |
| `40e031f` | 2026-07-03 | feat: initial mission control dashboard v1.1 |

The initial commit was already v1.1, indicating pre-git development (backups show v1.0 iterations starting June 21). The security audit on July 5 redacted a hardcoded Tailscale IP — a positive maturity signal.

---

## Notes

### Documentation Gaps
- **No `requirements.txt`** — README says `pip install -r requirements.txt` but no such file exists. The server uses only stdlib so this is a documentation issue, not a runtime blocker.
- **No `docs/` directory** — No setup procedures, troubleshooting guides, or integration documentation beyond the README.
- **No test files** — No test framework, no test suite. `test.html` is a basic API connectivity check, not a proper test.

### Config Drift
- **Dependabot ecosystem mismatch** — Configured for `npm` and `docker` ecosystems, but no `package.json` or `Dockerfile` exists in the repo. These are template vestiges.
- **CodeQL TypeScript target** — CodeQL workflow includes `typescript` in the language matrix, but no TypeScript files exist in the repo.

### Code Quality Issues
- **Duplicated `serve_static` method** — Defined twice in `server.py` (lines 578 and 590), identical code. Copy-paste artifact.
- **Hardcoded paths** — `HERMES_HOME` defaults to `/home/j1admin/.hermes`, `CONTENT_DIR` to `/root/.hermes/content`. These are environment-specific and may not be portable across deployments.
- **`start.sh` uses `sudo -n`** — Requires passwordless sudo, which is a security consideration.

### Security Observations
- **No authentication** — The dashboard has no login, auth, or access control. Anyone who can reach port 51763 can read Hermes operational data and modify the task board.
- **Binds `0.0.0.0`** — Exposed to all network interfaces (changed from `127.0.0.1` in v1.0). Relies on network-level security (firewall, VPN) for protection.
- **No HTTPS** — Plain HTTP. All data (including content edits) transmitted in cleartext.
- **Security audit present** — Commit `2f676a7` redacted a hardcoded Tailscale IP, indicating security-conscious development.

### Backup Timeline
The `backups/` directory reveals the development cadence:
- **June 21, 2026** — 9 server.py + 8 index.html + 2 app.js backups in a single day (v1.0 rapid iteration)
- **June 21, 2026 (later)** — v1.1 snapshots (server, app, index)
- **July 3, 2026** — Pre-3D app.js backup (before Three.js Office tab was added)
- This suggests the dashboard was built in ~2 weeks with intense initial development followed by feature additions (3D Office, content management)
