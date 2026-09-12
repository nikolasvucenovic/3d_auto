# Architecture

The complete component, data-flow, MCP, and token-budget diagram is in [docs/SYSTEM_SCHEMA.md](docs/SYSTEM_SCHEMA.md).

## Product boundary

The app converts creative direction into a validated scene plan. Blender is an execution engine behind that boundary, not the source of truth. This lets us inspect, revise, diff, and regenerate a shot without allowing generated code unrestricted access to the workstation.

```text
Written direction
       |
       v
Local planner ---> validated scene-plan.json ---> Blender executor
  |                                                |       |
  | deterministic fallback                        |       +--> final render
  + local LLM (implemented)                       +----------> animatic
                                                            |
                                                            v
                                                  ComfyUI video-to-video
```

## Components

### Local control surface

A dependency-free Node server hosts the interface on loopback only. It creates jobs, invokes Blender, and reports artifacts. It never accepts arbitrary command text.

### Scene planner

The planner emits a constrained JSON document describing objects, materials, layout, animation, camera, lighting, duration, frame rate, and output intent. Version 0.1 includes a deterministic parser and a local llama.cpp adapter behind the same schema, with validation and repair before Blender sees the plan.

### Blender executor

Blender runs in a separate background process with one new scene per job. It reads only the current plan and writes only to that job's output directory. The executor uses Blender's Python API and does not evaluate model-generated Python.

### Render paths

- **Animatic:** Workbench rendering, automatic camera framing, simple materials, H.264 MP4. Fast enough for iteration and suitable as structural guidance for video-to-video.
- **Final:** Cycles rendering with conservative defaults. Production-quality output will later add render-layer, color-management, denoise, AOV, EXR, and asset-management controls.

### Local generative finishing

ComfyUI is the preferred integration because it is local, node-based, scriptable through an HTTP API, and lets the studio own repeatable workflows. Initial integration should export an image sequence plus depth, normals, object masks, and motion vectors where possible. Those controls are more stable than feeding only the beauty animatic.

### Quarantined full-script benchmark

The Western standoff benchmark deliberately tests complete model-generated Blender Python outside the production boundary. Raw output is never executed directly: a deterministic adapter writes a separate candidate and a static gate checks safety and completion before Blender runs in a new result directory. Required `.blend`, evidence manifest, and sixteen frames determine success because Blender may return exit code zero after a script traceback. These repairs and failures are part of the score; production still accepts validated scene plans only.

## Preservation rules

1. Jobs are append-only and receive unique timestamped directories.
2. Iterations create a new job with an optional parent-job reference.
3. Existing `.blend` files and rendered media are never opened for write.
4. Deletion, moves, cleanup, and replacement require explicit user authorization.
5. Generated language-model output is data validated against a schema; it is never executed as source code.

## Three-level comparison harness

`benchmarks/cases.json` defines small, medium, and large directions. Each case has an initial prompt, a narrow revision request, factual acceptance checks, and a strict list of sections the revision may change. Both planners feed the same validator and Blender executor.

Each benchmark run creates a new timestamped directory under `benchmark-results/`. It retains initial plans, minimal revision patches, revised plans, check results, token usage reported by the local server, optional Blender preview images, and a single HTML report. Runs never reuse or alter an earlier result.

The local planner uses a compact fixed instruction. Initial calls receive only the scene direction. Revision calls receive only the requested editable sections and return a minimal patch. This bounds context growth while preserving every other section exactly in application code.

Run the deterministic baseline with `node src/evaluation-runner.mjs --planner deterministic`. Run both planners with `node src/evaluation-runner.mjs --planner both`; the local llama.cpp server is expected at `http://127.0.0.1:8080`. Add `--case small`, `--case medium`, or `--case large` for the cheapest targeted run.

## Development sequence

1. Offline animatic MVP: text, primitives, materials, camera, lighting, keyframes, MP4.
2. Blender and ComfyUI discovery/configuration, plus a machine-readiness screen.
3. Local LLM planner using a quantized model served by llama.cpp or Ollama.
4. Shot iteration with parent/child lineage and visual contact sheets.
5. ComfyUI workflow adapter for controlled video-to-video and image-sequence processing.
6. Asset catalog, semantic retrieval, reusable rigs, and multi-shot timelines.
7. Cycles/EXR final-render profiles and render-farm handoff.
