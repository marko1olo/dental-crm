import { readFileSync } from "node:fs";

const source = readFileSync("apps/web/src/App.tsx", "utf8");
const start = source.indexOf("const imagingPreviewSignature =");
const end = source.indexOf("useEffect(() => {\n    const settings = telegramStatus?.settings;", start);

if (start < 0 || end <= start) {
  throw new Error("imaging preview object URL effect not found");
}

const effectSource = source.slice(start, end);
const missing = [];

function requireSnippet(snippet, message) {
  if (!effectSource.includes(snippet)) missing.push(message);
}

requireSnippet("const abortController = new AbortController();", "protected preview fetches must be abortable");
requireSnippet("signal: abortController.signal", "fetch must use the preview AbortController signal");
requireSnippet("abortController.abort();", "cleanup must abort in-flight preview fetches");
requireSnippet("revokeObjectUrlIfNeeded(blobUrl);", "late blob URLs created after cancellation must be revoked");
requireSnippet("createdUrls.forEach(revokeObjectUrlIfNeeded);", "created preview blob URLs must be revoked on cleanup/error");
requireSnippet("revokeObjectUrlMap(current);", "current preview blob URL map must be revoked before clearing state");
requireSnippet("if (!nextUrls.has(url)) revokeObjectUrlIfNeeded(url);", "replaced preview blob URLs must be revoked");
requireSnippet("headers: denteClinicalReadHeaders()", "protected preview fetches must keep clinical read headers");

if (!source.includes("function revokeObjectUrlIfNeeded(url: string): void")) {
  missing.push("central object URL revoke helper missing");
}

if (!source.includes("function revokeObjectUrlMap(urls: Record<string, string>): void")) {
  missing.push("central object URL map revoke helper missing");
}

if (missing.length > 0) {
  console.error("Imaging preview object URL lifecycle smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  abortablePreviewFetches: true,
  lateBlobRevoke: true,
  stalePreviewRevoke: true
});
