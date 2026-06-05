import { readFile } from "node:fs/promises";

const swSource = await readFile("apps/web/public/sw.js", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`${label} missing marker: ${marker}`);
  }
}

function assertNotIncludes(source, marker, label) {
  if (source.includes(marker)) {
    throw new Error(`${label} still includes forbidden marker: ${marker}`);
  }
}

[
  'const SHELL_CACHE = "dental-crm-shell-v4"',
  "const MAX_DYNAMIC_SHELL_CACHE_ENTRIES = 80",
  "function isForbiddenRuntimeResponse(url)",
  'url.pathname.startsWith("/api/")',
  "medical-documents",
  "dcm|dicom|stl|obj|ply|glb|gltf|nii|nrrd|mhd|raw",
  "function isCacheableShellAsset(url)",
  "function isNetworkFirstShellAsset(url)",
  "SHELL_ASSETS.includes(url.pathname)",
  "/^\\/assets\\/[-A-Za-z0-9_./]+(?:\\.js|\\.css|\\.svg|\\.png|\\.webp|\\.woff2?)$/.test(url.pathname)",
  "async function putShellCache(request, response)",
  "dynamicKeys.length <= MAX_DYNAMIC_SHELL_CACHE_ENTRIES",
  "cache.delete(key)",
  "async function recoverShellCacheForClientRefresh()",
  "await Promise.all(dynamicKeys.map((key) => cache.delete(key)))",
  "await cache.addAll(SHELL_ASSETS)",
  "Keep existing core fallbacks when the operator is already offline.",
  'event.data?.type === "DENTE_CLEAR_SHELL_CACHE"',
  "recoverShellCacheForClientRefresh().then",
  "if (!isCacheableShellAsset(url))",
  "event.respondWith(fetch(request));"
].forEach((marker) => assertIncludes(swSource, marker, "Service worker bounded shell cache contract"));

[
  "caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))",
  "if (response.ok && response.type !== \"opaque\") {\n            const copy = response.clone();\n            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));"
].forEach((marker) => assertNotIncludes(swSource, marker, "Service worker must not cache every same-origin GET"));

const smokeCommand = packageJson.scripts?.["smoke:web-service-worker-cache-source"];
if (smokeCommand !== "node scripts/smoke-web-service-worker-cache-source.mjs") {
  throw new Error("package.json missing smoke:web-service-worker-cache-source");
}

console.log("web service worker cache source smoke passed");
