/**
 * payrollDatasetQuery.ts  Clinical dataset query for doctor salary calculation.
 * Decomposed in modular refactoring.
 */

import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	appointments,
	doctorPayrollStatements,
	doctorShiftRosters,
	inventoryItems,
	inventoryTransactions,
	labOrders,
	patients,
	payments,
	pricelistDoctorPayrolls,
	serviceCatalogItems,
	treatmentItems,
	visits,
} from "../../db/schema.js";
import {
	type DoctorCompletedServiceItem,
	type DoctorRefundDeductionItem,
	classifyPaymentFlowRecord,
	multiplyKopecksFractional,
	rublesToKopecks,
} from "@dental/shared";
import {
	isIncomePaymentRowSql,
	isPaymentInPlaceRefundedSql,
	isPaymentRefundFlowSql,
} from "../../db/paymentRefundSql.js";
import {
	buildPayrollServicesAndAllocateLabOrders,
	type TrackedDoctorLabOrder,
} from "./payrollLabAllocation.js";
import {
	type DoctorPayrollDatasetResult,
	getTreatmentItemGrossKopecks,
	type PayrollOrderDto,
	parseClosedPeriodRange,
} from "./payrollTypesAndQueries.js";

/**
 * */
export async function fetchDoctorPayrollDataset(params: {
	orgId: string;
	resolvedDocId: string;
	fromStr: string;
	toStr: string;
	fromDate: Date;
	toDate: Date;
	tx?: TenantDb | undefined;
}): Promise<DoctorPayrollDatasetResult> {
	const { orgId, resolvedDocId, fromStr, toStr, fromDate, toDate, tx } = params;

	const run = async (dbClient: TenantDb): Promise<DoctorPayrollDatasetResult> => {
		// 1. 
		const shifts = await dbClient
			.select({ id: doctorShiftRosters.id })
			.from(doctorShiftRosters)
			.where(
				and(
					eq(doctorShiftRosters.organizationId, orgId),
					eq(doctorShiftRosters.doctorId, resolvedDocId),
					gte(doctorShiftRosters.dateIso, fromStr.slice(0, 10)),
					lte(doctorShiftRosters.dateIso, toStr.slice(0, 10)),
				),
			);
		const shiftsCount = shifts.length;

		// 2.  ()
		const paidInPeriodRows = await dbClient
			.select({
				appointmentId: visits.appointmentId,
			})
			.from(payments)
			.innerJoin(visits, and(eq(payments.visitId, visits.id), eq(visits.organizationId, orgId)))
			.innerJoin(appointments, and(eq(visits.appointmentId, appointments.id), eq(appointments.organizationId, orgId)))
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(appointments.doctorUserId, resolvedDocId),
					isIncomePaymentRowSql(),
					gte(payments.paidAt, fromDate),
					lte(payments.paidAt, toDate),
				),
			);

		// 3.  ( 8e / W12-FIN-01)
		// refundExecutionEngine  amountKopecks  amountRub  status="refunded"
		const refundedPaymentRows = await dbClient
			.select({
				id: payments.id,
				visitId: payments.visitId,
				status: payments.status,
				amountRub: payments.amountRub,
				amountKopecks: payments.amountKopecks,
				fiscalReceiptNumber: payments.fiscalReceiptNumber,
				fiscalReceipt: payments.fiscalReceipt,
				paidAt: payments.paidAt,
				updatedAt: payments.updatedAt,
				note: payments.note,
			})
			.from(payments)
			.innerJoin(visits, and(eq(payments.visitId, visits.id), eq(visits.organizationId, orgId)))
			.innerJoin(appointments, and(eq(visits.appointmentId, appointments.id), eq(appointments.organizationId, orgId)))
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(appointments.doctorUserId, resolvedDocId),
					inArray(payments.status, ["paid", "refunded"]),
					isPaymentRefundFlowSql(),
					sql`not (${isPaymentInPlaceRefundedSql()})`,
					gte(sql`coalesce(${payments.updatedAt}, ${payments.paidAt})`, fromDate),
					lte(sql`coalesce(${payments.updatedAt}, ${payments.paidAt})`, toDate),
				),
			);

		const refundDeductions: DoctorRefundDeductionItem[] = [];
		for (const ref of refundedPaymentRows) {
			const flow = classifyPaymentFlowRecord(ref, "flow");
			if (flow.kind !== "refund" || flow.absKopecks <= 0n) continue;
			const refKop = Number(flow.absKopecks);
			refundDeductions.push({
				serviceId: ref.id,
				serviceNameRu: "Возврат пациенту по чеку",
				refundedGrossKop: refKop,
				receiptNumber: ref.fiscalReceiptNumber ?? undefined,
				reasonRu: ref.note ?? "Возврат денежных средств пациенту",
				dateIso: (ref.updatedAt || ref.paidAt || fromDate).toISOString().slice(0, 10),
				doctorId: resolvedDocId,
				performerId: resolvedDocId,
			});
		}

		const cashMethodApptIds = Array.from(
			new Set(
				paidInPeriodRows
					.map((r) => r.appointmentId)
					.filter((id): id is string => typeof id === "string" && id.length > 0),
			),
		);

		const dateFilter = and(
			gte(appointments.startsAt, fromDate),
			lte(appointments.startsAt, toDate),
		);

		const appointmentWhere =
			cashMethodApptIds.length > 0
				? and(
						eq(appointments.organizationId, orgId),
						eq(appointments.doctorUserId, resolvedDocId),
						or(dateFilter, inArray(appointments.id, cashMethodApptIds)),
					)
				: and(
						eq(appointments.organizationId, orgId),
						eq(appointments.doctorUserId, resolvedDocId),
						dateFilter,
					);

		const cardNumSql = sql<string>`coalesce(
			${patients.administrativeProfile}->>'cardNumber',
			${patients.administrativeProfile}->>'medicalCardNumber',
			'К-0'
		)`;

		const appts = await dbClient
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				status: appointments.status,
				startsAt: appointments.startsAt,
				patientName: patients.fullName,
				cardNumber: cardNumSql,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id))
			.where(appointmentWhere);

		const orders: PayrollOrderDto[] = [];
		const completedServices: DoctorCompletedServiceItem[] = [];

		if (appts.length === 0) {
			return { shiftsCount, orders, completedServices, refundDeductions };
		}

		const apptIds = appts.map((a) => a.id);
		const clinicVisits = await dbClient
			.select({ id: visits.id, appointmentId: visits.appointmentId })
			.from(visits)
			.where(and(eq(visits.organizationId, orgId), inArray(visits.appointmentId, apptIds)));

		const visitIds = clinicVisits.map((v) => v.id);
		const visitToAppt = new Map(clinicVisits.map((v) => [v.id, v.appointmentId]));

		// (status = 'paid')
		const paidVisitRows = visitIds.length > 0
			? await dbClient
				.select({
					visitId: payments.visitId,
					status: payments.status,
					amountRub: payments.amountRub,
					amountKopecks: payments.amountKopecks,
					fiscalReceiptNumber: payments.fiscalReceiptNumber,
					fiscalReceipt: payments.fiscalReceipt,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						inArray(payments.visitId, visitIds),
						inArray(payments.status, ["paid", "refunded"]),
					),
				)
			: [];

		const paidKopBigByVisit = new Map<string, bigint>();
		const fiscalReceiptByVisit = new Map<string, string>();
		for (const p of paidVisitRows) {
			if (!p.visitId) continue;
			const flow = classifyPaymentFlowRecord(p, "flow");
			if (flow.kind !== "payment" || flow.absKopecks <= 0n) continue;
			paidKopBigByVisit.set(p.visitId, (paidKopBigByVisit.get(p.visitId) ?? 0n) + flow.absKopecks);
			if (p.fiscalReceiptNumber && !fiscalReceiptByVisit.has(p.visitId)) {
				fiscalReceiptByVisit.set(p.visitId, p.fiscalReceiptNumber);
			}
		}
		const paidKopByVisit = new Map<string, number>();
		for (const [visitId, kopBig] of paidKopBigByVisit.entries()) {
			paidKopByVisit.set(visitId, Number(kopBig));
		}

		// , 
		const treats = visitIds.length > 0
			? await dbClient
				.select({
					id: treatmentItems.id,
					visitId: treatmentItems.visitId,
					toothCode: treatmentItems.toothCode,
					priceRub: treatmentItems.priceRub,
					priceKopecks: treatmentItems.priceKopecks,
					unitPriceRub: treatmentItems.unitPriceRub,
					unitPriceKopecks: treatmentItems.unitPriceKopecks,
					discountRub: treatmentItems.discountRub,
					discountKopecks: treatmentItems.discountKopecks,
					quantity: treatmentItems.quantity,
					title: treatmentItems.title,
					category: serviceCatalogItems.category,
					specialty: serviceCatalogItems.specialty,
					code: serviceCatalogItems.code,
					order804nCode: serviceCatalogItems.order804nCode,
					tierPrices: serviceCatalogItems.tierPrices,
				})
				.from(treatmentItems)
				.leftJoin(
					serviceCatalogItems,
					and(
						eq(treatmentItems.serviceId, serviceCatalogItems.id),
						eq(serviceCatalogItems.organizationId, orgId),
					),
				)
				.where(and(eq(treatmentItems.organizationId, orgId), inArray(treatmentItems.visitId, visitIds)))
			: [];

		const pricelistRules = await dbClient
			.select({
				serviceCode: pricelistDoctorPayrolls.serviceCode,
				serviceName: pricelistDoctorPayrolls.serviceName,
				doctorPayrollPercent: pricelistDoctorPayrolls.doctorPayrollPercent,
				doctorPayrollKopecks: pricelistDoctorPayrolls.doctorPayrollKopecks,
				doctorPayrollRub: pricelistDoctorPayrolls.doctorPayrollRub,
			})
			.from(pricelistDoctorPayrolls)
			.where(eq(pricelistDoctorPayrolls.organizationId, orgId));

		const salaryRuleByServiceKey = new Map<string, { salaryPriceKop?: number | undefined; customCommissionPercent?: number | undefined }>();
		for (const pr of pricelistRules) {
			const salaryPriceKopRaw = pr.doctorPayrollKopecks != null && Number(pr.doctorPayrollKopecks) > 0
				? Number(pr.doctorPayrollKopecks)
				: (Number(pr.doctorPayrollRub || 0) > 0 ? rublesToKopecks(Number(pr.doctorPayrollRub || 0)) : undefined);
			const customPctRaw = Number(pr.doctorPayrollPercent || 0) > 0 ? Number(pr.doctorPayrollPercent) : undefined;
			const ruleVal = {
				salaryPriceKop: salaryPriceKopRaw,
				customCommissionPercent: customPctRaw,
			};
			if (pr.serviceCode?.trim()) {
				salaryRuleByServiceKey.set(`code:${pr.serviceCode.trim().toLowerCase()}`, ruleVal);
			}
			if (pr.serviceName?.trim()) {
				salaryRuleByServiceKey.set(`name:${pr.serviceName.trim().toLowerCase()}`, ruleVal);
			}
		}

		const totalGrossByVisit = new Map<string, number>();
		for (const t of treats) {
			if (t.visitId) {
				const gKop = getTreatmentItemGrossKopecks(t);
				totalGrossByVisit.set(t.visitId, (totalGrossByVisit.get(t.visitId) || 0) + gKop);
			}
		}
		const remainingPaidKopByVisit = new Map<string, number>(paidKopByVisit);

		// (,  labCostKopecks  8bm)
		const docLabOrders = await dbClient
			.select({
				id: labOrders.id,
				patientId: labOrders.patientId,
				toothFdi: labOrders.toothFdi,
				appointmentId: labOrders.appointmentId,
				treatmentPlanId: labOrders.treatmentPlanId,
				labCostKopecks: labOrders.labCostKopecks,
				completedAt: labOrders.completedAt,
				createdAt: labOrders.createdAt,
			})
			.from(labOrders)
			.where(
				and(
					eq(labOrders.organizationId, orgId),
					eq(labOrders.doctorId, resolvedDocId),
					eq(labOrders.isWarranty, false),
					inArray(labOrders.status, ["received", "ready", "ready_in_clinic", "fitted", "completed", "installed"]),
					gte(sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`, fromDate),
					lte(sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`, toDate),
				),
			);

		// Защита от повторного списания ЗТЛ и учет переносимого долга по закрытым ведомостям врача
		let eligibleLabOrders = docLabOrders;
		let priorDebtCarryOverKop = 0;
		const closedStatements = await dbClient
			.select({
				period: doctorPayrollStatements.period,
				netPayoutKopecks: doctorPayrollStatements.netPayoutKopecks,
				netPayoutRub: doctorPayrollStatements.netPayoutRub,
				createdAt: doctorPayrollStatements.createdAt,
			})
			.from(doctorPayrollStatements)
			.where(
				and(
					eq(doctorPayrollStatements.organizationId, orgId),
					eq(doctorPayrollStatements.doctorId, resolvedDocId),
					eq(doctorPayrollStatements.isFinalized, true),
				),
			)
			.orderBy(sql`${doctorPayrollStatements.period} desc, ${doctorPayrollStatements.createdAt} desc`);

		if (closedStatements.length > 0) {
			const currentMonthKey = fromStr.slice(0, 7);
			const currentExactKey = `${fromStr.slice(0, 10)}..${toStr.slice(0, 10)}`;
			const closedRanges: { start: number; end: number }[] = [];
			let foundLatestPrior = false;

			for (const cs of closedStatements) {
				if (cs.period === currentMonthKey || cs.period === currentExactKey) {
					continue;
				}
				if (!foundLatestPrior && cs.period < currentMonthKey) {
					foundLatestPrior = true;
					const priorPayoutKop = cs.netPayoutKopecks != null
						? Number(cs.netPayoutKopecks)
						: rublesToKopecks(Number(cs.netPayoutRub || 0));
					if (priorPayoutKop < 0) {
						priorDebtCarryOverKop = Math.abs(priorPayoutKop);
					}
				}
				const parsed = parseClosedPeriodRange(cs.period);
				if (parsed) {
					closedRanges.push({
						start: parsed.start.getTime(),
						end: parsed.end.getTime(),
					});
				}
			}

			if (closedRanges.length > 0) {
				eligibleLabOrders = docLabOrders.filter((lo) => {
					const dateVal = lo.completedAt || lo.createdAt;
					if (!dateVal) return true;
					const t = new Date(dateVal).getTime();
					return !closedRanges.some((cr) => t >= cr.start && t <= cr.end);
				});
			}
		}

		const trackedLabOrders: TrackedDoctorLabOrder[] = eligibleLabOrders.map((lo) => ({
			id: lo.id,
			patientId: lo.patientId,
			toothFdi: lo.toothFdi,
			appointmentId: lo.appointmentId,
			treatmentPlanId: lo.treatmentPlanId,
			remainingCostKop: Number(lo.labCostKopecks ?? 0),
		}));

		// (, ,  unitCostKopecks)
		const invDeductions = visitIds.length > 0
			? await dbClient
				.select({
					visitId: inventoryTransactions.visitId,
					unitCostKopecks: inventoryTransactions.unitCostKopecks,
					unitCostRub: inventoryTransactions.unitCostRub,
					qty: inventoryTransactions.qty,
					quantityChanged: inventoryTransactions.quantityChanged,
					isOverhead: inventoryItems.isOverhead,
				})
				.from(inventoryTransactions)
				.leftJoin(
					inventoryItems,
					and(
						or(
							eq(inventoryTransactions.itemId, inventoryItems.id),
							eq(inventoryTransactions.inventoryItemId, inventoryItems.id),
						),
						eq(inventoryItems.organizationId, orgId),
					),
				)
				.where(
					and(
						eq(inventoryTransactions.organizationId, orgId),
						inArray(inventoryTransactions.visitId, visitIds),
						inArray(inventoryTransactions.transactionType, [
							"auto_deduct",
							"usage",
							"write_off",
							"emergency_overdraft",
							"shift_batch_deduction",
						]),
					),
				)
			: [];

		const matCostByVisit = new Map<string, number>();
		for (const inv of invDeductions) {
			if (!inv.visitId || inv.isOverhead) continue;
			const unitCostKop =
				inv.unitCostKopecks != null && inv.unitCostKopecks !== 0n
					? Number(inv.unitCostKopecks)
					: rublesToKopecks(Number(inv.unitCostRub || 0));
			const rawQty = inv.qty ?? inv.quantityChanged ?? 0;
			const absQty = Math.abs(Number(rawQty || 0));
			const cKop = unitCostKop > 0 && absQty > 0 ? multiplyKopecksFractional(unitCostKop, absQty) : 0;
			matCostByVisit.set(inv.visitId, (matCostByVisit.get(inv.visitId) || 0) + cKop);
		}

		// Детерминированное пропорциональное распределение затрат материалов по услугам визита
		const matCostByTreatmentId = new Map<string, number>();
		const treatsByVisit = new Map<string, typeof treats>();
		for (const t of treats) {
			if (t.visitId) {
				const list = treatsByVisit.get(t.visitId) ?? [];
				list.push(t);
				treatsByVisit.set(t.visitId, list);
			}
		}

		for (const [vId, vTreats] of treatsByVisit) {
			const totalMatKop = matCostByVisit.get(vId) || 0;
			const totalGrossKop = totalGrossByVisit.get(vId) || 0;
			if (totalMatKop <= 0 || totalGrossKop <= 0) continue;

			let remainingMatKop = totalMatKop;
			for (let i = 0; i < vTreats.length; i++) {
				const treat = vTreats[i];
				if (!treat) continue;
				const gKop = getTreatmentItemGrossKopecks(treat);

				let allocatedMat = 0;
				if (i === vTreats.length - 1) {
					allocatedMat = Math.min(gKop, remainingMatKop);
				} else {
					const proportional = totalGrossKop > 0
						? Number((BigInt(totalMatKop) * BigInt(gKop)) / BigInt(totalGrossKop))
						: 0;
					allocatedMat = Math.min(gKop, Math.min(proportional, remainingMatKop));
				}
				remainingMatKop = Math.max(0, remainingMatKop - allocatedMat);
				matCostByTreatmentId.set(treat.id, allocatedMat);
			}
		}

		const {
			orders: builtOrders,
			completedServices: builtServices,
			unallocatedLabKop,
		} = buildPayrollServicesAndAllocateLabOrders({
			treats,
			appts,
			visitToAppt,
			totalGrossByVisit,
			paidKopByVisit,
			remainingPaidKopByVisit,
			fiscalReceiptByVisit,
			trackedLabOrders,
			matCostByTreatmentId,
			salaryRuleByServiceKey,
			resolvedDocId,
			fromStr,
			toStr,
		});

		return {
			shiftsCount,
			orders: builtOrders,
			completedServices: builtServices,
			refundDeductions,
			unallocatedLabKop,
			priorDebtCarryOverKop,
		};
	};

	if (tx) {
		return run(tx);
	}
	return withTenantCtx(orgId, run);
}
