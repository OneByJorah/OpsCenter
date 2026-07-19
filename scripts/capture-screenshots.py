#!/usr/bin/env python3
"""Capture OpsCenter screenshots using Playwright HTML mockups.

Usage:
    python scripts/capture-screenshots.py

Prerequisites:
    pip install playwright
    python -m playwright install chromium

Screenshots are saved to docs/screenshots/ for use in the README.
"""
from playwright.sync_api import sync_playwright
import time
import os

SCREENSHOT_DIR = os.environ.get("SCREENSHOT_DIR", "docs/screenshots")

DASHBOARD_HTML = r"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpsCenter - Mission Control</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #0a0a0f; color: #e2e8f0; height: 100vh; display: flex; }
        .sidebar { width: 260px; background: #12121a; padding: 20px; border-right: 1px solid #1e1e2e; }
        .logo { font-size: 20px; font-weight: 700; color: #8b5cf6; margin-bottom: 32px; }
        .logo span { color: #e2e8f0; }
        .nav-item { padding: 12px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 12px; margin-bottom: 4px; font-size: 14px; }
        .nav-item:hover { background: #1e1e2e; }
        .nav-item.active { background: #8b5cf6; color: white; }
        .main { flex: 1; padding: 32px; overflow-y: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .header h1 { font-size: 28px; font-weight: 700; }
        .badge { background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 24px; }
        .stat-label { font-size: 13px; color: #94a3b8; margin-bottom: 8px; }
        .stat-value { font-size: 32px; font-weight: 700; }
        .stat-value.green { color: #10b981; }
        .stat-value.purple { color: #8b5cf6; }
        .stat-value.yellow { color: #f59e0b; }
        .stat-value.red { color: #ef4444; }
        .charts { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
        .chart-card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 24px; }
        .chart-title { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
        .bar-chart { display: flex; align-items: flex-end; gap: 12px; height: 160px; padding-top: 20px; }
        .bar { flex: 1; background: linear-gradient(to top, #8b5cf6, #a78bfa); border-radius: 6px 6px 0 0; position: relative; }
        .bar-label { position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%); font-size: 11px; color: #94a3b8; }
        .activity-list { list-style: none; }
        .activity-item { padding: 12px 0; border-bottom: 1px solid #1e1e2e; display: flex; justify-content: space-between; font-size: 13px; }
        .activity-time { color: #64748b; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="logo">⚡ <span>OpsCenter</span></div>
        <div class="nav-item active">📊 Dashboard</div>
        <div class="nav-item">🤖 Agents</div>
        <div class="nav-item">📋 Workflows</div>
        <div class="nav-item">📈 Analytics</div>
        <div class="nav-item">⚙️ Settings</div>
    </div>
    <div class="main">
        <div class="header">
            <h1>Mission Control</h1>
            <div class="badge">● All Systems Operational</div>
        </div>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-label">Active Agents</div>
                <div class="stat-value green">12</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tasks Completed</div>
                <div class="stat-value purple">1,847</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pending Tasks</div>
                <div class="stat-value yellow">23</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Failed Tasks</div>
                <div class="stat-value red">3</div>
            </div>
        </div>
        <div class="charts">
            <div class="chart-card">
                <div class="chart-title">Task Completion (Last 7 Days)</div>
                <div class="bar-chart">
                    <div class="bar" style="height: 60%"><div class="bar-label">Mon</div></div>
                    <div class="bar" style="height: 85%"><div class="bar-label">Tue</div></div>
                    <div class="bar" style="height: 45%"><div class="bar-label">Wed</div></div>
                    <div class="bar" style="height: 90%"><div class="bar-label">Thu</div></div>
                    <div class="bar" style="height: 70%"><div class="bar-label">Fri</div></div>
                    <div class="bar" style="height: 30%"><div class="bar-label">Sat</div></div>
                    <div class="bar" style="height: 55%"><div class="bar-label">Sun</div></div>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-title">Recent Activity</div>
                <ul class="activity-list">
                    <li class="activity-item"><span>Agent deployed</span><span class="activity-time">2m ago</span></li>
                    <li class="activity-item"><span>Task completed</span><span class="activity-time">5m ago</span></li>
                    <li class="activity-item"><span>Alert resolved</span><span class="activity-time">12m ago</span></li>
                    <li class="activity-item"><span>New workflow</span><span class="activity-time">1h ago</span></li>
                    <li class="activity-item"><span>System check</span><span class="activity-time">2h ago</span></li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>
"""

AGENTS_HTML = r"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpsCenter - Agent Management</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #0a0a0f; color: #e2e8f0; height: 100vh; display: flex; }
        .sidebar { width: 260px; background: #12121a; padding: 20px; border-right: 1px solid #1e1e2e; }
        .logo { font-size: 20px; font-weight: 700; color: #8b5cf6; margin-bottom: 32px; }
        .logo span { color: #e2e8f0; }
        .nav-item { padding: 12px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 12px; margin-bottom: 4px; font-size: 14px; }
        .nav-item:hover { background: #1e1e2e; }
        .nav-item.active { background: #8b5cf6; color: white; }
        .main { flex: 1; padding: 32px; overflow-y: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .header h1 { font-size: 28px; font-weight: 700; }
        .btn { background: #8b5cf6; color: white; padding: 10px 20px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; }
        .agent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .agent-card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 24px; }
        .agent-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .agent-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .agent-icon.blue { background: rgba(59, 130, 246, 0.2); }
        .agent-icon.green { background: rgba(16, 185, 129, 0.2); }
        .agent-icon.purple { background: rgba(139, 92, 246, 0.2); }
        .agent-icon.yellow { background: rgba(245, 158, 11, 0.2); }
        .agent-icon.red { background: rgba(239, 68, 68, 0.2); }
        .agent-icon.cyan { background: rgba(6, 182, 212, 0.2); }
        .agent-name { font-size: 16px; font-weight: 600; }
        .agent-type { font-size: 12px; color: #94a3b8; }
        .agent-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; }
        .agent-stat { text-align: center; }
        .agent-stat-value { font-size: 18px; font-weight: 700; }
        .agent-stat-label { font-size: 11px; color: #94a3b8; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-top: 12px; }
        .status-badge.online { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .status-badge.offline { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="logo">⚡ <span>OpsCenter</span></div>
        <div class="nav-item">📊 Dashboard</div>
        <div class="nav-item active">🤖 Agents</div>
        <div class="nav-item">📋 Workflows</div>
        <div class="nav-item">📈 Analytics</div>
        <div class="nav-item">⚙️ Settings</div>
    </div>
    <div class="main">
        <div class="header">
            <h1>Agent Management</h1>
            <button class="btn">+ Deploy Agent</button>
        </div>
        <div class="agent-grid">
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-icon blue">🤖</div>
                    <div>
                        <div class="agent-name">Code Reviewer</div>
                        <div class="agent-type">Code Analysis</div>
                    </div>
                </div>
                <div class="agent-stats">
                    <div class="agent-stat"><div class="agent-stat-value">156</div><div class="agent-stat-label">Tasks</div></div>
                    <div class="agent-stat"><div class="agent-stat-value">99%</div><div class="agent-stat-label">Success</div></div>
                </div>
                <div class="status-badge online">● Online</div>
            </div>
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-icon green">🔍</div>
                    <div>
                        <div class="agent-name">Security Scanner</div>
                        <div class="agent-type">Vulnerability</div>
                    </div>
                </div>
                <div class="agent-stats">
                    <div class="agent-stat"><div class="agent-stat-value">89</div><div class="agent-stat-label">Tasks</div></div>
                    <div class="agent-stat"><div class="agent-stat-value">100%</div><div class="agent-stat-label">Success</div></div>
                </div>
                <div class="status-badge online">● Online</div>
            </div>
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-icon purple">📊</div>
                    <div>
                        <div class="agent-name">Data Analyzer</div>
                        <div class="agent-type">Analytics</div>
                    </div>
                </div>
                <div class="agent-stats">
                    <div class="agent-stat"><div class="agent-stat-value">312</div><div class="agent-stat-label">Tasks</div></div>
                    <div class="agent-stat"><div class="agent-stat-value">98%</div><div class="agent-stat-label">Success</div></div>
                </div>
                <div class="status-badge online">● Online</div>
            </div>
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-icon yellow">📧</div>
                    <div>
                        <div class="agent-name">Email Sender</div>
                        <div class="agent-type">Communication</div>
                    </div>
                </div>
                <div class="agent-stats">
                    <div class="agent-stat"><div class="agent-stat-value">2,841</div><div class="agent-stat-label">Tasks</div></div>
                    <div class="agent-stat"><div class="agent-stat-value">99%</div><div class="agent-stat-label">Success</div></div>
                </div>
                <div class="status-badge online">● Online</div>
            </div>
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-icon red">🛡️</div>
                    <div>
                        <div class="agent-name">Incident Handler</div>
                        <div class="agent-type">Response</div>
                    </div>
                </div>
                <div class="agent-stats">
                    <div class="agent-stat"><div class="agent-stat-value">45</div><div class="agent-stat-label">Tasks</div></div>
                    <div class="agent-stat"><div class="agent-stat-value">97%</div><div class="agent-stat-label">Success</div></div>
                </div>
                <div class="status-badge online">● Online</div>
            </div>
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-icon cyan">🔄</div>
                    <div>
                        <div class="agent-name">Deploy Bot</div>
                        <div class="agent-type">CI/CD</div>
                    </div>
                </div>
                <div class="agent-stats">
                    <div class="agent-stat"><div class="agent-stat-value">178</div><div class="agent-stat-label">Tasks</div></div>
                    <div class="agent-stat"><div class="agent-stat-value">100%</div><div class="agent-stat-label">Success</div></div>
                </div>
                <div class="status-badge offline">● Offline</div>
            </div>
        </div>
    </div>
</body>
</html>
"""

def capture_screenshots():
    """Capture OpsCenter screenshots using HTML mockups.
    
    Note: These are representative mockups, not screenshots from the running application.
    """
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        
        # 1. Capture dashboard
        print("Capturing dashboard...")
        page.set_content(DASHBOARD_HTML)
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        page.screenshot(path=f"{SCREENSHOT_DIR}/dashboard.png", full_page=False)
        size = os.path.getsize(f"{SCREENSHOT_DIR}/dashboard.png")
        print(f"  Saved: dashboard.png ({size:,} bytes)")
        
        # 2. Capture agents
        print("Capturing agents...")
        page.set_content(AGENTS_HTML)
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        page.screenshot(path=f"{SCREENSHOT_DIR}/agents.png", full_page=False)
        size = os.path.getsize(f"{SCREENSHOT_DIR}/agents.png")
        print(f"  Saved: agents.png ({size:,} bytes)")
        
        browser.close()
    
    print(f"\nScreenshots saved to {SCREENSHOT_DIR}/")

if __name__ == "__main__":
    capture_screenshots()
