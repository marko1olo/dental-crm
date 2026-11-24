/**
 * doctorPayrollDbQueries.ts
 *
 * База данных и агрегация данных для расчета зарплаты и начислений врачей (SSOT).
 * Вынесено из apps/api/src/routes/payroll.ts в рамках Мандата 8b (декомпозиция монолитов <= 400 строк).
 *
 * Инварианты:
 * - Все расчеты ведутся строго в целочисленных копейках (amountKopecks, BIGINT) по Мандату 8n.
 * - Чистая изоляция организации (tenant context) на каждом звене цепочки.
 * - Реляционный учет накладных расходов: inventoryItems.isOverhead исключает общеклинические материалы (DEF-PAY-01).
 * - Зеркальная поддержка колонок ставок (userId / doctorId, commissionPct / commissionPercent) (DEF-PAY-02).
 */

import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import type { TenantDb } from "../db/client.js";
import {
	appointments,
	doctorCommissions,
	doctorPayrollStatements,
	doctorShiftRosters,
	inventoryItems,
	inventoryTransactions,
	labOrders,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../db/schema.js";
import { type DoctorCompletedServiceItem, type DoctorRefundDeductionItem, rublesToKopecks } from "@dental/shared";

export interface PayrollOrderDto {
	id: string;
	orderNumber: string;
	dateIso: string;
	startsAtIso?: string | undefined;
	endsAtIso?: string | undefined;
	patientName: string;
	medicalCardNumber: string;
	serviceNameRu: string;
	serviceCode?: string | undefined;
	category: string;
	categoryLabelRu: string;
	grossKopecks: number;
	labCostKopecks: number;
	materialCostKopecks: number;
	doctorId: string;
	isPaid54Fz: boolean;
	paidKopecks: number;
}

export interface DoctorPayrollProfileDto {
	id: string;
	name: string;
	initials: string;
	specialtyId: string;
	specialtyTitleRu: string;
	commissionPercent: number;
	payoutModel: "percentage" | "chair_rental";
	motivationScheme: "net_percentage" | "chair_rental";
	defaultShiftRateKop: number;
	minGuaranteeMonthlyKop: number;
	taxRegime: "employee" | "self_employed";
}

export interface ClosedPayrollPeriodDto {
	id: string;
	periodLabelRu: string;
	dateClosedIso: string;
	doctorName: string;
	rkoReceiptNumber: string;
	grossKopecks: number;
	labCostKopecks: number;
	materialCostKopecks: number;
	netBaseKopecks: number;
	payoutKopecks: number;
	isPaidRko: boolean;
}

export interface DoctorPayrollDatasetResult {
	shiftsCount: number;
	orders: PayrollOrderDto[];
	completedServices: DoctorCompletedServiceItem[];
	refundDeductions: DoctorRefundDeductionItem[];
	unallocatedLabKop?: number;
}

export function getTreatmentItemGrossKopecks(t: {
	priceKopecks?: bigint | number | null | undefined;
	priceRub?: number | string | null | undefined;
	quantity?: number | string | null | undefined;
}): number {
	const kop = t.priceKopecks != null ? Number(t.priceKopecks) : 0;
	if (kop > 0) {
		return kop;
	}
	const qty = Math.max(1, Number(t.quantity || 1));
	return rublesToKopecks(Number(t.priceRub || 0) * qty);
}

export function parseClosedPeriodRange(periodStr: string): { start: Date; end: Date } | null {
	if (/^\d{4}-\d{2}$/.test(periodStr)) {
		const parts = periodStr.split("-");
		const year = Number(parts[0]);
		const month = Number(parts[1]);
		const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
		const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
		return { start, end };
	}
	if (/^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/.test(periodStr)) {
		const [s, e] = periodStr.split("..");
		const start = new Date(`${s}T00:00:00.000Z`);
		const end = new Date(`${e}T23:59:59.999Z`);
		if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
			return { start, end };
		}
	}
	return null;
}

export const SPECIALTY_TITLES: Record<string, string> = {
	therapy: "Врач-стоматолог-терапевт",
	orthopedics: "Врач-стоматолог-ортопед",
	surgery: "Врач-стоматолог-хирург",
	orthodontics: "Врач-ортодонт",
	hygiene: "Гигиенист стоматологический",
	pediatric: "Детский стоматолог",
	general_dentist: "Врач-стоматолог общей практики",
};

export const CATEGORY_LABELS_RU: Record<string, string> = {
	therapy: "Терапия",
	orthopedics: "Ортопедия",
	surgery: "Хирургия",
	orthodontics: "Ортодонтия",
	hygiene: "Гигиена",
	retail_hygiene: "Товары профгигиены",
	pediatric: "Детская стоматология",
};

export function normalizeClinicalCategory(
	cat?: string | null,
	specialty?: string | null,
): "therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric" {
	const c = (cat || "").toLowerCase();
	if (c === "prosthetics" || c === "orthopedics" || c === "orthopedic") return "orthopedics";
	if (c === "surgery" || c === "surgical") return "surgery";
	if (c === "orthodontics" || c === "orthodontic") return "orthodontics";
	if (c === "hygiene" || c === "prevention") return "hygiene";
	if (c === "pediatric" || c === "children") return "pediatric";
	if (c === "retail" || c === "retail_hygiene") return "retail_hygiene";
	if (c === "therapy" || c === "therapeutic" || c === "periodontology" || c === "consultation" || c === "imaging") return "therapy";

	const s = (specialty || "").toLowerCase();
	if (s === "orthopedist") return "orthopedics";
	if (s === "surgeon" || s === "implantologist") return "surgery";
	if (s === "orthodontist") return "orthodontics";
	if (s === "hygienist") return "hygiene";
	if (s === "pediatric") return "pediatric";

	return "therapy";
}

/**
 * Получить список активных докторов клиники с их комиссионными ставками
 */
export async function fetchActiveDoctorProfiles(orgId: string, tx?: TenantDb): Promise<DoctorPayrollProfileDto[]> {
	const dbClient = tx ?? db;
	const docUsers = await dbClient
		.select({
			id: users.id,
			fullName: users.fullName,
			specialties: users.specialties,
			role: users.role,
		})
		.from(users)
		.where(
			and(
				eq(users.organizationId, orgId),
				eq(users.isActive, true),
				or(eq(users.role, "doctor"), eq(users.role, "owner")),
			),
		);

	const commRows = await dbClient
		.select({
			userId: doctorCommissions.userId,
			doctorId: doctorCommissions.doctorId,
			commissionPct: doctorCommissions.commissionPct,
			commissionPercent: doctorCommissions.commissionPercent,
		})
		.from(doctorCommissions)
		.where(
			and(
				eq(doctorCommissions.organizationId, orgId),
				eq(doctorCommissions.isActive, true),
			),
		);

	const commMap = new Map<string, number>();
	for (const c of commRows) {
		const docKey = c.userId || c.doctorId;
		if (docKey) {
			const rate = Number(c.commissionPercent || c.commissionPct || 25);
			commMap.set(docKey, rate);
		}
	}

	return docUsers.map((u) => {
		const name = u.fullName || "Врач-стоматолог";
		const parts = name.trim().split(/\s+/);
		const initials = parts.length >= 2 ? `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase() : "ВС";
		const specId = Array.isArray(u.specialties) && u.specialties[0] ? String(u.specialties[0]) : "therapy";
		const specTitle = SPECIALTY_TITLES[specId] || "Врач-стоматолог";

		return {
			id: u.id,
			name,
			initials,
			specialtyId: specId,
			specialtyTitleRu: specTitle,
			commissionPercent: commMap.get(u.id) ?? 25,
			payoutModel: "percentage" as const,
			motivationScheme: "net_percentage" as const,
			defaultShiftRateKop: 400000,
			minGuaranteeMonthlyKop: 6000000,
			taxRegime: "employee" as const,
		};
	});
}

/**
 * Сбор клинического датасета для расчета зарплаты за период
 */
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
	const dbClient = tx ?? db;

	// 1. Фактические смены
	let shiftsCount = 0;
	try {
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
		shiftsCount = shifts.length;
	} catch {
		shiftsCount = 0;
	}

	// 2. Закрытые приемы за период (по дате визита ЛИБО по кассовому методу — факт оплаты в периоде)
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

	// 3. Возвраты пациентам за период по услугам врача (Мандат 8e / SEV-1.3)
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
		const refKop = ref.amountKopecks != null && Number(ref.amountKopecks) > 0
			? Number(ref.amountKopecks)
			: rublesToKopecks(Number(ref.amountRub || 0));
		if (refKop > 0) {
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

	// Реальные фактические оплаты (status = 'paid')
	// [SEV-3.1] Прямое чтение целочисленных копеек payments.amountKopecks
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

	// Услуги с категориями из каталога и номером зуба
	const treats = visitIds.length > 0
		? await dbClient
			.select({
				id: treatmentItems.id,
				visitId: treatmentItems.visitId,
				toothCode: treatmentItems.toothCode,
				priceRub: treatmentItems.priceRub,
				priceKopecks: treatmentItems.priceKopecks,
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

	// Суммарная стоимость услуг по визитам для пропорционального распределения фактических оплат
	const totalGrossByVisit = new Map<string, number>();
	for (const t of treats) {
		if (t.visitId) {
			const gKop = getTreatmentItemGrossKopecks(t);
			totalGrossByVisit.set(t.visitId, (totalGrossByVisit.get(t.visitId) || 0) + gKop);
		}
	}
	const remainingPaidKopByVisit = new Map<string, number>(paidKopByVisit);

	// Заказы ЗТЛ для доктора за период (исключая гарантии, с чтением labCostKopecks Мандат 8bm)
	const docLabOrders = await dbClient
		.select({
			id: labOrders.id,
			patientId: labOrders.patientId,
			toothFdi: labOrders.toothFdi,
			appointmentId: labOrders.appointmentId,
			treatmentPlanId: labOrders.treatmentPlanId,
			labCostKopecks: labOrders.labCostKopecks,
			labCostRub: labOrders.labCostRub,
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

	// Защита от повторного списания ЗТЛ по закрытым ведомостям врача (SEV-2.4)
	let eligibleLabOrders = docLabOrders;
	try {
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
	} catch {
		eligibleLabOrders = docLabOrders;
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
		remainingCostKop: lo.labCostKopecks != null
			? Number(lo.labCostKopecks)
			: (lo.labCostRub != null ? rublesToKopecks(lo.labCostRub) : 0),
	}));

	// Списание материалов (только списываемые на пациента, без общеклинических накладных)
	const invDeductions = visitIds.length > 0
		? await dbClient
			.select({
				visitId: inventoryTransactions.visitId,
				unitCostRub: inventoryTransactions.unitCostRub,
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
		const cKop = rublesToKopecks(Number(inv.unitCostRub || 0) * Math.abs(Number(inv.quantityChanged || 0)));
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
			const treat = vTreats[i]!;
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
		const isPartiallyPaid = actuallyPaidGrossKop > 0 && actuallyPaidGrossKop < grossKop;
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
		const catLabelRu = CATEGORY_LABELS_RU[cat] || "Терапия";
		const serviceTitle = t.title || "Стоматологическая услуга";
		const isOrthoService = cat === "orthopedics" || /коронк|протез|вкладк|винир|мостовид|абтмент|зтл/i.test(serviceTitle);

		// Ликвидация Payroll Vampire Bug: себестоимость ЗТЛ вычитается СТРОГО из ортопедических услуг
		// или услуг с совпадающим номером зуба, исключая каннибализацию консультаций, гигиены и терапии
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
			patientName: appt?.patientName || "Пациент",
			medicalCardNumber: appt?.cardNumber || "—",
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
			orderNumber: `ОРД-${t.id.slice(0, 6).toUpperCase()}`,
			dateIso: appt?.startsAt ? appt.startsAt.toISOString().slice(0, 10) : fromStr.slice(0, 10),
			startsAtIso: apptStartIso,
			endsAtIso: apptEndIso,
			patientName: appt?.patientName || "Пациент",
			medicalCardNumber: appt?.cardNumber || "—",
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

	// Учет нераспределенного остатка заказов лаборатории врача за период (DEF-PAY-LAB-01 / DEFECT 2)
	let remainingUnallocatedLabKop = trackedLabOrders.reduce((sum, lo) => sum + Math.max(0, lo.remainingCostKop), 0);

	if (remainingUnallocatedLabKop > 0) {
		// 1. Приоритетно дораспределяем по ортопедическим услугам доктора за период (сначала по свободной марже)
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

		// 2. Если у ортопедических услуг маржи не хватило, но ортопедические услуги есть — привязываем остаток к последней ортопедической услуге
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

		// 3. Если у доктора вообще не было ортопедических услуг — создаем балансовую запись расходов ЗТЛ периода (ЗТЛ-БАЛАНС)
		if (remainingUnallocatedLabKop > 0) {
			const labItemDateIso = toStr.slice(0, 10);
			const labItemId = `lab-balance-${resolvedDocId}-${labItemDateIso}`;
			completedServices.push({
				id: labItemId,
				dateIso: labItemDateIso,
				patientName: "Зуботехническая лаборатория",
				medicalCardNumber: "ЗТЛ",
				serviceNameRu: "Нераспределенные затраты зуботехнической лаборатории за период",
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
				orderNumber: "ЗТЛ-БАЛАНС",
				dateIso: labItemDateIso,
				patientName: "Зуботехническая лаборатория",
				medicalCardNumber: "ЗТЛ",
				serviceNameRu: "Нераспределенные затраты зуботехнической лаборатории за период",
				category: "orthopedics",
				categoryLabelRu: "Ортопедия",
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
}

/**
 * Получить закрытые периоды и расчетные ведомости врача
 */
export async function fetchClosedPayrollStatements(
	orgId: string,
	resolvedDocId: string,
	doctorName: string,
	tx?: TenantDb,
): Promise<{ closedPeriods: ClosedPayrollPeriodDto[]; statements: (typeof doctorPayrollStatements.$inferSelect)[] }> {
	const dbClient = tx ?? db;
	const isAll = resolvedDocId === "all";
	const statements = await dbClient
		.select()
		.from(doctorPayrollStatements)
		.where(
			isAll
				? eq(doctorPayrollStatements.organizationId, orgId)
				: and(
					eq(doctorPayrollStatements.organizationId, orgId),
					eq(doctorPayrollStatements.doctorId, resolvedDocId),
				),
		)
		.orderBy(sql`${doctorPayrollStatements.createdAt} DESC`);

	const closedPeriods: ClosedPayrollPeriodDto[] = statements.map((s) => ({
		id: s.id,
		periodLabelRu: s.period,
		dateClosedIso: s.createdAt.toISOString().slice(0, 10),
		doctorName: isAll ? (s.doctorId || doctorName) : doctorName,
		rkoReceiptNumber: isAll ? "" : (s.rkoNumber || `РКО-${s.id.slice(0, 8).toUpperCase()}`),
		grossKopecks: Number(s.grossRevenueKopecks != null ? s.grossRevenueKopecks : rublesToKopecks(Number(s.grossRevenueRub || 0))),
		labCostKopecks: Number(s.labCostKopecks != null ? s.labCostKopecks : rublesToKopecks(Number(s.labCostRub || 0))),
		materialCostKopecks: Number(s.materialsCostKopecks != null ? s.materialsCostKopecks : rublesToKopecks(Number(s.materialsCostRub || 0))),
		netBaseKopecks: Number(s.netBaseRevenueKopecks != null ? s.netBaseRevenueKopecks : rublesToKopecks(Number(s.netBaseRevenueRub || 0))),
		payoutKopecks: Number(s.netPayoutKopecks != null ? s.netPayoutKopecks : rublesToKopecks(Number(s.netPayoutRub || 0))),
		isPaidRko: Boolean(s.paidAt),
	}));

	return { closedPeriods, statements };
}
