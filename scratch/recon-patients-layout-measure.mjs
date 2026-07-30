/**
 * ЗАМЕР вёрстки шапки картотеки и строк списка в живом браузере.
 *
 * ЗАЧЕМ. По уменьшенному снимку .dente-ops-shots/patients_light_full.png лупа
 * выглядит наехавшей на подсказку, а два поля шапки — одинаковыми. Первое надо
 * проверить пикселями, второе — вычисленными стилями: вывод по картинке в этом
 * проекте уже дважды не подтверждался замером.
 *
 * Считаются НЕ правила CSS, а getBoundingClientRect и getComputedStyle того, что
 * реально нарисовано, — включая правый край иконки против начала текста, ширины
 * обоих полей и полный список различающихся свойств между ними.
 *
 * ТРЕБУЕТСЯ живой веб-сервер 127.0.0.1:5173 и свежий .ops-shot-tokens.json
 * (scratch/recon-sign-shot-tokens.ts). Ничего не меняет ни в базе, ни в файлах,
 * кроме одного снимка в scratch/ для сверки глазами.
 *
 * ЗАПУСК: node scratch/recon-patients-layout-measure.mjs
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const webBaseUrl = process.env.DENTE_RECON_WEB_URL || "http://127.0.0.1:5173";
const cdpPort = Number(process.env.DENTE_RECON_CDP_PORT || 9377);
const OUT = "C:/Clinic_MVP/dental-crm/scratch/recon-shots";

const probe = await fetch(webBaseUrl).catch((error) => {
	throw new Error(`Веб-сервер на ${webBaseUrl} недоступен (${error.message}). Запустите npm run dev.`);
});
if (!probe.ok) throw new Error(`Веб-сервер ответил ${probe.status}`);
await mkdir(OUT, { recursive: true });

/*
 * ТОКЕНЫ выдаёт сам живой сервер через /api/auth/login: он подписывает их своим
 * секретом. Подписать снаружи нельзя — секрет у него эфемерный (токен, подписанный
 * обоими .data/dev-auth-secret на диске, получает 401), а перезапускать общий
 * сервер не моя зона.
 */
const apiBaseUrl = process.env.DENTE_RECON_API_URL || "http://127.0.0.1:4100";
const loginResponse = await fetch(`${apiBaseUrl}/api/auth/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "doctor@clinic.com", password: "password" }),
});
if (!loginResponse.ok) throw new Error(`Вход демо-сотрудником отклонён: HTTP ${loginResponse.status}`);
const { clinicToken, staffToken } = await loginResponse.json();
if (!clinicToken || !staffToken) throw new Error("Сервер не выдал пару токенов");

/*
 * СВОДКА. Демо-вход ведёт в организацию 00000000-…-0001, в которой НОЛЬ пациентов
 * (проверено: /api/dashboard отдаёт 200 и patients: []). Мерить строки списка там
 * нечего. Поэтому ответ /api/dashboard подменяется настоящей сводкой клиники
 * d0000000-…-d001, посчитанной scratch/recon-dump-dashboard.ts той же цепочкой,
 * что у сервера. Подменяется ТОЛЬКО доставка: данные из живой PostgreSQL, а
 * вёрстка, CSS, React и вычисленные стили в браузере настоящие.
 */
const dashboardFile = "C:/Clinic_MVP/dental-crm/scratch/recon-dashboard-d001.json";
if (!existsSync(dashboardFile)) {
	throw new Error(`Нет ${dashboardFile}: сначала cd apps/api && node --import tsx ../../scratch/recon-dump-dashboard.ts`);
}
const dashboardJson = await readFile(dashboardFile, "utf8");

const browserPath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-recon-patients-profile");
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
	if (browserStderr.length > 30) browserStderr.splice(0, browserStderr.length - 30);
});

let shuttingDown = false;
let closeSocket = () => {};
function shutdown() {
	if (shuttingDown) return;
	shuttingDown = true;
	try {
		closeSocket();
	} catch {}
	try {
		browser.kill();
	} catch {}
}
process.on("exit", shutdown);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getPageTarget(retries = 40) {
	for (let attempt = 0; attempt < retries; attempt += 1) {
		try {
			const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
			const targets = await response.json();
			const page = targets.find((target) => target.type === "page");
			if (page) return page;
		} catch {}
		await sleep(1000);
	}
	throw new Error(`Отладочный порт браузера не отвечает. stderr: ${browserStderr.join("").slice(-600)}`);
}

const pageTarget = await getPageTarget();
const { default: WebSocket } = await import("ws");
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
closeSocket = () => socket.close();
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

/*
 * Ждём, пока страница окажется на нужном origin. Сразу после spawn документ может
 * быть ещё about:blank, и localStorage там бросает SecurityError — прогон падал с
 * «Uncaught» без текста, что ничего не объясняет.
 */
for (let attempt = 0; attempt < 60; attempt += 1) {
	const origin = await evaluate(`location.origin`).catch(() => null);
	if (origin && origin !== "null" && origin.includes("127.0.0.1")) break;
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

/*
 * Перехват ставится ДО загрузки документа: приложение просит сводку в первом же
 * эффекте, и патч, поставленный после навигации, опоздал бы.
 */
await send("Page.addScriptToEvaluateOnNewDocument", {
	source: `
    (() => {
      const dashboard = ${dashboardJson};
      window.__RECON_DASHBOARD__ = dashboard;
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.includes("/api/dashboard")) {
          window.__RECON_DASHBOARD_SERVED__ = (window.__RECON_DASHBOARD_SERVED__ || 0) + 1;
          return new Response(JSON.stringify(dashboard), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      };
    })();
  `,
});
await send("Page.navigate", { url: `${webBaseUrl}/` });

async function waitForWorkspace(timeoutMs = 60000) {
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
		if (state?.ready) return;
		if (state?.wizard) {
			await evaluate(`window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true })); location.reload(); true`);
		}
		await sleep(1200);
	}
	const where = await evaluate(`
    (() => ({
      url: location.href,
      title: document.title,
      hasSidebar: Boolean(document.querySelector('.sidebar, nav .nav-item')),
      classes: [...document.body.classList],
      firstNodes: [...document.body.querySelectorAll('div,section,main')].slice(0, 6).map((n) => n.className || n.tagName),
      text: (document.body.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 700),
      keys: Object.keys(window.localStorage),
    }))()
  `).catch((error) => ({ ошибка: String(error) }));
	throw new Error(
		`Кабинет не открылся. Что на странице: ${JSON.stringify(where, null, 1)}\nОшибки страницы: ${pageErrors.slice(-5).join(" | ")}`,
	);
}
await waitForWorkspace();
console.log("кабинет открыт");

// Гасим экран PIN, если он есть, и уходим в картотеку — как в scripts/dente-redesign-shots.mjs.
await evaluate(`(() => {
  const pinPad = document.querySelector('.staff-pin-pad, .pin-lock-screen');
  if (!pinPad) return false;
  const staffCard = document.querySelector('.staff-card, .staff-member-item');
  if (staffCard) staffCard.click();
  const zero = [...document.querySelectorAll('button')].find((n) => n.textContent.trim() === '0');
  if (zero) for (let i = 0; i < 4; i += 1) zero.click();
  return true;
})()`);
await evaluate(`(() => {
  const link = document.querySelector('aside.sidebar nav a[href="#patients"], .dnt-bottom-nav a[href="#patients"]');
  if (link) { link.click(); return true; }
  window.location.hash = "#patients";
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  return false;
})()`);

for (let attempt = 0; attempt < 120; attempt += 1) {
	const ready = await evaluate(`Boolean(document.querySelector('#patients, .patients-panel'))`);
	if (ready) break;
	await sleep(250);
}
await sleep(1500);
const panelThere = await evaluate(`Boolean(document.querySelector('#patients, .patients-panel'))`);
if (!panelThere) throw new Error(`Картотека не открылась. Ошибки: ${pageErrors.slice(-3).join(" | ")}`);
const served = await evaluate(`window.__RECON_DASHBOARD_SERVED__ || 0`);
console.log(`картотека открыта; подменённая сводка отдана ${served} раз(а)`);
if (!served) throw new Error("Сводку не запросили через fetch — измерялись бы не те данные. Разбирайтесь, а не мерьте.");

const MEASURE = `
(() => {
  const r = (node) => {
    if (!node) return null;
    const b = node.getBoundingClientRect();
    return {
      left: +b.left.toFixed(2), right: +b.right.toFixed(2), top: +b.top.toFixed(2),
      bottom: +b.bottom.toFixed(2), width: +b.width.toFixed(2), height: +b.height.toFixed(2),
    };
  };
  const searchBox = document.querySelector('.patients-search-box');
  const searchInput = searchBox?.querySelector('input');
  const searchIcon = searchBox?.querySelector('svg');
  const smartWrapper = document.querySelector('.smart-input-wrapper');
  // Первый ВИДИМЫЙ input обёртки: телефон и дата рождения в ней скрыты display:none.
  const smartInput = [...(smartWrapper?.querySelectorAll('input') ?? [])]
    .find((n) => getComputedStyle(n).display !== 'none');
  const smartIcon = smartWrapper?.querySelector('button svg, svg');
  const createButton = document.querySelector('.quick-create-action');

  // Где реально начинается текст в поле поиска: замер, а не арифметика по правилу.
  // Внутренний край области текста = левый край поля + border-left + padding-left.
  const textStart = (input) => {
    if (!input) return null;
    const cs = getComputedStyle(input);
    return +(input.getBoundingClientRect().left
      + parseFloat(cs.borderLeftWidth)
      + parseFloat(cs.paddingLeft)).toFixed(2);
  };

  const PROPS = [
    'width','height','padding','border','borderRadius','background','backgroundColor',
    'backgroundImage','boxShadow','fontSize','fontWeight','fontFamily','color','outline',
    'textTransform','letterSpacing','backdropFilter'
  ];
  const styleOf = (node) => {
    if (!node) return null;
    const cs = getComputedStyle(node);
    const out = {};
    for (const p of PROPS) out[p] = cs[p];
    return out;
  };
  const s1 = styleOf(searchInput);
  const s2 = styleOf(smartInput);
  const differing = {};
  const identical = [];
  if (s1 && s2) {
    for (const p of PROPS) {
      if (s1[p] === s2[p]) identical.push(p);
      else differing[p] = { поиск: s1[p], создание: s2[p] };
    }
  }

  // Строки списка: значок риска, подсказка «следующее действие», её тег и кликабельность.
  const rows = [...document.querySelectorAll('.patient-list .patient-row')].map((row) => {
    const meta = row.querySelector('.patient-row-meta');
    const next = row.querySelector('.patient-next-action');
    const nextCS = next ? getComputedStyle(next) : null;
    return {
      имя: row.querySelector('h3')?.textContent?.trim() ?? null,
      значок: meta?.querySelector('span')?.textContent?.trim() ?? null,
      подсказка: next?.textContent?.trim() ?? null,
      тег_подсказки: next?.tagName ?? null,
      подсказка_role: next?.getAttribute('role') ?? null,
      подсказка_tabindex: next?.getAttribute('tabIndex') ?? next?.tabIndex ?? null,
      подсказка_курсор: nextCS?.cursor ?? null,
      подсказка_радиус: nextCS?.borderRadius ?? null,
      подсказка_рамка: nextCS?.border ?? null,
      подсказка_фон: nextCS?.backgroundColor ?? null,
      подсказка_вес: nextCS?.fontWeight ?? null,
      выбрана: row.classList.contains('selected'),
      классы: row.className,
      рамка_строки: getComputedStyle(row).border,
      фон_строки: getComputedStyle(row).backgroundColor,
      тень_строки: getComputedStyle(row).boxShadow,
      левая_полоса: getComputedStyle(row).borderLeft,
      прямоуг: r(row),
    };
  });

  // Есть ли между двумя полями шапки хоть какая-то разделительная линия?
  const header = document.querySelector('.patients-header');
  const headerCS = header ? getComputedStyle(header) : null;
  const boxCS = searchBox ? getComputedStyle(searchBox) : null;
  const groupCS = document.querySelector('.smart-create-group')
    ? getComputedStyle(document.querySelector('.smart-create-group')) : null;

  return {
    окно: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    шапка: { прямоуг: r(header), gap: headerCS?.gap, justify: headerCS?.justifyContent, flexWrap: headerCS?.flexWrap },
    поиск: {
      подсказка_текста: searchInput?.placeholder,
      ariaLabel: searchInput?.getAttribute('aria-label'),
      type: searchInput?.type,
      поле: r(searchInput),
      иконка: r(searchIcon),
      начало_текста_px: textStart(searchInput),
      paddingLeft: searchInput ? getComputedStyle(searchInput).paddingLeft : null,
      бокс: r(searchBox),
      бокс_рамка: boxCS?.border,
      бокс_фон: boxCS?.backgroundColor,
    },
    создание: {
      подсказка_текста: smartInput?.placeholder,
      ariaLabel: smartInput?.getAttribute('aria-label'),
      type: smartInput?.type,
      поле: r(smartInput),
      иконка_справа: r(smartIcon),
      начало_текста_px: textStart(smartInput),
      группа: r(document.querySelector('.smart-create-group')),
      группа_рамка: groupCS?.border,
      группа_фон: groupCS?.backgroundColor,
      кнопка_создать: r(createButton),
      кнопка_disabled: createButton?.disabled ?? null,
    },
    стили_полей: { одинаковые: identical, различия: differing },
    баннер_подсказки: (() => {
      const p = document.querySelector('.quick-create-guidance');
      return p ? { текст: p.textContent.trim(), прямоуг: r(p), видим: getComputedStyle(p).display !== 'none' } : null;
    })(),
    список: {
      всего_строк: rows.length,
      выбранных: rows.filter((x) => x.выбрана).length,
      уникальных_значков: [...new Set(rows.map((x) => x.значок))],
      уникальных_подсказок: [...new Set(rows.map((x) => x.подсказка))],
      строки: rows,
      пустое_состояние: Boolean(document.querySelector('.patient-empty-state')),
    },
    правая_панель_заголовок: document.querySelector('.patient-admin-panel .panel-heading span')?.textContent?.trim() ?? null,
  };
})()
`;

const measured = await evaluate(MEASURE);
await writeFile(`${OUT}/patients-layout-measure.json`, JSON.stringify(measured, null, 2), "utf8");

const p = measured.поиск;
const c = measured.создание;
console.log("\n=== ОКНО ===", JSON.stringify(measured.окно));
console.log("=== ШАПКА ===", JSON.stringify(measured.шапка));
console.log("\n=== ПОЛЕ ПОИСКА ===");
console.log(`  подсказка: «${p.подсказка_текста}»  type=${p.type}`);
console.log(`  поле: x ${p.поле?.left}..${p.поле?.right}, ширина ${p.поле?.width}`);
console.log(`  иконка лупы: x ${p.иконка?.left}..${p.иконка?.right}, ${p.иконка?.width}x${p.иконка?.height}`);
console.log(`  paddingLeft=${p.paddingLeft}, начало текста x=${p.начало_текста_px}`);
console.log(
	`  ЗАЗОР между правым краем лупы и началом текста: ${(p.начало_текста_px - (p.иконка?.right ?? 0)).toFixed(2)} px` +
		` -> ${p.начало_текста_px > (p.иконка?.right ?? 0) ? "НАЛОЖЕНИЯ НЕТ" : "НАЛОЖЕНИЕ ЕСТЬ"}`,
);
console.log("\n=== ПОЛЕ СОЗДАНИЯ ===");
console.log(`  подсказка: «${c.подсказка_текста}»  type=${c.type}`);
console.log(`  поле: x ${c.поле?.left}..${c.поле?.right}, ширина ${c.поле?.width}`);
console.log(`  кнопка «Создать»: ${JSON.stringify(c.кнопка_создать)}, disabled=${c.кнопка_disabled}`);
console.log(
	`\n  ОТНОШЕНИЕ ШИРИН создание/поиск: ${((c.поле?.width ?? 0) / (p.поле?.width || 1)).toFixed(2)}×` +
		`  зазор между полями: ${((c.поле?.left ?? 0) - (p.поле?.right ?? 0)).toFixed(2)} px`,
);
console.log("\n=== СТИЛИ ДВУХ ПОЛЕЙ ===");
console.log(`  СОВПАДАЮТ (${measured.стили_полей.одинаковые.length}): ${measured.стили_полей.одинаковые.join(", ")}`);
console.log(`  РАЗЛИЧАЮТСЯ (${Object.keys(measured.стили_полей.различия).length}):`);
for (const [prop, values] of Object.entries(measured.стили_полей.различия)) {
	console.log(`    ${prop}: поиск=${values.поиск} | создание=${values.создание}`);
}
console.log("\n=== БАННЕР ПОДСКАЗКИ СОЗДАНИЯ ===", JSON.stringify(measured.баннер_подсказки));
console.log("\n=== СПИСОК ===");
console.log(`  строк: ${measured.список.всего_строк}, помечено .selected: ${measured.список.выбранных}`);
console.log(`  уникальных значков: ${JSON.stringify(measured.список.уникальных_значков)}`);
console.log(`  уникальных подсказок: ${JSON.stringify(measured.список.уникальных_подсказок)}`);
for (const row of measured.список.строки) {
	console.log(
		`    ${row.выбрана ? "[ВЫБРАН]" : "[       ]"} ${row.имя} | ${row.значок} | ${row.подсказка}` +
			` (тег ${row.тег_подсказки}, role=${row.подсказка_role}, cursor=${row.подсказка_курсор})`,
	);
}
const first = measured.список.строки[0];
if (first) {
	console.log(`\n  как отличается выбранная строка: рамка=${first.рамка_строки} фон=${first.фон_строки} левая=${first.левая_полоса} тень=${first.тень_строки}`);
	console.log(`  классы первой строки: ${first.классы}`);
}

// Что происходит при вводе в ПОЛЕ ПОИСКА: теряется ли выбранный пациент.
const searchProbe = await evaluate(`
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rowNames = () => [...document.querySelectorAll('.patient-list .patient-row h3')].map((n) => n.textContent.trim());
  const selectedName = () => document.querySelector('.patient-list .patient-row.selected h3')?.textContent?.trim() ?? null;
  const cardName = () => document.querySelector('.patient-admin-panel .panel-heading span')?.textContent?.trim() ?? null;
  const setNative = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const search = document.querySelector('.patients-search-box input');
  const out = { начало: { строк: rowNames().length, выбран: selectedName(), карточка: cardName() } };

  // 1. Выбираем ТРЕТЬЮ строку — не первую, чтобы отличить «сохранился» от «сбросился на первую».
  const rows = [...document.querySelectorAll('.patient-list .patient-row')];
  if (rows[2]) { rows[2].click(); await wait(400); }
  out.после_выбора_третьей = { выбран: selectedName(), карточка: cardName() };

  // 2. Пишем в поиск заведомо непопадающий текст: список опустеет.
  setNative(search, 'ЯЯЯЯ');
  await wait(600);
  out.поиск_без_совпадений = {
    строк: rowNames().length,
    выбран: selectedName(),
    карточка: cardName(),
    пустое_состояние: document.querySelector('.patient-empty-state')?.textContent?.trim() ?? null,
  };

  // 3. Чистим поиск: вернулся ли выбранный пациент, или выбор уехал на первого.
  setNative(search, '');
  await wait(700);
  out.после_очистки = { строк: rowNames().length, выбран: selectedName(), карточка: cardName() };

  // 4. Пишем текст, попадающий в ДРУГОГО пациента: выбранный исчезает из списка.
  const names = rowNames();
  const other = names[6] || names[names.length - 1] || '';
  const token = (other.split(' ')[0] || '').slice(0, 6);
  setNative(search, token);
  await wait(600);
  out.поиск_по_другому = { запрос: token, строк: rowNames().length, выбран: selectedName(), карточка: cardName(), список: rowNames() };

  setNative(search, '');
  await wait(700);
  out.финал = { строк: rowNames().length, выбран: selectedName(), карточка: cardName() };
  return out;
})()
`);
console.log("\n=== ПОВЕДЕНИЕ ПОИСКА И ВЫБОРА ===");
console.log(JSON.stringify(searchProbe, null, 2));

// Что происходит при вводе поискового текста в ПОЛЕ СОЗДАНИЯ.
const wrongFieldProbe = await evaluate(`
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setNative = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const smart = [...document.querySelectorAll('.smart-input-wrapper input')]
    .find((n) => getComputedStyle(n).display !== 'none');
  const создать = document.querySelector('.quick-create-action');
  const строк = () => document.querySelectorAll('.patient-list .patient-row').length;
  const out = { до: { строк: строк(), кнопка_disabled: создать?.disabled, баннер: document.querySelector('.quick-create-guidance')?.textContent?.trim() ?? null } };

  // Регистратор набирает фамилию существующего пациента — но НЕ в то поле.
  const имя = document.querySelector('.patient-list .patient-row h3')?.textContent?.trim() ?? 'Орлова';
  setNative(smart, имя);
  await wait(600);
  out.после_ввода_в_поле_создания = {
    строк_в_списке: строк(),
    список_отфильтровался: строк() !== out.до.строк,
    кнопка_создать_disabled: создать?.disabled,
    баннер: document.querySelector('.quick-create-guidance')?.textContent?.trim() ?? null,
    значение_поиска: document.querySelector('.patients-search-box input')?.value ?? null,
    введено: имя,
  };

  // Enter в этом поле: что открывается.
  smart.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await wait(700);
  out.после_Enter = {
    предпросмотр_виден: Boolean(document.querySelector('.smart-parse-preview, [class*="parse-preview"], [class*="smart-preview"]')),
    текст_на_экране: (document.body.textContent || '').includes('Создать пациента') ,
    диалогов: document.querySelectorAll('[role="dialog"]').length,
  };
  setNative(smart, '');
  await wait(300);
  return out;
})()
`);
console.log("\n=== ВВОД ПОИСКОВОГО ТЕКСТА В ПОЛЕ СОЗДАНИЯ ===");
console.log(JSON.stringify(wrongFieldProbe, null, 2));

// Снимок для сверки глазами — только шапка и верх списка, без уменьшения.
const shot = await send("Page.captureScreenshot", {
	format: "png",
	clip: { x: 240, y: 40, width: 1200, height: 420, scale: 1 },
	captureBeyondViewport: true,
});
await writeFile(`${OUT}/patients-header-1to1.png`, Buffer.from(shot.data, "base64"));
console.log(`\nснимок 1:1: ${OUT}/patients-header-1to1.png`);
if (pageErrors.length) console.log(`\nОШИБКИ СТРАНИЦЫ: ${pageErrors.slice(-5).join(" | ")}`);

shutdown();
await sleep(300);
process.exit(0);
