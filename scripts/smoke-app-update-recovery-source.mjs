import { readFile } from "node:fs/promises";

const swSource = await readFile("apps/web/public/sw.js", "utf8");
const mainSource = await readFile("apps/web/src/main.tsx", "utf8");
const appShellSource = await readFile("apps/web/src/AppShell.tsx", "utf8");
const routeBoundarySource = await readFile("apps/web/src/workspaceRouteErrorBoundary.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

function requireIn(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`${label} missing marker: ${marker}`);
}

function forbidIn(source, marker, label) {
  if (source.includes(marker)) throw new Error(`${label} includes forbidden marker: ${marker}`);
}

[
  'const SHELL_CACHE = "dental-crm-shell-v4"',
  "function isForbiddenRuntimeResponse(url)",
  'url.pathname.startsWith("/api/")',
  "medical-documents",
  "dcm|dicom|stl|obj|ply|glb|gltf|nii|nrrd|mhd|raw",
  "function isNetworkFirstShellAsset(url)",
  'event.data?.type === "DENTE_SKIP_WAITING"',
  'event.data?.type === "DENTE_CLEAR_SHELL_CACHE"',
  'event.source?.postMessage?.({ type: "DENTE_SHELL_CACHE_CLEARED" })'
].forEach((marker) => requireIn(swSource, marker, "Service worker update/stale recovery contract"));

[
  'const DENTE_SW_RELOAD_MARKER = "dente:sw-controller-reload"',
  "function requestDenteServiceWorkerActivation",
  'worker?.postMessage({ type: "DENTE_SKIP_WAITING" })',
  "function reloadOnceAfterServiceWorkerControllerChange",
  'window.sessionStorage.setItem(DENTE_SW_RELOAD_MARKER, "1")',
  'navigator.serviceWorker.addEventListener("controllerchange", reloadOnceAfterServiceWorkerControllerChange)',
  'registration.addEventListener("updatefound"',
  'installingWorker.addEventListener("statechange"',
  'installingWorker.state === "installed"',
  "void registration.update().catch",
  "30 * 60 * 1000"
].forEach((marker) => requireIn(mainSource, marker, "Main service worker update recovery contract"));

[
  "function requestDenteStaleAppRefresh",
  'postMessage({ type: "DENTE_CLEAR_SHELL_CACHE" })',
  "window.setTimeout(() => window.location.reload(), 50)",
  "onClick={requestDenteStaleAppRefresh}"
].forEach((marker) => requireIn(appShellSource, marker, "App shell stale chunk recovery affordance"));

[
  "function requestDenteStaleWorkspaceRefresh",
  'postMessage({ type: "DENTE_CLEAR_SHELL_CACHE" })',
  "window.setTimeout(() => window.location.reload(), 50)",
  "onClick={requestDenteStaleWorkspaceRefresh}"
].forEach((marker) => requireIn(routeBoundarySource, marker, "Workspace route stale chunk recovery affordance"));

[
  "onClick={() => window.location.reload()}"
].forEach((marker) => {
  forbidIn(appShellSource, marker, "App shell must clear shell cache before manual stale refresh");
  forbidIn(routeBoundarySource, marker, "Workspace route must clear shell cache before manual stale refresh");
});

if (packageJson.scripts?.["smoke:app-update-recovery-source"] !== "node scripts/smoke-app-update-recovery-source.mjs") {
  throw new Error("package.json missing smoke:app-update-recovery-source");
}

if (packageJson.scripts?.["smoke:web-service-worker-runtime"] !== "node scripts/smoke-web-service-worker-runtime.mjs") {
  throw new Error("package.json missing smoke:web-service-worker-runtime");
}

console.log("app update recovery source smoke passed");
