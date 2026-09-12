@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-local-tests.ps1" %*
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (
  echo 3D Auto tests finished. The report path is shown above.
) else (
  echo 3D Auto tests stopped with exit code %RESULT%. See the saved logs shown above.
)
pause
exit /b %RESULT%
