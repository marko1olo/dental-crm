import fs from "node:fs";
import path from "node:path";

function checkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "__tests__" && e.name !== "node_modules") checkDir(full);
    } else if (/\.(tsx|ts)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      const content = fs.readFileSync(full, "utf8");
      const lines = content.split("\n").length;
      if (lines > 120) {
        console.log(`${lines} lines: ${full}`);
      }
    }
  }
}

checkDir("apps/web/src/components/patients");
