/**
 * Живая проверка: история открытых карточек наконец наполняется.
 *
 * Таблица recent_patient_history читалась маршрутом GET /api/hr/recent-patients
 * и показывалась виджетом «Недавние» в шапке рабочего места. Вставки не было
 * нигде: ни одной в исходниках сервера, ноль строк в живой базе. Виджет писал
 * «История просмотров пуста» всем и всегда.
 *
 * Скрипт работает через настоящий сервер: отмечает просмотр, читает список,
 * проверяет порядок, личность истории, отказ на чужого пациента и обрезание до
 * десяти. Всё созданное удаляет из базы.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
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

/** Заведённые проверкой пациенты: удаляются в любом случае. */
let temporaryPatientIds = [];

const mark = (patientId) =>
	req("/api/hr/recent-patients", { method: "POST", headers: H, body: JSON.stringify({ patientId }) });
const list = () => req("/api/hr/recent-patients", { headers: H }).then((r) => r.json());

try {
	/*
	 * Начинаем с чистого листа.
	 *
	 * Здесь стояла проверка «таблица пуста» — она доказывала, что до правки в
	 * историю не писал никто. Один раз это было правдой и записано в коммите.
	 * Дальше проверка стала опровергать сама себя: собственный прогон открывает
	 * карточку в браузере и наполняет таблицу, и следующий запуск честно падал
	 * на первой же строке. Проверка, ломающаяся от того, что проверяемое
	 * работает, только отвлекает.
	 */
	const before = await client.query(
		`delete from recent_patient_history where user_id = $1 returning id`,
		[OWNER],
	);
	console.log(`  подготовка: убрано записей от прошлых прогонов — ${before.rowCount}`);

	const patients = await client.query(
		`select id, full_name from patients where organization_id = (
			select organization_id from users where id = $1
		) order by created_at limit 12`,
		[OWNER],
	);
	check("в клинике есть пациенты для проверки", patients.rows.length >= 2, `${patients.rows.length}`);
	if (patients.rows.length < 2) throw new Error("мало пациентов");

	// Одна отметка: карточка обязана появиться в списке.
	const first = patients.rows[0];
	const marked = await mark(first.id);
	check("отметка о просмотре принята", marked.status === 200, `код ${marked.status}`);
	let history = await list();
	check("карточка появилась в истории", history[0]?.patientId === first.id, history[0]?.patientName);
	check("имя пациента совпадает с настоящим", history[0]?.patientName === first.full_name, history[0]?.patientName);

	// Вторая карточка обязана встать выше первой: список по времени просмотра.
	const second = patients.rows[1];
	await mark(second.id);
	history = await list();
	check(
		"последняя открытая стоит первой",
		history[0]?.patientId === second.id && history[1]?.patientId === first.id,
		history.map((h) => h.patientName).join(" | "),
	);

	// Повторное открытие той же карточки не плодит строки.
	await mark(first.id);
	history = await list();
	const firstEntries = history.filter((h) => h.patientId === first.id);
	check("повторное открытие не задваивает карточку", firstEntries.length === 1, `строк ${firstEntries.length}`);
	check("повторно открытая снова наверху", history[0]?.patientId === first.id, history[0]?.patientName);

	// Чужой пациент через тело запроса не проходит.
	const foreign = await mark("00000000-0000-0000-0000-000000000000");
	check("несуществующий пациент отклонён", foreign.status === 404, `код ${foreign.status}`);
	const withoutBody = await req("/api/hr/recent-patients", { method: "POST", headers: H, body: "{}" });
	check("запрос без пациента отклонён", withoutBody.status === 400, `код ${withoutBody.status}`);

	// Без входа сотрудника история не отдаётся: она личная.
	const anonymous = await req("/api/hr/recent-patients", {
		headers: { "x-dente-clinic-token": login.clinicToken },
	});
	check("без входа сотрудника история закрыта", anonymous.status === 401, `код ${anonymous.status}`);

	/*
	 * Обрезание до десяти.
	 *
	 * В демонстрационной клинике всего три пациента, а обрезание начинается с
	 * одиннадцатого. Первая редакция проверки просто печатала «пропуск» — то
	 * есть самая вероятная на ошибку часть (границы, поведение notInArray)
	 * оставалась непроверенной, а итог выглядел зелёным. Поэтому заводим
	 * двенадцать временных пациентов и удаляем их в конце.
	 */
	const created = [];
	for (let i = 1; i <= 12; i += 1) {
		const inserted = await client.query(
			`insert into patients (organization_id, full_name, phone, status)
			 values ((select organization_id from users where id = $1), $2, $3, 'active')
			 returning id`,
			[OWNER, `ВРЕМЕННЫЙ ПРОВЕРОЧНЫЙ ${i}`, `+7900000${String(i).padStart(4, "0")}`],
		);
		created.push(inserted.rows[0].id);
	}
	temporaryPatientIds = created;
	for (const id of created) await mark(id);
	history = await list();
	check("в списке не больше десяти", history.length === 10, `строк ${history.length}`);
	const stored = await client.query(
		`select count(*)::int as n from recent_patient_history where user_id = $1`,
		[OWNER],
	);
	check("в базе тоже не больше десяти", stored.rows[0].n === 10, `строк ${stored.rows[0].n}`);
	check(
		"остались именно последние десять, а не первые",
		history[0]?.patientName === "ВРЕМЕННЫЙ ПРОВЕРОЧНЫЙ 12" &&
			!history.some((h) => h.patientName === "ВРЕМЕННЫЙ ПРОВЕРОЧНЫЙ 1"),
		history.map((h) => h.patientName.replace("ВРЕМЕННЫЙ ПРОВЕРОЧНЫЙ ", "№")).join(" "),
	);
	/*
	 * Весь путь целиком, через браузер.
	 *
	 * Маршруты можно починить и не подключить: отметка ставится в useAppLogic по
	 * смене выбранного пациента, а не в обработчике нажатия. Проверка через API
	 * этого не увидит — она сама зовёт маршрут.
	 */
	await client.query(`delete from recent_patient_history where user_id = $1`, [OWNER]);
	const { chromium } = await import("playwright");
	const browser = await chromium.launch({ headless: true });
	try {
		const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, locale: "ru-RU" });
		const page = await context.newPage();
		await page.goto(process.env.DENTE_WEB_URL || "http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
		await page.evaluate(
			({ ct, st }) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_theme_mode", "light");
				localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
			},
			{ ct: login.clinicToken, st: unlock.staffToken },
		);
		await page.goto(`${process.env.DENTE_WEB_URL || "http://127.0.0.1:5173"}/#patients`, {
			waitUntil: "domcontentloaded",
		});
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(5000);

		const rows = await client.query(
			`select patient_name from recent_patient_history where user_id = $1`,
			[OWNER],
		);
		check(
			"открытая в браузере карточка записалась в историю",
			rows.rows.length > 0,
			rows.rows.map((r) => r.patient_name).join(", "),
		);

		const badge = await page.evaluate(() => {
			const summary = Array.from(document.querySelectorAll("summary")).find((s) =>
				(s.textContent || "").includes("Недавние"),
			);
			return summary?.textContent?.replace(/\s+/g, " ").trim() ?? null;
		});
		check("счётчик «Недавние» в шапке перестал показывать ноль", badge !== null && !/\b0\b/.test(badge), String(badge));
		await context.close();
	} finally {
		await browser.close();
	}
} finally {
	await client.query(`delete from recent_patient_history where user_id = $1`, [OWNER]).catch(() => {});
	if (temporaryPatientIds.length > 0) {
		const removed = await client
			.query(`delete from patients where id = any($1::uuid[]) returning id`, [temporaryPatientIds])
			.catch(() => ({ rowCount: -1 }));
		console.log(`удалено временных пациентов: ${removed.rowCount} из ${temporaryPatientIds.length}`);
	}
	await client.end().catch(() => {});
	console.log("созданные записи истории удалены");
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
