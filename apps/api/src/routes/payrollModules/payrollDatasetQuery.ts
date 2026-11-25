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
	serviceCatalogItems,
	treatmentItems,
	visits,
} from "../../db/schema.js";
import {
	type DoctorCompletedServiceItem,
	type DoctorRefundDeductionItem,
	multiplyKopecksFractional,
	rublesToKopecks,
} from "@dental/shared";
import {
	CATEGORY_LABELS_RU,
	type DoctorPayrollDatasetResult,
	getTreatmentItemGrossKopecks,
	normalizeClinicalCategory,
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
					eq(payments.status, "paid"),
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
				amountRub: payments.amountRub,
				amountKopecks: payments.amountKopecks,
				fiscalReceiptNumber: payments.fiscalReceiptNumber,
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
					eq(payments.status, "refunded"),
					gte(sql`coalesce(${payments.updatedAt}, ${payments.paidAt})`, fromDate),
					lte(sql`coalesce(${payments.updatedAt}, ${payments.paidAt})`, toDate),
				),
			);

		const refundDeductions: DoctorRefundDeductionItem[] = [];
		for (const ref of refundedPaymentRows) {
			const refKop =
				ref.amountKopecks != null && ref.amountKopecks !== 0n
					? Math.abs(Number(ref.amountKopecks))
					: Math.abs(rublesToKopecks(Number(ref.amountRub || 0)));
			if (refKop > 0) {
				refundDeductions.push({
					serviceId: ref.id,
					serviceNameRu: "value",
					refundedGrossKop: refKop,
					receiptNumber: ref.fiscalReceiptNumber ?? undefined,
					reasonRu: ref.note ?? "value",
					dateIso: (ref.updatedAt || ref.paidAt || fromDate).toISOString().slice(0, 10),
					doctorId: resolvedDocId,
					performerId: resolvedDocId,
				});
			}
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
			'-0'
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
					amountRub: payments.amountRub,
					amountKopecks: payments.amountKopecks,
					fiscalReceiptNumber: payments.fiscalReceiptNumber,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						inArray(payments.visitId, visitIds),
						eq(payments.status, "paid"),
					),
				)
			: [];

		const paidKopByVisit = new Map<string, number>();
		const fiscalReceiptByVisit = new Map<string, string>();
		for (const p of paidVisitRows) {
			if (!p.visitId) continue;
			const amtKop = p.amountKopecks != null && Number(p.amountKopecks) > 0
				? Number(p.amountKopecks)
				: rublesToKopecks(Number(p.amountRub || 0));
			paidKopByVisit.set(p.visitId, (paidKopByVisit.get(p.visitId) || 0) + amtKop);
			if (p.fiscalReceiptNumber && !fiscalReceiptByVisit.has(p.visitId)) {
				fiscalReceiptByVisit.set(p.visitId, p.fiscalReceiptNumber);
			}
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

		// let eligibleLabOrders = docLabOrders;
		const closedStatements = await dbClient
			.select({
				period: doctorPayrollStatements.period,
			})
			.from(doctorPayrollStatements)
			.where(
				and(
					eq(doctorPayrollStatements.organizationId, orgId),
					eq(doctorPayrollStatements.doctorId, resolvedDocId),
					eq(doctorPayrollStatements.isFinalized, true),
				),
			);

		if (closedStatements.length > 0) {
			const currentMonthKey = fromStr.slice(0, 7);
			const currentExactKey = `${fromStr.slice(0, 10)}..${toStr.slice(0, 10)}`;
			const closedRanges: { start: number; end: number }[] = [];

			for (const cs of closedStatements) {
				if (cs.period === currentMonthKey || cs.period === currentExactKey) {
					continue;
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

		interface TrackedDoctorLabOrder {
			id: string;
			patientId: string;
			toothFdi: string | null;
			appointmentId: string | null;
			treatmentPlanId: string | null;
			remainingCostKop: number;
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

		// const matCostByTreatmentId = new Map<string, number>();
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

		for (const t of treats) {
			const grossKop = getTreatmentItemGrossKopecks(t);
			const visitId = t.visitId;
			const visitTotalGross = visitId ? (totalGrossByVisit.get(visitId) || 0) : 0;
			const visitPaidTotal = visitId ? (paidKopByVisit.get(visitId) || 0) : 0;

			let actuallyPaidGrossKop = 0;
			if (visitId && visitTotalGross > 0 && visitPaidTotal > 0) {
				if (visitPaidTotal >= visitTotalGross) {
					actuallyPaidGrossKop = grossKop;
				} else {
					const remaining = remainingPaidKopByVisit.get(visitId) || 0;
					actuallyPaidGrossKop = Math.min(grossKop, remaining);
					remainingPaidKopByVisit.set(visitId, Math.max(0, remaining - actuallyPaidGrossKop));
				}
			}

			const isPaid = actuallyPaidGrossKop > 0;
			const isDebt = actuallyPaidGrossKop <= 0 && grossKop > 0;
			const invoiceStatus: "paid" | "partially_paid" | "unpaid" = actuallyPaidGrossKop >= grossKop
				? "paid"
				: actuallyPaidGrossKop > 0
					? "partially_paid"
					: "unpaid";
			const receiptNum = visitId ? fiscalReceiptByVisit.get(visitId) : undefined;
			const isPaid54Fz = Boolean(receiptNum) && actuallyPaidGrossKop > 0;

			const linkedApptId = t.visitId ? visitToAppt.get(t.visitId) : undefined;
			const appt = appts.find((a) => a.id === linkedApptId);
			const patientId = appt?.patientId;

			const cat = normalizeClinicalCategory(t.category, t.specialty);
			const catLabelRu = CATEGORY_LABELS_RU[cat] || "value";
			const serviceTitle = t.title || "value";
			const isOrthoService = cat === "orthopedics" || /||||||/i.test(serviceTitle);

			let labKop = 0;
			if (patientId) {
				const candidateOrder = trackedLabOrders.find((lo) => {
					if (lo.patientId !== patientId || lo.remainingCostKop <= 0) return false;
					const targetTooth = t.toothCode?.trim();
					const toothList = lo.toothFdi ? lo.toothFdi.split(/[\s,;-]+/).map((s) => s.trim()).filter(Boolean) : [];
					if (targetTooth && toothList.includes(targetTooth)) {
						return true;
					}
					if (lo.appointmentId && lo.appointmentId === linkedApptId && isOrthoService) {
						return true;
					}
					return isOrthoService;
				});

				if (candidateOrder) {
					labKop = Math.min(candidateOrder.remainingCostKop, grossKop);
					candidateOrder.remainingCostKop -= labKop;
				}
			}

			const matKop = matCostByTreatmentId.get(t.id) ?? 0;

			completedServices.push({
				id: t.id,
				dateIso: appt?.startsAt ? appt.startsAt.toISOString().slice(0, 10) : fromStr.slice(0, 10),
				patientName: appt?.patientName || "value",
				medicalCardNumber: appt?.cardNumber || "value",
				serviceNameRu: serviceTitle,
				category: cat,
				grossRevenueKop: grossKop,
				labCostKop: labKop,
				materialCostKop: matKop,
				doctorId: resolvedDocId,
				order804nCode: t.order804nCode ?? undefined,
				serviceCode: t.code ?? undefined,
				isPaid,
				isDebt,
				invoiceStatus,
				paidAmountKop: actuallyPaidGrossKop,
				actuallyPaidGrossKop,
				fiscalReceiptNumber: receiptNum,
			});

			const apptStartIso = appt?.startsAt ? appt.startsAt.toISOString() : undefined;
			const apptEndIso = appt?.startsAt ? new Date(appt.startsAt.getTime() + 60 * 60 * 1000).toISOString() : undefined;

			orders.push({
				id: t.id,
				orderNumber: `-${t.id.slice(0, 6).toUpperCase()}`,
				dateIso: appt?.startsAt ? appt.startsAt.toISOString().slice(0, 10) : fromStr.slice(0, 10),
				startsAtIso: apptStartIso,
				endsAtIso: apptEndIso,
				appointmentId: linkedApptId ?? undefined,
				visitId: visitId ?? undefined,
				patientId: patientId ?? undefined,
				patientName: appt?.patientName || "value",
				medicalCardNumber: appt?.cardNumber || "value",
				serviceNameRu: serviceTitle,
				serviceCode: t.code ?? undefined,
				category: cat,
				categoryLabelRu: catLabelRu,
				grossKopecks: grossKop,
				labCostKopecks: labKop,
				materialCostKopecks: matKop,
				doctorId: resolvedDocId,
				isPaid54Fz,
				paidKopecks: Math.max(0, actuallyPaidGrossKop),
			});
		}

		// let remainingUnallocatedLabKop = trackedLabOrders.reduce((sum, lo) => sum + Math.max(0, lo.remainingCostKop), 0);

		if (remainingUnallocatedLabKop > 0) {
			for (let i = 0; i < completedServices.length && remainingUnallocatedLabKop > 0; i++) {
				const cs = completedServices[i];
				if (!cs) continue;
				if (cs.category === "orthopedics") {
					const availableMargin = Math.max(0, cs.grossRevenueKop - cs.labCostKop - cs.materialCostKop);
					const toDeduct = Math.min(availableMargin, remainingUnallocatedLabKop);
					if (toDeduct > 0) {
						const updatedLabKop = cs.labCostKop + toDeduct;
						completedServices[i] = {
							...cs,
							labCostKop: updatedLabKop,
						};
						const ord = orders.find((o) => o.id === cs.id);
						if (ord) ord.labCostKopecks = updatedLabKop;
						remainingUnallocatedLabKop -= toDeduct;
					}
				}
			}

			if (remainingUnallocatedLabKop > 0) {
				for (let i = completedServices.length - 1; i >= 0; i--) {
					const cs = completedServices[i];
					if (!cs) continue;
					if (cs.category === "orthopedics") {
						const updatedLabKop = cs.labCostKop + remainingUnallocatedLabKop;
						completedServices[i] = {
							...cs,
							labCostKop: updatedLabKop,
						};
						const ord = orders.find((o) => o.id === cs.id);
						if (ord) ord.labCostKopecks = updatedLabKop;
						remainingUnallocatedLabKop = 0;
						break;
					}
				}
			}

			if (remainingUnallocatedLabKop > 0) {
				const labItemDateIso = toStr.slice(0, 10);
				const labItemId = `lab-balance-${resolvedDocId}-${labItemDateIso}`;
				completedServices.push({
					id: labItemId,
					dateIso: labItemDateIso,
					patientName: "value",
					medicalCardNumber: "value",
					serviceNameRu: "value",
					category: "orthopedics",
					grossRevenueKop: 0,
					labCostKop: remainingUnallocatedLabKop,
					materialCostKop: 0,
					doctorId: resolvedDocId,
					isPaid: true,
					isDebt: false,
					invoiceStatus: "paid",
					paidAmountKop: 0,
					actuallyPaidGrossKop: 0,
				});

				orders.push({
					id: labItemId,
					orderNumber: "value -value",
					dateIso: labItemDateIso,
					patientName: "value",
					medicalCardNumber: "value",
					serviceNameRu: "value",
					category: "orthopedics",
					categoryLabelRu: "value",
					grossKopecks: 0,
					labCostKopecks: remainingUnallocatedLabKop,
					materialCostKopecks: 0,
					doctorId: resolvedDocId,
					isPaid54Fz: true,
					paidKopecks: 0,
				});
				remainingUnallocatedLabKop = 0;
			}
		}

		return {
			shiftsCount,
			orders,
			completedServices,
			refundDeductions,
			unallocatedLabKop: remainingUnallocatedLabKop,
		};
	};

	if (tx) {
		return run(tx);
	}
	return withTenantCtx(orgId, run);
}
