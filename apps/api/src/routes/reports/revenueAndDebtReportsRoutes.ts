/**
 * Маршруты финансовых отчётов, выручки, дебиторской задолженности и сводки руководителя.
 * Sweet Spot: 100-150 строк.
 */

import type { FastifyInstance } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import {
	appointmentFunnel,
	chairLoad,
	doctorPerformance,
	financialExecutiveSummary,
	patientFlow,
	receivables,
	reminderEffect,
	revenueTimeline,
} from "../../services/reports/managerReports.js";
import { badRequest, periodQuerySchema, scopeForReport } from "./reportsShared.js";

export async function registerRevenueAndDebtReportsRoutes(app: FastifyInstance) {
	/**
	 * Динамика выручки за выбранный период с детализацией по дням, неделям или месяцам.
	 */
	app.get("/api/reports/revenue", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report revenue");
		if (!resolved) return;
		const report = await revenueTimeline(
			resolved.scope,
			resolved.query.granularity ?? "day",
		);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			...report,
		};
	});

	/**
	 * Сводный финансовый пульт руководителя: Выручка за период, наряды, средний чек и
	 * разбивка по реальным типам оплат (Наличные, Банковские карты, СБП QR, Депозиты).
	 */
	app.get("/api/reports/financial-summary", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report financial summary");
		if (!resolved) return;
		const report = await financialExecutiveSummary(resolved.scope);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			...report,
		};
	});

	/**
	 * Дебиторская задолженность пациентов на текущую дату отчёта.
	 */
	app.get("/api/reports/receivables", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"report receivables",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "analytics.read"))
			return;

		const parsed = periodQuerySchema.safeParse(request.query);
		if (!parsed.success)
			return badRequest(reply, "Проверьте параметры отчёта.");

		const options: { minDebtRub?: number; limit?: number } = {};
		if (parsed.data.minDebtRub !== undefined)
			options.minDebtRub = parsed.data.minDebtRub;
		if (parsed.data.limit !== undefined) options.limit = parsed.data.limit;

		return receivables(context.organizationId, options);
	});

	/**
	 * Единая сводка для руководителя: ключевые показатели клиники одним запросом.
	 */
	app.get("/api/reports/summary", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report summary");
		if (!resolved) return;

		const [revenue, doctors, chairs, funnel, flow, debts, reminders] =
			await Promise.all([
				revenueTimeline(resolved.scope, resolved.query.granularity ?? "day"),
				doctorPerformance(resolved.scope),
				chairLoad(resolved.scope),
				appointmentFunnel(resolved.scope),
				patientFlow(resolved.scope),
				receivables(resolved.scope.organizationId),
				reminderEffect(resolved.scope),
			]);

		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			revenue,
			doctors,
			chairs,
			appointments: funnel,
			reminderEffect: reminders,
			patientFlow: flow,
			receivables: {
				totalDebtRub: debts.totalDebtRub,
				byBucket: debts.byBucket,
				debtors: debts.rows.length,
				totalPrepaidRub: debts.totalPrepaidRub,
				prepayments: debts.prepayments,
			},
			isEmpty:
				revenue.isEmpty &&
				doctors.isEmpty &&
				chairs.isEmpty &&
				funnel.isEmpty &&
				flow.isEmpty,
		};
	});
}
