/**
 * Проверяет, что Tailwind реально сгенерировал класс с вложенным min()
 * внутри произвольного значения grid-cols-[...]. Если бы не сгенерировал,
 * колонка просто исчезла бы (grid-template-columns: none), и аудит
 * переполнения тоже показал бы ноль — но по другой причине.
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

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

try {
	for (const width of [1500, 390]) {
		const context = await browser.newContext({
			viewport: { width, height: 950 },
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
		await page.goto(`${WEB}/#schedule`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(2800);

		console.log(`\n=== ширина ${width} ===`);
		const found = await page.evaluate(() => {
			const out = [];
			for (const el of document.querySelectorAll('[class*="grid-cols-[repeat"]')) {
				const s = getComputedStyle(el);
				const r = el.getBoundingClientRect();
				out.push({
					cls: (el.className?.toString?.() || "").slice(0, 90),
					cols: s.gridTemplateColumns,
					display: s.display,
					w: Math.round(r.width),
					right: Math.round(r.right),
					visible: r.width > 1 && r.height > 1,
				});
			}
			return out;
		});
		if (!found.length) {
			console.log("  элементов с grid-cols-[repeat...] на экране нет (форма записи может быть скрыта)");
			await context.close();
			continue;
		}
		for (const f of found) {
			console.log(`  class="${f.cls}"`);
			console.log(`     display=${f.display} ширина=${f.w} правый край=${f.right} видим=${f.visible}`);
			console.log(`     вычисленные колонки: ${f.cols}`);
			check(
				`${width}: произвольное значение Tailwind применилось (колонки не none)`,
				f.cols !== "none" && f.cols.trim() !== "",
				f.cols,
			);
			if (f.visible) {
				const widest = Math.max(
					...f.cols
						.split(" ")
						.map((t) => Number.parseFloat(t))
						.filter((n) => Number.isFinite(n)),
				);
				check(`${width}: ни одна колонка не шире контейнера`, widest <= f.w + 1, `самая широкая ${widest}px при контейнере ${f.w}px`);
			}
		}
		await context.close();
	}
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
