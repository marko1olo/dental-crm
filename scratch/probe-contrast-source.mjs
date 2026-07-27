/**
 * Находит для худших по контрасту элементов их РЕАЛЬНЫЙ источник цвета:
 * список классов, инлайновый стиль и совпавшие CSS-правила. Без этого
 * правка была бы гаданием по вычисленному цвету.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const TARGETS = [
	{ view: "patients", theme: "dark", text: "Лента приемов пациента" },
	{ view: "analytics", theme: "light", text: "Ср. выручка / пациент" },
	{ view: "analytics", theme: "light", text: "Выручка" },
	{ view: "visit", theme: "dark", text: "предупр." },
	{ view: "visit", theme: "light", text: "ЭМК и Диктовка" },
	{ view: "settings", theme: "light", text: "название и телефон" },
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

const byView = new Map();
for (const t of TARGETS) {
	const key = `${t.view}|${t.theme}`;
	if (!byView.has(key)) byView.set(key, []);
	byView.get(key).push(t.text);
}

for (const [key, texts] of byView) {
	const [view, theme] = key.split("|");
	await page.evaluate((th) => localStorage.setItem("dente_theme_mode", th), theme);
	await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3500);

	const found = await page.evaluate((needles) => {
		const out = [];
		const all = [...document.querySelectorAll("*")];
		for (const needle of needles) {
			const el = all.find(
				(e) =>
					e.children.length === 0 &&
					(e.textContent || "").trim().includes(needle) &&
					(e.textContent || "").trim().length < 90,
			);
			if (!el) {
				out.push({ needle, missing: true });
				continue;
			}
			const cs = getComputedStyle(el);
			// Какие правила таблиц стилей задают color этому элементу.
			const rules = [];
			for (const sheet of document.styleSheets) {
				let list;
				try {
					list = sheet.cssRules;
				} catch {
					continue;
				}
				const walk = (rs) => {
					for (const rule of rs) {
						if (rule.selectorText) {
							let matches = false;
							try {
								matches = el.matches(rule.selectorText);
							} catch {}
							if (matches && rule.style && rule.style.color) {
								rules.push(`${rule.selectorText} { color: ${rule.style.color} }`);
							}
							if (rule.cssRules) walk(rule.cssRules);
							continue;
						}
						if (rule.cssRules) walk(rule.cssRules);
					}
				};
				walk(list);
			}
			out.push({
				needle,
				tag: el.tagName.toLowerCase(),
				classes: el.className?.toString?.().slice(0, 130) || "",
				inlineColor: el.style?.color || "",
				color: cs.color,
				parentClasses: el.parentElement?.className?.toString?.().slice(0, 110) || "",
				rules: rules.slice(-4),
			});
		}
		return out;
	}, texts);

	console.log(`\n===== ${view} / ${theme}`);
	for (const f of found) {
		if (f.missing) {
			console.log(`  «${f.needle}» — не найден на экране`);
			continue;
		}
		console.log(`  «${f.needle}»  <${f.tag}> color=${f.color}`);
		console.log(`      classes: ${f.classes || "(нет)"}`);
		if (f.inlineColor) console.log(`      inline color: ${f.inlineColor}`);
		console.log(`      родитель: ${f.parentClasses || "(нет)"}`);
		for (const r of f.rules) console.log(`      правило: ${r}`);
	}
}

await browser.close();
