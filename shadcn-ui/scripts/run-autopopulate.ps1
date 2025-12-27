# PowerShell script to run hygiene autopopulation
Set-Location $PSScriptRoot
Write-Host "Running hygiene autopopulation script..." -ForegroundColor Green
Write-Host ""
npx tsx autopopulate-hygiene-clean.ts

