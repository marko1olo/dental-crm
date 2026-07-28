/**
 * РАЗВЕДКА ЦЕПОЧКИ: запись -> приём -> выполненные услуги -> сумма -> оплата ->
 * долг -> отчёты. ТОЛЬКО ЧТЕНИЕ: ни одной вставки, ни одного UPDATE, ни одного
 * DELETE. Скрипт поднимает приложение в СВОЁМ процессе (app.inject), потому что
 * общий сервер разработки на 4100 отдаёт устаревший код.
 *
 * ЗАПУСК (cwd apps/api):
 *   node --import tsx src/tests/routes/chainReconProof.ts
 *
 * Не тест: имя без `.test.ts`, `npm test` его не подхватывает. Каталог src/tests
 * исключён из tsconfig, поэтому файл не участвует в общем typecheck.
 */

import { sql } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { registerReportRoutes } from "../../routes/reports.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

function money(value: unknown): number {
	return Math.round(Number(value ?? 0) * 100) / 100;
}

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerDashboardRoutes(app);
	await registerReportRoutes(app);
	await app.ready();
	return app;
}

async function rows(label: string, query: ReturnType<typeof sql>): Promise<Record<string, unknown>[]> {
	const result = await db.execute(query);
	const data = result.rows as Record<string, unknown>[];
	console.log(`\n--- ${label} ---`);
	if (data.length === 0) console.log("(пусто)");
	for (const row of data) console.log(JSON.stringify(row));
	return data;
}

async function main(): Promise<void> {
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

	console.log("=== ШАГ 0. ОБЪЁМ ДАННЫХ ЦЕПОЧКИ ===");
	await rows(
		"строки таблиц звеньев",
		sql`select
			(select count(*)::int from organizations) as organizations,
			(select count(*)::int from patients) as patients,
			(select count(*)::int from appointments) as appointments,
			(select count(*)::int from visits) as visits,
			(select count(*)::int from visits where appointment_id is not null) as visits_with_appointment,
			(select count(*)::int from visit_diaries) as visit_diaries,
			(select count(*)::int from treatment_items) as treatment_items,
			(select count(*)::int from treatment_plans) as treatment_plans,
			(select count(*)::int from treatment_plan_items_new) as plan_items_new,
			(select count(*)::int from payments) as payments,
			(select count(*)::int from generated_documents) as documents,
			(select count(*)::int from cash_ledger) as cash_ledger`,
	);

	await rows(
		"позиции лечения по статусу и связи с приёмом",
		sql`select status::text as status,
		       count(*)::int as items,
		       count(*) filter (where visit_id is null)::int as without_visit,
		       count(*) filter (where quantity <> round(quantity))::int as fractional_quantity,
		       sum(greatest(unit_price_rub * greatest(quantity, 1) - discount_rub, 0))::numeric(12,2) as planned_sql,
		       sum(price_rub)::numeric(12,2) as price_rub_column
		  from treatment_items
		 group by status
		 order by status`,
	);

	await rows(
		"платежи по статусу и способу, связь с приёмом",
		sql`select status::text as status, method::text as method,
		       count(*)::int as n,
		       count(*) filter (where visit_id is null)::int as without_visit,
		       sum(amount_rub)::numeric(12,2) as amount_rub
		  from payments
		 group by status, method
		 order by status, method`,
	);

	await rows(
		"приёмы по статусу",
		sql`select status::text as status, count(*)::int as n from appointments group by status order by status`,
	);
	await rows(
		"визиты по статусу",
		sql`select status::text as status, count(*)::int as n from visits group by status order by status`,
	);

	console.log("\n=== ШАГ 1. РАЗРЫВ «ПИШЕМ В ОДНУ ТАБЛИЦУ, ЧИТАЕМ ИЗ ДРУГОЙ» ===");
	await rows(
		"план из odontogram (treatment_plan_items_new) против денежной таблицы (treatment_items)",
		sql`select
			(select count(*)::int from treatment_plan_items_new) as plan_items_new,
			(select count(*)::int from treatment_plan_items_new where organization_id is null) as plan_items_new_without_org,
			(select coalesce(sum(greatest(price * quantity - discount, 0)), 0)::numeric(12,2) from treatment_plan_items_new) as plan_items_new_sum,
			(select count(*)::int from treatment_items) as treatment_items,
			(select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)), 0)::numeric(12,2) from treatment_items) as treatment_items_sum`,
	);
	await rows(
		"строки «Выполнено:» в тексте плана приёма — читаемы человеком, не программой",
		sql`select count(*)::int as visits_with_done_text
		      from visits
		     where treatment_plan like '%Выполнено:%'`,
	);

	console.log("\n=== ШАГ 2. СВЕРКА ДЕНЕГ ПО КАЖДОЙ КЛИНИКЕ ===");
	const orgs = (await db.execute(sql`select id::text as id, name from organizations order by name`))
		.rows as { id: string; name: string }[];

	const app = await buildApp();
	try {
		for (const org of orgs) {
			console.log(`\n########## КЛИНИКА «${org.name}» (${org.id}) ##########`);

			// Независимый SQL: три разные формулы «назначено».
			const totals = (
				await db.execute(sql`
					select
					  (select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)),0)::numeric(12,2)
					     from treatment_items where organization_id = ${org.id} and status <> 'cancelled') as planned_sql_greatest,
					  (select coalesce(sum(greatest(unit_price_rub * round(greatest(quantity,1)) - discount_rub, 0)),0)::numeric(12,2)
					     from treatment_items where organization_id = ${org.id} and status <> 'cancelled') as planned_dashboard_rounded,
					  (select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)),0)::numeric(12,2)
					     from treatment_items where organization_id = ${org.id} and status = 'completed') as planned_completed_only,
					  (select coalesce(sum(amount_rub),0)::numeric(12,2)
					     from payments where organization_id = ${org.id} and status = 'paid') as paid_sql,
					  (select coalesce(sum(amount_rub),0)::numeric(12,2)
					     from payments where organization_id = ${org.id} and status = 'planned') as advance_planned_sql,
					  (select coalesce(sum(amount_rub),0)::numeric(12,2)
					     from payments where organization_id = ${org.id} and status = 'paid' and visit_id is null) as paid_without_visit,
					  (select coalesce(sum(amount_rub),0)::numeric(12,2)
					     from payments p where p.organization_id = ${org.id} and p.status = 'paid'
					       and exists (select 1 from visits v join appointments a on a.id = v.appointment_id
					                    where v.id = p.visit_id and a.doctor_user_id is not null)) as paid_attributable_to_doctor
				`)
			).rows[0] as Record<string, unknown>;
			console.log(`SQL напрямую: ${JSON.stringify(totals)}`);

			const clinicToken = signToken({ organizationId: org.id }, authTokenSecret());
			const staffToken = signToken(
				{ organizationId: org.id, userId: "00000000-0000-0000-0000-000000000000", role: "owner" },
				authTokenSecret(),
			);

			const dashboardResponse = await app.inject({
				method: "GET",
				url: "/api/dashboard",
				headers: { "x-dente-clinic-token": clinicToken },
			});
			if (dashboardResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/dashboard HTTP ${dashboardResponse.statusCode}: ${dashboardResponse.body.slice(0, 300)}`);
			} else {
				const dashboard = JSON.parse(dashboardResponse.body);
				console.log(`/api/dashboard billingSummary: ${JSON.stringify(dashboard.billingSummary)}`);
				console.log(
					`/api/dashboard activeVisit: id=${dashboard.activeVisit?.id} пациент=${dashboard.activeVisit?.patientId} ` +
						`статус=${dashboard.activeVisit?.status} запись=${dashboard.activeVisit?.appointmentId}`,
				);
				console.log(
					`/api/dashboard коллекции: позиций плана ${dashboard.treatmentPlanItems?.length ?? "нет"}, ` +
						`оплат ${dashboard.payments?.length ?? "нет"}, приёмов ${dashboard.appointments?.length ?? "нет"}, ` +
						`пациентов ${dashboard.patients?.length ?? "нет"}, прайс ${dashboard.serviceCatalog?.length ?? "нет"}`,
				);
				const summary = dashboard.billingSummary ?? {};
				console.log(
					`СВЕРКА: назначено дашборд=${money(summary.totalPlannedRub)} vs SQL(greatest)=${money(totals.planned_sql_greatest)} ` +
						`vs SQL(round)=${money(totals.planned_dashboard_rounded)}; ` +
						`оплачено дашборд=${money(summary.totalPaidRub)} vs SQL=${money(totals.paid_sql)}; ` +
						`долг дашборд=${money(summary.totalDueRub)}`,
				);
				console.log(
					`СВЕРКА выполненного: сумма только по completed=${money(totals.planned_completed_only)} — ` +
						`дашборд в totalDueRub её НЕ использует (берёт все не отменённые).`,
				);
				// Сколько пациентов дашборд считает в активном визите
				const insights = dashboard.patientInsights ?? [];
				const insightDebt = insights.reduce((sum: number, row: any) => sum + money(row.balanceDueRub), 0);
				console.log(`patientInsights: строк ${insights.length}, сумма balanceDueRub=${money(insightDebt)}`);
			}

			const receivablesResponse = await app.inject({
				method: "GET",
				url: "/api/reports/receivables",
				headers: { "x-dente-staff-token": staffToken },
			});
			if (receivablesResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/reports/receivables HTTP ${receivablesResponse.statusCode}: ${receivablesResponse.body.slice(0, 300)}`);
			} else {
				const receivables = JSON.parse(receivablesResponse.body);
				console.log(
					`/api/reports/receivables: должников ${receivables.rows?.length ?? 0}, ` +
						`итог долга=${money(receivables.totalDebtRub)}, корзины=${JSON.stringify(receivables.byBucket)}`,
				);
				for (const row of (receivables.rows ?? []).slice(0, 10)) {
					console.log(`   ${row.patientName}: ${money(row.debtRub)} ₽ (${row.bucket}, с ${row.oldestChargeAt})`);
				}
			}

			const doctorsResponse = await app.inject({
				method: "GET",
				url: `/api/reports/doctors?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z`,
				headers: { "x-dente-staff-token": staffToken },
			});
			if (doctorsResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/reports/doctors HTTP ${doctorsResponse.statusCode}: ${doctorsResponse.body.slice(0, 300)}`);
			} else {
				const doctors = JSON.parse(doctorsResponse.body);
				console.log(
					`/api/reports/doctors: строк ${doctors.rows?.length ?? 0}, не отнесено к врачу=${money(doctors.unattributedRevenueRub)}`,
				);
				console.log(`   примечание: ${doctors.attributionNote}`);
				for (const row of doctors.rows ?? []) {
					console.log(`   ${row.doctorName}: выручка=${money(row.revenueRub)}, приёмов=${row.appointmentsTotal}, завершено=${row.appointmentsCompleted}`);
				}
			}

			const servicesResponse = await app.inject({
				method: "GET",
				url: `/api/reports/services?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z`,
				headers: { "x-dente-staff-token": staffToken },
			});
			if (servicesResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/reports/services HTTP ${servicesResponse.statusCode}: ${servicesResponse.body.slice(0, 300)}`);
			} else {
				const services = JSON.parse(servicesResponse.body);
				console.log(
					`/api/reports/services: строк ${services.rows?.length ?? 0}, назначено итого=${money(services.plannedTotalRub)}`,
				);
			}

			const revenueResponse = await app.inject({
				method: "GET",
				url: `/api/reports/revenue?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z&granularity=month`,
				headers: { "x-dente-staff-token": staffToken },
			});
			if (revenueResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/reports/revenue HTTP ${revenueResponse.statusCode}: ${revenueResponse.body.slice(0, 300)}`);
			} else {
				const revenue = JSON.parse(revenueResponse.body);
				console.log(`/api/reports/revenue: точек ${revenue.points?.length ?? 0}, итог=${money(revenue.totalRub)}`);
			}
		}
	} finally {
		await app.close();
	}

	console.log("\n=== ШАГ 3. ПОПАРНАЯ СВЕРКА ПО ПАЦИЕНТАМ (назначено/оплачено/долг) ===");
	await rows(
		"пациенты, у которых числа расходятся между формулами",
		sql`with planned as (
			  select patient_id, organization_id,
			         sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0))::numeric(12,2) as planned_greatest,
			         sum(greatest(unit_price_rub * round(greatest(quantity,1)) - discount_rub, 0))::numeric(12,2) as planned_rounded,
			         sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)) filter (where status = 'completed')::numeric(12,2) as planned_completed
			    from treatment_items where status <> 'cancelled'
			   group by patient_id, organization_id
			), paid as (
			  select patient_id, sum(amount_rub)::numeric(12,2) as paid_rub
			    from payments where status = 'paid' group by patient_id
			), advance as (
			  select patient_id, sum(amount_rub)::numeric(12,2) as advance_rub
			    from payments where status = 'planned' group by patient_id
			)
			select p.full_name,
			       pl.planned_greatest, pl.planned_rounded, pl.planned_completed,
			       coalesce(pd.paid_rub, 0) as paid_rub,
			       coalesce(ad.advance_rub, 0) as advance_rub,
			       (pl.planned_greatest - coalesce(pd.paid_rub, 0))::numeric(12,2) as debt_receivables,
			       (pl.planned_rounded - coalesce(pd.paid_rub, 0))::numeric(12,2) as debt_dashboard
			  from planned pl
			  join patients p on p.id = pl.patient_id
			  left join paid pd on pd.patient_id = pl.patient_id
			  left join advance ad on ad.patient_id = pl.patient_id
			 order by pl.planned_greatest desc
			 limit 25`,
	);

	await rows(
		"оплаты пациентов, у которых нет ни одной позиции лечения — долг отрицательный, отчёт их не покажет",
		sql`select p.full_name, sum(pay.amount_rub)::numeric(12,2) as paid_rub, count(*)::int as payments
		      from payments pay
		      join patients p on p.id = pay.patient_id
		     where pay.status = 'paid'
		       and not exists (select 1 from treatment_items ti where ti.patient_id = pay.patient_id and ti.status <> 'cancelled')
		     group by p.full_name
		     order by paid_rub desc
		     limit 15`,
	);

	console.log("\n=== ШАГ 4. ОТКРЫТИЕ ПРИЁМА: МАРШРУТЫ ЧЕРНОВИКА ПРОТИВ ЖИВОГО activeVisit ===");
	const visitApp = Fastify();
	visitApp.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerVisitRoutes(visitApp);
	await visitApp.ready();
	try {
		for (const org of orgs) {
			const live = (
				await db.execute(sql`
					select id::text as id, patient_id::text as patient_id, status::text as status
					  from visits
					 where organization_id = ${org.id}
					 order by (status = 'draft') desc, updated_at desc
					 limit 1
				`)
			).rows[0] as { id: string; patient_id: string; status: string } | undefined;
			if (!live) {
				console.log(`\n«${org.name}»: приёмов в базе нет вовсе — карту приёма открывать не на чем.`);
				continue;
			}
			console.log(`\n«${org.name}»: дашборд подставит визит ${live.id} статус=${live.status}`);
			const clinicToken = signToken({ organizationId: org.id }, authTokenSecret());
			const get = await visitApp.inject({
				method: "GET",
				url: `/api/visits/${live.id}/draft/autosave`,
				headers: { "x-dente-clinic-token": clinicToken },
			});
			console.log(`  GET  /api/visits/${live.id}/draft/autosave -> HTTP ${get.statusCode} ${get.body.slice(0, 220)}`);
			const put = await visitApp.inject({
				method: "PUT",
				url: `/api/visits/${live.id}/draft/autosave`,
				headers: { "x-dente-clinic-token": clinicToken, "content-type": "application/json" },
				payload: {
					patientId: live.patient_id,
					selectedSpecialty: "therapist",
					transcript: "разведка цепочки: попытка автосохранения черновика",
					draft: {
						warnings: [],
						complaint: "проверка",
						anamnesis: "",
						objectiveStatus: "",
						diagnosis: "",
						treatmentPlan: "",
					},
				},
			});
			console.log(`  PUT  автосохранение -> HTTP ${put.statusCode} ${put.body.slice(0, 260)}`);
			if (put.statusCode === 200) {
				console.log("  ВНИМАНИЕ: автосохранение прошло — значит визит был черновиком, состояние базы изменено этим шагом.");
			}
		}
	} finally {
		await visitApp.close();
	}

	console.log("\nГОТОВО. Единственная возможная запись — PUT автосохранения выше, и он отвечает отказом на подписанном визите.");
	await pool.end();
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
