# -*- coding: utf-8 -*-
"""Find remaining bare req.body casts vs already-guarded safeParse in apps/api routes."""
from pathlib import Path
import re

root = Path(r"apps/api/src/routes")
if not root.exists():
    root = Path(r"C:\Clinic_MVP\dental-crm\apps\api\src\routes")

cast_re = re.compile(r"req\.body\s+as\s+")
parse_re = re.compile(r"(?:safeParse|\.parse)\(\s*req\.body")
as_record = re.compile(r"as\s+Record<\s*string")

results = []
for p in sorted(root.rglob("*.ts")):
    if p.name.endswith(".test.ts") or ".test." in p.name:
        continue
    text = p.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    for i, ln in enumerate(lines, 1):
        if "req.body" not in ln and "request.body" not in ln:
            continue
        # context window
        prev = "\n".join(lines[max(0, i - 8) : i])
        nxt = "\n".join(lines[i - 1 : min(len(lines), i + 6)])
        kind = None
        if cast_re.search(ln) or ("req.body as" in ln) or ("as any" in ln and "body" in ln):
            kind = "CAST"
        elif "req.body" in ln and ("as " in ln):
            kind = "CASTish"
        elif ".parse(req.body" in ln or "safeParse(req.body" in ln:
            kind = "PARSE"
        elif "req.body" in ln and ("safeParse" in prev or "safeParse" in nxt):
            kind = "NEAR_SAFE"
        else:
            continue
        # skip comments
        stripped = ln.strip()
        if stripped.startswith("//") or stripped.startswith("*"):
            continue
        results.append((kind, str(p.relative_to(root.parent.parent.parent) if False else p), i, ln.strip()[:140]))

# Also scan services if any body casts
print("=== CAST / PARSE hits in routes ===")
by = {}
for kind, path, i, ln in results:
    by.setdefault(kind, []).append((path, i, ln))

for kind in ("CAST", "CASTish", "PARSE", "NEAR_SAFE"):
    items = by.get(kind, [])
    print(f"\n## {kind} ({len(items)})")
    for path, i, ln in items[:40]:
        # short path
        sp = path.replace("\\", "/")
        if "routes/" in sp:
            sp = sp[sp.index("routes/") :]
        print(f"  {sp}:{i}: {ln}")

# Focus files mentioned as soft gaps
print("\n=== workspaceProfile / templates / finance quick scan ===")
for name in ("workspaceProfile.ts", "templates.ts", "finance_family.ts", "sterilization.ts", "leads.ts", "visits.ts", "clinical.ts"):
    hits = [x for x in results if name in x[1].replace("\\", "/")]
    print(f"{name}: {len(hits)} hits -> {[h[0] for h in hits]}")
