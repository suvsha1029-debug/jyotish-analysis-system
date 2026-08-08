$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required but was not found. Install Node.js and try again."
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing JavaScript packages (first run only)..."
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw "JavaScript packages could not be installed." }
}

Write-Host "Building the standalone JavaScript page..."
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "The JavaScript page could not be built." }

$chromeCandidates = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
)
$chromePath = $chromeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $chromePath) {
    $chromeCommand = Get-Command chrome.exe -ErrorAction SilentlyContinue
    if ($chromeCommand) { $chromePath = $chromeCommand.Source }
}
if (-not $chromePath) {
    throw "Google Chrome was not found on this computer."
}

$url = "http://127.0.0.1:4174/"
Write-Host "Starting the static page at $url"
Write-Host "Keep this window open while testing. Press Ctrl+C to stop."
Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', "Start-Sleep -Seconds 2; Start-Process '$chromePath' -ArgumentList '$url'"
& npm.cmd run preview -- --host 127.0.0.1 --port 4174 --strictPort
