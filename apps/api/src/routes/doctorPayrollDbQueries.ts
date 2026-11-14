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
import type { DoctorCompletedServiceItem } from "@dental/shared";

export interface PayrollOrderDto {
	id: string;
	orderNumber: string;
	dateIso: string;
	patientName: string;
	medicalCardNumber: string;
	serviceNameRu: string;
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
	payoutModel: "percentage";
	motivationScheme: "net_percentage";
	defaultShiftRateKop: number;
	minGuaranteeMonthlyKop: number;
	taxRegime: "employee";
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
export async function fetchActiveDoctorProfiles(orgId: string): Promise<DoctorPayrollProfileDto[]> {
	const docUsers = await db
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

	const commRows = await db
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
			const rate = Number(c.commissionPct || c.commissionPercent || 25);
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
}): Promise<DoctorPayrollDatasetResult> {
	const { orgId, resolvedDocId, fromStr, toStr, fromDate, toDate } = params;

	// 1. Фактические смены
	let shiftsCount = 0;
	try {
		const shifts = await db
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

	// 2. Закрытые приемы за период
	const cardNumSql = sql<string>`coalesce(
		${patients.administrativeProfile}->>'cardNumber',
		${patients.administrativeProfile}->>'medicalCardNumber',
		'К-0'
	)`;

	const appts = await db
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
		.where(
			and(
				eq(appointments.organizationId, orgId),
				eq(appointments.doctorUserId, resolvedDocId),
				gte(appointments.startsAt, fromDate),
				lte(appointments.startsAt, toDate),
			),
		);

	const orders: PayrollOrderDto[] = [];
	const completedServices: DoctorCompletedServiceItem[] = [];

	if (appts.length === 0) {
		return { shiftsCount, orders, completedServices };
	}

	const apptIds = appts.map((a) => a.id);
	const clinicVisits = await db
		.select({ id: visits.id, appointmentId: visits.appointmentId })
		.from(visits)
		.where(and(eq(visits.organizationId, orgId), inArray(visits.appointmentId, apptIds)));

	const visitIds = clinicVisits.map((v) => v.id);
	const visitToAppt = new Map(clinicVisits.map((v) => [v.id, v.appointmentId]));

	// Реальные фактические оплаты (status = 'paid')
	const paidVisitRows = visitIds.length > 0
		? await db
			.select({
				visitId: payments.visitId,
				amountRub: payments.amountRub,
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
		const amtKop = Math.round(Number(p.amountRub || 0) * 100);
		paidKopByVisit.set(p.visitId, (paidKopByVisit.get(p.visitId) || 0) + amtKop);
		if (p.fiscalReceiptNumber && !fiscalReceiptByVisit.has(p.visitId)) {
			fiscalReceiptByVisit.set(p.visitId, p.fiscalReceiptNumber);
		}
	}

	// Услуги с категориями из каталога
	const treats = visitIds.length > 0
		? await db
			.select({
				id: treatmentItems.id,
				visitId: treatmentItems.visitId,
				priceRub: treatmentItems.priceRub,
				quantity: treatmentItems.quantity,
				title: treatmentItems.title,
				category: serviceCatalogItems.category,
				specialty: serviceCatalogItems.specialty,
				code: serviceCatalogItems.code,
				order804nCode: serviceCatalogItems.order804nCode,
			})
			.from(treatmentItems)
			.leftJoin(serviceCatalogItems, eq(treatmentItems.serviceId, serviceCatalogItems.id))
			.where(and(eq(treatmentItems.organizationId, orgId), inArray(treatmentItems.visitId, visitIds)))
		: [];

	// Суммарная стоимость услуг по визитам для пропорционального распределения фактических оплат
	const totalGrossByVisit = new Map<string, number>();
	for (const t of treats) {
		if (t.visitId) {
			const qty = Math.max(1, Number(t.quantity || 1));
			const gKop = Math.round(Number(t.priceRub || 0) * 100 * qty);
			totalGrossByVisit.set(t.visitId, (totalGrossByVisit.get(t.visitId) || 0) + gKop);
		}
	}
	const remainingPaidKopByVisit = new Map<string, number>(paidKopByVisit);

	// Заказы ЗТЛ для доктора за период (исключая гарантии)
	const docLabOrders = await db
		.select({
			id: labOrders.id,
			patientId: labOrders.patientId,
			labCostRub: labOrders.labCostRub,
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

	const labCostPoolByPatient = new Map<string, number>();
	for (const lo of docLabOrders) {
		const costKop = Math.round(Number(lo.labCostRub || 0) * 100);
		if (costKop > 0) {
			labCostPoolByPatient.set(
				lo.patientId,
				(labCostPoolByPatient.get(lo.patientId) || 0) + costKop,
			);
		}
	}

	// Списание материалов (только списываемые на пациента, без общеклинических накладных)
	const invDeductions = visitIds.length > 0
		? await db
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
					eq(inventoryTransactions.transactionType, "auto_deduct"),
				),
			)
		: [];

	const matCostByVisit = new Map<string, number>();
	for (const inv of invDeductions) {
		if (!inv.visitId || inv.isOverhead) continue;
		const cKop = Math.round(Number(inv.unitCostRub || 0) * Math.abs(Number(inv.quantityChanged || 0)) * 100);
		matCostByVisit.set(inv.visitId, (matCostByVisit.get(inv.visitId) || 0) + cKop);
	}

	for (const t of treats) {
		const qty = Math.max(1, Number(t.quantity || 1));
		const grossKop = Math.round(Number(t.priceRub || 0) * 100 * qty);
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
		const isPaid54Fz = Boolean(receiptNum) || isPaid || isPartiallyPaid;

		const linkedApptId = t.visitId ? visitToAppt.get(t.visitId) : undefined;
		const appt = appts.find((a) => a.id === linkedApptId);
		const patientId = appt?.patientId;

		let labKop = 0;
		if (patientId && (labCostPoolByPatient.get(patientId) || 0) > 0) {
			const pool = labCostPoolByPatient.get(patientId)!;
			labKop = Math.min(pool, grossKop);
			labCostPoolByPatient.set(patientId, pool - labKop);
		}

		const visitMatTotal = t.visitId ? (matCostByVisit.get(t.visitId) || 0) : 0;
		const matKop = Math.min(visitMatTotal, grossKop);
		if (t.visitId && matKop > 0) {
			matCostByVisit.set(t.visitId, Math.max(0, visitMatTotal - matKop));
		}

		const cat = normalizeClinicalCategory(t.category, t.specialty);
		const catLabelRu = CATEGORY_LABELS_RU[cat] || "Терапия";
		const serviceTitle = t.title || "Стоматологическая услуга";

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

		orders.push({
			id: t.id,
			orderNumber: `ОРД-${t.id.slice(0, 6).toUpperCase()}`,
			dateIso: appt?.startsAt ? appt.startsAt.toISOString().slice(0, 10) : fromStr.slice(0, 10),
			patientName: appt?.patientName || "Пациент",
			medicalCardNumber: appt?.cardNumber || "—",
			serviceNameRu: serviceTitle,
			category: cat,
			categoryLabelRu: catLabelRu,
			grossKopecks: grossKop,
			labCostKopecks: labKop,
			materialCostKopecks: matKop,
			doctorId: resolvedDocId,
			isPaid54Fz,
			paidKopecks: actuallyPaidGrossKop > 0 ? actuallyPaidGrossKop : (isPaid54Fz ? grossKop : 0),
		});
	}

	return { shiftsCount, orders, completedServices };
}

/**
 * Получить закрытые периоды и расчетные ведомости врача
 */
export async function fetchClosedPayrollStatements(
	orgId: string,
	resolvedDocId: string,
	doctorName: string,
): Promise<{ closedPeriods: ClosedPayrollPeriodDto[]; statements: (typeof doctorPayrollStatements.$inferSelect)[] }> {
	const statements = await db
		.select()
		.from(doctorPayrollStatements)
		.where(
			and(
				eq(doctorPayrollStatements.organizationId, orgId),
				eq(doctorPayrollStatements.doctorId, resolvedDocId),
			),
		)
		.orderBy(sql`${doctorPayrollStatements.createdAt} DESC`);

	const closedPeriods: ClosedPayrollPeriodDto[] = statements.map((s) => ({
		id: s.id,
		periodLabelRu: s.period,
		dateClosedIso: s.createdAt.toISOString().slice(0, 10),
		doctorName,
		rkoReceiptNumber: `РКО-${s.id.slice(0, 8).toUpperCase()}`,
		grossKopecks: Math.round(Number(s.grossRevenueKopecks || Math.round(Number(s.grossRevenueRub) * 100))),
		labCostKopecks: Math.round(Number(s.labCostKopecks || Math.round(Number(s.labCostRub) * 100))),
		materialCostKopecks: Math.round(Number(s.materialsCostKopecks || Math.round(Number(s.materialsCostRub) * 100))),
		netBaseKopecks: Math.round(Number(s.netBaseRevenueRub) * 100),
		payoutKopecks: Math.round(Number(s.netPayoutKopecks || Math.round(Number(s.netPayoutRub) * 100))),
		isPaidRko: Boolean(s.paidAt),
	}));

	return { closedPeriods, statements };
}
