/**
 * Живая проверка склада: материал заводится, правится и удаляется по-настоящему.
 *
 * Экран склада до этого был недоступен вовсе (вкладки не существовало), а внутри
 * него:
 *   кнопка-корзина у материала и у правила списания не давала никакого отклика —
 *     обработчик складывал окно подтверждения в состояние, которое нигде не
 *     рисовалось, и компонента подтверждения в проекте не было;
 *   правка материала молча теряла артикул и штрихкод: форма их присылала, а
 *     сервер в .set() не писал;
 *   колонка «Партия / Срок» читала поля, которых не было ни в базе, ни в ответе
 *     сервера, и всегда показывала «Не указан»; ввести срок было негде;
 *   предупреждение о просрочке красилось цветом var(--tomato) — токена с таким
 *     именем в проекте нет, так что предупреждение не было видно.
 *
 * Скрипт проходит путь целиком через настоящий сервер и настоящий браузер.
 * Всё созданное удаляет.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	for (const file of [".env", "apps/api/.env", ".env.local"]) {
		let env;
		try {
			env = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
		if (line) return line.slice("DATABASE_URL=".length).trim();
	}
	throw new Error("DATABASE_URL не найден");
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
const H = {
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const created = [];

/** Дата в виде, который отдаёт поле ввода типа date. */
const isoDay = (shiftDays) => {
	const day = new Date();
	day.setDate(day.getDate() + shiftDays);
	return day.toISOString().slice(0, 10);
};

try {
	const orgId = (await client.query(`select organization_id from users where id = $1`, [OWNER]))
		.rows[0].organization_id;

	// ── Создание с партией и сроком годности ──────────────────────────────────
	const createResponse = await req(`/api/inventory/${orgId}`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			name: "ПРОВЕРКА Композит",
			criticalThreshold: 3,
			unitCostRub: 1250.5,
			stockQuantity: 10,
			sku: "ART-001",
			barcode: "4600000000017",
			lotNumber: "L-2026-07",
			expirationDate: isoDay(400),
		}),
	});
	check("материал создан", createResponse.status === 200, `код ${createResponse.status}`);
	const item = await createResponse.json();
	if (item?.id) created.push(item.id);
	check("срок годности сохранён", item?.expirationDate === isoDay(400), String(item?.expirationDate));
	check("партия сохранена", item?.lotNumber === "L-2026-07", String(item?.lotNumber));
	/*
	 * Сравниваем число, а не его запись.
	 *
	 * Первая редакция ждала строку «1250.50» и падала на «1250.5» — это то же
	 * значение. Колонка unit_cost_rub объявлена numeric без mode "number":
	 * драйвер отдаёт число (его приводит наш разборщик типов из
	 * db/moneyTypeParsers.ts), а drizzle гонит его через String(), где хвостовой
	 * ноль теряется. Значение верное, запись другая — и проверять надо значение.
	 */
	check("цена сохранена с копейками", Number(item?.unitCostRub) === 1250.5, String(item?.unitCostRub));

	// ── Правка: артикул и штрихкод раньше терялись молча ──────────────────────
	const updateResponse = await req(`/api/inventory/${orgId}/${item.id}`, {
		method: "PUT",
		headers: H,
		body: JSON.stringify({
			name: "ПРОВЕРКА Композит",
			criticalThreshold: 3,
			unitCostRub: 1250.5,
			sku: "ART-002",
			barcode: "4600000000024",
			lotNumber: "L-2026-08",
			expirationDate: isoDay(10),
		}),
	});
	check("правка принята", updateResponse.status === 200, `код ${updateResponse.status}`);
	const updated = await updateResponse.json();
	check("артикул после правки сохранился", updated?.sku === "ART-002", String(updated?.sku));
	check("штрихкод после правки сохранился", updated?.barcode === "4600000000024", String(updated?.barcode));
	check("срок годности после правки сохранился", updated?.expirationDate === isoDay(10), String(updated?.expirationDate));

	// ── Непонятная дата не должна тихо превращаться в «срока нет» ─────────────
	const badDate = await req(`/api/inventory/${orgId}/${item.id}`, {
		method: "PUT",
		headers: H,
		body: JSON.stringify({ name: "ПРОВЕРКА Композит", expirationDate: "31.03.2027" }),
	});
	check("непонятная дата отклонена, а не обнулена", badDate.status === 400, `код ${badDate.status}`);
	const badDateBody = await badDate.json().catch(() => ({}));
	check(
		"отказ объяснён по-русски",
		typeof badDateBody.message === "string" && /срок годности/i.test(badDateBody.message),
		String(badDateBody.message),
	);
	/*
	 * Драйвер отдаёт колонку date объектом Date, а не строкой.
	 *
	 * Первая редакция сравнивала `String(значение).slice(0, 10)` и получала
	 * «Fri Aug 0» — проверка падала на верных данных. Сравниваем календарный
	 * день по местному времени: колонка date часового пояса не несёт, и
	 * toISOString сдвинул бы дату на сутки при отрицательном смещении.
	 */
	const notWiped = await client.query(`select expiration_date from inventory_items where id = $1`, [item.id]);
	const storedDay = notWiped.rows[0]?.expiration_date;
	const asLocalDay = (value) =>
		value instanceof Date
			? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
			: String(value ?? "").slice(0, 10);
	check(
		"после отказа прежний срок остался в базе",
		asLocalDay(storedDay) === isoDay(10),
		`${asLocalDay(storedDay)} против ${isoDay(10)}`,
	);

	// ── Экран: колонка срока и окно подтверждения ─────────────────────────────
	const { chromium } = await import("playwright");
	const browser = await chromium.launch({ headless: true });
	try {
		for (const theme of ["light", "dark"]) {
			const context = await browser.newContext({ viewport: { width: 1600, height: 1150 }, locale: "ru-RU" });
			const page = await context.newPage();
			const pageErrors = [];
			page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 140)));
			await page.goto(WEB, { waitUntil: "domcontentloaded" });
			await page.evaluate(
				({ ct, st, th }) => {
					localStorage.setItem("dente_clinic_token", ct);
					localStorage.setItem("dente_staff_token", st);
					localStorage.setItem("dente_theme_mode", th);
					localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
				},
				{ ct: login.clinicToken, st: unlock.staffToken, th: theme },
			);
			/*
			 * Склад живёт на своём разделе, а не во вкладке настроек.
			 *
			 * Сначала он был недоступен вовсе, и я открыл его вкладкой
			 * #settings/inventory. Правильнее оказалось иначе: приход и списание
			 * материалов — ежедневная работа ассистента, поэтому склад стал
			 * разделом рабочего места с правами по ролям, а вкладка убрана, чтобы
			 * не было двух дверей в одну комнату.
			 */
			await page.goto(`${WEB}/#inventory`, { waitUntil: "domcontentloaded" });
			await page.reload({ waitUntil: "domcontentloaded" });
			await page.waitForTimeout(4500);

			const text = await page.evaluate(() => document.body.innerText || "");
			check(`[${theme}] материал виден на экране`, text.includes("ПРОВЕРКА Композит"));
			check(`[${theme}] колонка срока больше не пишет «Не указан»`, !text.includes("Не указан"), "");
			check(
				`[${theme}] срок показан с остатком дней`,
				/Годен до .*осталось \d+ (день|дня|дней)/.test(text) || /осталось 10 дней/.test(text),
				(text.match(/Годен до[^\n]*/) ?? [""])[0],
			);
			check(
				`[${theme}] предупреждение о сроке действительно окрашено`,
				await page.evaluate(() => {
					const mark = document.querySelector(".inventory-expiry-soon, .inventory-expiry-expired");
					if (!mark) return false;
					const color = getComputedStyle(mark).color;
					// Обычный текст в этой колонке серый var(--muted); окрашенный — нет.
					return color !== getComputedStyle(mark.closest("td")).color;
				}),
			);

			/*
			 * Корзина обязана открыть окно подтверждения.
			 *
			 * Первая редакция брала последнюю кнопку в строке и попадала в
			 * «Оприходовать»: после корзины идут ещё две кнопки прихода и расхода.
			 * Ищем по подписи, а не по порядку.
			 */
			const opened = await page.evaluate(() => {
				const row = Array.from(document.querySelectorAll("tr")).find((r) =>
					(r.innerText || "").includes("ПРОВЕРКА Композит"),
				);
				const trash = row?.querySelector('button[title="Удалить"]');
				if (!(trash instanceof HTMLElement)) return false;
				trash.click();
				return true;
			});
			check(`[${theme}] кнопка удаления найдена`, opened);
			await page.waitForTimeout(600);
			const dialog = await page.evaluate(() => {
				const window = document.querySelector(".inventory-confirm-window");
				return window ? (window.innerText || "").replace(/\s+/g, " ").trim() : null;
			});
			check(`[${theme}] окно подтверждения появилось`, dialog !== null, String(dialog));

			// Отмена не должна ничего удалять.
			await page.evaluate(() => {
				const cancel = document.querySelector(".inventory-confirm-cancel");
				if (cancel instanceof HTMLElement) cancel.click();
			});
			await page.waitForTimeout(500);
			const stillThere = await client.query(`select id from inventory_items where id = $1`, [item.id]);
			check(`[${theme}] отмена оставила материал на месте`, stillThere.rowCount === 1);
			/*
			 * Деньги на складе печатает общая money(): копейки не теряются.
			 *
			 * Разряды сравниваем после нормализации пробелов. toLocaleString("ru-RU")
			 * разделяет разряды неразрывным пробелом (U+00A0), а местами узким
			 * неразрывным (U+202F) — поиск по обычному пробелу не находил верную
			 * строку, и проверка падала на исправном экране.
			 */
			const plainText = text.replace(/[  ]/g, " ");
			check(
				`[${theme}] цена показана с копейками`,
				plainText.includes("1 250,50 ₽"),
				(plainText.match(/1 ?250[,.]\d+ ?₽/) ?? ["не нашёл цену на экране"])[0],
			);
			/*
			 * Дефицит считается числами, а не строками.
			 *
			 * Остаток и минимальный запас приходят с сервера строками (колонки
			 * numeric без mode "number"), а тип обещает числа. Сравнение
			 * "10" <= "3" по строкам — правда, и склад показывал «в дефиците 1»
			 * при полном материале. Видно было на снимке: красная плашка у
			 * остатка 10 при запасе 3.
			 */
			const shortageCount = await page.evaluate(() => {
				/*
				 * Подпись в разметке написана как «В дефиците», а заглавные делает
				 * CSS через text-transform. Первая редакция сравнивала с «В ДЕФИЦИТЕ»
				 * и не находила ничего: textContent отдаёт исходный текст, а не
				 * отображаемый.
				 */
				const marker = Array.from(document.querySelectorAll("span")).find(
					(n) => (n.textContent || "").trim().toLowerCase() === "в дефиците",
				);
				const value = marker?.nextElementSibling;
				return value ? (value.textContent || "").trim() : null;
			});
			check(
				`[${theme}] остаток 10 при запасе 3 не считается дефицитом`,
				shortageCount === "0",
				`в дефиците: ${shortageCount}`,
			);
			check(`[${theme}] ошибок в консоли нет`, pageErrors.length === 0, pageErrors.join(" | "));

			if (theme === "dark") {
				await page.screenshot({ path: "scratch/shots-inventory-dark.png", fullPage: false });
			} else {
				await page.screenshot({ path: "scratch/shots-inventory-light.png", fullPage: false });
			}
			await context.close();
		}
	} finally {
		await browser.close();
	}

	// ── Удаление через сервер ─────────────────────────────────────────────────
	/*
	 * DELETE идёт без Content-Type.
	 *
	 * Первая редакция посылала общий набор заголовков, включая
	 * Content-Type: application/json, при пустом теле — fastify справедливо
	 * отвечал 400 «Body cannot be empty». Настоящий клиент такого заголовка на
	 * удалении не ставит, так что проверка ловила саму себя.
	 */
	const deleteResponse = await req(`/api/inventory/${orgId}/${item.id}`, {
		method: "DELETE",
		headers: {
			"x-dente-clinic-token": login.clinicToken,
			"x-dente-staff-token": unlock.staffToken,
		},
	});
	check("удаление принято сервером", deleteResponse.status === 200, `код ${deleteResponse.status}`);
	const gone = await client.query(`select id from inventory_items where id = $1`, [item.id]);
	check("материала в базе больше нет", gone.rowCount === 0);
	if (gone.rowCount === 0) created.length = 0;
} finally {
	if (created.length > 0) {
		const removed = await client
			.query(`delete from inventory_items where id = any($1::uuid[]) returning id`, [created])
			.catch(() => ({ rowCount: -1 }));
		console.log(`\nубрано проверочных материалов: ${removed.rowCount}`);
	}
	await client.end().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
