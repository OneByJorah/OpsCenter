<div align="center">

![OpsCenter banner](docs/assets/banner.svg)

# OpsCenter

AI agent operations dashboard

![License](https://img.shields.io/badge/license-MIT-brightgreen)
![Language](https://img.shields.io/badge/language-Python-blue)
</div>

---

<p align="center">
  <img src="docs/assets/demo.gif" alt="OpsCenter preview" width="90%">
</p>

<br>

---

## Features

- **Live Agent Monitoring** — Real-time visibility into subagent status and activity.
- **Task Board** — Kanban-style task management for agent operations.
- **Session Tracking** — Historical log of agent sessions and outcomes.
- **Token Analytics** — Usage tracking and cost monitoring for LLM calls.
- **System Health** — Server resource monitoring and alerting.
- **WebSocket Updates** — Live streaming of agent state changes.
- **Dark-Themed UI** — Professional, easy-on-the-eyes operations interface.
- **Fleet Visualization** — 3D topology view of distributed agent nodes.

## Quick Start

```bash
git clone https://github.com/OneByJorah/OpsCenter.git
cd OpsCenter
cp .env.example .env
pip install -r requirements.txt
python3 server.py
```

Open **http://localhost:8080** in your browser.

### Using the Start Script

```bash
chmod +x start.sh
./start.sh
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Dashboard server port |
| `BIND` | `127.0.0.1` | Server bind address |
| `HERMES_HOME` | `../.hermes` | Path to the Hermes agent home directory |
| `MISSION_CONTROL_API_KEY` | *(empty)* | API key for protecting dashboard endpoints |
| `CONTENT_DIR` | `../.hermes/content` | Content directory for the editor |

## Architecture

```
Browser (HTML/JS) ──WebSocket──▶ Python Server ──▶ SQLite
                                      │
                                      ▼
                              Agent Gateway API
```

## Project Structure

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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main dashboard UI |
| `/api/agents` | GET | List active agents |
| `/api/tasks` | GET/POST | Task management |
| `/api/sessions` | GET | Session history |
| `/api/health` | GET | System health status |

## Development

```bash
pip install -r requirements.txt

# Run the server
python3 server.py

# Run the UI test page
python3 -m http.server 8081
```

## Deployment

OpsCenter ships with a Dockerfile and docker-compose configuration for self-hosting.

```bash
docker compose up -d
```

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.

## Security

For security concerns, see [SECURITY.md](SECURITY.md). Please report vulnerabilities to **info@jorahone.com** — do not use public issues.

## License

MIT © Jhonattan L. Jimenez

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## 🔒 Security

Found a vulnerability? Please follow our [Security Policy](SECURITY.md) and report privately to `security@jorahone.com`.

## 📄 License

[MIT License](LICENSE) © Jhonattan L. Jimenez (OneByJorah)

---

<p align="center">Built with 🌴 by <a href="https://github.com/OneByJorah">OneByJorah</a> · <a href="https://jorahone.com">jorahone.com</a></p>
