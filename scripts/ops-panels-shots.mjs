/**
 * Снимки рабочих панелей: обзвон, отправка сообщений, рассылки, отчёты.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ СЦЕНАРИЙ
 * Существующий scripts/dente-redesign-shots.mjs снимает разделы целиком в одной
 * теме. Здесь нужно другое: те же четыре панели в светлой, тёмной и ночной теме
 * плюс узкий экран — именно там ломается вёрстка, и именно это нельзя проверить
 * чтением исходников.
 *
 * Тема переключается записью в localStorage и атрибутом data-theme на <html>:
 * так же, как это делает переключатель в интерфейсе.
 *
 * ТРЕБУЕТСЯ живой веб-сервер на 127.0.0.1:5173. Без него сценарий падает, а не
 * делает вид, что снял: снимок несуществующей страницы — это ложное
 * доказательство.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const OUT = "C:/Clinic_MVP/dental-crm/.dente-ops-shots";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9341;

const res = await fetch(webBaseUrl).catch((error) => {
  throw new Error(`Веб-сервер на ${webBaseUrl} недоступен (${error.message}). Запустите npm run dev.`);
});
if (!res.ok) throw new Error(`Веб-сервер ответил ${res.status}`);

await mkdir(OUT, { recursive: true });

const browserPath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-ops-shot-profile");
await mkdir(tmpProfile, { recursive: true });

const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${tmpProfile}`,
    "--window-size=1600,1000",
    `${webBaseUrl}/`,
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getPageTarget(retries = 40) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {
      /* браузер ещё поднимается */
    }
    await sleep(1000);
  }
  throw new Error("Отладочный порт браузера не отвечает");
}

const pageTarget = await getPageTarget();

const { default: WebSocket } = await import("ws");
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

let messageId = 0;
const pending = new Map();
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
});

function send(method, params = {}) {
  const id = ++messageId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`${method}: нет ответа`));
      }
    }, 30000);
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(`Ошибка в странице: ${result.exceptionDetails.text}`);
  }
  return result.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");

/**
 * Вход в кабинет. Без токенов приложение показывает форму входа, и снимать
 * нечего. Токены выдаёт scripts/../seedOpsScreenshotDemo.ts и кладёт в файл
 * рядом; он временный и в репозиторий не попадает.
 */
const tokenFile = path.join(process.cwd(), ".ops-shot-tokens.json");
if (!existsSync(tokenFile)) {
  throw new Error(
    `Нет ${tokenFile}. Сначала: cd apps/api && npx tsx src/scripts/seedOpsScreenshotDemo.ts > ../../.ops-shot-tokens.json`,
  );
}
const { clinicToken, staffToken } = JSON.parse(await readFile(tokenFile, "utf8"));

await evaluate(`
  (() => {
    window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
    window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
    // Мастер первого запуска перекрывает весь экран: для новой организации он
    // показывается всегда. Гасим его тем же ключом, что и кнопка «пропустить».
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
    return true;
  })()
`);
await send("Page.navigate", { url: webBaseUrl + "/" });

/**
 * Ждём именно рабочий кабинет, а не «просто загрузилось». Раздел подключается
 * лениво, и снимок, сделанный раньше времени, показал бы экран входа — то есть
 * ложное доказательство.
 */
async function waitForWorkspace(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await evaluate(`
      (() => {
        const sidebar = document.querySelector('.sidebar, nav .nav-item');
        const login = document.body.textContent?.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ");
        const wizard = document.body.textContent?.includes("Быстрая настройка CRM Dente");
        return { ready: Boolean(sidebar) && !login && !wizard, login: Boolean(login), wizard: Boolean(wizard) };
      })()
    `);
    if (state?.ready) return true;
    if (state?.wizard) {
      await evaluate(`window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true })); location.reload(); true`);
    }
    await sleep(1200);
  }
  throw new Error("Рабочий кабинет не открылся: снимать нечего");
}

await waitForWorkspace();
console.log("Рабочий кабинет открыт");

async function setTheme(theme) {
  await evaluate(`
    (() => {
      window.localStorage.setItem("dente_theme", ${JSON.stringify(theme)});
      document.documentElement.setAttribute("data-theme", ${JSON.stringify(theme)});
      return document.documentElement.getAttribute("data-theme");
    })()
  `);
}

async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 800,
  });
}

async function goToView(view) {
  // Раздел переключается якорем: пункты бокового меню — это <a href="#schedule">.
  // Клик по кнопке искать не нужно, и на узком экране меню другое.
  return evaluate(`
    (() => {
      if (window.location.hash === "#" + ${JSON.stringify(view)}) {
        // Тот же раздел: событие hashchange не сработает, обновляем вручную.
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } else {
        window.location.hash = ${JSON.stringify(view)};
      }
      return window.location.hash;
    })()
  `);
}

/** Панель подключается лениво: ждём её появления, а не спим наугад. */
async function waitForPanel(testId, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await evaluate(`Boolean(document.querySelector('[data-testid="${testId}"]'))`);
    if (found) return true;
    await sleep(500);
  }
  return false;
}

/** Снимок конкретной панели по её data-testid, а не всей страницы. */
async function shootPanel(testId, fileName) {
  await waitForPanel(testId);
  const box = await evaluate(`
    (() => {
      const node = document.querySelector('[data-testid="${testId}"]');
      if (!node) return null;
      node.scrollIntoView({ block: "start" });
      const rect = node.getBoundingClientRect();
      return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
    })()
  `);
  if (!box || box.width < 10 || box.height < 10) {
    console.log(`  ✗ ${fileName}: панель [${testId}] не найдена на странице`);
    return false;
  }

  await sleep(400);
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.min(1600, Math.round(box.width)),
      height: Math.min(4000, Math.round(box.height)),
      scale: 1,
    },
    captureBeyondViewport: true,
  });
  await writeFile(path.join(OUT, fileName), Buffer.from(shot.data, "base64"));
  console.log(`  ✓ ${fileName} (${Math.round(box.width)}×${Math.round(box.height)})`);
  return true;
}

async function shootViewport(fileName) {
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(OUT, fileName), Buffer.from(shot.data, "base64"));
  console.log(`  ✓ ${fileName} (весь экран)`);
}

const PANELS = [
  { view: "schedule", testId: "day-confirmations-panel", slug: "callList" },
  { view: "communications", testId: "message-delivery-console", slug: "delivery" },
  { view: "communications", testId: "campaign-panel", slug: "campaigns" },
  { view: "analytics", testId: "manager-reports-panel", slug: "reports" },
];

await setViewport(1600, 1000);
await sleep(2500);

for (const theme of ["light", "dark", "night"]) {
  console.log(`\nТема: ${theme}`);
  await setTheme(theme);
  await sleep(600);

  for (const panel of PANELS) {
    const navigation = await goToView(panel.view);
    await sleep(1600);
    const ok = await shootPanel(panel.testId, `${theme}_${panel.slug}.png`);
    if (!ok) console.log(`     переход в раздел: ${navigation}`);
  }
}

// Узкий экран проверяется в одной теме: правила перестроения общие.
console.log("\nУзкий экран (планшет в портрете, 720×1100)");
await setTheme("light");
await setViewport(720, 1100);
await sleep(800);
for (const panel of PANELS) {
  await goToView(panel.view);
  await sleep(1500);
  await shootPanel(panel.testId, `narrow_${panel.slug}.png`);
}

await shootViewport("narrow_full.png");

socket.close();
browser.kill();
console.log(`\nСнимки: ${OUT}`);
