import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const srcDir = "apps/web/src";
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");
const files = readdirSync(srcDir)
  .filter((file) => file.endsWith(".tsx"))
  .map((file) => path.join(srcDir, file));

const offenders = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const buttonPattern = /<button\b[\s\S]*?>/g;
  let match;
  while ((match = buttonPattern.exec(source))) {
    const tag = match[0];
    const hasHandler = /\bonClick=|\bonPointer|\bonMouse|\bonSubmit/.test(tag);
    const isSubmit = /type="submit"/.test(tag);
    if (!hasHandler && !isSubmit) {
      const line = source.slice(0, match.index).split(/\n/).length;
      offenders.push({ file, line, tag: tag.replace(/\s+/g, " ").slice(0, 180) });
    }
  }

  const externalLinkPattern = /<a\b[^>]*target="_blank"[^>]*>/g;
  while ((match = externalLinkPattern.exec(source))) {
    const tag = match[0];
    const relMatch = tag.match(/\brel="([^"]*)"/);
    const relTokens = new Set((relMatch?.[1] ?? "").split(/\s+/).filter(Boolean));
    const hasContext = /\baria-label=|\btitle=/.test(tag);
    if (!relTokens.has("noopener") || !relTokens.has("noreferrer") || !hasContext) {
      const line = source.slice(0, match.index).split(/\n/).length;
      offenders.push({ file, line, tag: tag.replace(/\s+/g, " ").slice(0, 180) });
    }
  }
}

if (offenders.length) {
  console.error(JSON.stringify({ ok: false, offenders }, null, 2));
  process.exit(1);
}

if (!cssSource.includes("button:disabled") || !cssSource.includes("cursor: not-allowed;")) {
  throw new Error("Disabled buttons must not look like a loading state; use cursor: not-allowed.");
}

if (cssSource.includes("cursor: wait;")) {
  throw new Error("Global disabled controls must not use cursor: wait.");
}

console.log(JSON.stringify({ ok: true, checkedFiles: files.length, disabledCursorClear: true }, null, 2));
