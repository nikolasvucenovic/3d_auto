@echo off
setlocal
cd /d "%~dp0"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-local-tests.ps1" %*
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (
  echo 3D Auto tests finished. The report path is shown above.
) else (
  echo 3D Auto tests stopped with exit code %RESULT%. See the saved logs shown above.
)
if not defined THREED_AUTO_NO_PAUSE pause
exit /b %RESULT%
