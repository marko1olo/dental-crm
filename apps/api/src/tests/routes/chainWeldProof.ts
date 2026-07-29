/**
 * ДОКАЗАТЕЛЬСТВО СКВОЗНОГО ПРОХОДА ЦЕПОЧКИ:
 * создать запись -> открыть приём -> записать карту приёма -> собрать смету ->
 * принять оплату -> прочитать долг и отчёты.
 *
 * Скрипт поднимает приложение в СВОЁМ процессе (`app.inject`). Общий сервер
 * разработки на 4100 отдаёт устаревший код: маршрут, добавленный в файл, там
 * отвечает 404, хотя он существует. Проверять новое звено по общему серверу
 * нельзя.
 *
 * ЧТО ЭТОТ СКРИПТ ПИШЕТ В БАЗУ. Пациента, запись, приём, план лечения и оплату —
 * иначе цепочку не пройти. Все созданные строки удаляются в конце по точным id,
 * и после удаления скрипт ещё раз читает деньги клиники, чтобы показать, что
 * итоги вернулись к исходным. Если прогон оборвётся, id уже напечатаны в
 * протоколе — по ним можно добить уборку руками.
 *
 * ЧТО ЗДЕСЬ ГОВОРИТСЯ ЗАМЕРОМ, А НЕ ПРОЗОЙ. Каждое утверждение о состоянии дерева
 * выводится из числа, которое печатается рядом. Правило появилось не из вкуса:
 * в шаге 6 стояла безусловная строка «РАЗРЫВ: … в treatment_items — там 0 строк»,
 * и после появления писателя в treatment_items (809f60382) она противоречила
 * собственному замеру строкой выше. Прогон при этом оставался зелёным — слово
 * «РАЗРЫВ» его не валит, — поэтому ложь жила в протоколе, который читают глазами.
 * Безусловная проза устаревает в день починки; утверждение, выведенное из факта,
 * не устаревает никогда.
 *
 * ЗАПУСК (cwd apps/api):
 *   node --import tsx src/tests/routes/chainWeldProof.ts
 *
 * Не тест: имя без `.test.ts`, `npm test` его не подхватывает, каталог src/tests
 * исключён из tsconfig и в общий typecheck файл не попадает.
 */

import { sql } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerReportRoutes } from "../../routes/reports.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

function money(value: unknown): number {
	return Math.round(Number(value ?? 0) * 100) / 100;
}

async function firstRow<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<T | null> {
	const result = await db.execute(query);
	return ((result.rows as T[])[0] ?? null) as T | null;
}

type MoneySnapshot = {
	readonly plannedRub: number;
	readonly paidRub: number;
	readonly dueRub: number;
	readonly receivablesTotalRub: number;
	readonly receivablesRows: number;
	readonly prepaidTotalRub: number;
	readonly prepaidRows: number;
	readonly doctorRevenueRub: number;
	readonly unattributedRevenueRub: number;
};

async function readMoney(app: FastifyInstance, clinicToken: string, staffToken: string, label: string): Promise<MoneySnapshot> {
	const dashboardResponse = await app.inject({
		method: "GET",
		url: "/api/dashboard",
		headers: { "x-dente-clinic-token": clinicToken },
	});
	const dashboard = dashboardResponse.statusCode === 200 ? JSON.parse(dashboardResponse.body) : {};
	const summary = dashboard.billingSummary ?? {};

	const receivablesResponse = await app.inject({
		method: "GET",
		url: "/api/reports/receivables",
		headers: { "x-dente-staff-token": staffToken },
	});
	const receivables = receivablesResponse.statusCode === 200 ? JSON.parse(receivablesResponse.body) : {};

	/*
	 * Период отчёта — не шире 400 дней: routes/reports.ts (MAX_PERIOD_DAYS)
	 * отвечает 400 на более длинный, и первый прогон этого скрипта именно так и
	 * получил «выручка по врачам 0» — это была ошибка запроса, а не ноль выручки.
	 * Такую «пустоту» нельзя выдавать за замер, поэтому окно взято вокруг
	 * сегодняшнего дня, куда попадает paid_at принятой оплаты.
	 */
	const doctorsResponse = await app.inject({
		method: "GET",
		url: "/api/reports/doctors?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z",
		headers: { "x-dente-staff-token": staffToken },
	});
	const doctors = doctorsResponse.statusCode === 200 ? JSON.parse(doctorsResponse.body) : {};
	const doctorRevenueRub = (doctors.rows ?? []).reduce((total: number, row: any) => total + money(row.revenueRub), 0);

	const snapshot: MoneySnapshot = {
		plannedRub: money(summary.totalPlannedRub),
		paidRub: money(summary.totalPaidRub),
		dueRub: money(summary.totalDueRub),
		receivablesTotalRub: money(receivables.totalDebtRub),
		receivablesRows: (receivables.rows ?? []).length,
		prepaidTotalRub: money(receivables.totalPrepaidRub),
		prepaidRows: (receivables.prepayments ?? []).length,
		doctorRevenueRub: money(doctorRevenueRub),
		unattributedRevenueRub: money(doctors.unattributedRevenueRub),
	};
	console.log(
		`[${label}] дашборд: назначено=${snapshot.plannedRub} оплачено=${snapshot.paidRub} долг=${snapshot.dueRub}; ` +
			`дебиторка: итог=${snapshot.receivablesTotalRub} должников=${snapshot.receivablesRows}; ` +
			`переплаты: итог=${snapshot.prepaidTotalRub} пациентов=${snapshot.prepaidRows}; ` +
			`врачи: выручка по врачам=${snapshot.doctorRevenueRub} не отнесено=${snapshot.unattributedRevenueRub}` +
			` (HTTP ${dashboardResponse.statusCode}/${receivablesResponse.statusCode}/${doctorsResponse.statusCode})`,
	);
	return snapshot;
}

async function main(): Promise<void> {
	// Гейты периметра в этом прогоне открыты явно и только для своего процесса:
	// секретов администратора у скрипта нет, а мягкий режим разрешён вне
	// production (apps/api/src/accessGuard.ts, routes/schedule.ts).
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
	process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS = "1";

	const org = await firstRow<{ id: string; name: string }>(
		sql`select o.id::text as id, o.name
		      from organizations o
		     where exists (select 1 from users u where u.organization_id = o.id and u.role = 'doctor')
		       and exists (select 1 from chairs c where c.organization_id = o.id)
		     order by o.name
		     limit 1`,
	);
	if (!org) throw new Error("В базе нет клиники с врачом и креслом — цепочку проходить не на чем.");

	const doctor = await firstRow<{ id: string; full_name: string }>(
		sql`select id::text as id, full_name from users
		     where organization_id = ${org.id} and role = 'doctor' and is_active
		     order by full_name limit 1`,
	);
	const chair = await firstRow<{ id: string; title: string }>(
		sql`select id::text as id, name as title from chairs
		     where organization_id = ${org.id} and is_active
		     order by name limit 1`,
	);
	if (!doctor || !chair) throw new Error("У клиники нет активного врача или кресла.");

	const service = await firstRow<{ id: string; title: string; price_rub: string }>(
		sql`select id::text as id, title, price_rub::text as price_rub from service_catalog_items
		     where organization_id = ${org.id} and is_active
		     order by price_rub desc limit 1`,
	);

	console.log(`КЛИНИКА «${org.name}» (${org.id})`);
	console.log(`врач: ${doctor.full_name} (${doctor.id}); кресло: ${chair.title} (${chair.id})`);
	console.log(service ? `услуга прайса: ${service.title} (${service.id}), ${service.price_rub} ₽` : "прайс пуст: смета уйдёт со своей ценой");

	const clinicToken = signToken({ organizationId: org.id }, authTokenSecret());
	const staffToken = signToken({ organizationId: org.id, userId: doctor.id, role: "owner" }, authTokenSecret());

	const app = Fastify();
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerDashboardRoutes(app);
	await registerReportRoutes(app);
	await registerScheduleRoutes(app);
	await registerVisitRoutes(app);
	await registerBillingRoutes(app);
	await registerOdontogramRoutes(app);
	await app.ready();

	let patientId: string | null = null;
	let appointmentId: string | null = null;
	let visitId: string | null = null;
	let paymentId: string | null = null;
	let planId: string | null = null;

	try {
		console.log("\n=== ШАГ 0. ДЕНЬГИ КЛИНИКИ ДО ПРОХОДА ===");
		const before = await readMoney(app, clinicToken, staffToken, "до");

		console.log("\n=== ШАГ 1. ПАЦИЕНТ (предпосылка, не звено цепочки: пишется напрямую) ===");
		const patient = await firstRow<{ id: string }>(
			sql`insert into patients (organization_id, full_name, status)
			     values (${org.id}, ${"Проверка цепочки (удалить)"}, 'active')
			     returning id::text as id`,
		);
		if (!patient) throw new Error("Пациент не создан.");
		patientId = patient.id;
		console.log(`пациент создан: ${patientId}`);

		console.log("\n=== ШАГ 2. СОЗДАТЬ ЗАПИСЬ: POST /api/appointments ===");
		const startsAt = "2027-03-01T09:00:00+04:00";
		const endsAt = "2027-03-01T10:00:00+04:00";
		const appointmentResponse = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: { "x-dente-clinic-token": clinicToken, "content-type": "application/json" },
			payload: {
				patientId,
				doctorUserId: doctor.id,
				chairId: chair.id,
				status: "planned",
				startsAt,
				endsAt,
				reason: "Проверка сквозного прохода цепочки",
			},
		});
		console.log(`POST /api/appointments -> HTTP ${appointmentResponse.statusCode}`);
		if (appointmentResponse.statusCode !== 201) {
			console.log(`тело: ${appointmentResponse.body.slice(0, 400)}`);
			throw new Error("Запись не создана — дальше цепочку идти нечем.");
		}
		const createdAppointment = await firstRow<{ id: string; status: string }>(
			sql`select id::text as id, status::text as status from appointments
			     where organization_id = ${org.id} and patient_id = ${patientId}
			     order by starts_at desc limit 1`,
		);
		if (!createdAppointment) throw new Error("Запись не найдена в базе после 201.");
		appointmentId = createdAppointment.id;
		console.log(`запись в базе: ${appointmentId} статус=${createdAppointment.status}`);

		console.log("\n=== ШАГ 3. ОТКРЫТЬ ПРИЁМ: POST /api/appointments/:id/visit (новое звено) ===");
		const openResponse = await app.inject({
			method: "POST",
			url: `/api/appointments/${appointmentId}/visit`,
			headers: { "x-dente-clinic-token": clinicToken },
		});
		console.log(`первый вызов -> HTTP ${openResponse.statusCode} ${openResponse.body.slice(0, 300)}`);
		if (openResponse.statusCode !== 201) throw new Error("Приём не открылся: звено не работает.");
		visitId = JSON.parse(openResponse.body).visit.id as string;

		const openAgainResponse = await app.inject({
			method: "POST",
			url: `/api/appointments/${appointmentId}/visit`,
			headers: { "x-dente-clinic-token": clinicToken },
		});
		const openAgain = openAgainResponse.statusCode === 200 ? JSON.parse(openAgainResponse.body) : null;
		console.log(`повторный вызов -> HTTP ${openAgainResponse.statusCode} created=${openAgain?.created} тот же приём=${openAgain?.visit?.id === visitId}`);
		const visitCount = await firstRow<{ n: number }>(
			sql`select count(*)::int as n from visits where appointment_id = ${appointmentId}`,
		);
		console.log(`визитов по этой записи в базе: ${visitCount?.n} (должен быть ровно 1: второй увёл бы за собой activeVisit и деньги)`);

		console.log("\n=== ШАГ 4. КАРТА ПРИЁМА: та же пара маршрутов, что отвечала 404/409 ===");
		const draftGet = await app.inject({
			method: "GET",
			url: `/api/visits/${visitId}/draft/autosave`,
			headers: { "x-dente-clinic-token": clinicToken },
		});
		console.log(`GET  черновик -> HTTP ${draftGet.statusCode} ${draftGet.body.slice(0, 220)}`);
		const draftPut = await app.inject({
			method: "PUT",
			url: `/api/visits/${visitId}/draft/autosave`,
			headers: { "x-dente-clinic-token": clinicToken, "content-type": "application/json" },
			payload: {
				patientId,
				selectedSpecialty: "therapist",
				transcript: "Проверка сквозного прохода: врач записывает приём.",
				draft: {
					warnings: [],
					complaint: "Боль при накусывании на 36 зуб",
					anamnesis: "Впервые",
					objectiveStatus: "Глубокая кариозная полость 36",
					diagnosis: "K02.1 Кариес дентина",
					treatmentPlan: "Лечение кариеса 36",
				},
			},
		});
		console.log(`PUT  автосохранение -> HTTP ${draftPut.statusCode} ${draftPut.body.slice(0, 200)}`);

		console.log("\n=== ШАГ 5. ДАШБОРД: какой приём считается открытым (барьер кассы) ===");
		const dashboardAfterOpen = await app.inject({
			method: "GET",
			url: "/api/dashboard",
			headers: { "x-dente-clinic-token": clinicToken },
		});
		const dashboard = dashboardAfterOpen.statusCode === 200 ? JSON.parse(dashboardAfterOpen.body) : {};
		console.log(
			`activeVisit: id=${dashboard.activeVisit?.id} пациент=${dashboard.activeVisit?.patientId} ` +
				`статус=${dashboard.activeVisit?.status} запись=${dashboard.activeVisit?.appointmentId}`,
		);
		console.log(
			`это мой приём=${dashboard.activeVisit?.id === visitId}, пациент совпадает=${dashboard.activeVisit?.patientId === patientId}` +
				" — именно это условие проверяет касса (usePatientLogic.ts: paymentPatientContextReady)",
		);

		console.log("\n=== ШАГ 6. СМЕТА: POST /api/patients/:id/treatment-plans ===");
		const planResponse = await app.inject({
			method: "POST",
			url: `/api/patients/${patientId}/treatment-plans`,
			headers: { "x-dente-staff-token": staffToken, "content-type": "application/json" },
			payload: {
				name: "Проверка цепочки: смета",
				items: [
					{
						toothNumber: 36,
						priceId: service?.id ?? "manual",
						name: service?.title ?? "Лечение кариеса",
						quantity: 1,
						price: 4000,
						discount: 0,
						phase: 1,
					},
				],
			},
		});
		console.log(`POST смета -> HTTP ${planResponse.statusCode} ${planResponse.body.slice(0, 300)}`);
		if (planResponse.statusCode === 200) planId = JSON.parse(planResponse.body).planId ?? null;
		const planTables = await firstRow<Record<string, unknown>>(
			sql`select
			      (select count(*)::int from treatment_plans where patient_id = ${patientId}) as treatment_plans,
			      (select count(*)::int from treatment_plan_items_new tpi
			        join treatment_plans tp on tp.id = tpi.plan_id where tp.patient_id = ${patientId}) as plan_items_new,
			      (select count(*)::int from treatment_items where patient_id = ${patientId}) as treatment_items`,
		);
		console.log(`после сметы в базе: ${JSON.stringify(planTables)}`);

		/*
		 * ЗДЕСЬ СТОЯЛА БЕЗУСЛОВНАЯ СТРОКА «РАЗРЫВ: … в treatment_items — там 0 строк».
		 *
		 * Она была верна в день, когда её написали, и стала ЛОЖЬЮ в день, когда
		 * появился писатель в treatment_items (809f60382): строкой выше печаталось
		 * `{"treatment_plans":1,"plan_items_new":1,"treatment_items":1}`, а строкой
		 * ниже — «там 0 строк». Замер и утверждение о нём противоречили друг другу с
		 * расстоянием в одну строку, и прогон от этого не падал: слово «РАЗРЫВ»
		 * прогон не валит. Человек, читающий протокол, получал неверную картину
		 * дерева и шёл чинить работающее — в этом дереве из-за такого чтения уже был
		 * отозван заголовок.
		 *
		 * ПОЭТОМУ УТВЕРЖДЕНИЕ ВЫВЕДЕНО ИЗ ЗАМЕРА, А НЕ ВПИСАНО РЯДОМ С НИМ. Такая
		 * строка не устаревает: вернётся дефект — вернётся и слово «РАЗРЫВ», причём
		 * со счётчиком, который прогон сквозных сценариев читает как заявленное
		 * нарушение (`НАРУШЕНИЙ: n` при n больше нуля). То есть бывшая проза стала
		 * гейтом: молча вернуть разрыв больше нельзя.
		 */
		const planItemsPosted = Number(planTables?.plan_items_new ?? 0);
		const moneyItemsPosted = Number(planTables?.treatment_items ?? 0);
		if (planResponse.statusCode !== 200) {
			console.log(
				`ШОВ НЕ ПРОВЕРЕН: маршрут сметы ответил ${planResponse.statusCode}, проводить в книгу лечения было нечего. ` +
					"НАРУШЕНИЙ: 0 (шов сметы и денег)",
			);
		} else if (moneyItemsPosted > 0) {
			console.log(
				`ШОВ ЦЕЛ: смета проведена в денежную таблицу той же транзакцией — treatment_items ${moneyItemsPosted} ` +
					`строк(и) по этому пациенту при ${planItemsPosted} позиции(ях) плана. Все восемь денежных читателей ` +
					"клиники читают именно treatment_items, поэтому назначенное видно на главном экране и в дебиторке. " +
					"НАРУШЕНИЙ: 0 (шов сметы и денег)",
			);
		} else {
			console.log(
				`РАЗРЫВ: маршрут сметы ответил 200 и записал план (plan_items_new=${planItemsPosted}), ` +
					"а в treatment_items 0 строк. Деньги читают только её, значит клиника видит «назначено 0 ₽» и " +
					"«должников 0»: счёт пациенту уйдёт с пустой суммой, звонить должнику будет некому. " +
					"НАРУШЕНИЙ: 1 (шов сметы и денег)",
			);
		}
		await readMoney(app, clinicToken, staffToken, "после сметы");

		console.log("\n=== ШАГ 7. ОПЛАТА: POST /api/billing/payments с приёмом этого пациента ===");
		const paymentResponse = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: { "x-dente-clinic-token": clinicToken, "content-type": "application/json" },
			payload: {
				patientId,
				visitId,
				amountRub: 1500.5,
				method: "cash",
				clientMutationId: `chain-weld-proof-${Date.now()}`,
			},
		});
		console.log(`POST оплата -> HTTP ${paymentResponse.statusCode} ${paymentResponse.body.slice(0, 300)}`);
		if (paymentResponse.statusCode === 201 || paymentResponse.statusCode === 200) {
			paymentId = JSON.parse(paymentResponse.body).id ?? null;
		}
		const storedPayment = await firstRow<Record<string, unknown>>(
			sql`select p.id::text as id, p.amount_rub::text as amount_rub, p.status::text as status,
			           p.visit_id::text as visit_id, a.doctor_user_id::text as doctor_user_id
			      from payments p
			      left join visits v on v.id = p.visit_id
			      left join appointments a on a.id = v.appointment_id
			     where p.patient_id = ${patientId}`,
		);
		console.log(`оплата в базе: ${JSON.stringify(storedPayment)}`);
		console.log(
			`деньги привязаны к врачу записи=${storedPayment?.doctor_user_id === doctor.id}` +
				" — это единственная связь выручки с врачом в отчётах (payments.visit_id -> visits.appointment_id -> doctor_user_id)",
		);

		console.log("\n=== ШАГ 8. ПРОЧИТАТЬ ДОЛГ ПОСЛЕ ОПЛАТЫ ===");
		const after = await readMoney(app, clinicToken, staffToken, "после оплаты");
		console.log(
			`ИЗМЕНЕНИЯ: назначено ${before.plannedRub} -> ${after.plannedRub}; оплачено ${before.paidRub} -> ${after.paidRub}; ` +
				`долг дашборда ${before.dueRub} -> ${after.dueRub}; дебиторка ${before.receivablesTotalRub} -> ${after.receivablesTotalRub}; ` +
				`выручка по врачам ${before.doctorRevenueRub} -> ${after.doctorRevenueRub}`,
		);
		console.log(
			`РАСХОЖДЕНИЕ ФОРМУЛ ДОЛГА: дашборд вычел мои ${money(after.paidRub - before.paidRub)} ₽ из долга ВСЕЙ клиники ` +
				`(${before.dueRub} -> ${after.dueRub}), а итог дебиторки не изменился (${after.receivablesTotalRub}).`,
		);
		console.log(
			`ПЕРЕПЛАТА ТЕПЕРЬ НАЗВАНА: отчёт дебиторки показывает переплаты ${before.prepaidTotalRub} -> ${after.prepaidTotalRub} ₽ ` +
				`у ${after.prepaidRows} пациент(ов). Сходимость с главным экраном: долг ${after.receivablesTotalRub} − ` +
				`переплаты ${after.prepaidTotalRub} = ${money(after.receivablesTotalRub - after.prepaidTotalRub)}, ` +
				`долг главного экрана = ${after.dueRub}.`,
		);
		const receivablesBody = await app.inject({
			method: "GET",
			url: "/api/reports/receivables",
			headers: { "x-dente-staff-token": staffToken },
		});
		if (receivablesBody.statusCode === 200) {
			const parsedReceivables = JSON.parse(receivablesBody.body);
			for (const row of parsedReceivables.prepayments ?? []) {
				console.log(`   переплата: ${row.patientName} — ${money(row.prepaidRub)} ₽`);
			}
			console.log(`   примечание отчёта: ${parsedReceivables.note}`);
		}
		const patientDebt = await firstRow<Record<string, unknown>>(
			sql`select
			      coalesce((select sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0))
			                  from treatment_items where patient_id = ${patientId} and status <> 'cancelled'), 0)::numeric(12,2) as planned_rub,
			      coalesce((select sum(amount_rub) from payments where patient_id = ${patientId} and status = 'paid'), 0)::numeric(12,2) as paid_rub`,
		);
		console.log(`по этому пациенту SQL: ${JSON.stringify(patientDebt)} — долг отрицательный, отчёт дебиторки такие строки отбрасывает`);

		console.log("\n=== ШАГ 9. ЗАКРЫТЬ ПРИЁМ: POST /api/visits/:id/draft/accept ===");
		const acceptResponse = await app.inject({
			method: "POST",
			url: `/api/visits/${visitId}/draft/accept`,
			headers: { "x-dente-clinic-token": clinicToken, "content-type": "application/json" },
			payload: {
				patientId,
				selectedSpecialty: "therapist",
				transcript: "Проверка сквозного прохода: врач подписывает карту приёма.",
				draft: {
					warnings: [],
					complaint: "Боль при накусывании на 36 зуб",
					anamnesis: "Впервые",
					objectiveStatus: "Глубокая кариозная полость 36",
					diagnosis: "K02.1 Кариес дентина",
					treatmentPlan: "Лечение кариеса 36",
				},
				doctorSummary: "Лечение кариеса 36 выполнено",
			},
		});
		console.log(`POST подписание -> HTTP ${acceptResponse.statusCode} ${acceptResponse.body.slice(0, 200)}`);
		const closedVisit = await firstRow<{ status: string }>(
			sql`select status::text as status from visits where id = ${visitId}`,
		);
		console.log(`статус приёма после подписания: ${closedVisit?.status}`);
		const itemsAfterAccept = await firstRow<{ n: number }>(
			sql`select count(*)::int as n from treatment_items where visit_id = ${visitId}`,
		);
		/*
		 * Тот же приём, что и в шаге 6: утверждение выводится из замера. Прежняя
		 * строка сообщала «позиции не создаёт и не закрывает» безусловно, то есть
		 * пережила бы появление такого писателя молча — а это ровно то событие, из-за
		 * которого соседняя строка про treatment_items и стала ложью.
		 */
		const itemsAtSignedVisit = Number(itemsAfterAccept?.n ?? 0);
		console.log(
			itemsAtSignedVisit === 0
				? "позиций лечения у подписанного приёма: 0 — подписание карты приёма их не создаёт и ни одну не закрывает " +
						"(visitsQuery.ts: acceptVisitDraftInDb трогает только visits). Позиции пришли из маршрута сметы и " +
						"с приёмом не связаны, поэтому датировать их сроком долга нечем."
				: `позиций лечения у подписанного приёма: ${itemsAtSignedVisit} — у подписанного приёма позиции ЕСТЬ, ` +
						"значит их кто-то связал с visit_id: проверить, кто это делает, и сходится ли срок долга по ним.",
		);
	} finally {
		console.log("\n=== ШАГ 10. УБОРКА: удаляю только свои строки по точным id ===");
		console.log(
			`id прогона: пациент=${patientId} запись=${appointmentId} приём=${visitId} оплата=${paymentId} план=${planId}`,
		);
		if (planId) {
			await db.execute(sql`delete from treatment_plan_items_new where plan_id = ${planId}`);
			await db.execute(sql`delete from treatment_plans where id = ${planId}`);
		}
		if (patientId) {
			await db.execute(sql`delete from treatment_items where patient_id = ${patientId}`);
			await db.execute(sql`delete from payments where patient_id = ${patientId}`);
		}
		if (visitId) await db.execute(sql`delete from visits where id = ${visitId}`);
		if (appointmentId) await db.execute(sql`delete from appointments where id = ${appointmentId}`);
		if (patientId) await db.execute(sql`delete from patients where id = ${patientId}`);
		const leftovers = await firstRow<Record<string, unknown>>(
			sql`select
			      (select count(*)::int from patients where full_name = ${"Проверка цепочки (удалить)"}) as patients,
			      (select count(*)::int from visits where id = ${visitId ?? "00000000-0000-0000-0000-000000000000"}) as visits,
			      (select count(*)::int from appointments where id = ${appointmentId ?? "00000000-0000-0000-0000-000000000000"}) as appointments`,
		);
		console.log(`остатки после уборки (должны быть нули): ${JSON.stringify(leftovers)}`);

		// Читаем деньги тем же приложением: если уборка что-то забыла, итоги не
		// вернутся к исходным, и это будет видно в протоколе.
		await readMoney(app, clinicToken, staffToken, "после уборки");
		await app.close();
		await pool.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
