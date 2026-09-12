# Portable Offline Bundle

This directory is the single transfer package for dependencies that cannot be assumed on a new workstation. Read [MANIFESTO.md](../MANIFESTO.md) before adding payloads.

`catalog.json` records every required payload and its canonical relative location. Binary payloads belong under `payloads/` and remain outside normal Git commits. The whole populated `3d_auto` directory can be copied to studio storage or another machine.

Do not drop unsorted downloads at this level. Add a catalog entry, use the exact versioned destination, record the source and license note, and generate a SHA-256 checksum.

The Windows x64 local-planner set is pinned in `catalog.json`, with a conventional checksum list at `checksums/llm-windows-x64-b10809.sha256`. Verify all cataloged payloads from the project root with:

```powershell
$node = '.\offline_bundle\payloads\runtimes\node\v24.21.0\node-v24.21.0-win-x64\node.exe'
& $node installer/modules/verify-catalog.mjs
```

The audit reads and hashes payloads without installing, moving, deleting, or rewriting them. On transfer, copy the complete `3d_auto` directory. Do not copy only the model or runtime subdirectories because the catalog, checksums, launchers, tests, and recovery documentation are part of the bundle.

The current Windows x64 bundle includes portable Node.js v24.21.0, llama.cpp b10809 with CUDA 12.4 runtime files, and Qwen3-Coder-30B-A3B-Instruct Q5_K_M. Blender remains a detected host application and must be installed separately on the destination machine. ComfyUI is not part of this bundle.
