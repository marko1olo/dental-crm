const fs = require("fs");
const path = require("path");

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else if (full.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(path.join(__dirname, "../apps/web/src"));
let bareButtons = [];

for (const file of files) {
  if (file.includes("test") || file.includes("__tests__")) continue;
  const content = fs.readFileSync(file, "utf8");
  const rel = path.relative(path.join(__dirname, ".."), file);
  const btnMatches = content.match(/<button\b([^>]*)>/g);
  if (btnMatches) {
    for (const m of btnMatches) {
      if (!m.includes("className")) {
        bareButtons.push({ file: rel, tag: m.replace(/\s+/g, " ") });
      }
    }
  }
}

console.log("=== BARE BUTTONS IN PRODUCTION CODE (" + bareButtons.length + ") ===");
bareButtons.forEach(b => console.log(`${b.file} -> ${b.tag}`));
