import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const OUT = "C:/Clinic_MVP/dental-crm/.dente-redesign-shots";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9331;
await mkdir(OUT, { recursive: true });

const browserPath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((c) => existsSync(c));
if (!browserPath) throw new Error("No browser found");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-shot-profile");
await mkdir(tmpProfile, { recursive: true });

const browser = spawn(browserPath, [
  "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--no-first-run",
  "--remote-allow-origins=*", `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${tmpProfile}`, "--window-size=1440,900", `${webBaseUrl}/`,
], { stdio: ["ignore", "ignore", "pipe"] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTargets(retries = 40) {
  for (let i = 0; i < retries; i++) {
    try { const r = await fetch(`http://127.0.0.1:${cdpPort}/json/list`); const t = await r.json(); if (t.length) return t; } catch {}
    await sleep(1000);
  }
  throw new Error("CDP not ready");
}
const targets = await getTargets();
const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
socket.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (!msg.id) return; const req = pending.get(msg.id); if (!req) return; pending.delete(msg.id); if (msg.error) req.reject(new Error(msg.error.message)); else req.resolve(msg.result); };
await new Promise((res, rej) => { socket.onopen = res; socket.onerror = () => rej(new Error("WS fail")); });
const cdp = { send(method, params = {}) { id++; socket.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej })); } };

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

async function setViewport(width, height, mobile) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
}
async function evaluate(expression) {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r?.result?.value;
}
async function setTheme(theme) {
  await evaluate(`(() => { window.localStorage.setItem('dente_theme_mode', '${theme}'); const s = window.__useThemeStore; if (s) s.getState().setThemeMode('${theme}'); document.documentElement.dataset.theme='${theme}'; return document.documentElement.dataset.theme; })()`);
  await sleep(600);
}
async function nav(hash) { await evaluate(`window.location.hash = "${hash}"`); await sleep(2200); }
async function shot(name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`shot ${name}.png (${Math.round(Buffer.from(data, "base64").length / 1024)}KB)`);
}

// bootstrap demo session via real login
await sleep(5000);
await evaluate(`(async () => {
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-organization-id': '1' },
    body: JSON.stringify({ email: 'doctor@clinic.com', password: 'dente2026' })
  });
  const data = await r.json();
  if (data.clinicToken) localStorage.setItem('dente_clinic_token', data.clinicToken);
  if (data.staffToken) localStorage.setItem('dente_staff_token', data.staffToken);
  localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    onboardingDismissed: true,
    onboardingDismissedAt: new Date().toISOString(),
    onboardingDraftMode: true,
    themeMode: 'light'
  }));
  localStorage.setItem('dente_onboarding_dismissed_v1', JSON.stringify({
    dismissed: true,
    savedAt: new Date().toISOString()
  }));
  return data.ok === true;
})()`);
async function waitForWorkspace() {
  for (let i = 0; i < 30; i++) {
    const ready = await evaluate(`Boolean(document.getElementById('workspace-content'))`);
    if (ready) return;
    await sleep(500);
  }
}

await evaluate(`window.location.reload()`);
await waitForWorkspace();
await sleep(3000);

// DESKTOP
await setViewport(1440, 900, false);
const allViews = ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "analytics", "communications", "settings", "marketing"];

for (const theme of ["light", "dark", "night"]) {
  await setTheme(theme);
  for (const v of allViews) {
    await nav(`#${v}`);
    await shot(`desktop_${theme}_${v}`);
  }
}
// desktop collapsed sidebar
await setTheme("light");
await nav("#shift");
await evaluate(`(() => { const b = document.querySelector('.sidebar-collapse-button'); if (b) b.click(); return !!b; })()`);
await sleep(700);
await shot("desktop_light_shift_collapsed");
await evaluate(`(() => { const b = document.querySelector('.sidebar-collapse-button'); if (b) b.click(); return !!b; })()`);
await sleep(700);

// MOBILE
await setViewport(390, 844, true);
for (const theme of ["light", "dark"]) {
  await setTheme(theme);
  for (const v of ["shift", "schedule", "patients", "visit", "documents", "finance", "settings"]) {
    await nav(`#${v}`);
    await shot(`mobile_${theme}_${v}`);
  }
}

socket.close();
browser.kill();
console.log("Done");
