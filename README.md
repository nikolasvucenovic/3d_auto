# 3D Auto

3D Auto is a fully local text-to-Blender workstation for VFX research. A written scene description becomes a versioned scene plan, a Blender file, and either a fast animatic or a final-quality render.

The project's governing purpose, research-first process, portability, installation, dependency-storage, and preservation rules are defined in [MANIFESTO.md](MANIFESTO.md). New architecture and installer decisions must conform to it. The initial comparison of existing systems and recommended direction is in [RESEARCH.md](RESEARCH.md).

The current `0.1.0` foundation prioritizes the animatic path:

1. Enter a scene description in the local web interface.
2. The offline scene compiler creates a structured JSON plan.
3. Every request receives a new folder under `jobs/`; previous jobs are never reused or deleted.
4. Blender builds the scene in an isolated background process, saves a new `.blend`, and renders an MP4.
5. The resulting animatic can later feed a local ComfyUI video-to-video workflow.

## Safety model

- Each run creates a new job directory.
- Source files and prior outputs are never deleted, moved, or overwritten.
- Blender starts with an empty scene and only saves inside the new job folder.
- External commands use argument arrays rather than shell interpolation.
- The app does not need internet access.

## Start

Install Blender, or set its executable path in `config.local.json` based on `config.example.json`. Then run:

```powershell
cd C:\PROJECTS\3d_auto
node src/server.mjs
```

Open <http://127.0.0.1:4312>.

If Blender has not been installed yet, requests are still compiled and saved. The interface shows `planned` instead of `rendered` and gives the expected Blender command.

## Text currently understood

The first compiler handles common primitives (`cube`, `sphere`, `cylinder`, `cone`, and `plane`), basic colors, relative layout (`left`, `right`, `front`, `back`, `above`), scale, duration, FPS, and simple animation language such as `spin`, `rotate`, `move right`, `rise`, `fall`, and `bounce`.

Example:

> Create a large red sphere on the left and a blue cube on the right. The sphere spins while the cube rises. Add a ground plane. Make an 8 second animatic at 24 fps.

This deterministic compiler is the safe fallback. The next layer will add a local language model that produces the same validated scene-plan format, enabling richer direction without changing the Blender execution boundary.

## Output layout

```text
jobs/
  20260911T120000_scene-description/
    request.json
    scene-plan.json
    events/
    output/
      scene.blend
      animatic.mp4
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the intended system and development sequence.
