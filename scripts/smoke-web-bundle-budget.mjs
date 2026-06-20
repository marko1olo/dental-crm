import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const assetsDir = "apps/web/dist/assets";

if (!existsSync(assetsDir)) {
  throw new Error("Web bundle budget smoke requires apps/web/dist/assets. Run `npm run build -w @dental/web` first.");
}

const budgets = [
  { name: "workspace", match: /^workspace-(?!(?:continuity|preload|route-boundary|shell|static-options|ui-labels)-)[\w-]+\.js$/, maxBytes: 570_000, maxGzipBytes: 152_000 },
  { name: "browser continuity", match: /^browser-continuity-[\w-]+\.js$/, maxBytes: 12_000, maxGzipBytes: 5_000 },
  { name: "workspace preload", match: /^workspace-preload-[\w-]+\.js$/, maxBytes: 14_000, maxGzipBytes: 6_000 },
  { name: "motion preference", match: /^motion-preference-[\w-]+\.js$/, maxBytes: 4_000, maxGzipBytes: 2_000 },
  { name: "rub amount input", match: /^rub-amount-input-[\w-]+\.js$/, maxBytes: 4_000, maxGzipBytes: 2_000 },
  { name: "settings route", match: /^SettingsView-[\w-]+\.js$/, maxBytes: 260_000, maxGzipBytes: 62_000 },
  { name: "documents route", match: /^DocumentsView-[\w-]+\.js$/, maxBytes: 180_000, maxGzipBytes: 36_000 },
  { name: "ct planning tools", match: /^ct-planning-tools-[\w-]+\.js$/, maxBytes: 18_000, maxGzipBytes: 7_000 },
  { name: "ct planning catalog", match: /^ct-planning-catalog-[\w-]+\.js$/, maxBytes: 14_000, maxGzipBytes: 6_000 },
  { name: "ct planning state", match: /^ct-planning-state-[\w-]+\.js$/, maxBytes: 8_000, maxGzipBytes: 4_000 },
  { name: "ct planning geometry", match: /^ct-planning-geometry-[\w-]+\.js$/, maxBytes: 8_000, maxGzipBytes: 4_000 },
  { name: "ct planning measurement plan", match: /^ct-planning-measurement-plan-[\w-]+\.js$/, maxBytes: 8_000, maxGzipBytes: 4_000 },
  { name: "ct planning measurement panel", match: /^ct-planning-measurement-panel-[\w-]+\.js$/, maxBytes: 5_000, maxGzipBytes: 3_000 },
  { name: "ct planning workflow plan", match: /^ct-planning-workflow-plan-[\w-]+\.js$/, maxBytes: 8_000, maxGzipBytes: 4_000 },
  { name: "ct planning workflow panel", match: /^ct-planning-workflow-panel-[\w-]+\.js$/, maxBytes: 5_000, maxGzipBytes: 3_000 },
  { name: "ct planning implant fit", match: /^ct-planning-implant-fit-(?!panel-)[\w-]+\.js$/, maxBytes: 8_000, maxGzipBytes: 4_000 },
  { name: "ct planning implant fit panel", match: /^ct-planning-implant-fit-panel-[\w-]+\.js$/, maxBytes: 5_000, maxGzipBytes: 3_000 },
  { name: "ct planning implant model", match: /^ct-planning-implant-model-(?!panel-)[\w-]+\.js$/, maxBytes: 10_500, maxGzipBytes: 4_000 },
  { name: "ct planning implant model panel", match: /^ct-planning-implant-model-panel-[\w-]+\.js$/, maxBytes: 5_000, maxGzipBytes: 3_000 },
  { name: "ct planning reconstruction", match: /^ct-planning-reconstruction-(?!panel-)[\w-]+\.js$/, maxBytes: 8_000, maxGzipBytes: 4_000 },
  { name: "ct planning reconstruction panel", match: /^ct-planning-reconstruction-panel-[\w-]+\.js$/, maxBytes: 5_000, maxGzipBytes: 3_000 },
  { name: "ct planning validation", match: /^ct-planning-validation-[\w-]+\.js$/, maxBytes: 8_000, maxGzipBytes: 4_000 },
  { name: "ct planning validation panel", match: /^ct-planning-validation-panel-[\w-]+\.js$/, maxBytes: 5_000, maxGzipBytes: 3_000 },
  { name: "ct planning export", match: /^ct-planning-export-(?!(?:panel|scenario-panel|scenario-summary)-)[\w-]+\.js$/, maxBytes: 10_500, maxGzipBytes: 4_000 },
  { name: "ct planning viewer restore", match: /^ct-planning-viewer-restore-[\w-]+\.js$/, maxBytes: 5_000, maxGzipBytes: 3_000 },
  { name: "ct planning viewer bridge launch", match: /^ct-planning-viewer-bridge-launch-[\w-]+\.js$/, maxBytes: 3_000, maxGzipBytes: 2_000 },
  { name: "ct planning viewer bridge audit", match: /^ct-planning-viewer-bridge-audit-[\w-]+\.js$/, maxBytes: 3_000, maxGzipBytes: 2_000 },
  { name: "ct planning viewer bridge handoff", match: /^ct-planning-viewer-bridge-handoff-[\w-]+\.js$/, maxBytes: 4_000, maxGzipBytes: 2_500 },
  { name: "ct planning export scenario summary", match: /^ct-planning-export-scenario-summary-[\w-]+\.js$/, maxBytes: 5_500, maxGzipBytes: 3_000 },
  { name: "ct planning export scenario panel", match: /^ct-planning-export-scenario-panel-[\w-]+\.js$/, maxBytes: 5_000, maxGzipBytes: 3_000 },
  { name: "ct planning export panel", match: /^ct-planning-export-panel-[\w-]+\.js$/, maxBytes: 12_500, maxGzipBytes: 4_200 },
  { name: "ct planning artifact commands", match: /^ct-planning-artifact-commands-[\w-]+\.js$/, maxBytes: 7_000, maxGzipBytes: 3_500 },
  { name: "ct planning artifact panel", match: /^ct-planning-artifact-panel-[\w-]+\.js$/, maxBytes: 5_000, maxGzipBytes: 3_000 },
  { name: "workspace continuity", match: /^workspace-continuity-[\w-]+\.js$/, maxBytes: 10_000, maxGzipBytes: 5_000 },
  { name: "route recovery", match: /^workspace-route-boundary-[\w-]+\.js$/, maxBytes: 8_000, maxGzipBytes: 4_000 },
  { name: "react vendor", match: /^react-vendor-[\w-]+\.js$/, maxBytes: 230_000, maxGzipBytes: 72_000 },
  { name: "shared schema/vendor", match: /^dental-shared-[\w-]+\.js$/, maxBytes: 210_000, maxGzipBytes: 54_000 },
  { name: "main stylesheet", match: /^index-[\w-]+\.css$/, maxBytes: 200_000, maxGzipBytes: 32_000 }
];

const aggregateBudgets = {
  jsBytes: 1_750_000,
  jsGzipBytes: 470_000,
  totalBytes: 1_950_000,
  totalGzipBytes: 500_000
};

const assets = readdirSync(assetsDir)
  .filter((file) => /\.(js|css)$/.test(file))
  .map((file) => {
    const filePath = path.join(assetsDir, file);
    const source = readFileSync(filePath);
    return {
      file,
      bytes: statSync(filePath).size,
      gzipBytes: gzipSync(source).length,
      kind: file.endsWith(".js") ? "js" : "css"
    };
  });

const failures = [];
const checked = [];
const workspaceAsset = assets.find((asset) => /^workspace-(?!(?:continuity|preload|route-boundary|shell|static-options|ui-labels)-)[\w-]+\.js$/.test(asset.file));
const routeAssetPattern = /^(ScheduleView|PatientsView|DocumentsView|FinanceView|CommunicationsView|SettingsView)-[\w-]+\.js$/;

for (const budget of budgets) {
  const asset = assets.find((candidate) => budget.match.test(candidate.file));
  if (!asset) {
    failures.push(`${budget.name}: expected built asset matching ${budget.match}`);
    continue;
  }
  checked.push({ name: budget.name, file: asset.file, bytes: asset.bytes, gzipBytes: asset.gzipBytes });
  if (asset.bytes > budget.maxBytes) {
    failures.push(`${budget.name}: ${asset.bytes} bytes exceeds ${budget.maxBytes}`);
  }
  if (asset.gzipBytes > budget.maxGzipBytes) {
    failures.push(`${budget.name}: ${asset.gzipBytes} gzip bytes exceeds ${budget.maxGzipBytes}`);
  }
}

const totals = assets.reduce(
  (acc, asset) => {
    acc.totalBytes += asset.bytes;
    acc.totalGzipBytes += asset.gzipBytes;
    if (asset.kind === "js") {
      acc.jsBytes += asset.bytes;
      acc.jsGzipBytes += asset.gzipBytes;
    }
    return acc;
  },
  { jsBytes: 0, jsGzipBytes: 0, totalBytes: 0, totalGzipBytes: 0 }
);

for (const [key, limit] of Object.entries(aggregateBudgets)) {
  if (totals[key] > limit) {
    failures.push(`${key}: ${totals[key]} exceeds ${limit}`);
  }
}

if (workspaceAsset) {
  for (const asset of assets.filter((candidate) => routeAssetPattern.test(candidate.file))) {
    const source = readFileSync(path.join(assetsDir, asset.file), "utf8");
    if (source.includes(`"${workspaceAsset.file}"`) || source.includes(`'${workspaceAsset.file}'`) || source.includes(`./${workspaceAsset.file}`)) {
      failures.push(`${asset.file}: lazy route chunk must not statically import the heavy workspace chunk`);
    }
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, checked, totals, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checked, totals }, null, 2));
