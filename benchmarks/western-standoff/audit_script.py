"""Static safety gate for quarantined Blender-script benchmark outputs."""

import ast
import sys

path = sys.argv[sys.argv.index("--") + 1]
source = open(path, "r", encoding="utf-8").read()
tree = ast.parse(source, filename=path)
allowed_imports = {"bpy", "math", "random", "mathutils", "os"}
banned_names = {"eval", "exec", "compile", "__import__", "breakpoint"}
banned_modules = {"subprocess", "socket", "requests", "urllib", "ctypes", "shutil", "pathlib", "multiprocessing"}
banned_os_calls = {"remove", "unlink", "rename", "replace", "rmdir", "removedirs", "system", "popen", "spawnl", "spawnv"}
errors = []


def dotted(node):
    parts = []
    while isinstance(node, ast.Attribute):
        parts.append(node.attr)
        node = node.value
    if isinstance(node, ast.Name):
        parts.append(node.id)
    return ".".join(reversed(parts))


for node in ast.walk(tree):
    if isinstance(node, (ast.Import, ast.ImportFrom)):
        names = [alias.name.split(".")[0] for alias in node.names] if isinstance(node, ast.Import) else [(node.module or "").split(".")[0]]
        for name in names:
            if name not in allowed_imports:
                errors.append(f"line {node.lineno}: import is not allowed: {name}")
    if isinstance(node, ast.Call):
        name = dotted(node.func)
        root = name.split(".")[0]
        if name in banned_names or root in banned_modules:
            errors.append(f"line {node.lineno}: call is not allowed: {name}")
        if name.startswith("os.") and name.split(".")[-1] in banned_os_calls:
            errors.append(f"line {node.lineno}: filesystem/process call is not allowed: {name}")

if 'QUALITY = "preview"' not in source and "QUALITY = 'preview'" not in source:
    errors.append('top-level QUALITY = "preview" switch was not found')
required_fragments = {
    "bpy.ops.wm.save_as_mainfile": "final save call",
    "timeline_markers.new": "timeline camera markers",
    '"TOWN"': "TOWN collection",
    '"CHARACTERS"': "CHARACTERS collection",
    '"DESERT"': "DESERT collection",
    '"CAMERAS"': "CAMERAS collection",
    '"LIGHTING"': "LIGHTING collection",
}
for fragment, label in required_fragments.items():
    if fragment not in source:
        errors.append(f"required completion marker was not found: {label}")

line_counts = {}
for line in source.splitlines():
    normalized = line.strip()
    if len(normalized) >= 12 and not normalized.startswith("#"):
        line_counts[normalized] = line_counts.get(normalized, 0) + 1
for line, count in line_counts.items():
    if count > 24:
        errors.append(f"probable repetition loop: line occurs {count} times: {line[:100]}")
if errors:
    print("AUDIT FAILED")
    for error in errors:
        print(error)
    raise SystemExit(1)
print(f"AUDIT PASSED {path}")
