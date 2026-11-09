@echo off
rem The real bridge: receives the S7-1200 packets and publishes them. Ctrl+C to stop.
rem Add -v after bridge.py to log every packet.
call "%~dp0config.bat"
call "%~dp0_python.bat"
if errorlevel 1 (
  pause
  exit /b 1
)
"%PY_EXE%" %PY_ARGS% "%~dp0bridge.py"
pause
