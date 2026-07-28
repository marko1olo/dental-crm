/**
 * Снимок ОДНОГО экрана — картотеки — в трёх темах, с проверкой того, что на
 * плите действительно картотека.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ scripts/ops-panels-shots.mjs. Тот сценарий снял
 * patients_light/dark/night_full.png, и все три плиты — экран ввода PIN
 * («Сотрудники клиники / Выберите профиль»), а не картотека. Его аудит этого не
 * заметил: он сверяет тему и уникальность md5, но не проверяет, что нужный
 * раздел вообще отрисован. Здесь снимок делается только после того, как в DOM
 * найдены .patients-panel и хотя бы одна строка article.patient-row; иначе
 * сценарий печатает, ЧТО он увидел вместо картотеки, и падает.
 *
 * Кроме плит снимаются числа, которых нельзя получить чтением css: геометрия
 * двух полей шапки и вычисленные цвета чипов строки пациента в каждой теме.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const OUT = "C:/Clinic_MVP/dental-crm/.dente-ops-shots";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9357;
const THEMES = ["light", "dark", "night"];

const probe = await fetch(webBaseUrl).catch((error) => {
  throw new Error(`Веб-сервер на ${webBaseUrl} недоступен (${error.message}). Он должен быть уже запущен.`);
});
if (!probe.ok) throw new Error(`Веб-сервер ответил ${probe.status}`);

/*
 * Токены подписываются здесь же и живут только в памяти процесса.
 * .ops-shot-tokens.json не используется намеренно: он выдан в 19:07 при сроке
 * жизни 3600 с, и именно из-за его просрочки прогон в 00:46 снял экран входа
 * вместо картотеки. Секрет на диск не пишется и в вывод не попадает.
 */
const minted = await new Promise((resolve, reject) => {
  /*
   * cwd = apps/api НАМЕРЕННО. authSecret.devSecretFilePath() разрешает путь от
   * текущего каталога, а в дереве лежат ДВА файла .data/dev-auth-secret —
   * корневой от 26.07 и apps/api/.data/dev-auth-secret от 28.07. Живой сервер
   * поднят из apps/api и подписывает вторым. Подпись из корня давала токен,
   * который сервер отвергал: замерено — 401 AuthRequired на /api/dashboard и
   * /api/patients и через 5173, и через 4100.
   */
  const child = spawn("npx", ["tsx", "../../scratch/plan-mint-tokens.ts"], {
    cwd: "C:/Clinic_MVP/dental-crm/apps/api",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  let err = "";
  child.stdout.on("data", (chunk) => {
    out += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    err += chunk.toString();
  });
  child.on("close", (code) => {
    if (code !== 0) return reject(new Error(`Подпись токенов не удалась (код ${code}): ${err.trim().slice(0, 400)}`));
    try {
      resolve(JSON.parse(out.trim()));
    } catch {
      reject(new Error(`Подпись токенов вернула не JSON: ${out.trim().slice(0, 200)}`));
    }
  });
});
const { clinicToken, staffToken } = minted;
if (!clinicToken || !staffToken) throw new Error("Подпись токенов вернула пустые значения.");

await mkdir(OUT, { recursive: true });

const browserPath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-plan-patients-profile");
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

async function pageTarget(retries = 60) {
  let seen = [];
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const targets = await response.json();
      seen = targets.filter((t) => t.type === "page").map((t) => t.url);
      const page = targets.find((t) => t.type === "page" && String(t.url).startsWith(webBaseUrl));
      if (page) return page;
    } catch {
      /* браузер поднимается */
    }
    await sleep(1000);
  }
  throw new Error(`Вкладка на ${webBaseUrl} не открылась. Видел: ${seen.join(", ") || "ничего"}`);
}

const target = await pageTarget();
const { WebSocket } = await import("ws").catch(() => ({ WebSocket: globalThis.WebSocket }));
const socket = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let messageId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const payload = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
  const waiter = pending.get(payload.id);
  if (!waiter) return;
  pending.delete(payload.id);
  if (payload.error) waiter.reject(new Error(payload.error.message));
  else waiter.resolve(payload.result);
});

function send(method, params = {}) {
  messageId += 1;
  const id = messageId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    const reason = details.exception?.description || details.exception?.value || details.text || "без описания";
    throw new Error(`Ошибка в странице: ${reason}\n  выражение: ${expression.trim().split("\n")[0].slice(0, 120)}`);
  }
  return result.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1600,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

/*
 * СНАЧАЛА ДОЖДАТЬСЯ ПРОИСХОЖДЕНИЯ, ПОТОМ ПИСАТЬ ТОКЕНЫ. Отладочный порт отдаёт
 * вкладку с адресом приложения раньше, чем документ уходит с about:blank, а там
 * localStorage запрещён по происхождению: запись падала с SecurityError.
 */
await send("Page.navigate", { url: `${webBaseUrl}/` });
for (let attempt = 0; attempt < 60; attempt += 1) {
  const origin = await evaluate("String(location.origin) + '|' + document.readyState");
  if (origin.startsWith(webBaseUrl)) break;
  await sleep(500);
}

await evaluate(`
  (() => {
    window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
    window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
    return true;
  })()
`);
await send("Page.navigate", { url: `${webBaseUrl}/#patients` });
await sleep(6000);

/** Что на экране на самом деле: раздел, число строк списка, признаки заглушек. */
const SCREEN_STATE = `
  (() => {
    const body = document.body.textContent || "";
    return {
      hash: window.location.hash,
      panel: Boolean(document.querySelector(".patients-panel")),
      rows: document.querySelectorAll("article.patient-row").length,
      pinLock: body.includes("Выберите профиль") || body.includes("ВЫБЕРИТЕ СВОЙ ПРОФИЛЬ"),
      login: body.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ"),
      wizard: body.includes("Быстрая настройка CRM Dente"),
      heading: (document.querySelector("h1, h2, .panel-heading")?.textContent || "").trim().slice(0, 80),
    };
  })()
`;

let state = null;
for (let attempt = 0; attempt < 30; attempt += 1) {
  state = await evaluate(SCREEN_STATE);
  if (state.panel && state.rows > 0) break;
  if (state.wizard) {
    await evaluate(`window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true })); location.reload(); true`);
    await sleep(3000);
    continue;
  }
  await evaluate(`
    (() => {
      if (window.location.hash === "#patients") window.dispatchEvent(new HashChangeEvent("hashchange"));
      else window.location.hash = "patients";
      return window.location.hash;
    })()
  `);
  await sleep(1500);
}
console.log("Состояние экрана:", JSON.stringify(state, null, 1));
if (!state?.panel || !state.rows) {
  /* Диагностика: без неё «картотека не отрисована» не отличить от «страница пуста». */
  const dump = await evaluate(`
    (() => ({
      readyState: document.readyState,
      bodyLength: (document.body.textContent || "").length,
      bodyHead: (document.body.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 400),
      rootChildren: document.getElementById("root")?.children.length ?? -1,
      title: document.title,
      hash: window.location.hash,
    }))()
  `);
  console.log("Диагностика страницы:", JSON.stringify(dump, null, 1));
  const diag = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(OUT, "plan_patients_ДИАГНОСТИКА.png"), Buffer.from(diag.data, "base64"));
  console.log("Диагностическая плита: .dente-ops-shots/plan_patients_ДИАГНОСТИКА.png");
  socket.close();
  throw new Error(
    "Картотека не отрисована, снимать нечего. На экране: " +
      (state?.pinLock ? "ввод PIN сотрудника" : state?.login ? "вход в кабинет" : `заголовок «${state?.heading}»`) +
      ". Плита такого экрана — ложное доказательство, поэтому она не записана.",
  );
}

/** Геометрия и цвета: то, чего нельзя получить чтением css. */
const MEASURE = `
  (() => {
    const px = (n) => Math.round(n * 100) / 100;
    const search = document.querySelector(".patients-search-box input");
    const create = document.querySelector(".smart-input-wrapper input:not([type=tel]):not([type=date])");
    const box = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      return {
        width: px(r.width), height: px(r.height), left: px(r.left), top: px(r.top),
        padding: s.padding, border: s.border, borderRadius: s.borderRadius,
        background: s.backgroundColor, color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight,
      };
    };
    const group = document.querySelector(".patients-header .smart-create-group");
    const groupStyle = group ? getComputedStyle(group) : null;
    const row = document.querySelector("article.patient-row");
    const meta = row?.querySelector(".patient-row-meta");
    const chips = meta ? [...meta.children].map((node) => {
      const s = getComputedStyle(node);
      return {
        tag: node.tagName.toLowerCase(),
        cls: node.className || "(без класса)",
        text: (node.textContent || "").trim().slice(0, 44),
        background: s.backgroundColor, color: s.color, borderRadius: s.borderRadius,
        fontWeight: s.fontWeight, cursor: s.cursor,
      };
    }) : [];
    const labels = [...document.querySelectorAll(".patients-header label")].length;
    const nextActions = [...document.querySelectorAll("strong.patient-next-action")].map((n) => (n.textContent || "").trim());
    const tally = {};
    for (const text of nextActions) tally[text] = (tally[text] || 0) + 1;
    const riskChips = {};
    for (const node of document.querySelectorAll(".patient-row-meta span:first-child")) {
      const text = (node.textContent || "").trim();
      riskChips[text] = (riskChips[text] || 0) + 1;
    }
    const stripes = {
      watch: document.querySelectorAll("article.patient-row.risk-watch").length,
      high: document.querySelectorAll("article.patient-row.risk-high").length,
      low: document.querySelectorAll("article.patient-row.risk-low").length,
      total: document.querySelectorAll("article.patient-row").length,
    };
    return {
      theme: document.documentElement.dataset.theme,
      htmlClass: document.documentElement.className,
      search: box(search), create: box(create),
      createGroup: groupStyle ? { background: groupStyle.backgroundColor, border: groupStyle.border, borderRadius: groupStyle.borderRadius, padding: groupStyle.padding } : null,
      visibleLabelsInHeader: labels,
      chips, nextActionTally: tally, riskChipTally: riskChips, stripes,
    };
  })()
`;

async function applyTheme(theme) {
  await evaluate(`
    (() => {
      const store = window.__useThemeStore;
      if (!store) throw new Error("Хранилище темы недоступно: window.__useThemeStore нет");
      store.getState().setThemeMode(${JSON.stringify(theme)});
      return true;
    })()
  `);
  await sleep(1200);
  const applied = await evaluate("document.documentElement.dataset.theme");
  if (applied !== theme) throw new Error(`Просили тему «${theme}», применена «${applied}» — снимок был бы подложным.`);
}

const report = {};
for (const theme of THEMES) {
  await applyTheme(theme);
  const check = await evaluate(SCREEN_STATE);
  if (!check.panel || !check.rows) {
    throw new Error(`После переключения на тему «${theme}» картотека исчезла: ${JSON.stringify(check)}`);
  }
  report[theme] = await evaluate(MEASURE);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const file = path.join(OUT, `plan_patients_${theme}.png`);
  await writeFile(file, Buffer.from(shot.data, "base64"));
  console.log(`  плита ${file} — тема ${report[theme].theme}, строк списка ${check.rows}`);
}

await writeFile(path.join(OUT, "plan-patients-measure.json"), JSON.stringify(report, null, 2), "utf8");
socket.close();

console.log("\n=== ШАПКА: геометрия и цвета ===");
for (const theme of THEMES) {
  const r = report[theme];
  console.log(`\n[${theme}] видимых <label> в шапке: ${r.visibleLabelsInHeader}`);
  console.log(`  поиск:    ширина ${r.search?.width}, фон ${r.search?.background}, рамка ${r.search?.border}, радиус ${r.search?.borderRadius}, отступы ${r.search?.padding}`);
  console.log(`  создание: ширина ${r.create?.width}, фон ${r.create?.background}, рамка ${r.create?.border}, радиус ${r.create?.borderRadius}, отступы ${r.create?.padding}`);
  console.log(`  зона создания: фон ${r.createGroup?.background}, рамка ${r.createGroup?.border}, радиус ${r.createGroup?.borderRadius}`);
}

console.log("\n=== ЧИПЫ ПЕРВОЙ СТРОКИ СПИСКА ===");
for (const theme of THEMES) {
  console.log(`\n[${theme}]`);
  for (const chip of report[theme].chips) {
    console.log(`  <${chip.tag} class="${chip.cls}"> «${chip.text}» фон ${chip.background}, текст ${chip.color}, радиус ${chip.borderRadius}, жирность ${chip.fontWeight}, курсор ${chip.cursor}`);
  }
}

console.log("\n=== ПОВТОРЫ В СПИСКЕ (светлая тема) ===");
console.log("  надписи действия:", JSON.stringify(report.light.nextActionTally));
console.log("  метки риска:     ", JSON.stringify(report.light.riskChipTally));
console.log("  полосы слева:    ", JSON.stringify(report.light.stripes));
console.log("\nЧисла: .dente-ops-shots/plan-patients-measure.json");
