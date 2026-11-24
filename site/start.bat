@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not added to PATH.
  echo Install Node.js 18+ from https://nodejs.org/
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing site dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

for /f "usebackq delims=" %%p in (`node -p "require('./config.json').port || 3000"`) do set "VOICE_PORT=%%p"

echo.
echo Starting Proximity Voice site...
echo Local URL: http://127.0.0.1:%VOICE_PORT%
echo Keep this window open while the server is running.
echo.
start "" "http://127.0.0.1:%VOICE_PORT%"

node server.js
echo.
echo Site stopped or failed to start.
pause
