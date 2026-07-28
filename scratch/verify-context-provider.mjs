/**
 * Живая проверка: виджеты, читающие общий контекст, наконец получают данные.
 *
 * AppLogicProvider обнимал только ветку настроек. Остальные разделы рисовались
 * выше него, и useAppLogicContext() отдавал им `{} as AppLogicContextType` —
 * приведение, из-за которого компилятор видит полный объект, а во время работы
 * там пусто. Виджеты вида `const { dashboard } = useAppLogicContext(); ... if
 * (!patient) return null;` тихо рисовали ничто. Ни ошибки, ни границы ошибок:
 * экран выглядел так, будто данных просто нет.
 *
 * Скрипт открывает карточку пациента и ищет следы конкретных виджетов. Пока
 * провайдер стоял на месте, ни одного из них на экране не было.
 *
 * Откатный контроль: верните AppLogicProvider обратно вокруг одних настроек и
 * запустите снова — проверка обязана упасть на тех же строках.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const OUT = "scratch/shots-context";
mkdirSync(OUT, { recursive: true });

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

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

/*
 * След виджета, который без провайдера возвращал null.
 *
 * Маркер один и выбран придирчиво. Первая попытка искала ещё «задач» —
 * и совпадала с плиткой «Связь · задач нет», то есть проходила и до правки
 * тоже. Проверка, которая горит зелёным в обоих случаях, ничего не доказывает
 * и опаснее её отсутствия.
 *
 * PatientLoyaltyHeader читает dashboard из контекста, не находит пациента и
 * молча выходит: `if (!patient) return null`. Его уровень лояльности —
 * единственное на этом экране слово, которого без провайдера нет вовсе.
 * Проверено откатом: с провайдером есть, без него нет.
 */
const MARKERS = [["уровень лояльности пациента", /Базовый|Серебро|Золото|Платинум/]];

const browser = await chromium.launch({ headless: true });
try {
	const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: "ru-RU" });
	const page = await context.newPage();
	const pageErrors = [];
	page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 140)));
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
	await page.waitForTimeout(4000);

	// Карточка первого пациента раскрыта сразу, отдельно открывать не нужно.
	const body = await page.evaluate(() => document.body.innerText || "");
	check("карточка пациента на экране", /Карточка пациента/i.test(body));
	check("раздел не в заглушке ошибки", !body.includes("Раздел временно не открылся"));
	for (const [name, pattern] of MARKERS) {
		check(`виден виджет: ${name}`, pattern.test(body), pattern.test(body) ? "" : "на экране нет следа");
	}
	check("ошибок в консоли нет", pageErrors.length === 0, pageErrors.join(" | "));

	await page.screenshot({ path: `${OUT}/patients-card.png`, fullPage: false });
	await context.close();
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
