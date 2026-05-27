import { readFileSync } from "node:fs";

const mainSource = readFileSync("apps/web/src/main.tsx", "utf8");
const shellSource = readFileSync("apps/web/src/AppShell.tsx", "utf8");
const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const viteSource = readFileSync("apps/web/vite.config.ts", "utf8");

const missing = [];

if (!mainSource.includes('import { AppShell } from "./AppShell";')) {
  missing.push("main.tsx must import AppShell");
}

if (mainSource.includes('from "./App";')) {
  missing.push("main.tsx must not synchronously import the heavy workspace");
}

if (!shellSource.includes('lazy(() => import("./App")')) {
  missing.push("AppShell must lazy-load App.tsx");
}

if (!shellSource.includes("module.App")) {
  missing.push("AppShell must map the named App export");
}

if (!shellSource.includes("<Suspense")) {
  missing.push("AppShell must keep a Suspense fallback");
}

if (!shellSource.includes('aria-busy="true"')) {
  missing.push("AppShell loading state must expose busy state");
}

if (!shellSource.includes("<h1>DENTE</h1>")) {
  missing.push("AppShell loading state must use the DENTE brand spelling");
}

if (/\?{4,}/.test(appSource)) {
  missing.push("Lazy route fallbacks must not expose question-mark mojibake to users");
}

for (const label of ["Расписание", "Быстрый поиск", "Документы и согласия", "Настройки"]) {
  if (!appSource.includes(label)) {
    missing.push(`App.tsx lazy route fallback missing readable label: ${label}`);
  }
}

if (!viteSource.includes("normalizedId.endsWith(\"/apps/web/src/App.tsx\")")) {
  missing.push("vite config must route App.tsx into a workspace chunk");
}

if (!viteSource.includes("return \"workspace\"")) {
  missing.push("vite config must name the heavy lazy chunk");
}

if (!viteSource.includes("return \"boot-state\"")) {
  missing.push("vite config must split boot states out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"workspace-shell\"")) {
  missing.push("vite config must split workspace shell chrome out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"clinical-rules\"")) {
  missing.push("vite config must split clinical rule panel out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"settings-static-data\"")) {
  missing.push("vite config must split bulky settings static data out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"visit-specialty-data\"")) {
  missing.push("vite config must split visit specialty static data out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"visit-dictation-data\"")) {
  missing.push("vite config must split visit dictation static data out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"post-visit-care-data\"")) {
  missing.push("vite config must split post-visit care static data out of the heavy workspace chunk");
}

if (!viteSource.includes("return \"communication-task-data\"")) {
  missing.push("vite config must split communication task static data out of the heavy workspace chunk");
}

if (missing.length > 0) {
  console.error("Web code split smoke failed:");
  for (const entry of missing) console.error(`- ${entry}`);
  process.exit(1);
}

console.log({
  mainImportsShell: true,
  lazyWorkspace: true,
  manualWorkspaceChunk: true,
  manualBootAndShellChunks: true,
  manualClinicalRulesChunk: true,
  manualSettingsStaticDataChunk: true,
  manualVisitSpecialtyDataChunk: true,
  manualVisitDictationDataChunk: true,
  manualPostVisitCareDataChunk: true,
  manualCommunicationTaskDataChunk: true,
  readableRouteFallbacks: true
});
