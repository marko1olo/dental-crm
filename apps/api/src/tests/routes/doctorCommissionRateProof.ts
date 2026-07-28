/**
 * Живое доказательство того, что ставку врача теперь можно ЗАДАТЬ, и что
 * заданное число попадает в расчёт выплат.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Процент от кассы, по которому клиника платит
 * врачу, не задавался ни на одном достижимом экране. Во всём вебе поле
 * процента жило ровно в одном месте — в шаге мастера первого запуска, которого
 * не рендерил никто. На сервере писателей `doctor_commissions.commission_pct`
 * было два, и оба мимо владельца клиники: мёртвый маршрут того же мастера и
 * `routes/diary.ts`, который при первом закрытии приёма молча вставляет 30 %.
 * Экран выплат честно печатал «не задана», владелец шёл исправлять — и не
 * находил куда. Клиника платила по проценту, которого никто не согласовывал.
 * Это деньги с точностью до копейки.
 *
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает). Формулу
 * выплат закрепляет `src/services/finance/doctorPayouts.test.ts`; здесь
 * измеряется то, что статическим разбором не доказывается: доходит ли введённое
 * число до базы и меняет ли оно сумму к выплате.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/routes/doctorCommissionRateProof.ts
 *
 * Дев-сервер на 4100 для этого не годится: он отдаёт устаревший код, и 404 через
 * него ничего не доказывает. Проверка поднимает свой экземпляр и ходит через
 * app.inject.
 *
 * Создаёт СВОЮ организацию и удаляет её целиком в finally, как это делают
 * соседние `doctorPayoutsProof.ts` и `diaryDeductionProof.ts`. Секрет подписи
 * токена берётся штатным `authTokenSecret()` и в вывод не попадает.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import {
	appointments,
	doctorCommissions,
	organizations,
	patients,
	payments,
	users,
	visits,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const PERIOD_FROM = "2026-07-01T00:00:00.000Z";
const PERIOD_TO = "2026-07-31T23:59:59.999Z";
const PAID_AT = "2026-07-10T10:00:00.000Z";
const REVENUE_RUB = 100_000;

/**
 * Имя организации проверки. По нему же идёт уборка следов прерванного прогона:
 * сверка на точное равенство, без LIKE и без маски, чтобы клиника с похожим
 * названием не попала под удаление.
 */
const PROOF_ORGANIZATION_NAME = "Проверка ставки врача — клиника";

/**
 * Секрет администратора клиники ТОЛЬКО для этого процесса. Маршруты настроек
 * читают переменную окружения при каждом вызове, поэтому подмена здесь не
 * трогает ни живой сервер, ни файл .env. Значение случайное и в вывод не идёт.
 */
const PROOF_ADMIN_SECRET = `proof-${Date.now()}-${Math.random().toString(36).slice(2)}`;

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) failures += 1;
	console.log(
		`${ok ? "OK  " : "ПРОВАЛ"} ${label}: получено ${JSON.stringify(actual)}, ожидалось ${JSON.stringify(expected)}`,
	);
}

function seeded<Row>(rows: Row[], what: string): Row {
	const row = rows[0];
	if (!row) throw new Error(`Посев не состоялся: вставка «${what}» не вернула ни одной строки.`);
	return row;
}

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	// Тот же хук, что в apps/api/src/server.ts — он наполняет request.user.
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerSettingsRoutes(app);
	await registerBillingRoutes(app);
	await app.ready();
	return app;
}

type PayoutRow = {
	doctorUserId: string;
	doctorName: string;
	commissionPct: number | null;
	rateRowCount: number;
	revenueRub: number;
	accruedRub: number | null;
	payoutRub: number | null;
	state: string;
	note: string;
};

async function readPayoutRow(
	app: FastifyInstance,
	staffToken: string,
	doctorUserId: string,
): Promise<PayoutRow | null> {
	const query = new URLSearchParams({ from: PERIOD_FROM, to: PERIOD_TO }).toString();
	const response = await app.inject({
		method: "GET",
		url: `/api/billing/payouts?${query}`,
		headers: { "x-dente-staff-token": staffToken },
	});
	if (response.statusCode !== 200) {
		console.log(`  расчёт выплат ответил HTTP ${response.statusCode}: ${response.body.slice(0, 300)}`);
		failures += 1;
		return null;
	}
	const report = JSON.parse(response.body) as { rows: PayoutRow[] };
	return report.rows.find((row) => row.doctorUserId === doctorUserId) ?? null;
}

/** Строки ставок врача прямо из базы: сколько их и какие активны. */
async function ratesInDb(organizationId: string, userId: string) {
	const rows = await db
		.select({
			commissionPct: doctorCommissions.commissionPct,
			commissionPercent: doctorCommissions.commissionPercent,
			materialCostDeductionPct: doctorCommissions.materialCostDeductionPct,
			isActive: doctorCommissions.isActive,
		})
		.from(doctorCommissions)
		.where(and(eq(doctorCommissions.organizationId, organizationId), eq(doctorCommissions.userId, userId)));
	return rows;
}

async function prove(app: FastifyInstance, created: string[]): Promise<void> {
	const organization = seeded(
		await db.insert(organizations).values({ name: PROOF_ORGANIZATION_NAME }).returning({ id: organizations.id }),
		PROOF_ORGANIZATION_NAME,
	);
	created.push(organization.id);
	const organizationId = organization.id;

	const ownerId = seeded(
		await db
			.insert(users)
			.values({ organizationId, fullName: "Владелец клиники проверки", role: "owner" })
			.returning({ id: users.id }),
		"владелец",
	).id;
	const doctorId = seeded(
		await db
			.insert(users)
			.values({ organizationId, fullName: "Врач проверки ставки", role: "doctor" })
			.returning({ id: users.id }),
		"врач",
	).id;
	const patientId = seeded(
		await db
			.insert(patients)
			.values({ organizationId, fullName: "Пациент проверки ставки" })
			.returning({ id: patients.id }),
		"пациент",
	).id;

	// Касса врача за период: единственная цепочка деньги → врач — это
	// payments.visit_id → visits.appointment_id → appointments.doctor_user_id.
	const appointment = seeded(
		await db
			.insert(appointments)
			.values({
				organizationId,
				patientId,
				doctorUserId: doctorId,
				status: "completed",
				startsAt: new Date(PAID_AT),
				endsAt: new Date(new Date(PAID_AT).getTime() + 3_600_000),
			})
			.returning({ id: appointments.id }),
		"приём",
	);
	const visit = seeded(
		await db
			.insert(visits)
			.values({ organizationId, patientId, appointmentId: appointment.id, status: "signed" })
			.returning({ id: visits.id }),
		"визит",
	);
	await db.insert(payments).values({
		organizationId,
		patientId,
		visitId: visit.id,
		amountRub: REVENUE_RUB,
		status: "paid",
		paidAt: new Date(PAID_AT),
	});

	const ownerToken = signToken({ organizationId, userId: ownerId, role: "owner" }, authTokenSecret());
	const clinicToken = signToken({ organizationId }, authTokenSecret());
	const commissionUrl = `/api/settings/staff/${doctorId}/commission`;

	console.log("\n=== 1. ДО НАЗНАЧЕНИЯ: ставки нет, выплату считать не из чего ===");
	const before = await readPayoutRow(app, ownerToken, doctorId);
	check("касса врача за период", before?.revenueRub, REVENUE_RUB);
	check("ставка до назначения", before?.commissionPct ?? null, null);
	check("состояние строки до назначения", before?.state, "rate_missing");
	check("к выплате до назначения", before?.payoutRub ?? null, null);
	console.log(`  причина с сервера: ${before?.note ?? "(строки нет)"}`);

	console.log("\n=== 2. ЗАПРОС БЕЗ СЕКРЕТА АДМИНИСТРАТОРА КЛИНИКИ ===");
	// Тот класс дефекта, что трижды встречался в проекте: запрос без заголовков
	// молча получает отказ, и экран выглядит пустым, а не сломанным.
	const unguarded = await app.inject({
		method: "PUT",
		url: commissionUrl,
		headers: { "Content-Type": "application/json", "x-dente-clinic-token": clinicToken },
		payload: { commissionPct: 45 },
	});
	check("без секрета администратора — отказ", unguarded.statusCode, 403);
	console.log(`  тело отказа: ${unguarded.body.slice(0, 220)}`);
	check(
		"ставка в базе после отказа не появилась",
		(await ratesInDb(organizationId, doctorId)).length,
		0,
	);

	console.log("\n=== 3. НАЗНАЧЕНИЕ 45 % ЧЕРЕЗ ДОСТИЖИМЫЙ МАРШРУТ ===");
	const saved = await app.inject({
		method: "PUT",
		url: commissionUrl,
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": clinicToken,
			"x-dente-admin-secret": PROOF_ADMIN_SECRET,
		},
		payload: { commissionPct: 45 },
	});
	check("назначение ставки", saved.statusCode, 200);
	console.log(`  ответ маршрута: ${saved.body.slice(0, 220)}`);

	const rowsAfterFirst = await ratesInDb(organizationId, doctorId);
	check("строк ставки в базе", rowsAfterFirst.length, 1);
	/*
	 * Ожидается «45», а не «45.00», и это НЕ потеря точности. Колонка в живой
	 * базе — numeric(5,2) (typmod 327686), то есть хранит ровно 45.00. Но проект
	 * ставит свой разборщик типа NUMERIC на уровне pg
	 * (`src/db/moneyTypeParsers.ts:64`): значение приходит в приложение уже
	 * числом 45, и обратно в строку его превращает драйвер, без хвостовых нулей.
	 * Точность до копейки держат два места — форма колонки и toFixed(2) в
	 * `setDoctorCommissionRateInDb`; проверяется она сравнением сумм ниже.
	 */
	check("commission_pct в базе", rowsAfterFirst[0]?.commissionPct, "45");
	// Рядом живёт commission_percent с DEFAULT '25'. Если писать только одну
	// колонку, в одной строке останутся два разных процента, и первый же
	// будущий читатель второй колонки заплатит врачу другую сумму.
	check("commission_percent согласован с commission_pct", rowsAfterFirst[0]?.commissionPercent, "45");

	console.log("\n=== 4. РАСЧЁТ ВЫПЛАТ ВИДИТ ВВЕДЁННОЕ ЧИСЛО ===");
	const after = await readPayoutRow(app, ownerToken, doctorId);
	check("ставка в расчёте", after?.commissionPct, 45);
	check("активных ставок у врача (иначе расчёт предупреждает о двоящейся настройке)", after?.rateRowCount, 1);
	// 100 000 ₽ × 45 % = 45 000 ₽. Материалов не списывали, поэтому удержания нет
	// и «к выплате» равно начисленному.
	check("начислено процентом от кассы", after?.accruedRub, 45_000);
	check("к выплате", after?.payoutRub, 45_000);
	check("состояние строки", after?.state, "computed");
	console.log(`  причина с сервера: ${after?.note ?? "(строки нет)"}`);

	console.log("\n=== 5. ПОВТОРНОЕ НАЗНАЧЕНИЕ: 45 % → 32,5 % ===");
	const changed = await app.inject({
		method: "PUT",
		url: commissionUrl,
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": clinicToken,
			"x-dente-admin-secret": PROOF_ADMIN_SECRET,
		},
		payload: { commissionPct: 32.5 },
	});
	check("правка ставки", changed.statusCode, 200);
	const rowsAfterSecond = await ratesInDb(organizationId, doctorId);
	// Прежняя строка не удалена — она отключена: история того, что клиника
	// назначала раньше, обязана сохраниться.
	check("всего строк ставки", rowsAfterSecond.length, 2);
	check("активных строк ровно одна", rowsAfterSecond.filter((row) => row.isActive).length, 1);
	check(
		"активная строка — новая",
		rowsAfterSecond.find((row) => row.isActive)?.commissionPct,
		"32.5",
	);

	const afterChange = await readPayoutRow(app, ownerToken, doctorId);
	check("ставка в расчёте после правки", afterChange?.commissionPct, 32.5);
	check("предупреждения о двоящейся ставке нет", afterChange?.rateRowCount, 1);
	// 100 000 ₽ × 32,5 % = 32 500 ₽.
	check("начислено после правки", afterChange?.accruedRub, 32_500);

	console.log("\n=== 6. ОТКАЗЫ НА НЕПРИГОДНЫХ ЗНАЧЕНИЯХ ===");
	const guardedHeaders = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": clinicToken,
		"x-dente-admin-secret": PROOF_ADMIN_SECRET,
	};
	for (const bad of [-1, 101, Number.NaN]) {
		const rejected = await app.inject({
			method: "PUT",
			url: commissionUrl,
			headers: guardedHeaders,
			payload: { commissionPct: bad },
		});
		check(`процент ${bad} отклонён`, rejected.statusCode, 400);
	}
	const foreignStaff = await app.inject({
		method: "PUT",
		url: `/api/settings/staff/${ownerId.replace(/.$/, ownerId.endsWith("0") ? "1" : "0")}/commission`,
		headers: guardedHeaders,
		payload: { commissionPct: 20 },
	});
	check("чужой/несуществующий сотрудник отклонён", foreignStaff.statusCode, 404);
	console.log(`  тело отказа: ${foreignStaff.body.slice(0, 220)}`);

	// Ставка не должна была измениться ни на одном отказе.
	const finalRates = await ratesInDb(organizationId, doctorId);
	check("после отказов активная ставка прежняя", finalRates.find((row) => row.isActive)?.commissionPct, "32.5");

	console.log("\n=== 7. СПИСОК СТАВОК ДЛЯ ИНТЕРФЕЙСА ===");
	const listed = await app.inject({
		method: "GET",
		url: "/api/settings/staff/commissions",
		headers: { "x-dente-clinic-token": clinicToken, "x-dente-admin-secret": PROOF_ADMIN_SECRET },
	});
	check("список ставок отдан", listed.statusCode, 200);
	const listedBody = JSON.parse(listed.body) as { commissions: Array<{ userId: string; commissionPct: string }> };
	const mine = listedBody.commissions.filter((rate) => rate.userId === doctorId);
	check("в списке одна действующая ставка врача", mine.length, 1);
	check("и это назначенные 32,5 %", mine[0]?.commissionPct, "32.5");
}

async function cleanup(organizationIds: string[]): Promise<void> {
	for (const organizationId of organizationIds) {
		await db.delete(doctorCommissions).where(eq(doctorCommissions.organizationId, organizationId));
		await db.delete(payments).where(eq(payments.organizationId, organizationId));
		await db.delete(visits).where(eq(visits.organizationId, organizationId));
		await db.delete(appointments).where(eq(appointments.organizationId, organizationId));
		await db.delete(patients).where(eq(patients.organizationId, organizationId));
		await db.delete(users).where(eq(users.organizationId, organizationId));
		await db.delete(organizations).where(eq(organizations.id, organizationId));
	}
}

/**
 * Уборка следов прерванного прогона ДО начала работы: прогон, убитый снаружи
 * (Ctrl+C, закрытая труба вида `| head`), до finally не доходит, и его тестовая
 * клиника остаётся в живой базе. Такой мусор потом читают как данные клиники.
 */
async function sweepStale(): Promise<void> {
	const stale = await db
		.select({ id: organizations.id, name: organizations.name })
		.from(organizations)
		.where(inArray(organizations.name, [PROOF_ORGANIZATION_NAME]));
	if (stale.length === 0) return;
	console.log(`Следы прерванного прогона: организаций ${stale.length} — удаляю до начала проверки.`);
	await cleanup(stale.map((row) => row.id));
}

async function main(): Promise<void> {
	// Секрет периметра чтений здесь не проверяется: проверяется ставка.
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
	// Маршруты настроек проверяются В ОХРАНЯЕМОМ режиме: иначе проверка «без
	// секрета — отказ» не значила бы ничего.
	process.env.DENTE_SETTINGS_ADMIN_SECRET = PROOF_ADMIN_SECRET;
	process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS = "0";

	const app = await buildApp();
	const created: string[] = [];
	try {
		await sweepStale();
		await prove(app, created);
	} finally {
		await app.close();
		await cleanup(created);
		const leftovers = await db.execute(sql`
			select (select count(*)::int from organizations) as organizations,
			       (select count(*)::int from doctor_commissions) as rates
		`);
		console.log(`\nПОСЛЕ УБОРКИ ${JSON.stringify(leftovers.rows[0])}`);
		console.log(failures === 0 ? "\nВСЕ СВЕРКИ СОШЛИСЬ" : `\nРАСХОЖДЕНИЙ: ${failures}`);
		await pool.end();
	}
	if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
