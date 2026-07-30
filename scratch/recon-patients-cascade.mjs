/**
 * РАЗВЕДКА (только чтение): замер КАСКАДА на реальных таблицах стилей, которые
 * отдаёт живой Vite на 5173.
 *
 * ЗАЧЕМ ЭТО, А НЕ ЗАМЕР ЖИВОГО ЭКРАНА. API на 4100 лежит (проверено:
 * netstat не показывает слушателя, curl отдаёт 000), приложение показывает
 * «Рабочий сервер недоступен», раздела «Пациенты» в DOM нет вообще. Замерить
 * живой список нечем. Но вопрос «какое padding-left в самом деле применяется к
 * полю поиска» — это вопрос каскада, а не данных: он решается на тех же
 * таблицах стилей, что отдаёт сервер, если воспроизвести разметку узел в узел
 * из PatientsView.tsx с той же цепочкой предков из App.tsx:2370.
 *
 * ЧТО ЭТО НЕ ДОКАЗЫВАЕТ: ничего про данные, список пациентов, значки и
 * подсказки. Только вычисленные стили шапки.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = "C:/Clinic_MVP/dental-crm";
const OUT = path.join(ROOT, "scratch/recon-shots");
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9379;

const probe = await fetch(webBaseUrl).catch((error) => {
  throw new Error(`Веб-сервер на ${webBaseUrl} недоступен (${error.message}).`);
});
if (!probe.ok) throw new Error(`Веб-сервер ответил ${probe.status}`);
await mkdir(OUT, { recursive: true });

const browserPath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-recon-cascade-profile");
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
  throw new Error("Отладочный порт браузера не отвечает");
}

const pageTarget = await getPageTarget();
const { default: WebSocket } = await import("ws");
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
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

const originDeadline = Date.now() + 45000;
let originOk = false;
while (Date.now() < originDeadline) {
  const where = await evaluate(`location.origin`).catch(() => null);
  if (where === webBaseUrl) {
    originOk = true;
    break;
  }
  await send("Page.navigate", { url: `${webBaseUrl}/` }).catch(() => null);
  await sleep(1500);
}
if (!originOk) throw new Error(`Вкладка не открыла ${webBaseUrl}`);

/** Ждём, пока Vite подтянет таблицы стилей приложения: без них замер бессмыслен. */
const cssDeadline = Date.now() + 60000;
let cssState = null;
while (Date.now() < cssDeadline) {
  cssState = await evaluate(`
    (() => {
      let rules = 0;
      let searchRule = false;
      let globalImportant = false;
      for (const sheet of document.styleSheets) {
        let list;
        try { list = sheet.cssRules; } catch { continue; }
        const walk = (items) => {
          for (const rule of items) {
            if (rule.cssRules) walk(rule.cssRules);
            if (!rule.selectorText) continue;
            rules += 1;
            if (rule.selectorText === ".patients-search-box input") searchRule = true;
            if (rule.selectorText.replace(/\\s+/g, "") === "input,textarea" && rule.style && rule.style.getPropertyPriority("padding") === "important") globalImportant = true;
          }
        };
        walk(list);
      }
      return { rules, searchRule, globalImportant };
    })()
  `);
  if (cssState?.searchRule && cssState?.globalImportant) break;
  await sleep
    ? await sleep(1000)
    : null;
}
if (!cssState?.searchRule) throw new Error(`Правило .patients-search-box input не найдено в загруженных стилях (правил ${cssState?.rules ?? 0})`);

/** Тема: замер делаем в светлой, как на кадре ведущего. */
await evaluate(`
  (() => {
    const store = window.__useThemeStore;
    if (store) store.getState().setThemeMode("light");
    else document.documentElement.setAttribute("data-theme", "light");
    return document.documentElement.getAttribute("data-theme");
  })()
`);
await sleep(400);

/**
 * Разметка воспроизведена узел в узел по PatientsView.tsx:153-256 с цепочкой
 * предков из App.tsx:2370. Иконка — тот же svg, что рисует lucide-react
 * (class="lucide lucide-search", width/height 24 по умолчанию).
 */
const HARNESS = String.raw`
  (() => {
    const host = document.createElement("div");
    host.id = "recon-cascade-host";
    host.innerHTML = [
      '<main class="app-shell dente-redesign" data-collapsed="false">',
      '<section class="workspace view-patients" id="recon-workspace-content" tabindex="-1">',
      '<div class="patients-panel" id="recon-patients">',
      '<header class="patients-header">',
      '<div class="patients-search-box">',
      '<svg class="lucide lucide-search" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>',
      '<input aria-label="Поиск пациента" type="search" autocomplete="off" placeholder="Поиск пациента: ФИО или телефон">',
      '</div>',
      '<div class="smart-create-group">',
      '<div class="smart-input-wrapper">',
      '<input aria-label="Быстрый ввод пациентов" autocomplete="name" placeholder="ФИО, телефон, дата рождения (Enter)">',
      '<button type="button" class="smart-mic-button" style="position:absolute;right:4px;top:50%;transform:translateY(-50%)">mic</button>',
      '<input type="tel" inputmode="tel" autocomplete="tel" title="Телефон нового пациента" placeholder="Телефон пациента" style="display:none">',
      '<input type="date" autocomplete="bday" title="Дата рождения пациента" placeholder="Дата рождения" style="display:none">',
      '</div>',
      '<button class="primary-button quick-create-action" type="button" title="Создать пациента" disabled>Создать</button>',
      '</div>',
      '</header>',
      '</div>',
      '</section>',
      '</main>',
    ].join("");
    document.body.appendChild(host);
    return true;
  })()
`;
await evaluate(HARNESS);
await sleep(500);

const MEASURE = String.raw`
  (() => {
    const px = (value) => Number.parseFloat(value) || 0;
    const rect = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { left: +r.left.toFixed(2), right: +r.right.toFixed(2), top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) };
    };
    const FIELD_PROPS = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderLeftWidth", "borderStyle", "borderTopColor", "borderRadius", "backgroundColor", "backgroundImage", "boxShadow", "fontSize", "fontWeight", "fontFamily", "color", "textTransform", "letterSpacing", "height", "backdropFilter"];
    const BOX_PROPS = ["backgroundColor", "backgroundImage", "borderTopWidth", "borderTopColor", "borderStyle", "borderRadius", "boxShadow", "paddingTop", "paddingLeft", "flexBasis", "flexGrow", "maxWidth", "backdropFilter"];
    const style = (node, names) => {
      if (!node) return null;
      const cs = getComputedStyle(node);
      const out = {};
      for (const name of names) out[name] = cs[name];
      return out;
    };

    const root = document.getElementById("recon-patients");
    const searchBox = root.querySelector(".patients-search-box");
    const searchInput = searchBox.querySelector("input");
    const icon = searchBox.querySelector("svg");
    const group = root.querySelector(".smart-create-group");
    const createInput = group.querySelector('input:not([type="tel"]):not([type="date"])');
    const createButton = group.querySelector("button.quick-create-action");

    const searchStyle = style(searchInput, FIELD_PROPS);
    const createStyle = style(createInput, FIELD_PROPS);
    const identical = [];
    const different = {};
    for (const name of FIELD_PROPS) {
      if (searchStyle[name] === createStyle[name]) identical.push(name);
      else different[name] = { поиск: searchStyle[name], создание: createStyle[name] };
    }

    const sRect = rect(searchInput);
    const cRect = rect(createInput);
    const iRect = rect(icon);
    const cs = getComputedStyle(searchInput);
    const textStart = +(sRect.left + px(cs.borderLeftWidth) + px(cs.paddingLeft)).toFixed(2);

    return {
      окно: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
      тема: document.documentElement.getAttribute("data-theme"),
      поиск: {
        поле: sRect,
        бокс: rect(searchBox),
        бокс_стиль: style(searchBox, BOX_PROPS),
        стиль: searchStyle,
        иконка: iRect,
        объявленный_paddingLeft_в_patients_redesign: "40px",
        применённый_paddingLeft: cs.paddingLeft,
        начало_текста_px: textStart,
        зазор_иконка_до_текста_px: +(textStart - iRect.right).toFixed(2),
      },
      создание: {
        поле: cRect,
        группа: rect(group),
        группа_стиль: style(group, BOX_PROPS),
        стиль: createStyle,
        кнопка: rect(createButton),
      },
      сравнение_полей: { одинаковые: identical, различия: different, ширины: { поиск: sRect.width, создание: cRect.width } },
    };
  })()
`;

const measured = await evaluate(MEASURE);
measured.каскад = cssState;
await writeFile(path.join(OUT, "patients-cascade-measure.json"), JSON.stringify(measured, null, 2), "utf8");

const box = measured.поиск.бокс;
const clip = { x: Math.max(0, box.left - 20), y: Math.max(0, box.top - 20), width: Math.min(900, measured.создание.кнопка.right - box.left + 60), height: box.height + 40, scale: 3 };
const shot = await send("Page.captureScreenshot", { format: "png", clip });
await writeFile(path.join(OUT, "patients-cascade-header-3x.png"), Buffer.from(shot.data, "base64"));

console.log(JSON.stringify({
  применённый_paddingLeft: measured.поиск.применённый_paddingLeft,
  объявленный: "40px",
  иконка_правый_край: measured.поиск.иконка.right,
  начало_текста: measured.поиск.начало_текста_px,
  зазор: measured.поиск.зазор_иконка_до_текста_px,
  одинаковых_свойств: measured.сравнение_полей.одинаковые.length,
  различия: Object.keys(measured.сравнение_полей.различия),
  ширины: measured.сравнение_полей.ширины,
  глобальное_important_найдено: cssState.globalImportant,
}, null, 2));

socket.close();
browser.kill();
process.exit(0);
