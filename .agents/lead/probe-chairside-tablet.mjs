/**
 * ЗАМЕР ПРИГОДНОСТИ ЭКРАНОВ ДЛЯ ПЛАНШЕТА У КРЕСЛА.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ СЦЕНАРИЙ, А НЕ ГОТОВЫЕ
 * `scripts/detect-overflows.mjs` заходит с токенами «audit-bypass» и с зашитыми
 * UUID: такой запрос молча получает 401, экран выглядит пустым, и «переполнений
 * нет» означает «нечего было мерить». `scripts/ops-panels-shots.mjs` снимает
 * панели в трёх темах, но правки его запрещены, а нужного тут нет вовсе: замера
 * зон нажатия, перекрытий по elementFromPoint и таблиц. Поэтому здесь свой
 * прогон, и он ходит с настоящими токенами из `.ops-shot-tokens.json`.
 *
 * ЧТО ИЗМЕРЯЕТСЯ (ничего не выводится «на глаз»)
 *  1. Зоны нажатия: getBoundingClientRect по каждому видимому и не-disabled
 *     элементу управления. Видимость — через el.checkVisibility, а не через
 *     сравнение display: скрытый предок иначе засчитывается как видимый.
 *  2. Горизонтальные переполнения: документ шире окна, элементы правее окна без
 *     прокручиваемого предка, элементы, срезанные предком с overflow: hidden.
 *  3. Таблицы: остались ли <td> в display: table-cell на узком экране и есть ли
 *     у них data-label для разворота в карточки.
 *  4. Перекрытия: document.elementFromPoint в пяти точках каждого элемента
 *     управления. Страница прокручивается шагами, потому что elementFromPoint
 *     работает только по видимой области — иначе замер соврал бы про нижнюю
 *     навигацию, а именно она и висит поверх всего.
 *  5. Инвентарь всего, что position: fixed/sticky, с z-index и прямоугольником.
 *
 * УКАЗАТЕЛЬ ОГРУБЛЯЕТСЯ ЯВНО. Правила `styles/touch-targets.css` с 28.07.2026
 * висят на `(pointer: coarse), (max-width: 700px)`. Планшет 820px шире 700, то
 * есть по ширине правила не попадают вообще; они попадают только через грубый
 * указатель. Прогон без Emulation.setEmulatedMedia измерил бы экран, которого у
 * врача нет, и все выводы были бы про мышь.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = "C:/Clinic_MVP/dental-crm/.dente-chairside-probe";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9357;

const res = await fetch(webBaseUrl).catch((error) => {
	throw new Error(`Веб-сервер ${webBaseUrl} недоступен (${error.message}).`);
});
if (!res.ok) throw new Error(`Веб-сервер ответил ${res.status}`);

await mkdir(OUT, { recursive: true });

const browserPath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(
	process.env.TEMP || "C:/tmp",
	"dente-chairside-probe-profile",
);
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
			/* браузер ещё поднимается */
		}
		await sleep(1000);
	}
	throw new Error("Отладочный порт браузера не отвечает");
}

const pageTarget = await getPageTarget();
const { default: WebSocket } = await import("ws");
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl, {
	perMessageDeflate: false,
	maxPayload: 512 * 1024 * 1024,
});
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
		pageErrors.push(
			details?.exception?.description ||
				details?.text ||
				"исключение без описания",
		);
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
		}, 60000);
	});
}

async function evaluate(expression) {
	const result = await send("Runtime.evaluate", {
		expression,
		awaitPromise: true,
		returnByValue: true,
	});
	if (result.exceptionDetails) {
		throw new Error(`Ошибка в странице: ${result.exceptionDetails.text}`);
	}
	return result.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");

const tokenFile = "C:/Clinic_MVP/dental-crm/.ops-shot-tokens.json";
if (!existsSync(tokenFile)) throw new Error(`Нет ${tokenFile}`);
const { clinicToken, staffToken } = JSON.parse(
	await readFile(tokenFile, "utf8"),
);

await evaluate(`
  (() => {
    window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
    window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
    return true;
  })()
`);
await send("Page.navigate", { url: `${webBaseUrl}/` });

async function waitForWorkspace(timeoutMs = 60000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const state = await evaluate(`
      (() => {
        const sidebar = document.querySelector('.sidebar, nav .nav-item, .dnt-bottom-nav a');
        const login = document.body.textContent?.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ");
        const wizard = document.body.textContent?.includes("Быстрая настройка CRM Dente");
        return { ready: Boolean(sidebar) && !login && !wizard, login: Boolean(login), wizard: Boolean(wizard) };
      })()
    `);
		if (state?.ready) return true;
		if (state?.wizard) {
			await evaluate(
				`window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true })); location.reload(); true`,
			);
		}
		await sleep(1200);
	}
	// Диагностика ДО падения: «не открылся» одинаково выглядит при просроченном
	// токене, при упавшем компоненте и при не поднявшемся сервере, а лечится по-разному.
	const diagnostic = await evaluate(`
    (() => ({
      url: location.href,
      title: document.title,
      text: (document.body.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 600),
      nodes: document.body.querySelectorAll("*").length,
    }))()
  `);
	const shot = await send("Page.captureScreenshot", { format: "png" });
	await writeFile(
		path.join(OUT, "diagnostic_no_workspace.png"),
		Buffer.from(shot.data, "base64"),
	);
	console.log("ДИАГНОСТИКА:", JSON.stringify(diagnostic, null, 2));
	for (const error of pageErrors.slice(0, 10))
		console.log("  ошибка страницы:", error.split("\n")[0]);
	throw new Error("Рабочий кабинет не открылся: мерить нечего");
}

/**
 * Планшет и настольный экран отличаются не только шириной. Правила зон нажатия
 * висят на характере указателя, поэтому «планшет» без огрубления указателя —
 * это ноутбук с узким окном, а не то устройство, что у врача в руках.
 */
async function setDevice(profile) {
	await send("Emulation.setDeviceMetricsOverride", {
		width: profile.width,
		height: profile.height,
		deviceScaleFactor: 1,
		mobile: profile.coarse,
	});
	// maxTouchPoints обязателен в диапазоне 1..16 даже при enabled: false —
	// ноль отвергается протоколом целиком, и прогон падает на первом же вызове.
	await send("Emulation.setTouchEmulationEnabled", {
		enabled: profile.coarse,
		maxTouchPoints: profile.coarse ? 5 : 1,
	});
	await send("Emulation.setEmulatedMedia", {
		features: profile.coarse
			? [
					{ name: "pointer", value: "coarse" },
					{ name: "any-pointer", value: "coarse" },
					{ name: "hover", value: "none" },
					{ name: "any-hover", value: "none" },
				]
			: [
					{ name: "pointer", value: "fine" },
					{ name: "any-pointer", value: "fine" },
					{ name: "hover", value: "hover" },
					{ name: "any-hover", value: "hover" },
				],
	});
}

/** Что медиа-условия ДЕЙСТВИТЕЛЬНО видят: без этого замер нечем поверить. */
async function readMediaState() {
	return evaluate(`
    (() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      coarse: matchMedia("(pointer: coarse)").matches,
      under700: matchMedia("(max-width: 700px)").matches,
      under840: matchMedia("(max-width: 840px)").matches,
      touchTargetsActive: matchMedia("(pointer: coarse), (max-width: 700px)").matches,
      bottomNav: (() => {
        const nav = document.querySelector(".dnt-bottom-nav");
        if (!nav) return "нет в разметке";
        const r = nav.getBoundingClientRect();
        return getComputedStyle(nav).display + " " + Math.round(r.width) + "x" + Math.round(r.height);
      })(),
      theme: document.documentElement.getAttribute("data-theme"),
    }))()
  `);
}

async function goToView(view) {
	return evaluate(`
    (() => {
      if (window.location.hash === "#" + ${JSON.stringify(view)}) {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } else {
        window.location.hash = ${JSON.stringify(view)};
      }
      return window.location.hash;
    })()
  `);
}

/** Выбор пациента: без него раздел приёма отдаёт пустое состояние. */
const SELECT_PATIENT = `(async () => {
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const openedName = () =>
    [...document.querySelectorAll("input")].find((node) => node.autocomplete === "name")?.value || "";
  let chosen = openedName();
  for (let attempt = 0; attempt < 20 && !chosen; attempt += 1) {
    const row = document.querySelector("article.patient-row");
    if (row) row.click();
    await wait(600);
    chosen = openedName();
  }
  return chosen || "(пациент не выбран)";
})()`;

/**
 * ЗАМЕР ЗОН НАЖАТИЯ.
 *
 * Порог 44 — рекомендация Apple, 24x24 — обязательный минимум WCAG 2.5.8 (AA).
 * Считается меньшая сторона: цель 200x20 непригодна так же, как 20x200.
 * Возвращается ещё и вычисленный min-height, чтобы отличить «правило не
 * применилось» от «правило применилось, но элемент всё равно мал».
 */
const MEASURE_TARGETS = `
  (() => {
    const SEL = [
      "button", "a[href]", "input", "select", "textarea", "summary",
      "[role=button]", "[role=tab]", "[role=switch]", "[role=checkbox]",
      "[role=radio]", "[role=menuitem]", "[role=option]", "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const rows = [];
    for (const el of document.querySelectorAll(SEL)) {
      if (el.type === "hidden") continue;
      if (el.disabled) continue;
      if (el.getAttribute("aria-disabled") === "true") continue;
      if (typeof el.checkVisibility === "function") {
        if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      }
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width * 10) / 10;
      const h = Math.round(rect.height * 10) / 10;
      if (w <= 0 || h <= 0) continue;
      const min = Math.min(w, h);
      if (min >= 44) continue;
      const cs = getComputedStyle(el);
      if (cs.pointerEvents === "none") continue;
      const label =
        (el.getAttribute("aria-label") || el.textContent || el.value || el.placeholder || el.title || "")
          .replace(/\\s+/g, " ")
          .trim()
          .slice(0, 60);
      rows.push({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "",
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 90),
        testid: el.getAttribute("data-testid") || "",
        w, h, min,
        minH: cs.minHeight,
        minW: cs.minWidth,
        label,
      });
    }
    rows.sort((a, b) => a.min - b.min);
    return rows;
  })()
`;

/**
 * ГОРИЗОНТАЛЬНЫЕ ПЕРЕПОЛНЕНИЯ И СРЕЗАННЫЕ ДЕТИ.
 *
 * Три разных дефекта, и лечатся они в разных местах, поэтому не смешиваются:
 *   pageScroll — документ шире окна: врач мотает страницу боком;
 *   past       — элемент правее окна и НИ ОДИН предок его не прокручивает:
 *                часть содержимого недостижима вообще;
 *   clipped    — предок с overflow: hidden срезает ребёнка: текст/кнопка молча
 *                исчезают, экран при этом выглядит целым.
 */
const MEASURE_OVERFLOW = `
  (() => {
    const vw = window.innerWidth;
    const doc = document.scrollingElement || document.documentElement;
    const scrollableAncestor = (el) => {
      let node = el.parentElement;
      while (node && node !== document.body && node !== document.documentElement) {
        const ox = getComputedStyle(node).overflowX;
        if (ox === "auto" || ox === "scroll") return node;
        node = node.parentElement;
      }
      return null;
    };
    const describe = (el) => ({
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === "string" ? el.className : "").slice(0, 90),
      testid: el.getAttribute("data-testid") || "",
      text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 50),
    });
    const past = [];
    const clipped = [];
    for (const el of document.querySelectorAll("body *")) {
      if (typeof el.checkVisibility === "function") {
        if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") continue;
      if (rect.right > vw + 1 && !scrollableAncestor(el)) {
        past.push({ ...describe(el), right: Math.round(rect.right), width: Math.round(rect.width), over: Math.round(rect.right - vw) });
      }
      const parent = el.parentElement;
      if (parent) {
        const pcs = getComputedStyle(parent);
        const hides = pcs.overflowX === "hidden" || pcs.overflowX === "clip";
        if (hides) {
          const pr = parent.getBoundingClientRect();
          const cut = rect.right - pr.right;
          if (cut > 4) {
            clipped.push({
              ...describe(el),
              cutPx: Math.round(cut),
              parent: parent.tagName.toLowerCase() + "." + (typeof parent.className === "string" ? parent.className.split(" ").slice(0, 2).join(".") : ""),
            });
          }
        }
      }
    }
    past.sort((a, b) => b.over - a.over);
    clipped.sort((a, b) => b.cutPx - a.cutPx);
    return {
      pageScroll: { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, over: doc.scrollWidth - doc.clientWidth },
      bodyScroll: { scrollWidth: document.body.scrollWidth, clientWidth: document.body.clientWidth },
      past: past.slice(0, 25),
      pastCount: past.length,
      clipped: clipped.slice(0, 25),
      clippedCount: clipped.length,
    };
  })()
`;

/**
 * ТАБЛИЦЫ. Правило проекта — на узком экране разворачивать строки в карточки
 * через `content: attr(data-label)`. Проверяется не наличие правила в CSS, а
 * ФАКТ: какой display у ячеек сейчас и есть ли у них data-label.
 */
const MEASURE_TABLES = `
  (() => {
    const vw = window.innerWidth;
    const out = [];
    for (const table of document.querySelectorAll("table")) {
      if (typeof table.checkVisibility === "function") {
        if (!table.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      }
      const rect = table.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const cells = [...table.querySelectorAll("td")];
      const withLabel = cells.filter((c) => c.hasAttribute("data-label")).length;
      const firstCell = cells[0];
      const cellDisplay = firstCell ? getComputedStyle(firstCell).display : "нет ячеек";
      const cols = table.querySelectorAll("tr:first-of-type > *").length;
      let scroller = null;
      let node = table.parentElement;
      while (node && node !== document.body) {
        const ox = getComputedStyle(node).overflowX;
        if (ox === "auto" || ox === "scroll") { scroller = node; break; }
        node = node.parentElement;
      }
      out.push({
        cls: (typeof table.className === "string" ? table.className : "").slice(0, 80),
        testid: table.getAttribute("data-testid") || "",
        caption: (table.querySelector("caption, thead")?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 70),
        width: Math.round(rect.width),
        viewport: vw,
        cols,
        cells: cells.length,
        cellsWithDataLabel: withLabel,
        cellDisplay,
        stillTable: cellDisplay === "table-cell",
        scrollWidth: table.scrollWidth,
        scroller: scroller ? scroller.tagName.toLowerCase() + "." + (typeof scroller.className === "string" ? scroller.className.split(" ").slice(0, 2).join(".") : "") : null,
      });
    }
    return out;
  })()
`;

/** Инвентарь всего, что висит над потоком. */
const MEASURE_FLOATERS = `
  (() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      if (typeof el.checkVisibility === "function") {
        if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 80),
        testid: el.getAttribute("data-testid") || "",
        pos: cs.position,
        z: cs.zIndex,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 50),
      });
    }
    return out;
  })()
`;

/**
 * ПЕРЕКРЫТИЯ: КТО НА САМОМ ДЕЛЕ ПОЛУЧИТ НАЖАТИЕ.
 *
 * Не «пересекаются прямоугольники», а document.elementFromPoint — то же, чем
 * пользуется браузер при нажатии. Пересечение прямоугольников врёт в обе
 * стороны: прозрачная обёртка на весь экран пересекает всё и ничего не мешает,
 * а маленькая кнопка поверх подписи пересекает мало и ломает поле.
 *
 * Пять точек: центр и четыре внутренние четверти. Цель считается перекрытой,
 * если ни центр, ни четверти не возвращают её саму или её потомка/предка.
 * Отдельно считаются точки, перекрытые именно плавающим элементом.
 */
const MEASURE_COVERED = `
  (() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const SEL = "button, a[href], input, select, textarea, summary, [role=button], [role=tab]";
    const isFloating = (el) => {
      let node = el;
      while (node && node !== document.body) {
        const cs = getComputedStyle(node);
        if (cs.position === "fixed" || cs.position === "sticky") return node;
        node = node.parentElement;
      }
      return null;
    };
    const out = [];
    for (const el of document.querySelectorAll(SEL)) {
      if (el.type === "hidden" || el.disabled) continue;
      if (typeof el.checkVisibility === "function") {
        if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      const pts = [
        [r.x + r.width / 2, r.y + r.height / 2],
        [r.x + r.width * 0.25, r.y + r.height * 0.25],
        [r.x + r.width * 0.75, r.y + r.height * 0.25],
        [r.x + r.width * 0.25, r.y + r.height * 0.75],
        [r.x + r.width * 0.75, r.y + r.height * 0.75],
      ].filter(([x, y]) => x >= 0 && x <= vw - 1 && y >= 0 && y <= vh - 1);
      if (!pts.length) continue;
      let blocked = 0;
      let byFloat = 0;
      let culprit = null;
      for (const [x, y] of pts) {
        const hit = document.elementFromPoint(x, y);
        if (!hit) continue;
        if (hit === el || el.contains(hit) || hit.contains(el)) continue;
        blocked += 1;
        const floater = isFloating(hit);
        if (floater) {
          byFloat += 1;
          if (!culprit) {
            culprit = {
              tag: hit.tagName.toLowerCase(),
              cls: (typeof hit.className === "string" ? hit.className : "").slice(0, 70),
              floaterCls: (typeof floater.className === "string" ? floater.className : "").slice(0, 70),
              z: getComputedStyle(floater).zIndex,
              text: (floater.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40),
            };
          }
        } else if (!culprit) {
          culprit = {
            tag: hit.tagName.toLowerCase(),
            cls: (typeof hit.className === "string" ? hit.className : "").slice(0, 70),
            floaterCls: null,
            z: getComputedStyle(hit).zIndex,
            text: (hit.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40),
          };
        }
      }
      if (!blocked) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 80),
        label: (el.getAttribute("aria-label") || el.textContent || el.value || el.placeholder || "")
          .replace(/\\s+/g, " ").trim().slice(0, 50),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        points: pts.length,
        blocked,
        byFloat,
        culprit,
        scrollY: Math.round(window.scrollY),
      });
    }
    return out;
  })()
`;

/** Прокрутка шагами: elementFromPoint видит только текущую область. */
async function measureCoveredAcrossPage() {
	const geometry = await evaluate(`
    (() => {
      const doc = document.scrollingElement || document.documentElement;
      return { height: doc.scrollHeight, view: window.innerHeight };
    })()
  `);
	const steps = Math.min(
		8,
		Math.max(1, Math.ceil(geometry.height / geometry.view)),
	);
	const all = [];
	for (let step = 0; step < steps; step += 1) {
		await evaluate(`window.scrollTo(0, ${step} * window.innerHeight); true`);
		await sleep(350);
		const rows = await evaluate(MEASURE_COVERED);
		for (const row of rows || []) all.push(row);
	}
	await evaluate("window.scrollTo(0, 0); true");
	await sleep(250);
	const seen = new Set();
	const unique = [];
	for (const row of all) {
		const key = `${row.tag}|${row.cls}|${row.label}|${row.rect.w}x${row.rect.h}`;
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(row);
	}
	unique.sort((a, b) => b.byFloat - a.byFloat || b.blocked - a.blocked);
	return { steps, total: all.length, unique };
}

async function shootFullPage(fileName, capHeight = 3000) {
	const box = await evaluate(`
    (() => {
      const doc = document.scrollingElement || document.documentElement;
      return { w: window.innerWidth, h: Math.min(doc.scrollHeight, ${capHeight}) };
    })()
  `);
	const shot = await send("Page.captureScreenshot", {
		format: "png",
		clip: { x: 0, y: 0, width: box.w, height: box.h, scale: 1 },
		captureBeyondViewport: true,
	});
	await writeFile(path.join(OUT, fileName), Buffer.from(shot.data, "base64"));
	return box;
}

async function shootViewportOnly(fileName) {
	const shot = await send("Page.captureScreenshot", { format: "png" });
	await writeFile(path.join(OUT, fileName), Buffer.from(shot.data, "base64"));
}

const VIEWS = [
	{ view: "shift", slug: "shift", label: "Смена" },
	{ view: "schedule", slug: "schedule", label: "Записи (расписание)" },
	{
		view: "patients",
		slug: "patients",
		label: "Пациенты (картотека)",
		prepare: SELECT_PATIENT,
	},
	{ view: "visit", slug: "visit", label: "Приём", needsPatient: true },
	{ view: "imaging", slug: "imaging", label: "Снимки" },
	{ view: "finance", slug: "finance", label: "Оплаты" },
];

const DEVICES = [
	{
		name: "tablet",
		width: 820,
		height: 1180,
		coarse: true,
		label: "планшет портрет 820x1180, указатель грубый",
	},
	{
		name: "desktop",
		width: 1600,
		height: 1000,
		coarse: false,
		label: "настольный 1600x1000, указатель точный",
	},
];

await setDevice(DEVICES[1]);
await waitForWorkspace();
console.log("Рабочий кабинет открыт");

const report = { startedAt: new Date().toISOString(), devices: [] };

for (const device of DEVICES) {
	await setDevice(device);
	await sleep(1500);
	const media = await readMediaState();
	console.log(`\n=== ${device.label} ===`);
	console.log(
		`   окно ${media.innerWidth}x${media.innerHeight}, pointer:coarse=${media.coarse}, ` +
			`max-width:700=${media.under700}, правила зон нажатия активны=${media.touchTargetsActive}, ` +
			`нижняя навигация: ${media.bottomNav}`,
	);
	const deviceEntry = {
		device: device.name,
		label: device.label,
		media,
		views: [],
	};

	// Пациент выбирается один раз на устройство: приём без него — пустое состояние.
	await goToView("patients");
	await sleep(3000);
	const chosen = await evaluate(SELECT_PATIENT);
	console.log(`   выбран пациент: ${chosen}`);

	for (const item of VIEWS) {
		await goToView(item.view);
		await sleep(item.view === "visit" || item.view === "imaging" ? 5000 : 4000);
		if (item.prepare) await evaluate(item.prepare);
		await sleep(800);

		const targets = await evaluate(MEASURE_TARGETS);
		const overflow = await evaluate(MEASURE_OVERFLOW);
		const tables = await evaluate(MEASURE_TABLES);
		const floaters = await evaluate(MEASURE_FLOATERS);
		const covered = await measureCoveredAcrossPage();

		const heading = await evaluate(`
      (() => {
        const h = document.querySelector("h1, h2, .panel-heading, .page-title");
        const empty = /Пациент не выбран|Раздел не загружен|Нет данных/.test(document.body.textContent || "");
        return { heading: (h?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 70), empty };
      })()
    `);

		await shootFullPage(`${device.name}_${item.slug}_full.png`);
		await shootViewportOnly(`${device.name}_${item.slug}_fold.png`);

		const under24 = (targets || []).filter((t) => t.min < 24).length;
		const under32 = (targets || []).filter((t) => t.min < 32).length;
		const stillTables = (tables || []).filter((t) => t.stillTable);
		const coveredByFloat = covered.unique.filter((c) => c.byFloat > 0);

		console.log(
			`   [${item.label}] цели <44: ${targets?.length ?? "?"} (из них <32: ${under32}, <24: ${under24}); ` +
				`переполнений за окно: ${overflow.pastCount}, срезано предком: ${overflow.clippedCount}, ` +
				`док.scrollWidth-clientWidth=${overflow.pageScroll.over}; ` +
				`таблиц: ${tables?.length ?? 0} (остались таблицами: ${stillTables.length}); ` +
				`плавающих: ${floaters?.length ?? 0}; перекрыто целей: ${covered.unique.length} (плавающим: ${coveredByFloat.length})`,
		);
		if (heading.empty)
			console.log(`      ВНИМАНИЕ: на экране признак пустого состояния`);

		deviceEntry.views.push({
			view: item.view,
			label: item.label,
			heading,
			targets: targets || [],
			targetSummary: { under44: targets?.length ?? 0, under32, under24 },
			overflow,
			tables: tables || [],
			floaters: floaters || [],
			covered,
		});
	}

	report.devices.push(deviceEntry);
}

report.pageErrors = pageErrors.slice(0, 40);
await writeFile(
	path.join(OUT, "chairside-measurements.json"),
	JSON.stringify(report, null, 2),
	"utf8",
);
console.log(`\nЗамеры: ${path.join(OUT, "chairside-measurements.json")}`);
console.log(`Ошибок страницы: ${pageErrors.length}`);
for (const error of pageErrors.slice(0, 8))
	console.log(`  ${error.split("\n")[0]}`);

socket.close();
browser.kill();
process.exit(0);
