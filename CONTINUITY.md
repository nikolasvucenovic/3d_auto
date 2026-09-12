# Project continuity

Last updated: 2026-09-12 09:10 UTC

This is the first file to read when continuing 3D Auto on this or another machine. The governing rules are in [MANIFESTO.md](MANIFESTO.md), the system diagram is in [docs/SYSTEM_SCHEMA.md](docs/SYSTEM_SCHEMA.md), and dependency truth is in [offline_bundle/catalog.json](offline_bundle/catalog.json).

## Current verified state

- Git branch `main` tracks `origin/main` at `https://github.com/nikolasvucenovic/3d_auto`.
- The workstation has Windows x64, an NVIDIA GeForce RTX 5090 with 32 GB VRAM, and Blender 5.2.1 LTS. Blender is discovered from its standard Blender Foundation installation directory; no machine path is committed.
- llama.cpp build `b10809` is unpacked under `offline_bundle/payloads/runtimes/llama.cpp/b10809/`. `llama-server --version` reported build 10809, commit `5266f24da`.
- `Qwen3-Coder-30B-A3B-Instruct-Q5_K_M.gguf` is stored under `offline_bundle/payloads/models/language/qwen3-coder-30b-a3b-instruct/`. Its 21,725,584,544-byte file passed SHA-256 verification: `4b78837bbec5ee248e4a5642bf608b6793721af41b92589e40c8da0bce58b907`.
- Both official llama.cpp archives passed the checksums committed in `offline_bundle/checksums/llm-windows-x64-b10809.sha256`.
- Portable Node.js `v24.21.0` is unpacked under `offline_bundle/payloads/runtimes/node/v24.21.0/`. The launchers use it directly, so a global `node` command is not required.
- All small, medium, and large local-model benchmarks pass. The deterministic large baseline deliberately exposes its semantic-reference limitation around “the hero rises.”
- Blender preview rendering works on 5.2.1. The executor was updated for the Blender 5.2 animation action API and Workbench material colors.
- The comprehensive Western standoff benchmark passes its end-to-end launcher: offline generation, logged deterministic adaptation, static audit, `.blend` creation, and sixteen evidence renders. The verified local run is `benchmark-results/western-standoff/20260912T110659/local-model`; the definitive side-by-side report is `benchmark-results/western-standoff/comparison-20260912T110752/report.html`.
- The Western comparison is deliberately candid: the Codex scene contains 142 objects; the final seeded local scene contains 84 objects and needs compatibility adaptation. Both expose sixteen bound cameras, but the local compositions and scene detail are visibly weaker.
- This Blender 5.2.1 build does not expose FFMPEG as a usable image format. Scripts fall back to PNG evidence frames; Blender can still print a later external encoding command.
- ComfyUI was checked read-only in standard locations. It was not found, and 3D Auto made no ComfyUI changes. It remains a separate future integration.

## Run without Codex or hosted tokens

Double-click `Run 3D Auto Tests.bat`. It starts the bundled model on `127.0.0.1:8080`, runs all three planners and Blender previews, writes a new HTML report under `benchmark-results/`, retains server logs under `local-llm-runs/`, and stops only the llama.cpp process it created.

Double-click `Run Western Standoff Local Test.bat` for the comprehensive Blender-script stress test. It preserves raw model output, applies and records a deterministic Blender 5.2 adapter, audits the result, builds a new blend, and renders sixteen evidence frames. Both BAT launchers were verified with global Node removed from `PATH`.

For a cheaper targeted run:

```powershell
.\run-local-tests.ps1 -Size small -Planner both
```

The small, medium, and large completion limits are 800, 1,400, and 2,200 model tokens. Rendering, validation, diffs, reports, and deterministic planning consume no model tokens.

## Verify a copied folder

From the copied project root:

```powershell
$node = '.\offline_bundle\payloads\runtimes\node\v24.21.0\node-v24.21.0-win-x64\node.exe'
& $node installer/modules/verify-catalog.mjs
& $node --test
.\run-benchmark.ps1 -Size small -Planner deterministic
```

The first command hashes every cataloged payload. The second checks plan safety and isolated revision behavior. The third creates a new Blender plan, child revision, previews, and HTML report without using a model.

## Reconstruct missing payloads

The exact source URLs, sizes, and hashes are in `offline_bundle/catalog.json`. Use the resumable downloader for normal files:

```powershell
node installer/modules/download.mjs URL DESTINATION EXPECTED_SIZE EXPECTED_SHA256
```

For a very large range-capable source, `download-ranges.mjs` downloads non-overlapping cached chunks and appends them to an existing partial destination without overwriting it:

```powershell
node installer/modules/download-ranges.mjs URL DESTINATION EXPECTED_SIZE EXPECTED_SHA256 12
```

Range chunks are retained under `offline_bundle/cache/`. No recovery command deletes them.

## Architecture status

Implemented now: deterministic planner, compact llama.cpp adapter, scene-plan validation, typed section/object patches, exact preservation checks, fixed Blender executor, immutable benchmark runs, preview rendering, HTML reports, token-usage capture, portable Node/model/runtime catalog, checksums, audit, one-click compact tests, and the quarantined comprehensive Western comparison with a logged compatibility adapter.

Designed but not yet implemented: the MCP server facade, parent IDs in normal UI jobs, plan-diff UI, full animatic comparison report, control passes, and ComfyUI handoff. The proposed MCP tools and hard exclusions are recorded in `docs/SYSTEM_SCHEMA.md`.

## Next work

1. Use the rendered Western report to define objective composition and scene-content scores; the local result currently passes structure but needs creative improvement.
2. Keep full generated Python quarantined as a stress test. Move production capability into the validated scene-plan and fixed-executor path.
3. Select and pin an existing local Blender MCP implementation only after the evaluation in `docs/BLENDER_MCP_EVALUATION.md` is reproduced. Prefer typed/read-only tools while keeping unrestricted Python disabled.
4. Add parent IDs and section diffs to ordinary UI jobs using the benchmark patch mechanism.
5. Run a network-blocked transfer rehearsal on a second Windows x64 machine before calling the bundle fully transferable.

Do not install or alter ComfyUI as part of these steps. Do not commit files under `offline_bundle/payloads`, `offline_bundle/cache`, `jobs`, `benchmark-results`, or `local-llm-runs`.
