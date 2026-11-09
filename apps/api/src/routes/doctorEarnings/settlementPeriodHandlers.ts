/**
 * settlementPeriodHandlers.ts — Fastify обработчики маршрутов закрытия расчетного периода.
 * Mandate 8e (Doctor Autonomy) & Mandate 8b (strictly <= 150 lines).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getRequestIdentity } from "../../security/identity.js";
import {
	closeSettlementPeriodInDb,
	findPayrollStatement,
	reopenSettlementPeriodInDb,
	resolveDoctorUserUuid,
} from "./settlementPeriodDbQueries.js";
import {
	fetchDoctorAppointmentsForPeriod,
	fetchAppointmentsClinicalDetails,
	fetchDoctorProfileAndRates,
} from "./doctorEarningsDbQueries.js";
import { calculateLiveDoctorEarnings } from "./liveEarningsCalculator.js";

const closePeriodBodySchema = z.object({
	doctorId: z.string().min(1),
	periodStart: z.string().min(1),
	periodEnd: z.string().min(1),
	payoutModel: z.enum(["percentage", "chair_rental"]).optional().default("percentage"),
	chairRentalRub: z.number().optional().default(0),
	advanceRub: z.number().optional().default(0),
	taxRegime: z.enum(["employee", "self_employed"]).optional().default("employee"),
	markPaid: z.boolean().optional().default(false),
	grossRevenueRub: z.number().optional(),
	labCostRub: z.number().optional(),
	materialsCostRub: z.number().optional(),
	netBaseRevenueRub: z.number().optional(),
	categoryPercent: z.number().optional(),
	calculatedPieceworkRub: z.number().optional(),
	fixedSalaryRub: z.number().optional(),
	bonusesTotalRub: z.number().optional(),
	penaltiesTotalRub: z.number().optional(),
	totalAccruedRub: z.number().optional(),
	ndfl13Rub: z.number().optional(),
	netPayoutRub: z.number().optional(),
	grossRevenueKop: z.number().optional(),
	grossRevenueKopecks: z.number().int().optional(),
	labCostKop: z.number().optional(),
	labCostKopecks: z.number().int().optional(),
	materialCostKop: z.number().optional(),
	materialsCostKop: z.number().optional(),
	materialsCostKopecks: z.number().int().optional(),
	netBaseKop: z.number().optional(),
	netBaseKopecks: z.number().int().optional(),
	totalAccruedKop: z.number().optional(),
	totalAccruedKopecks: z.number().int().optional(),
	amountKopecks: z.number().int().optional(),
	netPayoutKop: z.number().optional(),
	netPayoutKopecks: z.number().int().optional(),
	ndflKop: z.number().optional(),
	ndflKopecks: z.number().int().optional(),
});

function parsePeriodDates(startStr: string, endStr: string): { fromDate: Date; toDate: Date; periodKey: string } {
	const fromDate = startStr.includes("T") ? new Date(startStr) : new Date(`${startStr}T00:00:00.000Z`);
	const toDate = endStr.includes("T") ? new Date(endStr) : new Date(`${endStr}T23:59:59.999Z`);
	const startYm = startStr.slice(0, 7);
	const endYm = endStr.slice(0, 7);
	const periodKey = startYm === endYm ? startYm : `${startStr.slice(0, 10)}..${endStr.slice(0, 10)}`;
	return { fromDate, toDate, periodKey };
}

export async function registerSettlementPeriodRoutes(app: FastifyInstance): Promise<void> {
	const handleClosePeriod = async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = closePeriodBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры закрытия расчетного периода",
				details: parsed.error.format(),
			});
		}

		const identity = getRequestIdentity(request);
		if (!identity.organizationId || !identity.userId || !identity.role) {
			return reply.code(401).send({
				error: "StaffAuthRequired",
				message: "Требуется авторизация сотрудника клиники",
			});
		}
		const effectiveOrgId = identity.organizationId;
		const body = parsed.data;

		// Разрешаем doctorId в реальный UUID пользователя базы данных
		const resolvedDoctorId = await resolveDoctorUserUuid(effectiveOrgId, body.doctorId, identity.userId ?? undefined);
		if (!resolvedDoctorId) {
			return reply.code(404).send({
				error: "DoctorNotFoundError",
				message: `Врач с идентификатором "${body.doctorId}" не найден в клинике`,
			});
		}

		// RBAC: врач может закрывать только свои периоды, владелец и администратор — для любого врача
		const canManageAny = identity.role === "owner" || identity.role === "administrator" || identity.role === "admin";
		if (!canManageAny && resolvedDoctorId !== identity.userId) {
			return reply.code(403).send({
				error: "DoctorForbiddenError",
				message: "Доступ запрещен: врач может закрывать расчетный период исключительно для себя",
			});
		}

		const { fromDate, toDate, periodKey } = parsePeriodDates(body.periodStart, body.periodEnd);

		// Если клиент передал готовые расчетные суммы (в рублях или копейках), используем их.
		// Иначе пересчитываем честно через движок базы данных.
		const grossKop = body.grossRevenueKopecks ?? body.grossRevenueKop;
		let grossRevenueRub = body.grossRevenueRub ?? (grossKop !== undefined ? grossKop / 100 : undefined);

		const labKop = body.labCostKopecks ?? body.labCostKop;
		let labCostRub = body.labCostRub ?? (labKop !== undefined ? labKop / 100 : undefined);

		const matKop = body.materialsCostKopecks ?? body.materialsCostKop ?? body.materialCostKop;
		let materialsCostRub = body.materialsCostRub ?? (matKop !== undefined ? matKop / 100 : undefined);

		const netBaseKop = body.netBaseKopecks ?? body.netBaseKop;
		let netBaseRevenueRub = body.netBaseRevenueRub ?? (netBaseKop !== undefined ? netBaseKop / 100 : undefined);
		if (netBaseRevenueRub === undefined && grossRevenueRub !== undefined && labCostRub !== undefined && materialsCostRub !== undefined) {
			netBaseRevenueRub = Math.max(0, grossRevenueRub - labCostRub - materialsCostRub);
		}

		let categoryPercent = body.categoryPercent ?? 25;
		let calculatedPieceworkRub = body.calculatedPieceworkRub;

		const totalAccruedKop = body.totalAccruedKopecks ?? body.totalAccruedKop;
		let totalAccruedRub = body.totalAccruedRub ?? (totalAccruedKop !== undefined ? totalAccruedKop / 100 : undefined);

		const ndflKop = body.ndflKopecks ?? body.ndflKop;
		let ndfl13Rub = body.ndfl13Rub ?? (ndflKop !== undefined ? ndflKop / 100 : 0);

		const payoutKop = body.amountKopecks ?? body.netPayoutKopecks ?? body.netPayoutKop;
		let netPayoutRub = body.netPayoutRub ?? (payoutKop !== undefined ? payoutKop / 100 : undefined);

		if (grossRevenueRub === undefined || netPayoutRub === undefined) {
			const { categoryRates } = await fetchDoctorProfileAndRates(effectiveOrgId, resolvedDoctorId);
			const rawAppts = await fetchDoctorAppointmentsForPeriod(effectiveOrgId, resolvedDoctorId, fromDate, toDate);
			const details = await fetchAppointmentsClinicalDetails(effectiveOrgId, resolvedDoctorId, fromDate, toDate, rawAppts.map((a) => a.id));
			const liveCalc = calculateLiveDoctorEarnings({
				targetDoctorId: resolvedDoctorId,
				doctorName: "Врач-стоматолог",
				doctorSpecialty: "Врач-стоматолог",
				fromDate,
				toDate,
				categoryRates,
				payoutModel: body.payoutModel,
				chairRentalRub: body.chairRentalRub,
				advanceRub: body.advanceRub,
				taxRegime: body.taxRegime,
				rawAppointments: rawAppts,
				appointmentToVisitMap: details.appointmentToVisitMap,
				dbTreatmentItems: details.dbTreatmentItems,
				dbLabOrders: details.dbLabOrders,
				dbPayments: details.dbPayments,
			});

			grossRevenueRub = liveCalc.summary.totalGrossRevenueRub;
			labCostRub = liveCalc.summary.totalLabDeductionsRub;
			materialsCostRub = liveCalc.summary.totalMaterialDeductionsRub;
			netBaseRevenueRub = liveCalc.summary.netBaseRevenueRub;
			categoryPercent = liveCalc.summary.averageCommissionPercent;
			calculatedPieceworkRub = liveCalc.summary.totalDoctorEarnedRub;
			totalAccruedRub = liveCalc.summary.totalDoctorEarnedRub;
			ndfl13Rub = liveCalc.summary.npdTaxRub ?? 0;
			netPayoutRub = liveCalc.summary.mainPayoutRub;
		}

		const result = await closeSettlementPeriodInDb({
			organizationId: effectiveOrgId,
			doctorId: resolvedDoctorId,
			periodKey,
			fromDate,
			toDate,
			payoutModel: body.payoutModel,
			grossRevenueRub: Math.max(0, grossRevenueRub ?? 0),
			labCostRub: Math.max(0, labCostRub ?? 0),
			materialsCostRub: Math.max(0, materialsCostRub ?? 0),
			netBaseRevenueRub: Math.max(0, netBaseRevenueRub ?? 0),
			categoryPercent,
			calculatedPieceworkRub: Math.max(0, calculatedPieceworkRub ?? (netPayoutRub ?? 0)),
			fixedSalaryRub: body.payoutModel === "chair_rental" ? body.chairRentalRub : (body.fixedSalaryRub ?? 0),
			bonusesTotalRub: body.bonusesTotalRub ?? 0,
			penaltiesTotalRub: body.penaltiesTotalRub ?? 0,
			totalAccruedRub: Math.max(0, totalAccruedRub ?? (netPayoutRub ?? 0)),
			ndfl13Rub: Math.max(0, ndfl13Rub),
			netPayoutRub: Math.max(0, netPayoutRub ?? 0),
			markPaid: body.markPaid,
		});

		return reply.send({
			ok: true,
			statementId: result.statementId,
			statement: {
				id: result.statement.id,
				period: result.statement.period,
				isFinalized: result.statement.isFinalized,
				paidAt: result.statement.paidAt,
				grossRevenueRub: Number(result.statement.grossRevenueRub),
				labCostRub: Number(result.statement.labCostRub),
				materialsCostRub: Number(result.statement.materialsCostRub),
				netBaseRevenueRub: Number(result.statement.netBaseRevenueRub),
				calculatedPieceworkRub: Number(result.statement.calculatedPieceworkRub),
				totalAccruedRub: Number(result.statement.totalAccruedRub),
				ndfl13Rub: Number(result.statement.ndfl13Rub),
				netPayoutRub: Number(result.statement.netPayoutRub),
				createdAt: result.statement.createdAt,
			},
			closedAppointmentsCount: result.closedAppointmentsCount,
			message: "Расчетный период успешно закрыт и зафиксирован в базе данных",
		});
	};

	app.post("/api/doctor/close-settlement-period", handleClosePeriod);
	app.post("/api/doctor/settlement-period/close", handleClosePeriod);

	app.post("/api/doctor/settlement-period/reopen", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = z.object({ doctorId: z.string().min(1), periodStart: z.string().min(1), periodEnd: z.string().min(1) }).safeParse(request.body);
		if (!parsed.success) return reply.code(400).send({ error: "ValidationError", message: "Неверные параметры" });

		const identity = getRequestIdentity(request);
		if (!identity.organizationId || !identity.userId || !identity.role) {
			return reply.code(401).send({ error: "StaffAuthRequired", message: "Требуется авторизация сотрудника клиники" });
		}
		const effectiveOrgId = identity.organizationId;
		const resolvedDoctorId = await resolveDoctorUserUuid(effectiveOrgId, parsed.data.doctorId, identity.userId ?? undefined);
		if (!resolvedDoctorId) return reply.code(404).send({ error: "DoctorNotFoundError" });

		const canManageAny = identity.role === "owner" || identity.role === "administrator" || identity.role === "admin";
		if (!canManageAny && resolvedDoctorId !== identity.userId) {
			return reply.code(403).send({
				error: "DoctorForbiddenError",
				message: "Доступ запрещен: переоткрывать расчетный период можно только для себя",
			});
		}

		const { periodKey } = parsePeriodDates(parsed.data.periodStart, parsed.data.periodEnd);
		const reopened = await reopenSettlementPeriodInDb(effectiveOrgId, resolvedDoctorId, periodKey);
		return reply.send({ ok: true, isFinalized: false, statement: reopened });
	});

	app.get("/api/doctor/settlement-period/status", async (request: FastifyRequest, reply: FastifyReply) => {
		const q = request.query as any;
		if (!q.doctorId || !q.from || !q.to) return reply.code(400).send({ error: "MissingParams" });

		const identity = getRequestIdentity(request);
		if (!identity.organizationId || !identity.userId || !identity.role) {
			return reply.code(401).send({ error: "StaffAuthRequired", message: "Требуется авторизация сотрудника клиники" });
		}
		const effectiveOrgId = identity.organizationId;
		const resolvedDoctorId = await resolveDoctorUserUuid(effectiveOrgId, String(q.doctorId), identity.userId ?? undefined);
		if (!resolvedDoctorId) return reply.send({ isClosed: false, statement: null });

		const canManageAny = identity.role === "owner" || identity.role === "administrator" || identity.role === "admin";
		if (!canManageAny && resolvedDoctorId !== identity.userId) {
			return reply.code(403).send({
				error: "DoctorForbiddenError",
				message: "Доступ запрещен: просмотр статуса доступен только для себя",
			});
		}

		const { periodKey } = parsePeriodDates(String(q.from), String(q.to));
		const statement = await findPayrollStatement(effectiveOrgId, resolvedDoctorId, periodKey);
		return reply.send({
			isClosed: statement ? statement.isFinalized : false,
			statement: statement ? {
				id: statement.id,
				period: statement.period,
				isFinalized: statement.isFinalized,
				paidAt: statement.paidAt,
				grossRevenueRub: Number(statement.grossRevenueRub),
				netPayoutRub: Number(statement.netPayoutRub),
				createdAt: statement.createdAt,
			} : null,
		});
	});
}
