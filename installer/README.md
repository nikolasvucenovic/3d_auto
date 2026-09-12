# Installer

This directory will contain the interactive Online / Offline / Audit installer defined in [MANIFESTO.md](../MANIFESTO.md).

Installation code must be resumable, receipt-based, and additive. It may not delete caches, replace payloads, move existing applications, rewrite prior reports, or clean old environments without explicit authorization.

The installer is the next implementation milestone after the animatic execution loop is verified with a supported Blender installation.

The first pinned planner payload set is now registered in `offline_bundle/catalog.json`: portable Node.js `v24.21.0`, llama.cpp `b10809`, its CUDA 12.4 runtime DLLs, and Qwen3-Coder 30B-A3B Instruct Q5_K_M. `modules/download.mjs` performs resumable single-stream acquisition, `modules/download-ranges.mjs` accelerates range-capable large files while retaining chunks, and `modules/verify-catalog.mjs` performs a read-only size and SHA-256 audit. Launchers resolve the bundled Node executable directly and do not require a machine-wide Node installation.

Current installation state and exact continuation commands are maintained in [CONTINUITY.md](../CONTINUITY.md). No installer step may assume chat history.
