const fs = require("fs");
let code = fs.readFileSync("apps/api/src/db/settingsQuery.ts", "utf8");

// Remove `function useInMemory() { ... }`
code = code.replace(/function useInMemory\(\) \{[\s\S]*?\}/, "");

// Remove `if (useInMemory()) { ... }` (multi-line)
code = code.replace(/if\s*\(useInMemory\(\)\)\s*\{[\s\S]*?\}/g, "");

// Remove `if (useInMemory()) return ...;` (single-line return)
code = code.replace(/if\s*\(useInMemory\(\)\)\s*return[^;]*;/g, "");

// Remove `if (useInMemory()) throw ...;` (single-line throw)
code = code.replace(/if\s*\(useInMemory\(\)\)\s*throw[^;]*;/g, "");

// Remove imports of sampleData.ts
code = code.replace(/import\s*\{[^}]*\}\s*from\s*"..\/sampleData.js";\s*/g, "");

fs.writeFileSync("apps/api/src/db/settingsQuery.ts", code);
console.log("Cleaned settingsQuery.ts");
