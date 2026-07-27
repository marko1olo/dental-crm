/**
 * Живая проверка кнопки «Повторить» на карточке записи и того, что ушло
 * взамен пустого «Буфера обмена переноса записей расписания».
 *
 * Буфер был мёртв по построению: `copyToBuffer` в
 * apps/web/src/stores/useScheduleBufferStore.ts не вызывался ни из одного
 * места, вставки не существовало вовсе, а у таблицы schedule_clipboard_items
 * во всём проекте нет ни одного писателя — только SELECT. То есть коробка на
 * экране обещала действие, которого нет.
 *
 * Проверяем настоящим браузером: нажатие «Повторить» заполняет форму новой
 * записи данными существующей, и созданная запись доезжает до базы с тем же
 * пациентом, врачом и креслом.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const MARK = "Проверка повтора записи";

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
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: "ru-RU" });
const page = await context.newPage();
let chairId = null;

try {
	const dash = await req("/api/dashboard", { headers: H }).then((r) => r.json());
	const patients = dash.patients ?? [];
	const staff = (dash.clinicSettings?.staff ?? []).filter((s) => s.active);
	const doctor = staff.find((s) => s.role === "doctor") ?? staff[0];
	const orgId = (
		await client.query(`select organization_id as org from patients where id = $1`, [patients[0].id])
	).rows[0]?.org;
	chairId = (
		await client.query(
			`insert into chairs (organization_id, name, is_active) values ($1, $2, true) returning id`,
			[orgId, MARK],
		)
	).rows[0].id;

	// Исходная запись: сегодня, круглый час, чтобы её было видно в списке дня.
	const base = new Date();
	base.setHours(6, 0, 0, 0);
	const created = await req("/api/appointments", {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			patientId: patients[0].id,
			doctorUserId: doctor.id,
			chairId,
			startsAt: base.toISOString(),
			endsAt: new Date(base.getTime() + 45 * 60_000).toISOString(),
			reason: MARK,
			status: "planned",
		}),
	});
	check("исходная запись создана", created.status === 201, `код ${created.status}`);

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
	await page.waitForTimeout(4000);

	const screenText = await page.evaluate(() => document.body.innerText || "");
	check(
		"пустой буфер обмена ушёл с экрана",
		!screenText.includes("Буфер обмена переноса записей расписания") &&
			!screenText.includes("вклеивания"),
	);
	check("запись видна в расписании", screenText.includes(patients[0].fullName), patients[0].fullName);

	const repeatButtons = page.locator(".appointment-repeat-button");
	const repeatCount = await repeatButtons.count();
	check("на карточке записи есть кнопка «Повторить»", repeatCount >= 1, `кнопок ${repeatCount}`);

	if (repeatCount >= 1) {
		await repeatButtons.first().click();
		await page.waitForTimeout(1200);

		const formState = await page.evaluate(() => {
			const missing = [...document.querySelectorAll("*")]
				.filter((el) => el.children.length === 0)
				.map((el) => (el.textContent || "").trim())
				.filter((t) => t.startsWith("Осталось:"));
			return {
				text: document.body.innerText || "",
				missing: missing[0] ?? null,
				createButtonDisabled: Boolean(
					document.querySelector("button.primary-button[disabled]") &&
						/Создать запись/.test(document.body.innerText || ""),
				),
			};
		});
		check(
			"форма новой записи открылась заполненной: не просит выбрать пациента, врача и кресло",
			!/выберите пациента/.test(formState.missing ?? "") &&
				!/выберите врача/.test(formState.missing ?? "") &&
				!/выберите кресло/.test(formState.missing ?? ""),
			`подсказка: ${formState.missing ?? "нет"}`,
		);

		// Нажимаем «Создать запись» — по-настоящему, как пользователь.
		const createButton = page.getByRole("button", { name: /Создать запись/ });
		const buttonCount = await createButton.count();
		check("кнопка «Создать запись» на экране", buttonCount >= 1, `кнопок ${buttonCount}`);
		if (buttonCount >= 1) {
			await createButton.first().click();
			await page.waitForTimeout(3500);
			const rows = await client.query(
				`select patient_id, doctor_user_id, chair_id, starts_at, reason
				 from appointments where reason = $1 order by starts_at`,
				[MARK],
			);
			check(
				"повтор доехал до базы отдельной записью",
				rows.rows.length === 2,
				`записей с меткой: ${rows.rows.length}`,
			);
			if (rows.rows.length === 2) {
				const [first, second] = rows.rows;
				check(
					"пациент, врач и кресло перенеслись без изменений",
					second.patient_id === first.patient_id &&
						second.doctor_user_id === first.doctor_user_id &&
						second.chair_id === first.chair_id,
					`пациент ${second.patient_id === first.patient_id}, врач ${second.doctor_user_id === first.doctor_user_id}, кресло ${second.chair_id === first.chair_id}`,
				);
				const gapDays =
					(new Date(second.starts_at).getTime() - new Date(first.starts_at).getTime()) /
					(24 * 60 * 60_000);
				check(
					"время повтора сдвинуто на неделю вперёд",
					Math.abs(gapDays - 7) < 0.05,
					`разница ${gapDays.toFixed(2)} суток`,
				);
			}
		}
	}
} finally {
	const gone = await client
		.query(`delete from appointments where reason = $1`, [MARK])
		.catch((e) => {
			console.log(`уборка приёмов не прошла: ${String(e).slice(0, 160)}`);
			return { rowCount: -1 };
		});
	const chairsGone = chairId
		? await client.query(`delete from chairs where id = $1`, [chairId]).catch(() => ({ rowCount: -1 }))
		: { rowCount: 0 };
	console.log(`\nубрано: приёмов ${gone.rowCount}, кресел ${chairsGone.rowCount}`);
	await client.end().catch(() => {});
	await browser.close().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
if (failed.length > 0) {
	for (const c of failed) console.log("  провал:", c.name);
	process.exit(1);
}
