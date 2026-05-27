import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const targetUrl = process.argv[2] ?? "http://127.0.0.1:5173/#settings/sources";
const width = Number(process.env.SMOKE_WIDTH ?? 390);
const height = Number(process.env.SMOKE_HEIGHT ?? 900);
const port = Number(process.env.SMOKE_CDP_PORT ?? 9323);
const requiredSelector = process.env.SMOKE_SELECTOR ?? ".dicom-mpr-workbench";
const requiredLabel = process.env.SMOKE_SELECTOR_LABEL ?? requiredSelector;
const clickSelector = process.env.SMOKE_CLICK_SELECTOR ?? null;
const clickLabel = process.env.SMOKE_CLICK_LABEL ?? clickSelector;
const screenshotPath = process.env.SMOKE_SCREENSHOT_PATH ?? null;
const dismissOnboarding = process.env.SMOKE_DISMISS_ONBOARDING === "1";
const profileDir = path.join(os.tmpdir(), `dental-crm-edge-smoke-${process.pid}`);
const cdpHosts = (process.env.SMOKE_CDP_HOSTS ?? "127.0.0.1,[::1],localhost")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

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
  throw new Error("No Chromium/Edge browser found. Set BROWSER_BIN to run the smoke test.");
}

await mkdir(profileDir, { recursive: true });

const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    `--window-size=${width},${height}`,
    targetUrl
  ],
  { stdio: "ignore" }
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanupBrowserProfile() {
  browser.kill();
  await Promise.race([
    new Promise((resolve) => browser.once("exit", resolve)),
    sleep(2_000)
  ]);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(profileDir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error?.code !== "EBUSY" && error?.code !== "EPERM") throw error;
      await sleep(250);
    }
  }
  try {
    await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  } catch (error) {
    if (error?.code !== "EBUSY" && error?.code !== "EPERM") throw error;
    console.warn(
      JSON.stringify({
        warning: "Temporary browser profile cleanup skipped because Windows still holds a browser file lock.",
        path: profileDir,
        code: error.code
      })
    );
  }
}

async function fetchJson(url, attempts = 40) {
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

async function fetchCdpJson(pathname, attempts = 40) {
  let lastError;
  for (const host of cdpHosts) {
    try {
      return await fetchJson(`http://${host}:${port}${pathname}`, attempts);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Failed to fetch CDP ${pathname}`);
}

function normalizedWebSocketUrl(wsUrl) {
  return wsUrl.replace("[0000:0000:0000:0000:0000:0000:0000:0001]", "[::1]");
}

function connectCdp(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
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

try {
  const targets = await fetchCdpJson("/json/list");
  const targetOrigin = new URL(targetUrl).origin;
  const pageTarget =
    targets.find((target) => target.type === "page" && target.url?.startsWith(targetOrigin)) ??
    targets.find((target) => target.type === "page" && target.title === "Dental CRM") ??
    targets.find((target) => target.type === "page") ??
    targets[0];
  if (!pageTarget?.webSocketDebuggerUrl) throw new Error("No page CDP target found");

  const cdp = connectCdp(normalizedWebSocketUrl(pageTarget.webSocketDebuggerUrl));
  await cdp.opened;
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: true
  });
  await cdp.send("Page.navigate", { url: targetUrl });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const ready = await cdp.send("Runtime.evaluate", {
      expression: "document.readyState === 'complete' && Boolean(document.querySelector('.app-shell'))",
      returnByValue: true
    });
    if (ready.result.value) break;
    await sleep(250);
  }

  if (dismissOnboarding) {
    await cdp.send("Runtime.evaluate", {
      expression: `window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ version: 1, dismissed: true, savedAt: new Date().toISOString() }))`
    });
    await cdp.send("Page.reload", { ignoreCache: true });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const ready = await cdp.send("Runtime.evaluate", {
        expression: "document.readyState === 'complete' && Boolean(document.querySelector('.app-shell'))",
        returnByValue: true
      });
      if (ready.result.value) break;
      await sleep(250);
    }
  }

  if (clickSelector) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const clickable = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const element = document.querySelector(${JSON.stringify(clickSelector)});
          return Boolean(element && !element.closest('[hidden]'));
        })()`,
        returnByValue: true
      });
      if (clickable.result.value) break;
      await sleep(250);
    }
    const clicked = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const element = document.querySelector(${JSON.stringify(clickSelector)});
        if (!element || element.closest('[hidden]')) return false;
        element.click();
        return true;
      })()`,
      returnByValue: true
    });
    if (!clicked.result.value) throw new Error(`${clickLabel} is not clickable on the target page.`);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const appeared = await cdp.send("Runtime.evaluate", {
        expression: `Boolean(document.querySelector(${JSON.stringify(requiredSelector)}))`,
        returnByValue: true
      });
      if (appeared.result.value) break;
      await sleep(250);
    }
  } else {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const appeared = await cdp.send("Runtime.evaluate", {
        expression: `Boolean(document.querySelector(${JSON.stringify(requiredSelector)}))`,
        returnByValue: true
      });
      if (appeared.result.value) break;
      await sleep(250);
    }
  }

  const evaluation = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const root = document.documentElement;
      const requiredElement = document.querySelector(${JSON.stringify(requiredSelector)});
      return {
        href: location.href,
        viewport: window.innerWidth,
        scrollWidth: root.scrollWidth,
        overflow: Math.max(0, root.scrollWidth - window.innerWidth),
        hasRequiredElement: Boolean(requiredElement),
        requiredElementHidden: requiredElement ? Boolean(requiredElement.closest('[hidden]')) : null,
        visibleText: document.body.innerText.slice(0, 400)
      };
    })()`,
    returnByValue: true
  });

  const result = evaluation.result.value;
  console.log(JSON.stringify(result));
  if (!result.hasRequiredElement || result.requiredElementHidden) {
    throw new Error(`${requiredLabel} is not visible on the target page.`);
  }
  if (result.overflow > 1) throw new Error(`Mobile horizontal overflow detected: ${result.overflow}px.`);
  if (screenshotPath) {
    await cdp.send("Runtime.evaluate", {
      expression: `document.querySelector(${JSON.stringify(requiredSelector)})?.scrollIntoView({ block: "center", inline: "nearest" })`
    });
    await sleep(250);
    const outputPath = path.resolve(screenshotPath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
  }
  cdp.close();
} finally {
  await cleanupBrowserProfile();
}
