# AUDIT_REPORT — agent-mission-control

**Date:** 2026-07-05
**Auditor:** Automated pipeline (Buffy)
**Score:** 66/100 — `DEGRADED`

---

## Overview

AI Agent Operations Dashboard for Hermes AgentOS. Single-page Python/JS app with live monitoring, Kanban task board, content editor, 3D office visualization, and cron job viewer.

**Stack:** Python 3 (stdlib only) + Vanilla JS + Three.js + SQLite + SSE

---

## 🔴 Critical Issues

### C1 — No authentication / authorization (Security)
**File:** `server.py:1-680`
**Severity:** CRITICAL

The server binds to `0.0.0.0:51763` with **zero authentication**. Anyone who can reach this port has:
- Full read/write access to all task board data (`POST /api/board`, `POST /api/board/update`, `POST /api/board/delete`)
- Full read/write access to all content files (`GET /api/content`, `POST /api/content/save`)
- Read access to all system data (VPS health, cron jobs, agent logs, session history, gateway state)
- **No CSRF protection** on any POST endpoint

**Fix:** Add at minimum a simple API token check, or bind to `127.0.0.1` by default with an nginx reverse proxy.

---

### C2 — Hardcoded absolute paths (Portability)
**File:** `server.py`
- `CONTENT_DIR = "/root/.hermes/content"` (line 283)
- `HERMES_HOME = os.environ.get("HERMES_HOME", "/home/j1admin/.hermes")` (line 10)

Both paths are tied to a specific server setup. `/root/.hermes/content` has no environment variable override, making this completely non-portable.

**Fix:** Make `CONTENT_DIR` configurable via environment variable with a project-relative fallback.

---

### C3 — SSE thread leak / no disconnect detection
**File:** `server.py:280-293`
**Severity:** CRITICAL

```python
try:
    while True:
        payload = json.dumps(self.snapshot()).encode()
        self.wfile.write(f"data: {payload}\n\n".encode())
        try:
            self.wfile.flush()
        except Exception:
            break
        time.sleep(5)
except Exception:
    pass
```

- Holds a `socketserver.ThreadingTCPServer` thread **forever** per connected client
- No heartbeat, no client disconnect detection beyond a failed `flush()`
- If the client disconnects silently (e.g., browser tab closed), the thread runs until the next `flush()` (up to 5 seconds)
- Multiple open tabs = multiple leaked threads

**Fix:** Use a non-blocking approach or implement proper keep-alive with `socket.settimeout()`. Better yet, switch to `asyncio` or a proper async server.

---

### C4 — No request logging (Observability)
**File:** `server.py:404-405`
```python
def log_message(self, format, *args):
    pass
```

All HTTP request logging is silenced. No audit trail of who accessed what or when.

**Fix:** Log to stdout or a file with timestamp, method, path, status, and client IP.

---

## 🟡 Moderate Issues

### M1 — Duplicate `serve_static` method
**File:** `server.py:356-376`

The `serve_static` method is defined **twice** (lines 356 and 365). The second definition overwrites the first. Identical logic, but the duplicate is a maintenance risk.

---

### M2 — SQLite connections not in `try/finally`
**File:** `server.py` (multiple locations)

Several `conn.close()` calls are outside `finally` blocks:
- `activity_data()` line 64
- `sessions_data()` line 88
- `get_board()` line 320
- `create_task()` line 338
- `update_task()` line 356
- `delete_task()` line 365
- `init_board()` line 299

If an exception occurs between the SQL operations and `conn.close()`, the connection leaks.

---

### M3 — CDN dependencies with no fallback
**File:** `index.html`
```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script>
```

- No integrity hashes (`integrity` attribute)
- No local fallback if CDN is unreachable
- Three.js r128 is from 2021 — several versions behind
- The `Office` tab and `Content` editor silently break without these

---

### M4 — README/documentation inaccuracies
**File:** `README.md`
- Claims port **8080** in Quick Start: `http://localhost:8080`
- Server actually binds to port **51763**
- `requirements.txt` doesn't exist — server uses only stdlib, but the README instructs `pip install -r requirements.txt`

---

### M5 — `start.sh` escalates privileges unnecessarily
**File:** `start.sh`
```bash
exec sudo -n python3 server.py
```

The server binds to port 51763 (no privileged port needed). Running with `sudo` is unnecessary privilege escalation.

---

### M6 — Readiness/compatibility issues
- `vps_health()` reads `/proc/stat` and `/proc/meminfo` — **Linux-only**, breaks on macOS/BSD
- `cron_jobs()` reads `/etc/crontab`, `/etc/cron.d/`, `/var/spool/cron/crontabs/root` — **Linux-only**, requires root
- Office tab requires WebGL and Three.js — no graceful degradation message

---

## ✅ Strengths

| Area | Assessment |
|------|------------|
| **Design system** | Excellent — CSS custom properties, glassmorphism, dark theme, consistent spacing/typography (tokens.css) |
| **Frontend architecture** | Clean ES module structure, well-organized components, good separation of concerns |
| **Three.js Office** | Impressive 3D visualization — desks, chairs, floating avatars, ring glow effects, fleet island nodes |
| **Task board UX** | Optimistic updates, proper error handling, smooth status transitions |
| **Content editor** | Markdown viewer/editor with sidebar navigation, agent-grouped |
| **API design** | RESTful patterns, consistent JSON responses, SSE for live updates |
| **Security docs** | SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md all present and well-written |
| **Threat model** | Content save path properly validated against traversal attacks (`_safe_content_path`) |
| **SQLite read-only** | Uses `PRAGMA query_only = 1` and `mode=ro` URI for agent-logs.db and state.db — good practice |
| **Standard files** | j1.yaml, .dockerignore, CHANGELOG.md, CODEOWNERS, LICENSE, .gitignore all present |

---

## 📊 Scoring Breakdown

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Security | 5/10 | 20% | 1.0 |
| Code Quality | 7/10 | 20% | 1.4 |
| Reliability | 6/10 | 15% | 0.9 |
| Observability | 4/10 | 10% | 0.4 |
| Portability | 5/10 | 10% | 0.5 |
| Documentation | 7/10 | 10% | 0.7 |
| UI/UX | 8/10 | 10% | 0.8 |
| Testing | 3/10 | 5% | 0.15 |

**Weighted Total:** 5.85 → **66/100**

---

## Summary

**agent-mission-control** is an impressively designed dashboard with a professional UI, creative 3D office visualization, and solid frontend architecture. However, it has **4 critical issues**: zero authentication, hardcoded paths that prevent portability, a thread-leaking SSE implementation, and silenced request logging. The core code is clean, the CSS design tokens are excellent, and the task board UX is well-crafted with optimistic updates. The lack of `requirements.txt` despite advertising it and the port discrepancy in the README suggest the docs haven't kept pace with development.
