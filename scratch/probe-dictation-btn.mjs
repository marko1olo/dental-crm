/**
 * Разбирает, почему кнопка «Диктовка» рисуется шириной 16 пикселей,
 * хотя её вычисленный min-width равен 40.
 *
 * Возможные причины, которые проверяем: flex-shrink у самой кнопки,
 * переполнение родителя, overflow:hidden выше по дереву, обрезка
 * содержимого.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

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

try {
	await page.goto(`${WEB}/#visit`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3000);

	const info = await page.evaluate(() => {
		const chain = (el) => {
			const out = [];
			for (let n = el, i = 0; n && i < 6; n = n.parentElement, i += 1) {
				const s = getComputedStyle(n);
				const r = n.getBoundingClientRect();
				out.push({
					tag: n.tagName.toLowerCase(),
					cls: (n.className?.toString?.() || "").slice(0, 60),
					w: Math.round(r.width),
					h: Math.round(r.height),
					scrollW: n.scrollWidth,
					display: s.display,
					flex: `${s.flexGrow} ${s.flexShrink} ${s.flexBasis}`,
					overflow: `${s.overflowX}/${s.overflowY}`,
					minW: s.minWidth,
					gap: s.gap,
				});
			}
			return out;
		};

		const results = [];
		for (const el of document.querySelectorAll("button")) {
			const t = (el.textContent || "").replace(/\s+/g, " ").trim();
			if (!t.includes("Диктовка")) continue;
			const r = el.getBoundingClientRect();
			const kids = [...el.children].map((c) => {
				const cr = c.getBoundingClientRect();
				const cs = getComputedStyle(c);
				return {
					tag: c.tagName.toLowerCase(),
					cls: (c.className?.toString?.() || "").slice(0, 40),
					w: Math.round(cr.width),
					h: Math.round(cr.height),
					display: cs.display,
					overflow: cs.overflow,
					text: (c.textContent || "").trim().slice(0, 20),
				};
			});
			results.push({
				w: Math.round(r.width),
				h: Math.round(r.height),
				x: Math.round(r.x),
				scrollW: el.scrollWidth,
				html: el.outerHTML.slice(0, 300),
				kids,
				chain: chain(el),
			});
		}
		return results;
	});

	for (const [i, r] of info.entries()) {
		console.log(`\n=== кнопка «Диктовка» #${i + 1}: ${r.w}x${r.h} при x=${r.x}, scrollWidth=${r.scrollW} ===`);
		console.log(`HTML: ${r.html}\n`);
		console.log("дети:");
		for (const k of r.kids) console.log(`   <${k.tag} class="${k.cls}"> ${k.w}x${k.h} display=${k.display} «${k.text}»`);
		console.log("цепочка предков:");
		for (const c of r.chain) {
			console.log(
				`   <${c.tag} class="${c.cls}"> ${c.w}x${c.h} scrollW=${c.scrollW} display=${c.display} flex=[${c.flex}] overflow=${c.overflow} minW=${c.minW} gap=${c.gap}`,
			);
		}
	}
} finally {
	await browser.close();
}
