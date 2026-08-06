/**
 * Снимки всех разделов в светлой и тёмной теме, на настольном экране и на
 * телефоне.
 *
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО И ПОЧЕМУ ЭТОТ ФАЙЛ ПРАВИЛИ ДВАЖДЫ
 * 1. Тема не проверялась перед снимком. Имя файла отражало тему, которую
 *    сценарий ХОТЕЛ, а не которая была применена к <html>. Тот же класс дефекта
 *    в соседнем сценарии дал плиту light_duplicateAlert.png с ночными пикселями
 *    (VISUAL_VERDICT.md, аддендум C1).
 * 2. waitForViewReady предупреждал и шёл дальше. Из-за этого шесть картинок с
 *    экраном ошибки Vite и снимок экрана ввода PIN легли в папку под именами
 *    разделов и тем (VISUAL_VERDICT.md, §0 и A0.1).
 * 3. Побайтово одинаковые файлы никто не считал: 56 файлов при 44 уникальных
 *    md5, четырнадцать клонов в двух группах.
 *
 * ЧТО СЛОМАЛА ПРЕДЫДУЩАЯ ПРАВКА (и что исправлено здесь)
 * 4. Признак готовности раздела не мог стать истинным НИ ДЛЯ ОДНОГО раздела:
 *    условие aria-busy приклеивалось к списку селекторов и действовало только на
 *    его последний элемент. Пока рядом стоял console.warn, это было незаметно;
 *    вместе с падением сценарий перестал снимать вообще — он умирал на первом же
 *    разделе и писал в ошибке неправду: на диагностическом кадре раздел был
 *    отрисован полностью. Разбор — у busySelector в scripts/lib/shot-audit.mjs.
 * 5. Сценарий не мог выйти с кодом 0. Браузер убивался только в
 *    process.on("exit"), а этот обработчик срабатывает лишь когда цикл событий
 *    опустел; живой дочерний процесс браузера сам держит цикл. Прогон доходил до
 *    конца и висел, а браузер, который обработчик собирался убить, оставался жить
 *    на общей машине — ровно наоборот к заявленной цели. Измерено: та же схема на
 *    голом примере даёт код 124 (зависание), а явное завершение — 0.
 * 6. Ошибки внутри evaluate терялись: exceptionDetails не проверялся, поэтому
 *    упавшее в странице выражение возвращало undefined и читалось как «не
 *    готово». Причина подменялась симптомом.
 * 7. При неудачном входе сценарий печатал ошибку в консоль страницы и снимал
 *    дальше, а nav() подкладывал в localStorage строку «demo-staff-token». Так и
 *    получаются «снимки разделов», на которых экран входа: подложные токены дают
 *    видимость сессии.
 *
 * ТРЕБУЕТСЯ живой веб-сервер (по умолчанию 127.0.0.1:5173) и живой API: снимок
 * несуществующей страницы — это ложное доказательство, поэтому без них сценарий
 * падает, а не делает вид, что снял.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
	busySelector,
	createShotAudit,
	MISS_SUFFIX,
	paletteFingerprint,
	THEME_STATE_EXPRESSION,
} from "./lib/shot-audit.mjs";

const OUT = "C:/Clinic_MVP/dental-crm/.dente-redesign-shots";
/** Адрес, порт отладки и демо-вход — через окружение: на общей машине их меняют, не правя сценарий. */
const webBaseUrl = process.env.DENTE_SHOT_WEB_URL || "http://127.0.0.1:5173";
const cdpPort = Number(process.env.DENTE_SHOT_CDP_PORT || 9331);
const demoLogin = {
	email: process.env.DENTE_SHOT_EMAIL || "doctor@clinic.com",
	password: process.env.DENTE_SHOT_PASSWORD || "password",
};
/** Время старта: попадает в theme-audit.json, чтобы снимки нельзя было спутать со вчерашними. */
const runStartedAt = new Date().toISOString();

/** Разделы и темы прогона. Ожидаемый список файлов выводится из них, а не пишется руками. */
const VIEWS = [
	"shift",
	"schedule",
	"patients",
	"imaging",
	"visit",
	"documents",
	"finance",
	"analytics",
	"communications",
	"settings",
	"marketing",
];
const COLLAPSED_FILE = "desktop_light_shift_collapsed.png";

/**
 * Контейнер, по которому видно, что открыт именно ЭТОТ раздел. У каждого раздела
 * есть свой id, поэтому общий «.panel» из списка убран: он есть на любом разделе,
 * и готовность подтверждалась панелью предыдущего — это и есть механизм, которым
 * снимок одного раздела попадает под именем другого.
 */
const VIEW_CONTAINERS = {
	shift: "#shift, .shift-hero",
	schedule: "#schedule, .schedule-panel",
	patients: "#patients, .patients-panel",
	imaging: "#imaging, .imaging-panel",
	visit: "#visit, .visit-panel",
	documents: "#documents, .documents-panel",
	finance: "#finance, .finance-panel",
	analytics: "#analytics, .analytics-panel",
	communications: "#communications, .communications-panel",
	settings: "#settings, .settings-zone",
	marketing: "#marketing, .marketing-panel",
};

const expected = [
	...VIEWS.map((view) => ({
		file: `desktop_light_${view}.png`,
		theme: "light",
	})),
	{ file: COLLAPSED_FILE, theme: "light" },
	...VIEWS.map((view) => ({ file: `desktop_dark_${view}.png`, theme: "dark" })),
	...VIEWS.map((view) => ({
		file: `mobile_light_${view}.png`,
		theme: "light",
	})),
	...VIEWS.map((view) => ({ file: `mobile_dark_${view}.png`, theme: "dark" })),
];
const audit = createShotAudit({ expected });

// Живой веб-сервер обязателен: без него снимать нечего.
const probe = await fetch(webBaseUrl).catch((error) => {
	throw new Error(
		`Веб-сервер на ${webBaseUrl} недоступен (${error.message}). Запустите npm run dev и повторите: снимок несуществующей страницы — ложное доказательство.`,
	);
});
if (!probe.ok)
	throw new Error(`Веб-сервер на ${webBaseUrl} ответил ${probe.status}`);

await mkdir(OUT, { recursive: true });

const browserPath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

/*
 * Профиль браузера СВЕЖИЙ на каждый прогон, а не общий.
 *
 * Прежде все прогоны делили один каталог «dente-shot-profile». Этой ночью
 * сценарий падал трижды посреди работы — на медленном разделе, на зависшей
 * отрисовке, — и каждый раз оставлял этот профиль в неизвестном состоянии. После
 * этого запуск начал умирать сразу: первый же Runtime.evaluate не получал ответа
 * за 30 секунд, а процессов браузера в системе не оставалось вовсе, то есть он
 * не поднимался и молча уходил.
 *
 * Это тот же класс дефекта, который уже был здесь починен для свёрнутого меню:
 * состояние, унаследованное от упавшего прогона, ломает следующий. Лечится
 * одинаково — не наследовать. Профиль одноразовый, поэтому его каталог уникален
 * по времени старта и удаляется перед созданием, если такой уже есть.
 *
 * Каталог лежит в TEMP и содержит только кэш безголового браузера: ни исходников,
 * ни данных проекта здесь нет.
 */
const tmpProfile = path.join(
	process.env.TEMP || "C:/tmp",
	`dente-shot-profile-${runStartedAt.replace(/[:.]/g, "-")}`,
);
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

/**
 * ЗАВЕРШЕНИЕ. Три вещи держат цикл событий: дочерний процесс браузера, его
 * незакрытая труба stderr и веб-сокет отладки. Пока живо любое из них, узел не
 * выходит, а обработчик process.on("exit") не срабатывает — значит убивать
 * браузер ТОЛЬКО в нём нельзя: получается взаимная блокировка на успешном пути.
 * Поэтому здесь и явное завершение в конце прогона, и обработчик как страховка на
 * случай падения; shutdown идемпотентен.
 */
const browserStderr = [];
browser.stderr?.on("data", (chunk) => {
	// Труба читается всегда: непрочитанная труба сама держит цикл событий открытым,
	// а сообщения браузера — единственное объяснение, если он не поднялся.
	browserStderr.push(chunk.toString());
	if (browserStderr.length > 40)
		browserStderr.splice(0, browserStderr.length - 40);
});

let closeSocket = () => {};
let shuttingDown = false;
function shutdown() {
	if (shuttingDown) return;
	shuttingDown = true;
	try {
		closeSocket();
	} catch {
		/* сокет уже закрыт */
	}
	try {
		browser.kill();
	} catch {
		/* браузер уже мёртв */
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
			/* браузер ещё поднимается */
		}
		await sleep(1000);
	}
	throw new Error(
		`Отладочный порт браузера ${cdpPort} не отвечает. Последнее от браузера: ${browserStderr.slice(-3).join(" ").trim() || "(тишина)"}`,
	);
}

const targets = await getTargets();
const pageTarget =
	targets.find((target) => target.type === "page") ?? targets[0];
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
			// Ответ обязателен: без срока ожидания потерянный ответ вешает прогон
			// навсегда, и снаружи это выглядит как «сценарий работает».
			const timer = setTimeout(() => {
				if (!pending.has(id)) return;
				pending.delete(id);
				reject(new Error(`${method}: браузер не ответил за 30 с`));
			}, 30000);
			pending.set(id, { resolve, reject, timer });
			socket.send(JSON.stringify({ id, method, params }));
		});
	},
};

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

/**
 * Ошибка внутри страницы — это ошибка, а не пустой ответ. Раньше
 * exceptionDetails игнорировался: упавшее выражение возвращало undefined,
 * читалось как «раздел не готов», и в тексте ошибки называлась не та причина.
 */
async function evaluate(expression) {
	const result = await cdp.send("Runtime.evaluate", {
		expression,
		returnByValue: true,
		awaitPromise: true,
	});
	if (result?.exceptionDetails) {
		const details = result.exceptionDetails;
		throw new Error(
			`Ошибка в странице: ${details.exception?.description || details.text || "исключение без описания"}`,
		);
	}
	return result?.result?.value;
}

/**
 * Читает и ЗАДАЁТ состояние свёрнутого меню, вместо того чтобы наследовать его.
 *
 * Зачем отдельная функция, а не клик по кнопке. Свёрнутость хранится в
 * localStorage, то есть переживает перезагрузку и остаётся между прогонами.
 * Прежний код сворачивал меню слепым кликом на строке 508 и разворачивал его
 * обратно на 511 — только на счастливом пути. Прогон этой ночью упал на
 * разделе «analytics», то есть ДО строки 508, а предыдущий упал между 508 и 511
 * и оставил меню свёрнутым навсегда. В результате все семь настольных снимков
 * показали СВЁРНУТУЮ рельсу, а назывались просто «desktop_light_*» — то есть
 * снимок не того состояния под именем состояния по умолчанию. Это ровно тот
 * класс подделки доказательства, против которого в этом сценарии уже стоит
 * проверка контейнера раздела.
 *
 * Поэтому: состояние задаётся явно и ПРОВЕРЯЕТСЯ после переключения. Слепой
 * клик, который не сработал (кнопку переименовали, разметка изменилась), теперь
 * останавливает прогон, а не выдаёт кадр не того состояния.
 */
async function setSidebarCollapsed(collapsed) {
	for (let attempt = 0; attempt < 12; attempt += 1) {
		const state = await evaluate(
			`(() => {
        const rail = document.querySelector('.sidebar');
        if (!rail) return { present: false };
        return { present: true, collapsed: rail.getAttribute('data-collapsed') === 'true' };
      })()`,
		);
		if (!state?.present) {
			throw new Error(
				"Боковое меню (.sidebar) не найдено: снимок настольной раскладки без рельсы — ложное доказательство",
			);
		}
		if (state.collapsed === collapsed) return state;
		const clicked = await evaluate(
			`(() => { const button = document.querySelector('.sidebar-collapse-button'); if (button) button.click(); return Boolean(button); })()`,
		);
		if (!clicked) {
			throw new Error(
				"Кнопка сворачивания (.sidebar-collapse-button) не найдена: состояние рельсы задать нечем, прогон остановлен",
			);
		}
		await sleep(400);
	}
	throw new Error(
		`Меню не перешло в состояние «свёрнуто: ${collapsed}» за 12 попыток: состояние хранится в localStorage и могло остаться от прошлого прогона`,
	);
}

async function readThemeState() {
	const state = await evaluate(THEME_STATE_EXPRESSION);
	if (!state) throw new Error("Страница не вернула состояние темы");
	return { ...state, fingerprint: paletteFingerprint(state.values) };
}

async function setViewport(width, height, mobile) {
	if (mobile) {
		await cdp.send("Emulation.setDeviceMetricsOverride", {
			width,
			height,
			deviceScaleFactor: 2,
			mobile: true,
		});
	} else {
		await cdp.send("Emulation.clearDeviceMetricsOverride");
		await cdp.send("Emulation.setDeviceMetricsOverride", {
			width,
			height,
			deviceScaleFactor: 1,
			mobile: false,
		});
	}
	audit.setViewport(`${width}x${height}${mobile ? " mobile" : ""}`);
	await sleep(500);
}

/**
 * Тема переключается ТОЛЬКО через хранилище приложения — тем же вызовом, что и
 * переключатель в интерфейсе. Прежний вариант дополнительно писал themeMode в два
 * блока настроек, которых не читает никто, и переставлял data-theme руками, то
 * есть обходил единственный источник истины. Дальше сценарий ЖДЁТ применения, а
 * не спит наугад: тема считается применённой, когда её видно на <html> и в
 * хранилище одновременно.
 */
async function setTheme(theme) {
	const applied = await evaluate(`(() => {
    const store = window.__useThemeStore;
    if (!store) return false;
    store.getState().setThemeMode(${JSON.stringify(theme)});
    return true;
  })()`);
	if (!applied) {
		throw new Error(
			`Хранилище темы недоступно (window.__useThemeStore): приложение не загрузилось, тема «${theme}» не применена`,
		);
	}

	const deadline = Date.now() + 15000;
	let state = null;
	while (Date.now() < deadline) {
		state = await readThemeState();
		if (
			state.dataTheme === theme &&
			state.mode === theme &&
			state.tokenCount > 0 &&
			state.empty.length === 0
		) {
			console.log(
				`тема ${theme}: data-theme «${state.dataTheme}», режим «${state.mode}», класс «${state.className}», токенов ${state.tokenCount}, палитра ${state.fingerprint}`,
			);
			return state;
		}
		await sleep(150);
	}
	throw new Error(
		`Тема «${theme}» не применилась за 15 с: data-theme «${state?.dataTheme}», режим «${state?.mode}», пустых тем-зависимых токенов ${state?.empty?.length ?? 0}`,
	);
}

/** Что на самом деле открыто: список id разделов, найденных на странице, и адрес. */
async function pageWhereami() {
	return evaluate(`
    (() => {
      const ids = ${JSON.stringify(VIEWS)}.filter((view) => document.getElementById(view));
      const login = document.body.textContent?.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ") || false;
      const pin = Boolean(document.querySelector(".staff-pin-pad, .pin-lock-screen"));
      return {
        hash: window.location.hash,
        containers: ids,
        login,
        pin,
        title: document.querySelector("h1, h2")?.textContent?.trim().slice(0, 80) || "",
      };
    })()
  `);
}

/** Диагностический кадр: без него причину не отличить от симптома. */
async function writeDiagnosticShot(fileName) {
	const stuck = await cdp.send("Page.captureScreenshot", { format: "png" });
	await writeFile(path.join(OUT, fileName), Buffer.from(stuck.data, "base64"));
	return fileName;
}

/**
 * Ожидание раздела. Раньше здесь стоял console.warn и прогон шёл дальше — именно
 * так шесть снимков экрана ошибки Vite легли под именами трёх тем, а экран ввода
 * PIN — под именем раздела документов (VISUAL_VERDICT.md §0, A0.1). Потом
 * появилось падение, но признак готовности был сломан склейкой селекторов и не
 * становился истинным никогда. Теперь проверяется то, что заявлено: контейнер
 * ИМЕННО ЭТОГО раздела есть и не помечен aria-busy.
 */
async function waitForViewReady(viewName) {
	const selector = VIEW_CONTAINERS[viewName];
	if (!selector) {
		throw new Error(
			`Раздел «${viewName}» не описан в VIEW_CONTAINERS: по какому контейнеру считать его открытым — неизвестно. Общий «.panel» здесь не годится: он есть на любом разделе, и снимок лёг бы под чужим именем.`,
		);
	}
	const busy = busySelector(selector);
	let last = null;
	/*
	 * Бюджет ожидания — 30 с, а не 10.
	 *
	 * Раздел «communications» не уложился в 10 с и прогон упал, но сообщение об
	 * ошибке само себе противоречило: «контейнер раздела не появился» и тут же
	 * «контейнеры разделов [communications]». Причина не в приложении: разделы
	 * грузятся ленивыми модулями, и тяжёлый чанк при первом открытии не успевал,
	 * а pageWhereami() читал страницу уже ПОСЛЕ того, как контейнер появился.
	 * Порог поднят до 120 попыток по 250 мс; проверка при этом не ослаблена —
	 * раздел, которого нет, всё равно останавливает прогон, просто теперь это
	 * означает «нет», а не «не успел».
	 */
	for (let attempt = 0; attempt < 120; attempt += 1) {
		last = await evaluate(`
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return { ready: false, reason: "контейнер раздела не появился" };
        if (document.querySelector(${JSON.stringify(busy)})) return { ready: false, reason: "контейнер помечен aria-busy" };
        return { ready: true };
      })()
    `);
		if (last?.ready) {
			await sleep(500);
			return;
		}
		await sleep(250);
	}
	// Причина перечитывается на момент отказа. Прежде печаталась причина ПОСЛЕДНЕЙ
	// попытки, а диагностика собиралась позже, поэтому сообщение могло утверждать
	// «контейнера нет» и одновременно перечислять этот контейнер среди найденных.
	// Сообщение, противоречащее самому себе, отправляет разбираться не туда.
	const atFailure = await evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return { ready: false, reason: "контейнер раздела не появился" };
      if (document.querySelector(${JSON.stringify(busy)})) return { ready: false, reason: "контейнер помечен aria-busy" };
      return { ready: true, reason: "контейнер появился уже ПОСЛЕ истечения бюджета — это медленная загрузка, а не отсутствующий раздел" };
    })()
  `);
	const where = await pageWhereami();
	const stuckName = `${MISS_SUFFIX.slice(1)}_НЕ_ОТКРЫЛСЯ_${viewName}.png`;
	await writeDiagnosticShot(stuckName);
	throw new Error(
		`Раздел «${viewName}» не открылся за 30 с: ${atFailure?.reason ?? last?.reason ?? "причина не считана"} (искали ${selector}). ` +
			`На странице: адрес «${where?.hash}», контейнеры разделов [${(where?.containers ?? []).join(", ") || "нет ни одного"}], ` +
			`экран входа: ${where?.login}, экран PIN: ${where?.pin}, заголовок «${where?.title}». ` +
			`Снимать нечего, прогон остановлен. Что было на экране: ${stuckName}`,
	);
}

/**
 * Переход в раздел. Экран блокировки гасится адресно: клик по карточке сотрудника
 * и четыре нажатия кнопки «0». Подкладывать в localStorage строку
 * «demo-staff-token» здесь больше нельзя — так делается видимость сессии, при
 * которой снимок раздела оказывается снимком экрана входа.
 */
async function nav(viewName) {
	await evaluate(`(() => {
    const pinPad = document.querySelector('.staff-pin-pad, .pin-lock-screen');
    if (!pinPad) return false;
    const staffCard = document.querySelector('.staff-card, .staff-member-item');
    if (staffCard) staffCard.click();
    const zeroButton = [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === '0');
    if (zeroButton) {
      for (let index = 0; index < 4; index += 1) zeroButton.click();
    }
    return true;
  })()`);

	const selector = `aside.sidebar nav a[href="#${viewName}"], .dnt-bottom-nav a[href="#${viewName}"]`;
	await evaluate(`(() => {
    const link = document.querySelector(${JSON.stringify(selector)});
    if (link) {
      link.click();
      return true;
    }
    window.location.hash = ${JSON.stringify(`#${viewName}`)};
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return false;
  })()`);
	await waitForViewReady(viewName);
}

/**
 * Снимок. Проверка вплотную к затвору: между переключением темы и этим кадром
 * были переход в раздел и ожидания, за которые приложение могло применить тему
 * заново из своего хранилища. Ведомость заполняется ДО записи файла — двойник не
 * должен лечь на диск и попасть в чужую выборку.
 */
/**
 * Наименьший правдоподобный размер кадра приложения, в байтах.
 *
 * ЗАЧЕМ ЭТА ПРОВЕРКА СУЩЕСТВУЕТ. Проверка темы читает токены палитры, а они
 * живут на :root и ПЕРЕЖИВАЮТ пустую страницу. Поэтому кадр размером 5 851 байт
 * — полностью белый лист — прошёл проверку темы и был записан в журнал обычной
 * строкой успеха: «снимок desktop_light_shift.png (6 КБ, тема «light», палитра
 * aaa45b8822ec)». Отпечаток палитры совпал, имя файла обещало раздел смены, а на
 * картинке не было ничего. Причину видно по следующему вызову: браузер перестал
 * отвечать («Page.captureScreenshot: браузер не ответил за 30 с»), то есть
 * отрисовка умерла при живом DOM — проверка контейнера раздела прошла, а красить
 * было уже нечем.
 *
 * Порог выведен из настоящих замеров этого же прогона, а не назначен на глаз:
 * самый маленький ЧЕСТНЫЙ кадр — imaging, 59 516 байт; пустой — 5 851 байт.
 * 20 000 лежит между ними с запасом в три раза в обе стороны. PNG сжимает
 * однотонный лист в десятки раз сильнее живого интерфейса, поэтому размер здесь
 * — надёжный признак «нечего смотреть», а не придирка к качеству.
 */
const MIN_PLAUSIBLE_SHOT_BYTES = 20_000;

async function shot(name, theme) {
	const fileName = `${name}.png`;
	const themeState = audit.assertThemeBeforeShot(
		await readThemeState(),
		theme,
		fileName,
	);
	const { data } = await cdp.send("Page.captureScreenshot", {
		format: "png",
		captureBeyondViewport: false,
	});
	const buffer = Buffer.from(data, "base64");
	if (buffer.byteLength < MIN_PLAUSIBLE_SHOT_BYTES) {
		throw new Error(
			`Кадр «${fileName}» весит ${buffer.byteLength} байт — это пустой лист, а не раздел. ` +
				`Ниже ${MIN_PLAUSIBLE_SHOT_BYTES} байт интерфейс не отрисовался: DOM мог быть на месте, а отрисовка умереть. ` +
				`Кадр НЕ записан на диск: пустой снимок под именем раздела — ложное доказательство, а не плохой снимок. ` +
				`Проверьте, что веб-сервер не отдаёт полуготовое дерево (правки в полёте) и что браузер жив.`,
		);
	}
	const entry = audit.register({
		file: fileName,
		buffer,
		theme,
		state: themeState,
	});
	await writeFile(path.join(OUT, fileName), buffer);
	console.log(
		`снимок ${fileName} (${Math.round(entry.bytes / 1024)} КБ, тема «${themeState.dataTheme}», палитра ${themeState.fingerprint})`,
	);
}

/**
 * Вход настоящим запросом. Раньше провал входа печатался в консоль страницы и
 * прогон продолжался — так и получаются «снимки разделов» с экраном входа.
 * Теперь провал обрывает прогон, и в сообщении видно, что ответил маршрут.
 */
await sleep(3000);
const session = await evaluate(`(async () => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: ${JSON.stringify(JSON.stringify({ email: demoLogin.email, password: demoLogin.password }))}
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.clinicToken || !body?.staffToken) {
      return { ok: false, status: response.status, reason: body?.error || body?.message || 'в ответе нет токенов' };
    }
    localStorage.setItem("dente_clinic_token", body.clinicToken);
    localStorage.setItem("dente_staff_token", body.staffToken);
    if (body.user?.organizationId) localStorage.setItem("dente_clinic_tenant_id", body.user.organizationId);
    localStorage.setItem("dente_workspace_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ version: 1, dismissed: true, savedAt: new Date().toISOString() }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      selectedWorkspaceRole: "owner",
      onboardingDismissed: true,
      onboardingDismissedAt: new Date().toISOString(),
      onboardingDraftMode: false,
      savedAt: new Date().toISOString()
    }));
    localStorage.setItem("dente_onboarding_dismissed_v1", JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
    return { ok: true, status: response.status, organization: body.user?.organizationId || null };
  } catch (error) {
    return { ok: false, status: 0, reason: error.message };
  }
})()`);
if (!session?.ok) {
	throw new Error(
		`Вход под ${demoLogin.email} не удался (ответ ${session?.status}: ${session?.reason}). Снимать нечего: без сессии сценарий снял бы экран входа под именами разделов. Задайте DENTE_SHOT_EMAIL/DENTE_SHOT_PASSWORD или пересейте демо-данные.`,
	);
}
console.log(
	`вход выполнен: организация ${session.organization ?? "не сообщена"}`,
);

/**
 * Ждём рабочий кабинет. Раньше это ожидание молча заканчивалось после 40 попыток
 * и прогон шёл снимать что попало.
 */
async function waitForWorkspace() {
	for (let attempt = 0; attempt < 40; attempt += 1) {
		const ready = await evaluate(
			`Boolean(document.querySelector('.shift-hero, .panel, .today-schedule-box, .section-card'))`,
		);
		if (ready) return;
		await sleep(500);
	}
	const where = await pageWhereami();
	const stuckName = `${MISS_SUFFIX.slice(1)}_НЕ_ОТКРЫЛСЯ_кабинет.png`;
	await writeDiagnosticShot(stuckName);
	throw new Error(
		`Рабочий кабинет не открылся за 20 с: адрес «${where?.hash}», экран входа: ${where?.login}, экран PIN: ${where?.pin}, заголовок «${where?.title}». Что было на экране: ${stuckName}`,
	);
}

await evaluate(`window.location.reload()`);
await waitForWorkspace();
await sleep(2000);

// 1. НАСТОЛЬНЫЙ ЭКРАН, СВЕТЛАЯ ТЕМА (1440x900)
await setViewport(1440, 900, false);
await setTheme("light");
// Состояние рельсы задаём, а не наследуем: оно живёт в localStorage и после
// падения прошлого прогона осталось свёрнутым, из-за чего все настольные снимки
// показали не то состояние, которое обещали их имена.
await setSidebarCollapsed(false);
for (const view of VIEWS) {
	await nav(view);
	await shot(`desktop_light_${view}`, "light");
}

// Свёрнутое боковое меню — отдельный кадр того же раздела.
await nav("shift");
await setSidebarCollapsed(true);
await sleep(700);
await shot(COLLAPSED_FILE.replace(/\.png$/, ""), "light");
await setSidebarCollapsed(false);
await sleep(700);

// 2. НАСТОЛЬНЫЙ ЭКРАН, ТЁМНАЯ ТЕМА
await setTheme("dark");
for (const view of VIEWS) {
	await nav(view);
	await shot(`desktop_dark_${view}`, "dark");
}

// 3. ТЕЛЕФОН, СВЕТЛАЯ ТЕМА (390x844)
await setViewport(390, 844, true);
await setTheme("light");
for (const view of VIEWS) {
	await nav(view);
	await shot(`mobile_light_${view}`, "light");
}

// 4. ТЕЛЕФОН, ТЁМНАЯ ТЕМА
await setTheme("dark");
for (const view of VIEWS) {
	await nav(view);
	await shot(`mobile_dark_${view}`, "dark");
}

/**
 * АУДИТ ПРОГОНА. Побайтовые двойники ловятся при записи (см. register), поэтому
 * здесь остаётся ПОЛНОТА: все ли ожидаемые снимки сделаны. Раньше конвейер считал
 * только то, что записал, и прогон, снявший часть разделов, заканчивался зелёным.
 */
const manifest = audit.manifest({
	startedAt: runStartedAt,
	finishedAt: new Date().toISOString(),
	out: OUT,
});
await writeFile(
	path.join(OUT, "theme-audit.json"),
	JSON.stringify(manifest, null, 2),
	"utf8",
);

console.log(`\nСнимки: ${OUT}`);
console.log(
	`Снимков записано: ${manifest.plates} из ${manifest.expected} ожидаемых, уникальных md5: ${manifest.uniqueMd5}`,
);
for (const { key, fingerprint } of manifest.palettes)
	console.log(`  палитра ${key}: ${fingerprint}`);
console.log("Светлая и тёмная тема одного раздела — разные файлы:");
for (const view of VIEWS) {
	const row = [
		"desktop_light",
		"desktop_dark",
		"mobile_light",
		"mobile_dark",
	].map((prefix) => {
		const entry = manifest.shots.find(
			(item) => item.file === `${prefix}_${view}.png`,
		);
		return `${prefix} ${entry ? entry.md5.slice(0, 12) : "нет снимка"}`;
	});
	console.log(`  ${view}: ${row.join(" | ")}`);
}
console.log(
	`Происхождение каждого снимка: ${path.join(OUT, "theme-audit.json")}`,
);

// Завершение до броска: иначе браузер остался бы жить на общей машине.
shutdown();
audit.assertComplete();
console.log("Готово");
