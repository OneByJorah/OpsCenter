# =============================================================================
# Agent Mission Control — Hermes Mission Control Dashboard
# JorahOne
#
# Self-contained Python HTTP server with HTML/JS frontend.
# Uses only Python stdlib — no pip dependencies required.
# =============================================================================
FROM python:3.11-alpine

WORKDIR /app

# Copy application files
COPY server.py .
COPY index.html .
COPY app.js .
COPY components.js .
COPY tokens.css .
COPY start.sh .

# Create content directory for markdown files
RUN mkdir -p content

EXPOSE 51763

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-51763}/api/health', timeout=5)" || exit 1

CMD ["python3", "server.py"]
