import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";

const targetUrl = process.argv[2] ?? "http://127.0.0.1:5173/#visit";
const width = Number(process.env.SMOKE_WIDTH ?? 1440);
const height = Number(process.env.SMOKE_HEIGHT ?? 1100);
const configuredPort = process.env.SMOKE_CDP_PORT ? Number(process.env.SMOKE_CDP_PORT) : null;
const port = configuredPort ?? (await findFreePort());
const profileDir = path.join(os.tmpdir(), `dental-crm-visit-live-smoke-${process.pid}`);
const screenshotPath = process.env.SMOKE_SCREENSHOT_PATH ?? "test-results/visit-live-smoke.png";

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
  throw new Error("No Chromium/Edge browser found. Set BROWSER_BIN to run the visit live smoke test.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

await mkdir(profileDir, { recursive: true });
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
    targetUrl
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
  await cdp.send("Page.navigate", { url: targetUrl });

  await waitFor(
    cdp,
    `(() => document.readyState === "complete" && Boolean(document.querySelector(".app-shell")))()`,
    "app shell"
  );
  await waitFor(cdp, `(() => Boolean(document.querySelector(".tooth-map")))()`, "tooth map");
  await waitFor(cdp, `(() => Boolean(document.querySelector(".dictation-actions button")))()`, "dictation actions");

  const clickResult = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const watchTool = document.querySelector(".tooth-map-selected button");
      const tooth24 = Array.from(document.querySelectorAll(".tooth-row button")).find((button) => button.textContent.trim() === "24");
      if (!watchTool || !tooth24) {
        return {
          ok: false,
          reason: "missing_controls",
          hasWatchTool: Boolean(watchTool),
          hasTooth24: Boolean(tooth24),
          bodyText: document.body.innerText.slice(0, 500)
        };
      }
      watchTool.click();
      tooth24.click();
      return {
        ok: true,
        tooth24Class: tooth24.className,
        dictationActionCount: document.querySelectorAll(".dictation-actions button").length,
        pageTitle: document.title
      };
    })()`,
    returnByValue: true
  });
  if (!clickResult.result.value?.ok) {
    throw new Error(`Visit live workflow controls missing: ${JSON.stringify(clickResult.result.value)}`);
  }

  const result = await waitFor(
    cdp,
    `(() => {
      const tooth24 = Array.from(document.querySelectorAll(".tooth-row button")).find((button) => button.textContent.trim() === "24");
      if (!tooth24) return null;
      return tooth24.className.includes("tooth-watch") && tooth24.className.includes("selected")
        ? { tooth24Class: tooth24.className, dictationActionCount: document.querySelectorAll(".dictation-actions button").length }
        : null;
    })()`,
    "tooth 24 watch state"
  );

  await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then(async (capture) => {
    const { writeFile } = await import("node:fs/promises");
    await mkdir(path.dirname(screenshotPath), { recursive: true });
    await writeFile(screenshotPath, Buffer.from(capture.data, "base64"));
  });

  cdp.close();
  console.log(
    JSON.stringify({
      ok: true,
      guard: "visit-live-workflow",
      tooth24Class: result.tooth24Class,
      dictationActionCount: result.dictationActionCount,
      screenshot: screenshotPath
    })
  );
} finally {
  await cleanup(browser);
}
