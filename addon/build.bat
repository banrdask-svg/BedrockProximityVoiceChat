@echo off
setlocal

set "ROOT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%build.ps1"

if errorlevel 1 (
  echo.
  echo Build failed.
  if /i not "%NO_PAUSE%"=="1" (
    echo Press any key to close this window.
    pause >nul
  )
  exit /b 1
)

echo.
echo Build finished.
echo Output: %ROOT%dist
if /i not "%NO_PAUSE%"=="1" (
  echo Press any key to close this window.
  pause >nul
)
endlocal
