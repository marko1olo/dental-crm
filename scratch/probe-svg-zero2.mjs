/**
 * Опытным путём выясняем, что именно обнуляет ширину иконки:
 * абсолютное позиционирование кнопки (схлопывание shrink-to-fit) или
 * какое-то правило таблиц стилей.
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
		const svg = btn.querySelector("svg");
		const inner = btn.parentElement;
		const snap = (tag) => ({
			tag,
			svgW: Math.round(svg.getBoundingClientRect().width),
			btnW: Math.round(btn.getBoundingClientRect().width),
			innerW: Math.round(inner.getBoundingClientRect().width),
		});
		const steps = [snap("как есть")];

		// 1. Внешняя обёртка тоже схлопнута? Даём ей размер.
		const prevInnerPos = inner.style.position;
		inner.style.position = "static";
		steps.push(snap("обёртка position:static"));
		inner.style.position = prevInnerPos;

		// 2. Убираем абсолютное позиционирование у самой кнопки.
		const prevPos = btn.style.position;
		btn.style.position = "static";
		steps.push(snap("кнопка position:static"));
		btn.style.position = prevPos;

		// 3. Возвращаем абсолют, но задаём кнопке явную ширину.
		const prevW = btn.style.width;
		btn.style.width = "36px";
		steps.push(snap("кнопка width:36px"));
		btn.style.width = prevW;

		// 4. Задаём иконке flex-shrink:0.
		const prevShrink = svg.style.flexShrink;
		svg.style.flexShrink = "0";
		steps.push(snap("иконке flex-shrink:0"));
		svg.style.flexShrink = prevShrink;

		return { steps, svgOuter: svg.outerHTML.slice(0, 160), svgInlineStyle: svg.style.cssText };
	});

	console.log(`иконка: ${out.svgOuter}`);
	console.log(`инлайновый стиль иконки: «${out.svgInlineStyle}»\n`);
	for (const s of out.steps) {
		console.log(`  ${s.tag.padEnd(28)} иконка=${String(s.svgW).padStart(3)}  кнопка=${String(s.btnW).padStart(3)}  обёртка=${String(s.innerW).padStart(3)}`);
	}
} finally {
	await browser.close();
}
