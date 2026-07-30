/**
 * Проверка ЗАПИСИ в лист ожидания настоящим нажатием в браузере.
 *
 * ЗАЧЕМ. Живым curl уже доказано, что POST /api/waitlist с одним токеном клиники
 * отвечает 401 «Требуется вход сотрудника», а с токеном сотрудника — 200. Но
 * доказательство на уровне curl НЕ доказывает, что исправленный ящик отправляет
 * оба токена: между кодом и сетью стоит браузер, localStorage и React. Поэтому
 * здесь настоящий сценарий администратора: выбрать пациента в списке, нажать
 * «Добавить в очередь», посмотреть, что очередь выросла, и убрать за собой.
 *
 * Одноразовая проверка, лежит в scratch и в репозиторий не идёт.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9347;

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

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-waitlist-probe-profile");
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
      /* браузер поднимается */
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
const pageErrors = [];
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params?.exceptionDetails;
    pageErrors.push(details?.exception?.description || details?.text || "исключение");
    return;
  }
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
await send("Page.navigate", { url: `${webBaseUrl}/#schedule` });

for (let attempt = 0; attempt < 40; attempt += 1) {
  const ready = await evaluate(`Boolean(document.querySelector('.sidebar, nav .nav-item')) && !document.body.textContent?.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ")`);
  if (ready) break;
  await sleep(1200);
}
await sleep(1500);

// Раздел подключается лениво: ждём саму кнопку, а не спим наугад. Первый прогон
// не нашёл её именно из-за спешки, и «кнопки нет» было бы ложным выводом.
let buttonReady = false;
for (let attempt = 0; attempt < 30; attempt += 1) {
  buttonReady = await evaluate(
    `[...document.querySelectorAll("button")].some((node) => node.textContent?.trim().startsWith("Лист ожидания"))`,
  );
  if (buttonReady) break;
  await sleep(1000);
}
console.log(buttonReady ? "кнопка «Лист ожидания» появилась" : "кнопка не появилась за 30 секунд");

/*
 * Настоящее нажатие. Значение управляемого React-списка ставится нативным
 * сеттером с событием change — иначе React не узнает о выборе и отправит пустой
 * patientId, то есть проверка проверила бы не то.
 */
const outcome = await evaluate(`
  (async () => {
    const openButton = [...document.querySelectorAll("button")].find(
      (node) => node.textContent?.trim().startsWith("Лист ожидания"),
    );
    if (!openButton) return { шаг: "кнопка листа ожидания не найдена" };
    openButton.click();
    await new Promise((done) => setTimeout(done, 1500));

    const drawer = document.querySelector('[data-testid="waitlist-drawer"]');
    if (!drawer) return { шаг: "ящик не открылся" };

    const before = [...drawer.querySelectorAll("h5")].map((node) => node.textContent?.trim());

    const select = drawer.querySelector("select");
    const options = select ? [...select.options].filter((option) => option.value) : [];
    if (!options.length) return { шаг: "в списке пациентов нечего выбрать", before };
    const chosen = options[0];

    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
    setter.call(select, chosen.value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((done) => setTimeout(done, 400));

    const submit = [...drawer.querySelectorAll("button")].find(
      (node) => node.textContent?.trim() === "Добавить в очередь",
    );
    if (!submit) return { шаг: "кнопка добавления не найдена", before };
    submit.click();
    await new Promise((done) => setTimeout(done, 2500));

    const after = [...drawer.querySelectorAll("h5")].map((node) => node.textContent?.trim());
    const toast = document.body.innerText.match(/[^\\n]*(добавлен|Не удалось|нет прав|отказ)[^\\n]*/i);

    return {
      выбран: chosen.textContent?.trim(),
      было: before,
      стало: after,
      выросла: after.length > before.length,
      сообщение: toast ? toast[0].trim() : "(сообщения не видно)",
    };
  })()
`);

console.log(JSON.stringify(outcome, null, 2));
if (pageErrors.length) console.log("ОШИБКИ СТРАНИЦЫ:", pageErrors.slice(0, 5));
process.exit(0);
