#!/usr/bin/env bash
# Oxeous startup script (macOS / Linux)
set -e

echo "================================================================"
echo "  Oxeous — Ask the Earth. See the evidence."
echo "  EUDR Compliance Platform"  
echo "================================================================"
echo ""

echo "[1/3] Starting FastAPI Backend on http://localhost:8000"
cd backend
python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!
cd ..

echo "[2/3] Starting Next.js Frontend on http://localhost:3000"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "================================================================"
echo "  FRONTEND:  http://localhost:3000"
echo "  BACKEND:   http://localhost:8000"
echo "  API DOCS:  http://localhost:8000/api/docs"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "================================================================"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait
