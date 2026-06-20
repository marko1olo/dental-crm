import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const width = Number(process.env.SMOKE_WIDTH ?? 1440);
const height = Number(process.env.SMOKE_HEIGHT ?? 1100);
const apiPort = Number(process.env.SMOKE_API_PORT ?? (await findFreePort()));
const webPort = Number(process.env.SMOKE_WEB_PORT ?? (await findFreePort()));
const cdpPort = Number(process.env.SMOKE_CDP_PORT ?? (await findFreePort()));
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const tempRoot = path.join(os.tmpdir(), `dental-crm-live-core-actions-${process.pid}`);
const stateFilePath = path.join(tempRoot, "state", "dental-crm-state.json");
const backupDir = path.join(tempRoot, "backups");
const snapshotDir = path.join(tempRoot, "document-snapshots");
const browserProfileDir = path.join(tempRoot, "browser-profile");
const fixtureDir = path.join(tempRoot, "dicom-fixtures");
const screenshotDir = process.env.SMOKE_SCREENSHOT_DIR ?? "test-results/workspace-live-core-actions";
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
  throw new Error("No Chromium/Edge browser found. Set BROWSER_BIN to run the workspace live core actions smoke test.");
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

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateTimeLocalInputValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function nextBusinessMorningWindow(scheduleDefaults = {}) {
  const workingDays = Array.isArray(scheduleDefaults.workingDays) && scheduleDefaults.workingDays.length
    ? new Set(scheduleDefaults.workingDays)
    : new Set([1, 2, 3, 4, 5]);
  const [defaultHour, defaultMinute] = String(scheduleDefaults.workdayStart ?? "09:00")
    .split(":")
    .map((part) => Number.parseInt(part, 10));
  const hour = Number.isInteger(defaultHour) && defaultHour >= 0 && defaultHour <= 23 ? defaultHour : 9;
  const minute = Number.isInteger(defaultMinute) && defaultMinute >= 0 && defaultMinute <= 59 ? defaultMinute : 0;
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
    start.setTime(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
    if (workingDays.has(start.getDay())) break;
  }
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    startsAtLocal: toDateTimeLocalInputValue(start),
    endsAtLocal: toDateTimeLocalInputValue(end)
  };
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

async function createFixtureFiles() {
  await mkdir(fixtureDir, { recursive: true });
  const dicomBytes = Buffer.alloc(180, 0);
  dicomBytes.write("DICM", 128, "ascii");
  const fixtures = [
    ["smoke-case-001.dcm", dicomBytes],
    ["smoke-panorama.jpg", Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
    ["smoke-export.zip", Buffer.from("PK\x03\x04synthetic", "binary")]
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

  const fixtureFiles = await createFixtureFiles();
  const initialDashboard = await dashboard();
  const initialPaymentCount = initialDashboard.payments.length;
  const initialDocumentCount = initialDashboard.documents.length;
  const initialAppointmentCount = initialDashboard.appointments.length;
  const initialCommunicationEventCount = initialDashboard.communicationEvents.length;
  const openCommunicationTask = initialDashboard.communicationTasks.find((task) => task.status !== "completed");
  const activePatientName = initialDashboard.patients.find((patient) => patient.id === initialDashboard.activeVisit.patientId)?.fullName;
  if (!activePatientName) throw new Error("Active patient was not found in isolated dashboard");

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
      `${webBaseUrl}/#finance`
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

  await navigateTo(cdp, "finance", "#finance.finance-panel");
  await waitFor(cdp, `(() => Boolean(document.querySelector("#payment-capture #payment-amount-input")))()`, "payment capture form");
  const paymentInputResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const amount = document.querySelector("#payment-amount-input");
      if (!amount) return { ok: false, reason: "missing_amount_input" };
      setFieldValue(amount, "1200");
      return { ok: true, amount: amount.value };
    `),
    "fill payment amount"
  );
  if (!paymentInputResult.ok) throw new Error(`Payment form was not filled: ${JSON.stringify(paymentInputResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const button = document.querySelector("#payment-capture button.primary-button");
      return button && !button.disabled ? { text: button.textContent.trim() } : null;
    })()`,
    "payment submit button"
  );
  await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector("#payment-capture button.primary-button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "submit payment"
  );
  await waitForDashboard((state) => state.payments.length > initialPaymentCount, "recorded payment");

  await navigateTo(cdp, "documents", "#documents.documents-panel");
  await waitFor(
    cdp,
    `(() => Boolean(document.querySelector(".document-factory-selected-kind select") && document.querySelector(".document-payload-card")))()`,
    "documents factory form"
  );
  const documentFormResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const kind = document.querySelector(".document-factory-selected-kind select");
      if (!kind) return { ok: false, reason: "missing_document_kind_select" };
      setFieldValue(kind, "patient_intake_questionnaire");
      const card = document.querySelector(".document-payload-card");
      if (!card) return { ok: false, reason: "missing_intake_card" };
      const textareas = Array.from(card.querySelectorAll("textarea"));
      const values = [
        "Test complaint for smoke workflow",
        "No allergy reported in smoke workflow",
        "No regular medication reported",
        "No chronic conditions reported",
        "No anticoagulants reported",
        "No infectious risk reported",
        "No cardio endocrine risk reported",
        "Synthetic smoke note"
      ];
      textareas.forEach((textarea, index) => setFieldValue(textarea, values[index] ?? "Synthetic smoke value"));
      const checkbox = card.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) checkbox.click();
      return { ok: true, textareaCount: textareas.length, checked: checkbox?.checked ?? null };
    `),
    "fill patient intake document"
  );
  if (!documentFormResult.ok || documentFormResult.textareaCount < 7 || documentFormResult.checked !== true) {
    throw new Error(`Patient intake form was not filled: ${JSON.stringify(documentFormResult)}`);
  }
  await waitFor(
    cdp,
    `(() => {
      const button = document.querySelector(".document-factory-selected-kind button.primary-button");
      return button && !button.disabled ? { text: button.textContent.trim() } : null;
    })()`,
    "document create button"
  );
  await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector(".document-factory-selected-kind button.primary-button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "create patient intake document"
  );
  await waitForDashboard(
    (state) => state.documents.length > initialDocumentCount && state.documents.some((document) => document.kind === "patient_intake_questionnaire"),
    "created patient intake document"
  );

  await navigateTo(cdp, "visit", "#visit.visit-panel");
  const toothResult = await evaluate(
    cdp,
    `(() => {
      const watchTool = document.querySelector(".tooth-map-selected button");
      const tooth24 = Array.from(document.querySelectorAll(".tooth-row button")).find((button) => button.textContent.trim() === "24");
      if (!watchTool || !tooth24) return { ok: false, hasWatchTool: Boolean(watchTool), hasTooth24: Boolean(tooth24) };
      watchTool.click();
      tooth24.click();
      return { ok: true, tooth24Class: tooth24.className };
    })()`,
    "mark tooth 24"
  );
  if (!toothResult.ok) throw new Error(`Tooth map action failed: ${JSON.stringify(toothResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const tooth24 = Array.from(document.querySelectorAll(".tooth-row button")).find((button) => button.textContent.trim() === "24");
      return tooth24 && tooth24.className.includes("tooth-watch") && tooth24.className.includes("selected")
        ? { tooth24Class: tooth24.className }
        : null;
    })()`,
    "tooth 24 watch marker"
  );

  const appointmentReason = `Smoke appointment ${Date.now()}`;
  const appointmentWindow = nextBusinessMorningWindow(initialDashboard.clinicSettings.profile.scheduleDefaults);
  const scheduleDoctor = initialDashboard.clinicSettings.staff.find((member) => member.active && (member.role === "doctor" || member.role === "owner"));
  const scheduleAssistant = initialDashboard.clinicSettings.staff.find((member) => member.active && member.role === "assistant");
  const scheduleChair = initialDashboard.clinicSettings.chairs.find((chair) => chair.active);
  const assistantRequired = initialDashboard.clinicSettings.profile.mode !== "solo_doctor";
  if (!scheduleDoctor) throw new Error("No active doctor or owner found for schedule smoke action");
  if (!scheduleChair) throw new Error("No active chair found for schedule smoke action");
  if (assistantRequired && !scheduleAssistant) throw new Error("No active assistant found for schedule smoke action");

  await navigateTo(cdp, "schedule", "#schedule.schedule-panel");
  await waitFor(cdp, `(() => Boolean(document.querySelector(".appointment-create-editor")))()`, "appointment create editor");
  const scheduleFormResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const editor = document.querySelector(".appointment-create-editor");
      if (!editor) return { ok: false, reason: "missing_editor" };
      const inputs = Array.from(editor.querySelectorAll("input"));
      const selects = Array.from(editor.querySelectorAll("select"));
      const textarea = editor.querySelector("textarea");
      if (inputs.length < 3 || selects.length < 5 || !textarea) {
        return { ok: false, reason: "missing_fields", inputCount: inputs.length, selectCount: selects.length, hasTextarea: Boolean(textarea) };
      }
      setFieldValue(inputs[0], ${JSON.stringify(appointmentWindow.startsAtLocal)});
      setFieldValue(inputs[1], ${JSON.stringify(appointmentWindow.endsAtLocal)});
      setFieldValue(selects[0], ${JSON.stringify(initialDashboard.activeVisit.patientId)});
      setFieldValue(selects[1], ${JSON.stringify(scheduleDoctor.id)});
      setFieldValue(selects[2], ${JSON.stringify(scheduleAssistant?.id ?? "")});
      setFieldValue(selects[3], ${JSON.stringify(scheduleChair.id)});
      setFieldValue(selects[4], "planned");
      setFieldValue(inputs[2], ${JSON.stringify(appointmentReason)});
      setFieldValue(textarea, "Synthetic schedule smoke appointment");
      const button = editor.querySelector(".appointment-editor-actions button.primary-button");
      return { ok: true, disabled: button?.disabled ?? null };
    `),
    "fill appointment create form"
  );
  if (!scheduleFormResult.ok) throw new Error(`Appointment create form was not filled: ${JSON.stringify(scheduleFormResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const button = document.querySelector(".appointment-create-editor .appointment-editor-actions button.primary-button");
      return button && !button.disabled ? { text: button.textContent.trim() } : null;
    })()`,
    "appointment create button"
  );
  await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector(".appointment-create-editor .appointment-editor-actions button.primary-button");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "create appointment"
  );
  await waitForDashboard(
    (state) => state.appointments.length > initialAppointmentCount && state.appointments.some((appointment) => appointment.reason === appointmentReason),
    "created appointment"
  );
  await waitFor(
    cdp,
    `(() => Array.from(document.querySelectorAll("#schedule .timeline .appointment-row, #schedule .timeline p")).some((node) =>
      node.textContent.includes(${JSON.stringify(appointmentReason)})
    ))()`,
    "created appointment visible in UI"
  );

  if (!openCommunicationTask) throw new Error("No open communication task found for communication smoke action");
  await navigateTo(cdp, "communications", "#communications.communications-panel");
  await waitFor(cdp, `(() => document.querySelectorAll(".communication-task").length > 0)()`, "communication task list");
  const communicationResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const note = document.querySelector("#communication-closing-note");
      const card = Array.from(document.querySelectorAll(".communication-task")).find((candidate) =>
        candidate.textContent.includes(${JSON.stringify(openCommunicationTask.title)})
      );
      if (!note || !card) return { ok: false, hasNote: Boolean(note), hasCard: Boolean(card) };
      setFieldValue(note, "Synthetic communication close note");
      const select = card.querySelector(".communication-outcome-select select");
      if (!select) return { ok: false, reason: "missing_outcome_select" };
      setFieldValue(select, "callback_requested");
      const buttons = Array.from(card.querySelectorAll(".communication-task-actions button"));
      const closeButton = buttons[buttons.length - 1];
      if (!closeButton) return { ok: false, reason: "missing_close_button", buttonCount: buttons.length };
      return { ok: true, disabled: closeButton.disabled, buttonCount: buttons.length };
    `),
    "fill communication task completion"
  );
  if (!communicationResult.ok) throw new Error(`Communication task completion form was not filled: ${JSON.stringify(communicationResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const card = Array.from(document.querySelectorAll(".communication-task")).find((candidate) =>
        candidate.textContent.includes(${JSON.stringify(openCommunicationTask.title)})
      );
      if (!card) return null;
      const buttons = Array.from(card.querySelectorAll(".communication-task-actions button"));
      const closeButton = buttons[buttons.length - 1];
      return closeButton && !closeButton.disabled ? { text: closeButton.textContent.trim() } : null;
    })()`,
    "communication close button"
  );
  await evaluate(
    cdp,
    `(() => {
      const card = Array.from(document.querySelectorAll(".communication-task")).find((candidate) =>
        candidate.textContent.includes(${JSON.stringify(openCommunicationTask.title)})
      );
      if (!card) return { ok: false, reason: "missing_card" };
      const buttons = Array.from(card.querySelectorAll(".communication-task-actions button"));
      const closeButton = buttons[buttons.length - 1];
      if (!closeButton || closeButton.disabled) return { ok: false, disabled: closeButton?.disabled ?? null };
      closeButton.click();
      return { ok: true };
    })()`,
    "complete communication task"
  );
  await waitForDashboard(
    (state) =>
      state.communicationEvents.length > initialCommunicationEventCount &&
      state.communicationTasks.some((task) => task.id === openCommunicationTask.id && task.status === "completed"),
    "completed communication task"
  );
  await waitFor(
    cdp,
    `(() => {
      const card = Array.from(document.querySelectorAll(".communication-task")).find((candidate) =>
        candidate.textContent.includes(${JSON.stringify(openCommunicationTask.title)})
      );
      return card && card.querySelector(".status-completed") ? true : null;
    })()`,
    "completed communication task visible in UI"
  );

  const patientName = `Smoke Patient ${Date.now()}`;
  await navigateTo(cdp, "patients", "#patients.patients-panel");
  await waitFor(cdp, `(() => document.querySelectorAll("#patients .quick-create input").length >= 3)()`, "patient quick create form");
  const patientCreateResult = await evaluate(
    cdp,
    inputHelpersExpression(`
      const inputs = Array.from(document.querySelectorAll("#patients .quick-create input"));
      const button = document.querySelector("#patients .quick-create-action");
      if (inputs.length < 3 || !button) return { ok: false, inputCount: inputs.length, hasButton: Boolean(button) };
      setFieldValue(inputs[0], ${JSON.stringify(patientName)});
      setFieldValue(inputs[1], "+7 900 123-45-67");
      setFieldValue(inputs[2], "1991-02-03");
      return { ok: true, disabled: button.disabled };
    `),
    "fill patient create form"
  );
  if (!patientCreateResult.ok) throw new Error(`Patient create form was not filled: ${JSON.stringify(patientCreateResult)}`);
  await waitFor(
    cdp,
    `(() => {
      const button = document.querySelector("#patients .quick-create-action");
      return button && !button.disabled ? { text: button.textContent.trim() } : null;
    })()`,
    "patient create button"
  );
  await evaluate(
    cdp,
    `(() => {
      const button = document.querySelector("#patients .quick-create-action");
      if (!button || button.disabled) return { ok: false, disabled: button?.disabled ?? null };
      button.click();
      return { ok: true };
    })()`,
    "create patient"
  );
  await waitForDashboard((state) => state.patients.some((patient) => patient.fullName === patientName), "created patient");
  await waitFor(
    cdp,
    `(() => Array.from(document.querySelectorAll("#patients .patient-row h3")).some((heading) => heading.textContent.trim() === ${JSON.stringify(
      patientName
    )}))()`,
    "created patient visible in UI"
  );

  await navigateTo(cdp, "imaging", "#imaging.imaging-panel");
  await setFileInputFiles(cdp, '[data-testid="imaging-browser-local-files-input"]', fixtureFiles);
  const imagingResult = await waitFor(
    cdp,
    `(() => {
      const status = document.querySelector('[data-testid="imaging-upload-status"]');
      if (!status) return null;
      const text = status.innerText;
      const dicomLike = /DICOM|КТ|РљРў/.test(text);
      return text.includes("3") && dicomLike ? { text } : null;
    })()`,
    "imaging file upload status",
    120
  );

  const finalScreenshot = await saveScreenshot(cdp, "final-imaging");
  cdp.close();

  const finalDashboard = await dashboard();
  const createdPayment = finalDashboard.payments.find((payment) => payment.amountRub === 1200);
  const createdDocument = finalDashboard.documents.find((document) => document.kind === "patient_intake_questionnaire");
  const createdPatient = finalDashboard.patients.find((patient) => patient.fullName === patientName);
  const createdAppointment = finalDashboard.appointments.find((appointment) => appointment.reason === appointmentReason);
  const completedCommunicationTask = finalDashboard.communicationTasks.find((task) => task.id === openCommunicationTask.id && task.status === "completed");

  if (!createdPayment) throw new Error("Recorded payment was not found in final dashboard");
  if (!createdDocument) throw new Error("Created patient intake document was not found in final dashboard");
  if (!createdPatient) throw new Error("Created patient was not found in final dashboard");
  if (!createdAppointment) throw new Error("Created appointment was not found in final dashboard");
  if (!completedCommunicationTask) throw new Error("Completed communication task was not found in final dashboard");

  console.log(
    JSON.stringify({
      ok: true,
      guard: "workspace-live-core-actions",
      isolatedApi: apiBaseUrl,
      isolatedWeb: webBaseUrl,
      activePatientName,
      createdPatientId: createdPatient.id,
      createdAppointmentId: createdAppointment.id,
      completedCommunicationTaskId: completedCommunicationTask.id,
      createdDocumentId: createdDocument.id,
      createdPaymentId: createdPayment.id,
      imagingStatusTextLength: imagingResult.text.length,
      screenshot: finalScreenshot
    })
  );
} finally {
  await stopTracked(browserProcess);
  await stopTracked(webProcess);
  await stopTracked(apiProcess);
  await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}
