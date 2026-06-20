import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";

const baseTargetUrl = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:5173/";
const width = Number(process.env.SMOKE_WIDTH ?? 1440);
const height = Number(process.env.SMOKE_HEIGHT ?? 1100);
const configuredPort = process.env.SMOKE_CDP_PORT ? Number(process.env.SMOKE_CDP_PORT) : null;
const port = configuredPort ?? (await findFreePort());
const profileDir = path.join(os.tmpdir(), `dental-crm-workspace-live-routes-${process.pid}`);
const screenshotDir = process.env.SMOKE_SCREENSHOT_DIR ?? "test-results/workspace-live-routes";

const routes = [
  { hash: "shift", rootSelector: "#shift.shift-hero", readySelectors: [".next-actions button", ".patient-cockpit"] },
  { hash: "schedule", rootSelector: "#schedule.schedule-panel", readySelectors: ['[data-testid="schedule-shift-summary"]'] },
  { hash: "patients", rootSelector: "#patients.patients-panel", readySelectors: [".quick-create input", ".patient-list"] },
  {
    hash: "imaging",
    rootSelector: "#imaging.imaging-panel",
    readySelectors: ['[data-testid="imaging-pick-dicom-folder"]', '[data-testid="imaging-pick-dicom-files"]']
  },
  { hash: "visit", rootSelector: "#visit.visit-panel", readySelectors: [".tooth-map", ".dictation-actions button"] },
  { hash: "documents", rootSelector: "#documents.documents-panel", readySelectors: [".document-factory"] },
  { hash: "finance", rootSelector: "#finance.finance-panel", readySelectors: ["#payment-capture", ".finance-scope-label"] },
  { hash: "communications", rootSelector: "#communications.communications-panel", readySelectors: [".communication-layout"] },
  { hash: "settings", rootSelector: "#settings.settings-zone", readySelectors: [".settings-tabs button", ".settings-tab-panel"] }
];

const browserCandidates = [
  process.env.BROWSER_BIN,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/microsoft-edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);

const browserPath = browserCandidates.find((candidate) => existsSync(candidate));
if (!browserPath) {
  throw new Error("No Chromium/Edge browser found. Set BROWSER_BIN to run the workspace live routes smoke test.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function routeUrl(hash) {
  const url = new URL(baseTargetUrl);
  url.hash = hash;
  return url.href;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const selectedPort = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(selectedPort));
    });
  });
}

async function fetchJson(url, attempts = 80) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

function connectCdp(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) {
      events.push(message);
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };

  const opened = new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error("CDP websocket failed"));
  });

  return {
    opened,
    events,
    send(method, params = {}) {
      id += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      socket.close();
    }
  };
}

async function waitFor(cdp, expression, label, attempts = 80) {
  let snapshot = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    snapshot = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true
    });
    if (snapshot.result.value) return snapshot.result.value;
    await sleep(250);
  }
  throw new Error(`${label} did not become ready: ${JSON.stringify(snapshot?.result?.value ?? null)}`);
}

async function cleanup(browser) {
  if (!browser.killed) browser.kill();
  await Promise.race([new Promise((resolve) => browser.once("exit", resolve)), sleep(2_000)]);
  await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}

function routeReadyExpression(route) {
  return `(() => {
    const root = document.querySelector(${JSON.stringify(route.rootSelector)});
    const routeError = document.querySelector(".workspace-route-error");
    const activeNav = document.querySelector('.nav-item[aria-current="page"]') || document.querySelector(".nav-item.active");
    const activeHref = activeNav ? activeNav.getAttribute("href") : null;
    const currentHash = window.location.hash.replace(/^#/, "").split("/")[0];
    const readySelectors = ${JSON.stringify(route.readySelectors)};
    const missingReadySelectors = readySelectors.filter((selector) => !document.querySelector(selector));
    if (!root || routeError || root.getAttribute("aria-busy") === "true" || activeHref !== "#${route.hash}" || currentHash !== "${route.hash}" || missingReadySelectors.length) {
      return null;
    }
    const visibleButtons = Array.from(root.querySelectorAll("button, a, input, select, textarea")).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    }).length;
    return {
      hash: "${route.hash}",
      activeHref,
      currentHash,
      rootSelector: ${JSON.stringify(route.rootSelector)},
      rootTextLength: root.innerText.trim().length,
      visibleControls: visibleButtons
    };
  })()`;
}

await mkdir(profileDir, { recursive: true });
await mkdir(screenshotDir, { recursive: true });

let browserStderr = "";
const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    `--window-size=${width},${height}`,
    routeUrl(routes[0].hash)
  ],
  { stdio: ["ignore", "ignore", "pipe"] }
);
browser.stderr?.on("data", (chunk) => {
  browserStderr = `${browserStderr}${chunk.toString("utf8")}`.slice(-4_000);
});

try {
  const browserExitFailure = new Promise((_, reject) => {
    browser.once("exit", (code, signal) => {
      const stderrTail = browserStderr.trim();
      reject(
        new Error(
          `Browser exited before CDP became ready (code=${code ?? "null"}, signal=${signal ?? "null"})${
            stderrTail ? `: ${stderrTail.slice(-1_000)}` : ""
          }`
        )
      );
    });
  });

  const targets = await Promise.race([fetchJson(`http://127.0.0.1:${port}/json/list`), browserExitFailure]);
  const pageTarget = targets.find((target) => target.type === "page") ?? targets[0];
  if (!pageTarget?.webSocketDebuggerUrl) throw new Error("No page CDP target found");

  const cdp = connectCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

  const results = [];
  for (const route of routes) {
    await cdp.send("Page.navigate", { url: routeUrl(route.hash) });
    await waitFor(
      cdp,
      `(() => document.readyState === "complete" && Boolean(document.querySelector(".app-shell")))()`,
      `${route.hash} app shell`
    );
    const result = await waitFor(cdp, routeReadyExpression(route), `${route.hash} workspace route`);
    const screenshotPath = path.join(screenshotDir, `${route.hash}.png`);
    const capture = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(screenshotPath, Buffer.from(capture.data, "base64"));
    results.push({ ...result, screenshot: screenshotPath });
  }

  cdp.close();
  console.log(
    JSON.stringify({
      ok: true,
      guard: "workspace-live-routes",
      checkedRoutes: results.length,
      routes: results
    })
  );
} finally {
  await cleanup(browser);
}
