/**
 * РАЗВЕДКА (только чтение): замер шапки и списка на экране «Пациенты».
 *
 * Ничего не правит, ничего не сеет. Пишет JSON и один снимок в
 * scratch/recon-shots/. Нужен, чтобы наблюдения по картинке подтверждать или
 * снимать ИЗМЕРЕНИЕМ вычисленных стилей, а не разглядыванием уменьшенного кадра.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = "C:/Clinic_MVP/dental-crm";
const OUT = path.join(ROOT, "scratch/recon-shots");
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9377;

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

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-recon-noise-profile");
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
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
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
    pageErrors.push(details?.exception?.description || details?.text || "исключение без описания");
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

/** Пока вкладка на about:blank, localStorage недоступен: ждём нужное происхождение. */
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

const tokenFile = path.join(ROOT, ".ops-shot-tokens.json");
if (!existsSync(tokenFile)) throw new Error(`Нет ${tokenFile}`);
const { clinicToken, staffToken } = JSON.parse(await readFile(tokenFile, "utf8"));

await evaluate(`
  (() => {
    window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
    window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
    return true;
  })()
`);
await send("Page.navigate", { url: `${webBaseUrl}/` });

const deadline = Date.now() + 60000;
let ready = false;
while (Date.now() < deadline) {
  const state = await evaluate(`
    (() => {
      const sidebar = document.querySelector('.sidebar, nav .nav-item');
      const login = document.body.textContent?.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ");
      const wizard = document.body.textContent?.includes("Быстрая настройка CRM Dente");
      return { ready: Boolean(sidebar) && !login && !wizard, wizard: Boolean(wizard) };
    })()
  `);
  if (state?.ready) {
    ready = true;
    break;
  }
  if (state?.wizard) {
    await evaluate(`window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true })); location.reload(); true`);
  }
  await sleep(1200);
}
if (!ready) {
  const diag = await evaluate(`
    (() => ({
      url: location.href,
      заголовок: document.title,
      начало_текста: (document.body.textContent || "").replace(/\\s+/g, " ").slice(0, 600),
      есть_сайдбар: Boolean(document.querySelector('.sidebar, nav .nav-item')),
    }))()
  `).catch((error) => ({ ошибка: error.message }));
  const failShot = await send("Page.captureScreenshot", { format: "png" }).catch(() => null);
  if (failShot) await writeFile(path.join(OUT, "patients-noise-FAIL.png"), Buffer.from(failShot.data, "base64"));
  await writeFile(path.join(OUT, "patients-noise-FAIL.json"), JSON.stringify({ diag, pageErrors }, null, 2), "utf8");
  throw new Error(`Рабочий кабинет не открылся. Диагностика: ${JSON.stringify(diag)}`);
}

await evaluate(`
  (() => {
    const store = window.__useThemeStore;
    if (!store) throw new Error("нет window.__useThemeStore");
    store.getState().setThemeMode("light");
    return true;
  })()
`);
await sleep(600);

await evaluate(`window.location.hash = "patients"; true`);
const panelDeadline = Date.now() + 45000;
let panelReady = false;
while (Date.now() < panelDeadline) {
  const hit = await evaluate(`Boolean(document.querySelector('#patients .patients-header'))`);
  if (hit) {
    panelReady = true;
    break;
  }
  await sleep
    ? await sleep(800)
    : null;
}
if (!panelReady) throw new Error("Раздел «Пациенты» не отрисовался");
await sleep(2500);

const MEASURE = `
  (() => {
    const px = (value) => Number.parseFloat(value) || 0;
    const rect = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { left: +r.left.toFixed(2), right: +r.right.toFixed(2), top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) };
    };
    const style = (node, names) => {
      if (!node) return null;
      const cs = getComputedStyle(node);
      const out = {};
      for (const name of names) out[name] = cs[name];
      return out;
    };
    const FIELD_PROPS = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderLeftWidth", "borderStyle", "borderColor", "borderRadius", "backgroundColor", "backgroundImage", "boxShadow", "fontSize", "fontWeight", "fontFamily", "color", "textTransform", "letterSpacing", "height", "outlineStyle", "backdropFilter"];
    const BOX_PROPS = ["backgroundColor", "backgroundImage", "borderTopWidth", "borderColor", "borderStyle", "borderRadius", "boxShadow", "padding", "flexBasis", "flexGrow", "maxWidth", "backdropFilter"];

    const header = document.querySelector('#patients .patients-header');
    const searchBox = document.querySelector('#patients .patients-search-box');
    const searchInput = searchBox && searchBox.querySelector('input');
    const searchIcon = searchBox && searchBox.querySelector('svg');
    const createGroup = document.querySelector('#patients .smart-create-group');
    const createInput = createGroup && createGroup.querySelector('input:not([type="tel"]):not([type="date"])');
    const createButton = createGroup && createGroup.querySelector('button.quick-create-action');

    const textStart = (input) => {
      if (!input) return null;
      const r = input.getBoundingClientRect();
      const cs = getComputedStyle(input);
      return +(r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft)).toFixed(2);
    };

    const searchStyle = style(searchInput, FIELD_PROPS);
    const createStyle = style(createInput, FIELD_PROPS);
    const identical = [];
    const different = {};
    for (const name of FIELD_PROPS) {
      if (searchStyle && createStyle && searchStyle[name] === createStyle[name]) identical.push(name);
      else different[name] = { поиск: searchStyle?.[name], создание: createStyle?.[name] };
    }
    const sRect = rect(searchInput);
    const cRect = rect(createInput);
    if (sRect && cRect && Math.abs(sRect.width - cRect.width) > 0.5) {
      different.width = { поиск: sRect.width, создание: cRect.width };
    }

    const iconRect = rect(searchIcon);
    const searchTextStart = textStart(searchInput);

    const rows = [...document.querySelectorAll('#patients .patient-row')].map((row) => {
      const name = row.querySelector('h3');
      const action = row.querySelector('.patient-next-action');
      const metaSpans = [...row.querySelectorAll('.patient-row-meta span')].map((s) => s.textContent);
      const link = row.querySelector('.round-link');
      return {
        имя_сырое: name ? JSON.stringify(name.textContent) : null,
        имя_transform: name ? getComputedStyle(name).textTransform : null,
        телефон: row.querySelector('p') ? row.querySelector('p').textContent : null,
        значок: metaSpans[0] ?? null,
        прочие_плашки: metaSpans.slice(1),
        подсказка: action ? action.textContent : null,
        подсказка_тег: action ? action.tagName : null,
        подсказка_role: action ? action.getAttribute('role') : null,
        подсказка_tabindex: action ? action.tabIndex : null,
        подсказка_onclick: action ? Boolean(action.onclick) : null,
        подсказка_курсор: action ? getComputedStyle(action).cursor : null,
        подсказка_стиль: action ? style(action, ["backgroundColor", "borderTopWidth", "borderColor", "borderRadius", "fontWeight", "fontSize", "padding", "display"]) : null,
        подсказка_прямоуг: rect(action),
        стрелка_есть: Boolean(link),
        стрелка_прямоуг: rect(link),
        строка_прямоуг: rect(row),
        классы: row.className,
      };
    });

    const cardTitle = document.querySelector('#patients .patient-admin-panel .panel-heading span');
    const filterChips = [...document.querySelectorAll('#patients .patient-row-meta')].length;

    return {
      окно: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
      тема: { dataTheme: document.documentElement.getAttribute('data-theme') },
      шапка: { прямоуг: rect(header), стиль: style(header, ["flexWrap", "gap", "justifyContent", "backgroundColor", "borderColor"]) },
      поиск: {
        подсказка_текста: searchInput ? searchInput.placeholder : null,
        ariaLabel: searchInput ? searchInput.getAttribute('aria-label') : null,
        видимая_подпись: searchBox ? [...searchBox.querySelectorAll('label')].map((l) => l.textContent) : null,
        type: searchInput ? searchInput.type : null,
        поле: sRect,
        бокс: rect(searchBox),
        бокс_стиль: style(searchBox, BOX_PROPS),
        иконка: iconRect,
        начало_текста_px: searchTextStart,
        перекрытие_иконка_текст_px: iconRect && searchTextStart !== null ? +(iconRect.right - searchTextStart).toFixed(2) : null,
      },
      создание: {
        подсказка_текста: createInput ? createInput.placeholder : null,
        ariaLabel: createInput ? createInput.getAttribute('aria-label') : null,
        видимая_подпись: createGroup ? [...createGroup.querySelectorAll('label')].map((l) => l.textContent) : null,
        type: createInput ? createInput.type : null,
        поле: cRect,
        группа: rect(createGroup),
        группа_стиль: style(createGroup, BOX_PROPS),
        кнопка: rect(createButton),
        кнопка_текст: createButton ? createButton.textContent : null,
        кнопка_disabled: createButton ? createButton.disabled : null,
      },
      стили_полей: { одинаковые: identical, различия: different },
      список: {
        всего_строк: rows.length,
        уникальных_значков: [...new Set(rows.map((r) => r.значок))],
        уникальных_подсказок: [...new Set(rows.map((r) => r.подсказка))],
        строки: rows,
      },
      карточка: { заголовок: cardTitle ? JSON.stringify(cardTitle.textContent) : null },
      мета_блоков: filterChips,
      ошибки_страницы: [],
    };
  })()
`;

const measured = await evaluate(MEASURE);
measured.ошибки_страницы = pageErrors.slice(0, 10);
await writeFile(path.join(OUT, "patients-noise-measure.json"), JSON.stringify(measured, null, 2), "utf8");

const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile(path.join(OUT, "patients-noise-header.png"), Buffer.from(shot.data, "base64"));

console.log(JSON.stringify({
  строк: measured.список.всего_строк,
  значки: measured.список.уникальных_значков,
  подсказки: measured.список.уникальных_подсказок,
  перекрытие: measured.поиск.перекрытие_иконка_текст_px,
  paddingLeft_поиска: measured.стили_полей.различия.paddingLeft ?? "совпадает",
  одинаковых_свойств: measured.стили_полей.одинаковые.length,
  различий: Object.keys(measured.стили_полей.различия),
}, null, 2));

socket.close();
browser.kill();
process.exit(0);
