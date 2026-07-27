import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const OUT = "C:/Clinic_MVP/dental-crm/.dente-redesign-shots";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9331;

// 1. Enforce Live Server HTTP 200 Check
try {
  const res = await fetch(webBaseUrl);
  if (!res.ok) {
    throw new Error(`Web server returned status ${res.status}`);
  }
} catch (e) {
  throw new Error(
    `LIVE SERVER REQUIRED: Web server at ${webBaseUrl} is offline (${e.message}). Start server with npm run dev before running screenshots.`
  );
}

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
socket.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (!msg.id) return;
  const req = pending.get(msg.id);
  if (!req) return;
  pending.delete(msg.id);
  if (msg.error) req.reject(new Error(msg.error.message));
  else req.resolve(msg.result);
};
await new Promise((res, rej) => { socket.onopen = res; socket.onerror = () => rej(new Error("WS fail")); });
const cdp = {
  send(method, params = {}) {
    id++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej }));
  }
};

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

async function setViewport(width, height, mobile) {
  if (mobile) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true });
  } else {
    await cdp.send("Emulation.clearDeviceMetricsOverride");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  }
  await sleep(500);
}

async function evaluate(expression) {
  const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r?.result?.value;
}

async function setTheme(theme) {
  await evaluate(`(() => {
    window.localStorage.setItem('dente_theme_mode', '${theme}');
    try {
      const p1 = JSON.parse(window.localStorage.getItem('dental-crm:web-ui-preferences:v1') || '{}');
      p1.themeMode = '${theme}';
      window.localStorage.setItem('dental-crm:web-ui-preferences:v1', JSON.stringify(p1));

      const p2 = JSON.parse(window.localStorage.getItem('dente_ui_preferences_v1') || '{}');
      p2.themeMode = '${theme}';
      window.localStorage.setItem('dente_ui_preferences_v1', JSON.stringify(p2));
    } catch (e) {}

    const s = window.__useThemeStore;
    if (s) s.getState().setThemeMode('${theme}');
    document.documentElement.dataset.theme = '${theme}';

    // Dismiss lock screen if active
    const lockScreen = document.querySelector('.pin-lock-screen, .lock-screen, [data-lock-screen]');
    if (lockScreen) {
      const pinBtn = document.querySelector('.pin-button, button:not([disabled])');
      if (pinBtn) pinBtn.click();
    }
    return document.documentElement.dataset.theme;
  })()`);
  await sleep(600);
}

async function waitForViewReady(viewName) {
  const panelMap = {
    shift: '#shift, .shift-hero, .panel',
    schedule: '#schedule, .schedule-panel',
    patients: '#patients, .patients-panel',
    imaging: '#imaging, .imaging-panel',
    visit: '#visit, .visit-panel',
    documents: '#documents, .documents-panel',
    finance: '#finance, .finance-panel',
    analytics: '#analytics, .analytics-panel',
    communications: '#communications, .communications-panel',
    settings: '#settings, .settings-zone',
    marketing: '#marketing, .marketing-panel'
  };
  const sel = panelMap[viewName] || '.panel';
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate(`Boolean(document.querySelector('${sel}') && !document.querySelector('${sel}[aria-busy="true"]'))`);
    if (ready) {
      await sleep(500);
      return;
    }
    await sleep(250);
  }
  console.warn(`[waitForViewReady] View container ${sel} took longer than expected.`);
}

async function nav(viewName) {
  await evaluate(`(() => {
    try {
      if (!localStorage.getItem("dente_staff_token")) {
        localStorage.setItem("dente_staff_token", "demo-staff-token");
        localStorage.setItem("dente_clinic_token", "demo-clinic-token");
        localStorage.setItem("dente_workspace_role", "owner");
      }
    } catch(e) {}
  })()`);

  await evaluate(`(() => {
    try {
      const pinPad = document.querySelector('.staff-pin-pad, .pin-lock-screen');
      if (pinPad) {
        const staffCard = document.querySelector('.staff-card, .staff-member-item');
        if (staffCard) staffCard.click();
        const zeroBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '0');
        if (zeroBtn) {
          for (let i = 0; i < 4; i++) zeroBtn.click();
        }
      }
    } catch(e) {}
  })()`);

  const selector = `aside.sidebar nav a[href="#${viewName}"], .dnt-bottom-nav a[href="#${viewName}"]`;
  const success = await evaluate(`(() => {
    const link = document.querySelector('${selector}');
    if (link) {
      link.click();
      return true;
    }
    window.location.hash = "#${viewName}";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return false;
  })()`);
  await waitForViewReady(viewName);
}

async function shot(name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const buf = Buffer.from(data, "base64");
  await writeFile(path.join(OUT, `${name}.png`), buf);
  console.log(`shot ${name}.png (${Math.round(buf.length / 1024)}KB)`);
}

// bootstrap demo session via localStorage tokens & seed owner role preferences
await sleep(3000);
await evaluate(`(async () => {
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@clinic.com', password: 'password' })
    });
    const data = await r.json();
    if (data.clinicToken && data.staffToken) {
      localStorage.setItem("dente_clinic_token", data.clinicToken);
      localStorage.setItem("dente_staff_token", data.staffToken);
      localStorage.setItem("dente_clinic_tenant_id", data.user.organizationId || "00000000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ version: 1, dismissed: true, savedAt: new Date().toISOString() }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingDismissedAt: new Date().toISOString(),
        onboardingDraftMode: false,
        themeMode: "light",
        savedAt: new Date().toISOString()
      }));
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        onboardingDismissed: true,
        selectedWorkspaceRole: "owner",
        onboardingDismissedAt: new Date().toISOString(),
        onboardingDraftMode: false,
        themeMode: "light"
      }));
      localStorage.setItem("dente_onboarding_dismissed_v1", JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
    } else {
      console.error("Login failed in screenshot script:", data);
    }
  } catch (e) {
    console.error("Screenshot login error:", e);
  }
})()`);

async function waitForWorkspace() {
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate(`Boolean(document.querySelector('.shift-hero, .panel, .today-schedule-box, .section-card'))`);
    if (ready) return;
    await sleep(500);
  }
}

await evaluate(`window.location.reload()`);
await waitForWorkspace();
await sleep(2000);

const allViews = ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "analytics", "communications", "settings", "marketing"];

// 1. DESKTOP LIGHT (1440x900)
await setViewport(1440, 900, false);
await setTheme("light");
for (const v of allViews) {
  await nav(v);
  await shot(`desktop_light_${v}`);
}

// Desktop collapsed sidebar screenshot
await nav("shift");
await evaluate(`(() => { const b = document.querySelector('.sidebar-collapse-button'); if (b) b.click(); return !!b; })()`);
await sleep(700);
await shot("desktop_light_shift_collapsed");
await evaluate(`(() => { const b = document.querySelector('.sidebar-collapse-button'); if (b) b.click(); return !!b; })()`);
await sleep(700);

// 2. DESKTOP DARK (1440x900)
await setTheme("dark");
for (const v of allViews) {
  await nav(v);
  await shot(`desktop_dark_${v}`);
}

// 3. MOBILE LIGHT (390x844)
await setViewport(390, 844, true);
await setTheme("light");
for (const v of allViews) {
  await nav(v);
  await shot(`mobile_light_${v}`);
}

// 4. MOBILE DARK (390x844)
await setTheme("dark");
for (const v of allViews) {
  await nav(v);
  await shot(`mobile_dark_${v}`);
}

socket.close();
browser.kill();
console.log("Done");
