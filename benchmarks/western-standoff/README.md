# Western standoff comprehensive benchmark

This benchmark compares a Codex-authored Blender script with a script produced by the bundled local model from the same frozen brief. It is deliberately separate from the trusted scene-plan path because it evaluates complete Blender Python generation.

## Frozen brief

Create one self-contained `western_standoff.py` for Blender 5.2 that runs headless or in the Scripting workspace, generates everything from primitives without external assets, and saves `western_standoff.blend` beside the script. A top-level `QUALITY = "preview"` switch controls 960×402/8-sample fast settings versus 2048×858/64-sample final settings, volumetrics, depth of field, shadows, ray tracing, and 20 versus 60 desert plants.

The project is 24 fps, frames 1–720, EEVEE selected by probing the available render-engine enum, 2.39:1, reproducible with random seed 42, modest in object count, instanced for repeated dressing, and organized into `TOWN`, `CHARACTERS`, `DESERT`, `CAMERAS`, and `LIGHTING`. Materials are flat colors with no textures; no subdivision is allowed.

Build an east-west 60×12 m western street with 6–8 varied false-front buildings, boardwalks, porch posts, roofs, saloon, general store, livery, west-end church and open bell tower with a swinging cone-and-torus bell, hitching posts, trough, barrels, crates, wagon wheels, desert, non-intersecting cacti/scrub driven by quality, and 3–4 wireframe tumbleweeds.

Build proxy Black Hat at the east end and White Hat at the west end, 20 m apart, with distinct hat and coat colors, readable ready poses, holsters, revolvers, and gun-arm parent empties. Use a low warm east sun at 8–12 degrees so Black Hat is backlit, White Hat front-lit, shadows rake west, and the bell tower catches early light. Use a cool sky, subtle bounce, clear air in preview, light volumetrics in final, exposure lift, and AgX/Filmic highlight handling.

Create sixteen cameras and bind them with timeline camera markers:

1. 1–96: high wide from behind church; slow crane down and push.
2. 97–168: locked wide two-shot down street.
3. 169–216: low medium Black Hat; slow dolly.
4. 217–264: mirrored low medium White Hat; slow dolly.
5. 265–300: Black Hat hand/holster detail with slight drift.
6. 301–336: White Hat hand detail with slight drift.
7. 337–384: Black Hat eye ECU with slow push.
8. 385–432: White Hat eye ECU with slow push.
9. 433–480: lit bell tower; tilt up while bell sways.
10. 481–528: low tumbleweed track through street.
11. 529–552: Black Hat eye ECU with snap push.
12. 553–576: White Hat eye ECU with snap push.
13. 577–600: boots, spurs, dust, and long shadows.
14. 601–648: profile two-shot with slow lateral dolly.
15. 649–684: draw with whip pan / snap zoom.
16. 685–720: final wide with one standing, one falling, dust/smoke, slow pullback.

Animate bell, rolling tumbleweeds without skidding, subtle character idle motion, draw, fall, and dust. Camera motion uses ease in/out; snap moves use sharp easing. Print the fast H.264 preview command and a summary containing object count, shot count, frame range, quality, resolution, and saved path. Opening the blend should show a useful view.

## Safety and evidence

Both scripts are retained verbatim. Before execution, the runner rejects syntax errors, imports outside an allowlist, dynamic execution, process/network APIs, and filesystem deletion or replacement. Blender runs with factory startup and auto-execution disabled in a new result folder. A separate trusted evidence script renders one frame from each of the sixteen bound cameras. Reports must label the author as `CODEX` or `LOCAL MODEL`.

The local runner preserves `western_standoff.local.raw.py`, writes the executable candidate separately, and records every deterministic Blender 5.2 adaptation in `western_standoff-adapter.json`. This adapter is part of the measured result: it may repair known API shapes, bind declared shot cameras, and fill mechanically missing values, but it does not improve creative scene content.

Run locally without Codex tokens:

```powershell
.\Run Western Standoff Local Test.bat
```

Success requires the audited script, `western_standoff.blend`, `evidence/evidence.json`, and sixteen rendered frames. Blender’s process exit code is insufficient because Blender 5.2 can return zero after a Python traceback. All failed attempts remain in their timestamped result folders.

Verified on 2026-09-12: the untouched BAT completed using bundled Node with global Node absent from `PATH`. The seeded local result produced 84 objects and sixteen bound cameras after logged adaptation. The Codex reference produced 142 objects. The side-by-side report path is recorded in [CONTINUITY.md](../../CONTINUITY.md).

The local runner preserves `western_standoff.local.raw.py`, writes the executable candidate separately, and records every deterministic Blender 5.2 adaptation in `western_standoff-adapter.json`. This adapter is part of the measured result: it may repair known API shapes, bind declared shot cameras, and fill mechanically missing values, but it does not improve creative scene content.

Run locally without Codex tokens:

```powershell
.\Run Western Standoff Local Test.bat
```

Success requires the audited script, `western_standoff.blend`, `evidence/evidence.json`, and sixteen rendered frames. Blender’s process exit code is insufficient because Blender 5.2 can return zero after a Python traceback. All failed attempts remain in their timestamped result folders.

Verified on 2026-09-12: the untouched BAT completed using bundled Node with global Node absent from `PATH`. The seeded local result produced 84 objects and sixteen bound cameras after logged adaptation. The Codex reference produced 142 objects. The side-by-side report path is recorded in [CONTINUITY.md](../../CONTINUITY.md).
