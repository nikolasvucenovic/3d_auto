param(
    [ValidateSet('small', 'medium', 'large', 'all')]
    [string]$Size = 'all',
    [ValidateSet('deterministic', 'local', 'both')]
    [string]$Planner = 'both',
    [string]$Endpoint = 'http://127.0.0.1:8080'
)

$Node = Join-Path $PSScriptRoot 'offline_bundle\payloads\runtimes\node\v24.21.0\node-v24.21.0-win-x64\node.exe'
if (-not (Test-Path -LiteralPath $Node -PathType Leaf)) { throw "Portable Node.js is missing: $Node" }
$Arguments = @('src/evaluation-runner.mjs', '--planner', $Planner, '--case', $Size, '--endpoint', $Endpoint)
& $Node @Arguments
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
