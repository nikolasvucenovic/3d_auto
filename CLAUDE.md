# 3D Auto

Offline text-to-Blender scene and animatic workstation. Plain Node (>=20), ESM,
**no npm dependencies** — nothing to install beyond Node itself.

Read [CONTINUITY.md](CONTINUITY.md) first when picking up work; the governing
rules are in [MANIFESTO.md](MANIFESTO.md) and the system diagram is in
[docs/SYSTEM_SCHEMA.md](docs/SYSTEM_SCHEMA.md).

## Remote / cloud sessions

This repo is often worked on from a cloud sandbox that has **no Blender, no GPU,
and no local model**. The large payloads (llama.cpp build, the Qwen3-Coder GGUF)
are deliberately gitignored under `offline_bundle/payloads/`, so they are absent
from any fresh clone.

Works anywhere with Node:

```bash
node --test                          # scene plan + compiler tests
node installer/modules/verify-catalog.mjs   # only if payloads are present
```

Requires the Windows workstation (Blender 5.2.1 + RTX 5090 + bundled llama.cpp):

- `run-local-tests.ps1`, `run-benchmark.ps1`, `Run 3D Auto Tests.bat`
- `npm run benchmark` and anything invoking the planner with `--planner llm`
- Any Blender preview rendering via `src/blender-runner.mjs`

Do not attempt those from a cloud session; write and test the pure-JS layers
there and leave hardware-dependent verification to the workstation.

## Layout

- `src/scene-plan.mjs` — plan schema and validation
- `src/scene-revision.mjs` — typed section/object patches, preservation checks
- `src/local-planner.mjs` — deterministic planner (no model tokens)
- `src/scene-compiler.mjs` — plan to Blender-executable form
- `src/blender-runner.mjs` — isolated Blender executor (hardware)
- `src/evaluation-runner.mjs` — benchmark harness and HTML reports
- `installer/modules/` — resumable, checksum-verifying payload downloaders
- `blender/execute_plan.py` — runs inside Blender

## Conventions

- Deterministic paths must consume zero model tokens; keep it that way.
- Never commit machine-specific paths; Blender is discovered at runtime.
- Recovery commands never delete cached chunks under `offline_bundle/cache/`.
