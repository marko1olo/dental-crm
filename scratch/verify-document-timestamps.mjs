/**
 * Живая проверка: отметка времени в документе равна моменту создания.
 *
 * В хранилище документов девятнадцать полей даты и времени вычислялись ОДИН РАЗ
 * при загрузке модуля выражениями вида
 * `(() => new Date().toLocaleString("ru-RU"))()`. Значение равнялось моменту
 * открытия страницы и больше никогда не обновлялось. Администратор открывал
 * вкладку утром, вечером создавал договор — «Подписано», «Дата подтверждения
 * согласия», «Дата и время выдачи расписки» несли утренний час. Отличить
 * подставленное от введённого нельзя: поле выглядит заполненным. Для документа,
 * который подписывают, это подделка отметки времени.
 *
 * Проверяется две вещи, и обе нужны:
 *   поле на экране ПУСТО — значит при загрузке страницы ничего не вычисляется;
 *   в созданном документе отметка стоит и близка к моменту создания — значит
 *     подстановка на месте и человеку не пришлось вписывать её руками.
 *
 * Всё созданное удаляется.
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

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
let createdId = null;
/** Момент запуска проверки: с ним сверяется отметка в созданном документе. */
const startedAt = new Date();

try {
	const { chromium } = await import("playwright");
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
		await page.goto(`${WEB}/#documents`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(4000);

		/*
		 * Вид документа называется «Согласие», а не «Договор».
		 *
		 * Первая редакция искала «договор» и не находила ничего: у
		 * informed_consent метка в packages/shared — «Согласие», полное имя
		 * «Информированное добровольное согласие». У согласия есть поле «Дата
		 * подтверждения» — именно та отметка, которая раньше замерзала на моменте
		 * загрузки страницы.
		 */
		const picked = await page.evaluate(() => {
			for (const select of Array.from(document.querySelectorAll("select"))) {
				const option = Array.from(select.options).find((o) => /соглас/i.test(o.textContent || ""));
				if (!option) continue;
				select.value = option.value;
				select.dispatchEvent(new Event("change", { bubbles: true }));
				return option.textContent?.trim() ?? null;
			}
			return null;
		});
		check("вид документа «Согласие» выбран", Boolean(picked), String(picked));
		await page.waitForTimeout(1500);
		await page.evaluate(() => {
			for (const details of Array.from(document.querySelectorAll("details"))) details.open = true;
		});
		await page.waitForTimeout(600);

		/*
		 * Поля отметок обязаны быть пустыми: при загрузке страницы ничего не
		 * вычисляется. Ищем по подписи, а не по порядку — состав формы меняется.
		 */
		const stamps = await page.evaluate(() => {
			const out = [];
			for (const label of Array.from(document.querySelectorAll("label"))) {
				const caption = (label.childNodes[0]?.textContent || "").trim();
				if (!/^(Дата|Подписано|Время|Дата подтверждения|Дата и время)/i.test(caption)) continue;
				const field = label.querySelector("input, textarea");
				if (field) out.push({ caption, value: field.value });
			}
			return out;
		});
		check("поля отметок найдены на экране", stamps.length > 0, stamps.map((s) => s.caption).join(", "));
		const filledAtLoad = stamps.filter((s) => s.value.trim() !== "");
		/*
		 * Проверка требует найденных полей.
		 *
		 * Первая редакция звучала «при загрузке отметки не подставлены» и на пустом
		 * списке проходила зелёным: полей не нашлось — заполненных тоже нет. Такой
		 * «OK» ничего не доказывает и опаснее отсутствия проверки.
		 */
		check(
			"при загрузке страницы отметки не подставлены",
			stamps.length > 0 && filledAtLoad.length === 0,
			stamps.length === 0
				? "полей не нашлось — проверять нечего"
				: filledAtLoad.map((s) => `${s.caption}=${s.value}`).join(" | ") || `все ${stamps.length} пусты`,
		);

		/*
		 * Создаём документ настоящей кнопкой.
		 *
		 * Первая редакция посылала POST /api/documents напрямую и получала 409:
		 * сервер проверяет бизнес-правила (validateDocumentCreation), и запрос без
		 * содержимого документа справедливо отклоняется. Но проверять надо не
		 * контракт маршрута, а то, что происходит, когда человек нажимает
		 * «Создать» при ПУСТЫХ отметках времени. Если бы правка сломала
		 * подстановку, здесь появилась бы ошибка про незаполненную дату.
		 */
		/*
		 * Форму надо заполнить: согласие без названия вмешательства не создаётся, и
		 * это правильно. Первая редакция сразу жала «Создать» и объявляла поломкой
		 * честный отказ «Заполните поле: планируемое вмешательство».
		 *
		 * Пустые поля заполняются проверочным текстом, кроме отметок времени — их
		 * оставляем пустыми НАМЕРЕННО, потому что именно их подстановку в момент
		 * создания мы и проверяем.
		 */
		const filledFields = await page.evaluate(() => {
			const stampLike = /^(Дата|Подписано|Время|Дата подтверждения|Дата и время)/i;
			let count = 0;
			const setValue = (field, value) => {
				const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
				const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set;
				setter?.call(field, value);
				field.dispatchEvent(new Event("input", { bubbles: true }));
				field.dispatchEvent(new Event("change", { bubbles: true }));
				count += 1;
			};
			for (const label of Array.from(document.querySelectorAll("label"))) {
				const caption = (label.childNodes[0]?.textContent || "").trim();
				if (stampLike.test(caption)) continue;
				const field = label.querySelector("input, textarea");
				if (!field || field.value.trim() !== "") continue;
				if (field instanceof HTMLInputElement && field.type === "checkbox") {
					if (!field.checked) {
						field.click();
						count += 1;
					}
					continue;
				}
				if (field instanceof HTMLInputElement && field.type === "date") continue;
				setValue(field, "Проверка подстановки времени");
			}
			// Обязательные подтверждения — отдельные галочки вне подписанных полей.
			for (const box of Array.from(document.querySelectorAll('input[type="checkbox"]'))) {
				if (!box.checked) {
					box.click();
					count += 1;
				}
			}
			return count;
		});
		check("форма заполнена перед созданием", filledFields > 0, `полей заполнено: ${filledFields}`);
		await page.waitForTimeout(1200);

		const documentsBefore = Number(
			(await client.query(`select count(*)::int as n from generated_documents`)).rows[0].n,
		);
		const clicked = await page.evaluate(() => {
			const button = Array.from(document.querySelectorAll("button")).find(
				(b) => (b.textContent || "").trim().startsWith("Создать") && !b.disabled,
			);
			if (!(button instanceof HTMLElement)) return null;
			button.click();
			return (button.textContent || "").trim();
		});
		check("кнопка создания найдена и доступна", Boolean(clicked), String(clicked));
		await page.waitForTimeout(4000);

		const screenText = await page.evaluate(() => document.body.innerText || "");
		check(
			"нет жалобы на незаполненную дату или время",
			!/укажите дат|заполните дат|не указана дат|укажите время|Заполните поле: .*дат/i.test(screenText),
			(screenText.match(/[^\n]*(укажите дат|заполните дат|укажите время|Заполните поле: [^\n]*дат[^\n]*)[^\n]*/i) ?? ["жалоб нет"])[0],
		);
		const complaint = screenText.match(/Заполните поле:[^\n]*/i);
		if (complaint) console.log(`  примечание: экран просит ещё — ${complaint[0]}`);

		const documentsAfter = await client.query(
			`select id, payload_json from generated_documents order by created_at desc limit 1`,
		);
		const grew =
			Number((await client.query(`select count(*)::int as n from generated_documents`)).rows[0].n) >
			documentsBefore;
		check("документ действительно создан", grew, grew ? String(documentsAfter.rows[0]?.id) : "число документов не выросло");
		if (grew) createdId = documentsAfter.rows[0]?.id ?? null;

		check("ошибок в консоли нет", pageErrors.length === 0, pageErrors.join(" | "));
		await page.screenshot({ path: "scratch/shots-documents-stamps.png", fullPage: false });
		await context.close();
	} finally {
		await browser.close();
	}

	/*
	 * Что именно легло в базу.
	 *
	 * Отметку ищем в payload_json: разные виды документов держат её под своими
	 * именами, поэтому смотрим на любое значение, похожее на русскую дату со
	 * временем, и сверяем с моментом запуска проверки.
	 */
	if (createdId) {
		const row = (
			await client.query(`select payload_json, created_at from generated_documents where id = $1`, [createdId])
		).rows[0];
		const payload = typeof row?.payload_json === "string" ? row.payload_json : JSON.stringify(row?.payload_json ?? {});
		const stamp = payload.match(/\d{2}\.\d{2}\.\d{4},?\s+\d{1,2}:\d{2}/);
		check("в документе есть отметка времени", Boolean(stamp), stamp ? stamp[0] : "отметки нет в содержимом");
		if (stamp) {
			const [datePart, timePart] = stamp[0].replace(",", "").split(/\s+/);
			const [day, month, year] = datePart.split(".");
			const [hour, minute] = timePart.split(":");
			const stamped = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
			const driftMinutes = Math.abs(stamped.getTime() - startedAt.getTime()) / 60000;
			check(
				"отметка близка к моменту создания, а не к загрузке страницы",
				driftMinutes <= 5,
				`расхождение ${driftMinutes.toFixed(1)} мин, отметка ${stamp[0]}`,
			);
		}
	}
} finally {
	if (createdId) {
		const removed = await client
			.query(`delete from generated_documents where id = $1 returning id`, [createdId])
			.catch(() => ({ rowCount: -1 }));
		console.log(`\nудалено проверочных документов: ${removed.rowCount}`);
	}
	await client.end().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
