<div align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge">
</div>

<br>

<div align="center">
  <h1>🛸 OpsCenter</h1>
  <p><strong>AI Agent Operations Dashboard</strong></p>
  <p>Real-time monitoring, task management, and operational visibility for Hermes AgentOS subagents</p>
  <p>
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-architecture">Architecture</a>
  </p>
</div>

---

## ✨ Features

- **Live Agent Monitoring** — Real-time visibility into Hermes subagent status and activity
- **Task Board** — Kanban-style task management for agent operations
- **Session Tracking** — Historical log of agent sessions and outcomes
- **Token Analytics** — Usage tracking and cost monitoring for LLM calls
- **System Health** — Server resource monitoring and alerting
- **SSE Updates** — Live streaming of agent state changes via Server-Sent Events
- **Dark-Themed UI** — Professional, easy-on-the-eyes operations interface

## 🚀 Quick Start

```bash
git clone https://github.com/OneByJorah/OpsCenter.git
cd OpsCenter
python3 server.py
```

Open **http://localhost:51763** in your browser.

> **Note:** The server uses only Python stdlib — no pip dependencies required. The `pip install -r requirements.txt` step is unnecessary.

### Using Start Script

```bash
chmod +x start.sh
./start.sh
```

## 🏗️ Architecture

```
Browser (HTML/JS) ──SSE──▶ Python Server ──▶ SQLite
                                      │
                                      ▼
                              Hermes Gateway API
```

## 📁 Project Structure

```
OpsCenter/
├── server.py              # Python backend (WebSocket + API)
├── app.js                 # Frontend application logic
├── components.js          # Reusable UI components
├── index.html             # Main dashboard page
├── tokens.css             # Token-themed styling
├── test.html              # UI test page
├── board.db               # SQLite database (auto-created)
├── backups/               # Data backup directory
├── start.sh               # Quick-start script
└── server.log             # Runtime logs
```

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main dashboard UI |
| `/api/snapshot` | GET | Full system snapshot (gateway, activity, sessions, VPS, cron, board, DBs) |
| `/events` | GET | SSE stream — pushes snapshot every 5s |
| `/api/board` | GET/POST | Task board CRUD |
| `/api/board/update?id=` | POST | Update task status/fields |
| `/api/board/delete?id=` | POST | Delete a task |
| `/api/content` | GET | List content documents |
| `/api/content/get?path=` | GET | Get content document body |
| `/api/content/save` | POST | Save/update content document |

## 🔌 Integrations

| Service | Purpose |
|---------|---------|
| **Hermes Gateway** | Agent discovery and status polling |
| **Hermes Session DB** | Session history and logs |
| **SQLite** | Persistent task storage |

## 📄 License

MIT © Jhonattan L. Jimenez

---

<div align="center">
  <p>🛸 Operations center for your AI agent fleet</p>
  <p><a href="https://github.com/OneByJorah">@OneByJorah</a></p>
</div>
