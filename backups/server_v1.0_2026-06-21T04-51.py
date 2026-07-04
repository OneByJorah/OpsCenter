#!/usr/bin/env python3
import json
import os
import socketserver
import sqlite3
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
HERMES_HOME = os.environ.get("HERMES_HOME", "/home/j1admin/.hermes")
BOARD_DB = os.path.join(PROJECT_DIR, "board.db")
GATEWAY_STATE = os.path.join(HERMES_HOME, "gateway_state.json")
AGENT_LOGS = os.path.join(HERMES_HOME, "agent-logs.db")
STATE_DB = os.path.join(HERMES_HOME, "state.db")
PORT = 51763
BIND = "127.0.0.1"

os.makedirs(PROJECT_DIR, exist_ok=True)


def db_ro(path):
    try:
        conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        conn.execute("PRAGMA query_only = 1")
        return conn
    except Exception:
        return None


def safe(func, fallback=None):
    try:
        return func()
    except Exception as e:
        return {"error": str(e)} if fallback is None else fallback


def gateway_data():
    try:
        with open(GATEWAY_STATE, "r") as f:
            data = json.load(f)
        platform_statuses = {}
        for pname, pdata in data.get("platforms", {}).items():
            platform_statuses[pname] = {
                "updated_at": pdata.get("updated_at"),
                "last_error": pdata.get("last_error"),
            }
        return {
            "pid": data.get("pid"),
            "kind": data.get("kind"),
            "active_agents": data.get("active_agents", 0),
            "platforms": platform_statuses,
            "restart_requested": data.get("restart_requested", False),
            "exit_reason": data.get("exit_reason"),
            "start_time": data.get("start_time"),
            "updated_at": data.get("updated_at"),
        }
    except Exception as e:
        return {"error": str(e)}


def activity_data():
    def _run():
        conn = db_ro(AGENT_LOGS)
        if not conn:
            return {"error": "agent-logs.db unavailable"}
        c = conn.cursor()
        c.execute("SELECT id, agent_name, task_description, model_used, status, created_at FROM agent_logs ORDER BY created_at DESC, id DESC LIMIT 50")
        rows = c.fetchall()
        cols = ["id", "agent", "task", "model", "status", "created_at"]
        entries = [dict(zip(cols, r)) for r in rows]

        c.execute("""
            SELECT agent_name,
                   COUNT(*) AS total,
                   SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                   SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,
                   MAX(created_at) AS last_task,
                   MAX(created_at) AS last_seen
            FROM agent_logs
            GROUP BY agent_name
        """)
        agent_rows = c.fetchall()
        agents = [dict(zip(["name","total","completed","failed","last_task","last_seen"], r)) for r in agent_rows]

        c.execute("""
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                   SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed
            FROM agent_logs
        """)
        totals_row = c.fetchone() or (0, 0, 0)
        totals = {"total": totals_row[0], "completed": totals_row[1], "failed": totals_row[2]}

        c.execute("""
            SELECT DATE(substr(created_at,1,10)) AS day,
                   COUNT(*) AS count,
                   SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                   SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed
            FROM agent_logs
            WHERE created_at >= DATE('now','-7 days')
            GROUP BY DATE(substr(created_at,1,10))
            ORDER BY day DESC
        """)
        daily = [dict(zip(["day","count","completed","failed"], r)) for r in c.fetchall()]

        conn.close()
        return {"entries": entries, "agents": agents, "totals": totals, "daily": daily}
    return safe(_run)


def sessions_data():
    def _run():
        conn = db_ro(STATE_DB)
        if not conn:
            return {"error": "state.db unavailable"}
        c = conn.cursor()
        c.execute("""
            SELECT COUNT(DISTINCT s.id) AS session_count,
                   COUNT(m.id) AS message_count,
                   COALESCE(SUM(s.input_tokens),0), COALESCE(SUM(s.output_tokens),0),
                   COALESCE(SUM(s.cache_read_tokens),0), COALESCE(SUM(s.cache_write_tokens),0),
                   COALESCE(SUM(s.reasoning_tokens),0)
            FROM sessions s JOIN messages m ON m.session_id = s.id
        """)
        row = c.fetchone() or (0,0,0,0,0,0,0)
        totals = {
            "session_count": row[0], "message_count": row[1],
            "input_tokens": row[2], "output_tokens": row[3],
            "cache_read_tokens": row[4], "cache_write_tokens": row[5], "reasoning_tokens": row[6],
        }
        c.execute("""
            SELECT s.id, s.model, s.started_at, s.ended_at, s.message_count,
                   s.input_tokens, s.output_tokens, s.cost_status
            FROM sessions s
            ORDER BY s.started_at DESC LIMIT 25
        """)
        recent = [dict(zip(["id","model","started_at","ended_at","message_count","input_tokens","output_tokens","cost_status"], r)) for r in c.fetchall()]
        conn.close()
        return {"totals": totals, "recent_sessions": recent}
    return safe(_run)


def vps_health():
    def _run():
        def cpu_times():
            with open("/proc/stat") as f:
                parts = f.readline().split()
            vals = list(map(int, parts[1:]))
            idle = vals[3] + (vals[4] if len(vals) > 4 else 0)
            return idle, sum(vals)

        idle1, total1 = cpu_times()
        time.sleep(0.1)
        idle2, total2 = cpu_times()
        idle_d = idle2 - idle1
        total_d = total2 - total1
        cpu_pct = round((1 - idle_d / total_d) * 100, 1) if total_d > 0 else 0.0

        meminfo = {}
        with open("/proc/meminfo") as f:
            for line in f:
                if ":" in line:
                    k, v = line.split(":", 1)
                    meminfo[k.strip()] = int(v.strip().split()[0])
        mem_total = meminfo.get("MemTotal", 0)
        mem_avail = meminfo.get("MemAvailable", 0)
        mem_used = mem_total - mem_avail
        mem_pct = round(mem_used / mem_total * 100, 1) if mem_total else 0.0

        st = os.statvfs("/")
        disk_total = st.f_blocks * st.f_frsize
        disk_free = st.f_bfree * st.f_frsize
        disk_used = disk_total - disk_free
        disk_pct = round(disk_used / disk_total * 100, 1) if disk_total else 0.0

        def fmt(b):
            for u in ["B","KB","MB","GB","TB"]:
                if abs(b) < 1024:
                    return f"{b:.1f} {u}"
                b /= 1024
            return f"{b:.1f} PB"
        return {
            "cpu_percent": cpu_pct,
            "memory": {
                "total_kb": mem_total, "used_kb": mem_used, "available_kb": mem_avail, "percent": mem_pct,
                "total_human": fmt(mem_total * 1024), "used_human": fmt(mem_used * 1024),
            },
            "disk": {
                "total_bytes": disk_total, "used_bytes": disk_used, "free_bytes": disk_free, "percent": disk_pct,
                "total_human": fmt(disk_total), "used_human": fmt(disk_used), "free_human": fmt(disk_free),
            },
        }
    return safe(_run)



def db_sizes():
    def _run():
        files = [
            ("state.db", os.path.join(HERMES_HOME, "state.db")),
            ("kanban.db", os.path.join(HERMES_HOME, "kanban.db")),
            ("agent-logs.db", os.path.join(HERMES_HOME, "agent-logs.db")),
        ]
        total = 0
        items = []
        for name, path in files:
            try:
                sz = os.path.getsize(path)
                total += sz
                items.append({"name": name, "bytes": sz, "human": fmt_bytes(sz)})
            except Exception as e:
                items.append({"name": name, "bytes": 0, "human": "unavailable"})
        return {"files": items, "total_bytes": total, "total_human": fmt_bytes(total)}
    return safe(_run)

def fmt_bytes(b):
    for u in ["B","KB","MB","GB","TB"]:
        if abs(b) < 1024:
            return f"{b:.1f} {u}"
        b /= 1024
    return f"{b:.1f} PB"


def _parse_dt(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None

def _is_active(ts):
    dt = _parse_dt(ts)
    if not dt:
        return False
    return (now - dt).total_seconds() < 300

def _is_idle(ts):
    dt = _parse_dt(ts)
    if not dt:
        return False
    return (now - dt).total_seconds() < 3600

def _is_dormant(ts):
    dt = _parse_dt(ts)
    if not dt:
        return True
    return (now - dt).total_seconds() >= 3600

def _translate_schedule(parts):
    if len(parts) < 5:
        return " ".join(parts)
    minute, hour, dom, month, dow = parts[0], parts[1], parts[2], parts[3], parts[4]
    pieces = []
    if minute == "*":
        pieces.append("every minute")
    else:
        pieces.append(f"at minute {minute}")
    if hour == "*":
        pieces.append("every hour")
    else:
        pieces.append(f"hour {hour}")
    if dom != "*":
        pieces.append(f"day-of-month {dom}")
    if month != "*":
        pieces.append(f"month {month}")
    if dow != "*":
        pieces.append(f"day-of-week {dow}")
    return ", ".join(pieces)


def cron_jobs():
    def _run():
        jobs = []
        def add(source, schedule, user, cmd):
            jobs.append({
                "source": source, "user": user, "command": cmd[:120],
                "schedule_raw": " ".join(schedule),
                "schedule_human": _translate_schedule(schedule),
                "label": "system" if user == "root" else "hermes",
            })
        try:
            with open("/etc/crontab") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split()
                    if len(parts) >= 7:
                        add("/etc/crontab", parts[:5], parts[5], " ".join(parts[6:]))
        except Exception as e:
            jobs.append({"error": f"/etc/crontab: {e}"})

        try:
            for fname in sorted(os.listdir("/etc/cron.d")):
                fpath = os.path.join("/etc/cron.d", fname)
                if not os.path.isfile(fpath):
                    continue
                with open(fpath) as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        parts = line.split()
                        if len(parts) >= 6:
                            add(f"/etc/cron.d/{fname}", parts[:5], parts[5], " ".join(parts[6:]))
        except Exception as e:
            jobs.append({"error": f"/etc/cron.d: {e}"})

        try:
            with open("/var/spool/cron/crontabs/root") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split()
                    if len(parts) >= 6:
                        add("/var/spool/cron/crontabs/root", parts[:5], "root", " ".join(parts[5:]))
        except Exception as e:
            jobs.append({"error": f"/var/spool/cron/crontabs/root: {e}"})

        return {"jobs": jobs, "count": len([j for j in jobs if "error" not in j])}
    return safe(_run)


# ---------- board.db (read-write, project-local) ----------
def _board_conn():
    conn = sqlite3.connect(BOARD_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_board():
    conn = _board_conn()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT
        )
    """)
    c.execute("SELECT COUNT(*) FROM tasks")
    if c.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        seeds = [
            ("task-001", "Review agent-logs schema changes", "pending", "high", "Check if new statuses need handling", now, now),
            ("task-002", "Deploy v1.0 to production", "in_progress", "high", "Verify health checks pass", now, now),
            ("task-003", "Write API documentation", "pending", "medium", "Include rate limits", now, now),
            ("task-004", "Setup error monitoring", "pending", "medium", "Consider Sentry or similar", now, now),
            ("task-005", "Optimize snapshot query speed", "in_progress", "high", "Add indexes if needed", now, now),
            ("task-006", "Add user authentication", "pending", "low", "Research JWT vs session", now, now),
            ("task-007", "Create backup script for board.db", "completed", "medium", "Test restore procedure", now, now),
            ("task-008", "Review cron job translations", "completed", "low", "Edge cases for special schedules", now, now),
        ]
        for t in seeds:
            c.execute("INSERT INTO tasks (id,title,status,priority,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)", t)
        conn.commit()
    conn.close()


def get_board():
    def _run():
        conn = _board_conn()
        c = conn.cursor()
        c.execute("SELECT id,title,status,priority,notes,created_at,updated_at FROM tasks ORDER BY created_at DESC")
        tasks = [dict(r) for r in c.fetchall()]
        conn.close()
        return {"tasks": tasks}
    return safe(_run)


def create_task(data):
    def _run():
        import uuid
        task_id = data.get("id") or str(uuid.uuid4())[:8]
        title = data.get("title") or "Untitled"
        status = data.get("status") or "pending"
        priority = data.get("priority") or "medium"
        notes = data.get("notes") or ""
        now = datetime.now(timezone.utc).isoformat()
        conn = _board_conn()
        c = conn.cursor()
        c.execute(
            "INSERT OR REPLACE INTO tasks (id,title,status,priority,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
            (task_id, title, status, priority, notes, now, now),
        )
        conn.commit()
        conn.close()
        return {"id": task_id, "status": "created"}
    return safe(_run)


def update_task(task_id, data):
    def _run():
        allowed = {"title", "status", "priority", "notes"}
        updates = {k: v for k, v in data.items() if k in allowed}
        if not updates:
            return {"error": "No valid fields to update"}
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [task_id]
        conn = _board_conn()
        c = conn.cursor()
        c.execute(f"UPDATE tasks SET {set_clause} WHERE id = ?", values)
        conn.commit()
        changed = c.rowcount
        conn.close()
        return {"rows_affected": changed}
    return safe(_run)


def delete_task(task_id):
    def _run():
        conn = _board_conn()
        c = conn.cursor()
        c.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        changed = c.rowcount
        conn.close()
        return {"rows_affected": changed}
    return safe(_run)


# ---------- legacy aliases ----------
def boards_list():
    return get_board()

def boards_create(data):
    return create_task(data)

def boards_update(task_id, data):
    return update_task(task_id, data)

def boards_delete(task_id):
    return delete_task(task_id)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        static_map = {
            "/components.js": "application/javascript; charset=utf-8",
            "/app.js": "application/javascript; charset=utf-8",
            "/tokens.css": "text/css; charset=utf-8",
        }
        if self.path in static_map:
            self.serve_static(os.path.join(PROJECT_DIR, self.path.lstrip("/")), static_map[self.path])
            return
        if self.path == "/":
            try:
                with open(os.path.join(PROJECT_DIR, "index.html"), "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_error(500, f"index.html missing: {e}")
        elif self.path == "/tokens.css":
            self.serve_static(os.path.join(PROJECT_DIR, "tokens.css"), "text/css; charset=utf-8")
        elif self.path == "/api/snapshot":
            payload = json.dumps(self.snapshot()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        elif self.path == "/events":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
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
        elif self.path == "/api/board":
            self._send_json(get_board())
        else:
            self.send_error(404)

    def serve_static(self, path, ctype):
        try:
            with open(path, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(404, str(e))

    def serve_static(self, path, ctype):
        try:
            with open(path, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(404, str(e))

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b""
        data = json.loads(body) if body else {}
        if self.path.startswith("/api/board/update?id="):
            task_id = self.path.split("=", 1)[1]
            self._send_json(update_task(task_id, data))
        elif self.path.startswith("/api/board/delete?id="):
            task_id = self.path.split("=", 1)[1]
            self._send_json(delete_task(task_id))
        elif self.path == "/api/board":
            self._send_json(create_task(data))
        else:
            self.send_error(404)

    def _send_json(self, obj):
        payload = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def snapshot(self):
        now = datetime.now(timezone.utc).isoformat()
        def agent_status_counts():
            act = safe(activity_data) or {}
            agents = act.get("agents", [])
            active = sum(1 for a in agents if _is_active(a.get("last_seen")))
            idle = sum(1 for a in agents if _is_idle(a.get("last_seen")))
            dormant = sum(1 for a in agents if _is_dormant(a.get("last_seen")))
            return {"active": active, "idle": idle, "dormant": dormant}
        return {
            "t": now,
            "gateway": safe(gateway_data),
            "activity": safe(activity_data),
            "sessions": safe(sessions_data),
            "vps": safe(vps_health),
            "cron": safe(cron_jobs),
            "board": safe(get_board),
            "dbs": safe(db_sizes),
            "agent_status": safe(agent_status_counts),
        }

    def log_message(self, format, *args):
        pass


def run():
    init_board()
    with socketserver.TCPServer((BIND, PORT), Handler) as httpd:
        print(f"Serving http://{BIND}:{PORT}")
        httpd.serve_forever()


if __name__ == "__main__":
    run()
