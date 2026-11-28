/**
 * payrollCalculationsHandler.ts  Payroll calculation handlers for the salary settlement period.
 * Decomposed in modular refactoring.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { calculateDoctorPeriodPayroll, rublesToKopecks } from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
import { users } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { roleHasPermission } from "../../security/permissions.js";
import { requirePayoutAccess } from "../billingRoutes/payoutAccessService.js";
import { resolveDoctorUserUuid } from "../payrollSettlementDbQueries.js";
import {
	fetchActiveDoctorProfiles,
	fetchClosedPayrollStatements,
	fetchDoctorPayrollDataset,
	type ClosedPayrollPeriodDto,
	type PayrollOrderDto,
} from "../doctorPayrollDbQueries.js";
import {
	formatDateIsoInTimeZone,
	resolveClinicTimeZone,
	resolveDoctorCommissionContext,
	resolveDoctorPayrollSettings,
	resolvePeriodDateBoundsInTimeZone,
} from "./payrollTypesAndQueries.js";
import {
	type PayrollCalculationsQuery,
	payrollCalculationsQuerySchema,
} from "./payrollSchemas.js";

export async function handleGetDoctorsList(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const identity = getRequestIdentity(request);
	if (!identity.organizationId) {
		return reply.code(401).send({
			error: "AuthRequired",
			message: "Не указан идентификатор организации",
		});
	}
	const orgId = identity.organizationId;

	const doctors = await fetchActiveDoctorProfiles(orgId);
	const hasFullPayrollAccess = identity.role ? roleHasPermission(identity.role, "payroll.read") : false;
	const hasOwnPayrollAccess = identity.role ? roleHasPermission(identity.role, "payroll.read.own") : false;

	const sanitizedDoctors = doctors.map((doc) => {
		const isSelf = Boolean(identity.userId && identity.userId === doc.id);
		const canSeeCommission = hasFullPayrollAccess || (isSelf && hasOwnPayrollAccess);
		if (canSeeCommission) {
			return doc;
		}
		return {
			...doc,
			commissionPercent: 0,
			defaultShiftRateKop: 0,
			minGuaranteeMonthlyKop: 0,
		};
	});
	return reply.send({ ok: true, doctors: sanitizedDoctors });
}

export async function getPayrollCalculationsHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const payoutAccess = await requirePayoutAccess(request, reply);
	if (!payoutAccess) return;

	const parsedQuery = payrollCalculationsQuerySchema.safeParse(request.query ?? {});
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса расчёта зарплаты.",
			details: parsedQuery.error.format(),
		});
	}
	const q: PayrollCalculationsQuery = parsedQuery.data;
	const orgId = payoutAccess.organizationId;
	let rawDocId = q.doctorId || payoutAccess.userId || "";

	if (payoutAccess.scope === "own") {
		if (rawDocId === "all") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "payroll.read",
				role: payoutAccess.role,
				message: "Врач может просматривать расчеты только по собственным начислениям",
			});
		}

		if (rawDocId && rawDocId !== payoutAccess.userId && rawDocId !== "solo-doctor") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "payroll.read",
				role: payoutAccess.role,
				message: "Доступ к начислениям других врачей клиники запрещен",
			});
		}
		rawDocId = payoutAccess.userId;
	}

	const identSalaryModel = q.identSalaryModel ?? "net_proportional_discount";
	const cashAdvancePolicy = q.cashAdvancePolicy ?? "proportional";
	const manualCarryOverKop = q.carryOverDebtKopecks !== undefined ? Math.max(0, Number(q.carryOverDebtKopecks) || 0) : undefined;

	if (rawDocId === "all") {
		const consolidated = await withTenantCtx(orgId, async (tx) => {
			const clinicTimeZone = await resolveClinicTimeZone(tx, orgId);
			const fromStr =
				q.from ||
				q.startDate ||
				q.startDateIso ||
				formatDateIsoInTimeZone(new Date(Date.now() - 30 * 86400000), clinicTimeZone);
			const toStr =
				q.to ||
				q.endDate ||
				q.endDateIso ||
				formatDateIsoInTimeZone(new Date(), clinicTimeZone);
			const { fromDate, toDate } = resolvePeriodDateBoundsInTimeZone(fromStr, toStr, clinicTimeZone);

			const activeDoctors = await fetchActiveDoctorProfiles(orgId, tx);
			const allOrders: PayrollOrderDto[] = [];
			const allClosedPeriods: ClosedPayrollPeriodDto[] = [];
			let totalClinicShifts = 0;
			let totalClinicGrossKop = 0;
			let totalClinicLabKop = 0;
			let totalClinicMaterialKop = 0;
			let totalClinicNetBaseKop = 0;
			let totalClinicAccruedKop = 0;
			let totalClinicPayoutKop = 0;

			const doctorSummaries: Record<string, unknown> = {};

			for (const doc of activeDoctors) {
				const rawOverridePct =
					q.commissionPercent !== undefined
						? Number(q.commissionPercent)
						: q.percent !== undefined
							? Number(q.percent)
							: undefined;
				const overridePct =
					rawOverridePct !== undefined && !Number.isNaN(rawOverridePct)
						? rawOverridePct
						: undefined;
				const commCtx = await resolveDoctorCommissionContext(tx, orgId, doc.id, overridePct);
				const { shiftsCount, orders, completedServices, refundDeductions, unallocatedLabKop, priorDebtCarryOverKop } = await fetchDoctorPayrollDataset({
					orgId,
					resolvedDocId: doc.id,
					fromStr,
					toStr,
					fromDate,
					toDate,
					tx,
				});

				const enrichedServices = completedServices.map((cs) => ({
					...cs,
					customCommissionPercent: commCtx.resolveServiceCommissionPercent(
						cs.category,
						cs.serviceNameRu,
						cs.serviceCode,
					),
				}));

				const docPayoutModel = doc.payoutModel as "percentage" | "chair_rental";
				const isRental = docPayoutModel === "chair_rental";

				const payrollResult = calculateDoctorPeriodPayroll({
					doctorId: doc.id,
					doctorName: doc.name,
					specialtyId: doc.specialtyId,
					periodStartIso: fromStr.slice(0, 10),
					periodEndIso: toStr.slice(0, 10),
					services: enrichedServices,
					customBasePercentage: overridePct ?? commCtx.basePercent ?? doc.commissionPercent,
					...(overridePct === undefined ? { categoryRates: commCtx.categoryRatesMap } : {}),
					payoutModel: docPayoutModel,
					chairRentalKop: isRental ? shiftsCount * doc.defaultShiftRateKop : 0,
					advancePayoutKop: 0,
					taxRegime: doc.taxRegime,
					refundDeductions,
					unallocatedLabKop,
					identSalaryModel,
					cashAdvancePolicy,
					priorDebtCarryOverKop: manualCarryOverKop ?? priorDebtCarryOverKop,
				});

				const { closedPeriods, statements } = await fetchClosedPayrollStatements(orgId, doc.id, doc.name, tx);
				allClosedPeriods.push(...closedPeriods);
				allOrders.push(...orders);

				totalClinicShifts += shiftsCount;
				totalClinicGrossKop += payrollResult.totalGrossRevenueKop;
				totalClinicLabKop += payrollResult.totalLabDeductionsKop;
				totalClinicMaterialKop += payrollResult.totalMaterialDeductionsKop;
				totalClinicNetBaseKop += payrollResult.totalNetBaseKop;
				totalClinicAccruedKop += payrollResult.grossPayoutBeforeTaxKop;
				totalClinicPayoutKop += (payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop);

				const isDocPaidRko = Boolean(statements.length > 0 && statements[0]?.isFinalized);
				doctorSummaries[doc.id] = {
					doctorId: doc.id,
					doctorName: doc.name,
					schemeType: isRental ? "chair_rental" : "net_percentage",
					identSalaryModel: payrollResult.identSalaryModel,
					cashAdvancePolicy: payrollResult.cashAdvancePolicy,
					totalGrossKopecks: payrollResult.totalGrossRevenueKop,
					serviceSalaryPriceKopecks: payrollResult.serviceSalaryPriceKop ?? 0,
					totalLabCostKopecks: payrollResult.totalLabDeductionsKop,
					totalMaterialCostKopecks: payrollResult.totalMaterialDeductionsKop,
					totalNetBaseKopecks: payrollResult.totalNetBaseKop,
					doctorAccruedKopecks: payrollResult.grossPayoutBeforeTaxKop,
					chairRentalKopecks: payrollResult.chairRentalKop || 0,
					advanceKopecks: payrollResult.advancePayoutKop || 0,
					ndfl13TaxKopecks: payrollResult.ndfl13TaxKop || 0,
					priorDebtDeductedKopecks: payrollResult.priorDebtDeductedKop ?? 0,
					negativeCarryOverKopecks: payrollResult.negativeCarryOverKop ?? 0,
					signedNetBalanceKopecks: payrollResult.signedNetBalanceKop ?? (payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop),
					payoutKopecks: payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop,
					payoutStatus: isDocPaidRko ? "paid_rko" : "accrued",
					rkoNumber: isDocPaidRko ? (statements[0]?.rkoNumber || null) : null,
					servicesCount: orders.length,
					minimumGuaranteeApplied: payrollResult.minimumGuaranteeApplied,
				};
			}

			const allFinalized = activeDoctors.length > 0 && activeDoctors.every((d) => {
				const s = doctorSummaries[d.id] as { payoutStatus?: string } | undefined;
				return s?.payoutStatus === "paid_rko";
			});
			const someFinalized = Object.values(doctorSummaries).some((s) => (s as { payoutStatus?: string })?.payoutStatus === "paid_rko");
			const clinicPayoutStatus = allFinalized ? "paid_rko" : (someFinalized ? "partially_paid" : "accrued");

			return {
				ok: true,
				shiftsCount: totalClinicShifts,
				summary: {
					doctorId: "all",
					doctorName: "Все врачи клиники",
					schemeType: "clinic_consolidated",
					totalGrossKopecks: totalClinicGrossKop,
					totalLabCostKopecks: totalClinicLabKop,
					totalMaterialCostKopecks: totalClinicMaterialKop,
					totalNetBaseKopecks: totalClinicNetBaseKop,
					doctorAccruedKopecks: totalClinicAccruedKop,
					chairRentalKopecks: 0,
					advanceKopecks: 0,
					ndfl13TaxKopecks: 0,
					payoutKopecks: totalClinicPayoutKop,
					payoutStatus: clinicPayoutStatus,
					rkoNumber: null,
					servicesCount: allOrders.length,
					minimumGuaranteeApplied: false,
				},
				doctorSummaries,
				orders: allOrders,
				closedPeriods: allClosedPeriods,
			};
		});

		return reply.send(consolidated);
	}

	const resolvedDocId = await resolveDoctorUserUuid(orgId, rawDocId, payoutAccess.userId ?? undefined);
	if (!resolvedDocId) {
		return reply.code(404).send({ error: "DoctorNotFound", message: "Врач не найден" });
	}

	const singleDoctorPayload = await withTenantCtx(orgId, async (tx) => {
		const clinicTimeZone = await resolveClinicTimeZone(tx, orgId);
		const fromStr =
			q.from ||
			q.startDate ||
			q.startDateIso ||
			formatDateIsoInTimeZone(new Date(Date.now() - 30 * 86400000), clinicTimeZone);
		const toStr =
			q.to ||
			q.endDate ||
			q.endDateIso ||
			formatDateIsoInTimeZone(new Date(), clinicTimeZone);
		const { fromDate, toDate } = resolvePeriodDateBoundsInTimeZone(fromStr, toStr, clinicTimeZone);

		const [docUser] = await tx
			.select({
				id: users.id,
				fullName: users.fullName,
				specialties: users.specialties,
				uiPreferences: users.uiPreferences,
			})
			.from(users)
			.where(and(eq(users.id, resolvedDocId), eq(users.organizationId, orgId)))
			.limit(1);

		const doctorName = docUser?.fullName || "Врач-стоматолог";
		const specId = Array.isArray(docUser?.specialties) && docUser.specialties[0]
			? String(docUser.specialties[0])
			: "therapy";
		const doctorSettings = resolveDoctorPayrollSettings(docUser?.uiPreferences);
		const customRate =
			q.commissionPercent !== undefined
				? Number(q.commissionPercent)
				: q.percent !== undefined
					? Number(q.percent)
					: undefined;
		const validCustomRate =
			customRate !== undefined && !Number.isNaN(customRate) ? customRate : undefined;
		const commCtx = await resolveDoctorCommissionContext(
			tx,
			orgId,
			resolvedDocId,
			validCustomRate,
		);
		const resolvedPayoutModel = q.payoutModel ?? doctorSettings.payoutModel;
		const resolvedTaxRegime = q.taxRegime ?? doctorSettings.taxRegime;
		const resolvedShiftRateKop =
			q.shiftRateKop !== undefined && Number.isFinite(Number(q.shiftRateKop))
				? Number(q.shiftRateKop)
				: doctorSettings.defaultShiftRateKop;

		const { shiftsCount, orders, completedServices, refundDeductions, unallocatedLabKop, priorDebtCarryOverKop } = await fetchDoctorPayrollDataset({
			orgId,
			resolvedDocId,
			fromStr,
			toStr,
			fromDate,
			toDate,
			tx,
		});

		const enrichedServices = completedServices.map((cs) => ({
			...cs,
			customCommissionPercent: commCtx.resolveServiceCommissionPercent(
				cs.category,
				cs.serviceNameRu,
				cs.serviceCode,
			),
		}));

		const payrollResult = calculateDoctorPeriodPayroll({
			doctorId: resolvedDocId,
			doctorName,
			specialtyId: specId,
			periodStartIso: fromStr.slice(0, 10),
			periodEndIso: toStr.slice(0, 10),
			services: enrichedServices,
			customBasePercentage: commCtx.basePercent,
			...(validCustomRate === undefined ? { categoryRates: commCtx.categoryRatesMap } : {}),
			payoutModel: resolvedPayoutModel,
			chairRentalKop:
				q.chairRentalRub !== undefined
					? rublesToKopecks(Number(q.chairRentalRub) || 0)
					: q.chairRentalKop !== undefined
						? Number(q.chairRentalKop) || 0
						: resolvedPayoutModel === "chair_rental"
							? shiftsCount * resolvedShiftRateKop
							: 0,
			advancePayoutKop: rublesToKopecks(Number(q.advanceRub) || 0),
			taxRegime: resolvedTaxRegime,
			refundDeductions,
			unallocatedLabKop,
			identSalaryModel,
			cashAdvancePolicy,
			priorDebtCarryOverKop: manualCarryOverKop ?? priorDebtCarryOverKop,
		});

		const { closedPeriods, statements } = await fetchClosedPayrollStatements(orgId, resolvedDocId, doctorName, tx);

		return {
			ok: true,
			shiftsCount,
			summary: {
				doctorId: resolvedDocId,
				doctorName,
				schemeType: payrollResult.payoutModel === "chair_rental" ? "chair_rental" : "net_percentage",
				identSalaryModel: payrollResult.identSalaryModel,
				cashAdvancePolicy: payrollResult.cashAdvancePolicy,
				totalGrossKopecks: payrollResult.totalGrossRevenueKop,
				serviceSalaryPriceKopecks: payrollResult.serviceSalaryPriceKop ?? 0,
				totalLabCostKopecks: payrollResult.totalLabDeductionsKop,
				totalMaterialCostKopecks: payrollResult.totalMaterialDeductionsKop,
				totalNetBaseKopecks: payrollResult.totalNetBaseKop,
				doctorAccruedKopecks: payrollResult.grossPayoutBeforeTaxKop,
				chairRentalKopecks: payrollResult.chairRentalKop || 0,
				advanceKopecks: payrollResult.advancePayoutKop || 0,
				ndfl13TaxKopecks: payrollResult.ndfl13TaxKop || 0,
				priorDebtDeductedKopecks: payrollResult.priorDebtDeductedKop ?? 0,
				negativeCarryOverKopecks: payrollResult.negativeCarryOverKop ?? 0,
				signedNetBalanceKopecks: payrollResult.signedNetBalanceKop ?? (payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop),
				payoutKopecks: payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop,
				payoutStatus: statements[0]?.isFinalized ? "paid_rko" : "accrued",
				servicesCount: orders.length,
				minimumGuaranteeApplied: payrollResult.minimumGuaranteeApplied,
			},
			orders,
			closedPeriods,
		};
	});

	return reply.send(singleDoctorPayload);
}
