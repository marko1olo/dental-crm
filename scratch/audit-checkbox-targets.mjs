/**
 * Меряет реальную область нажатия для флажков и переключателей.
 *
 * Сам <input type="checkbox"> обычно 20x20, но если он лежит внутри
 * <label>, палец попадает по всей подписи, и цель на деле больше.
 * Считаем именно её: <label>, обёртку с обработчиком или сам input.
 *
 * Порог 24x24 — минимум WCAG 2.2 уровня AA (SC 2.5.8).
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const MIN = 24;
const VIEWS = (process.env.VIEWS || "shift,schedule,patients,visit,documents,finance,analytics,communications,settings,imaging").split(",");

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
const page = await (
	await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "ru-RU" })
).newPage();
await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate(
	({ ct, st }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
	},
	{ ct: login.clinicToken, st: unlock.staffToken },
);

const SCAN = (min) => {
	const visible = (el) => {
		const r = el.getBoundingClientRect();
		if (r.width < 1 || r.height < 1) return false;
		for (let n = el; n; n = n.parentElement) {
			const s = getComputedStyle(n);
			if (s.display === "none" || s.visibility === "hidden") return false;
			if (Number.parseFloat(s.opacity) === 0) return false;
		}
		return true;
	};
	const out = [];
	for (const input of document.querySelectorAll('input[type="checkbox"], input[type="radio"]')) {
		if (input.disabled || !visible(input)) continue;
		const label = input.closest("label") || (input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null);
		const target = label || input;
		const r = target.getBoundingClientRect();
		const ri = input.getBoundingClientRect();
		const w = Math.round(r.width);
		const h = Math.round(r.height);
		if (w >= min && h >= min) continue;
		out.push({
			w,
			h,
			inputW: Math.round(ri.width),
			inputH: Math.round(ri.height),
			viaLabel: !!label,
			cls: (input.className?.toString?.() || "").slice(0, 44),
			labelCls: label ? (label.className?.toString?.() || "").slice(0, 52) : "",
			text: ((label || input.parentElement)?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
		});
	}
	return out;
};

const all = [];
try {
	for (const view of VIEWS) {
		await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(2400);
		const found = await page.evaluate(SCAN, MIN);
		for (const f of found) all.push({ view, ...f });
	}
} finally {
	await browser.close();
}

const byKey = new Map();
for (const f of all) {
	const key = `${f.cls}|${f.labelCls}|${f.text}`;
	if (!byKey.has(key)) byKey.set(key, { ...f, views: new Set([f.view]) });
	else byKey.get(key).views.add(f.view);
}
const rows = [...byKey.values()].sort((a, b) => a.w * a.h - b.w * b.h);
console.log(`Флажков и переключателей с целью меньше ${MIN}x${MIN}: ${rows.length} различных (${all.length} срабатываний)\n`);
for (const r of rows) {
	console.log(`  ${r.w}x${r.h}  (сам input ${r.inputW}x${r.inputH}, цель ${r.viaLabel ? "через <label>" : "сам input, подписи-обёртки нет"})`);
	console.log(`       «${r.text}»`);
	console.log(`       input.class="${r.cls}"  label.class="${r.labelCls}"`);
	console.log(`       экраны: ${[...r.views].join(", ")}`);
}
if (!rows.length) console.log("  все флажки и переключатели проходят порог");
