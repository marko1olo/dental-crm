/**
 * Почему <svg> внутри кнопки диктовки имеет ширину 0.
 * Смотрим вычисленный стиль иконки и все правила таблиц стилей,
 * которые к ней применились.
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
const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 }, locale: "ru-RU" })).newPage();
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
	await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2800);

	const out = await page.evaluate(() => {
		const btn = document.querySelector('.smart-input-wrapper button[title="Диктовка"]');
		if (!btn) return { missing: true };
		const svg = btn.querySelector("svg");
		if (!svg) return { noSvg: true };
		const cs = getComputedStyle(svg);
		const r = svg.getBoundingClientRect();

		// Собираем все CSS-правила, чей селектор совпадает с иконкой.
		const matched = [];
		for (const sheet of document.styleSheets) {
			let rules;
			try {
				rules = sheet.cssRules;
			} catch {
				continue;
			}
			const walk = (list, media) => {
				for (const rule of list) {
					if (rule.cssRules) {
						walk(rule.cssRules, rule.conditionText || media);
						continue;
					}
					if (!rule.selectorText) continue;
					let hit = false;
					try {
						hit = svg.matches(rule.selectorText);
					} catch {
						continue;
					}
					if (!hit) continue;
					const text = rule.style.cssText;
					if (!/width|height|flex|min-|max-/.test(text)) continue;
					matched.push({ sel: rule.selectorText.slice(0, 90), media: media || "", css: text.slice(0, 160) });
				}
			};
			walk(rules, "");
		}

		return {
			rect: { w: r.width, h: r.height },
			attrs: { width: svg.getAttribute("width"), height: svg.getAttribute("height") },
			computed: {
				width: cs.width,
				height: cs.height,
				minWidth: cs.minWidth,
				maxWidth: cs.maxWidth,
				flex: `${cs.flexGrow} ${cs.flexShrink} ${cs.flexBasis}`,
				display: cs.display,
				boxSizing: cs.boxSizing,
			},
			btnComputed: {
				width: getComputedStyle(btn).width,
				display: getComputedStyle(btn).display,
				position: getComputedStyle(btn).position,
			},
			matched,
		};
	});

	console.log(JSON.stringify(out, null, 2));
} finally {
	await browser.close();
}
