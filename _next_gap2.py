# -*- coding: utf-8 -*-
"""Deeper scan: unguarded body access, visits draft, web callers missing message-first."""
from pathlib import Path
import re

api_routes = Path(r"C:\Clinic_MVP\dental-crm\apps\api\src\routes")
web_src = Path(r"C:\Clinic_MVP\dental-crm\apps\web\src")

# 1) Any route file that references req.body without safeParse anywhere nearby
print("=== routes with req.body but NO safeParse in file ===")
for p in sorted(api_routes.rglob("*.ts")):
    if ".test." in p.name:
        continue
    t = p.read_text(encoding="utf-8", errors="replace")
    if "req.body" not in t:
        continue
    has_safe = "safeParse" in t
    body_count = t.count("req.body")
    if not has_safe:
        # find lines
        lines = []
        for i, ln in enumerate(t.splitlines(), 1):
            if "req.body" in ln and not ln.strip().startswith("//") and not ln.strip().startswith("*"):
                lines.append(f"  L{i}: {ln.strip()[:120]}")
        if lines:
            print(f"\n{p.name} body_refs={body_count} safeParse=NO")
            print("\n".join(lines[:15]))

print("\n=== visits.ts body-related ===")
vp = api_routes / "visits.ts"
if vp.exists():
    t = vp.read_text(encoding="utf-8", errors="replace")
    for i, ln in enumerate(t.splitlines(), 1):
        if any(k in ln for k in ("req.body", "safeParse", "autosave", "draft", "schema")):
            if ln.strip().startswith("//") or ln.strip().startswith("*"):
                continue
            print(f"  L{i}: {ln.strip()[:130]}")

print("\n=== web fetch to /api/ that might miss message ===")
# Look for actionFailureToast without operatorReadableErrorDetail nearby in same file for diary-like patterns
patterns = [
    (r'fetch\([`\'"]/api/diaries', "diaries"),
    (r'fetch\([`\'"]/api/workspace', "workspace"),
    (r'fetch\([`\'"]/api/sterilization', "sterilization"),
    (r'fetch\([`\'"]/api/leads', "leads"),
    (r'draft/autosave', "draft_autosave"),
]
for pat, label in patterns:
    rx = re.compile(pat)
    hits = []
    for p in web_src.rglob("*.{ts,tsx}".replace("{ts,tsx}", "*")):
        if p.suffix not in (".ts", ".tsx"):
            continue
        try:
            t = p.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        if not rx.search(t):
            continue
        rel = str(p).replace("\\", "/")
        if "/tests/" in rel or ".test." in p.name:
            continue
        has_msg = "operatorReadableErrorDetail" in t or "payload?.message" in t or "json.message" in t
        hits.append((rel[rel.find("apps/web"):] if "apps/web" in rel else rel, has_msg))
    print(f"\n{label}: {len(hits)} files")
    for rel, has_msg in hits[:20]:
        print(f"  msg_first={has_msg} {rel}")
