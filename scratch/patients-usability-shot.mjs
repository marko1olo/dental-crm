/**
 * СНИМОК И ЗАМЕР раздела «Картотека»: шапка (поиск против создания) и строки списка.
 *
 * ЗАЧЕМ. Правку разборчивости шапки нельзя принимать по уменьшенной картинке:
 * в этом проекте вывод по снимку уже дважды не подтверждался замером. Здесь
 * снимок делается 1:1 и рядом с ним пишутся getBoundingClientRect и
 * getComputedStyle того, что реально нарисовано, плюс поведение поиска.
 *
 * ЧТО СЧИТАЕТСЯ:
 *   - есть ли между поиском и созданием видимая граница (рамка/фон/линия) и
 *     сколько между ними пикселей;
 *   - чем различаются подсказки полей и подпись кнопки создания;
 *   - одинаков ли признак в строках списка (значок риска, надпись действия);
 *   - находится ли пациент по номеру, набранному цифрами без пробелов.
 *
 * ТРЕБУЕТСЯ живой веб-сервер 127.0.0.1:5173, живой API 127.0.0.1:4100 (только
 * для входа) и scratch/recon-dashboard-d001.json (сводка клиники с пациентами,
 * снятая scratch/recon-dump-dashboard.ts). В базу НЕ пишет.
 *
 * ЗАПУСК: node scratch/patients-usability-shot.mjs before
 *         node scratch/patients-usability-shot.mjs after
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const label = (process.argv[2] || "shot").replace(/[^a-z0-9_-]/gi, "");
const webBaseUrl = process.env.DENTE_SHOT_WEB_URL || "http://127.0.0.1:5173";
const apiBaseUrl = process.env.DENTE_SHOT_API_URL || "http://127.0.0.1:4100";
const cdpPort = Number(process.env.DENTE_SHOT_CDP_PORT || 9391);
const OUT = "C:/Clinic_MVP/dental-crm/scratch/patients-usability-shots";

const probe = await fetch(webBaseUrl).catch((error) => {
	throw new Error(`Веб-сервер на ${webBaseUrl} недоступен (${error.message}). Запустите npm run dev.`);
});
if (!probe.ok) throw new Error(`Веб-сервер ответил ${probe.status}`);
await mkdir(OUT, { recursive: true });

const loginResponse = await fetch(`${apiBaseUrl}/api/auth/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "doctor@clinic.com", password: "password" }),
});
if (!loginResponse.ok) throw new Error(`Вход демо-сотрудником отклонён: HTTP ${loginResponse.status}`);
const { clinicToken, staffToken } = await loginResponse.json();
if (!clinicToken || !staffToken) throw new Error("Сервер не выдал пару токенов");

/*
 * Демо-вход ведёт в организацию без пациентов, поэтому доставка ответа
 * /api/dashboard подменяется настоящей сводкой клиники с пациентами. Данные из
 * живой PostgreSQL; вёрстка, CSS, React и вычисленные стили — настоящие.
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

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", `dente-patients-shot-${label}`);
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

await send("Page.addScriptToEvaluateOnNewDocument", {
	source: `
    (() => {
      const dashboard = ${dashboardJson};
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.includes("/api/dashboard")) {
          window.__SHOT_DASHBOARD_SERVED__ = (window.__SHOT_DASHBOARD_SERVED__ || 0) + 1;
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
	throw new Error(`Кабинет не открылся. Ошибки страницы: ${pageErrors.slice(-5).join(" | ")}`);
}
await waitForWorkspace();

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
/*
 * Ждём именно СТРОКИ списка, а не панель. Панель появляется сразу, а список
 * рисуется после того, как отдана сводка и доехал ленивый модуль вида; на
 * занятом dev-сервере это занимало больше секунды, и фиксированная пауза
 * давала «в списке нет ни одной строки» на полностью работающем экране.
 */
for (let attempt = 0; attempt < 160; attempt += 1) {
	const rows = await evaluate(`document.querySelectorAll('.patient-list .patient-row').length`);
	if (rows > 0) break;
	await sleep(300);
}
await sleep(900);
const served = await evaluate(`window.__SHOT_DASHBOARD_SERVED__ || 0`);
if (!served) throw new Error("Сводку не запросили через fetch — измерялись бы не те данные.");
const rowsPresent = await evaluate(`document.querySelectorAll('.patient-list .patient-row').length`);
if (!rowsPresent) {
	// Без этой выкладки отказ выглядит как «пусто», а причина бывает совсем
	// другая: чужая правка в дереве, ошибка модуля у Vite или незакрытый PIN.
	const where = await evaluate(`
    (() => ({
      панель: Boolean(document.querySelector('.patients-panel')),
      список: Boolean(document.querySelector('.patient-list')),
      пустое_состояние: document.querySelector('.patient-empty-state')?.textContent?.trim() ?? null,
      hash: location.hash,
      текст: (document.body.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 400),
    }))()
  `).catch((error) => ({ ошибка: String(error) }));
	throw new Error(
		`В списке нет ни одной строки — мерить нечего.\nЧто на странице: ${JSON.stringify(where, null, 1)}\nОшибки страницы: ${pageErrors.slice(-6).join(" | ")}`,
	);
}
console.log(`картотека открыта, строк в списке: ${rowsPresent}, сводка отдана ${served} раз(а)`);

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
  const box = (node) => {
    if (!node) return null;
    const cs = getComputedStyle(node);
    return {
      border: cs.border, borderLeft: cs.borderLeft, borderTop: cs.borderTop,
      borderRadius: cs.borderRadius, background: cs.backgroundColor,
      boxShadow: cs.boxShadow, padding: cs.padding, marginLeft: cs.marginLeft,
      display: cs.display, flex: cs.flex, maxWidth: cs.maxWidth,
    };
  };

  const header = document.querySelector('.patients-header');
  const searchBox = document.querySelector('.patients-search-box');
  const searchInput = searchBox?.querySelector('input');
  const group = document.querySelector('.smart-create-group');
  const smartInput = [...(document.querySelectorAll('.smart-input-wrapper input') ?? [])]
    .find((n) => getComputedStyle(n).display !== 'none');
  const createButton = document.querySelector('.quick-create-action');
  const groupLabel = document.querySelector('.smart-create-label, .patients-create-label');
  const searchLabel = document.querySelector('.patients-search-label');

  /* Ширина текста подсказки настоящим шрифтом поля: placeholder не участвует в
     intrinsic-размере, поэтому обрезку иначе не поймать. */
  const placeholderFit = (input) => {
    if (!input) return null;
    const cs = getComputedStyle(input);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = cs.font || (cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily);
    const textWidth = +ctx.measureText(input.placeholder || '').width.toFixed(2);
    const inner = +(input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)).toFixed(2);
    return { текст_px: textWidth, место_под_текст_px: inner, обрезано: textWidth > inner };
  };

  const PROPS = ['width','padding','border','borderRadius','backgroundColor','fontSize','fontWeight','color','boxShadow','borderTopLeftRadius'];
  const styleOf = (node) => {
    if (!node) return null;
    const cs = getComputedStyle(node);
    const out = {};
    for (const p of PROPS) out[p] = cs[p];
    return out;
  };
  const s1 = styleOf(searchInput);
  const s2 = styleOf(smartInput);
  const identical = [];
  const differing = {};
  if (s1 && s2) for (const p of PROPS) (s1[p] === s2[p] ? identical.push(p) : (differing[p] = { поиск: s1[p], создание: s2[p] }));

  const rows = [...document.querySelectorAll('.patient-list .patient-row')].map((row) => {
    const meta = row.querySelector('.patient-row-meta');
    const next = row.querySelector('.patient-next-action');
    return {
      имя: row.querySelector('h3')?.textContent?.trim() ?? null,
      значок: meta?.querySelector('span')?.textContent?.trim() ?? null,
      надпись_действия: next?.textContent?.trim() ?? null,
      тег_надписи: next?.tagName ?? null,
      деньги: [...(meta?.querySelectorAll('span') ?? [])].slice(1).map((n) => n.textContent.trim()),
      левая_полоса: getComputedStyle(row).borderLeft,
      классы: row.className,
    };
  });

  return {
    окно: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    шапка: { прямоуг: r(header), стиль: box(header) },
    поиск: {
      подсказка: searchInput?.placeholder ?? null,
      ariaLabel: searchInput?.getAttribute('aria-label') ?? null,
      видимая_подпись: searchLabel?.textContent?.trim() ?? null,
      поле: r(searchInput), бокс: r(searchBox), стиль_бокса: box(searchBox),
      подсказка_влезает: placeholderFit(searchInput),
    },
    создание: {
      подсказка: smartInput?.placeholder ?? null,
      ariaLabel: smartInput?.getAttribute('aria-label') ?? null,
      видимая_подпись: groupLabel?.textContent?.trim() ?? null,
      поле: r(smartInput), группа: r(group), стиль_группы: box(group),
      подсказка_влезает: placeholderFit(smartInput),
      кнопка_текст: createButton?.textContent?.trim() ?? null,
      кнопка_title: createButton?.getAttribute('title') ?? null,
      кнопка: r(createButton), кнопка_disabled: createButton?.disabled ?? null,
    },
    граница: (() => {
      const sb = searchBox ? searchBox.getBoundingClientRect() : null;
      const gb = group ? group.getBoundingClientRect() : null;
      const gcs = group ? getComputedStyle(group) : null;
      return {
        зазор_px: sb && gb ? +(gb.left - sb.right).toFixed(2) : null,
        рамка_слева_у_группы: gcs?.borderLeft ?? null,
        ширина_рамки_слева_px: gcs ? +parseFloat(gcs.borderLeftWidth).toFixed(2) : null,
        фон_группы: gcs?.backgroundColor ?? null,
        фон_шапки: header ? getComputedStyle(header).backgroundColor ?? null : null,
        отличается_фоном: header && gcs ? getComputedStyle(header).backgroundColor !== gcs.backgroundColor : null,
      };
    })(),
    стили_полей: { одинаковые: identical, различия: differing },
    подсказки_совпадают: (searchInput?.placeholder ?? '') === (smartInput?.placeholder ?? ''),
    список: {
      всего: rows.length,
      уникальных_значков: [...new Set(rows.map((x) => x.значок))],
      уникальных_надписей: [...new Set(rows.map((x) => x.надпись_действия))],
      строк_со_значком: rows.filter((x) => x.значок).length,
      строк_с_надписью: rows.filter((x) => x.надпись_действия).length,
      строк_с_деньгами: rows.filter((x) => x.деньги.length > 0).length,
      строки: rows,
    },
  };
})()
`;

const measured = await evaluate(MEASURE);

// Поиск по номеру телефона, набранному цифрами без пробелов и дефисов.
const phoneProbe = await evaluate(`
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setNative = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const search = document.querySelector('.patients-search-box input');
  const names = () => [...document.querySelectorAll('.patient-list .patient-row h3')].map((n) => n.textContent.trim());
  const out = { всего_без_запроса: names().length, запросы: {} };
  const queries = ['79162001020', '89162001020', '+7 916 200-10-20', '2001020', '7', '+7', 'Орлов', 'ЯЯЯЯ'];
  for (const q of queries) {
    setNative(search, q);
    await wait(450);
    out.запросы[q] = { найдено: names().length, кто: names().slice(0, 4) };
  }
  setNative(search, '');
  await wait(600);
  out.после_очистки = names().length;
  out.выбран_после_очистки = document.querySelector('.patient-list .patient-row.selected h3')?.textContent?.trim() ?? null;
  out.карточка_справа = document.querySelector('.patient-admin-panel .panel-heading span')?.textContent?.trim() ?? null;
  return out;
})()
`);
measured.поиск_по_телефону = phoneProbe;

/*
 * ШИРИНЫ. Шапка обязана держаться и на промежуточных окнах, где две половины
 * уже не влезают рядом, и на телефоне. Обрезка подсказки — это потеря текста, а
 * не украшение, поэтому проверяется замером ширины строки настоящим шрифтом
 * поля, а не взглядом на снимок.
 */
const WIDTH_PROBE = `
(() => {
  const header = document.querySelector('.patients-header');
  const searchBox = document.querySelector('.patients-search-box');
  const searchInput = searchBox?.querySelector('input');
  const group = document.querySelector('.smart-create-group');
  const smartInput = [...(document.querySelectorAll('.smart-input-wrapper input') ?? [])]
    .find((n) => getComputedStyle(n).display !== 'none');
  const fit = (input) => {
    if (!input) return null;
    const cs = getComputedStyle(input);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = cs.font || (cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily);
    const textWidth = +ctx.measureText(input.placeholder || '').width.toFixed(2);
    const inner = +(input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)).toFixed(2);
    return { текст: textWidth, место: inner, обрезано: textWidth > inner };
  };
  const hb = header?.getBoundingClientRect();
  const sb = searchBox?.getBoundingClientRect();
  const gb = group?.getBoundingClientRect();
  return {
    окно: window.innerWidth,
    шапка_ширина: hb ? +hb.width.toFixed(2) : null,
    шапка_высота: hb ? +hb.height.toFixed(2) : null,
    /* Сравниваются ЦЕНТРЫ, а не верхние края: у зоны создания свои внутренние
       отступы, поэтому по верхним краям одна строка выглядела бы как две. */
    в_одну_строку: sb && gb ? Math.abs((sb.top + sb.bottom) / 2 - (gb.top + gb.bottom) / 2) < 6 : null,
    поиск_ширина: sb ? +sb.width.toFixed(2) : null,
    создание_ширина: gb ? +gb.width.toFixed(2) : null,
    подсказка_поиска: fit(searchInput),
    подсказка_создания: fit(smartInput),
    горизонтальная_прокрутка: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
})()
`;
/*
 * Замер по ширинам идёт ПОСЛЕ снимков: эмуляция телефона перестраивает оболочку
 * приложения, и снятый после неё кадр показывал бы не рабочий стол. Прогон, в
 * котором порядок был обратным, упал на поиске .patients-panel — это и вскрыло
 * зависимость.
 */
async function probeWidths() {
	const probes = [];
	for (const width of [1440, 1200, 1024, 900, 390]) {
		await send("Emulation.setDeviceMetricsOverride", {
			width,
			height: 900,
			deviceScaleFactor: 1,
			mobile: width <= 480,
		});
		await sleep(800);
		probes.push(await evaluate(WIDTH_PROBE));
	}
	await send("Emulation.clearDeviceMetricsOverride");
	await sleep(600);
	return probes;
}

// Снимок 1:1 раздела: шапка и весь список. Без уменьшения — иначе выводы делать нельзя.
const clip = await evaluate(`
(() => {
  const panel = document.querySelector('.patients-panel');
  const list = document.querySelector('.patient-list');
  const header = document.querySelector('.patients-header');
  if (!panel || !header) return null;
  const p = panel.getBoundingClientRect();
  const l = (list ?? header).getBoundingClientRect();
  const bottom = Math.max(l.bottom, header.getBoundingClientRect().bottom) + 24;
  return {
    x: Math.max(0, Math.round(p.left - 8)),
    y: Math.max(0, Math.round(p.top - 8)),
    width: Math.round(Math.min(p.width + 16, window.innerWidth)),
    height: Math.round(Math.min(bottom - p.top + 16, 2400)),
  };
})()
`);
if (!clip) throw new Error("Не нашёл .patients-panel для снимка");
const shot = await send("Page.captureScreenshot", {
	format: "png",
	clip: { ...clip, scale: 1 },
	captureBeyondViewport: true,
});
const shotPath = `${OUT}/patients-${label}.png`;
await writeFile(shotPath, Buffer.from(shot.data, "base64"));

// Отдельно шапка 1:1 — там решается разборчивость двух полей.
const headerClip = await evaluate(`
(() => {
  const header = document.querySelector('.patients-header');
  if (!header) return null;
  const b = header.getBoundingClientRect();
  return { x: Math.max(0, Math.round(b.left - 12)), y: Math.max(0, Math.round(b.top - 12)),
           width: Math.round(b.width + 24), height: Math.round(b.height + 48) };
})()
`);
const headerShot = await send("Page.captureScreenshot", {
	format: "png",
	clip: { ...headerClip, scale: 1 },
	captureBeyondViewport: true,
});
const headerShotPath = `${OUT}/patients-header-${label}.png`;
await writeFile(headerShotPath, Buffer.from(headerShot.data, "base64"));

measured.по_ширинам = await probeWidths();
await writeFile(`${OUT}/patients-measure-${label}.json`, JSON.stringify(measured, null, 2), "utf8");

console.log("\n=== ШАПКА: ГРАНИЦА МЕЖДУ ПОИСКОМ И СОЗДАНИЕМ ===");
console.log(JSON.stringify(measured.граница, null, 2));
console.log("\n=== ПОДСКАЗКИ И ПОДПИСИ ===");
console.log(`  поиск:    placeholder=«${measured.поиск.подсказка}» видимая подпись=${JSON.stringify(measured.поиск.видимая_подпись)}`);
console.log(`  создание: placeholder=«${measured.создание.подсказка}» видимая подпись=${JSON.stringify(measured.создание.видимая_подпись)}`);
console.log(`  кнопка создания: текст=«${measured.создание.кнопка_текст}» title=«${measured.создание.кнопка_title}» disabled=${measured.создание.кнопка_disabled}`);
console.log(`  подсказки совпадают дословно: ${measured.подсказки_совпадают}`);
console.log(`  влезает ли подсказка поиска:    ${JSON.stringify(measured.поиск.подсказка_влезает)}`);
console.log(`  влезает ли подсказка создания:  ${JSON.stringify(measured.создание.подсказка_влезает)}`);
console.log(`\n  СТИЛИ ПОЛЕЙ совпадают в ${measured.стили_полей.одинаковые.length}: ${measured.стили_полей.одинаковые.join(", ")}`);
console.log(`  различаются (${Object.keys(measured.стили_полей.различия).length}): ${JSON.stringify(measured.стили_полей.различия)}`);
console.log("\n=== СПИСОК ===");
console.log(`  строк: ${measured.список.всего}; со значком риска: ${measured.список.строк_со_значком}; с надписью действия: ${measured.список.строк_с_надписью}; с деньгами: ${measured.список.строк_с_деньгами}`);
console.log(`  уникальных значков: ${JSON.stringify(measured.список.уникальных_значков)}`);
console.log(`  уникальных надписей: ${JSON.stringify(measured.список.уникальных_надписей)}`);
console.log("\n=== ШАПКА НА РАЗНЫХ ШИРИНАХ ===");
for (const probe of measured.по_ширинам) {
	console.log(
		`  окно ${probe.окно}: шапка ${probe.шапка_ширина}x${probe.шапка_высота}, в одну строку=${probe.в_одну_строку}, ` +
			`поиск ${probe.поиск_ширина} / создание ${probe.создание_ширина}, ` +
			`подсказка поиска обрезана=${probe.подсказка_поиска?.обрезано} (${probe.подсказка_поиска?.текст}/${probe.подсказка_поиска?.место}), ` +
			`подсказка создания обрезана=${probe.подсказка_создания?.обрезано} (${probe.подсказка_создания?.текст}/${probe.подсказка_создания?.место}), ` +
			`гориз. прокрутка=${probe.горизонтальная_прокрутка}`,
	);
}

console.log("\n=== ПОИСК ПО ТЕЛЕФОНУ ===");
for (const [q, res] of Object.entries(measured.поиск_по_телефону.запросы)) {
	console.log(`  «${q}» -> ${res.найдено} ${JSON.stringify(res.кто)}`);
}
console.log(`  после очистки строк: ${measured.поиск_по_телефону.после_очистки}; выбран: ${measured.поиск_по_телефону.выбран_после_очистки}; карточка справа: ${measured.поиск_по_телефону.карточка_справа}`);
console.log(`\nснимок раздела: ${shotPath} (${clip.width}x${clip.height})`);
console.log(`снимок шапки:   ${headerShotPath} (${headerClip.width}x${headerClip.height})`);
console.log(`замер: ${OUT}/patients-measure-${label}.json`);
if (pageErrors.length) console.log(`\nОШИБКИ СТРАНИЦЫ: ${pageErrors.slice(-5).join(" | ")}`);

shutdown();
await sleep(300);
process.exit(0);
