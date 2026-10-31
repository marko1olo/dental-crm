/**
 * Маршруты выработки врачей, структуры продаж услуг и зарплатной ведомости Net Revenue.
 * Sweet Spot: 60-90 строк.
 */

import type { FastifyInstance } from "fastify";
import {
	doctorPayrollReport,
	doctorPerformance,
	serviceSales,
} from "../../services/reports/managerReports.js";
import { scopeForReport } from "./reportsShared.js";

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
	 */
	app.get("/api/reports/doctor-payroll", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report doctor payroll");
		if (!resolved) return;
		const report = await doctorPayrollReport(resolved.scope);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			...report,
		};
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
