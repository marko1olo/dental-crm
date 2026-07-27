/**
 * Обходит все разделы приложения и все вкладки настроек и проверяет, что ни
 * один не падает.
 *
 * Зачем нужен обход: раздел «Настройки» не открывался вообще, а узнать это по
 * снимку экрана было нельзя — граница ошибок React показывает вежливое «Раздел
 * временно не открылся», и внешне это похоже на пустое состояние. Настоящая
 * причина уходит в консоль браузера. Значит проверять надо обходом с чтением
 * консоли, а не глазами по одному экрану.
 */
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const VIEWS = [
	"shift",
	"schedule",
	"patients",
	"imaging",
	"visit",
	"documents",
	"finance",
	"analytics",
	"communications",
	"marketing",
];
const SETTINGS_TABS = [
	"profile",
	"clinic",
	"staff",
	"access",
	"telegram",
	"protocols",
	"rules",
	"prices",
	"sources",
	"ai",
	"imports",
	"audit",
];

async function req(path, init = {}, attempts = 14) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 2500));
		}
	}
	throw last;
}

const login = await req("/api/auth/clinic/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await req("/api/auth/staff/unlock", {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" });
const page = await context.newPage();

let currentErrors = [];
page.on("console", (message) => {
	if (message.type() !== "error") return;
	const text = message.text();
	// Транзиентные 404 сервера разработки при пересборке — не дефект приложения.
	if (text.includes("Failed to load resource")) return;
	currentErrors.push(text.slice(0, 220));
});
page.on("pageerror", (error) => currentErrors.push(String(error).slice(0, 220)));

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

const broken = [];

async function visit(hash, label) {
	currentErrors = [];
	/*
	 * Каждый раздел смотрим с чистого листа. Граница ошибок React не
	 * сбрасывается при смене вкладки: одна упавшая вкладка настроек оставляла
	 * «Раздел временно не открылся» на всех следующих, и обход без перезагрузки
	 * показывал восемь поломок вместо одной настоящей.
	 */
	await page.goto(`${WEB}/#${hash}`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3000);
	const state = await page.evaluate(() => {
		const text = document.body.innerText || "";
		return {
			crashed: text.includes("Раздел временно не открылся"),
			isLogin: /Вход в кабинет|Введите пароль/.test(text) && !/Смена|Расписание|Настройки/.test(text),
			length: text.trim().length,
		};
	});
	const renderErrors = currentErrors.filter((line) =>
		/Cannot read propert|is not a function|is not defined|undefined is not/.test(line),
	);
	const ok = !state.crashed && !state.isLogin && renderErrors.length === 0 && state.length > 200;
	console.log(
		`  ${ok ? "OK  " : "СБОЙ"} ${label.padEnd(24)} падение:${state.crashed ? "да" : "нет"} ` +
			`логин:${state.isLogin ? "да" : "нет"} текста:${state.length} ошибок:${renderErrors.length}`,
	);
	if (!ok) {
		broken.push({ label, crashed: state.crashed, errors: renderErrors.slice(0, 2) });
	}
}

console.log("разделы:");
for (const view of VIEWS) await visit(view, view);

console.log("\nвкладки настроек:");
for (const tab of SETTINGS_TABS) await visit(`settings/${tab}`, `settings/${tab}`);

await browser.close();

console.log(`\nсломанных мест: ${broken.length}`);
for (const item of broken) {
	console.log(`  ${item.label}${item.crashed ? " — показана граница ошибок" : ""}`);
	for (const error of item.errors) console.log(`      ${error}`);
}
if (broken.length > 0) process.exit(1);
