@echo off
setlocal
cd /d "%~dp0"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-western-local.ps1" %*
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (
  echo Western standoff local-model test finished successfully.
) else (
  echo Western standoff test stopped with exit code %RESULT%. Generated work was retained.
)
if not defined THREED_AUTO_NO_PAUSE pause
exit /b %RESULT%
