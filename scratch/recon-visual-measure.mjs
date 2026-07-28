/**
 * ИЗМЕРИТЕЛЬ ЭКРАНОВ ДЛЯ РАЗВЕДКИ (read-only, ничего в приложении не правит).
 *
 * Считает по факту, через getComputedStyle и getBoundingClientRect, в трёх темах
 * (light / dark / night) и на двух ширинах (1600 и 720):
 *   1) контраст текста к фактическому фону (альфа-композит по цепочке предков);
 *   2) прозрачный/пустой цвет текста — симптом неразрешённого var();
 *   3) горизонтальные переполнения окна и выход детей за родителя;
 *   4) зоны нажатия меньше 32px;
 *   5) плавающие (fixed/sticky) элементы, реально закрывающие таблицы и кнопки
 *      (проверка через elementFromPoint, а не по пересечению прямоугольников).
 *
 * Каждой находке ищется правило CSS, которое задало цвет, и файл из
 * data-vite-dev-id на <style> — чтобы в отчёте был файл, а не догадка.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

/** Собственного Chrome у puppeteer здесь нет; берём установленный браузер, как это делает scripts/dente-redesign-shots.mjs. */
const BROWSER_PATH =
	process.env.RECON_BROWSER ||
	[
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	].find((candidate) => existsSync(candidate));
if (!BROWSER_PATH) throw new Error("Браузер не найден: задайте RECON_BROWSER");

const WEB = process.env.DENTE_SHOT_WEB_URL || "http://127.0.0.1:5173";
const OUT = process.env.RECON_OUT || "C:/Clinic_MVP/dental-crm/artifacts/recon-visual";
const EMAIL = process.env.DENTE_SHOT_EMAIL || "doctor@clinic.com";
const PASSWORD = process.env.DENTE_SHOT_PASSWORD || "password";

const VIEWS = process.env.RECON_VIEWS
	? process.env.RECON_VIEWS.split(",")
	: [
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
const THEMES = process.env.RECON_THEMES ? process.env.RECON_THEMES.split(",") : ["light", "dark", "night"];
const ALL_VIEWPORTS = [
	{ label: "w1600", width: 1600, height: 1000 },
	{ label: "w720", width: 720, height: 900 },
];
const VIEWPORTS = process.env.RECON_VIEWPORTS
	? ALL_VIEWPORTS.filter((v) => process.env.RECON_VIEWPORTS.split(",").includes(v.label))
	: ALL_VIEWPORTS;

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Выражение, исполняемое В СТРАНИЦЕ. Всё измерение живёт здесь.
 * ------------------------------------------------------------------ */
const MEASURE = () => {
	/* --- цвет --- */
	const parseColor = (value) => {
		if (!value) return null;
		const v = value.trim();
		if (v === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
		const m = v.match(/^rgba?\(([^)]+)\)$/);
		if (!m) return null;
		const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
		if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
		return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
	};
	const over = (fg, bg) => {
		const a = fg.a + bg.a * (1 - fg.a);
		if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
		return {
			r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
			g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
			b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
			a,
		};
	};
	const lum = (c) => {
		const ch = [c.r, c.g, c.b].map((raw) => {
			const s = raw / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
	};
	const ratio = (a, b) => {
		const l1 = lum(a);
		const l2 = lum(b);
		return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
	};

	const WHITE = { r: 255, g: 255, b: 255, a: 1 };

	/**
	 * Фактический фон под элементом: композит непрозрачных слоёв предков.
	 *
	 * ГРАДИЕНТ НЕ ЦВЕТ. Если у слоя есть background-image (в т.ч. linear-gradient),
	 * его backgroundColor обычно прозрачный, и наивный подъём по предкам взял бы
	 * фон РОДИТЕЛЯ — то есть посчитал бы контраст к цвету, которого на экране нет.
	 * Именно так кнопка «+ Запись» на градиенте дала ложное отношение 1.0 при
	 * читаемом виде. Такие узлы честнее не мерить, чем мерить неверно: возвращаем
	 * признак gradient, и находка уходит в отдельный список «нечем измерить».
	 */
	const effectiveBackground = (el) => {
		let stack = [];
		let node = el;
		let gradient = null;
		while (node && node.nodeType === 1) {
			const cs = getComputedStyle(node);
			const bg = parseColor(cs.backgroundColor);
			const opacity = Number(cs.opacity);
			const image = cs.backgroundImage;
			if (image && image !== "none" && (!bg || bg.a < 1)) {
				gradient = { on: node, image: image.slice(0, 90) };
				break;
			}
			if (bg && bg.a > 0) stack.push({ ...bg, a: bg.a * (Number.isFinite(opacity) ? opacity : 1) });
			if (bg && bg.a >= 1 && (!Number.isFinite(opacity) || opacity >= 1)) break;
			node = node.parentElement;
		}
		let result = WHITE;
		for (let i = stack.length - 1; i >= 0; i -= 1) result = over(stack[i], result);
		return { color: result, gradient };
	};

	const cssPath = (el) => {
		const parts = [];
		let node = el;
		for (let depth = 0; node && node.nodeType === 1 && depth < 4; depth += 1) {
			let piece = node.tagName.toLowerCase();
			if (node.id) piece += `#${node.id}`;
			const cls = String(node.className || "").trim().split(/\s+/).filter(Boolean).slice(0, 3);
			if (cls.length) piece += `.${cls.join(".")}`;
			parts.unshift(piece);
			node = node.parentElement;
		}
		return parts.join(" > ");
	};

	/** Кто задал свойство: селектор + файл из data-vite-dev-id. */
	const originOf = (el, property) => {
		const hits = [];
		for (const sheet of document.styleSheets) {
			let rules;
			try {
				rules = sheet.cssRules;
			} catch {
				continue;
			}
			const file =
				sheet.ownerNode?.getAttribute?.("data-vite-dev-id") ||
				sheet.href ||
				sheet.ownerNode?.id ||
				"(источник неизвестен)";
			const walk = (list, media) => {
				for (const rule of list) {
					if (rule.cssRules) {
						walk(rule.cssRules, rule.conditionText ? `@media ${rule.conditionText}` : media);
						continue;
					}
					if (!rule.selectorText || !rule.style) continue;
					if (!rule.style.getPropertyValue(property)) continue;
					let matches = false;
					try {
						matches = el.matches(rule.selectorText.replace(/::?(before|after|first-line|marker)/g, ""));
					} catch {
						matches = false;
					}
					if (!matches) continue;
					hits.push({
						file: String(file).split("?")[0],
						selector: rule.selectorText.slice(0, 120),
						value: rule.style.getPropertyValue(property).trim().slice(0, 80),
						media: media || "",
					});
				}
			};
			walk(rules, "");
		}
		return hits.slice(-3);
	};

	const visible = (el, rect) => {
		if (rect.width <= 0 || rect.height <= 0) return false;
		const cs = getComputedStyle(el);
		if (cs.display === "none" || cs.visibility !== "visible") return false;
		if (Number(cs.opacity) === 0) return false;
		return true;
	};

	const ownText = (el) => {
		let text = "";
		for (const node of el.childNodes) if (node.nodeType === 3) text += node.textContent;
		return text.replace(/\s+/g, " ").trim();
	};

	const all = [...document.querySelectorAll("body *")];

	/* --- 1 и 2: контраст текста и прозрачный текст --- */
	const contrast = [];
	const transparentText = [];
	const onGradient = [];
	for (const el of all) {
		const text = ownText(el);
		if (!text) continue;
		const rect = el.getBoundingClientRect();
		if (!visible(el, rect)) continue;
		if (rect.bottom < -200 || rect.top > window.innerHeight + 2000) continue;
		const cs = getComputedStyle(el);
		const fgRaw = parseColor(cs.color);
		if (!fgRaw) continue;
		const probe = effectiveBackground(el);
		if (probe.gradient) {
			onGradient.push({ path: cssPath(el), text: text.slice(0, 40), image: probe.gradient.image, fg: cs.color });
			continue;
		}
		const bg = probe.color;
		if (fgRaw.a === 0) {
			transparentText.push({
				path: cssPath(el),
				text: text.slice(0, 60),
				color: cs.color,
				origin: originOf(el, "color"),
			});
			continue;
		}
		const fg = over(fgRaw, bg);
		const size = Number.parseFloat(cs.fontSize);
		const weight = Number(cs.fontWeight) || 400;
		const large = size >= 24 || (size >= 18.66 && weight >= 700);
		const need = large ? 3 : 4.5;
		const r = ratio(fg, bg);
		if (r < need) {
			contrast.push({
				path: cssPath(el),
				text: text.slice(0, 60),
				ratio: Math.round(r * 100) / 100,
				need,
				fg: cs.color,
				bgComputed: cs.backgroundColor,
				bgEffective: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
				fontSize: size,
				fontWeight: weight,
				identical: Math.round(r * 100) / 100 <= 1.05,
				origin: originOf(el, "color"),
				originBg: originOf(el, "background-color"),
			});
		}
	}

	/* --- 3: переполнения --- */
	const docEl = document.documentElement;
	const pageOverflow = {
		scrollWidth: docEl.scrollWidth,
		clientWidth: docEl.clientWidth,
		bodyScrollWidth: document.body.scrollWidth,
		innerWidth: window.innerWidth,
	};
	const overflow = [];
	const outsideParent = [];
	for (const el of all) {
		const rect = el.getBoundingClientRect();
		if (!visible(el, rect)) continue;
		const cs = getComputedStyle(el);
		if (rect.right > window.innerWidth + 1 && cs.position !== "fixed") {
			let scrollable = false;
			let node = el.parentElement;
			while (node) {
				const pcs = getComputedStyle(node);
				if (pcs.overflowX === "auto" || pcs.overflowX === "scroll") {
					scrollable = true;
					break;
				}
				node = node.parentElement;
			}
			if (!scrollable) {
				overflow.push({
					path: cssPath(el),
					text: ownText(el).slice(0, 40),
					right: Math.round(rect.right),
					width: Math.round(rect.width),
					viewport: window.innerWidth,
					overBy: Math.round(rect.right - window.innerWidth),
				});
			}
		}
		const parent = el.parentElement;
		if (!parent || parent === document.body) continue;
		const pcs = getComputedStyle(parent);
		if (pcs.overflowX !== "visible" && pcs.overflowX !== "hidden") continue;
		if (pcs.display === "table" || pcs.display === "table-row") continue;
		const prect = parent.getBoundingClientRect();
		if (prect.width <= 0) continue;
		const spill = Math.round(rect.right - prect.right);
		if (spill > 8 && cs.position !== "absolute" && cs.position !== "fixed") {
			outsideParent.push({
				path: cssPath(el),
				parent: cssPath(parent),
				spill,
				childWidth: Math.round(rect.width),
				parentWidth: Math.round(prect.width),
				clipped: pcs.overflowX === "hidden",
				text: ownText(el).slice(0, 40),
			});
		}
	}

	/* --- 4: зоны нажатия --- */
	const CLICKABLE = 'button, a[href], [role="button"], [role="tab"], [role="switch"], summary, select, input:not([type="hidden"]), textarea, [tabindex]:not([tabindex="-1"])';
	const smallTargets = [];
	for (const el of document.querySelectorAll(CLICKABLE)) {
		const rect = el.getBoundingClientRect();
		if (!visible(el, rect)) continue;
		const cs = getComputedStyle(el);
		if (cs.pointerEvents === "none") continue;
		if (el.disabled) continue;
		const w = Math.round(rect.width * 10) / 10;
		const h = Math.round(rect.height * 10) / 10;
		if (w >= 32 && h >= 32) continue;
		smallTargets.push({
			path: cssPath(el),
			label: (el.getAttribute("aria-label") || el.title || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
			w,
			h,
			origin: [...originOf(el, "width"), ...originOf(el, "height"), ...originOf(el, "padding")].slice(0, 2),
		});
	}

	/* --- 5: плавающие элементы, реально закрывающие содержимое ---
	 *
	 * ПРОСТОЕ ПЕРЕСЕЧЕНИЕ ПРЯМОУГОЛЬНИКОВ ЗДЕСЬ НИЧЕГО НЕ ДОКАЗЫВАЕТ. Нижняя
	 * навигация закреплена внизу, и любой контент, до которого ещё не докрутили,
	 * закономерно оказывается под ней — это не авария, а прокрутка. Аварией
	 * является только то, что под панелью ОСТАЁТСЯ при любой допустимой прокрутке:
	 *   нужнаяПрокрутка = низЭлементаВДокументе - верхПанели
	 * если она больше максимальной, до элемента не добраться никогда.
	 */
	const scroller = document.scrollingElement || document.documentElement;
	const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
	const pageScroll = window.scrollY || scroller.scrollTop || 0;
	const floaters = [];
	for (const el of all) {
		const cs = getComputedStyle(el);
		if (cs.position !== "fixed" && cs.position !== "sticky") continue;
		const rect = el.getBoundingClientRect();
		if (!visible(el, rect)) continue;
		if (rect.width * rect.height < 400) continue;
		if (rect.width >= window.innerWidth * 0.9 && rect.top <= 1) continue; // верхняя панель — не плавашка
		const victims = [];
		for (const target of document.querySelectorAll("table, th, td, button, a[href], input, .panel, .data-table")) {
			if (el.contains(target) || target.contains(el)) continue;
			const t = target.getBoundingClientRect();
			if (!visible(target, t)) continue;
			const ox = Math.min(rect.right, t.right) - Math.max(rect.left, t.left);
			const oy = Math.min(rect.bottom, t.bottom) - Math.max(rect.top, t.top);
			if (ox <= 2 || oy <= 2) continue;
			const cx = Math.max(rect.left, t.left) + ox / 2;
			const cy = Math.max(rect.top, t.top) + oy / 2;
			if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
			const top = document.elementFromPoint(cx, cy);
			if (!top) continue;
			if (!(top === el || el.contains(top))) continue; // сверху не плавашка — не перекрытие
			/* Панель прибита к низу окна, значит «выше панели» = выше rect.top.
			   Для прибитой к верху панели цель наоборот должна уехать ниже rect.bottom. */
			const stuckToBottom = rect.bottom >= window.innerHeight - 2;
			const needScroll = stuckToBottom
				? pageScroll + t.bottom - rect.top // докрутить вниз, чтобы цель поднялась над панелью
				: pageScroll + t.top - rect.bottom; // прокрутить вверх, чтобы цель опустилась под панель
			const reachable = stuckToBottom ? needScroll <= maxScroll + 1 : needScroll >= -1;
			victims.push({
				victim: cssPath(target),
				victimText: (target.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
				coveredPx: Math.round(ox * oy),
				at: `${Math.round(cx)},${Math.round(cy)}`,
				stuckToBottom,
				needScroll: Math.round(needScroll),
				maxScroll: Math.round(maxScroll),
				pageScroll: Math.round(pageScroll),
				unreachable: !reachable,
			});
		}
		if (!victims.length) continue;
		floaters.push({
			path: cssPath(el),
			position: cs.position,
			zIndex: cs.zIndex,
			unreachableCount: victims.filter((v) => v.unreachable).length,
			rect: {
				l: Math.round(rect.left),
				t: Math.round(rect.top),
				w: Math.round(rect.width),
				h: Math.round(rect.height),
			},
			victims: victims.sort((a, b) => Number(b.unreachable) - Number(a.unreachable) || b.coveredPx - a.coveredPx).slice(0, 6),
			origin: originOf(el, "position"),
		});
	}

	/* --- тема, как она фактически применена --- */
	const rootCs = getComputedStyle(docEl);
	const themeProbe = {
		dataTheme: docEl.dataset.theme || "",
		className: docEl.className,
		storeMode: window.__useThemeStore ? window.__useThemeStore.getState().themeMode : null,
		bodyBg: getComputedStyle(document.body).backgroundColor,
		surface: rootCs.getPropertyValue("--surface").trim(),
		bg: rootCs.getPropertyValue("--bg").trim(),
		text: rootCs.getPropertyValue("--text").trim(),
	};

	return {
		themeProbe,
		nodes: all.length,
		contrast: contrast.sort((a, b) => a.ratio - b.ratio).slice(0, 45),
		contrastCount: contrast.length,
		onGradientCount: onGradient.length,
		onGradient: onGradient.slice(0, 10),
		transparentText: transparentText.slice(0, 15),
		pageOverflow,
		overflow: overflow.sort((a, b) => b.overBy - a.overBy).slice(0, 20),
		overflowCount: overflow.length,
		outsideParent: outsideParent.sort((a, b) => b.spill - a.spill).slice(0, 20),
		outsideParentCount: outsideParent.length,
		smallTargets: smallTargets.sort((a, b) => a.w * a.h - b.w * b.h).slice(0, 25),
		smallTargetsCount: smallTargets.length,
		floaters,
	};
};

/* ------------------------------------------------------------------ */

await mkdir(OUT, { recursive: true });

const probe = await fetch(WEB).catch((error) => {
	throw new Error(`Веб-сервер ${WEB} недоступен: ${error.message}`);
});
if (!probe.ok) throw new Error(`Веб-сервер ${WEB} ответил ${probe.status}`);

const browser = await puppeteer.launch({
	headless: true,
	executablePath: BROWSER_PATH,
	protocolTimeout: 180000,
	args: ["--disable-gpu", "--disable-dev-shm-usage", "--no-first-run"],
});
console.log(`браузер: ${BROWSER_PATH}`);
const page = await browser.newPage();
page.on("pageerror", (error) => console.error(`[ошибка страницы] ${String(error).slice(0, 200)}`));

await page.setViewport({ width: 1600, height: 1000 });
await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded" });
await sleep(2500);

const session = await page.evaluate(
	async ([email, password]) => {
		const response = await fetch("/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});
		const body = await response.json().catch(() => null);
		if (!response.ok || !body?.clinicToken || !body?.staffToken) {
			return { ok: false, status: response.status, reason: body?.error || body?.message || "в ответе нет токенов" };
		}
		localStorage.setItem("dente_clinic_token", body.clinicToken);
		localStorage.setItem("dente_staff_token", body.staffToken);
		if (body.user?.organizationId) localStorage.setItem("dente_clinic_tenant_id", body.user.organizationId);
		localStorage.setItem("dente_workspace_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem(
			"dental-crm:onboarding:v1",
			JSON.stringify({ version: 1, dismissed: true, savedAt: new Date().toISOString() }),
		);
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				selectedWorkspaceRole: "owner",
				onboardingDismissed: true,
				onboardingDismissedAt: new Date().toISOString(),
				onboardingDraftMode: false,
				savedAt: new Date().toISOString(),
			}),
		);
		localStorage.setItem(
			"dente_onboarding_dismissed_v1",
			JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }),
		);
		return { ok: true, status: response.status, organization: body.user?.organizationId || null };
	},
	[EMAIL, PASSWORD],
);
if (!session?.ok) {
	await browser.close();
	throw new Error(`Вход под ${EMAIL} не удался (${session?.status}: ${session?.reason}). Мерить нечего.`);
}
console.log(`вход выполнен, организация ${session.organization ?? "не сообщена"}`);

await page.reload({ waitUntil: "domcontentloaded" });
await sleep(3000);

// Гасим экран PIN, если он есть.
await page.evaluate(() => {
	const pad = document.querySelector(".staff-pin-pad, .pin-lock-screen");
	if (!pad) return false;
	const card = document.querySelector(".staff-card, .staff-member-item");
	if (card) card.click();
	const zero = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "0");
	if (zero) for (let i = 0; i < 4; i += 1) zero.click();
	return true;
});
await sleep(1500);

/**
 * Любой замер идёт через это. Пока в дереве правят файлы, Vite перезагружает
 * страницу и рвёт контекст исполнения посреди вызова: без повтора прогон падает
 * не на дефекте приложения, а на чужом сохранении файла.
 */
async function ev(fn, arg) {
	let lastError = null;
	for (let attempt = 0; attempt < 6; attempt += 1) {
		try {
			return await page.evaluate(fn, arg);
		} catch (error) {
			lastError = error;
			const message = String(error?.message || error);
			const transient =
				message.includes("Execution context was destroyed") ||
				message.includes("Target closed") ||
				message.includes("detached") ||
				message.includes("Cannot find context");
			if (!transient) throw error;
			console.log(`  (страница перезагрузилась — повтор замера #${attempt + 1})`);
			await sleep(2500);
		}
	}
	throw lastError;
}

async function setTheme(theme) {
	const applied = await ev((mode) => {
		const store = window.__useThemeStore;
		if (!store) return false;
		store.getState().setThemeMode(mode);
		return true;
	}, theme);
	if (!applied) throw new Error("window.__useThemeStore недоступен: приложение не загрузилось");
	for (let attempt = 0; attempt < 60; attempt += 1) {
		const state = await ev(() => ({
			dataTheme: document.documentElement.dataset.theme || "",
			mode: window.__useThemeStore?.getState().themeMode ?? null,
		}));
		if (state.dataTheme === theme && state.mode === theme) return state;
		await sleep(200);
	}
	throw new Error(`Тема «${theme}» не применилась`);
}

/**
 * В дереве параллельно правят файлы, поэтому Vite в любой момент перезагружает
 * страницу и рвёт контекст. Замер, сделанный после такой перезагрузки на экране
 * PIN, дал бы нули по всем пяти меркам и читался бы как «дефектов нет» — то есть
 * ровно подложное доказательство. Поэтому перезагрузка распознаётся и гасится.
 */
async function recoverIfReloaded() {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			const state = await ev(() => ({
				pin: Boolean(document.querySelector(".staff-pin-pad, .pin-lock-screen")),
				login: document.body.textContent?.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ") || false,
				workspace: Boolean(document.querySelector(".shift-hero, .panel, .section-card, aside.sidebar")),
			}));
			if (state.workspace && !state.pin && !state.login) return true;
			if (state.pin) {
				await ev(() => {
					const card = document.querySelector(".staff-card, .staff-member-item");
					if (card) card.click();
					const zero = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "0");
					if (zero) for (let i = 0; i < 4; i += 1) zero.click();
				});
				await sleep(1500);
				continue;
			}
			await sleep(1500);
		} catch {
			// контекст ещё разрушен — дождаться новой страницы
			await sleep(2000);
		}
	}
	return false;
}

async function nav(view) {
	const selector = VIEW_CONTAINERS[view];
	await ev(
		([v, sel]) => {
			const link = document.querySelector(sel);
			if (link) {
				link.click();
				return true;
			}
			window.location.hash = `#${v}`;
			window.dispatchEvent(new HashChangeEvent("hashchange"));
			return false;
		},
		[view, `aside.sidebar nav a[href="#${view}"], .dnt-bottom-nav a[href="#${view}"]`],
	);
	for (let attempt = 0; attempt < 40; attempt += 1) {
		const ready = await ev((sel) => {
			const node = document.querySelector(sel);
			if (!node) return false;
			return !node.matches('[aria-busy="true"]');
		}, selector);
		if (ready) {
			await sleep(700);
			return true;
		}
		await sleep(250);
	}
	return false;
}

const OUT_JSON = path.join(OUT, process.env.RECON_JSON || "measurements.json");
const report = [];
/** Ведомость пишется после каждой темы: прогон обрывается перезагрузкой, и замеры не должны пропадать. */
const flush = () => writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");

for (const viewport of VIEWPORTS) {
	await page.setViewport({ width: viewport.width, height: viewport.height });
	await sleep(400);
	for (const theme of THEMES) {
		await recoverIfReloaded();
		const applied = await setTheme(theme);
		console.log(`\n### ${viewport.label} / тема ${theme} (data-theme «${applied.dataTheme}»)`);
		for (const view of VIEWS) {
			let opened = await nav(view);
			if (!opened) {
				// Может быть и перезагрузка, и настоящий дефект раздела. Различаем.
				await recoverIfReloaded();
				await setTheme(theme);
				opened = await nav(view);
			}
			let measured = await ev(MEASURE);
			/* Тема сверяется по факту, а не по тому, что просили: после перезагрузки
			   Vite атрибут на <html> пропадает, и замер лёг бы под чужой темой. Одна
			   попытка исправить, дальше — падение, а не подложные цифры. */
			if (measured.themeProbe.dataTheme !== theme) {
				console.log(`  (тема сбилась на «${measured.themeProbe.dataTheme}» — восстанавливаю и мерю заново)`);
				await recoverIfReloaded();
				await setTheme(theme);
				await nav(view);
				measured = await ev(MEASURE);
			}
			if (measured.themeProbe.dataTheme !== theme) {
				throw new Error(
					`${view}: замер сделан в теме «${measured.themeProbe.dataTheme}», а заявлена «${theme}» — цифры были бы подложными`,
				);
			}
			const file = `${viewport.label}_${theme}_${view}.png`;
			let shotOk = false;
			for (let attempt = 0; attempt < 2 && !shotOk; attempt += 1) {
				try {
					await page.screenshot({ path: path.join(OUT, file) });
					shotOk = true;
				} catch (error) {
					// Машина общая: снимок может не успеть. Замеры важнее кадра, но кадр
					// без пометки «не снят» превратился бы во вчерашний файл под свежим именем.
					console.log(`  (снимок ${file} не сделан: ${String(error?.message).slice(0, 60)})`);
					await sleep(2000);
				}
			}
			report.push({ viewport: viewport.label, theme, view, opened, file, shotOk, ...measured });
			console.log(
				`  ${view.padEnd(15)} открыт:${opened ? "да " : "НЕТ"} узлов:${String(measured.nodes).padStart(4)} контраст<норма:${String(measured.contrastCount).padStart(4)} прозрачныйТекст:${measured.transparentText.length} перелив:${measured.overflowCount} заРодителя:${measured.outsideParentCount} мелкихКнопок:${String(measured.smallTargetsCount).padStart(3)} плавашек:${measured.floaters.length} scrollW:${measured.pageOverflow.scrollWidth}/${measured.pageOverflow.clientWidth}`,
			);
		}
		await flush();
	}
}

await flush();
console.log(`\nЗамеры: ${path.join(OUT, "measurements.json")}`);
console.log(`Снимки: ${OUT}`);
await browser.close();
