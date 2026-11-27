/**
 * payrollSettlementHandlers.ts  Settlement period close/reopen handlers.
 * Decomposed in modular refactoring.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, or, sql } from "drizzle-orm";
import { calculateDoctorPeriodPayroll, isValidUuid, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
import { doctorCommissions, users } from "../../db/schema.js";
import { requirePayoutAccess } from "../billingRoutes/payoutAccessService.js";
import {
	closeSettlementPeriodInDb,
	reopenSettlementPeriodInDb,
	resolveDoctorUserUuid,
} from "../payrollSettlementDbQueries.js";
import {
	fetchActiveDoctorProfiles,
	fetchDoctorPayrollDataset,
} from "../doctorPayrollDbQueries.js";
import {
	closeSettlementSchema,
	reopenSettlementSchema,
} from "./payrollSchemas.js";

export async function closeSettlementHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const payoutAccess = await requirePayoutAccess(request, reply);
	if (!payoutAccess) return;

	const parsed = closeSettlementSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры закрытия расчетного периода",
			details: parsed.error.format(),
		});
	}

	const orgId = payoutAccess.organizationId;
	const body = parsed.data;
	const isOwnDoctor = payoutAccess.scope === "own";

	if (isOwnDoctor) {
		if (body.doctorId === "all") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "payroll.read",
				role: payoutAccess.role,
				message: "Врач может подтверждать акт сверки только по собственным начислениям",
			});
		}

		if (body.doctorId && body.doctorId !== payoutAccess.userId && body.doctorId !== "solo-doctor") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "payroll.read",
				role: payoutAccess.role,
				message: "Подтверждение начислений других врачей клиники запрещено",
			});
		}
	}

	const effectiveMarkPaid = isOwnDoctor ? false : (body.markPaid ?? true);

	const rawIdemKey = request.headers["idempotency-key"] || request.headers["x-idempotency-key"] || body.idempotencyKey;
	const idempotencyKey = typeof rawIdemKey === "string" && rawIdemKey.trim().length > 0 ? rawIdemKey.trim() : undefined;

	if (idempotencyKey) {
		if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать корректный UUID (рекомендуется UUIDv7).",
			});
		}
		reply.header("Idempotency-Key", idempotencyKey);
		reply.header("X-Idempotency-Key", idempotencyKey);
	}

	const fromDate = new Date(`${body.periodStart.slice(0, 10)}T00:00:00.000Z`);
	const toDate = new Date(`${body.periodEnd.slice(0, 10)}T23:59:59.999Z`);
	const periodKey = body.periodStart.slice(0, 7) === body.periodEnd.slice(0, 7)
		? body.periodStart.slice(0, 7)
		: `${body.periodStart.slice(0, 10)}..${body.periodEnd.slice(0, 10)}`;

	if (body.doctorId === "all") {
		const batchStatements: (NonNullable<Awaited<ReturnType<typeof closeSettlementPeriodInDb>>["statement"]> & {
			grossRevenueRub: number;
			netPayoutRub: number;
		})[] = [];
		let totalClosedAppts = 0;

		await withTenantCtx(orgId, async (tx) => {
			const activeDoctors = await fetchActiveDoctorProfiles(orgId, tx);
			for (const doc of activeDoctors) {
				const { shiftsCount, completedServices, refundDeductions, unallocatedLabKop, priorDebtCarryOverKop } = await fetchDoctorPayrollDataset({
					orgId,
					resolvedDocId: doc.id,
					fromStr: body.periodStart,
					toStr: body.periodEnd,
					fromDate,
					toDate,
					tx,
				});

				const docPayoutModel = doc.payoutModel as "percentage" | "chair_rental";
				const isRental = docPayoutModel === "chair_rental";

				const payrollResult = calculateDoctorPeriodPayroll({
					doctorId: doc.id,
					doctorName: doc.name,
					specialtyId: doc.specialtyId,
					periodStartIso: body.periodStart.slice(0, 10),
					periodEndIso: body.periodEnd.slice(0, 10),
					services: completedServices,
					customBasePercentage: doc.commissionPercent,
					payoutModel: docPayoutModel,
					chairRentalKop: isRental ? shiftsCount * doc.defaultShiftRateKop : 0,
					advancePayoutKop: 0,
					taxRegime: doc.taxRegime,
					refundDeductions,
					unallocatedLabKop,
					identSalaryModel: body.identSalaryModel,
					cashAdvancePolicy: body.cashAdvancePolicy,
					priorDebtCarryOverKop: body.carryOverDebtKopecks ?? priorDebtCarryOverKop,
				});

				const signedPayoutKopecks = payrollResult.signedNetBalanceKop ?? (payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop);
				const rkoNumber = body.rkoNumber || `РКО-${doc.id.slice(0, 4).toUpperCase()}-${periodKey}`;

				const res = await closeSettlementPeriodInDb({
					organizationId: orgId,
					doctorId: doc.id,
					periodKey,
					fromDate,
					toDate,
					payoutModel: docPayoutModel,
					grossRevenueKopecks: payrollResult.totalGrossRevenueKop,
					labCostKopecks: payrollResult.totalLabDeductionsKop,
					materialsCostKopecks: payrollResult.totalMaterialDeductionsKop,
					netBaseRevenueKopecks: payrollResult.totalNetBaseKop,
					categoryPercent: doc.commissionPercent,
					calculatedPieceworkKopecks: payrollResult.grossPayoutBeforeTaxKop,
					fixedSalaryKopecks: payrollResult.chairRentalKop || 0,
					serviceSalaryPriceKopecks: payrollResult.serviceSalaryPriceKop ?? 0,
					bonusesTotalKopecks: 0,
					penaltiesTotalKopecks: payrollResult.priorDebtDeductedKop ?? 0,
					totalAccruedKopecks: payrollResult.grossPayoutBeforeTaxKop,
					ndfl13Kopecks: payrollResult.ndfl13TaxKop || 0,
					netPayoutKopecks: signedPayoutKopecks,
					rkoNumber,
					markPaid: signedPayoutKopecks > 0 ? effectiveMarkPaid : false,
				}, tx);

				if (res.statement) {
					batchStatements.push({
						...res.statement,
						grossRevenueRub: kopecksToRubles(res.statement.grossRevenueKopecks ?? 0),
						netPayoutRub: kopecksToRubles(res.statement.netPayoutKopecks ?? 0),
					});
				}
				totalClosedAppts += res.closedAppointmentsCount;
			}
		});

		return reply.send({
			ok: true,
			statementId: batchStatements[0]?.id || "batch",
			statement: batchStatements[0] || null,
			statements: batchStatements,
			count: batchStatements.length,
			closedAppointmentsCount: totalClosedAppts,
			message: `Пакетное утверждение ведомостей клиники: зафиксированы расчетные периоды для ${batchStatements.length} врачей`,
		});
	}

	const resolvedDocId = await resolveDoctorUserUuid(orgId, body.doctorId, payoutAccess.userId ?? undefined);
	if (!resolvedDocId) {
		return reply.code(404).send({ error: "DoctorNotFoundError", message: "Врач не найден" });
	}

	if (isOwnDoctor && resolvedDocId !== payoutAccess.userId) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "payroll.read",
			role: payoutAccess.role,
			message: "Врач может утверждать только собственную ведомость",
		});
	}

	const clientGrossKop = (body.grossRevenueKopecks ?? body.grossRevenueKop) !== undefined
		? Math.max(0, body.grossRevenueKopecks ?? body.grossRevenueKop ?? 0)
		: rublesToKopecks(Math.max(0, body.grossRevenueRub ?? 0));

	const clientLabKop = (body.labCostKopecks ?? body.labCostKop) !== undefined
		? Math.max(0, body.labCostKopecks ?? body.labCostKop ?? 0)
		: rublesToKopecks(Math.max(0, body.labCostRub ?? 0));

	const clientMatKop = (body.materialsCostKopecks ?? body.materialsCostKop ?? body.materialCostKop) !== undefined
		? Math.max(0, body.materialsCostKopecks ?? body.materialsCostKop ?? body.materialCostKop ?? 0)
		: rublesToKopecks(Math.max(0, body.materialsCostRub ?? 0));

	const clientNetBaseKop = (body.netBaseRevenueKopecks ?? body.netBaseKopecks ?? body.netBaseKop) !== undefined
		? Math.max(0, body.netBaseRevenueKopecks ?? body.netBaseKopecks ?? body.netBaseKop ?? 0)
		: body.netBaseRevenueRub !== undefined
			? rublesToKopecks(Math.max(0, body.netBaseRevenueRub))
			: Math.max(0, clientGrossKop - clientLabKop - clientMatKop);

	const clientPayoutKop = (body.amountKopecks ?? body.netPayoutKopecks ?? body.netPayoutKop) !== undefined
		? (body.amountKopecks ?? body.netPayoutKopecks ?? body.netPayoutKop ?? 0)
		: rublesToKopecks(body.netPayoutRub ?? 0);

	const clientTotalAccruedKop = (body.totalAccruedKopecks ?? body.totalAccruedKop) !== undefined
		? Math.max(0, body.totalAccruedKopecks ?? body.totalAccruedKop ?? 0)
		: body.totalAccruedRub !== undefined
			? rublesToKopecks(Math.max(0, body.totalAccruedRub))
			: clientPayoutKop;

	const clientNdflKop = (body.ndfl13Kopecks ?? body.ndflKopecks ?? body.ndflKop) !== undefined
		? Math.max(0, body.ndfl13Kopecks ?? body.ndflKopecks ?? body.ndflKop ?? 0)
		: rublesToKopecks(Math.max(0, body.ndfl13Rub ?? 0));

	const clientChairRentalKop = body.chairRentalKopecks !== undefined
		? Math.max(0, body.chairRentalKopecks)
		: body.chairRentalRub !== undefined
			? rublesToKopecks(Math.max(0, body.chairRentalRub))
			: 0;

	const responsePayload = await withTenantCtx(orgId, async (tx) => {
		const [docUser] = await tx
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

		const [activeComm] = await tx
			.select({
				commissionPct: doctorCommissions.commissionPct,
				commissionPercent: doctorCommissions.commissionPercent,
				materialCostDeductionPct: doctorCommissions.materialCostDeductionPct,
				labCostDeductionPct: doctorCommissions.labCostDeductionPct,
			})
			.from(doctorCommissions)
			.where(
				and(
					eq(doctorCommissions.organizationId, orgId),
					or(
						eq(doctorCommissions.userId, resolvedDocId),
						eq(doctorCommissions.doctorId, resolvedDocId),
					),
					eq(doctorCommissions.isActive, true),
				),
			)
			.orderBy(sql`${doctorCommissions.effectiveFrom} desc`)
			.limit(1);

		const docPayoutModel = (body.payoutModel ?? "percentage") as "percentage" | "chair_rental";
		const isRental = docPayoutModel === "chair_rental";
		const dbCommPct = activeComm?.commissionPercent || activeComm?.commissionPct;
		const resolvedPct = body.categoryPercent !== undefined
			? body.categoryPercent
			: (dbCommPct ? Number(dbCommPct) : 25);

		const { shiftsCount, completedServices, refundDeductions, unallocatedLabKop, priorDebtCarryOverKop } = await fetchDoctorPayrollDataset({
			orgId,
			resolvedDocId,
			fromStr: body.periodStart,
			toStr: body.periodEnd,
			fromDate,
			toDate,
			tx,
		});

		const payrollResult = calculateDoctorPeriodPayroll({
			doctorId: resolvedDocId,
			doctorName,
			specialtyId: specId,
			periodStartIso: body.periodStart.slice(0, 10),
			periodEndIso: body.periodEnd.slice(0, 10),
			services: completedServices,
			customBasePercentage: resolvedPct,
			payoutModel: docPayoutModel,
			chairRentalKop: isRental ? shiftsCount * 400000 : 0,
			advancePayoutKop: 0,
			taxRegime: "employee",
			refundDeductions,
			unallocatedLabKop,
			identSalaryModel: body.identSalaryModel,
			cashAdvancePolicy: body.cashAdvancePolicy,
			priorDebtCarryOverKop: body.carryOverDebtKopecks ?? priorDebtCarryOverKop,
		});

		const hasDbServices = completedServices.length > 0;
		const grossKop = hasDbServices ? payrollResult.totalGrossRevenueKop : clientGrossKop;
		const labKop = hasDbServices ? payrollResult.totalLabDeductionsKop : clientLabKop;
		const matKop = hasDbServices ? payrollResult.totalMaterialDeductionsKop : clientMatKop;
		const netBaseKop = hasDbServices ? payrollResult.totalNetBaseKop : clientNetBaseKop;
		const totalAccruedKop = hasDbServices ? payrollResult.grossPayoutBeforeTaxKop : clientTotalAccruedKop;
		const ndflKop = hasDbServices ? (payrollResult.ndfl13TaxKop || 0) : clientNdflKop;
		const chairRentalKop = hasDbServices ? (payrollResult.chairRentalKop || 0) : clientChairRentalKop;
		const serviceSalaryKop = hasDbServices
			? (payrollResult.serviceSalaryPriceKop ?? 0)
			: (body.serviceSalaryPriceKopecks ?? 0);
		const priorDebtDeductedKop = hasDbServices ? (payrollResult.priorDebtDeductedKop ?? 0) : 0;
		const payoutKop = hasDbServices
			? (payrollResult.signedNetBalanceKop ?? (payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop))
			: clientPayoutKop;

		const result = await closeSettlementPeriodInDb({
			organizationId: orgId,
			doctorId: resolvedDocId,
			periodKey,
			fromDate,
			toDate,
			payoutModel: docPayoutModel,
			grossRevenueKopecks: grossKop,
			labCostKopecks: labKop,
			materialsCostKopecks: matKop,
			netBaseRevenueKopecks: netBaseKop,
			categoryPercent: resolvedPct,
			calculatedPieceworkKopecks: totalAccruedKop,
			fixedSalaryKopecks: chairRentalKop,
			serviceSalaryPriceKopecks: serviceSalaryKop,
			bonusesTotalKopecks: 0,
			penaltiesTotalKopecks: priorDebtDeductedKop,
			totalAccruedKopecks: totalAccruedKop,
			ndfl13Kopecks: ndflKop,
			netPayoutKopecks: payoutKop,
			rkoNumber: body.rkoNumber,
			markPaid: payoutKop > 0 ? effectiveMarkPaid : false,
		}, tx);

		return {
			ok: true,
			statementId: result.statementId,
			statement: result.statement
				? {
						...result.statement,
						grossRevenueRub: kopecksToRubles(result.statement.grossRevenueKopecks ?? 0),
						netPayoutRub: kopecksToRubles(result.statement.netPayoutKopecks ?? 0),
					}
				: null,
			closedAppointmentsCount: result.closedAppointmentsCount,
			message: isOwnDoctor
				? "Акт сверки смены успешно подтвержден врачом"
				: "Расчетный период успешно зафиксирован в PostgreSQL и РКО",
		};
	});

	return reply.send(responsePayload);
}

export async function reopenSettlementHandler(
	request: FastifyRequest,
	reply: FastifyReply,
	preResolvedPayoutAccess?: NonNullable<Awaited<ReturnType<typeof requirePayoutAccess>>>,
	preExtractedIdempotencyKey?: string | null,
) {
	const rawKey = request.headers["idempotency-key"] || request.headers["x-idempotency-key"];
	const idempotencyKey =
		preExtractedIdempotencyKey !== undefined
			? preExtractedIdempotencyKey
			: typeof rawKey === "string"
				? rawKey.trim()
				: null;
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
		});
	}

	const payoutAccess = preResolvedPayoutAccess ?? (await requirePayoutAccess(request, reply));
	if (!payoutAccess) return;
	const orgId = payoutAccess.organizationId;
	if (!orgId) {
		return reply.code(403).send({
			error: "TenantContextRequired",
			message: "Требуется контекст организации",
		});
	}

	if (payoutAccess.scope !== "all") {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "payroll.read",
			role: payoutAccess.role,
			message: "Открытие расчетных периодов доступно только управляющему клиникой",
		});
	}

	const parsed = reopenSettlementSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Не указаны параметры периода",
			details: parsed.error.format(),
		});
	}
	const body = parsed.data;
	const resolvedDocId = await resolveDoctorUserUuid(orgId, body.doctorId, payoutAccess.userId ?? undefined);
	if (!resolvedDocId) {
		return reply.code(404).send({ error: "DoctorNotFoundError", message: "Врач не найден" });
	}
	const periodKey = body.periodStart.slice(0, 7) === body.periodEnd.slice(0, 7)
		? body.periodStart.slice(0, 7)
		: `${body.periodStart.slice(0, 10)}..${body.periodEnd.slice(0, 10)}`;

	const reopened = await reopenSettlementPeriodInDb(orgId, resolvedDocId, periodKey);
	if (!reopened) {
		return reply.code(404).send({
			error: "SettlementNotFound",
			message: `Расчетная ведомость за период ${periodKey} не найдена`,
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
		reply.header("X-Idempotency-Key", idempotencyKey);
	}
	return reply.send({ ok: true, isFinalized: false, statementId: reopened.id });
}
