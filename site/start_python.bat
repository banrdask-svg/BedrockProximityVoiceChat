@echo off
cd /d "%~dp0"
py -3.13 start.py
if errorlevel 1 (
  echo.
  echo Python 3.13 launcher failed. Trying "python" from PATH...
  python start.py
)
