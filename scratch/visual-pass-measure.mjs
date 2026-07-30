/**
 * ЗАМЕР ДЛЯ ПАКЕТА ПРАВОК ВЁРСТКИ И ТОКЕНОВ (read-only, приложение не правит).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ИЗМЕРИТЕЛЬ, А НЕ scratch/recon-visual-measure.mjs
 * Тот мерит ширину окна и ничего не знает о характере указателя. Правка зон
 * нажатия переводит touch-targets.css с порога ширины на `(pointer: coarse)`,
 * а headless Chrome по умолчанию сообщает `pointer: fine` — то есть прежним
 * измерителем эту правку доказать НЕЛЬЗЯ в принципе: он померил бы «до» и
 * «после» одинаково и это выглядело бы как «правка не работает».
 * Здесь характер указателя задаётся явно через emulateMediaFeatures, и профиль
 * планшета включает touch.
 *
 * Что считает:
 *   1) зоны нажатия меньше 32px (видимые, не disabled) — список и число;
 *   2) контраст по СПИСКУ НАБЛЮДЕНИЯ: конкретные селекторы, к которым относятся
 *      правки, с композитом фона по цепочке предков (градиент честно
 *      помечается «нечем измерить», а не даёт ложное 1.0);
 *   3) фактическую тему после каждого замера — расхождение обрывает прогон,
 *      иначе цифры были бы подложными.
 *
 * Запуск (порознь до и после правок, В РАЗНЫЕ ПАПКИ, иначе «до» затрётся):
 *   VP_OUT=artifacts/visual-pass-before node scratch/visual-pass-measure.mjs
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const BROWSER_PATH =
	process.env.RECON_BROWSER ||
	[
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	].find((candidate) => existsSync(candidate));
if (!BROWSER_PATH) throw new Error("Браузер не найден: задайте RECON_BROWSER");

const WEB = process.env.DENTE_SHOT_WEB_URL || "http://127.0.0.1:5173";
const OUT = process.env.VP_OUT || "C:/Clinic_MVP/dental-crm/artifacts/visual-pass";
const EMAIL = process.env.DENTE_SHOT_EMAIL || "doctor@clinic.com";
const PASSWORD = process.env.DENTE_SHOT_PASSWORD || "password";

/**
 * Профили. Планшет — это НЕ «узкое окно»: iPad в портрете 768, iPad 10 — 810,
 * iPad Air — 820, в ландшафте 1024 и больше. Поэтому оба планшетных профиля
 * шире прежнего порога 700px, и оба с грубым указателем.
 */
const PROFILES = [
	{ label: "tablet768", width: 768, height: 1024, pointer: "coarse", touch: true },
	{ label: "tablet1024", width: 1024, height: 768, pointer: "coarse", touch: true },
	{ label: "desktop1600", width: 1600, height: 1000, pointer: "fine", touch: false },
];

const VIEW_CONTAINERS = {
	shift: "#shift, .shift-hero",
	schedule: "#schedule, .schedule-panel",
	patients: "#patients, .patients-panel",
	visit: "#visit, .visit-panel",
	documents: "#documents, .documents-panel",
	finance: "#finance, .finance-panel",
	communications: "#communications, .communications-panel",
	settings: "#settings, .settings-zone",
};

/** Селекторы, к которым относятся правки этого пакета. */
const WATCH = [
	".ops-empty",
	".ops-empty p",
	".ops-row",
	".ops-row p",
	".specialty-strip button",
	".specialty-strip button.active",
	".mode-card",
	".mode-card span",
	".role-picker button",
	".settings-advanced-toggle",
	".settings-advanced-label",
	".field-note",
	".settings-tabs button",
	".quick-chip--sm",
	".dnt-bottom-nav",
];

/**
 * VP_WATCH — заменить список наблюдения целиком (через `;`, потому что в
 * селекторах бывает запятая).
 * VP_SCROLL_TO — прокрутить этот селектор в вид перед снимком. Без него кадр
 * показывает только первый экран, и узел ниже сгиба в кадр не попадает —
 * выдавать такой кадр за доказательство правки нельзя.
 */
const WATCH_OVERRIDE = process.env.VP_WATCH ? process.env.VP_WATCH.split(";").map((s) => s.trim()).filter(Boolean) : null;
const SCROLL_TO = process.env.VP_SCROLL_TO || "";
const PROFILE_FILTER = process.env.VP_PROFILES ? process.env.VP_PROFILES.split(",") : null;
const VIEWS = process.env.VP_VIEWS ? process.env.VP_VIEWS.split(",") : ["finance", "communications", "settings", "patients"];
const THEMES = process.env.VP_THEMES ? process.env.VP_THEMES.split(",") : ["light", "dark", "night"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Выражение, исполняемое В СТРАНИЦЕ.
 * ------------------------------------------------------------------ */
const MEASURE = (watchList) => {
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

	/* Градиент не цвет: у слоя с background-image backgroundColor обычно
	   прозрачный, и наивный подъём по предкам вернул бы цвет, которого на экране
	   нет. Такой узел честнее не мерить. */
	const effectiveBackground = (el) => {
		const stack = [];
		let node = el;
		let gradient = null;
		while (node && node.nodeType === 1) {
			const cs = getComputedStyle(node);
			const bg = parseColor(cs.backgroundColor);
			const opacity = Number(cs.opacity);
			const image = cs.backgroundImage;
			if (image && image !== "none" && (!bg || bg.a < 1)) {
				gradient = image.slice(0, 70);
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
	const rgbText = (c) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;

	/* --- 1. Зоны нажатия --- */
	const CLICKABLE =
		'button, a[href], [role="button"], [role="tab"], [role="switch"], summary, select, input:not([type="hidden"]), textarea, [tabindex]:not([tabindex="-1"])';
	const small = [];
	for (const el of document.querySelectorAll(CLICKABLE)) {
		const rect = el.getBoundingClientRect();
		if (!visible(el, rect)) continue;
		if (getComputedStyle(el).pointerEvents === "none") continue;
		if (el.disabled) continue;
		const w = Math.round(rect.width * 10) / 10;
		const h = Math.round(rect.height * 10) / 10;
		if (w >= 32 && h >= 32) continue;
		small.push({
			tag: el.tagName.toLowerCase(),
			cls: String(el.className || "").trim().slice(0, 60),
			id: el.id || "",
			label: (el.getAttribute("aria-label") || el.title || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 34),
			w,
			h,
		});
	}

	/* --- 2. Контраст по списку наблюдения --- */
	const watch = {};
	for (const selector of watchList) {
		let nodes = [];
		try {
			nodes = [...document.querySelectorAll(selector)];
		} catch {
			watch[selector] = { error: "селектор не разобран" };
			continue;
		}
		const rows = [];
		for (const el of nodes) {
			const rect = el.getBoundingClientRect();
			if (!visible(el, rect)) continue;
			const cs = getComputedStyle(el);
			const probe = effectiveBackground(el);
			const fgRaw = parseColor(cs.color);
			const size = Number.parseFloat(cs.fontSize);
			const weight = Number(cs.fontWeight) || 400;
			const large = size >= 24 || (size >= 18.66 && weight >= 700);
			const row = {
				text: (ownText(el) || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 44),
				w: Math.round(rect.width * 10) / 10,
				h: Math.round(rect.height * 10) / 10,
				fg: cs.color,
				bgOwn: cs.backgroundColor,
				fontSize: size,
				need: large ? 3 : 4.5,
			};
			if (probe.gradient) {
				row.gradient = probe.gradient;
			} else {
				row.bgEffective = rgbText(probe.color);
				if (fgRaw && ownText(el)) {
					row.ratio = Math.round(ratio(over(fgRaw, probe.color), probe.color) * 100) / 100;
					row.pass = row.ratio >= row.need;
				}
			}
			rows.push(row);
		}
		watch[selector] = { found: nodes.length, visible: rows.length, rows: rows.slice(0, 6) };
	}

	const docEl = document.documentElement;
	return {
		nodes: document.querySelectorAll("body *").length,
		theme: docEl.dataset.theme || "",
		mediaCoarse: window.matchMedia("(pointer: coarse)").matches,
		mediaUnder700: window.matchMedia("(max-width: 700px)").matches,
		smallCount: small.length,
		small: small.sort((a, b) => a.w * a.h - b.w * b.h).slice(0, 30),
		watch,
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
page.on("pageerror", (error) => console.error(`[ошибка страницы] ${String(error).slice(0, 160)}`));

/**
 * Характер указателя задаётся ЧЕРЕЗ CDP, а не через page.emulateMediaFeatures:
 * обёртка puppeteer пропускает только prefers-color-scheme,
 * prefers-reduced-motion и color-gamut (EmulationManager.js:404) и на «pointer»
 * падает с «Unsupported media feature». Emulation.setEmulatedMedia такого
 * ограничения не имеет. Факт применения проверяется в самом замере полем
 * mediaCoarse — если бы эмуляция не сработала, там было бы «нет», и вывод про
 * планшет был бы подложным.
 */
const cdp = await page.createCDPSession();
async function emulatePointer(pointer) {
	await cdp.send("Emulation.setEmulatedMedia", {
		media: "screen",
		features: [
			{ name: "pointer", value: pointer },
			{ name: "any-pointer", value: pointer },
			{ name: "hover", value: pointer === "coarse" ? "none" : "hover" },
			{ name: "any-hover", value: pointer === "coarse" ? "none" : "hover" },
		],
	});
}

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
		localStorage.setItem("dente_onboarding_dismissed_v1", JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
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

/** Гасит экран PIN, если после перезагрузки он всплыл. */
async function dismissPin() {
	await ev(() => {
		const pad = document.querySelector(".staff-pin-pad, .pin-lock-screen");
		if (!pad) return false;
		const card = document.querySelector(".staff-card, .staff-member-item");
		if (card) card.click();
		const zero = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "0");
		if (zero) for (let i = 0; i < 4; i += 1) zero.click();
		return true;
	});
	await sleep(1200);
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

/**
 * Часть наблюдаемых узлов живёт во вкладках настроек. Без перехода по вкладкам
 * замер сказал бы «селектор не найден» и это читалось бы как «дефекта нет» —
 * то есть ровно подложный вывод. Поэтому вкладки перебираются, пока узел не
 * появится, и в ведомость пишется, на какой вкладке он найден.
 */
async function openSettingsTabWith(selector) {
	const already = await ev((sel) => Boolean(document.querySelector(sel)), selector);
	if (already) return "(вкладка по умолчанию)";
	const count = await ev(() => document.querySelectorAll(".settings-tabs button").length);
	for (let index = 0; index < Math.min(count, 14); index += 1) {
		const label = await ev((i) => {
			const buttons = [...document.querySelectorAll(".settings-tabs button")];
			const button = buttons[i];
			if (!button) return null;
			button.click();
			return button.textContent.replace(/\s+/g, " ").trim().slice(0, 30);
		}, index);
		if (label === null) break;
		await sleep(900);
		const found = await ev((sel) => Boolean(document.querySelector(sel)), selector);
		if (found) return label;
	}
	return null;
}

const OUT_JSON = path.join(OUT, process.env.VP_JSON || "measurements.json");
const report = [];
const flush = () => writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");

for (const profile of PROFILES) {
	if (PROFILE_FILTER && !PROFILE_FILTER.includes(profile.label)) continue;
	await page.setViewport({ width: profile.width, height: profile.height, hasTouch: profile.touch, isMobile: profile.touch });
	await emulatePointer(profile.pointer);
	await sleep(500);
	for (const theme of THEMES) {
		await dismissPin();
		await setTheme(theme);
		console.log(`\n### ${profile.label} (${profile.width}x${profile.height}, pointer ${profile.pointer}) / тема ${theme}`);
		for (const view of VIEWS) {
			let opened = await nav(view);
			if (!opened) {
				await dismissPin();
				await setTheme(theme);
				opened = await nav(view);
			}
			let tabNote = "";
			if (view === "settings") {
				const tab = await openSettingsTabWith(".specialty-strip button");
				tabNote = tab === null ? "specialty-strip НЕ НАЙДЕН ни на одной вкладке" : `specialty-strip на вкладке «${tab}»`;
			}
			if (SCROLL_TO) {
				const scrolled = await ev((sel) => {
					const node = document.querySelector(sel);
					if (!node) return false;
					node.scrollIntoView({ block: "center", behavior: "instant" });
					return true;
				}, SCROLL_TO);
				if (!scrolled) console.log(`  (${SCROLL_TO} не найден — кадр без прокрутки)`);
				await sleep(600);
			}
			let measured = await ev(MEASURE, WATCH_OVERRIDE || WATCH);
			if (measured.theme !== theme) {
				await dismissPin();
				await setTheme(theme);
				await nav(view);
				measured = await ev(MEASURE, WATCH_OVERRIDE || WATCH);
			}
			if (measured.theme !== theme) {
				throw new Error(`${view}: замер в теме «${measured.theme}», заявлена «${theme}» — цифры были бы подложными`);
			}
			measured = { ...measured, watchList: WATCH_OVERRIDE || WATCH, scrollTo: SCROLL_TO };
			const file = `${profile.label}_${theme}_${view}.png`;
			let shotOk = false;
			for (let attempt = 0; attempt < 2 && !shotOk; attempt += 1) {
				try {
					await page.screenshot({ path: path.join(OUT, file) });
					shotOk = true;
				} catch (error) {
					console.log(`  (снимок ${file} не сделан: ${String(error?.message).slice(0, 60)})`);
					await sleep(2000);
				}
			}
			report.push({ profile: profile.label, width: profile.width, pointer: profile.pointer, theme, view, opened, tabNote, file, shotOk, ...measured });
			const watchSummary = Object.entries(measured.watch)
				.filter(([, value]) => value.visible > 0 && value.rows.some((r) => r.ratio !== undefined))
				.map(([selector, value]) => {
					const worst = value.rows.filter((r) => r.ratio !== undefined).sort((a, b) => a.ratio - b.ratio)[0];
					return `${selector}=${worst.ratio}${worst.pass ? "" : "!"}`;
				})
				.join(" ");
			console.log(
				`  ${view.padEnd(15)} открыт:${opened ? "да " : "НЕТ"} узлов:${String(measured.nodes).padStart(4)} coarse:${measured.mediaCoarse ? "да" : "нет"} мелкихЗон:${String(measured.smallCount).padStart(3)} ${tabNote}`,
			);
			if (watchSummary) console.log(`      ${watchSummary}`);
		}
		await flush();
	}
}

await flush();
console.log(`\nЗамеры: ${OUT_JSON}`);
console.log(`Снимки: ${OUT}`);
await browser.close();
