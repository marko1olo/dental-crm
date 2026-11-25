/**
 * payrollCalculationsHandler.ts  Payroll calculation handlers for the salary settlement period.
 * Decomposed in modular refactoring.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, or, sql } from "drizzle-orm";
import { calculateDoctorPeriodPayroll, rublesToKopecks } from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
import { doctorCommissions, users } from "../../db/schema.js";
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
			message: "value",
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
			message: "value",
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
				message: "value",
			});
		}

		if (rawDocId && rawDocId !== payoutAccess.userId && rawDocId !== "solo-doctor") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "payroll.read",
				role: payoutAccess.role,
				message: "value",
			});
		}
		rawDocId = payoutAccess.userId;
	}

	const fromStr = q.from || q.startDate || q.startDateIso || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
	const toStr = q.to || q.endDate || q.endDateIso || new Date().toISOString().slice(0, 10);
	const fromDate = new Date(`${fromStr.slice(0, 10)}T00:00:00.000Z`);
	const toDate = new Date(`${toStr.slice(0, 10)}T23:59:59.999Z`);

	if (rawDocId === "all") {
		const consolidated = await withTenantCtx(orgId, async (tx) => {
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
				const { shiftsCount, orders, completedServices, refundDeductions, unallocatedLabKop } = await fetchDoctorPayrollDataset({
					orgId,
					resolvedDocId: doc.id,
					fromStr,
					toStr,
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
					periodStartIso: fromStr.slice(0, 10),
					periodEndIso: toStr.slice(0, 10),
					services: completedServices,
					customBasePercentage:
						q.commissionPercent !== undefined
							? Number(q.commissionPercent)
							: q.percent !== undefined
								? Number(q.percent)
								: doc.commissionPercent,
					payoutModel: docPayoutModel,
					chairRentalKop: isRental ? shiftsCount * doc.defaultShiftRateKop : 0,
					advancePayoutKop: 0,
					taxRegime: doc.taxRegime,
					refundDeductions,
					unallocatedLabKop,
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
					totalGrossKopecks: payrollResult.totalGrossRevenueKop,
					totalLabCostKopecks: payrollResult.totalLabDeductionsKop,
					totalMaterialCostKopecks: payrollResult.totalMaterialDeductionsKop,
					totalNetBaseKopecks: payrollResult.totalNetBaseKop,
					doctorAccruedKopecks: payrollResult.grossPayoutBeforeTaxKop,
					chairRentalKopecks: payrollResult.chairRentalKop || 0,
					advanceKopecks: payrollResult.advancePayoutKop || 0,
					ndfl13TaxKopecks: payrollResult.ndfl13TaxKop || 0,
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
					doctorName: "value",
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
		return reply.code(404).send({ error: "DoctorNotFound", message: "value" });
	}

	const singleDoctorPayload = await withTenantCtx(orgId, async (tx) => {
		const [docUser] = await tx
			.select({
				id: users.id,
				fullName: users.fullName,
				specialties: users.specialties,
			})
			.from(users)
			.where(and(eq(users.id, resolvedDocId), eq(users.organizationId, orgId)))
			.limit(1);

		const doctorName = docUser?.fullName || "value -value";
		const specId = Array.isArray(docUser?.specialties) && docUser.specialties[0]
			? String(docUser.specialties[0])
			: "therapy";

		const [activeComm] = await tx
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
					or(
						eq(doctorCommissions.userId, resolvedDocId),
						eq(doctorCommissions.doctorId, resolvedDocId),
					),
					eq(doctorCommissions.isActive, true),
				),
			)
			.orderBy(sql`${doctorCommissions.effectiveFrom} desc`)
			.limit(1);

		const resolvedPct = activeComm?.commissionPercent || activeComm?.commissionPct;
		const customRate = q.commissionPercent !== undefined ? Number(q.commissionPercent) : (q.percent !== undefined ? Number(q.percent) : undefined);
		const basePercent = customRate !== undefined && !Number.isNaN(customRate) ? customRate : (resolvedPct ? Number(resolvedPct) : 25);

		const { shiftsCount, orders, completedServices, refundDeductions, unallocatedLabKop } = await fetchDoctorPayrollDataset({
			orgId,
			resolvedDocId,
			fromStr,
			toStr,
			fromDate,
			toDate,
			tx,
		});

		const payrollResult = calculateDoctorPeriodPayroll({
			doctorId: resolvedDocId,
			doctorName,
			specialtyId: specId,
			periodStartIso: fromStr.slice(0, 10),
			periodEndIso: toStr.slice(0, 10),
			services: completedServices,
			customBasePercentage: basePercent,
			payoutModel: q.payoutModel === "chair_rental" ? "chair_rental" : "percentage",
			chairRentalKop:
				q.chairRentalRub !== undefined
					? rublesToKopecks(Number(q.chairRentalRub) || 0)
					: q.chairRentalKop !== undefined
						? Number(q.chairRentalKop) || 0
						: q.payoutModel === "chair_rental"
							? shiftsCount * (Number(q.shiftRateKop) || 400000)
							: 0,
			advancePayoutKop: rublesToKopecks(Number(q.advanceRub) || 0),
			taxRegime: q.taxRegime === "self_employed" ? "self_employed" : "employee",
			refundDeductions,
			unallocatedLabKop,
		});

		const { closedPeriods, statements } = await fetchClosedPayrollStatements(orgId, resolvedDocId, doctorName, tx);

		return {
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
		};
	});

	return reply.send(singleDoctorPayload);
}
