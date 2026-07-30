/**
 * ЗАМЕР В ЖИВОМ БРАУЗЕРЕ для разведки шума на экране «Картотека».
 *
 * Отвечает измерением, а не картинкой, на четыре вопроса ведущего:
 *   1. Совпадают ли ФАКТИЧЕСКИЕ (вычисленные) стили и размеры двух полей шапки.
 *   2. Одинаковы ли значок риска и подсказка действия во ВСЕХ строках списка,
 *      и является ли подсказка кнопкой (tagName / onclick / role / cursor).
 *   3. Совпадает ли ФИО в строке списка с ФИО в заголовке карточки — по DOM,
 *      а не по глазам, с указанием id выбранного пациента.
 *   4. Зазор между иконкой лупы и началом текста подсказки (снятое наблюдение
 *      ведущего — проверяется ИЗМЕРЕНИЕМ, как он и требовал).
 *
 * Плюс проверка гипотезы о сломанном комментарии в main.css: у .patient-next-action
 * объявление background может съедаться разбором CSS, и тогда вычисленный фон
 * будет прозрачным, а не var(--srf-chip-soft).
 *
 * ТОЛЬКО ЧТЕНИЕ СТРАНИЦЫ. Ни одного клика, меняющего данные: ни создания
 * пациента, ни сохранения. Ходит по разделу и читает DOM.
 *
 * ЗАПУСК (нужен живой веб-сервер на 5173 и живой API):
 *   node scratch/lead-noise-measure-browser.mjs
 * Результат: scratch/lead-noise-measure.json (читать файлом, не из консоли —
 * консоль Windows портит кириллицу).
 */

import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const OUT = "C:/Clinic_MVP/dental-crm/scratch/lead-noise-measure.json";
const webBaseUrl = process.env.DENTE_SHOT_WEB_URL || "http://127.0.0.1:5173";
const cdpPort = Number(process.env.DENTE_SHOT_CDP_PORT || 9347);
const demoLogin = {
  email: process.env.DENTE_SHOT_EMAIL || "doctor@clinic.com",
  password: process.env.DENTE_SHOT_PASSWORD || "password",
};

const probe = await fetch(webBaseUrl).catch((error) => {
  throw new Error(`Веб-сервер на ${webBaseUrl} недоступен (${error.message}): замерять нечего.`);
});
if (!probe.ok) throw new Error(`Веб-сервер на ${webBaseUrl} ответил ${probe.status}`);

const browserPath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", `dente-noise-profile-${Date.now()}`);
await rm(tmpProfile, { recursive: true, force: true }).catch(() => {});
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
    "--window-size=1440,900",
    `${webBaseUrl}/`,
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
const browserStderr = [];
browser.stderr?.on("data", (chunk) => {
  browserStderr.push(chunk.toString());
  if (browserStderr.length > 40) browserStderr.splice(0, browserStderr.length - 40);
});

let closeSocket = () => {};
let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    closeSocket();
  } catch {
    /* сокет закрыт */
  }
  try {
    browser.kill();
  } catch {
    /* браузер мёртв */
  }
}
process.on("exit", shutdown);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getTargets(retries = 40) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const targets = await response.json();
      if (targets.length) return targets;
    } catch {
      /* поднимается */
    }
    await sleep(1000);
  }
  throw new Error(`Отладочный порт ${cdpPort} молчит. Последнее от браузера: ${browserStderr.slice(-3).join(" ").trim()}`);
}

const targets = await getTargets();
const pageTarget = targets.find((target) => target.type === "page") ?? targets[0];
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
closeSocket = () => socket.close();

let messageId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  clearTimeout(request.timer);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
};
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = () => reject(new Error("Веб-сокет отладки не открылся"));
});

const cdp = {
  send(method, params = {}) {
    messageId += 1;
    const id = messageId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        reject(new Error(`${method}: браузер не ответил за 120 с`));
        // 120 с, а не 30: вход через прокси Vite на холодном tsx-watch API не
        // уложился в 30 с и прогон падал на «браузер не ответил», хотя браузер
        // был жив и ждал ответа сервера. Симптом называл не ту причину.
      }, 120000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  },
};

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

async function evaluate(expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result?.exceptionDetails) {
    const details = result.exceptionDetails;
    throw new Error(`Ошибка в странице: ${details.exception?.description || details.text || "исключение"}`);
  }
  return result?.result?.value;
}

/*
 * Явный переход, а не надежда на аргумент командной строки. Первая попытка
 * упала на «Failed to fetch» внутри страницы: отладчик подключился к вкладке,
 * которая ещё стояла на about:blank, и относительный путь /api/auth/login
 * уходил в никуда. Ошибка выглядела как отказ входа, а была отказом адреса —
 * поэтому здесь адрес проверяется, а не предполагается.
 */
await cdp.send("Page.navigate", { url: `${webBaseUrl}/` });
let landed = null;
for (let attempt = 0; attempt < 60; attempt += 1) {
  await sleep(500);
  landed = await evaluate(`({ href: location.href, state: document.readyState })`).catch(() => null);
  if (landed?.href?.startsWith(webBaseUrl) && landed.state === "complete") break;
}
if (!landed?.href?.startsWith(webBaseUrl)) {
  throw new Error(`Страница не перешла на ${webBaseUrl}: сейчас «${landed?.href}». Запрос к /api/... из about:blank уходит в никуда и выглядит как отказ входа.`);
}
console.log(`страница: ${landed.href} (${landed.state})`);

/*
 * ВХОД ГОТОВЫМИ ТОКЕНАМИ, А НЕ ЗАПРОСОМ /api/auth/login.
 *
 * Почему не запросом. Замер шёл в момент, когда PostgreSQL на 127.0.0.1:5432
 * держал 192 установленных соединения и отказывал в новых (ECONNREFUSED на
 * уровне TCP, то есть переполнена очередь входящих). Маршрут входа висит на
 * ожидании слота в пуле: curl к нему не вернулся за 30 с ни через прокси Vite,
 * ни напрямую в API, при этом /api/health отвечает за 42 мс. Прогон падал на
 * «браузер не ответил», хотя браузер был жив и ждал сервер — симптом называл не
 * ту причину.
 *
 * Токены берутся из .ops-shot-tokens.json (их выдаёт seedOpsScreenshotDemo).
 * Это НЕ подложные строки вида «demo-staff-token»: подложный токен даёт
 * видимость сессии и снимок экрана входа под именем раздела. Здесь настоящие
 * подписанные токены, поэтому шапка раздела рисуется без обращения к базе, и
 * геометрию полей можно измерить, пока данные списка недоступны.
 */
await sleep(3000);
const tokensRaw = await import("node:fs/promises").then((fs) =>
  fs.readFile("C:/Clinic_MVP/dental-crm/.ops-shot-tokens.json", "utf8"),
);
const tokens = JSON.parse(tokensRaw);
if (!tokens?.clinicToken || !tokens?.staffToken) {
  throw new Error(".ops-shot-tokens.json не содержит clinicToken/staffToken: пересейте демо-данные.");
}
const session = await evaluate(`(() => {
  const tokens = ${JSON.stringify({ clinicToken: tokens.clinicToken, staffToken: tokens.staffToken, organizationId: tokens.user?.organizationId ?? null })};
  localStorage.setItem("dente_clinic_token", tokens.clinicToken);
  localStorage.setItem("dente_staff_token", tokens.staffToken);
  if (tokens.organizationId) localStorage.setItem("dente_clinic_tenant_id", tokens.organizationId);
  localStorage.setItem("dente_workspace_role", "owner");
  localStorage.setItem("dente_onboarding_completed", "true");
  localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ version: 1, dismissed: true, savedAt: new Date().toISOString() }));
  localStorage.setItem("dente_onboarding_dismissed_v1", JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
  return { ok: true, status: 200, organization: tokens.organizationId };
})()`);
if (!session?.ok) throw new Error("Токены не удалось положить в localStorage");

await evaluate(`window.location.reload()`);
for (let attempt = 0; attempt < 40; attempt += 1) {
  const ready = await evaluate(`Boolean(document.querySelector('.shift-hero, .panel, .today-schedule-box, .section-card'))`);
  if (ready) break;
  await sleep(500);
}
await sleep(1500);

// Гашение экрана PIN и переход в картотеку — тем же способом, что и в штатном сценарии.
await evaluate(`(() => {
  const pinPad = document.querySelector('.staff-pin-pad, .pin-lock-screen');
  if (!pinPad) return false;
  const staffCard = document.querySelector('.staff-card, .staff-member-item');
  if (staffCard) staffCard.click();
  const zeroButton = [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === '0');
  if (zeroButton) { for (let index = 0; index < 4; index += 1) zeroButton.click(); }
  return true;
})()`);
await evaluate(`(() => {
  const link = document.querySelector('aside.sidebar nav a[href="#patients"], .dnt-bottom-nav a[href="#patients"]');
  if (link) { link.click(); return true; }
  window.location.hash = "#patients";
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  return false;
})()`);

/*
 * ПОРОГ ГОТОВНОСТИ РАЗДЕЛЁН НА ДВА, И ЭТО НЕ ОСЛАБЛЕНИЕ ПРОВЕРКИ.
 *
 * Обязательное — шапка раздела (.patients-header с двумя полями): именно её
 * геометрию мерит наблюдение 1 и наблюдение 4, и она не зависит от базы. Нет
 * шапки — падаем, мерить нечего.
 *
 * Необязательное — строки списка (.patient-row): они приходят из базы, а база
 * сейчас отказывает в соединениях. Их отсутствие фиксируется как факт
 * («строк 0, потому что база недоступна»), а не выдаётся за пустой список
 * клиники. Наблюдения 2 и 3 в таком прогоне НЕ измеряются — так и записано в
 * результате, вместо тихого нуля, который прочитали бы как «шума нет».
 */
let headerReady = false;
for (let attempt = 0; attempt < 120; attempt += 1) {
  headerReady = await evaluate(
    `Boolean(document.querySelector('.patients-header .patients-search-box input') && document.querySelector('.patients-header .smart-create-group input'))`,
  );
  if (headerReady) break;
  await sleep(250);
}
if (!headerReady) {
  const where = await evaluate(
    `({ hash: location.hash, hasPanel: Boolean(document.querySelector('#patients')), rows: document.querySelectorAll('.patient-row').length, login: document.body.textContent.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ"), pin: Boolean(document.querySelector('.staff-pin-pad, .pin-lock-screen')), bodyHead: document.body.textContent.trim().slice(0, 200) })`,
  );
  throw new Error(`Шапка картотеки не отрисовалась: ${JSON.stringify(where)}. Замер остановлен — пустой экран мог быть 401, а не дефектом.`);
}
// Строкам списка даём отдельный, короткий бюджет: их может не быть вовсе.
let rowsAppeared = false;
for (let attempt = 0; attempt < 24; attempt += 1) {
  rowsAppeared = await evaluate(`document.querySelectorAll('.patient-row').length > 0`);
  if (rowsAppeared) break;
  await sleep(250);
}
console.log(`шапка: есть; строки списка: ${rowsAppeared ? "есть" : "НЕТ (база недоступна) — наблюдения 2 и 3 в этом прогоне не измеряются"}`);
await sleep(800);

// Тема задаётся явно: наблюдение ведущего сделано на светлом кадре.
await evaluate(`(() => { const store = window.__useThemeStore; if (store) store.getState().setThemeMode("light"); return Boolean(store); })()`);
await sleep(900);

const MEASURE = `
(() => {
  const props = [
    "paddingTop","paddingRight","paddingBottom","paddingLeft",
    "borderTopWidth","borderTopStyle","borderTopColor",
    "borderRadius","fontSize","fontWeight","fontFamily",
    "backgroundColor","color","boxShadow","height","lineHeight","textTransform"
  ];
  const styleOf = (node) => {
    const computed = getComputedStyle(node);
    const out = {};
    for (const prop of props) out[prop] = computed[prop];
    return out;
  };
  const rectOf = (node) => {
    const r = node.getBoundingClientRect();
    return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2) };
  };

  const searchBox = document.querySelector(".patients-search-box");
  const searchInput = searchBox ? searchBox.querySelector("input") : null;
  const searchIcon = searchBox ? searchBox.querySelector("svg") : null;
  const createGroup = document.querySelector(".smart-create-group");
  const createInput = createGroup ? createGroup.querySelector(".smart-input-wrapper input:not([type=tel]):not([type=date])") : null;
  const createButton = createGroup ? createGroup.querySelector("button.quick-create-action") : null;

  // 1. ДВА ПОЛЯ: что реально совпало, а что различается.
  const differences = [];
  const identical = [];
  if (searchInput && createInput) {
    const a = styleOf(searchInput), b = styleOf(createInput);
    for (const prop of props) {
      if (a[prop] === b[prop]) identical.push(prop);
      else differences.push({ prop, search: a[prop], create: b[prop] });
    }
  }

  // Контейнеры: есть ли между половинами видимая граница.
  const containerStyle = (node) => {
    if (!node) return null;
    const c = getComputedStyle(node);
    return {
      backgroundColor: c.backgroundColor, borderTopWidth: c.borderTopWidth, borderTopColor: c.borderTopColor,
      borderTopStyle: c.borderTopStyle, borderRadius: c.borderRadius, boxShadow: c.boxShadow, padding: c.padding,
      flexBasis: c.flexBasis, flexGrow: c.flexGrow, maxWidth: c.maxWidth
    };
  };
  const header = document.querySelector(".patients-header");

  // Видимая подпись: есть ли <label> у любого из полей.
  const visibleLabelFor = (node) => {
    if (!node) return null;
    const byId = node.id ? document.querySelector('label[for="' + node.id + '"]') : null;
    const wrapping = node.closest("label");
    const found = byId || wrapping;
    return {
      hasLabelElement: Boolean(found),
      labelText: found ? found.textContent.trim().slice(0, 60) : null,
      ariaLabel: node.getAttribute("aria-label"),
      placeholder: node.getAttribute("placeholder"),
      title: node.getAttribute("title")
    };
  };

  // 4. ЛУПА И ТЕКСТ ПОДСКАЗКИ: зазор измерением.
  let iconGap = null;
  if (searchInput && searchIcon) {
    const inputRect = searchInput.getBoundingClientRect();
    const iconRect = searchIcon.getBoundingClientRect();
    const cs = getComputedStyle(searchInput);
    const borderLeft = parseFloat(cs.borderLeftWidth) || 0;
    const textStartX = inputRect.x + borderLeft + (parseFloat(cs.paddingLeft) || 0);
    iconGap = {
      inputX: +inputRect.x.toFixed(2),
      iconX: +iconRect.x.toFixed(2),
      iconRight: +iconRect.right.toFixed(2),
      iconWidth: +iconRect.width.toFixed(2),
      paddingLeft: cs.paddingLeft,
      borderLeftWidth: cs.borderLeftWidth,
      textStartX: +textStartX.toFixed(2),
      gapPx: +(textStartX - iconRect.right).toFixed(2),
      iconOverlapsText: textStartX < iconRect.right
    };
  }

  // 2. СТРОКИ СПИСКА: значок, подсказка, что это за элемент.
  const rows = [...document.querySelectorAll(".patient-row")].map((row, index) => {
    const nameNode = row.querySelector("h3");
    const meta = row.querySelector(".patient-row-meta");
    const chips = meta ? [...meta.querySelectorAll("span")].map((s) => s.textContent.trim()) : [];
    const action = row.querySelector(".patient-next-action");
    const roundLink = row.querySelector(".round-link");
    return {
      index,
      name: nameNode ? nameNode.textContent : null,
      nameComputedTextTransform: nameNode ? getComputedStyle(nameNode).textTransform : null,
      phone: row.querySelector("p") ? row.querySelector("p").textContent : null,
      riskClass: [...row.classList].filter((cls) => cls.startsWith("risk-")),
      selected: row.classList.contains("selected"),
      chips,
      action: action ? {
        text: action.textContent,
        tagName: action.tagName,
        role: action.getAttribute("role"),
        tabIndex: action.tabIndex,
        hasOnClickAttr: action.hasAttribute("onclick"),
        cursor: getComputedStyle(action).cursor,
        backgroundColor: getComputedStyle(action).backgroundColor,
        color: getComputedStyle(action).color,
        borderRadius: getComputedStyle(action).borderRadius,
        borderTopWidth: getComputedStyle(action).borderTopWidth,
        fontWeight: getComputedStyle(action).fontWeight,
        display: getComputedStyle(action).display,
        rect: rectOf(action)
      } : null,
      roundLink: roundLink ? { ariaLabel: roundLink.getAttribute("aria-label"), rect: rectOf(roundLink) } : null,
      rowCursor: getComputedStyle(row).cursor,
      rowBorderLeft: getComputedStyle(row).borderLeftWidth + " " + getComputedStyle(row).borderLeftColor
    };
  });

  // 3. ФИО: строка списка против заголовка карточки.
  const cardHeadingNode = document.querySelector(".patient-admin-panel .panel-heading span");
  const cardNameInput = document.querySelector(".patient-core-form-grid input[autocomplete=name]");
  const selectedRow = rows.find((r) => r.selected);

  return {
    measuredAt: new Date().toISOString(),
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    theme: { dataTheme: document.documentElement.getAttribute("data-theme"), htmlClass: document.documentElement.className },
    twoFields: {
      present: Boolean(searchInput && createInput),
      identicalProps: identical,
      differingProps: differences,
      searchRect: searchInput ? rectOf(searchInput) : null,
      createRect: createInput ? rectOf(createInput) : null,
      searchLabel: visibleLabelFor(searchInput),
      createLabel: visibleLabelFor(createInput),
      createButtonText: createButton ? createButton.textContent.trim() : null,
      createButtonDisabled: createButton ? createButton.disabled : null,
      headerStyle: containerStyle(header),
      searchBoxStyle: containerStyle(searchBox),
      createGroupStyle: containerStyle(createGroup),
      searchBoxRect: searchBox ? rectOf(searchBox) : null,
      createGroupRect: createGroup ? rectOf(createGroup) : null,
      sameRow: searchBox && createGroup ? Math.abs(searchBox.getBoundingClientRect().y - createGroup.getBoundingClientRect().y) < 4 : null
    },
    magnifier: iconGap,
    list: {
      rowCount: rows.length,
      rows,
      distinctChipFirst: [...new Set(rows.map((r) => r.chips[0] || "нет"))],
      distinctAction: [...new Set(rows.map((r) => (r.action ? r.action.text : "нет")))],
      rowsWithAction: rows.filter((r) => r.action).length,
      rowsWithColouredLeftBorder: rows.filter((r) => r.riskClass.length > 0).length
    },
    nameCase: {
      cardHeading: cardHeadingNode ? cardHeadingNode.textContent : null,
      cardHeadingTextTransform: cardHeadingNode ? getComputedStyle(cardHeadingNode).textTransform : null,
      cardNameInputValue: cardNameInput ? cardNameInput.value : null,
      selectedRowName: selectedRow ? selectedRow.name : null,
      firstRowName: rows[0] ? rows[0].name : null,
      listNames: rows.map((r) => r.name)
    }
  };
})()
`;

const measurement = await evaluate(MEASURE);

// Отдельно: у кого в таблице стилей объявлен фон подсказки — видит ли его разбор CSS.
const cssProbe = await evaluate(`
(() => {
  const hits = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list, media) => {
      for (const rule of list) {
        if (rule.cssRules) { walk(rule.cssRules, rule.conditionText || media); continue; }
        if (!rule.selectorText) continue;
        if (!/patient-next-action/.test(rule.selectorText)) continue;
        hits.push({
          href: sheet.href ? sheet.href.split("/").slice(-1)[0] : "inline",
          media: media || null,
          selector: rule.selectorText,
          declaredBackground: rule.style.getPropertyValue("background") || rule.style.getPropertyValue("background-color") || "(нет объявления)",
          declaredProps: [...rule.style].join(",")
        });
      }
    };
    walk(rules, null);
  }
  return hits;
})()
`);

const payload = { ...measurement, cssRulesForNextAction: cssProbe, note: "Живой Vite отдаёт РАБОЧУЮ КОПИЮ дерева, а не HEAD." };
await writeFile(OUT, JSON.stringify(payload, null, 2), "utf8");
console.log(`written: ${OUT}`);
console.log(`rows=${measurement?.list?.rowCount} identicalProps=${measurement?.twoFields?.identicalProps?.length} differing=${measurement?.twoFields?.differingProps?.length}`);
shutdown();
