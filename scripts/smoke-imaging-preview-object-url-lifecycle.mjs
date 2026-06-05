import { readFileSync } from "node:fs";

const source = readFileSync("apps/web/src/App.tsx", "utf8");
const normalizedSource = source.replace(/\r\n/g, "\n");
const start = source.indexOf("const imagingPreviewWorkset =");
const end = source.indexOf("useEffect(() => {\n    const settings = telegramStatus?.settings;", start);

if (start < 0 || end <= start) {
  throw new Error("imaging preview object URL effect not found");
}

const effectSource = source.slice(start, end);
const missing = [];

function requireSnippet(snippet, message) {
  if (!effectSource.includes(snippet)) missing.push(message);
}

function requireSourceSnippet(snippet, message) {
  if (!normalizedSource.includes(snippet)) missing.push(message);
}

requireSnippet("const abortController = new AbortController();", "protected preview fetches must be abortable");
requireSnippet('if (currentView !== "imaging" || !dashboard?.imagingStudies.length) return [];', "preview fetch workset must stay gated to the visible imaging route");
requireSnippet("const imagingPreviewWorkset = useMemo(() =>", "preview fetches must use a memoized visible workset");
requireSnippet("imagingPreviewWorkset.map(async (study)", "preview fetches must not scan every dashboard image on app boot");
requireSnippet("if (!imagingPreviewWorkset.length)", "preview URL map must clear when the imaging route has no visible workset");
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

requireSourceSnippet("function downloadDicomViewerToolStateBundle()", "DICOM tool-state download helper missing");
requireSourceSnippet("function downloadDicomWorkbenchManifest()", "DICOM workbench download helper missing");
requireSourceSnippet("revokeObjectUrlIfNeeded(url);", "DICOM download blob URLs must route through the central object URL revoke helper");
requireSourceSnippet(
  "link.download = `dicom_tool_state_${seriesPart}.json`;\n      document.body.append(link);\n      link.click();\n    } finally {\n      link.remove();\n      revokeObjectUrlIfNeeded(url);\n    }",
  "DICOM tool-state download blob URL must be revoked in finally"
);
requireSourceSnippet(
  "link.download = `dicom_workbench_${seriesPart}.json`;\n      document.body.append(link);\n      link.click();\n    } finally {\n      link.remove();\n      revokeObjectUrlIfNeeded(url);\n    }",
  "DICOM workbench download blob URL must be revoked in finally"
);

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
