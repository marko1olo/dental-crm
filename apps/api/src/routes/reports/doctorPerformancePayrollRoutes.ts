/**
 * Маршруты выработки врачей, структуры продаж услуг и зарплатной ведомости Net Revenue.
 * Sweet Spot: 60-90 строк.
 */

import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withTenantCtx } from "../../db/rls.js";
import { users } from "../../db/schema.js";
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
	identSalaryModel: z.enum(["gross_before_discount", "net_proportional_discount", "net_doctor_bears_discount"]).optional(),
	cashAdvancePolicy: z.enum(["clinic_first", "doctor_first", "proportional"]).optional(),
}).strict();
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
				const [existingDoctor] = await withTenantCtx(payoutAccess.organizationId, async (tx) => {
					return await tx
						.select({ id: users.id })
						.from(users)
						.where(
							and(
								eq(users.id, queryDoctorId),
								eq(users.organizationId, payoutAccess.organizationId),
							),
						)
						.limit(1);
				});

				if (!existingDoctor) {
					request.log.warn(
						{ queryDoctorId, organizationId: payoutAccess.organizationId },
						"Security probe: doctor not found or does not belong to organization",
					);
					return reply.code(404).send({
						error: "DoctorNotFound",
						message: "Врач не найден в штате текущей клиники",
					});
				}
				filterDoctorId = existingDoctor.id;
			}
		}

		return await doctorPayrollReport(scope, filterDoctorId, request.log, undefined, {
			identSalaryModel: parsed.data.identSalaryModel,
			cashAdvancePolicy: parsed.data.cashAdvancePolicy,
		});
	});

	/**
	 * Прозрачный расчет оплаты труда ассистентов клиники:
	 * Отработанные смены, часы, снимки (RVG/ОПТГ), хирургические операции,
	 * базовая ставка за смену, доплаты, НДФЛ 13% и чистая выплата на руки.
	 * Требует полномочие payroll.read (requirePayoutAccess с проверкой scope === "all").
	 */
	app.get("/api/reports/assistant-payroll", async (request, reply) => {
		const payoutAccess = await requirePayoutAccess(request, reply);
		if (!payoutAccess) return;

		if (payoutAccess.scope !== "all") {
			reply.code(403).send({
				error: "PermissionDenied",
				permission: "payroll.read",
				role: payoutAccess.role,
				message: "Недостаточно прав для просмотра ведомости ассистентов клиники.",
			});
			return;
		}

		const parsed = periodQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			badRequest(
				reply,
				"Проверьте параметры отчёта: даты, детализацию и пределы.",
			);
			return;
		}

		const timeZone = await clinicTimeZone(payoutAccess.organizationId);
		const period = resolvePeriod(parsed.data, timeZone);
		if (!period.ok) {
			badRequest(reply, period.message);
			return;
		}

		const scope = {
			organizationId: payoutAccess.organizationId,
			from: period.from,
			to: period.to,
			timeZone,
			logger: request.log,
		};

		return await assistantPayrollReport(scope);
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
