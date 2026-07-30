/**
 * Какие запросы падают на живом экране и молчат об этом.
 *
 * ЗАЧЕМ. Проверка раздела «Документы» показала «неудачных запросов: 17» и при этом
 * ноль исключений в консоли. Это самый опасный из известных мне узоров: сервер
 * отказал, экран промолчал и нарисовал пустоту. Ошибка типов такого не видит, тест
 * не видит, и на скриншоте раздел выглядит просто «пока пустым».
 *
 * Скрипт заходит под настоящим сотрудником, обходит разделы и записывает КАЖДЫЙ
 * запрос с кодом 400 и выше или оборванный. Для каждого — раздел, метод, путь, код и
 * начало тела ответа. Только чтение: ничего не создаёт и не меняет.
 */
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

/* Обходим ровно те разделы, куда администратор заходит каждый день. */
const РАЗДЕЛЫ = (process.env.VIEWS || "dashboard,schedule,patients,documents,payments,inventory,communications,visit")
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean);

/*
 * Запас попыток — сорок по три секунды.
 *
 * Оба сервера разработки часто перезапускаются сами. Прежние проверки падали с
 * ECONNREFUSED просто потому, что попали в перезапуск, и это была ложная тревога:
 * она стоит не меньше пропущенной поломки.
 */
async function req(path, init = {}, attempts = 40) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 3000));
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
const плохие = [];
const исключения = [];

try {
	const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: "ru-RU" });

	/*
	 * Токены кладём ДО первого исполнения кода страницы, а не после.
	 *
	 * Первая редакция открывала приложение, и только потом записывала токены в
	 * хранилище. Та первая загрузка шла без авторизации и честно получала 401 — то
	 * есть проверка ловила собственную оплошность и предъявляла её как поломку
	 * продукта. Обвинить невиновного тут стоило бы дороже пропуска: инженеры пошли
	 * бы «исправлять» работающую подстановку токенов.
	 */
	await context.addInitScript(
		({ ct, st }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
		},
		{ ct: login.clinicToken, st: unlock.staffToken },
	);

	const page = await context.newPage();

	let текущий = "вход";
	page.on("pageerror", (e) => исключения.push(`${текущий}: ${String(e).slice(0, 200)}`));
	page.on("requestfailed", (request) => {
		плохие.push({
			раздел: текущий,
			метод: request.method(),
			путь: request.url().replace(API, "").replace(WEB, ""),
			код: "оборван",
			тело: request.failure()?.errorText ?? "",
		});
	});
	page.on("response", async (response) => {
		if (response.status() < 400) return;
		/*
		 * Раздел запоминаем СИНХРОННО, до чтения тела.
		 *
		 * Прежняя редакция брала `текущий` уже после `await response.text()`, а
		 * чтение тела разрешается позже — к этому моменту обход успевал уйти на
		 * следующий раздел. Отказы приписывались чужому разделу, и найти виновника
		 * по такому отчёту было нельзя.
		 */
		const раздел = текущий;
		let тело = "";
		try {
			тело = (await response.text()).slice(0, 200);
		} catch {
			тело = "(тело недоступно)";
		}
		плохие.push({
			раздел,
			метод: response.request().method(),
			путь: response.url().replace(API, "").replace(WEB, ""),
			код: String(response.status()),
			тело,
		});
	});

	for (const раздел of РАЗДЕЛЫ) {
		текущий = раздел;
		await page.goto(`${WEB}/#${раздел}`, { waitUntil: "domcontentloaded" });
		/*
		 * Первое открытие раздела в режиме разработки требует сборки модулей на
		 * сервере, и это выглядит как зависшая загрузка. Ждём не фиксированно, а до
		 * тишины в сети: пока в течение трёх секунд не появилось новых запросов.
		 */
		let было = плохие.length;
		let тихо = 0;
		for (let second = 0; second < 30 && тихо < 3; second += 1) {
			await page.waitForTimeout(1000);
			const стало = плохие.length;
			тихо = стало === было ? тихо + 1 : 0;
			было = стало;
		}
	}

	await context.close();
} finally {
	await browser.close();
}

/*
 * Один и тот же отказавший путь повторяется на каждом разделе: React
 * перезапрашивает его при каждом переходе. Считаем по пути, иначе список из
 * семнадцати строк выглядит семнадцатью разными поломками вместо двух.
 */
const свод = new Map();
for (const p of плохие) {
	const ключ = `${p.код} ${p.метод} ${p.путь.split("?")[0]}`;
	const прежний = свод.get(ключ);
	if (прежний) {
		прежний.раз += 1;
		прежний.разделы.add(p.раздел);
		continue;
	}
	свод.set(ключ, { ключ, раз: 1, разделы: new Set([p.раздел]), тело: p.тело });
}

console.log(`разделов обойдено:        ${РАЗДЕЛЫ.length}`);
console.log(`неудачных запросов всего: ${плохие.length}`);
console.log(`различных путей:          ${свод.size}`);
console.log(`исключений в консоли:     ${исключения.length}`);

if (свод.size > 0) {
	console.log("\nОТКАЗЫ, о которых экран не сказал человеку ни слова:\n");
	for (const item of [...свод.values()].sort((a, b) => b.раз - a.раз)) {
		console.log(`  ${item.ключ}`);
		console.log(`      повторов: ${item.раз}, разделы: ${[...item.разделы].join(", ")}`);
		if (item.тело) console.log(`      ответ: ${item.тело.replace(/\s+/g, " ")}`);
	}
}

for (const e of исключения) console.log(`\nисключение — ${e}`);

if (свод.size > 0) process.exit(1);
console.log("\nни один запрос не отказал");
