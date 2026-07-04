<div align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge">
</div>

<br>

<div align="center">
  <h1>🛸 Hermes Mission Control</h1>
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
- **WebSocket Updates** — Live streaming of agent state changes
- **Dark-Themed UI** — Professional, easy-on-the-eyes operations interface

## 🚀 Quick Start

```bash
git clone https://github.com/OneByJorah/agent-mission-control.git
cd agent-mission-control
pip install -r requirements.txt
python3 server.py
```

Open **http://localhost:8080** in your browser.

### Using Start Script

```bash
chmod +x start.sh
./start.sh
```

## 🏗️ Architecture

```
Browser (HTML/JS) ──WebSocket──▶ Python Server ──▶ SQLite
                                      │
                                      ▼
                              Hermes Gateway API
```

## 📁 Project Structure

```
agent-mission-control/
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
| `/api/agents` | GET | List active agents |
| `/api/tasks` | GET/POST | Task management |
| `/api/sessions` | GET | Session history |
| `/api/health` | GET | System health status |

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
  <p>🛸 Mission control for your AI agent fleet</p>
  <p><a href="https://github.com/OneByJorah">@OneByJorah</a></p>
</div>
