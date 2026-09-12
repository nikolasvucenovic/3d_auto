# 3D Auto Manifesto

## Purpose

3D Auto is a completely offline creative system that turns written direction into controllable 3D scenes. Its first 3D host is Blender. It must create objects, environments, layouts, cameras, animation, lights, materials, shaders, render settings, and related scene data from text.

The economic reason is direct: repeated hosted-model token use is too expensive for this type of iterative creative work, while the studio already owns capable compute. The product should shift sustained planning, generation, rendering, checking, and iteration onto machines we control. Internet services may be used during explicit research and online bundle preparation, but routine creative work must not depend on metered hosted inference.

The system has two target outputs:

1. **Animatic output — first priority.** A fast, structurally accurate 3D video used for direction, review, timing, camera decisions, and as guidance for local video-to-video generation.
2. **Final 3D output.** A fully rendered animation at the highest dependable standard available on the machine, with an eventual path to render layers, EXR, AOVs, denoising, color management, and studio finishing.

The animatic path should connect to a fully offline generative finishing system. ComfyUI is the preferred first integration because it is local, inspectable, repeatable, and programmable. The ideal handoff includes more than a beauty video: image sequences, depth, normals, object masks, motion vectors, and camera metadata should be supplied wherever useful.

## Non-negotiable principles

### Research comes before stack commitment

Before adopting, replacing, or building a major subsystem, research the applications, papers, repositories, models, workflows, and standards that already address it. Record what was evaluated, what is reusable, what failed our constraints, and why the selected path was chosen.

The order is:

1. define the studio task and success test;
2. research existing work;
3. reproduce or evaluate the strongest relevant candidates;
4. benchmark candidates locally on representative prompts and assets;
5. write a decision record;
6. implement the smallest missing layer;
7. preserve results so the research is not repeated from memory.

Research is not a reason to assemble an uncontrolled collection of tools. A candidate enters the installation catalog only after it has a defined purpose, pinned version, known dependencies, storage location, compatibility result, and removal/upgrade policy. We learn from existing systems first, then build the parts needed to connect them into a dependable offline studio workflow.

### Reuse proven local work before building

Before implementing a component, search maintained open-source projects, official application extensions, published research, and model repositories for an existing local solution. Prefer adapting and pinning a proven component when it passes the project's offline, safety, portability, licensing, and preservation tests. Custom code should provide the smallest missing integration or safety layer.

“Available online” does not mean “online at runtime.” Every adopted component must be downloaded into the portable bundle, checksum-verified, licensed for the intended use, configured for loopback or process-local communication, and tested with networking unavailable. Hosted inference, required cloud accounts, telemetry that cannot be disabled, hidden caches, and automatic remote asset retrieval fail the offline gate.

Existing MCP implementations may be reused for protocol definitions, typed tools, scene inspection, and Blender integration. Any path that executes unrestricted model-generated Python remains outside the trusted production boundary. 3D Auto's normal execution path accepts validated data and fixed operations only.

### Continuity is a project artifact

The repository must be sufficient for a new operator or agent to understand the product, current state, selected dependencies, verification evidence, unresolved risks, and exact next commands without relying on chat history or one person's memory. Every material work session updates [CONTINUITY.md](CONTINUITY.md) and the relevant catalog, research, architecture, and operating documents before changes are pushed.

Large payloads and generated jobs remain outside Git, but their immutable source URLs, versions, sizes, checksums, canonical paths, licenses, and recovery commands must be committed. A missing workstation may cost compute time; it must not cost project knowledge.

### Offline means complete

An offline installation must not quietly depend on the internet. Once its portable dependency bundle has been prepared, installation, model loading, scene creation, rendering, help material, and recovery must all work with networking disabled.

### Nothing is scattered

No installer, model, Python wheel, custom node, runtime, configuration template, license, checksum, or setup note may live in an undocumented location. Every external requirement belongs in the portable bundle and must appear in its machine-readable catalog.

We will not search the workstation, old downloads, browser history, chat messages, or memory to reconstruct an installation. The bundle is the installation source of truth.

### Every installation starts with a choice

The installer begins by asking:

> Installation mode: Online or Offline?

- **Online** inspects the machine, shows the dependency plan, downloads only the missing approved versions, verifies every download, installs them, and also populates or refreshes the portable bundle.
- **Offline** inspects the machine, reads only from the portable bundle, verifies its contents, shows anything missing before making changes, and installs without attempting any network access.
- **Audit** performs the same inspection and produces a report without installing anything. This supports preparation and troubleshooting.

The installer must never guess that an absent file can be found later. If the offline bundle is incomplete, it stops with an exact missing-items report.

### The project is portable

The complete working directory may be copied to another drive or machine. Machine-specific paths must live in a generated local configuration file and may not be embedded in scene plans, source files, or the dependency catalog. Paths in manifests are relative to the project root or bundle root.

The install process must support a clean machine. It may use system installers for large host applications, portable runtimes where practical, and Python virtual environments for isolated packages. It must record what it installed, where it installed it, and which version and checksum were used.

### Work is preserved

The project follows an additive workflow:

- Do not delete, move, cut, rename, replace, or clean up existing work without Nikola's explicit authorization.
- New work uses new files and directories.
- Scene iterations use incremental versions and retain their parent relationship.
- Existing Blender scenes, renders, plans, prompts, and generated media are never overwritten.
- A failed operation leaves its request, plan, logs, and partial output available for diagnosis.
- Cleanup is a separate, explicit operation and is never part of installation, launch, render, or update.

These rules apply to human tools, automated scripts, Blender execution, language-model actions, and maintenance utilities.

### Models produce plans, not executable code

Written direction is translated into a constrained, validated scene plan. Generated model output is treated as untrusted data. The application does not execute arbitrary Python, shell commands, Blender expressions, or downloaded scripts produced by a language model.

Blender receives a supported scene-plan format through a fixed executor maintained in this repository. Unsupported instructions fail clearly or remain marked for review.

### Versions are pinned and verifiable

Every external component must be represented by:

- stable identifier and human-readable name;
- exact version;
- supported platform and architecture;
- expected relative bundle path;
- SHA-256 checksum;
- source URL for online preparation;
- install method and silent-install arguments where applicable;
- license or research-use note;
- dependencies and compatibility constraints;
- size, status, and date collected.

The installer verifies checksums before using a payload. A model filename alone is not sufficient identification. Model architecture, quantization, related encoders or VAEs, expected loader, and workflow compatibility must be recorded.

## Canonical directory contract

```text
3d_auto/
  MANIFESTO.md                 Governing product and preservation rules
  ARCHITECTURE.md              Technical boundaries and roadmap
  README.md                    Operator quick start
  install.ps1                  Interactive Online / Offline / Audit entry point
  launch.ps1                   Local application launcher

  installer/
    inventory/                 Detection rules and dependency definitions
    modules/                   Versioned installation logic
    reports/                   New timestamped audit/install reports
    state/                     Receipts for completed installations

  offline_bundle/
    catalog.json               Machine-readable source of truth
    README.md                  Human instructions for carrying the bundle
    checksums/                 Signed or generated checksum manifests
    payloads/
      runtimes/                Python, Node, Git, FFmpeg, and support runtimes
      applications/            Blender, ComfyUI package, and other large tools
      python-wheels/           Platform- and Python-version-specific wheels
      models/
        language/              Text-to-scene planner models
        image/                 Image generation and conditioning models
        video/                 Video-to-video and temporal models
        control/               Depth, normal, pose, edge, segmentation controls
        vision/                Captioning, understanding, and reference models
      comfyui/
        core/                  Pinned ComfyUI source package
        custom-nodes/          Pinned custom-node archives or repositories
        workflows/             Validated studio workflow JSON files
      blender/
        addons/                Approved add-ons and extension packages
        assets/                Starter assets, HDRIs, templates, and rigs
      drivers/                 Optional, explicitly managed driver packages
    cache/                     Resumable online collection area

  src/                         Local control application
  public/                      Local browser interface
  blender/                     Fixed Blender plan executor
  workflows/                   Versioned project-side workflow definitions
  schemas/                     Scene-plan and catalog schemas
  presets/                     Render, camera, material, and generation profiles
  test/                        Meaningful automated checks
  docs/                        Operating and recovery documentation
  jobs/                        Immutable generated work; not committed by default
```

Payload files are kept under `offline_bundle/payloads` so the project folder can be copied as one unit. Large payloads are excluded from ordinary Git commits because GitHub is not a dependable software/model distribution store. Their catalog, checksums, expected paths, and acquisition sources are committed, which makes the bundle reproducible and auditable. A studio may archive the entire populated folder on local storage.

## Installer behavior

### Phase 1: inventory

The installer detects operating system, architecture, GPU and VRAM, driver capability, free disk space, installed host applications, runtime versions, existing local models, and project configuration. It writes a new timestamped report and changes nothing during this phase.

Detection must use defined paths, application registries, executable version checks, and catalog rules. A broad, uncontrolled disk search is forbidden.

### Phase 2: plan

The installer compares inventory against a selected installation profile, such as:

- `animatic-minimum`
- `animatic-generative`
- `full-vfx-research`
- `custom`

It shows required, present, incompatible, missing, optional, and blocked components; required disk space; payload availability; and whether a restart may be required. The plan is saved before installation begins.

### Phase 3: acquire

Online mode downloads approved payloads into `offline_bundle/cache`, verifies checksums and expected size, then promotes them into their canonical payload folders without replacing an existing file. A different binary gets a versioned filename and a new catalog entry.

Offline mode never enters this phase. Any missing required payload causes a clear stop.

### Phase 4: install

Components are installed in dependency order. Each completed component creates a receipt containing version, source payload, checksum, destination, command result, and time. A resumed installation reads receipts and continues safely.

Python dependencies must be installed from pinned wheels into a project-owned environment when possible. Offline wheel installation uses `--no-index` and an explicit `--find-links` directory. It must never fall back to an online package index.

### Phase 5: verify

Verification runs representative checks: application launch/version, Blender background Python execution, GPU rendering capability, model file readability, ComfyUI graph validation, local server binding, a minimal scene build, and a short test animatic. Results are saved as a new report.

### Phase 6: configure

The installer creates a machine-local configuration containing resolved executable, model, cache, and output paths. It does not alter tracked templates or another machine's configuration. Configuration changes are versioned or backed up additively.

## Portable bundle preparation

Preparing a machine for offline transfer is a deliberate command, not a side effect hidden in development. It performs these steps:

1. Resolve the chosen installation profile and all transitive dependencies.
2. Download exact approved versions.
3. Collect all Python wheels for the target Python, operating system, and architecture.
4. Collect model files and every paired encoder, tokenizer, VAE, or configuration file.
5. Collect pinned ComfyUI and custom-node packages plus tested workflows.
6. Generate SHA-256 checksums and an inventory report.
7. Verify the bundle by simulating offline resolution with network access disabled at the application level.
8. Produce a human-readable missing/complete report.

A bundle is called **complete** only for a named profile and platform. “Complete” without those qualifiers is meaningless.

## Application layers

### Direction layer

The operator writes creative intent in natural language. The system may ask focused questions when ambiguity materially changes the shot. It retains the original prompt and all revisions.

### Planning layer

A deterministic parser provides a dependable minimum. A local language model adds richer interpretation. Both produce the same validated scene-plan schema, so switching models cannot bypass the safety boundary.

### 3D execution layer

Blender creates scenes from known operations: assets, primitives, transforms, constraints, animation, materials, lighting, cameras, simulations, render passes, and output settings. Executors are versioned and tested against pinned Blender versions.

### Review and iteration layer

Every run has an ID, parent ID when iterating, prompt, plan, executor version, machine profile, logs, Blender file, outputs, and status history. Review actions create a new version. Approved versions are marked through metadata rather than renaming or moving their files.

### Generative finishing layer

ComfyUI workflows consume controlled 3D passes and create new versioned outputs. Workflow JSON, model identifiers, seeds, prompts, samplers, resolutions, frame rates, and conditioning inputs are retained so results can be reconstructed.

## Quality priorities

For animatics, prioritize readable staging, stable identities, correct timing, useful camera motion, consistent scale, and generation-friendly control passes over photorealism.

For final 3D, prioritize deterministic scene reconstruction, physically coherent lighting, color-managed output, temporal stability, compositing flexibility, and recoverable render jobs.

For generated video, prioritize temporal consistency, adherence to motion and camera, reproducibility, and preservation of source 3D evidence. A visually attractive frame is insufficient if the sequence cannot remain stable.

## Repository and storage policy

GitHub stores source code, schemas, small presets, workflow definitions, documentation, catalogs, checksum lists, and tests. It does not serve as the primary home for multi-gigabyte models, application installers, caches, renders, or job folders.

The populated `offline_bundle` and `jobs` directories travel through studio-controlled storage. The committed catalog makes clear what each external payload contains and where it belongs. If large-file versioning is later introduced, it must remain optional and must not weaken the one-folder offline transfer model.

## Definition of done

The system is ready for offline transfer when a clean supported machine can:

1. copy one prepared project folder;
2. choose Offline installation;
3. receive a complete preflight report;
4. install without any network request;
5. launch the local application;
6. enter written direction;
7. produce a versioned Blender scene and animatic;
8. pass that animatic and its control data through a pinned local ComfyUI workflow;
9. reproduce the result from retained plans, versions, models, settings, and seeds;
10. complete all of the above without deleting, moving, or overwriting earlier work.
