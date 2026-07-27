/**
 * Проверяет кнопку диктовки в полях быстрого ввода.
 *
 * Дефект: вызывающий код передавал { position:absolute, right, top:50% }
 * в SmartMicrophoneButton, а компонент вешал это на саму кнопку, хотя
 * кнопка лежит внутри собственной обёртки с position:relative. Обёртка
 * оставалась без детей в потоке, схлопывалась в ширину 0, кнопка по
 * shrink-to-fit сжималась до 16px (одни паддинги), иконка микрофона —
 * до нулевой ширины. Пользователь видел пустое место вместо кнопки.
 *
 * Проверяем: иконка имеет ненулевую ширину, кнопка не меньше 36x36,
 * центр кнопки принимает нажатие, и кнопка действительно лежит на
 * правом краю поля ввода, а не уехала за него.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const MIN_SIDE = 36;

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

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

const MEASURE = () => {
	const wrap = document.querySelector(".smart-input-wrapper");
	if (!wrap) return { missing: true };
	const btn = wrap.querySelector('button[title="Диктовка"]');
	if (!btn) return { noButton: true };
	const input = wrap.querySelector("input:not([type=hidden])");
	const svg = btn.querySelector("svg");
	const rb = btn.getBoundingClientRect();
	const rin = input.getBoundingClientRect();
	const rs = svg.getBoundingClientRect();
	const hit = document.elementFromPoint(rb.x + rb.width / 2, rb.y + rb.height / 2);
	return {
		btn: { w: Math.round(rb.width), h: Math.round(rb.height), x: Math.round(rb.x), right: Math.round(rb.right) },
		svg: { w: Math.round(rs.width), h: Math.round(rs.height) },
		input: { x: Math.round(rin.x), right: Math.round(rin.right), w: Math.round(rin.width), h: Math.round(rin.height) },
		hitIsButton: !!hit && (hit === btn || btn.contains(hit)),
		hitTag: hit ? `${hit.tagName.toLowerCase()}.${(hit.className?.toString?.() || "").slice(0, 26)}` : "null",
	};
};

const browser = await chromium.launch({ headless: true });
try {
	for (const width of [390, 1500]) {
		const context = await browser.newContext({
			viewport: { width, height: 900 },
			isMobile: width < 700,
			hasTouch: width < 700,
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
		await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page
			.waitForSelector('.smart-input-wrapper button[title="Диктовка"]', { state: "attached", timeout: 20_000 })
			.catch(() => null);
		await page.waitForTimeout(1200);

		console.log(`\n=== ширина экрана ${width} ===`);
		// Прокрутка через Playwright: он умеет вложенные скролл-контейнеры,
		// иначе на узком экране кнопка остаётся за пределами окна и
		// elementFromPoint честно возвращает null.
		await page
			.locator('.smart-input-wrapper button[title="Диктовка"]')
			.first()
			.scrollIntoViewIfNeeded({ timeout: 10_000 })
			.catch(() => null);
		await page.waitForTimeout(400);
		const m = await page.evaluate(MEASURE);
		if (m.missing || m.noButton) {
			check(`${width}: кнопка диктовки найдена`, false, m.missing ? "нет .smart-input-wrapper" : "нет кнопки");
			await context.close();
			continue;
		}
		check(`${width}: иконка микрофона видна`, m.svg.w >= 16 && m.svg.h >= 16, `иконка ${m.svg.w}x${m.svg.h}`);
		check(
			`${width}: цель нажатия не меньше ${MIN_SIDE}x${MIN_SIDE}`,
			m.btn.w >= MIN_SIDE && m.btn.h >= MIN_SIDE,
			`кнопка ${m.btn.w}x${m.btn.h}`,
		);
		check(`${width}: центр кнопки принимает нажатие`, m.hitIsButton, `в точке ${m.hitTag}`);
		check(
			`${width}: кнопка лежит у правого края поля`,
			m.btn.right <= m.input.right + 1 && m.btn.right > m.input.right - 48,
			`правый край кнопки ${m.btn.right}, правый край поля ${m.input.right}`,
		);
		await context.close();
	}

	// Сплошная проверка: ни одна кнопка диктовки ни на одном экране не должна
	// оказаться со схлопнутой иконкой или меньше 36x36.
	const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: "ru-RU" });
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
	const bad = [];
	let total = 0;
	for (const view of ["shift", "schedule", "patients", "visit", "documents", "finance", "communications", "settings"]) {
		await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(2600);
		const found = await page.evaluate(() => {
			const out = [];
			for (const btn of document.querySelectorAll('button[title="Диктовка"]')) {
				const r = btn.getBoundingClientRect();
				if (r.width < 1 || r.height < 1) continue;
				const svg = btn.querySelector("svg");
				const rs = svg ? svg.getBoundingClientRect() : { width: 0, height: 0 };
				out.push({
					w: Math.round(r.width),
					h: Math.round(r.height),
					sw: Math.round(rs.width),
					sh: Math.round(rs.height),
					cls: (btn.className?.toString?.() || "").slice(0, 40),
				});
			}
			return out;
		});
		for (const f of found) {
			total += 1;
			if (f.sw < 14 || f.w < MIN_SIDE || f.h < MIN_SIDE) bad.push({ view, ...f });
		}
	}
	await context.close();
	console.log(`\n=== сплошная проверка: ${total} кнопок диктовки на 8 экранах ===`);
	for (const b of bad) console.log(`     ${b.view}: кнопка ${b.w}x${b.h}, иконка ${b.sw}x${b.sh}, class="${b.cls}"`);
	check("ни одна кнопка диктовки не схлопнута", bad.length === 0, `плохих ${bad.length} из ${total}`);
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
