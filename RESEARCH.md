# Research Baseline and Recommended Direction

Date: 2026-09-11

This is the first research pass for 3D Auto. It is a decision aid, not a final dependency lock. Model and application versions must be benchmarked on this workstation and entered into the portable catalog only after they pass studio tests.

Current reference workstation: Windows x64, NVIDIA GeForce RTX 5090, 32 GB VRAM. Earlier Ollama exploration was constrained by an 8 GB GPU; those model-size conclusions should not be carried forward without retesting. The new machine makes 30B-class quantized planners and substantially larger video/3D workloads realistic candidates.

## Question

What existing systems can help turn written direction into editable Blender scenes, animatics, final renders, and offline generative video, while keeping all recurring compute local and preserving every iteration?

## Findings

### Blender control agents

**Blender MCP** is the closest existing product pattern. It connects an LLM client to a Blender add-on and supports prompt-driven scene creation and manipulation. Its architecture proves that a narrow bridge into Blender is practical. It also exposes the main risk in copying the design unchanged: its default mode can execute arbitrary Python in Blender. The project now has a safe mode that attempts to block filesystem, process, network, and persistence behavior, which is useful prior art but still leaves generated code as the central command format. Source: [ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp).

**Blender Lab MCP Server** is especially relevant because Blender itself is exploring MCP and shows a local `llama.cpp` web interface controlling Blender. We should track its command design and maturity before freezing our own protocol. Source: [Blender Lab: MCP Server](https://www.blender.org/lab/mcp-server/).

**3D-GPT** decomposes instruction-driven procedural modeling into task dispatch, conceptualization, and modeling agents, then interfaces the result with Blender. Its most useful lesson is decomposition: enrich intent, plan the task, and perform modeling as separate responsibilities. Source: [3D-GPT paper](https://arxiv.org/abs/2310.12945).

**Scene Copilot** combines a scene representation, Blender-oriented generation, and a human review loop for procedural text-to-video. Its separation of scene knowledge from Blender execution and its explicit human iteration are aligned with this project. Source: [Scene Copilot paper](https://arxiv.org/abs/2411.18644).

Recommendation: learn from the MCP tool surface and multi-stage planning, but keep 3D Auto's execution interface typed and constrained. The planner should emit scene-plan data or a sequence of approved operations. It should not emit unrestricted Python.

### Procedural scene systems

**Infinigen** is the strongest reference for large, deterministic procedural Blender environments. It builds geometry and materials procedurally, supports nature and indoor scenes, exposes camera and render configuration, and can export ground-truth data. Infinigen Indoors also includes a constraint-based arrangement system, which is directly relevant to language such as “place the chair near the desk without blocking the door.” Sources: [Infinigen repository](https://github.com/princeton-vl/infinigen), [Infinigen Indoors paper](https://arxiv.org/abs/2406.11824).

**BlenderProc** is a mature reference for modular scene construction and for outputting RGB, depth, normals, and segmentation data. Its original focus is synthetic training data rather than art direction, but its pipeline modules and control-pass generation map well to our animatic-to-video handoff. Source: [DLR-RM/BlenderProc](https://github.com/DLR-RM/BlenderProc).

**Holodeck** creates language-guided indoor environments using an asset database and a layout solver. Its public implementation is tied to AI2-THOR/Unity and hosted GPT use, so it is not a direct dependency candidate. Its asset retrieval, relational layout, and solver stages remain useful design references. Source: [allenai/Holodeck](https://github.com/allenai/Holodeck).

Recommendation: treat procedural generators and asset libraries as optional providers behind our scene plan. Borrow the constraint-based layout idea early. Evaluate selected Infinigen components later instead of making its full stack a requirement for the animatic MVP, particularly because Windows portability must be verified.

### 3D asset generation

**TRELLIS** generates meshes, Gaussian representations, and radiance fields from text or images. Its authors recommend image-conditioned generation for better results, and its public setup is primarily tested on Linux with at least 16 GB VRAM. The workstation's RTX 5090 has enough VRAM for evaluation, but Windows dependency friction and asset cleanup quality must be measured. Source: [Microsoft TRELLIS](https://github.com/microsoft/TRELLIS).

**TRELLIS.2** moves to a 4B image-to-3D model and targets high-fidelity assets with PBR materials. It should enter the asset-generation benchmark, with special attention to topology, texture consistency, import time, and the completeness of all paired model dependencies. Source: [Microsoft TRELLIS.2](https://github.com/microsoft/TRELLIS.2).

**Hunyuan3D 2.x** is another important local asset-generation candidate and already appears in ComfyUI's supported 3D ecosystem. It should be benchmarked against TRELLIS using the same reference images and Blender cleanup checks. Sources: [Hunyuan3D 2.0 paper](https://arxiv.org/abs/2501.12202), [ComfyUI repository](https://github.com/Comfy-Org/ComfyUI).

Recommendation: do not depend on text-to-3D for common scene construction. Prefer known procedural assets and a curated studio library. Use image-to-3D selectively for hero or background assets, after generating or supplying a strong concept image, then validate topology, scale, UVs, materials, and render performance before adding the result to a scene.

### Local planning models and runtime

**llama.cpp** is the best first runtime candidate for the portable architecture. It publishes Windows CUDA builds, runs quantized models locally, exposes an HTTP server, and supports schema-constrained JSON output. It can live entirely under our portable bundle with explicit model paths, avoiding hidden model storage. Sources: [llama.cpp server documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [llama.cpp releases](https://github.com/ggml-org/llama.cpp/releases).

**Ollama** is a valid secondary adapter. Its structured-output support can enforce JSON schemas and its API is convenient. For this project, default model storage and runtime state would need to be redirected into our canonical bundle locations. Source: [Ollama structured outputs](https://github.com/ollama/ollama/blob/main/docs/capabilities/structured-outputs.mdx).

**Qwen3-Coder 30B-A3B** is a reasonable first planner benchmark candidate because it targets coding and agentic tasks while activating a smaller subset of its parameters. A 32 GB GPU should make a quantized version practical, subject to real context-size and speed tests. This is a candidate, not yet the selected model. Source: [Qwen3-Coder](https://github.com/QwenLM/Qwen3-Coder).

Recommendation: package `llama.cpp` first, expose only loopback networking, and require schema-constrained scene plans followed by our own validator. Benchmark at least one small fast model and one 30B-class model on the same prompt suite. Record plan validity, spatial reasoning, Blender success, correction turns, tokens per second, VRAM, and end-to-end shot time.

Operator decision: llama.cpp/model acquisition and ComfyUI installation are being prepared separately with Claude. 3D Auto must not create a competing unmanaged installation. Once present, its audit flow will inventory those exact installations and either register their paths or collect approved portable copies into `offline_bundle` without moving or replacing the originals.

### Verification

**BlenderGym** evaluates procedural geometry, lighting, materials, blend shapes, and object placement. Its published evaluation found that strong vision-language systems still struggle with edits that are easy for Blender users. It also found value in allocating inference to verification. This supports a generate-render-inspect-revise loop rather than one-shot generation. Source: [BlenderGym project and paper](https://blendergym.github.io/).

Recommendation: build a studio evaluation set immediately. Each case should include a prompt, expected scene facts, rendered reference or acceptance images where useful, and machine-checkable assertions. Evaluation should cover plan validity, Blender execution, object relationships, camera readability, material intent, motion timing, and visual verification.

### Offline video and finishing

**ComfyUI** is the preferred workflow host. It provides reusable graphs, a local API, queueing, partial re-execution, VRAM management, model offloading, and offline operation. Its current native ecosystem includes Wan, LTX-Video, HunyuanVideo, CogVideoX, control and segmentation tools, and 3D models. `--disable-api-nodes` forces built-in operation away from paid API nodes. Source: [ComfyUI repository](https://github.com/Comfy-Org/ComfyUI).

Recommendation: integrate ComfyUI through saved, pinned API-format workflows. Begin with short controlled tests rather than choosing a video model from showcase quality. Compare at least Wan and LTX-family workflows on the 5090 for motion adherence, temporal identity, control-pass usage, VRAM, generation time, resolution, and ability to continue or retake shots. Store every model, custom node, workflow, encoder, VAE, and checksum in the portable bundle catalog.

## Recommended system

```text
Operator direction
      |
      v
Local planner (llama.cpp + benchmark-selected model)
      |
      v
Schema validation + scene constraints + preservation policy
      |
      v
Typed Blender operations / deterministic Python executor
      |
      +--> .blend + fast animatic + depth/normals/masks/motion data
      |                         |
      |                         v
      |                 Visual/structural verifier
      |                         |
      |                    new iteration
      v
Cycles/EXR final path     ComfyUI video-to-video path
```

## Proposed sequence

1. Freeze the preservation rules and portable folder contract in the manifesto.
2. Build a 20–50 prompt studio benchmark covering layout, camera, lighting, materials, keyframes, and revision requests.
3. Install a pinned Blender version and verify the current deterministic animatic loop.
4. Package a pinned Windows CUDA `llama.cpp` build and benchmark local planner models; select one only from results.
5. Expand the scene schema and typed executor using lessons from Blender MCP, 3D-GPT, Infinigen, and BlenderProc.
6. Add render-and-inspect verification using Blender metadata first and a local vision model second.
7. Install and pin ComfyUI, then benchmark controlled video workflows using identical Blender passes.
8. Implement the Online / Offline / Audit installer against the exact versions that passed these tests.
9. Populate and verify a complete `animatic-generative` offline bundle on a clean test machine.

## Immediate decision

Continue the small deterministic prototype because it gives us a safe integration harness and produces test artifacts. Do not scale its hand-written text parser into the final intelligence layer. The next engineering work should be the benchmark and schema, followed by local-model evaluation. That sequence keeps research ahead of irreversible stack decisions and converts the workstation's compute advantage into measurable studio value.
