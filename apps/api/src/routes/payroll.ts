/**
 * payroll.ts — Fastify API-маршруты расчета и закрытия зарплатной ведомости врачей (SSOT).
 * Соответствие: Мандат 8e (Автономия врача), Мандат 8n (Целочисленные копейки, Net Revenue),
 * Мандат 8wy (100% реальный PostgreSQL без синтетических подделок).
 * Декомпозирован в рамках Мандата 8b: тяжелые SQL-запросы вынесены в doctorPayrollDbQueries.ts.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { doctorCommissions, users } from "../db/schema.js";
import { calculateDoctorPeriodPayroll } from "@dental/shared";
import { getRequestIdentity } from "../security/identity.js";
import {
	closeSettlementPeriodInDb,
	reopenSettlementPeriodInDb,
	resolveDoctorUserUuid,
} from "./payrollSettlementDbQueries.js";
import {
	fetchActiveDoctorProfiles,
	fetchClosedPayrollStatements,
	fetchDoctorPayrollDataset,
} from "./doctorPayrollDbQueries.js";

const payrollCalculationsQuerySchema = z.object({
	doctorId: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	startDateIso: z.string().optional(),
	endDateIso: z.string().optional(),
	percent: z.union([z.string(), z.number()]).optional(),
	payoutModel: z.enum(["percentage", "chair_rental"]).optional(),
	shiftRateKop: z.union([z.string(), z.number()]).optional(),
	advanceRub: z.union([z.string(), z.number()]).optional(),
	taxRegime: z.enum(["employee", "self_employed"]).optional(),
});

type PayrollCalculationsQuery = z.infer<typeof payrollCalculationsQuerySchema>;

const closeSettlementSchema = z.object({
	doctorId: z.string().min(1),
	periodStart: z.string().min(1),
	periodEnd: z.string().min(1),
	grossRevenueKop: z.number().optional(),
	grossRevenueKopecks: z.number().int().optional(),
	grossRevenueRub: z.number().optional(),
	labCostKop: z.number().optional(),
	labCostKopecks: z.number().int().optional(),
	labCostRub: z.number().optional(),
	materialCostKop: z.number().optional(),
	materialsCostKop: z.number().optional(),
	materialsCostKopecks: z.number().int().optional(),
	materialsCostRub: z.number().optional(),
	netBaseKop: z.number().optional(),
	netBaseKopecks: z.number().int().optional(),
	netBaseRevenueRub: z.number().optional(),
	amountKopecks: z.number().int().optional(),
	netPayoutKop: z.number().optional(),
	netPayoutKopecks: z.number().int().optional(),
	netPayoutRub: z.number().optional(),
	totalAccruedKop: z.number().optional(),
	totalAccruedKopecks: z.number().int().optional(),
	totalAccruedRub: z.number().optional(),
	payoutModel: z.enum(["percentage", "chair_rental"]).optional().default("percentage"),
	categoryPercent: z.number().optional(),
	chairRentalRub: z.number().optional(),
	ndflKop: z.number().optional(),
	ndflKopecks: z.number().int().optional(),
	ndfl13Rub: z.number().optional(),
	markPaid: z.boolean().optional().default(true),
});

const reopenSettlementSchema = z.object({
	doctorId: z.string().min(1),
	periodStart: z.string().min(1),
	periodEnd: z.string().min(1),
});

export async function registerPayrollRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/v1/doctors — Список активных докторов клиники с реальными ставками из doctor_commissions
	 */
	app.get("/api/v1/doctors", async (request: FastifyRequest, reply: FastifyReply) => {
		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";

		try {
			const doctors = await fetchActiveDoctorProfiles(orgId);
			return reply.send({ ok: true, doctors });
		} catch (err: unknown) {
			request.log.error(err, "Failed to fetch doctors list");
			return reply.send({ ok: true, doctors: [] });
		}
	});

	/**
	 * GET /api/v1/payroll/calculations — Расчет начислений в целочисленных копейках
	 */
	app.get("/api/v1/payroll/calculations", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsedQuery = payrollCalculationsQuerySchema.safeParse(request.query);
		const q: PayrollCalculationsQuery = parsedQuery.success ? parsedQuery.data : {};
		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";
		const rawDocId = q.doctorId || identity.userId || "";

		const resolvedDocId = await resolveDoctorUserUuid(orgId, rawDocId, identity.userId ?? undefined);
		if (!resolvedDocId) {
			return reply.code(404).send({ error: "DoctorNotFound", message: "Врач не найден" });
		}

		// Получаем данные врача из базы данных
		const [docUser] = await db
			.select({
				id: users.id,
				fullName: users.fullName,
				specialties: users.specialties,
			})
			.from(users)
			.where(and(eq(users.id, resolvedDocId), eq(users.organizationId, orgId)))
			.limit(1);

		const doctorName = docUser?.fullName || "Врач-стоматолог";
		const specId = Array.isArray(docUser?.specialties) && docUser.specialties[0]
			? String(docUser.specialties[0])
			: "therapy";

		// Получаем актуальную ставку комиссии врача
		const [activeComm] = await db
			.select({
				commissionPct: doctorCommissions.commissionPct,
				commissionPercent: doctorCommissions.commissionPercent,
				materialDeductionPct: doctorCommissions.materialCostDeductionPct,
				labDeductionPct: doctorCommissions.labCostDeductionPct,
			})
			.from(doctorCommissions)
			.where(
				and(
					eq(doctorCommissions.organizationId, orgId),
					eq(doctorCommissions.userId, resolvedDocId),
					eq(doctorCommissions.isActive, true),
				),
			)
			.orderBy(sql`${doctorCommissions.effectiveFrom} desc`)
			.limit(1);

		const resolvedPct = activeComm?.commissionPct || activeComm?.commissionPercent;
		const basePercent = Number(q.percent) || (resolvedPct ? Number(resolvedPct) : 25);

		const fromStr = q.from || q.startDate || q.startDateIso || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
		const toStr = q.to || q.endDate || q.endDateIso || new Date().toISOString().slice(0, 10);
		const fromDate = new Date(`${fromStr.slice(0, 10)}T00:00:00.000Z`);
		const toDate = new Date(`${toStr.slice(0, 10)}T23:59:59.999Z`);

		// Сбор клинического датасета (смены, приемы, оплаты, услуги, ЗТЛ, материалы)
		const { shiftsCount, orders, completedServices } = await fetchDoctorPayrollDataset({
			orgId,
			resolvedDocId,
			fromStr,
			toStr,
			fromDate,
			toDate,
		});

		// Расчет через канонический калькулятор пакета @dental/shared
		const payrollResult = calculateDoctorPeriodPayroll({
			doctorId: resolvedDocId,
			doctorName,
			specialtyId: specId,
			periodStartIso: fromStr.slice(0, 10),
			periodEndIso: toStr.slice(0, 10),
			services: completedServices,
			customBasePercentage: basePercent,
			payoutModel: q.payoutModel === "chair_rental" ? "chair_rental" : "percentage",
			chairRentalKop: q.payoutModel === "chair_rental" ? Math.round(shiftsCount * (Number(q.shiftRateKop) || 400000)) : 0,
			advancePayoutKop: Math.round((Number(q.advanceRub) || 0) * 100),
			taxRegime: q.taxRegime === "self_employed" ? "self_employed" : "employee",
		});

		// Закрытые периоды
		const { closedPeriods, statements } = await fetchClosedPayrollStatements(orgId, resolvedDocId, doctorName);

		return reply.send({
			ok: true,
			shiftsCount,
			summary: {
				doctorId: resolvedDocId,
				doctorName,
				schemeType: payrollResult.payoutModel === "chair_rental" ? "chair_rental" : "net_percentage",
				totalGrossKopecks: payrollResult.totalGrossRevenueKop,
				totalLabCostKopecks: payrollResult.totalLabDeductionsKop,
				totalMaterialCostKopecks: payrollResult.totalMaterialDeductionsKop,
				totalNetBaseKopecks: payrollResult.totalNetBaseKop,
				doctorAccruedKopecks: payrollResult.grossPayoutBeforeTaxKop,
				chairRentalKopecks: payrollResult.chairRentalKop || 0,
				advanceKopecks: payrollResult.advancePayoutKop || 0,
				ndfl13TaxKopecks: payrollResult.ndfl13TaxKop || 0,
				payoutKopecks: payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop,
				payoutStatus: statements[0]?.isFinalized ? "paid_rko" : "accrued",
				servicesCount: orders.length,
				minimumGuaranteeApplied: payrollResult.minimumGuaranteeApplied,
			},
			orders,
			closedPeriods,
		});
	});

	/**
	 * POST /api/v1/payroll/close-settlement & /api/payroll/close-settlement — Фиксация закрытия расчетного периода в ACID транзакции
	 */
	const closeSettlementHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = closeSettlementSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры закрытия расчетного периода",
				details: parsed.error.format(),
			});
		}

		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";
		const body = parsed.data;

		const resolvedDocId = await resolveDoctorUserUuid(orgId, body.doctorId, identity.userId ?? undefined);
		if (!resolvedDocId) {
			return reply.code(404).send({ error: "DoctorNotFoundError", message: "Врач не найден" });
		}

		const fromDate = new Date(`${body.periodStart.slice(0, 10)}T00:00:00.000Z`);
		const toDate = new Date(`${body.periodEnd.slice(0, 10)}T23:59:59.999Z`);
		const periodKey = body.periodStart.slice(0, 7) === body.periodEnd.slice(0, 7)
			? body.periodStart.slice(0, 7)
			: `${body.periodStart.slice(0, 10)}..${body.periodEnd.slice(0, 10)}`;

		const grossKop = (body.grossRevenueKopecks ?? body.grossRevenueKop) !== undefined
			? Math.max(0, body.grossRevenueKopecks ?? body.grossRevenueKop ?? 0)
			: Math.round(Math.max(0, body.grossRevenueRub ?? 0) * 100);

		const labKop = (body.labCostKopecks ?? body.labCostKop) !== undefined
			? Math.max(0, body.labCostKopecks ?? body.labCostKop ?? 0)
			: Math.round(Math.max(0, body.labCostRub ?? 0) * 100);

		const matKop = (body.materialsCostKopecks ?? body.materialsCostKop ?? body.materialCostKop) !== undefined
			? Math.max(0, body.materialsCostKopecks ?? body.materialsCostKop ?? body.materialCostKop ?? 0)
			: Math.round(Math.max(0, body.materialsCostRub ?? 0) * 100);

		const netBaseKop = (body.netBaseKopecks ?? body.netBaseKop) !== undefined
			? Math.max(0, body.netBaseKopecks ?? body.netBaseKop ?? 0)
			: body.netBaseRevenueRub !== undefined
				? Math.round(Math.max(0, body.netBaseRevenueRub) * 100)
				: Math.max(0, grossKop - labKop - matKop);

		const payoutKop = (body.amountKopecks ?? body.netPayoutKopecks ?? body.netPayoutKop) !== undefined
			? Math.max(0, body.amountKopecks ?? body.netPayoutKopecks ?? body.netPayoutKop ?? 0)
			: Math.round(Math.max(0, body.netPayoutRub ?? 0) * 100);

		const totalAccruedKop = (body.totalAccruedKopecks ?? body.totalAccruedKop) !== undefined
			? Math.max(0, body.totalAccruedKopecks ?? body.totalAccruedKop ?? 0)
			: body.totalAccruedRub !== undefined
				? Math.round(Math.max(0, body.totalAccruedRub) * 100)
				: payoutKop;

		const ndflKop = (body.ndflKopecks ?? body.ndflKop) !== undefined
			? Math.max(0, body.ndflKopecks ?? body.ndflKop ?? 0)
			: Math.round(Math.max(0, body.ndfl13Rub ?? 0) * 100);

		const chairRentalKop = body.chairRentalRub !== undefined ? Math.round(Math.max(0, body.chairRentalRub) * 100) : 0;

		const result = await closeSettlementPeriodInDb({
			organizationId: orgId,
			doctorId: resolvedDocId,
			periodKey,
			fromDate,
			toDate,
			payoutModel: body.payoutModel || "percentage",
			grossRevenueKopecks: grossKop,
			labCostKopecks: labKop,
			materialsCostKopecks: matKop,
			netBaseRevenueKopecks: netBaseKop,
			categoryPercent: body.categoryPercent ?? 25,
			calculatedPieceworkKopecks: totalAccruedKop,
			fixedSalaryKopecks: chairRentalKop,
			bonusesTotalKopecks: 0,
			penaltiesTotalKopecks: 0,
			totalAccruedKopecks: totalAccruedKop,
			ndfl13Kopecks: ndflKop,
			netPayoutKopecks: payoutKop,
			markPaid: body.markPaid ?? true,
		});

		return reply.send({
			ok: true,
			statementId: result.statementId,
			statement: result.statement,
			closedAppointmentsCount: result.closedAppointmentsCount,
			message: "Расчетный период успешно зафиксирован в PostgreSQL и РКО",
		});
	};

	const reopenSettlementHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = reopenSettlementSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Не указаны параметры периода",
				details: parsed.error.format(),
			});
		}
		const body = parsed.data;
		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";
		const resolvedDocId = await resolveDoctorUserUuid(orgId, body.doctorId, identity.userId ?? undefined);
		if (!resolvedDocId) {
			return reply.code(404).send({ error: "DoctorNotFoundError", message: "Врач не найден" });
		}
		const periodKey = body.periodStart.slice(0, 7) === body.periodEnd.slice(0, 7)
			? body.periodStart.slice(0, 7)
			: `${body.periodStart.slice(0, 10)}..${body.periodEnd.slice(0, 10)}`;
		await reopenSettlementPeriodInDb(orgId, resolvedDocId, periodKey);
		return reply.send({ ok: true, isFinalized: false });
	};

	app.post("/api/v1/payroll/close-settlement", closeSettlementHandler);
	app.post("/api/payroll/close-settlement", closeSettlementHandler);
	app.post("/api/doctor/close-settlement-period", closeSettlementHandler);
	app.post("/api/v1/payroll/reopen-settlement", reopenSettlementHandler);
	app.post("/api/payroll/reopen-settlement", reopenSettlementHandler);
	app.post("/api/doctor/settlement-period/reopen", reopenSettlementHandler);
}

export default registerPayrollRoutes;
