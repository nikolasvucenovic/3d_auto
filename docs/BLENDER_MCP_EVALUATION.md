# Blender MCP reuse evaluation

Date: 2026-09-11

Goal: reuse an existing local Blender MCP implementation where it saves mature work, while preserving 3D Auto's typed-plan boundary and additive workflow.

## Local/offline gate

A candidate passes only when its server, client, add-on, models, documentation, and Python dependencies can be pinned inside the portable folder and run without network access. Loopback transport alone is insufficient: telemetry, remote asset providers, hosted model calls, package-on-demand launchers, and unrestricted generated-code execution must be disabled or removed.

## Candidates

### Blender Lab MCP Server

Official experimental Blender work and the strongest compatibility reference. Blender documents a local llama.cpp client path and requires Blender 5.1 or newer. Its current security warning states that it executes LLM-generated code in Blender without guards. Reuse its protocol, add-on architecture, documentation access, and scene-inspection ideas; do not put its unrestricted execution path inside 3D Auto's trusted workflow.

Source: https://www.blender.org/lab/mcp-server/

### ahujasid/blender-mcp

Mature and widely used, with a JSON-over-TCP bridge and useful scene, viewport, and asset patterns. Its documentation warns that `execute_blender_code` runs arbitrary Python, and telemetry requires explicit configuration to disable fully. It is a research and tool-surface source, not the default runtime candidate.

Source: https://github.com/ahujasid/blender-mcp

### djeada/blender-mcp-server

Offers a broader typed tool set, undo pushes, project-root file restrictions, a tool whitelist, and an inline-code toggle. However, its documented defaults leave Safe Mode off and inline code on. It is a candidate for an isolated benchmark after pinning a commit and forcing safe settings in project-owned configuration.

Source: https://github.com/djeada/blender-mcp-server

### jabbertones-cloud/blender-mcp

Documents loopback binding, code execution disabled by default, an AST pre-pass, and an agent loop with curated operations. It is the leading third-party candidate for a controlled local evaluation, subject to source audit, license verification, Windows/Blender 5.2 testing, dependency pinning, and proof that networking and unsafe execution remain disabled.

Source: https://github.com/jabbertones-cloud/blender-mcp

## Current decision

Keep the fixed Blender executor as the production path during the three-level planner benchmark. It already runs locally, has a small auditable surface, and writes only into new result directories. Reuse an existing MCP package first for read-only scene inspection, typed edits, viewport capture, documentation retrieval, and protocol/client compatibility. Route any accepted mutation into 3D Auto's validated scene-plan or patch types.

Do not expose `execute_python`, general shell commands, arbitrary file writes, deletion, moves, cleanup, remote asset downloads, or telemetry. Re-evaluate this decision after a pinned MCP candidate passes small, medium, and large tests offline.
