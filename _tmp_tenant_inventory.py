import re
from pathlib import Path

files = [
    Path(r"apps/api/src/db/schema.ts"),
    Path(r"apps/api/src/db/communicationsSchema.ts"),
    Path(r"apps/api/src/db/patientsSchema.ts"),
]

pattern = re.compile(r"export const (\w+)\s*=\s*pgTable\(")

for path in files:
    src = path.read_text(encoding="utf-8")
    matches = list(pattern.finditer(src))
    print(f"FILE {path} count={len(matches)}")
    for m in matches:
        name = m.group(1)
        start = m.start()
        line = src.count("\n", 0, start) + 1
        after = src[m.end() : m.end() + 120]
        tm = re.match(r"\s*[\"']([^\"']+)[\"']", after)
        tname = tm.group(1) if tm else "?"
        brace = src.find("{", m.end())
        depth = 0
        end = brace
        for i, ch in enumerate(src[brace:], brace):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        body = src[brace : end + 1]
        # Column definition only
        has_col = re.search(r"organizationId\s*:\s*uuid\(", body) is not None
        refs = re.findall(r"references\(\(\)\s*=>\s*(\w+)\.", body)
        # also bare .references without nested sometimes
        flag = "HAS" if has_col else "MISS"
        print(f"{flag}\t{name}\t{tname}\tL{line}\trefs={','.join(refs[:12])}")
    print()
