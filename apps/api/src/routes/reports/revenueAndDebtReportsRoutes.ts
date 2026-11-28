/**
 * Маршруты финансовых отчётов, выручки, дебиторской задолженности и сводки руководителя.
 * Sweet Spot: 100-150 строк.
 */

import type { FastifyInstance } from "fastify";
import { defineTenantQuery } from "../../core/routeFactories.js";
import { requireExecutiveAccess } from "../analytics/executiveAccessGuard.js";
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
import {
	badRequest,
	periodQuerySchema,
	withTenantReportScope,
} from "./reportsShared.js";

const EXECUTIVE_AUTH_OPTIONS = {
	allowAdminSecretBypass: true,
	allowClinicTokenWithoutStaff: true,
	allowUnverifiedHeaderRead: true,
} as const;

const executivePermission = {
	customCheck: async (
		_principal: unknown,
		request: Parameters<typeof requireExecutiveAccess>[0],
		reply: Parameters<typeof requireExecutiveAccess>[1],
	) => Boolean(await requireExecutiveAccess(request, reply)),
};

export async function registerRevenueAndDebtReportsRoutes(app: FastifyInstance) {
	/**
	 * Динамика выручки за выбранный период с детализацией по дням, неделям или месяцам.
	 */
	defineTenantQuery(app, {
		path: "/api/reports/revenue",
		permission: executivePermission,
		authOptions: EXECUTIVE_AUTH_OPTIONS,
		handler: async ({ request, reply }) => {
			return withTenantReportScope(
				request,
				reply,
				"report revenue",
				async (resolved, tx) => {
					const report = await revenueTimeline(
						resolved.scope,
						resolved.query.granularity ?? "day",
						tx,
					);
					return {
						period: { from: resolved.scope.from, to: resolved.scope.to },
						...report,
					};
				},
				{ executivePnl: true },
			);
		},
	});

	/**
	 * Сводный финансовый пульт руководителя: Выручка за период, наряды, средний чек и
	 * разбивка по реальным типам оплат (Наличные, Банковские карты, СБП QR, Депозиты).
	 */
	defineTenantQuery(app, {
		path: "/api/reports/financial-summary",
		permission: executivePermission,
		authOptions: EXECUTIVE_AUTH_OPTIONS,
		handler: async ({ request, reply }) => {
			return withTenantReportScope(
				request,
				reply,
				"report financial summary",
				async (resolved, tx) => {
					const summary = await financialExecutiveSummary(resolved.scope, tx);
					return {
						success: true,
						data: summary,
						...summary,
					};
				},
				{ executivePnl: true },
			);
		},
	});

	/**
	 * Дебиторская задолженность пациентов на текущую дату отчёта.
	 */
	defineTenantQuery(app, {
		path: "/api/reports/receivables",
		permission: executivePermission,
		authOptions: EXECUTIVE_AUTH_OPTIONS,
		handler: async ({ tx, organizationId, request, reply }) => {
			const parsed = periodQuerySchema.safeParse(request.query);
			if (!parsed.success)
				return badRequest(reply, "Проверьте параметры отчёта.");

			const options: { minDebtRub?: number; limit?: number } = {};
			if (parsed.data.minDebtRub !== undefined)
				options.minDebtRub = parsed.data.minDebtRub;
			if (parsed.data.limit !== undefined) options.limit = parsed.data.limit;

			return receivables(organizationId, options, tx);
		},
	});

	/**
	 * Единая сводка для руководителя: ключевые показатели клиники одним запросом.
	 */
	defineTenantQuery(app, {
		path: "/api/reports/summary",
		permission: executivePermission,
		authOptions: EXECUTIVE_AUTH_OPTIONS,
		handler: async ({ request, reply }) => {
			return withTenantReportScope(
				request,
				reply,
				"report summary",
				async (resolved, tx) => {
					const [revenue, doctors, chairs, funnel, flow, debts, reminders] =
						await Promise.all([
							revenueTimeline(
								resolved.scope,
								resolved.query.granularity ?? "day",
								tx,
							),
							doctorPerformance(resolved.scope, tx),
							chairLoad(resolved.scope, undefined, tx),
							appointmentFunnel(resolved.scope, tx),
							patientFlow(resolved.scope, tx),
							receivables(resolved.scope.organizationId, undefined, tx),
							reminderEffect(resolved.scope, tx),
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
				},
				{ executivePnl: true },
			);
		},
	});
}
