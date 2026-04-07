#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo ""
    echo "Shutting down..."
    kill $(jobs -p) 2>/dev/null
    wait 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "Starting backend..."
(cd "$PROJECT_DIR/backend" && uv run uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

echo "Starting frontend..."
(cd "$PROJECT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "CodeShot is running!"
echo "  App:   http://localhost:5173"
echo "  API:   http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop."
echo ""

wait
