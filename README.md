# OpsCenter

AI agent operations dashboard — real-time monitoring, task management, and operational visibility for AI agent fleets.

![status](https://img.shields.io/badge/status-active-FFB300?style=flat-square)
![language](https://img.shields.io/badge/python+javascript-0d0d0c?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-FFB300?style=flat-square)

## Overview

OpsCenter is a self-hosted AI agent operations dashboard that provides real-time monitoring, Kanban-style task management, session tracking, token analytics, and system health visibility for AI agent fleets. Features WebSocket live updates, a dark-themed UI, and 3D fleet visualization.

## Features

- Live agent monitoring — real-time visibility into subagent status and activity
- Task board — Kanban-style task management for agent operations
- Session tracking — historical log of agent sessions and outcomes
- Token analytics — usage tracking and cost monitoring for LLM calls
- System health — server resource monitoring and alerting
- WebSocket updates — live streaming of agent state changes
- Dark-themed UI — professional operations interface
- Fleet visualization — 3D topology view of distributed agent nodes

## Architecture / Tech Stack

- **Backend**: Python 3.11+ (server.py)
- **Frontend**: JavaScript, HTML/CSS
- **Database**: SQLite
- **Real-time**: WebSocket
- **3D**: Three.js (fleet visualization)
- **Deployment**: Docker Compose, local install

## Installation

```bash
git clone https://github.com/OneByJorah/OpsCenter.git
cd OpsCenter

cp .env.example .env
pip install -r requirements.txt
python3 server.py
```

Or with Docker:
```bash
docker compose up -d
```

Open `http://localhost:8080`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Dashboard port |
| `HOST` | `0.0.0.0` | Bind address |
| `DATABASE_URL` | `./board.db` | SQLite database path |

## License

MIT — see [LICENSE](LICENSE).

---
Part of the JorahOne / J1 ecosystem — operational visibility for AI agent fleets.
