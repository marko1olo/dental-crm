/**
 * Живое доказательство расчёта выплат врачам: GET /api/billing/payouts против
 * реальной PostgreSQL, со сверкой каждой суммы независимым SQL.
 *
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает).
 * Формулу закрепляет src/services/finance/doctorPayouts.test.ts; здесь
 * измеряется поведение на живых данных, которое статическим разбором не
 * доказывается: сходятся ли числа маршрута с базой, работает ли изоляция
 * клиник, отдаёт ли сервер отказ вместо пустоты и не срабатывает ли ловушка
 * drizzle с голым `"id"` в подзапросе (валидный SQL, всегда ложь, пустой экран).
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/routes/doctorPayoutsProof.ts
 *
 * ЧАСТЬ 1 читает живые данные и ничего не меняет.
 * ЧАСТЬ 2 создаёт СВОИ организации (касса, склад, ставки), измеряет расчёт и
 * удаляет их целиком в finally — как это делает diaryDeductionProof.ts.
 * Секрет подписи токена берётся штатным authTokenSecret() и в вывод не попадает.
 */

import { eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { db, pool } from "../../db/client.js";
import {
	appointments,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	payments,
	users,
	visits,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	buildDoctorPayoutAggregateQuery,
	type DoctorPayoutReport,
} from "../../services/finance/doctorPayouts.js";
import { signToken } from "../../utils/cryptoHelper.js";

const PERIOD_FROM = "2026-07-01T00:00:00.000Z";
const PERIOD_TO = "2026-07-31T23:59:59.999Z";

/**
 * Имена организаций, которые создаёт ЧАСТЬ 2. Вынесены в одно место, потому что
 * по ним же идёт уборка следов прерванного прогона: строки сверяются на точное
 * равенство, без LIKE и без маски, чтобы клиника с похожим названием не попала
 * под удаление.
 */
const PROOF_ORGANIZATION_NAMES = [
	"Проверка выплат — клиника А",
	"Проверка выплат — клиника Б",
] as const;

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) failures += 1;
	console.log(
		`${ok ? "OK  " : "ПРОВАЛ"} ${label}: получено ${JSON.stringify(actual)}, ожидалось ${JSON.stringify(expected)}`,
	);
}

function money(value: unknown): number {
	return Math.round(Number(value ?? 0) * 100) / 100;
}

/**
 * Первая строка вставки. Пустой `returning()` означает, что посев не состоялся, —
 * дальше сравнивать было бы нечего, а падение на `undefined.id` не назвало бы
 * причину. Заодно снимает `possibly undefined` под noUncheckedIndexedAccess:
 * проверка типов здесь не декорация, ровно на этом месте прячутся тихие пропуски.
 */
function seeded<Row>(rows: Row[], what: string): Row {
	const row = rows[0];
	if (!row)
		throw new Error(
			`Посев не состоялся: вставка «${what}» не вернула ни одной строки.`,
		);
	return row;
}

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	// Тот же хук, что в apps/api/src/server.ts — он наполняет request.user.
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerBillingRoutes(app);
	await app.ready();
	return app;
}

type Injected = {
	statusCode: number;
	body: string;
	report: DoctorPayoutReport & { scope?: string };
};

async function callPayouts(
	app: FastifyInstance,
	headers: Record<string, string>,
	query = `?from=${PERIOD_FROM}&to=${PERIOD_TO}`,
): Promise<Injected> {
	const response = await app.inject({
		method: "GET",
		url: `/api/billing/payouts${query}`,
		headers,
	});
	let report: DoctorPayoutReport & { scope?: string };
	try {
		report = JSON.parse(response.body);
	} catch {
		report = null as never;
	}
	return { statusCode: response.statusCode, body: response.body, report };
}

/** Независимый SQL: написан руками, без сервиса и без drizzle-построителя. */
async function independentRevenue(organizationId: string) {
	const result = await db.execute(sql`
		select a.doctor_user_id::text as doctor_user_id,
		       u.full_name,
		       count(*)::int as payment_count,
		       sum(p.amount_rub)::numeric(12,2) as revenue_rub
		  from payments p
		  join visits v on v.id = p.visit_id
		  join appointments a on a.id = v.appointment_id
		  join users u on u.id = a.doctor_user_id
		 where p.organization_id = ${organizationId}
		   and p.status = 'paid'
		   and p.paid_at >= ${PERIOD_FROM}::timestamptz
		   and p.paid_at <= ${PERIOD_TO}::timestamptz
		 group by a.doctor_user_id, u.full_name
		 order by revenue_rub desc
	`);
	return result.rows as {
		doctor_user_id: string;
		full_name: string;
		payment_count: number;
		revenue_rub: unknown;
	}[];
}

async function independentMaterials(organizationId: string) {
	const result = await db.execute(sql`
		select a.doctor_user_id::text as doctor_user_id,
		       count(*)::int as movements,
		       sum(coalesce(it.unit_cost_rub, 0) * abs(coalesce(it.quantity_changed, 0)))::numeric(12,2) as material_rub
		  from inventory_transactions it
		  join visits v on v.id = it.visit_id
		  join appointments a on a.id = v.appointment_id
		 where it.organization_id = ${organizationId}
		   and it.transaction_type = 'auto_deduct'
		   and it.visit_id in (
		         select distinct p.visit_id
		           from payments p
		          where p.organization_id = ${organizationId}
		            and p.status = 'paid'
		            and p.visit_id is not null
		            and p.paid_at >= ${PERIOD_FROM}::timestamptz
		            and p.paid_at <= ${PERIOD_TO}::timestamptz
		       )
		 group by a.doctor_user_id
	`);
	return result.rows as {
		doctor_user_id: string;
		movements: number;
		material_rub: unknown;
	}[];
}

async function independentRates(organizationId: string) {
	const result = await db.execute(sql`
		select user_id::text as user_id, commission_pct::text as commission_pct,
		       material_cost_deduction_pct::text as material_cost_deduction_pct
		  from doctor_commissions
		 where organization_id = ${organizationId} and is_active = true
		 order by effective_from desc
	`);
	return result.rows as {
		user_id: string;
		commission_pct: string;
		material_cost_deduction_pct: string;
	}[];
}

/**
 * Настоящий HTTP через сокет, а не app.inject.
 *
 * ЗАЧЕМ ОТДЕЛЬНО. `app.inject` вызывает обработчик в том же процессе: он
 * доказывает логику маршрута, но не доказывает, что маршрут вообще поднимается
 * на порту и отвечает по сети. Поднимается свой экземпляр на своём порту, а не
 * дёргается общий сервер разработки: его в этот момент может использовать другой
 * исполнитель, и перезапуск чужого процесса — не моя зона.
 */
async function proveOverRealHttp(
	organizationId: string,
	ownerUserId: string,
): Promise<void> {
	const app = await buildApp();
	const port = Number(process.env.PAYOUT_PROOF_PORT ?? 4199);
	await app.listen({ host: "127.0.0.1", port });
	try {
		const url = `http://127.0.0.1:${port}/api/billing/payouts?from=${PERIOD_FROM}&to=${PERIOD_TO}`;
		console.log(`\n=== ЖИВОЙ HTTP на 127.0.0.1:${port} (не app.inject) ===`);

		const anonymous = await fetch(url);
		const anonymousBody = await anonymous.text();
		check("живой HTTP без сотрудника отклонён", anonymous.status, 401);
		console.log(`  без токена: HTTP ${anonymous.status} ${anonymousBody}`);

		const token = signToken(
			{ organizationId, userId: ownerUserId, role: "owner" },
			authTokenSecret(),
		);
		const authorized = await fetch(url, {
			headers: { "x-dente-staff-token": token },
		});
		const body = (await authorized.json()) as DoctorPayoutReport & {
			scope?: string;
		};
		check("живой HTTP отдал расчёт", authorized.status, 200);
		console.log(
			`  владелец: HTTP ${authorized.status}, строк ${body.rows.length}`,
		);
		console.log(`  ИТОГИ по сети: ${JSON.stringify(body.totals)}`);
		for (const row of body.rows) {
			console.log(
				`    ${row.doctorName}: касса=${row.revenueRub} материалы=${row.materialCostRub} ` +
					`ставка=${row.commissionPct ?? "нет"} к_выплате=${row.payoutRub ?? "—"} (${row.state})`,
			);
		}
		check(
			"по сети те же 203,27 у врача со ставкой",
			body.rows.find((r) => r.commissionPct === 30)?.payoutRub,
			203.27,
		);
	} finally {
		await app.close();
	}
}

/** ЧАСТЬ 1: живые данные, только чтение. */
async function proveAgainstLiveData(app: FastifyInstance): Promise<void> {
	const orgRows = await db
		.select({ id: organizations.id, name: organizations.name })
		.from(organizations);

	console.log(
		'\n=== SQL агрегата (печать обязательна: ловушка голого "id" в подзапросе) ===',
	);
	const preview = buildDoctorPayoutAggregateQuery({
		organizationId: orgRows[0]?.id ?? "00000000-0000-0000-0000-000000000000",
		from: new Date(PERIOD_FROM),
		to: new Date(PERIOD_TO),
	}).toSQL();
	console.log(preview.sql);
	console.log(`параметров в запросе: ${preview.params.length}`);

	for (const org of orgRows) {
		const clinicToken = signToken(
			{ organizationId: org.id },
			authTokenSecret(),
		);
		// userId в токене обязателен: зарплата не отдаётся неопознанному сотруднику.
		const [owner] = await db
			.select({ id: users.id, role: users.role })
			.from(users)
			.where(eq(users.organizationId, org.id))
			.limit(1);

		console.log(`\n=== ОРГАНИЗАЦИЯ «${org.name}» (${org.id}) ===`);

		/*
		 * КЛИНИКА БЕЗ СОТРУДНИКОВ — ЭТО НЕ ПРОВАЛ, А ЗАКОННОЕ СОСТОЯНИЕ.
		 *
		 * Здесь стояло `userId: owner?.id ?? null` без ветки на отсутствие
		 * сотрудника. Токен с `userId: null` сервер справедливо отвергает 401 —
		 * зарплата не отдаётся неопознанному, — и сценарий объявлял ПРОВАЛ
		 * «владелец не получил расчёт» о клинике, у которой владельца нет вовсе.
		 *
		 * Обнаружено фактом: другой прогон оставил в общей базе две организации с
		 * нулём сотрудников, и этот сценарий покраснел, уронив общий прогон
		 * цепочек в 12 из 13 — при том что дефекта в расчёте зарплаты не было.
		 * Страж, кричащий на верном состоянии данных, будет выключен: в этом
		 * дереве так уже случилось трижды.
		 *
		 * Клиника без сотрудников пропускается вслух, а не молча: молчаливый
		 * пропуск превратил бы «нечего проверять» в «проверено».
		 */
		if (!owner?.id) {
			console.log(
				"  СПРАВКА: в клинике ноль сотрудников — расчёт зарплаты проверять не на кого, организация пропущена. " +
					"Это законное состояние (например, клиника только что создана), а не дефект расчёта.",
			);
			continue;
		}

		const ownerToken = signToken(
			{ organizationId: org.id, userId: owner.id, role: "owner" },
			authTokenSecret(),
		);
		const anonymous = await callPayouts(app, {
			"x-dente-clinic-token": clinicToken,
		});
		check("запрос без сотрудника отклонён", anonymous.statusCode, 401);
		console.log(`  тело отказа: ${anonymous.body.slice(0, 200)}`);

		const response = await callPayouts(app, {
			"x-dente-staff-token": ownerToken,
		});
		if (response.statusCode !== 200) {
			failures += 1;
			console.log(
				`ПРОВАЛ владелец не получил расчёт: HTTP ${response.statusCode} ${response.body.slice(0, 300)}`,
			);
			continue;
		}
		console.log(
			`  HTTP 200, scope=${response.report.scope}, строк ${response.report.rows.length}`,
		);
		console.log(`  ИТОГИ: ${JSON.stringify(response.report.totals)}`);
		for (const row of response.report.rows) {
			console.log(
				`  ${row.doctorName} [${row.role}] касса=${row.revenueRub} платежей=${row.paymentCount} ` +
					`материалы=${row.materialCostRub} (списаний ${row.materialMovements}, без цены ${row.materialMovementsUnpriced}) ` +
					`ставка=${row.commissionPct ?? "нет"} удерж=${row.materialDeductionPct ?? "нет"} ` +
					`начислено=${row.accruedRub ?? "—"} удержано=${row.withheldMaterialRub ?? "—"} ` +
					`к_выплате=${row.payoutRub ?? "—"} состояние=${row.state}`,
			);
			console.log(`      причина: ${row.note}`);
		}

		// СВЕРКА С БАЗОЙ независимым SQL.
		const revenue = await independentRevenue(org.id);
		const materials = await independentMaterials(org.id);
		const rates = await independentRates(org.id);
		console.log(
			`  SQL напрямую: врачей с кассой ${revenue.length}, строк материалов ${materials.length}, ставок ${rates.length}`,
		);
		for (const sqlRow of revenue) {
			const reportRow = response.report.rows.find(
				(row) => row.doctorUserId === sqlRow.doctor_user_id,
			);
			check(
				`касса ${sqlRow.full_name}`,
				reportRow?.revenueRub ?? null,
				money(sqlRow.revenue_rub),
			);
			check(
				`платежей ${sqlRow.full_name}`,
				reportRow?.paymentCount ?? null,
				Number(sqlRow.payment_count),
			);
		}
		for (const sqlRow of materials) {
			const reportRow = response.report.rows.find(
				(row) => row.doctorUserId === sqlRow.doctor_user_id,
			);
			check(
				`материалы ${sqlRow.doctor_user_id}`,
				reportRow?.materialCostRub ?? null,
				money(sqlRow.material_rub),
			);
		}
		const revenueSum = revenue.reduce(
			(total, row) => total + money(row.revenue_rub),
			0,
		);
		check(
			"сумма кассы врачей = отнесённая касса отчёта",
			response.report.totals.attributableRevenueRub,
			money(revenueSum),
		);
		if (rates.length === 0) {
			check(
				"без ставок ни одной посчитанной выплаты",
				response.report.rows.filter((row) => row.payoutRub !== null).length,
				0,
			);
		}
	}
}

/**
 * ЧАСТЬ 2: своя клиника с кассой, складом и ставками — расчёт целиком.
 *
 * `created` заполняется СРАЗУ после создания каждой организации, а не возвратом
 * из функции: при падении посередине посева возврата не будет вовсе, и тестовые
 * клиники остались бы в живой базе навсегда. Это ровно та ошибка, из-за которой
 * в базе заводится мусор, который потом принимают за данные клиники.
 */
async function proveFullFormula(
	app: FastifyInstance,
	created: string[],
): Promise<void> {
	const mainOrganization = seeded(
		await db
			.insert(organizations)
			.values({ name: PROOF_ORGANIZATION_NAMES[0] })
			.returning({ id: organizations.id }),
		PROOF_ORGANIZATION_NAMES[0],
	);
	created.push(mainOrganization.id);
	const otherOrganization = seeded(
		await db
			.insert(organizations)
			.values({ name: PROOF_ORGANIZATION_NAMES[1] })
			.returning({ id: organizations.id }),
		PROOF_ORGANIZATION_NAMES[1],
	);
	created.push(otherOrganization.id);
	const organizationId = mainOrganization.id;
	const otherOrganizationId = otherOrganization.id;

	const insertUser = async (orgId: string, fullName: string, role: string) => {
		const rows = await db
			.insert(users)
			.values({ organizationId: orgId, fullName, role })
			.returning({ id: users.id });
		return seeded(rows, `сотрудник «${fullName}»`).id;
	};
	const doctorWithRate = await insertUser(
		organizationId,
		"Врач со ставкой",
		"doctor",
	);
	const doctorWithoutRate = await insertUser(
		organizationId,
		"Врач без ставки",
		"doctor",
	);
	const doctorInDebt = await insertUser(
		organizationId,
		"Врач с дорогими материалами",
		"doctor",
	);
	const receptionist = await insertUser(
		organizationId,
		"Администратор смены",
		"administrator",
	);
	const foreignDoctor = await insertUser(
		otherOrganizationId,
		"Врач чужой клиники",
		"doctor",
	);

	const insertPatient = async (orgId: string, fullName: string) => {
		const rows = await db
			.insert(patients)
			.values({ organizationId: orgId, fullName })
			.returning({ id: patients.id });
		return seeded(rows, `пациент «${fullName}»`).id;
	};
	const patientId = await insertPatient(
		organizationId,
		"Пациент проверки выплат",
	);
	const foreignPatientId = await insertPatient(
		otherOrganizationId,
		"Пациент чужой клиники",
	);

	/** Приём + визит + оплата: единственная цепочка, связывающая деньги с врачом. */
	const seedPaidVisit = async (options: {
		orgId: string;
		doctorUserId: string;
		patient: string;
		amountRub: number;
		paidAt: string;
	}): Promise<string> => {
		const appointment = seeded(
			await db
				.insert(appointments)
				.values({
					organizationId: options.orgId,
					patientId: options.patient,
					doctorUserId: options.doctorUserId,
					status: "completed",
					startsAt: new Date(options.paidAt),
					endsAt: new Date(new Date(options.paidAt).getTime() + 3_600_000),
				})
				.returning({ id: appointments.id }),
			"приём",
		);
		const visit = seeded(
			await db
				.insert(visits)
				.values({
					organizationId: options.orgId,
					patientId: options.patient,
					appointmentId: appointment.id,
					status: "signed",
				})
				.returning({ id: visits.id }),
			"визит",
		);
		await db.insert(payments).values({
			organizationId: options.orgId,
			patientId: options.patient,
			visitId: visit.id,
			amountRub: options.amountRub,
			status: "paid",
			paidAt: new Date(options.paidAt),
		});
		return visit.id;
	};

	const visitWithRate = await seedPaidVisit({
		orgId: organizationId,
		doctorUserId: doctorWithRate,
		patient: patientId,
		amountRub: 1000,
		paidAt: "2026-07-05T10:00:00.000Z",
	});
	await seedPaidVisit({
		orgId: organizationId,
		doctorUserId: doctorWithRate,
		patient: patientId,
		amountRub: 500.55,
		paidAt: "2026-07-06T10:00:00.000Z",
	});
	await seedPaidVisit({
		orgId: organizationId,
		doctorUserId: doctorWithoutRate,
		patient: patientId,
		amountRub: 700,
		paidAt: "2026-07-07T10:00:00.000Z",
	});
	const visitInDebt = await seedPaidVisit({
		orgId: organizationId,
		doctorUserId: doctorInDebt,
		patient: patientId,
		amountRub: 1000,
		paidAt: "2026-07-08T10:00:00.000Z",
	});
	// Оплата ВНЕ периода: в расчёт попасть не должна.
	await seedPaidVisit({
		orgId: organizationId,
		doctorUserId: doctorWithRate,
		patient: patientId,
		amountRub: 12_345,
		paidAt: "2026-06-15T10:00:00.000Z",
	});
	// Оплата чужой клиники: не должна попасть ни в строки, ни в итоги.
	await seedPaidVisit({
		orgId: otherOrganizationId,
		doctorUserId: foreignDoctor,
		patient: foreignPatientId,
		amountRub: 9999,
		paidAt: "2026-07-09T10:00:00.000Z",
	});
	// Платёж без визита: к врачу отнести нельзя, уходит в «не отнесено».
	await db.insert(payments).values({
		organizationId,
		patientId,
		amountRub: 300,
		status: "paid",
		paidAt: new Date("2026-07-10T10:00:00.000Z"),
	});
	// Запланированный платёж (ещё не деньги) — в расчёт не входит.
	await db.insert(payments).values({
		organizationId,
		patientId,
		visitId: visitWithRate,
		amountRub: 5000,
		status: "planned",
		paidAt: new Date("2026-07-11T10:00:00.000Z"),
	});

	const pricedItem = seeded(
		await db
			.insert(inventoryItems)
			.values({
				organizationId,
				name: "Композит проверки выплат",
				stockQuantity: "100",
				currentQty: "100",
				unitCostRub: "123.45",
			})
			.returning({ id: inventoryItems.id }),
		"позиция склада с ценой",
	);
	const unpricedItem = seeded(
		await db
			.insert(inventoryItems)
			.values({
				organizationId,
				name: "Позиция без цены",
				stockQuantity: "100",
				currentQty: "100",
				unitCostRub: "0",
			})
			.returning({ id: inventoryItems.id }),
		"позиция склада без цены",
	);

	// Себестоимость врача со ставкой: 123.45 × 2 = 246.90, плюс строка без цены.
	await db.insert(inventoryTransactions).values({
		organizationId,
		visitId: visitWithRate,
		inventoryItemId: pricedItem.id,
		quantityChanged: "-2",
		unitCostRub: "123.45",
		transactionType: "auto_deduct",
		userId: doctorWithRate,
	});
	await db.insert(inventoryTransactions).values({
		organizationId,
		visitId: visitWithRate,
		inventoryItemId: unpricedItem.id,
		quantityChanged: "-1",
		unitCostRub: "0",
		transactionType: "auto_deduct",
		userId: doctorWithRate,
	});
	// Приход на склад по тому же визиту: себестоимостью визита НЕ является.
	await db.insert(inventoryTransactions).values({
		organizationId,
		visitId: visitWithRate,
		inventoryItemId: pricedItem.id,
		quantityChanged: "10",
		unitCostRub: "123.45",
		transactionType: "receipt",
		userId: doctorWithRate,
	});
	// Материалы дороже начисленного процента: 250 × 2 = 500.
	await db.insert(inventoryTransactions).values({
		organizationId,
		visitId: visitInDebt,
		inventoryItemId: pricedItem.id,
		quantityChanged: "-2",
		unitCostRub: "250.00",
		transactionType: "auto_deduct",
		userId: doctorInDebt,
	});

	await db.insert(doctorCommissions).values({
		organizationId,
		userId: doctorWithRate,
		specialty: "universal",
		serviceCategory: "therapy",
		commissionPct: "30.00",
		materialCostDeductionPct: "100.00",
		isActive: true,
	});
	await db.insert(doctorCommissions).values({
		organizationId,
		userId: doctorInDebt,
		specialty: "universal",
		serviceCategory: "therapy",
		commissionPct: "10.00",
		materialCostDeductionPct: "100.00",
		isActive: true,
	});

	const ownerId = await insertUser(
		organizationId,
		"Владелец клиники А",
		"owner",
	);
	const ownerToken = signToken(
		{ organizationId, userId: ownerId, role: "owner" },
		authTokenSecret(),
	);
	const doctorToken = signToken(
		{ organizationId, userId: doctorWithRate, role: "doctor" },
		authTokenSecret(),
	);
	const receptionistToken = signToken(
		{ organizationId, userId: receptionist, role: "administrator" },
		authTokenSecret(),
	);

	console.log("\n=== ЧАСТЬ 2: своя клиника с кассой, складом и ставками ===");
	const owner = await callPayouts(app, { "x-dente-staff-token": ownerToken });
	console.log(`HTTP ${owner.statusCode}`);
	console.log(JSON.stringify(owner.report, null, 1));

	check("владелец получил расчёт", owner.statusCode, 200);
	check("охват владельца", owner.report.scope, "all");
	check("строк в отчёте", owner.report.rows.length, 3);

	const byId = new Map(owner.report.rows.map((row) => [row.doctorUserId, row]));
	const withRate = byId.get(doctorWithRate);
	const withoutRate = byId.get(doctorWithoutRate);
	const inDebt = byId.get(doctorInDebt);

	// Врач со ставкой: касса 1500.55, материалы 246.90, ставка 30 %, удержание 100 %.
	check("касса врача со ставкой", withRate?.revenueRub, 1500.55);
	check("платежей врача со ставкой", withRate?.paymentCount, 2);
	check("себестоимость врача со ставкой", withRate?.materialCostRub, 246.9);
	check("списаний у врача со ставкой", withRate?.materialMovements, 2);
	check("списаний без цены", withRate?.materialMovementsUnpriced, 1);
	check("состояние себестоимости", withRate?.materialsState, "cost_missing");
	check("начислено (1500,55 × 30 %)", withRate?.accruedRub, 450.17);
	check("удержано (246,90 × 100 %)", withRate?.withheldMaterialRub, 246.9);
	check("к выплате (450,17 − 246,90)", withRate?.payoutRub, 203.27);
	check("состояние расчёта", withRate?.state, "computed");

	// Врач без ставки: касса видна, выплата не выдумана.
	check("касса врача без ставки", withoutRate?.revenueRub, 700);
	check("состояние врача без ставки", withoutRate?.state, "rate_missing");
	check("выплата врача без ставки не посчитана", withoutRate?.payoutRub, null);
	check("30 % не подставлены (было бы 210)", withoutRate?.accruedRub, null);
	console.log(`  причина у врача без ставки: ${withoutRate?.note}`);

	// Материалы дороже начисленного: 1000 × 10 % = 100, удержано 500 → −400.
	check("начислено врачу с дорогими материалами", inDebt?.accruedRub, 100);
	check(
		"удержано врачу с дорогими материалами",
		inDebt?.withheldMaterialRub,
		500,
	);
	check("отрицательная выплата не обнулена", inDebt?.payoutRub, -400);

	// Итоги и изоляция.
	check("касса периода целиком", owner.report.totals.revenueRub, 3500.55);
	check(
		"касса, отнесённая к врачам",
		owner.report.totals.attributableRevenueRub,
		3200.55,
	);
	check("не отнесено к врачу", owner.report.totals.unattributedRevenueRub, 300);
	check(
		"итог к выплате только по врачам со ставкой",
		owner.report.totals.payoutRub,
		-196.73,
	);
	check("врачей посчитано", owner.report.totals.doctorsCounted, 2);
	check("врачей без ставки", owner.report.totals.doctorsWithoutRate, 1);
	check(
		"чужая клиника в отчёт не попала",
		owner.report.rows.some((row) => row.doctorUserId === foreignDoctor),
		false,
	);
	check(
		"оплата вне периода не попала",
		owner.report.rows.some((row) => row.revenueRub === 12_345),
		false,
	);

	// Сверка с независимым SQL.
	const revenue = await independentRevenue(organizationId);
	const materials = await independentMaterials(organizationId);
	console.log("\n  Независимый SQL по клинике А:");
	for (const row of revenue)
		console.log(
			`    ${row.full_name}: касса ${row.revenue_rub}, платежей ${row.payment_count}`,
		);
	for (const row of materials)
		console.log(
			`    материалы ${row.doctor_user_id}: ${row.material_rub} (списаний ${row.movements})`,
		);
	for (const row of revenue) {
		check(
			`SQL vs маршрут, касса ${row.full_name}`,
			byId.get(row.doctor_user_id)?.revenueRub,
			money(row.revenue_rub),
		);
	}
	for (const row of materials) {
		check(
			`SQL vs маршрут, материалы ${row.doctor_user_id}`,
			byId.get(row.doctor_user_id)?.materialCostRub,
			money(row.material_rub),
		);
	}

	// Врач видит только свою строку, ресепшен не видит ничего.
	const own = await callPayouts(app, { "x-dente-staff-token": doctorToken });
	check("врач получил расчёт", own.statusCode, 200);
	check("охват врача", own.report?.scope, "own");
	check("врач видит одну строку", own.report?.rows.length, 1);
	check("и это его строка", own.report?.rows[0]?.doctorUserId, doctorWithRate);
	check(
		"итог врача — только его выплата",
		own.report?.totals.payoutRub,
		203.27,
	);

	const denied = await callPayouts(app, {
		"x-dente-staff-token": receptionistToken,
	});
	check("ресепшен не видит зарплаты", denied.statusCode, 403);
	console.log(`  отказ ресепшену: ${denied.body.slice(0, 220)}`);

	const badPeriod = await callPayouts(
		app,
		{ "x-dente-staff-token": ownerToken },
		"?from=2020-01-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z",
	);
	check("слишком широкий период отклонён", badPeriod.statusCode, 400);
	console.log(`  отказ по периоду: ${badPeriod.body.slice(0, 220)}`);

	const reversed = await callPayouts(
		app,
		{ "x-dente-staff-token": ownerToken },
		"?from=2026-07-31T00:00:00.000Z&to=2026-07-01T00:00:00.000Z",
	);
	check("перевёрнутый период отклонён", reversed.statusCode, 400);
	console.log(`  отказ по датам: ${reversed.body.slice(0, 220)}`);

	const defaultPeriod = await callPayouts(
		app,
		{ "x-dente-staff-token": ownerToken },
		"",
	);
	check(
		"без параметров расчёт идёт за текущий месяц",
		defaultPeriod.statusCode,
		200,
	);
	console.log(
		`  период по умолчанию: ${JSON.stringify(defaultPeriod.report?.period)}`,
	);

	// Чужая клиника не должна видеть ни строки клиники А, даже своим владельцем.
	const foreignOwnerId = await insertUser(
		otherOrganizationId,
		"Владелец клиники Б",
		"owner",
	);
	const foreignOwnerToken = signToken(
		{
			organizationId: otherOrganizationId,
			userId: foreignOwnerId,
			role: "owner",
		},
		authTokenSecret(),
	);
	const foreign = await callPayouts(app, {
		"x-dente-staff-token": foreignOwnerToken,
	});
	check("владелец чужой клиники получил свой расчёт", foreign.statusCode, 200);
	check(
		"касса клиники А в него не попала",
		foreign.report?.totals.revenueRub,
		9999,
	);
	check(
		"врачи клиники А в чужом отчёте отсутствуют",
		foreign.report?.rows.some((row) => byId.has(row.doctorUserId)),
		false,
	);

	// Те же данные, но через настоящий сокет: маршрут обязан отвечать по сети.
	await proveOverRealHttp(organizationId, ownerId);
}

async function cleanup(organizationIds: string[]): Promise<void> {
	for (const organizationId of organizationIds) {
		await db
			.delete(inventoryTransactions)
			.where(eq(inventoryTransactions.organizationId, organizationId));
		await db
			.delete(inventoryItems)
			.where(eq(inventoryItems.organizationId, organizationId));
		await db
			.delete(doctorCommissions)
			.where(eq(doctorCommissions.organizationId, organizationId));
		await db
			.delete(payments)
			.where(eq(payments.organizationId, organizationId));
		await db.delete(visits).where(eq(visits.organizationId, organizationId));
		await db
			.delete(appointments)
			.where(eq(appointments.organizationId, organizationId));
		await db
			.delete(patients)
			.where(eq(patients.organizationId, organizationId));
		await db.delete(users).where(eq(users.organizationId, organizationId));
		await db.delete(organizations).where(eq(organizations.id, organizationId));
	}
}

/**
 * Уборка следов прерванного прогона ДО начала работы.
 *
 * Прогон, убитый снаружи (Ctrl+C, закрытая труба вида `| head`), не доходит до
 * finally, и его тестовые клиники остаются в живой базе. Один раз это уже
 * случилось: в базе нашлись четыре организации «Проверка выплат», 16 платежей и
 * 4 ставки от двух оборванных прогонов. Мусор такого рода потом читают как
 * данные клиники, поэтому подметаем на входе, а не надеемся на выход.
 */
async function sweepStaleProofOrganizations(): Promise<void> {
	const stale = await db
		.select({ id: organizations.id, name: organizations.name })
		.from(organizations)
		.where(inArray(organizations.name, [...PROOF_ORGANIZATION_NAMES]));
	if (stale.length === 0) return;
	console.log(
		`Следы прерванного прогона: организаций ${stale.length} — удаляю до начала проверки.`,
	);
	for (const row of stale) console.log(`  ${row.id}  ${row.name}`);
	await cleanup(stale.map((row) => row.id));
}

async function main(): Promise<void> {
	// Секрет периметра в этой проверке не участвует: проверяется ролевой слой.
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

	const app = await buildApp();
	const created: string[] = [];
	try {
		await sweepStaleProofOrganizations();
		await proveAgainstLiveData(app);
		await proveFullFormula(app, created);
	} finally {
		await app.close();
		await cleanup(created);
		const leftovers = await db.execute(sql`
			select (select count(*)::int from organizations) as organizations,
			       (select count(*)::int from payments) as payments,
			       (select count(*)::int from inventory_transactions) as movements,
			       (select count(*)::int from doctor_commissions) as rates
		`);
		console.log(`\nПОСЛЕ УБОРКИ ${JSON.stringify(leftovers.rows[0])}`);
		console.log(
			failures === 0 ? "\nВСЕ СВЕРКИ СОШЛИСЬ" : `\nРАСХОЖДЕНИЙ: ${failures}`,
		);
		await pool.end();
	}
	if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
