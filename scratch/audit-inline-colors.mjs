/**
 * Ищет элементы, у которых цвет задан ИНЛАЙНОВЫМ стилем, и меряет их
 * контраст во всех темах.
 *
 * Такие места нельзя починить правкой таблиц стилей: инлайновый стиль
 * перебивает любое правило без !important. И именно они чаще всего не
 * следуют теме, потому что жёсткий #fff или #333 остаётся неизменным при
 * переключении светлой/тёмной/ночной.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const THEMES = ["light", "dark", "night"];
const VIEWS = ["shift", "schedule", "patients", "visit", "documents", "finance", "analytics", "communications", "settings", "imaging"];
const MIN_RATIO = 4.5;

const login = await fetch(`${API}/api/auth/clinic/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await fetch(`${API}/api/auth/staff/unlock`, {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, locale: "ru-RU" })).newPage();
await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate(
	({ ct, st }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
	},
	{ ct: login.clinicToken, st: unlock.staffToken },
);

const SCAN = (minRatio) => {
	const parse = (c) => {
		const m = String(c).match(/rgba?\(([^)]+)\)/);
		if (!m) return null;
		const p = m[1].split(",").map((x) => Number.parseFloat(x));
		return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
	};
	const lum = ([r, g, b]) => {
		const f = (v) => {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
	};
	const ratio = (a, b) => {
		const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
		return (l1 + 0.05) / (l2 + 0.05);
	};
	const bgOf = (el) => {
		for (let n = el; n; n = n.parentElement) {
			const parsed = parse(getComputedStyle(n).backgroundColor);
			if (parsed && parsed.a > 0.9) return parsed.rgb;
		}
		return [255, 255, 255];
	};
	const visible = (el) => {
		const r = el.getBoundingClientRect();
		if (r.width < 2 || r.height < 2) return false;
		for (let n = el; n; n = n.parentElement) {
			const s = getComputedStyle(n);
			if (s.display === "none" || s.visibility === "hidden") return false;
			if (Number.parseFloat(s.opacity) === 0) return false;
		}
		return true;
	};

	const out = [];
	for (const el of document.querySelectorAll("[style]")) {
		const inlineColor = el.style.color;
		if (!inlineColor) continue;
		const text = (el.textContent || "").trim();
		if (!text || text.length > 80) continue;
		// Только элементы с собственным текстом, иначе меряем контейнер.
		const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
		if (!ownText) continue;
		if (!visible(el)) continue;

		const fg = parse(getComputedStyle(el).color);
		if (!fg) continue;
		const bg = bgOf(el);
		const r = ratio(fg.rgb, bg);
		if (r >= minRatio) continue;
		out.push({
			ratio: Number(r.toFixed(2)),
			inline: inlineColor,
			fg: getComputedStyle(el).color,
			bg: `rgb(${bg.join(", ")})`,
			cls: (el.className?.toString?.() || "").slice(0, 50),
			tag: el.tagName.toLowerCase(),
			text: text.slice(0, 42),
		});
	}
	return out;
};

const all = [];
try {
	for (const theme of THEMES) {
		await page.evaluate((th) => localStorage.setItem("dente_theme_mode", th), theme);
		for (const view of VIEWS) {
			await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
			await page.reload({ waitUntil: "domcontentloaded" });
			await page.waitForTimeout(2200);
			const found = await page.evaluate(SCAN, MIN_RATIO);
			for (const f of found) all.push({ theme, view, ...f });
		}
	}
} finally {
	await browser.close();
}

// Схлопываем одинаковые находки по текст+класс, оставляя худший случай.
const byKey = new Map();
for (const f of all) {
	const key = `${f.tag}|${f.cls}|${f.text}`;
	const prev = byKey.get(key);
	if (!prev || f.ratio < prev.ratio) byKey.set(key, f);
}
const rows = [...byKey.values()].sort((a, b) => a.ratio - b.ratio);

console.log(`Инлайновый цвет с контрастом ниже ${MIN_RATIO}: ${rows.length} различных мест (всего срабатываний ${all.length})\n`);
for (const r of rows) {
	console.log(
		`${String(r.ratio).padStart(5)}  ${r.theme.padEnd(6)} ${r.view.padEnd(15)} inline=${r.inline.padEnd(20)} ${r.fg} на ${r.bg}`,
	);
	console.log(`        <${r.tag} class="${r.cls}">  «${r.text}»`);
}
