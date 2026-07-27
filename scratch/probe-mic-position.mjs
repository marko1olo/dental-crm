/**
 * Проверяет, куда на самом деле попадает кнопка диктовки в полях
 * быстрого ввода на экранах «Пациенты» и «Расписание».
 *
 * Оба места передают в SmartMicrophoneButton стиль
 * { position:absolute, right:..., top:50% } в расчёте на то, что кнопка
 * ляжет на правый край поля ввода. Но сам компонент оборачивает кнопку
 * в собственный div с position:relative, поэтому абсолютное
 * позиционирование считается от этой обёртки, а не от поля.
 *
 * Меряем: ширину обёртки, положение кнопки относительно правого края
 * поля ввода и её размер.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const WIDTH = Number(process.env.W || 390);

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
	viewport: { width: WIDTH, height: 900 },
	isMobile: WIDTH < 700,
	hasTouch: WIDTH < 700,
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

const MEASURE = (wrapperSelector) =>
	document.querySelectorAll(wrapperSelector).length === 0
		? { missing: true }
		: (() => {
				const wrap = document.querySelector(wrapperSelector);
				const btn = wrap.querySelector('button[title="Диктовка"]');
				if (!btn) return { noButton: true, wrapCls: wrap.className };
				const inner = btn.parentElement;
				const input = wrap.querySelector("input:not([type=hidden])");
				const rb = btn.getBoundingClientRect();
				const ri = inner.getBoundingClientRect();
				const rw = wrap.getBoundingClientRect();
				const rin = input ? input.getBoundingClientRect() : null;
				const cs = getComputedStyle(btn);
				const svg = btn.querySelector("svg");
				const rs = svg ? svg.getBoundingClientRect() : null;
				// Что реально получит палец в центре кнопки.
				const hit = document.elementFromPoint(rb.x + rb.width / 2, rb.y + rb.height / 2);
				return {
					button: { w: Math.round(rb.width), h: Math.round(rb.height), x: Math.round(rb.x), y: Math.round(rb.y) },
					innerWrapper: { w: Math.round(ri.width), h: Math.round(ri.height), x: Math.round(ri.x) },
					outerWrapper: { w: Math.round(rw.width), h: Math.round(rw.height), x: Math.round(rw.x) },
					input: rin
						? { w: Math.round(rin.width), h: Math.round(rin.height), x: Math.round(rin.x), right: Math.round(rin.right) }
						: null,
					svg: rs ? { w: Math.round(rs.width), h: Math.round(rs.height) } : null,
					position: cs.position,
					padding: cs.padding,
					hitTag: hit ? `${hit.tagName.toLowerCase()}.${(hit.className?.toString?.() || "").slice(0, 30)}` : null,
					hitIsButton: hit === btn || btn.contains(hit),
				};
			})();

try {
	for (const [view, sel] of [
		["patients", ".smart-input-wrapper"],
		["schedule", ".smart-input-wrapper"],
	]) {
		await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(2800);
		const m = await page.evaluate(MEASURE, sel);
		console.log(`\n===== ${view} (${WIDTH}px), селектор ${sel} =====`);
		if (m.missing) {
			console.log("  обёртка не найдена на этом экране");
			continue;
		}
		if (m.noButton) {
			console.log(`  кнопка диктовки не найдена, класс обёртки: ${m.wrapCls}`);
			continue;
		}
		console.log(`  поле ввода:        ${m.input ? `${m.input.w}x${m.input.h} при x=${m.input.x}, правый край ${m.input.right}` : "нет"}`);
		console.log(`  внешняя обёртка:   ${m.outerWrapper.w}x${m.outerWrapper.h} при x=${m.outerWrapper.x}`);
		console.log(`  внутренняя div:    ${m.innerWrapper.w}x${m.innerWrapper.h} при x=${m.innerWrapper.x}   <- она схлопнута, если ширина 0`);
		console.log(`  кнопка:            ${m.button.w}x${m.button.h} при x=${m.button.x}, y=${m.button.y}  position=${m.position} padding=${m.padding}`);
		console.log(`  иконка внутри:     ${m.svg ? `${m.svg.w}x${m.svg.h}` : "нет"}`);
		console.log(`  палец в центре кнопки попадает в: ${m.hitTag} (это кнопка: ${m.hitIsButton ? "да" : "НЕТ"})`);
		if (m.input) {
			const overlapsInput = m.button.x < m.input.right && m.button.x + m.button.w > m.input.x;
			console.log(`  кнопка лежит поверх поля ввода: ${overlapsInput ? "да" : "НЕТ — она уехала из поля"}`);
		}
	}
} finally {
	await browser.close();
}
