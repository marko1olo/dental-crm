/**
 * payrollTypesAndQueries.ts  Shared types, queries and normalization utilities for payroll.
 * Decomposed in modular refactoring.
 */

import { and, eq, or, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	doctorCommissions,
	doctorPayrollStatements,
	users,
} from "../../db/schema.js";
import {
	type DoctorCompletedServiceItem,
	type DoctorRefundDeductionItem,
	multiplyKopecksFractional,
	rublesToKopecks,
} from "@dental/shared";

export interface PayrollOrderDto {
	id: string;
	orderNumber: string;
	dateIso: string;
	startsAtIso?: string | undefined;
	endsAtIso?: string | undefined;
	appointmentId?: string | undefined;
	visitId?: string | undefined;
	patientId?: string | undefined;
	patientName: string;
	medicalCardNumber: string;
	serviceNameRu: string;
	serviceCode?: string | undefined;
	category: string;
	categoryLabelRu: string;
	grossKopecks: number;
	listPriceKopecks?: number | undefined;
	discountKopecks?: number | undefined;
	salaryPriceKopecks?: number | undefined;
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
	priorDebtCarryOverKop?: number;
}

export interface TreatmentItemPricingKopecks {
	grossKop: number;
	listPriceKop: number;
	discountKop: number;
}

export function getTreatmentItemPricingKopecks(t: {
	priceKopecks?: bigint | number | null | undefined;
	priceRub?: number | string | null | undefined;
	unitPriceKopecks?: bigint | number | null | undefined;
	unitPriceRub?: number | string | null | undefined;
	discountKopecks?: bigint | number | null | undefined;
	discountRub?: number | string | null | undefined;
	quantity?: number | string | null | undefined;
}): TreatmentItemPricingKopecks {
	const parsedQty = Number(t.quantity ?? 1);
	const qty = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;
	const discKop =
		t.discountKopecks != null && Number(t.discountKopecks) > 0
			? Number(t.discountKopecks)
			: rublesToKopecks(Math.max(0, Number(t.discountRub || 0)));
	const unitKop =
		t.unitPriceKopecks != null && Number(t.unitPriceKopecks) > 0
			? Number(t.unitPriceKopecks)
			: rublesToKopecks(Math.max(0, Number(t.unitPriceRub || 0)));
	const grossKop = getTreatmentItemGrossKopecks(t);
	const computedListKop = unitKop > 0 ? multiplyKopecksFractional(unitKop, qty) : 0;
	const listPriceKop = Math.max(grossKop + discKop, computedListKop);
	return { grossKop, listPriceKop, discountKop: discKop };
}

export function getTreatmentItemGrossKopecks(t: {
	priceKopecks?: bigint | number | null | undefined;
	priceRub?: number | string | null | undefined;
	unitPriceKopecks?: bigint | number | null | undefined;
	unitPriceRub?: number | string | null | undefined;
	discountKopecks?: bigint | number | null | undefined;
	discountRub?: number | string | null | undefined;
	quantity?: number | string | null | undefined;
}): number {
	const priceKop = t.priceKopecks != null ? Number(t.priceKopecks) : 0;
	if (priceKop > 0) {
		return priceKop;
	}
	const parsedQty = Number(t.quantity ?? 1);
	const qty = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;
	const discKop =
		t.discountKopecks != null && Number(t.discountKopecks) > 0
			? Number(t.discountKopecks)
			: rublesToKopecks(Math.max(0, Number(t.discountRub || 0)));
	const unitKop = t.unitPriceKopecks != null ? Number(t.unitPriceKopecks) : 0;
	if (unitKop > 0) {
		return Math.max(0, multiplyKopecksFractional(unitKop, qty) - discKop);
	}
	const priceRubNum = Number(t.priceRub || 0);
	const unitRubNum = Number(t.unitPriceRub || 0);
	if (priceRubNum > 0) {
		const rawPriceKop = multiplyKopecksFractional(rublesToKopecks(priceRubNum), qty);
		if (unitRubNum > 0) {
			const expectedBeforeDiscKop = multiplyKopecksFractional(rublesToKopecks(unitRubNum), qty);
			// If priceRub is already discounted relative to unitPrice * qty, do not double-subtract discount
			if (rublesToKopecks(priceRubNum) < expectedBeforeDiscKop) {
				return Math.max(0, rublesToKopecks(priceRubNum));
			}
			return Math.max(0, expectedBeforeDiscKop - discKop);
		}
		return Math.max(0, rawPriceKop - discKop);
	}
	if (unitRubNum > 0) {
		return Math.max(0, multiplyKopecksFractional(rublesToKopecks(unitRubNum), qty) - discKop);
	}
	return 0;
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
 * */
export async function fetchActiveDoctorProfiles(
	orgId: string,
	tx?: TenantDb,
): Promise<DoctorPayrollProfileDto[]> {
	const run = async (dbClient: TenantDb): Promise<DoctorPayrollProfileDto[]> => {
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
	};

	if (tx) {
		return run(tx);
	}
	return withTenantCtx(orgId, run);
}

/**
 * */
export async function fetchClosedPayrollStatements(
	orgId: string,
	resolvedDocId: string,
	doctorName: string,
	tx?: TenantDb,
): Promise<{ closedPeriods: ClosedPayrollPeriodDto[]; statements: (typeof doctorPayrollStatements.$inferSelect)[] }> {
	const run = async (dbClient: TenantDb) => {
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
	};

	if (tx) {
		return run(tx);
	}
	return withTenantCtx(orgId, run);
}
