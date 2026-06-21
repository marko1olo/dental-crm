import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";

const width = Number(process.env.SMOKE_WIDTH ?? 1440);
const height = Number(process.env.SMOKE_HEIGHT ?? 1100);
const apiPort = Number(process.env.SMOKE_API_PORT ?? (await findFreePort()));
const webPort = Number(process.env.SMOKE_WEB_PORT ?? (await findFreePort()));
const cdpPort = Number(process.env.SMOKE_CDP_PORT ?? (await findFreePort()));
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const tempRoot = path.join(os.tmpdir(), `dental-crm-live-settings-actions-${process.pid}`);
const stateFilePath = path.join(tempRoot, "state", "dental-crm-state.json");
const backupDir = path.join(tempRoot, "backups");
const snapshotDir = path.join(tempRoot, "document-snapshots");
const browserProfileDir = path.join(tempRoot, "browser-profile");
const fixtureDir = path.join(tempRoot, "imaging-fixtures");
const screenshotDir = process.env.SMOKE_SCREENSHOT_DIR ?? "test-results/workspace-live-settings-actions";
const apiServerPath = path.resolve("apps/api/dist/server.js");
const vitePath = path.resolve("apps/web/node_modules/vite/bin/vite.js");

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
  throw new Error("No Chromium/Edge browser found. Set BROWSER_BIN to run the workspace live settings actions smoke test.");
}
if (!existsSync(apiServerPath)) {
  throw new Error("Build API first: apps/api/dist/server.js is missing.");
}
if (!existsSync(vitePath)) {
  throw new Error("Vite binary is missing. Run dependency install before this smoke test.");
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

async function waitForHttp(url, label, attempts = 120) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return response;
      lastError = new Error(`${label} HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw lastError ?? new Error(`${label} was not reachable`);
}

async function fetchJson(url, attempts = 80) {
  const response = await waitForHttp(url, url, attempts);
  return response.json();
}

function spawnTracked(name, command, args, options) {
  const child = spawn(command, args, options);
  let stderr = "";
  let stdout = "";
  child.stderr?.on("data", (chunk) => {
    stderr = `${stderr}${chunk.toString("utf8")}`.slice(-4_000);
  });
  child.stdout?.on("data", (chunk) => {
    stdout = `${stdout}${chunk.toString("utf8")}`.slice(-4_000);
  });
  return { child, name, stderr: () => stderr, stdout: () => stdout };
}

async function stopTracked(tracked) {
  if (!tracked?.child || tracked.child.killed) return;
  tracked.child.kill();
  await Promise.race([new Promise((resolve) => tracked.child.once("exit", resolve)), sleep(2_000)]);
}

function processExitFailure(tracked, label) {
  return new Promise((_, reject) => {
    tracked.child.once("exit", (code, signal) => {
      reject(
        new Error(
          `${label} exited early (code=${code ?? "null"}, signal=${signal ?? "null"}) stdout=${tracked
            .stdout()
            .slice(-800)} stderr=${tracked.stderr().slice(-800)}`
        )
      );
    });
  });
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

async function evaluate(cdp, expression, label) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(`${label} threw in browser: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result.value;
}

async function navigateTo(cdp, hash, selector) {
  await cdp.send("Page.navigate", { url: `${webBaseUrl}/#${hash}` });
  await waitFor(
    cdp,
    `(() => document.readyState === "complete" && Boolean(document.querySelector(".app-shell")))()`,
    `${hash} app shell`
  );
  await waitFor(cdp, `(() => Boolean(document.querySelector(${JSON.stringify(selector)})))()`, `${hash} selector ${selector}`);
}

async function saveScreenshot(cdp, name) {
  const capture = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const screenshotPath = path.join(screenshotDir, `${name}.png`);
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  await writeFile(screenshotPath, Buffer.from(capture.data, "base64"));
  return screenshotPath;
}

async function dashboard() {
  return fetchJson(`${apiBaseUrl}/api/dashboard`);
}

async function waitForDashboard(predicate, label, attempts = 80) {
  let current = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    current = await dashboard();
    const result = predicate(current);
    if (result) return { dashboard: current, result };
    await sleep(250);
  }
  throw new Error(`${label} did not appear in dashboard`);
}

async function recognitionJobs() {
  return fetchJson(`${apiBaseUrl}/api/ai/recognition-jobs`);
}

async function waitForRecognitionJobs(predicate, label, attempts = 80) {
  let current = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    current = await recognitionJobs();
    const result = predicate(current);
    if (result) return result;
    await sleep(250);
  }
  throw new Error(`${label} did not appear in AI recognition jobs: ${JSON.stringify(current ?? null)}`);
}

async function createFixtureFiles() {
  await mkdir(fixtureDir, { recursive: true });
  const dicomBytes = Buffer.alloc(180, 0);
  dicomBytes.write("DICM", 128, "ascii");
  const fixtures = [
    ["settings-smoke-case-001.dcm", dicomBytes],
    ["settings-smoke-panorama.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
    ["settings-smoke-export.zip", Buffer.from("PK\x03\x04synthetic", "binary")]
  ];
  const files = [];
  for (const [name, content] of fixtures) {
    const filePath = path.join(fixtureDir, name);
    await writeFile(filePath, content);
    files.push(filePath);
  }
  return files;
}

async function setFileInputFiles(cdp, selector, files) {
  const documentNode = await cdp.send("DOM.getDocument", { depth: 1 });
  const inputNode = await cdp.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector
  });
  if (!inputNode.nodeId) throw new Error(`File input not found: ${selector}`);
  await cdp.send("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files });
  await evaluate(
    cdp,
    `(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) return { ok: false, reason: "missing_input" };
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, filesLength: input.files ? input.files.length : 0 };
    })()`,
    `dispatch files for ${selector}`
  );
}

function inputHelpersExpression(body) {
  return `(() => {
    const setFieldValue = (element, value) => {
      const prototype = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      descriptor?.set?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    ${body}
  })()`;
}

await mkdir(tempRoot, { recursive: true });
await mkdir(screenshotDir, { recursive: true });

const apiBootstrap = `
import { pathToFileURL } from "node:url";
const { createDenteApiApp } = await import(pathToFileURL(process.env.DENTAL_API_SERVER_PATH).href);
const app = await createDenteApiApp({ startTelegramWorker: false });
await app.listen({ host: process.env.API_HOST, port: Number(process.env.API_PORT) });
`;

const apiProcess = spawnTracked(
  "api",
  process.execPath,
  ["--input-type=module", "-e", apiBootstrap],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_HOST: "127.0.0.1",
      API_PORT: String(apiPort),
      WEB_ORIGIN: webBaseUrl,
      NODE_ENV: "development",
      DENTE_CLINICAL_ADMIN_SECRET: "",
      DENTE_SETTINGS_ADMIN_SECRET: "",
      DENTE_SCHEDULE_ADMIN_SECRET: "",
      DENTE_TELEGRAM_ADMIN_SECRET: "",
      DENTAL_API_SERVER_PATH: apiServerPath,
      DENTAL_STATE_FILE: stateFilePath,
      DENTAL_STATE_BACKUP_DIR: backupDir,
      DENTAL_STATE_BACKUPS: "2",
      DENTAL_DOCUMENT_SNAPSHOT_DIR: snapshotDir,
      DENTAL_SPEECH_PROVIDER: "demo",
      DENTAL_SPEECH_POLISH_PROVIDER: "demo"
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);

const webProcess = spawnTracked(
  "web",
  process.execPath,
  [vitePath, "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
  {
    cwd: path.resolve("apps/web"),
    env: {
      ...process.env,
      DENTAL_API_PROXY_TARGET: apiBaseUrl
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let browserProcess = null;

try {
  await Promise.race([waitForHttp(`${apiBaseUrl}/api/health`, "isolated API"), processExitFailure(apiProcess, "isolated API")]);
  await Promise.race([waitForHttp(webBaseUrl, "isolated web"), processExitFailure(webProcess, "isolated web")]);

  const initialDashboard = await dashboard();
  const initialRecognitionJobCount = (await recognitionJobs()).length;
  const initialMode = initialDashboard.clinicSettings.profile.mode;
  const nextMode = initialDashboard.clinicSettings.workspaceProfiles.find((profile) => profile.mode !== initialMode)?.mode;
  if (!nextMode) throw new Error("No alternate clinic mode found for live settings smoke action");

  const clinicName = `Smoke Settings Clinic ${Date.now()}`;
  const staffName = `Smoke Staff ${Date.now()}`;
  const chairName = `Smoke Chair ${Date.now()}`;
  const fixtureFiles = await createFixtureFiles();

  await mkdir(browserProfileDir, { recursive: true });
  browserProcess = spawnTracked(
    "browser",
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-allow-origins=*",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${browserProfileDir}`,
      `--window-size=${width},${height}`,
      `${webBaseUrl}/#settings/clinic`
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  const targets = await Promise.race([
    fetchJson(`http://127.0.0.1:${cdpPort}/json/list`, 120),
    processExitFailure(browserProcess, "browser")
  ]);
  const pageTarget = targets.find((target) => target.type === "page") ?? targets[0];
  if (!pageTarget?.webSocketDebuggerUrl) throw new Error("No page CDP target found");

  const cdp = connectCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

  await navigateTo(cdp, "settings/clinic", "#settings.settings-zone");
  await waitFor(cdp, `(() => Boolean(document.querySelector("#settings-panel-clinic .clinic-config")))()`, "clinic settings panel");

  const adminUnlockResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const panel = document.querySelector(".telegram-admin-panel");
      const input = panel?.querySelector('input[type="password"]');
      const buttons = panel ? Array.from(panel.querySelectorAll("button")) : [];
      const unlockButton = buttons[0];
      if (!input || !unlockButton) return { ok: false, hasInput: Boolean(input), buttonCount: buttons.length };
      setFieldValue(input, "smoke-settings-secret");
      return { ok: true, disabled: unlockButton.disabled };
    `),
    "fill settings admin unlock"
  );
  if (!adminUnlockResult.ok) throw new Error(`Settings admin unlock form was not filled: ${JSON.stringify(adminUnlockResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const panel = document.querySelector(".telegram-admin-panel");
      const button = panel ? Array.from(panel.querySelectorAll("button"))[0] : null;
      return button && !button.disabled ? true : null;
    })()`,
    "settings admin unlock button"
  );
  await evaluate(
    cdp,
    `(() => {
      const panel = document.querySelector(".telegram-admin-panel");
      const button = panel ? Array.from(panel.querySelectorAll("button"))[0] : null;
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "unlock settings admin session"
  );
  await waitFor(
    cdp,
    `(() => {
      const panel = document.querySelector(".telegram-admin-panel");
      const buttons = panel ? Array.from(panel.querySelectorAll("button")) : [];
      const forgetButton = buttons[1];
      return forgetButton && !forgetButton.disabled ? true : null;
    })()`,
    "settings admin session enabled"
  );

  const profileResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const form = document.querySelector(".clinic-profile-form-grid");
      const input = form?.querySelector("label:nth-child(1) input");
      if (!input) return { ok: false, hasForm: Boolean(form) };
      setFieldValue(input, ${JSON.stringify(clinicName)});
      return { ok: true, value: input.value };
    `),
    "fill clinic profile name"
  );
  if (!profileResult.ok) throw new Error(`Clinic profile form was not filled: ${JSON.stringify(profileResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const button = document.querySelector(".clinic-profile-actions button.primary-button");
      return button && !button.disabled ? true : null;
    })()`,
    "clinic profile save button"
  );
  await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector(".clinic-profile-actions button.primary-button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "save clinic profile"
  );
  await waitForDashboard((state) => state.clinicSettings.profile.clinicName === clinicName, "saved clinic profile");
  await waitFor(
    cdp,
    `(() => document.querySelector(".clinic-config-head h2")?.textContent.trim() === ${JSON.stringify(clinicName)})()`,
    "saved clinic profile visible in UI"
  );

  await evaluate(
    cdp,
    `(() => {
      const button = Array.from(document.querySelectorAll(".mode-grid .mode-card")).find((candidate) => !candidate.classList.contains("active"));
      if (!button) return { ok: false, reason: "missing_alternate_mode" };
      button.click();
      return { ok: true, text: button.textContent.trim() };
    })()`,
    "change clinic mode"
  );
  await waitForDashboard((state) => state.clinicSettings.profile.mode === nextMode, "changed clinic mode");
  await waitFor(
    cdp,
    `(() => {
      const active = document.querySelector(".mode-grid .mode-card.active");
      return active ? true : null;
    })()`,
    "changed clinic mode visible in UI"
  );

  const staffResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const card = document.querySelector(".clinic-config-grid article:nth-child(1)");
      const input = card?.querySelector(".quick-create input");
      if (!input) return { ok: false, hasCard: Boolean(card) };
      setFieldValue(input, ${JSON.stringify(staffName)});
      return { ok: true, value: input.value };
    `),
    "fill staff quick create"
  );
  if (!staffResult.ok) throw new Error(`Staff quick-create form was not filled: ${JSON.stringify(staffResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const card = document.querySelector(".clinic-config-grid article:nth-child(1)");
      const button = card?.querySelector(".quick-create button");
      return button && !button.disabled ? true : null;
    })()`,
    "staff create button"
  );
  await evaluate(
    cdp,
    `(() => {
      const card = document.querySelector(".clinic-config-grid article:nth-child(1)");
      const button = card?.querySelector(".quick-create button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "create staff member"
  );
  await waitForDashboard((state) => state.clinicSettings.staff.some((member) => member.fullName === staffName), "created staff member");
  await waitFor(
    cdp,
    `(() => Array.from(document.querySelectorAll(".clinic-config-grid article:nth-child(1) .staff-row strong")).some((node) =>
      node.textContent.trim() === ${JSON.stringify(staffName)}
    ))()`,
    "created staff member visible in UI"
  );

  const chairResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const card = document.querySelector(".clinic-config-grid article:nth-child(2)");
      const input = card?.querySelector(".quick-create input");
      if (!input) return { ok: false, hasCard: Boolean(card) };
      setFieldValue(input, ${JSON.stringify(chairName)});
      return { ok: true, value: input.value };
    `),
    "fill chair quick create"
  );
  if (!chairResult.ok) throw new Error(`Chair quick-create form was not filled: ${JSON.stringify(chairResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const card = document.querySelector(".clinic-config-grid article:nth-child(2)");
      const button = card?.querySelector(".quick-create button");
      return button && !button.disabled ? true : null;
    })()`,
    "chair create button"
  );
  await evaluate(
    cdp,
    `(() => {
      const card = document.querySelector(".clinic-config-grid article:nth-child(2)");
      const button = card?.querySelector(".quick-create button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "create chair"
  );
  await waitForDashboard((state) => state.clinicSettings.chairs.some((chair) => chair.name === chairName), "created chair");
  await waitFor(
    cdp,
    `(() => Array.from(document.querySelectorAll(".clinic-config-grid article:nth-child(2) .staff-row strong")).some((node) =>
      node.textContent.trim() === ${JSON.stringify(chairName)}
    ))()`,
    "created chair visible in UI"
  );

  const recognitionInput = [
    "Patient anonymized.",
    "Complaint: pain when biting in tooth 36.",
    "Objective: deep caries cavity, percussion sensitive.",
    "Preliminary note: pulpitis differential, needs doctor review."
  ].join("\\n");
  await navigateTo(cdp, "settings/ai", "#settings.settings-zone");
  await waitFor(cdp, `(() => Boolean(document.querySelector("#settings-panel-ai .recognition-workbench")))()`, "AI recognition workbench");
  const recognitionFillResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const workbench = document.querySelector("#settings-panel-ai .recognition-workbench");
      const textarea = workbench?.querySelector("textarea");
      const button = workbench?.querySelector(".import-tool-row button.primary-button");
      if (!textarea || !button) return { ok: false, hasWorkbench: Boolean(workbench), hasTextarea: Boolean(textarea), hasButton: Boolean(button) };
      setFieldValue(textarea, ${JSON.stringify(recognitionInput)});
      return { ok: true, valueLength: textarea.value.length, disabled: button.disabled };
    `),
    "fill AI recognition workbench"
  );
  if (!recognitionFillResult.ok) throw new Error(`AI recognition workbench was not filled: ${JSON.stringify(recognitionFillResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const button = document.querySelector("#settings-panel-ai .recognition-workbench .import-tool-row button.primary-button");
      return button && !button.disabled ? true : null;
    })()`,
    "AI recognition button"
  );
  await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector("#settings-panel-ai .recognition-workbench .import-tool-row button.primary-button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "run AI recognition"
  );
  await waitFor(cdp, `(() => Boolean(document.querySelector("#settings-panel-ai .recognition-result")))()`, "AI recognition result", 120);
  await waitFor(
    cdp,
    `(() => {
      const result = document.querySelector("#settings-panel-ai .recognition-result");
      return result && result.textContent.trim().length > 80 ? true : null;
    })()`,
    "AI recognition result content"
  );
  const createdRecognitionJob = await waitForRecognitionJobs(
    (jobs) => (jobs.length > initialRecognitionJobCount ? jobs[0] : null),
    "created AI recognition job",
    80
  );

  const smartImportInput = [
    "Legacy MIS backup C:\\\\Legacy\\\\clinic_2026.fdb",
    "Dental clinic Smoke Center INN 1234567890 Address: Samara, Lenina 1",
    "New Patient Smoke +7 927 444-55-66 12.02.1991 transferred from old MIS",
    "New Patient Smoke +7 927 444-55-66 RVG 36 12.05.2026 C:\\\\Images\\\\new_patient_36.dcm",
    "service row without useful clinical data"
  ].join("\\n");
  await navigateTo(cdp, "settings/imports", "#settings.settings-zone");
  await waitFor(cdp, `(() => Boolean(document.querySelector("#settings-panel-imports .smart-import-studio .import-workbench")))()`, "smart import workbench");
  const smartImportFillResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const workbench = document.querySelector("#settings-panel-imports .smart-import-studio .import-workbench");
      const textarea = workbench?.querySelector("textarea");
      const button = workbench?.querySelector(".import-tool-row button.primary-button");
      if (!textarea || !button) return { ok: false, hasWorkbench: Boolean(workbench), hasTextarea: Boolean(textarea), hasButton: Boolean(button) };
      setFieldValue(textarea, ${JSON.stringify(smartImportInput)});
      return { ok: true, valueLength: textarea.value.length, disabled: button.disabled };
    `),
    "fill smart import workbench"
  );
  if (!smartImportFillResult.ok) throw new Error(`Smart import workbench was not filled: ${JSON.stringify(smartImportFillResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const button = document.querySelector("#settings-panel-imports .smart-import-studio .import-workbench .import-tool-row button.primary-button");
      return button && !button.disabled ? true : null;
    })()`,
    "smart import preview button"
  );
  await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector("#settings-panel-imports .smart-import-studio .import-workbench .import-tool-row button.primary-button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "preview smart import"
  );
  await waitFor(cdp, `(() => Boolean(document.querySelector("#settings-panel-imports .smart-import-studio .import-preview")))()`, "smart import preview", 120);
  await waitFor(
    cdp,
    `(() => document.querySelectorAll("#settings-panel-imports .smart-import-studio .import-preview .import-row").length > 0)()`,
    "smart import preview rows"
  );

  await navigateTo(cdp, "settings/sources", "#settings.settings-zone");
  await waitFor(cdp, `(() => Boolean(document.querySelector("#settings-panel-sources .imaging-import-studio .import-workbench")))()`, "imaging import workbench");
  await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector("#settings-panel-sources .imaging-import-studio .import-workbench .import-tool-row button.secondary-button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "load imaging import example"
  );
  await waitFor(
    cdp,
    `(() => {
      const textarea = document.querySelector("#settings-panel-sources .imaging-import-studio .import-workbench textarea");
      return textarea && textarea.value.length > 200 && /IMG0001\\.dcm|petrov_opg\\.png/i.test(textarea.value) ? true : null;
    })()`,
    "imaging import example loaded"
  );
  await waitFor(
    cdp,
    `(() => {
      const button = document.querySelector("#settings-panel-sources .imaging-import-studio .import-workbench .import-tool-row button.primary-button");
      return button && !button.disabled ? true : null;
    })()`,
    "imaging import preview button"
  );
  await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector("#settings-panel-sources .imaging-import-studio .import-workbench .import-tool-row button.primary-button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "preview imaging import"
  );
  await waitFor(cdp, `(() => Boolean(document.querySelector("#settings-panel-sources .imaging-import-studio .import-preview")))()`, "imaging import preview", 120);
  const imagingPreviewSnapshot = await evaluate(
    cdp,
    `(() => {
      const preview = document.querySelector("#settings-panel-sources .imaging-import-studio .import-preview");
      const rows = Array.from(document.querySelectorAll("#settings-panel-sources .imaging-import-studio .import-preview .import-row"));
      return {
        hasPreview: Boolean(preview),
        rowCount: rows.length,
        text: preview?.textContent.trim().slice(0, 600) ?? ""
      };
    })()`,
    "read imaging import preview"
  );
  if (!imagingPreviewSnapshot.hasPreview || imagingPreviewSnapshot.rowCount === 0) {
    throw new Error(`Imaging import preview rows were not rendered: ${JSON.stringify(imagingPreviewSnapshot)}`);
  }

  await setFileInputFiles(cdp, '[data-testid="browser-local-imaging-files-input"]', fixtureFiles);
  await waitFor(cdp, `(() => Boolean(document.querySelector('[data-testid="browser-picked-imaging-folder-result"]')))()`, "browser picked imaging files", 160);
  await waitFor(
    cdp,
    `(() => {
      const result = document.querySelector('[data-testid="browser-picked-imaging-folder-result"]');
      return result && /3/.test(result.textContent) ? true : null;
    })()`,
    "browser picked imaging files count"
  );

  const finalScreenshot = await saveScreenshot(cdp, "settings-ai-import-sources-after-actions");
  cdp.close();

  const finalDashboard = await dashboard();
  const finalRecognitionJobs = await recognitionJobs();
  const createdStaff = finalDashboard.clinicSettings.staff.find((member) => member.fullName === staffName);
  const createdChair = finalDashboard.clinicSettings.chairs.find((chair) => chair.name === chairName);
  const latestRecognitionJob = finalRecognitionJobs[0];

  if (finalDashboard.clinicSettings.profile.clinicName !== clinicName) throw new Error("Saved clinic profile was not found in final dashboard");
  if (finalDashboard.clinicSettings.profile.mode !== nextMode) throw new Error("Changed clinic mode was not found in final dashboard");
  if (!createdStaff) throw new Error("Created staff member was not found in final dashboard");
  if (!createdChair) throw new Error("Created chair was not found in final dashboard");
  if (finalRecognitionJobs.length <= initialRecognitionJobCount) throw new Error("Created AI recognition job was not found in final AI job list");

  console.log(
    JSON.stringify({
      ok: true,
      guard: "workspace-live-settings-actions",
      isolatedApi: apiBaseUrl,
      isolatedWeb: webBaseUrl,
      clinicName,
      initialMode,
      changedMode: finalDashboard.clinicSettings.profile.mode,
      createdStaffId: createdStaff.id,
      createdChairId: createdChair.id,
      createdRecognitionJobId: latestRecognitionJob?.id ?? createdRecognitionJob?.id ?? null,
      smartImportPreview: true,
      imagingImportPreview: true,
      browserPickedImagingFiles: fixtureFiles.length,
      screenshot: finalScreenshot
    })
  );
} finally {
  await stopTracked(browserProcess);
  await stopTracked(webProcess);
  await stopTracked(apiProcess);
  await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}
