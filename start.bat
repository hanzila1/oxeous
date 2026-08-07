@echo off
echo ================================================================
echo   Oxeous — Ask the Earth. See the evidence.
echo   EUDR Compliance Platform
echo ================================================================
echo.

REM Refresh PATH for Node (in case just installed)
SET "PATH=%PATH%;C:\Program Files\nodejs"

echo [1/3] Checking dependencies...
python --version >nul 2>&1 || (echo ERROR: Python not found && pause && exit /b 1)
node --version   >nul 2>&1 || (echo ERROR: Node.js not found && pause && exit /b 1)
echo     Python: OK
echo     Node:   OK

echo.
echo [2/3] Starting FastAPI Backend on http://localhost:8000
echo       API docs at http://localhost:8000/api/docs
start "Oxeous Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

echo.
echo [3/3] Starting Next.js Frontend on http://localhost:3000
timeout /t 3 /nobreak >nul
start "Oxeous Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================================================
echo   Both servers are starting...
echo.
echo   FRONTEND:  http://localhost:3000
echo   BACKEND:   http://localhost:8000
echo   API DOCS:  http://localhost:8000/api/docs
echo.
echo   NOTE: Granite/LLM features need Ollama running:
echo     1. Download from https://ollama.com
echo     2. Run:  ollama pull granite3-8b
echo     3. Run:  ollama serve
echo.
echo   EUDR features (Hansen GFC, ESA WorldCover) work without any
echo   API keys - data is fetched from public COG endpoints.
echo ================================================================
pause
