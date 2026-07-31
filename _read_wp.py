# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(r"apps/api/src/routes/workspaceProfile.ts")
t = p.read_text(encoding="utf-8")
lines = t.splitlines()
print("total", len(lines))
for i, ln in enumerate(lines, 1):
    if any(
        k in ln
        for k in (
            "workspacePresetBodySchema",
            "workspaceFlags",
            "z.object",
            "from \"zod\"",
            "from 'zod'",
            "POST",
            "/api/workspace/profile",
            "workspaceFlagsFromStorage",
        )
    ):
        print(f"{i}: {ln[:140]}")

# test file
tp = Path(r"apps/api/src/tests/routes")
for f in tp.glob("*egisz*") if tp.exists() else []:
    print("test", f.name)
for f in sorted(Path(r"apps/api/src/tests").rglob("*workspace*")):
    print("ws test", f)
for f in sorted(Path(r"apps/api/src/tests").rglob("*egisz*")):
    print("egisz test", f)
