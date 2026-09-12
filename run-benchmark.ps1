param(
    [ValidateSet('small', 'medium', 'large', 'all')]
    [string]$Size = 'all',
    [ValidateSet('deterministic', 'local', 'both')]
    [string]$Planner = 'both',
    [string]$Endpoint = 'http://127.0.0.1:8080'
)

$Arguments = @('src/evaluation-runner.mjs', '--planner', $Planner, '--case', $Size, '--endpoint', $Endpoint)
& node @Arguments
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
