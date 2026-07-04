# agent-mission-control

**Version:** v1.1  
**Status:** Production Ready  
**License:** MIT  

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

agent-mission-control is the J1 Hermes Mission Control dashboard — a unified read-only and lightweight interactive interface for live ops, agent logs, and task board management. It surfaces platform status, agent activity, VPS health, database diagnostics, session telemetry, and kanban-style task tracking in a single adaptive shell.

**Core philosophy:** Single origin, full observability, no proxy overhead.

## Features

- ✅ **Live ops radar** — Agent activity distribution with real-time animated visualization
- ✅ **Agent log feed** — Filterable execution history with model attribution and task context
- ✅ **Task board** — Kanban-style board with full CRUD operations and priority chip states
- ✅ **VPS health strip** — Rolling CPU, memory, and disk utilization with threshold-aware coloring
- ✅ **Session telemetry** — Token throughput, cache hit rates, message counts, and cost status
- ✅ **Gateway state** — Active agent counts, restart requests, and exit reasons
- ✅ **Timeline activity** — Last 12 task entries with relative timestamps and status badges
- ✅ **Single-file backend** — Python microserver with SQLite persistence, no external database dependency

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MISSION CONTROL                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Agents Tab  │  │  Board Tab   │  │ Overview Tab │     │
│  │              │  │              │  │              │     │
│  │  ORCH/ANAL   │  │  PENDING     │  │  Radar       │     │
│  │  WRTR/MRKT   │  │  IN PROGRESS │  │  StatsStrip  │     │
│  │  CODR status │  │  COMPLETED   │  │  VPS Health  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  Backend: Python + SQLite                                   │
│  Frontend: Vanilla JS + adaptive shell                      │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ HERMES_HOME     │  │ board.db        │  │ state.db        │
│ gateway_state   │  │ task kanban     │  │ sessions + msgs │
│ agent-logs.db   │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Technology Stack

| Layer | Stack |
|-------|-------|
| Runtime | Linux, Python 3.11+ |
| Backend | Python `http.server`, SQLite (`board.db`, `agent-logs.db`, `state.db`) |
| Frontend | Vanilla JavaScript, adaptive shell |
| Ops I/O | Reads Hermes home directory for gateway, agent logs, and state databases |
| Styling | CSS design tokens (`tokens.css`) |
| Data | Local SQLite with read-only access patterns for logs |

## Services

| Service | Port | Endpoint | Purpose |
|---------|------|----------|---------|
| **Mission Control** | `51763` | `/` | Dashboard shell |
| **Backend** | `51763` | `/api/` | Gateway, activity, board, content, crontab telemetry |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/OneByJorah/agent-mission-control.git
cd agent-mission-control

# 2. Start the backend (uses HERMES_HOME by default)
python3 server.py

# 3. Open in browser
# http://localhost:51763
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `HERMES_HOME` | Path to Hermes instance data | `~/.hermes` |
| `PORT` | Listen port | `51763` |
| `BIND` | Bind address | `0.0.0.0` |

## Data Sources

The backend reads the following from `HERMES_HOME`:

| File | Content |
|------|---------|
| `gateway_state.json` | Active agents, platform statuses, restart requests |
| `agent-logs.db` | Task execution history, agent success rates, daily throughput |
| `state.db` | Session counts, message counts, token throughput, cost status |
| `content/*.md` | Markdown file listing with first-heading titles (read/write) |

Project-local persistence:

| File | Content |
|------|---------|
| `board.db` | Task board with title, status, priority, notes |

## Agent Roles

| Badge | Role | Transport |
|-------|------|-----------|
| ORCH | Routes tasks, manages concurrency, enforces boundaries | Telegram |
| ANAL | Researches domains, builds context packs, validates sources | — |
| WRTR | Drafts copy, edits for clarity, maintains tone guides | — |
| MRKT | Builds funnels, writes promos, tracks conversion signals | — |
| CODR | Writes production code, owns deploys, enforces standards | — |

## Roadmap

- [ ] Persistent auth or read-only mode toggle
- [ ] WebSocket push for real-time log streaming
- [ ] Export task board and activity history to JSON/CSV
- [ ] Theme presets (light / dark / J1 brand)

## License

MIT

---

*agent-mission-control is maintained by the J1 team. For enterprise support, contact J1admin.*
