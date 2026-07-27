/**
 * Ищет интерактивные элементы, в которые трудно попасть пальцем.
 *
 * Порог — 44x44 CSS-пикселя (рекомендация Apple HIG и WCAG 2.2 AAA;
 * WCAG 2.2 AA требует 24x24 как абсолютный минимум). Клиника работает
 * с планшета у кресла в перчатках, поэтому меряем именно мобильный
 * экран, а не десктоп.
 *
 * Считаем эффективную область нажатия: сам элемент плюс его padding
 * уже входят в getBoundingClientRect, но если у элемента есть
 * псевдоэлемент-расширитель или родитель-обёртка с обработчиком, это
 * не учитывается — такие случаи разбираем вручную по выводу.
 *
 * Вывод даёт селектор, класс, текст и координаты, чтобы находку можно
 * было найти в исходниках, а не гадать.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const MIN_SIDE = 44;
const VIEWS = [
	"shift",
	"schedule",
	"patients",
	"visit",
	"documents",
	"finance",
	"analytics",
	"communications",
	"settings",
	"imaging",
];

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
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 3,
	isMobile: true,
	hasTouch: true,
	locale: "ru-RU",
});
const page = await context.newPage();
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

const SCAN = (minSide) => {
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
	const SEL = 'button, a[href], [role="button"], [role="tab"], [role="switch"], input[type="checkbox"], input[type="radio"], summary, [onclick]';
	const out = [];
	for (const el of document.querySelectorAll(SEL)) {
		if (el.hasAttribute("disabled")) continue;
		if (!visible(el)) continue;
		const r = el.getBoundingClientRect();
		const w = Math.round(r.width);
		const h = Math.round(r.height);
		if (w >= minSide && h >= minSide) continue;
		const cs = getComputedStyle(el);
		const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 34);
		out.push({
			w,
			h,
			tag: el.tagName.toLowerCase(),
			cls: (el.className?.toString?.() || "").slice(0, 62),
			id: el.id || "",
			aria: el.getAttribute("aria-label") || "",
			title: el.getAttribute("title") || "",
			text,
			pad: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`.replace(/px/g, ""),
			inlineW: el.style.width || "",
			inlineH: el.style.height || "",
			inlinePad: el.style.padding || "",
			minH: cs.minHeight,
			minW: cs.minWidth,
			parentCls: (el.parentElement?.className?.toString?.() || "").slice(0, 46),
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
		const found = await page.evaluate(SCAN, MIN_SIDE);
		for (const f of found) all.push({ view, ...f });
	}
} finally {
	await browser.close();
}

// Схлопываем по подписи+классу: один и тот же виджет встречается на многих
// экранах, чинить его нужно один раз.
const byKey = new Map();
for (const f of all) {
	const key = `${f.tag}|${f.cls}|${f.aria || f.title || f.text}`;
	const prev = byKey.get(key);
	if (!prev) byKey.set(key, { ...f, views: new Set([f.view]), hits: 1 });
	else {
		prev.views.add(f.view);
		prev.hits += 1;
		if (f.w * f.h < prev.w * prev.h) {
			prev.w = f.w;
			prev.h = f.h;
		}
	}
}
const rows = [...byKey.values()].sort((a, b) => a.w * a.h - b.w * b.h);

console.log(`Экран 390x844, порог ${MIN_SIDE}x${MIN_SIDE}.`);
console.log(`Мелких целей нажатия: ${rows.length} различных, ${all.length} срабатываний\n`);
for (const r of rows) {
	const label = r.aria || r.title || r.text || "(без подписи)";
	console.log(
		`${String(r.w).padStart(3)}x${String(r.h).padEnd(3)}  x${String(r.hits).padStart(2)}  <${r.tag}> «${label}»`,
	);
	console.log(`            class="${r.cls}"  parent="${r.parentCls}"`);
	console.log(
		`            padding=[${r.pad}] minH=${r.minH} minW=${r.minW}` +
			(r.inlineW || r.inlineH || r.inlinePad
				? `  ИНЛАЙН w=${r.inlineW || "-"} h=${r.inlineH || "-"} pad=${r.inlinePad || "-"}`
				: ""),
	);
	console.log(`            экраны: ${[...r.views].join(", ")}`);
}
