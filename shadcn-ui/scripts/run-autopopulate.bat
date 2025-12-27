@echo off
cd /d "%~dp0"
echo Running hygiene autopopulation script...
echo.
npx tsx autopopulate-hygiene-clean.ts
pause

