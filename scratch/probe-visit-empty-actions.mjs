/**
 * Пустое состояние приёма: есть ли из него выход.
 *
 * Правило 3 требует, чтобы пустое состояние подсказывало действие. Подсказка
 * «выберите пациента в разделе Пациенты» была, а перейти в раздел из неё было
 * нельзя. Проверяется именно это: кнопки видны и переход РАБОТАЕТ, то есть после
 * нажатия открывается другой раздел, а не просто меняется адрес.
 *
 * Одноразовая проверка, лежит в scratch и в репозиторий не идёт.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9351;

const probe = await fetch(webBaseUrl).catch((error) => {
  throw new Error(`Веб-сервер недоступен (${error.message})`);
});
if (!probe.ok) throw new Error(`Веб-сервер ответил ${probe.status}`);

const browserPath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-visit-probe-profile");
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
process.on("exit", () => {
  try {
    browser.kill();
  } catch {
    /* уже мёртв */
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getPageTarget(retries = 40) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {
      /* поднимается */
    }
    await sleep(1000);
  }
  throw new Error("Отладочный порт не отвечает");
}

const pageTarget = await getPageTarget();
const { default: WebSocket } = await import("ws");
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl, { perMessageDeflate: false });
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
  if (result.exceptionDetails) throw new Error(`Ошибка в странице: ${result.exceptionDetails.text}`);
  return result.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");

const { clinicToken, staffToken } = JSON.parse(await readFile("C:/Clinic_MVP/dental-crm/.ops-shot-tokens.json", "utf8"));
await evaluate(`
  (() => {
    window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
    window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
    return true;
  })()
`);
await send("Page.navigate", { url: `${webBaseUrl}/#visit` });

for (let attempt = 0; attempt < 40; attempt += 1) {
  const ready = await evaluate(
    `Boolean(document.querySelector('[data-testid="visit-view"]')) && !document.body.textContent?.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ")`,
  );
  if (ready) break;
  await sleep(1200);
}
await sleep(2000);

const outcome = await evaluate(`
  (async () => {
    const view = document.querySelector('[data-testid="visit-view"]');
    if (!view) return { шаг: "раздел приёма не отрисован" };
    const empty = view.textContent?.includes("Пациент не выбран");
    if (!empty) {
      return {
        шаг: "пациент уже выбран, пустого состояния нет",
        подсказка: "проверка имеет смысл только когда приём пуст",
      };
    }
    const links = [...view.querySelectorAll("a")].map((node) => ({
      текст: node.textContent?.trim(),
      адрес: node.getAttribute("href"),
      видима: node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0,
      высота: Math.round(node.getBoundingClientRect().height),
    }));
    const target = [...view.querySelectorAll("a")].find(
      (node) => node.getAttribute("href") === "#patients",
    );
    if (!target) return { шаг: "выхода из пустого состояния нет", ссылки: links };
    target.click();
    await new Promise((done) => setTimeout(done, 2000));
    return {
      ссылки: links,
      адрес_после_нажатия: window.location.hash,
      картотека_открылась: Boolean(document.querySelector('[data-testid="patients-view"], #patients')),
    };
  })()
`);

console.log(JSON.stringify(outcome, null, 2));
process.exit(0);
