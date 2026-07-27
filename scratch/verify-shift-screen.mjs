/**
 * Живая проверка экрана «Смена» на настоящем API, настоящей базе и настоящем
 * браузере.
 *
 * Что проверяем:
 *  1. Когда приёмов нет вовсе, экран не выдумывает приём. Гидратация базы
 *     подставляет в `activeVisit` заготовку с нулевым UUID, а карточка
 *     «Сейчас в работе» брала пациента из `activePatient` — тот подставляет
 *     первого пациента списка. Клиника с нулём записей видела «прием идет» с
 *     именем случайного человека рядом с надписью «Приемов нет».
 *  2. Заготовка не считается неподписанным приёмом: не порождает срочное дело
 *     «Закрыть медицинскую запись» на несуществующего пациента, предупреждение
 *     «Прием не подписан» и единицу в очереди врача.
 *  3. Когда приём настоящий, «прием идет» показывается с правильным пациентом.
 *  4. Список «Расписание приемов на сегодня» показывает приёмы всей клиники, а
 *     не одного врача, выбранного по первому приёму в выдаче.
 *  5. Блок «Что сделать сейчас» выводит срочные дела с рабочими кнопками.
 *
 * Скрипт заводит кресло, приёмы и черновик приёма и удаляет их за собой.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const NIL = "00000000-0000-0000-0000-000000000000";

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

/** Сервер разработки перезапускается от правок, поэтому запросы с повторами. */
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

const dashboard = () => req("/api/dashboard", { headers: H }).then((r) => r.json());

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" });
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

/** Текст экрана после полной загрузки. */
async function viewText(view = "shift") {
	await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3500);
	return page.evaluate(() => document.body.innerText || "");
}
const shiftText = () => viewText("shift");

/**
 * Метка на всём, что заводит скрипт. Убирать за собой по ней, а не по
 * идентификатору из ответа: `POST /api/appointments` отвечает целым дашбордом,
 * а не созданной записью, поэтому `body.id` там нет — первый вариант уборки
 * молча не удалял ничего, и следующий прогон получал 409 «время занято».
 */
const MARK = "Проверка экрана смены";
let chairId = null;

try {
	// ---------- 1. Пустая клиника ----------
	console.log("\n1. Клиника без приёмов и без открытого приёма");
	const empty = await dashboard();
	check(
		"в выдаче нет приёмов",
		(empty.appointments ?? []).length === 0,
		`приёмов ${(empty.appointments ?? []).length}`,
	);
	check(
		"activeVisit — заготовка с нулевым идентификатором",
		empty.activeVisit?.id === NIL,
		String(empty.activeVisit?.id),
	);
	check(
		"заготовка не порождает срочное дело «Закрыть медицинскую запись»",
		!(empty.recommendedActions ?? []).some((a) => a.id === "action-sign-active-visit"),
		`дел: ${(empty.recommendedActions ?? []).length}`,
	);
	check(
		"заготовка не порождает предупреждение «Прием не подписан»",
		!(empty.shiftIntelligence?.scheduleWarnings ?? []).some((w) => w.id === "unsigned-active-visit"),
	);
	const doctorQueue = (empty.shiftIntelligence?.roleQueues ?? []).find((q) => q.role === "doctor");
	check(
		"очередь врача не блокируется заготовкой",
		!(doctorQueue?.blockedBy ?? []).includes("Есть неподписанный прием"),
		`открыто ${doctorQueue?.openItems}`,
	);

	const emptyText = await shiftText();
	check("экран говорит «Сейчас никого нет в кресле»", emptyText.includes("Сейчас никого нет в кресле"));
	check("экран не заявляет «прием идет»", !emptyText.includes("прием идет"));
	check("есть кнопка «Записать пациента»", emptyText.includes("Записать пациента"));
	check("есть блок «Что сделать сейчас»", emptyText.includes("Что сделать сейчас"));
	check(
		"нет полосы «Фокус: <роль>» с чипами прав доступа",
		!/Фокус:/.test(emptyText) && !/Старт:\s*Настройки/.test(emptyText),
	);
	const focusDuplicate = (emptyText.match(/Управление и перенос данных/g) ?? []).length;
	check(
		"название очереди роли не повторяется на экране",
		focusDuplicate <= 1,
		`вхождений ${focusDuplicate}`,
	);
	check(
		"карточка пациента честно говорит «Пациент не выбран»",
		emptyText.includes("Пациент не выбран"),
	);
	check(
		"карточка не подставляет первого пациента списка",
		!emptyText.includes(`карта #${(empty.patients ?? [])[0]?.id?.slice(0, 6)}`),
		`первый в списке: ${(empty.patients ?? [])[0]?.fullName}`,
	);
	const patientsScreen = await viewText("patients");
	check(
		"в разделе «Пациенты» карточка по-прежнему работает",
		patientsScreen.includes("КАРТОЧКА ПАЦИЕНТА") && !patientsScreen.includes("Пациент не выбран"),
	);
	check(
		"дата рождения показана человеческим видом, не строкой из базы",
		!/\b\d{4}-\d{2}-\d{2}\b/.test(patientsScreen),
		(patientsScreen.match(/Дата рождения: \S+/) ?? ["не найдена"])[0],
	);

	// ---------- 2. Записи на сегодня без открытого приёма ----------
	console.log("\n2. Записи на сегодня, приём ещё не открыт");
	const patients = empty.patients ?? [];
	const staff = (empty.clinicSettings?.staff ?? []).filter((s) => s.active);
	const orgRow = await client.query(
		`select organization_id as org from patients where id = $1`,
		[patients[0].id],
	);
	const orgId = orgRow.rows[0]?.org;
	if (!orgId) throw new Error("не удалось определить организацию");

	const chair = await client.query(
		`insert into chairs (organization_id, name, is_active) values ($1, $2, true) returning id`,
		[orgId, MARK],
	);
	chairId = chair.rows[0].id;

	const doctorA = staff.find((s) => s.role === "doctor") ?? staff[0];
	const doctorB = staff.find((s) => s.id !== doctorA.id && s.canSignMedicalRecords) ?? staff[1] ?? doctorA;

	/**
	 * Один приём уже прошёл, второй ещё впереди: так видно и весь список дня,
	 * и выбор ближайшего приёма.
	 *
	 * Оба обязаны попасть в сегодняшний день. Первый вариант считал время как
	 * `setHours(hour + 6)` и после восьми вечера уносил второй приём на завтра:
	 * проверка падала на целом коде. Поэтому час подбираем и проверяем, что
	 * дата не переехала.
	 */
	const sameCalendarDay = (a, b) => a.toDateString() === b.toDateString();
	const now = new Date();
	const past = new Date(now.getTime() - 3 * 60 * 60_000);
	if (!sameCalendarDay(past, now)) past.setTime(new Date(now).setHours(0, 30, 0, 0));
	let future = new Date(now.getTime() + 90 * 60_000);
	if (!sameCalendarDay(future, now)) future = new Date(now.getTime() + 3 * 60_000);
	const futureIsToday = sameCalendarDay(future, now) && future.getTime() > now.getTime();

	async function book(patientId, doctorUserId, startsAt, minutes) {
		const res = await req("/api/appointments", {
			method: "POST",
			headers: H,
			body: JSON.stringify({
				patientId,
				doctorUserId,
				chairId,
				startsAt: startsAt.toISOString(),
				endsAt: new Date(startsAt.getTime() + minutes * 60_000).toISOString(),
				reason: MARK,
				status: "planned",
			}),
		});
		const body = await res.json().catch(() => ({}));
		return { status: res.status, body };
	}

	const first = await book(patients[0].id, doctorA.id, past, 30);
	const second = await book(patients[1].id, doctorB.id, future, 30);
	check(
		"оба приёма созданы",
		first.status === 201 && second.status === 201,
		`${first.status}/${second.status} ${String(first.body?.message ?? second.body?.message ?? "").slice(0, 120)}`,
	);

	const booked = await dashboard();
	check(
		"приёмы видны в выдаче",
		(booked.appointments ?? []).length >= 2,
		`приёмов ${(booked.appointments ?? []).length}`,
	);
	check(
		"открытого приёма по-прежнему нет",
		booked.activeVisit?.id === NIL,
		String(booked.activeVisit?.id),
	);

	const bookedText = await shiftText();
	check("экран не заявляет «прием идет» без открытого приёма", !bookedText.includes("прием идет"));
	if (futureIsToday) {
		check(
			"экран называет ближайший приём сегодня",
			bookedText.includes("Ближайший прием сегодня"),
		);
		check(
			"у ближайшего приёма есть кнопка «Начать прием»",
			bookedText.includes("Начать прием"),
		);
		check(
			"в шапке стоит пациент ближайшего приёма",
			bookedText.includes(patients[1].fullName),
			patients[1].fullName,
		);
	} else {
		console.log("  ПРОПУСК ветка «ближайший приём»: сейчас поздний час, будущий слот не влезает в сегодня");
	}
	check(
		"список дня показывает приём первого врача",
		bookedText.includes(patients[0].fullName),
		`ожидали ${patients[0].fullName}`,
	);
	check(
		"список дня показывает приём второго врача",
		bookedText.includes(patients[1].fullName),
		`ожидали ${patients[1].fullName}${doctorB.id === doctorA.id ? " (второго врача в клинике нет)" : ""}`,
	);
	// Без `\b`: в JS граница слова определена по ASCII, и `\bприема\b` на
	// кириллице не совпадает никогда — проверка падала на целом коде.
	check(
		"счётчик дня показывает оба приёма",
		bookedText.includes("2 приема"),
		(bookedText.match(/\d+ прием(а|ов)?/) ?? ["не найден"])[0],
	);

	// ---------- 3. Настоящий открытый приём ----------
	console.log("\n3. Открытый черновик приёма настоящего пациента");
	await client.query(
		`insert into visits (organization_id, patient_id, status, complaint, revision)
		 values ($1, $2, 'draft', $3, 1)`,
		[orgId, patients[2].id, `${MARK}: жалоба черновика`],
	);

	const seeded = await dashboard();
	check(
		"activeVisit — настоящий приём настоящего пациента",
		seeded.activeVisit?.id !== NIL && seeded.activeVisit?.patientId === patients[2].id,
		`${seeded.activeVisit?.id} / ${seeded.activeVisit?.patientId}`,
	);
	check(
		"настоящий черновик снова даёт срочное дело врачу",
		(seeded.recommendedActions ?? []).some((a) => a.id === "action-sign-active-visit"),
	);

	const seededText = await shiftText();
	check("экран показывает «прием идет»", seededText.includes("прием идет"));
	check(
		"в кресле именно пациент открытого приёма",
		seededText.includes(patients[2].fullName),
		patients[2].fullName,
	);
	check(
		"пустое состояние ушло",
		!seededText.includes("Сейчас никого нет в кресле"),
	);
	check(
		"карточка пациента показывает пациента открытого приёма",
		!seededText.includes("Пациент не выбран") &&
			seededText.includes(`карта #${patients[2].id.slice(0, 6)}`),
		`карта #${patients[2].id.slice(0, 6)}`,
	);
} finally {
	// Уборка по метке и с отчётом: молчаливый провал уборки оставлял приёмы в
	// базе, и следующий прогон валился на 409 вместо настоящего результата.
	let leftovers = 0;
	try {
		const appointmentsGone = await client.query(`delete from appointments where reason = $1`, [MARK]);
		const visitsGone = await client.query(`delete from visits where complaint like $1`, [`${MARK}%`]);
		const chairsGone = await client.query(`delete from chairs where name = $1`, [MARK]);
		console.log(
			`\nубрано: приёмов ${appointmentsGone.rowCount}, черновиков ${visitsGone.rowCount}, кресел ${chairsGone.rowCount}`,
		);
		const rest = await client.query(
			`select (select count(*) from appointments where reason = $1)
			      + (select count(*) from visits where complaint like $2)
			      + (select count(*) from chairs where name = $1) as rest`,
			[MARK, `${MARK}%`],
		);
		leftovers = Number(rest.rows[0]?.rest ?? 0);
	} catch (error) {
		console.log(`\nуборка не прошла: ${String(error).slice(0, 200)}`);
		leftovers = -1;
	}
	if (leftovers !== 0) {
		check("уборка за собой прошла", false, `осталось записей: ${leftovers}, кресло ${chairId}`);
	}
	await client.end().catch(() => {});
	await browser.close().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
if (failed.length > 0) {
	console.log("провалились:");
	for (const c of failed) console.log("  -", c.name);
	process.exit(1);
}
