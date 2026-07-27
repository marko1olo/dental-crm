/**
 * Замеряет контраст активной вкладки визита в трёх темах.
 *
 * Дефект: цвет текста был жёстко задан инлайном как "#fff" поверх
 * var(--teal-dark). В светлой теме --teal-dark это #0f766e, и белый по
 * нему читается. Но в тёмной теме это #14b8a6, а в ночной #cf9146 —
 * белым по ним контраст 2.49 и хуже. В наборе токенов для этого случая
 * уже есть --on-teal: белый в светлой теме, почти чёрный в тёмной и
 * ночной.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const THEMES = ["light", "dark", "night"];
const MIN_RATIO = 4.5;

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok, detail });
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

try {
	for (const theme of THEMES) {
		await page.evaluate((th) => localStorage.setItem("dente_theme_mode", th), theme);
		await page.goto(`${WEB}/#visit`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(3500);

		const measured = await page.evaluate(() => {
			const parse = (c) => {
				const m = c.match(/rgba?\(([^)]+)\)/);
				if (!m) return null;
				const [r, g, b] = m[1].split(",").map((x) => Number.parseFloat(x));
				return [r, g, b];
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
			// Непрозрачный фон: поднимаемся вверх, пока не найдём непрозрачный.
			const bgOf = (el) => {
				for (let n = el; n; n = n.parentElement) {
					const c = parse(getComputedStyle(n).backgroundColor);
					const alpha = getComputedStyle(n).backgroundColor.match(/rgba\([^)]*,\s*([\d.]+)\)/);
					if (c && (!alpha || Number.parseFloat(alpha[1]) > 0.9)) return c;
				}
				return [255, 255, 255];
			};
			const tab = document.querySelector(".visit-sub-nav-tabs button.active");
			if (!tab) return { missing: true };
			const fg = parse(getComputedStyle(tab).color);
			const bg = bgOf(tab);
			return {
				text: (tab.textContent || "").trim().slice(0, 30),
				fg: getComputedStyle(tab).color,
				bg: `rgb(${bg.join(", ")})`,
				ratio: Number(ratio(fg, bg).toFixed(2)),
			};
		});

		if (measured.missing) {
			check(`${theme}: активная вкладка визита найдена`, false, "элемента нет на экране");
			continue;
		}
		check(
			`${theme}: активная вкладка визита читается (>= ${MIN_RATIO})`,
			measured.ratio >= MIN_RATIO,
			`к=${measured.ratio}, текст ${measured.fg} на фоне ${measured.bg}, «${measured.text}»`,
		);
	}
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
