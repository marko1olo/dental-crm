/**
 * Маршруты выработки врачей, структуры продаж услуг и зарплатной ведомости Net Revenue.
 * Sweet Spot: 60-90 строк.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	assistantPayrollReport,
	clinicTimeZone,
	doctorPayrollReport,
	doctorPerformance,
	serviceSales,
} from "../../services/reports/managerReports.js";
import {
	badRequest,
	periodBoundarySchema,
	periodQuerySchema,
	resolvePeriod,
	scopeForReport,
} from "./reportsShared.js";
import { requirePayoutAccess } from "../billingRoutes/payoutAccessService.js";

export const doctorPayrollReportQuerySchema = periodQuerySchema.extend({
	doctorId: z.string().optional(),
	startDate: periodBoundarySchema.optional(),
	endDate: periodBoundarySchema.optional(),
});
export type DoctorPayrollReportQuery = z.infer<typeof doctorPayrollReportQuerySchema>;

export async function registerDoctorPerformancePayrollRoutes(app: FastifyInstance) {
	/**
	 * Выработка и результативность врачей клиники за выбранный период.
	 */
	app.get("/api/reports/doctors", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report doctors");
		if (!resolved) return;
		const report = await doctorPerformance(resolved.scope);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			doctors: report.rows,
			...report,
		};
	});

	/**
	 * Прозрачная ведомость начисления зарплаты врачам по формуле Net Revenue:
	 * Оказано услуг (руб.), Списано материалов техкарт (руб.), Чистая выручка (Net Revenue),
	 * Процентная ставка врача (%), Итого к выплате (руб.).
	 * Все расчёты ведутся в целочисленных копейках без float-погрешностей.
	 * DEF-PAYROLL-02: Права доступа переведены на requirePayoutAccess (payroll.read / payroll.read.own),
	 * для врачей с payroll.read.own ведомость фильтруется строго по их doctorId.
	 */
	app.get("/api/reports/doctor-payroll", async (request, reply) => {
		const payoutAccess = await requirePayoutAccess(request, reply);
		if (!payoutAccess) return;

		const parsed = doctorPayrollReportQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			badRequest(
				reply,
				"Проверьте параметры отчёта: даты, детализацию и пределы.",
			);
			return;
		}

		const queryData = {
			...parsed.data,
			from: parsed.data.from ?? parsed.data.startDate,
			to: parsed.data.to ?? parsed.data.endDate,
		};

		const timeZone = await clinicTimeZone(payoutAccess.organizationId);
		const period = resolvePeriod(queryData, timeZone);
		if (!period.ok) {
			badRequest(reply, period.message);
			return;
		}

		const scope = {
			organizationId: payoutAccess.organizationId,
			from: period.from,
			to: period.to,
			timeZone,
		};

		let filterDoctorId: string | undefined;
		if (payoutAccess.scope === "own") {
			filterDoctorId = payoutAccess.userId;
		} else {
			const queryDoctorId = parsed.data.doctorId;
			if (queryDoctorId && queryDoctorId !== "all") {
				filterDoctorId = queryDoctorId;
			}
		}

		return await doctorPayrollReport(scope, filterDoctorId);
	});

	/**
	 * Прозрачный расчет оплаты труда ассистентов клиники:
	 * Отработанные смены, часы, снимки (RVG/ОПТГ), хирургические операции,
	 * базовая ставка за смену, доплаты, НДФЛ 13% и чистая выплата на руки.
	 */
	app.get("/api/reports/assistant-payroll", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report assistant payroll");
		if (!resolved) return;
		return await assistantPayrollReport(resolved.scope);
	});

	/**
	 * Продажи медицинских услуг по прейскуранту клиники с ранжированием по выручке.
	 */
	app.get("/api/reports/services", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report services");
		if (!resolved) return;
		const report = await serviceSales(
			resolved.scope,
			resolved.query.limit ?? 50,
		);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			...report,
		};
	});
}
