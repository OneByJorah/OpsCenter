#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
exec sudo -n python3 server.py
