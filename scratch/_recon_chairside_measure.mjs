/**
 * ИЗМЕРИТЕЛЬ «ПЛАНШЕТ У КРЕСЛА» (read-only: ничего в приложении не правит).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ. scripts/detect-overflows.mjs ходит по адресам вида
 * "#/dashboard", а приложение маршрутизирует по "#schedule" (workspaceShell.tsx:54),
 * и подставляет токены "audit-bypass" — то есть меряет экран входа. Порог там
 * тоже не тот: 375px это телефон, а у кресла планшет 768-820.
 *
 * Считает по факту, через getBoundingClientRect и getComputedStyle:
 *   1) зоны нажатия меньше 44px (палец в перчатке);
 *   2) горизонтальные переполнения окна и выход детей за родителя;
 *   3) таблицы, которые на узком экране остались таблицами (проверка через
 *      фактический display строки и ::before у ячейки, а не по наличию правила);
 *   4) прибитые к экрану элементы и то, что реально лежит под ними
 *      (elementsFromPoint, а не пересечение прямоугольников).
 *
 * Указатель огрубляется через CDP Emulation.setEmulatedMedia, и результат
 * matchMedia('(pointer: coarse)') печатается: без этого нельзя утверждать, что
 * правила touch-targets.css вообще были включены.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const ROOT = "C:/Clinic_MVP/dental-crm";
const OUT = process.env.RECON_OUT || path.join(ROOT, "artifacts/recon-chairside");
const TOKENS = path.join(ROOT, ".ops-shot-tokens.json");

if (!existsSync(TOKENS)) throw new Error(`Нет ${TOKENS}: сначала seedOpsScreenshotDemo.ts`);
const { clinicToken, staffToken } = JSON.parse(readFileSync(TOKENS, "utf8"));

const VIEWS = (process.env.RECON_VIEWS || "shift,schedule,visit,patients,imaging,finance").split(",");

/** Планшет в портрете. 810 — iPad 10; 1600 — настольный для сравнения. */
const PROFILES = [
	{ label: "tablet810", width: 810, height: 1150, coarse: true },
	{ label: "desktop1600", width: 1600, height: 1000, coarse: false },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Измерение целиком исполняется В СТРАНИЦЕ.
 * ------------------------------------------------------------------ */
const MEASURE = () => {
	const vw = window.innerWidth;
	const vh = window.innerHeight;

	const cs = (el) => getComputedStyle(el);
	const visible = (el) => {
		const s = cs(el);
		if (s.display === "none" || s.visibility === "hidden") return false;
		if (Number(s.opacity) === 0) return false;
		const r = el.getBoundingClientRect();
		return r.width > 0.5 && r.height > 0.5;
	};
	/** В пределах экрана по вертикали хотя бы частично — иначе это ещё не показанное. */
	const onScreen = (r) => r.bottom > -50 && r.top < vh + 4000 && r.right > -50;

	const label = (el) =>
		(
			el.getAttribute("aria-label") ||
			el.getAttribute("title") ||
			el.getAttribute("placeholder") ||
			(el.textContent || "").trim()
		)
			.replace(/\s+/g, " ")
			.slice(0, 48);

	const sig = (el) => {
		const clsList = String(el.className || "").trim().split(/\s+/).filter(Boolean);
		const cls = clsList.slice(0, 2).join(".");
		const t = el.tagName.toLowerCase();
		const type = t === "input" ? `[${el.type}]` : "";
		return cls ? `${t}${type}.${cls}` : `${t}${type}`;
	};

	const pathOf = (el) => {
		const parts = [];
		let n = el;
		for (let d = 0; n && n.nodeType === 1 && d < 4; d += 1) {
			let p = n.tagName.toLowerCase();
			if (n.id) p += `#${n.id}`;
			const c = String(n.className || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
			if (c.length) p += `.${c.join(".")}`;
			parts.unshift(p);
			n = n.parentElement;
		}
		return parts.join(" > ");
	};

	/* --- 1. Зоны нажатия --- */
	const TOUCH_SELECTOR = [
		"button",
		"a[href]",
		'input:not([type="hidden"])',
		"select",
		"textarea",
		"summary",
		'[role="button"]',
		'[role="tab"]',
		'[role="switch"]',
		'[role="checkbox"]',
		'[tabindex]:not([tabindex="-1"])',
	].join(",");

	const small = new Map();
	let controlsSeen = 0;
	for (const el of document.querySelectorAll(TOUCH_SELECTOR)) {
		if (el.disabled) continue;
		if (el.getAttribute("aria-hidden") === "true") continue;
		if (!visible(el)) continue;
		const r = el.getBoundingClientRect();
		if (!onScreen(r)) continue;
		controlsSeen += 1;
		const w = Math.round(r.width * 10) / 10;
		const h = Math.round(r.height * 10) / 10;
		if (Math.min(w, h) >= 44) continue;
		/* Отметка/переключатель внутри подписи: зона нажатия — подпись.
		   Считаем её, а не квадратик, иначе обвинение ложное. */
		let effW = w;
		let effH = h;
		let via = "";
		const lab = el.closest("label");
		if (lab && lab !== el && visible(lab)) {
			const lr = lab.getBoundingClientRect();
			if (lr.height >= h) {
				effW = Math.round(lr.width * 10) / 10;
				effH = Math.round(lr.height * 10) / 10;
				via = "label";
			}
		}
		if (Math.min(effW, effH) >= 44) continue;
		const key = sig(el);
		const prev = small.get(key);
		if (prev) {
			prev.count += 1;
			if (effW * effH < prev.w * prev.h) {
				prev.w = effW;
				prev.h = effH;
			}
			if (prev.samples.length < 3 && label(el)) prev.samples.push(label(el));
		} else {
			small.set(key, {
				sig: key,
				w: effW,
				h: effH,
				count: 1,
				via,
				minHeightCss: cs(el).minHeight,
				path: pathOf(el),
				samples: label(el) ? [label(el)] : [],
			});
		}
	}

	/* --- 2. Переполнения --- */
	const root = document.documentElement;
	const docOverflow = Math.max(0, root.scrollWidth - vw);
	const scrollsX = (el) => {
		const o = cs(el).overflowX;
		return o === "auto" || o === "scroll";
	};
	const escapes = new Map();
	for (const el of document.querySelectorAll("body *")) {
		if (!visible(el)) continue;
		const r = el.getBoundingClientRect();
		if (!onScreen(r)) continue;
		if (r.width < 8 || r.height < 8) continue;
		let why = null;
		/* За правый край окна, и ни один предок не прокручивается по горизонтали. */
		if (r.right > vw + 1) {
			let anc = el.parentElement;
			let clipped = false;
			while (anc && anc !== document.body) {
				if (scrollsX(anc) || cs(anc).overflowX === "hidden") {
					clipped = true;
					break;
				}
				anc = anc.parentElement;
			}
			if (!clipped && !scrollsX(el)) why = `за окно на ${Math.round(r.right - vw)}px`;
		}
		/* За родителя, у которого не задана прокрутка и не задано clip. */
		if (!why) {
			const p = el.parentElement;
			if (p && p !== document.body) {
				const ps = cs(p);
				const pr = p.getBoundingClientRect();
				if (
					ps.overflowX === "visible" &&
					ps.overflowY === "visible" &&
					ps.position !== "relative" &&
					cs(el).position !== "absolute" &&
					cs(el).position !== "fixed" &&
					pr.width > 8 &&
					r.right > pr.right + 2
				) {
					why = `за родителя ${sig(p)} на ${Math.round(r.right - pr.right)}px`;
				}
			}
		}
		if (!why) continue;
		const key = sig(el) + " | " + why.replace(/\d+/g, "N");
		const prev = escapes.get(key);
		if (prev) prev.count += 1;
		else
			escapes.set(key, {
				sig: sig(el),
				why,
				width: Math.round(r.width),
				count: 1,
				path: pathOf(el),
			});
	}

	/* --- 3. Таблицы: остались ли таблицами --- */
	const tables = [];
	for (const table of document.querySelectorAll("table")) {
		if (!visible(table)) continue;
		const r = table.getBoundingClientRect();
		const firstRow = table.querySelector("tbody tr") || table.querySelector("tr");
		const firstCell = table.querySelector("tbody td") || table.querySelector("td");
		const rowDisplay = firstRow ? cs(firstRow).display : "(нет строк)";
		const before = firstCell ? cs(firstCell, "::before").content : "(нет ячеек)";
		const hasDataLabel = firstCell ? firstCell.hasAttribute("data-label") : false;
		/* Карточный режим — это фактический display строки, а не наличие правила. */
		const cardMode = rowDisplay !== "table-row" || (before && before !== "none" && before !== "normal");
		/* Нужна ли горизонтальная прокрутка: ширина содержимого против видимой области. */
		const holder = table.closest("[class]") || table.parentElement;
		const holderW = holder ? Math.round(holder.getBoundingClientRect().width) : -1;
		tables.push({
			path: pathOf(table),
			cols: table.querySelectorAll("thead th").length || (firstRow ? firstRow.children.length : 0),
			rows: table.querySelectorAll("tbody tr").length,
			rowDisplay,
			cellBefore: String(before).slice(0, 40),
			hasDataLabel,
			cardMode,
			tableW: Math.round(r.width),
			scrollW: table.scrollWidth,
			holderW,
			overflowsViewport: r.right > vw + 1 || table.scrollWidth > Math.max(holderW, 1) + 2,
			holderScrollsX: holder ? scrollsX(holder) : false,
		});
	}

	/* --- 4. Прибитые элементы и что под ними --- */
	const floaters = [];
	for (const el of document.querySelectorAll("body *")) {
		const s = cs(el);
		if (s.position !== "fixed" && s.position !== "sticky") continue;
		if (!visible(el)) continue;
		const r = el.getBoundingClientRect();
		if (r.width * r.height < 300) continue;
		if (r.width >= vw - 2 && r.top <= 1 && r.height < 90) {
			/* Полноширинная шапка/навигация: это раскладка, а не плавающий угол. */
		}
		const covered = [];
		const pts = [
			[r.left + r.width * 0.5, r.top + r.height * 0.5],
			[r.left + 6, r.top + 6],
			[r.right - 6, r.top + 6],
			[r.left + 6, r.bottom - 6],
			[r.right - 6, r.bottom - 6],
		];
		for (const [x, y] of pts) {
			if (x < 0 || y < 0 || x > vw || y > vh) continue;
			const stack = document.elementsFromPoint(x, y);
			const topIdx = stack.findIndex((n) => n === el || el.contains(n));
			if (topIdx < 0) continue; /* сюда он не попадает: не перекрывает */
			if (topIdx > 0) continue; /* сам под кем-то: не он перекрывает */
			for (const under of stack.slice(1)) {
				if (el.contains(under) || under.contains(el)) continue;
				const t = under.tagName.toLowerCase();
				const interactive =
					t === "button" ||
					t === "a" ||
					t === "input" ||
					t === "select" ||
					t === "textarea" ||
					t === "summary" ||
					under.getAttribute("role") === "button" ||
					under.getAttribute("role") === "tab";
				const cell = t === "td" || t === "th";
				if (!interactive && !cell) continue;
				if (!visible(under)) continue;
				const entry = `${sig(under)}${label(under) ? ` «${label(under)}»` : ""}`;
				if (!covered.includes(entry)) covered.push(entry);
				break;
			}
		}
		floaters.push({
			sig: sig(el),
			path: pathOf(el),
			position: s.position,
			zIndex: s.zIndex,
			rect: {
				x: Math.round(r.left),
				y: Math.round(r.top),
				w: Math.round(r.width),
				h: Math.round(r.height),
			},
			corner:
				(r.top > vh * 0.5 ? "низ" : "верх") + (r.left > vw * 0.5 ? "-право" : "-лево"),
			pointerEvents: s.pointerEvents,
			covered,
			text: label(el),
		});
	}

	return {
		vw,
		vh,
		coarse: window.matchMedia("(pointer: coarse)").matches,
		anyCoarse: window.matchMedia("(any-pointer: coarse)").matches,
		under700: window.matchMedia("(max-width: 700px)").matches,
		under720: window.matchMedia("(max-width: 720px)").matches,
		under840: window.matchMedia("(max-width: 52.5rem)").matches,
		bottomNav: (() => {
			const n = document.querySelector(".dnt-bottom-nav");
			return n ? cs(n).display !== "none" : false;
		})(),
		controlsSeen,
		small: [...small.values()].sort((a, b) => a.w * a.h - b.w * b.h),
		docOverflow,
		escapes: [...escapes.values()].sort((a, b) => b.count - a.count).slice(0, 14),
		tables,
		floaters,
		bodyText: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 160),
	};
};

/* ------------------------------------------------------------------ */

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { startedAt: new Date().toISOString(), web: WEB, profiles: {} };

for (const profile of PROFILES) {
	const context = await browser.newContext({
		viewport: { width: profile.width, height: profile.height },
		hasTouch: profile.coarse,
		deviceScaleFactor: 1,
	});
	await context.addInitScript(
		([c, s]) => {
			localStorage.setItem("dente_clinic_token", c);
			localStorage.setItem("dente_staff_token", s);
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
		},
		[clinicToken, staffToken],
	);
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	/* Огрубление указателя: hasTouch одного не гарантирует (pointer: coarse). */
	if (profile.coarse) {
		await cdp.send("Emulation.setEmulatedMedia", {
			features: [
				{ name: "pointer", value: "coarse" },
				{ name: "any-pointer", value: "coarse" },
			],
		});
	}
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));

	await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded" });
	/* Ждём рабочий кабинет, а не «загрузилось»: снимок экрана входа — ложь. */
	let ready = false;
	for (let i = 0; i < 50 && !ready; i += 1) {
		ready = await page.evaluate(() => {
			const shell = document.querySelector(".sidebar, .app-shell, nav .nav-item");
			const login = document.body.textContent?.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ");
			return Boolean(shell) && !login;
		});
		if (!ready) await sleep(700);
	}
	if (!ready) throw new Error(`${profile.label}: рабочий кабинет не открылся`);

	report.profiles[profile.label] = { views: {}, errors };
	console.log(`\n=== ${profile.label} (${profile.width}x${profile.height}) ===`);

	for (const view of VIEWS) {
		/* Приём без выбранного пациента отдаёт пустое состояние — выбираем. */
		if (view === "visit") {
			await page.evaluate(() => {
				window.location.hash = "patients";
				window.dispatchEvent(new HashChangeEvent("hashchange"));
			});
			await sleep(2200);
			await page.evaluate(async () => {
				const wait = (ms) => new Promise((d) => setTimeout(d, ms));
				const name = () =>
					[...document.querySelectorAll("input")].find((n) => n.autocomplete === "name")?.value || "";
				for (let i = 0; i < 20 && !name(); i += 1) {
					const row = document.querySelector("article.patient-row");
					if (row) row.click();
					await wait(500);
				}
				return name();
			});
			await sleep(800);
		}
		await page.evaluate((v) => {
			window.location.hash = v;
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		}, view);
		await sleep(3000);

		const m = await page.evaluate(MEASURE);
		report.profiles[profile.label].views[view] = m;

		const file = path.join(OUT, `${profile.label}_${view}.png`);
		await page.screenshot({ path: file, fullPage: false });
		if (profile.coarse) {
			await page.screenshot({ path: path.join(OUT, `${profile.label}_${view}_full.png`), fullPage: true });
		}

		const smallTotal = m.small.reduce((s, e) => s + e.count, 0);
		const tablesRaw = m.tables.filter((t) => !t.cardMode);
		console.log(
			`${view}: coarse=${m.coarse} нав.низ=${m.bottomNav} | контролов ${m.controlsSeen}, мелких ${smallTotal} в ${m.small.length} видах | переполнение окна ${m.docOverflow}px, вылезает ${m.escapes.length} видов | таблиц ${m.tables.length} (не карточки ${tablesRaw.length}) | прибитых ${m.floaters.length} (перекрывают ${m.floaters.filter((f) => f.covered.length).length})`,
		);
		for (const e of m.small.slice(0, 6)) {
			console.log(`    мелкая ${e.sig} ${e.w}x${e.h} x${e.count}${e.via ? ` (через ${e.via})` : ""} min-height:${e.minHeightCss} ${e.samples.join(" / ")}`);
		}
		for (const t of tablesRaw) {
			console.log(`    таблица-таблицей ${t.path} колонок ${t.cols} строк ${t.rows} display строки ${t.rowDisplay} data-label:${t.hasDataLabel} ширина ${t.tableW}/${t.scrollW} прокрутка:${t.holderScrollsX}`);
		}
		for (const f of m.floaters.filter((x) => x.covered.length)) {
			console.log(`    прибитый ${f.sig} ${f.corner} ${f.rect.w}x${f.rect.h} z=${f.zIndex} закрывает: ${f.covered.join("; ")}`);
		}
		for (const e of m.escapes.slice(0, 5)) {
			console.log(`    вылезает ${e.sig} ${e.why} (ширина ${e.width}, x${e.count})`);
		}
	}
	await context.close();
}

await browser.close();
report.finishedAt = new Date().toISOString();
await writeFile(path.join(OUT, "chairside.json"), JSON.stringify(report, null, 2), "utf8");
console.log(`\nСнимки и измерения: ${OUT}`);
