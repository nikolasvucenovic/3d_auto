param([int]$Port = 8080)

$ProjectRoot = $PSScriptRoot
$RuntimeRoot = Join-Path $ProjectRoot 'offline_bundle\payloads\runtimes\llama.cpp\b10809'
$Server = Join-Path $RuntimeRoot 'bin\llama-server.exe'
$CudaDirectory = Join-Path $RuntimeRoot 'cuda'
$Model = Join-Path $ProjectRoot 'offline_bundle\payloads\models\language\qwen3-coder-30b-a3b-instruct\Qwen3-Coder-30B-A3B-Instruct-Q5_K_M.gguf'
$Node = Join-Path $ProjectRoot 'offline_bundle\payloads\runtimes\node\v24.21.0\node-v24.21.0-win-x64\node.exe'
$Blender = Get-ChildItem 'C:\Program Files\Blender Foundation' -Filter blender.exe -Recurse -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
$Brief = Join-Path $ProjectRoot 'benchmarks\western-standoff\README.md'
$Audit = Join-Path $ProjectRoot 'benchmarks\western-standoff\audit_script.py'
$Evidence = Join-Path $ProjectRoot 'benchmarks\western-standoff\render_evidence.py'
$Adapter = Join-Path $ProjectRoot 'src\adapt-western-blender52.mjs'
$Stamp = Get-Date -Format 'yyyyMMddTHHmmss'
$Run = Join-Path $ProjectRoot "benchmark-results\western-standoff\$Stamp\local-model"
$RawScript = Join-Path $Run 'western_standoff.local.raw.py'
$Script = Join-Path $Run 'western_standoff.py'

foreach ($RequiredFile in @($Server, $Model, $Node, $Blender, $Brief, $Audit, $Evidence, $Adapter)) {
    if (-not $RequiredFile -or -not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) { throw "Required file is missing: $RequiredFile" }
}
New-Item -ItemType Directory -Path $Run -ErrorAction Stop | Out-Null
$PreviousPath = $env:PATH
$env:PATH = "$CudaDirectory;$(Split-Path -Parent $Server);$PreviousPath"
$ServerOut = Join-Path $Run 'llama-server.stdout.log'
$ServerErr = Join-Path $Run 'llama-server.stderr.log'
$ServerProcess = $null

try {
    $ServerProcess = Start-Process -FilePath $Server -ArgumentList @('--model', $Model, '--host', '127.0.0.1', '--port', $Port, '--ctx-size', '65536', '--parallel', '1', '--n-gpu-layers', '99') -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr -WindowStyle Hidden -PassThru
    $Ready = $false
    for ($Attempt = 1; $Attempt -le 180; $Attempt += 1) {
        if ($ServerProcess.HasExited) { throw "llama-server exited during startup. See $ServerErr" }
        try { $Health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2; if ($Health.status -eq 'ok') { $Ready = $true; break } } catch {}
        Start-Sleep -Seconds 2
    }
    if (-not $Ready) { throw "llama-server did not become ready. See $ServerErr" }
    & $Node (Join-Path $ProjectRoot 'src\generate-western-local.mjs') $Brief $RawScript "http://127.0.0.1:$Port"
    if ($LASTEXITCODE -ne 0) { throw "Local script generator exited with code $LASTEXITCODE." }
} finally {
    if ($ServerProcess -and -not $ServerProcess.HasExited) { Stop-Process -Id $ServerProcess.Id }
    $env:PATH = $PreviousPath
}

& $Node $Adapter $RawScript $Script
if ($LASTEXITCODE -ne 0) { throw "Compatibility adapter failed. Raw output retained at $RawScript" }
& $Blender --background --factory-startup --disable-autoexec --python $Audit -- $Script
if ($LASTEXITCODE -ne 0) { throw "Local script failed safety audit. Output retained at $Run" }
Push-Location $Run
try { & $Blender --background --factory-startup --disable-autoexec --python $Script } finally { Pop-Location }
$Blend = Join-Path $Run 'western_standoff.blend'
if (-not (Test-Path -LiteralPath $Blend -PathType Leaf)) { throw "Local script did not create western_standoff.blend. Output retained at $Run" }
& $Blender --background --disable-autoexec $Blend --python $Evidence -- --output (Join-Path $Run 'evidence') --author 'LOCAL MODEL + COMPATIBILITY ADAPTER'
if (-not (Test-Path -LiteralPath (Join-Path $Run 'evidence\evidence.json') -PathType Leaf)) { throw "Evidence render failed. Output retained at $Run" }
Write-Host "WESTERN_LOCAL_RUN=$Run"
