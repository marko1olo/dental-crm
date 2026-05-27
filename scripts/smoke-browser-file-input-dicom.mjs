import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const targetUrl = process.argv[2] ?? "http://127.0.0.1:5173/#settings/sources";
const width = Number(process.env.SMOKE_WIDTH ?? 390);
const height = Number(process.env.SMOKE_HEIGHT ?? 900);
const port = Number(process.env.SMOKE_CDP_PORT ?? 9324);
const screenshotPath =
  process.env.SMOKE_SCREENSHOT_PATH ?? "docs/screenshots/browser-file-input-dicom-magic-mobile-current.png";
const inputSelector = "[data-testid='browser-local-imaging-folder-input']";
const resultSelector = "[data-testid='browser-picked-imaging-folder-result']";
const profileDir = path.join(os.tmpdir(), `dental-crm-edge-file-input-smoke-${process.pid}`);
const fixtureDir = path.join(os.tmpdir(), `dental-crm-browser-picker-smoke-${process.pid}`);

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function createFixtureFiles() {
  await mkdir(fixtureDir, { recursive: true });
  const dicomBytes = Buffer.alloc(180, 0);
  dicomBytes.write("DICM", 128, "ascii");
  const fixtures = [
    ["dicom_magic_no_ext", dicomBytes],
    ["implant_guide.stl", Buffer.from("solid guide\nendsolid guide\n", "utf8")],
    ["case_export.zip", Buffer.from("PK\x03\x04synthetic", "binary")],
    ["preview.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xd9])]
  ];
  const files = [];
  for (const [name, content] of fixtures) {
    const filePath = path.join(fixtureDir, name);
    await writeFile(filePath, content);
    files.push(filePath);
  }
  return files;
}

async function cleanup(browser) {
  browser.kill();
  await Promise.race([new Promise((resolve) => browser.once("exit", resolve)), sleep(2_000)]);
  await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  await rm(fixtureDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}

await mkdir(profileDir, { recursive: true });
const files = await createFixtureFiles();
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

try {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  const pageTarget = targets.find((target) => target.type === "page") ?? targets[0];
  if (!pageTarget?.webSocketDebuggerUrl) throw new Error("No page CDP target found");

  const cdp = connectCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
  await cdp.send("Page.navigate", { url: targetUrl });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const ready = await cdp.send("Runtime.evaluate", {
      expression: "document.readyState === 'complete' && Boolean(document.querySelector('.app-shell'))",
      returnByValue: true
    });
    if (ready.result.value) break;
    await sleep(250);
  }

  const documentNode = await cdp.send("DOM.getDocument", { depth: 1 });
  const inputNode = await cdp.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector: inputSelector
  });
  if (!inputNode.nodeId) throw new Error("Browser local imaging file input was not found.");

  async function readInputState() {
    return cdp.send("Runtime.evaluate", {
      expression: `(() => {
      const input = document.querySelector(${JSON.stringify(inputSelector)});
      if (!input) return { hasInput: false, filesLength: -1 };
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { hasInput: true, filesLength: input.files ? input.files.length : -1 };
    })()`,
      returnByValue: true
    });
  }

  await cdp.send("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files });
  let inputState = await readInputState();
  if (inputState.result.value?.filesLength !== files.length) {
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector(${JSON.stringify(inputSelector)});
        if (!input) return false;
        input.removeAttribute("webkitdirectory");
        input.removeAttribute("directory");
        return true;
      })()`,
      returnByValue: true
    });
    await cdp.send("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files });
    inputState = await readInputState();
  }

  if (!inputState.result.value?.hasInput || inputState.result.value.filesLength !== files.length) {
    throw new Error(`File input did not receive all synthetic files: ${JSON.stringify(inputState.result.value)}`);
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const appeared = await cdp.send("Runtime.evaluate", {
      expression: `Boolean(document.querySelector(${JSON.stringify(resultSelector)}))`,
      returnByValue: true
    });
    if (appeared.result.value) break;
    await sleep(250);
  }

  await cdp.send("Runtime.evaluate", {
    expression: `document.querySelector(${JSON.stringify(resultSelector)})?.scrollIntoView({ block: "center" })`
  });
  await sleep(250);

  const evaluation = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const root = document.documentElement;
      const result = document.querySelector(${JSON.stringify(resultSelector)});
      const storageKey =
        Object.keys(localStorage).find((key) => key.startsWith("dental-crm:browser-picked-imaging-folder:last:")) ??
        "dental-crm:browser-picked-imaging-folder:last";
      const rawStorage = localStorage.getItem(storageKey) || "";
      const stored = rawStorage ? JSON.parse(rawStorage) : null;
      const bodyText = document.body.innerText;
      const leaks = [
        ${JSON.stringify(fixtureDir)},
        "dicom_magic_no_ext",
        "implant_guide.stl",
        "case_export.zip",
        "preview.jpg"
      ].filter((needle) => bodyText.includes(needle) || rawStorage.includes(needle));
      return {
        href: location.href,
        viewport: window.innerWidth,
        scrollWidth: root.scrollWidth,
        overflow: Math.max(0, root.scrollWidth - window.innerWidth),
        hasResult: Boolean(result),
        resultHidden: result ? Boolean(result.closest("[hidden]")) : null,
        visibleText: result ? result.innerText.slice(0, 600) : "",
        storageKey,
        stored,
        leaks
      };
    })()`,
    returnByValue: true
  });

  const result = evaluation.result.value;
  console.log(JSON.stringify(result));
  if (!result.hasResult || result.resultHidden) throw new Error("Browser picked imaging result did not render.");
  if (result.overflow > 1) throw new Error(`Mobile horizontal overflow detected: ${result.overflow}px.`);
  if (result.leaks.length > 0) throw new Error(`Raw synthetic path/name leaked: ${result.leaks.join(", ")}`);
  if (!String(result.storageKey).startsWith("dental-crm:browser-picked-imaging-folder:last")) {
    throw new Error(`Unexpected browser-picked folder storage key: ${result.storageKey}`);
  }
  if (result.stored?.dicomLikeFiles !== 1) throw new Error("No-extension DICM fixture was not counted as DICOM.");
  if (result.stored?.archiveFiles !== 1) throw new Error("Archive fixture was not counted.");
  if (result.stored?.modelFiles !== 1) throw new Error("Dental 3D model fixture was not counted.");
  if (result.stored?.imageFiles !== 1) throw new Error("Image fixture was not counted.");

  if (screenshotPath) {
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
  await cleanup(browser);
}
