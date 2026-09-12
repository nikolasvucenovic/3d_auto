param(
    [ValidateSet('small', 'medium', 'large', 'medium-large', 'all')]
    [string]$Size = 'all',
    [ValidateSet('local', 'both')]
    [string]$Planner = 'both',
    [switch]$OpenReport
)

$ProjectRoot = $PSScriptRoot
$RuntimeRoot = Join-Path $ProjectRoot 'offline_bundle\payloads\runtimes\llama.cpp\b10809'
$Server = Join-Path $RuntimeRoot 'bin\llama-server.exe'
$CudaDirectory = Join-Path $RuntimeRoot 'cuda'
$Model = Join-Path $ProjectRoot 'offline_bundle\payloads\models\language\qwen3-coder-30b-a3b-instruct\Qwen3-Coder-30B-A3B-Instruct-Q5_K_M.gguf'
$Node = Join-Path $ProjectRoot 'offline_bundle\payloads\runtimes\node\v24.21.0\node-v24.21.0-win-x64\node.exe'
$RunStamp = Get-Date -Format 'yyyyMMddTHHmmss'
$LogDirectory = Join-Path $ProjectRoot "local-llm-runs\$RunStamp"
$ServerOut = Join-Path $LogDirectory 'llama-server.stdout.log'
$ServerErr = Join-Path $LogDirectory 'llama-server.stderr.log'

foreach ($RequiredFile in @($Server, $Model, $Node)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) {
        throw "Required portable payload is missing: $RequiredFile"
    }
}

New-Item -ItemType Directory -Path $LogDirectory -ErrorAction Stop | Out-Null
$PreviousPath = $env:PATH
$env:PATH = "$CudaDirectory;$(Split-Path -Parent $Server);$PreviousPath"
$ServerProcess = $null

try {
    $ServerProcess = Start-Process -FilePath $Server -ArgumentList @('--model', $Model, '--host', '127.0.0.1', '--port', '8080', '--ctx-size', '32768', '--parallel', '1', '--n-gpu-layers', '99') -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr -WindowStyle Hidden -PassThru
    $Ready = $false
    for ($Attempt = 1; $Attempt -le 180; $Attempt += 1) {
        if ($ServerProcess.HasExited) { throw "llama-server exited during startup. See $ServerErr" }
        try {
            $Health = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/health' -TimeoutSec 2
            if ($Health.status -eq 'ok') { $Ready = $true; break }
        } catch {}
        Start-Sleep -Seconds 2
    }
    if (-not $Ready) { throw "llama-server did not become ready. See $ServerErr" }

    $CaseArgument = if ($Size -eq 'medium-large') { 'medium,large' } else { $Size }
    & $Node (Join-Path $ProjectRoot 'src\evaluation-runner.mjs') --planner $Planner --case $CaseArgument --endpoint 'http://127.0.0.1:8080'
    if ($LASTEXITCODE -ne 0) { throw "Benchmark runner exited with code $LASTEXITCODE." }

    $LatestReport = Get-ChildItem (Join-Path $ProjectRoot 'benchmark-results') -Filter report.html -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Write-Host "Benchmark report: $($LatestReport.FullName)"
    Write-Host "Local model logs: $LogDirectory"
    if ($OpenReport) { Start-Process -FilePath $LatestReport.FullName }
} finally {
    if ($ServerProcess -and -not $ServerProcess.HasExited) { Stop-Process -Id $ServerProcess.Id }
    $env:PATH = $PreviousPath
}
