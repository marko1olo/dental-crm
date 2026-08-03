from pathlib import Path

src = Path("apps/api/src/db/schema.ts").read_text(encoding="utf-8")
out = []
for name in ("organizations", "cashLedger"):
    pat = f"export const {name} = pgTable"
    i = src.find(pat)
    line = src.count("\n", 0, i) + 1
    # take ~80 lines
    chunk = src[i : i + 1500]
    out.append(f"===== {name} L{line} =====\n{chunk}\n")

Path("_tmp_miss_dump.txt").write_text("\n".join(out), encoding="utf-8")
print("wrote")
