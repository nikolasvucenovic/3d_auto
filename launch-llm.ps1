param(
    [int]$ContextSize = 32768,
    [int]$Port = 8080
)

$ProjectRoot = $PSScriptRoot
$RuntimeRoot = Join-Path $ProjectRoot 'offline_bundle\payloads\runtimes\llama.cpp\b10809'
$Server = Join-Path $RuntimeRoot 'bin\llama-server.exe'
$CudaDirectory = Join-Path $RuntimeRoot 'cuda'
$Model = Join-Path $ProjectRoot 'offline_bundle\payloads\models\language\qwen3-coder-30b-a3b-instruct\Qwen3-Coder-30B-A3B-Instruct-Q5_K_M.gguf'

foreach ($RequiredFile in @($Server, $Model)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) {
        throw "Required portable payload is missing: $RequiredFile"
    }
}

$env:PATH = "$CudaDirectory;$(Split-Path -Parent $Server);$env:PATH"
& $Server --model $Model --host 127.0.0.1 --port $Port --ctx-size $ContextSize --parallel 1 --n-gpu-layers 99
