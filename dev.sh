#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

find_available_port() {
    python3 -c "
import socket, sys
port = int(sys.argv[1])
while port <= 65535:
    try:
        s = socket.socket()
        s.bind(('', port))
        s.close()
        print(port)
        break
    except OSError:
        port += 1
else:
    print('No available port found', file=sys.stderr)
    sys.exit(1)
" "$1"
}

BACKEND_PORT=$(find_available_port 8000)
FRONTEND_PORT=$(find_available_port 5173)

export BACKEND_PORT
export FRONTEND_PORT

cleanup() {
    echo ""
    echo "Shutting down..."
    kill $(jobs -p) 2>/dev/null
    wait 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "Starting backend on port $BACKEND_PORT..."
(cd "$PROJECT_DIR/backend" && uv run uvicorn app.main:app --reload --port "$BACKEND_PORT") &
BACKEND_PID=$!

echo "Starting frontend on port $FRONTEND_PORT..."
(cd "$PROJECT_DIR/frontend" && npx vite --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

echo ""
echo "CodeShot is running!"
echo "  App:   http://localhost:$FRONTEND_PORT"
echo "  API:   http://localhost:$BACKEND_PORT/docs"
echo ""
echo "Press Ctrl+C to stop."
echo ""

wait
