/**
 * payrollTypesAndQueries.ts  Shared types, queries and normalization utilities for payroll.
 * Decomposed in modular refactoring.
 */

import { and, eq, or, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	clinics,
	doctorCommissions,
	doctorPayrollStatements,
	pricelistDoctorPayrolls,
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
	categoryRates?: Partial<Record<string, number>> | undefined;
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

export interface DoctorPayrollSettings {
	payoutModel: "percentage" | "chair_rental";
	taxRegime: "employee" | "self_employed";
	defaultShiftRateKop: number;
	minGuaranteeMonthlyKop: number;
}

export function resolveDoctorPayrollSettings(uiPreferences: unknown): DoctorPayrollSettings {
	const prefs =
		uiPreferences && typeof uiPreferences === "object" && !Array.isArray(uiPreferences)
			? (uiPreferences as Record<string, unknown>)
			: null;
	const payrollRaw =
		prefs?.payroll && typeof prefs.payroll === "object" && !Array.isArray(prefs.payroll)
			? (prefs.payroll as Record<string, unknown>)
			: prefs;
	const payoutModel: "percentage" | "chair_rental" =
		payrollRaw?.payoutModel === "chair_rental" ? "chair_rental" : "percentage";
	const taxRegime: "employee" | "self_employed" =
		payrollRaw?.taxRegime === "self_employed"
			? "self_employed"
			: payrollRaw?.taxRegime === "employee"
				? "employee"
				: payoutModel === "chair_rental"
					? "self_employed"
					: "employee";
	const rawShiftRate = Number(payrollRaw?.defaultShiftRateKop ?? payrollRaw?.shiftRateKop ?? 0);
	const defaultShiftRateKop =
		Number.isFinite(rawShiftRate) && rawShiftRate > 0 ? Math.round(rawShiftRate) : 0;
	const rawMinGuarantee = Number(payrollRaw?.minGuaranteeMonthlyKop ?? 0);
	const minGuaranteeMonthlyKop =
		Number.isFinite(rawMinGuarantee) && rawMinGuarantee > 0 ? Math.round(rawMinGuarantee) : 0;

	return {
		payoutModel,
		taxRegime,
		defaultShiftRateKop,
		minGuaranteeMonthlyKop,
	};
}

export function computePayrollPeriodKey(periodStart: string, periodEnd: string): string {
	const cleanStart = periodStart.slice(0, 10);
	const cleanEnd = periodEnd.slice(0, 10);
	if (cleanStart.slice(0, 7) === cleanEnd.slice(0, 7) && cleanStart.endsWith("-01")) {
		const [yStr, mStr] = cleanStart.split("-");
		const year = Number.parseInt(yStr ?? "", 10);
		const month = Number.parseInt(mStr ?? "", 10);
		if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
			const lastDay = String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0");
			if (cleanEnd === `${cleanStart.slice(0, 7)}-${lastDay}`) {
				return cleanStart.slice(0, 7);
			}
		}
	}
	return `${cleanStart}..${cleanEnd}`;
}

export interface DoctorCommissionResolutionContext {
	basePercent: number;
	categoryRatesMap: Partial<Record<
		"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric",
		number
	>>;
	pricelistPercentByCode: Map<string, number>;
	pricelistPercentByName: Map<string, number>;
	resolveServiceCommissionPercent: (
		category: string,
		serviceName?: string,
		serviceCode?: string,
	) => number;
}

export async function resolveDoctorCommissionContext(
	tx: TenantDb,
	orgId: string,
	resolvedDocId: string,
	overrideBasePercent?: number,
): Promise<DoctorCommissionResolutionContext> {
	type AllowedCat =
		| "therapy"
		| "orthopedics"
		| "surgery"
		| "orthodontics"
		| "hygiene"
		| "retail_hygiene"
		| "pediatric";
	const [comms, prRows] = await Promise.all([
		tx
			.select({
				serviceCategory: doctorCommissions.serviceCategory,
				commissionPct: doctorCommissions.commissionPct,
				commissionPercent: doctorCommissions.commissionPercent,
				effectiveFrom: doctorCommissions.effectiveFrom,
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
			.orderBy(sql`${doctorCommissions.effectiveFrom} desc`),
		tx
			.select({
				serviceCode: pricelistDoctorPayrolls.serviceCode,
				serviceName: pricelistDoctorPayrolls.serviceName,
				doctorPayrollPercent: pricelistDoctorPayrolls.doctorPayrollPercent,
			})
			.from(pricelistDoctorPayrolls)
			.where(eq(pricelistDoctorPayrolls.organizationId, orgId)),
	]);

	const categoryRatesMap: Partial<Record<AllowedCat, number>> = {};
	let basePercent = 25;
	let hasBaseRate = false;

	for (const comm of comms) {
		const val = Number(comm.commissionPercent || comm.commissionPct);
		if (!Number.isFinite(val) || val <= 0) continue;
		if (comm.serviceCategory) {
			const catKey = normalizeClinicalCategory(comm.serviceCategory);
			if (categoryRatesMap[catKey] === undefined) {
				categoryRatesMap[catKey] = val;
			}
		} else if (!hasBaseRate) {
			basePercent = val;
			hasBaseRate = true;
		}
	}

	if (!hasBaseRate && comms.length > 0) {
		const firstVal = Number(comms[0]?.commissionPercent || comms[0]?.commissionPct);
		if (Number.isFinite(firstVal) && firstVal > 0) {
			basePercent = firstVal;
		}
	}

	if (overrideBasePercent !== undefined && Number.isFinite(overrideBasePercent)) {
		basePercent = overrideBasePercent;
	}

	const pricelistPercentByCode = new Map<string, number>();
	const pricelistPercentByName = new Map<string, number>();
	for (const pr of prRows) {
		const pct = Number(pr.doctorPayrollPercent);
		if (Number.isFinite(pct) && pct > 0) {
			if (pr.serviceCode) {
				pricelistPercentByCode.set(pr.serviceCode.trim().toLowerCase(), pct);
			}
			if (pr.serviceName) {
				pricelistPercentByName.set(pr.serviceName.trim().toLowerCase(), pct);
			}
		}
	}

	const resolveServiceCommissionPercent = (
		category: string,
		serviceName?: string,
		serviceCode?: string,
	): number => {
		if (overrideBasePercent !== undefined && Number.isFinite(overrideBasePercent)) {
			return overrideBasePercent;
		}
		const codeMatch = serviceCode
			? pricelistPercentByCode.get(serviceCode.trim().toLowerCase())
			: undefined;
		if (codeMatch !== undefined) return codeMatch;
		const nameMatch = serviceName
			? pricelistPercentByName.get(serviceName.trim().toLowerCase())
			: undefined;
		if (nameMatch !== undefined) return nameMatch;
		const catKey = normalizeClinicalCategory(category);
		const categoryRate = categoryRatesMap[catKey];
		if (categoryRate !== undefined) return categoryRate;
		return basePercent;
	};

	return {
		basePercent,
		categoryRatesMap,
		pricelistPercentByCode,
		pricelistPercentByName,
		resolveServiceCommissionPercent,
	};
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
				uiPreferences: users.uiPreferences,
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
				serviceCategory: doctorCommissions.serviceCategory,
				commissionPct: doctorCommissions.commissionPct,
				commissionPercent: doctorCommissions.commissionPercent,
			})
			.from(doctorCommissions)
			.where(
				and(
					eq(doctorCommissions.organizationId, orgId),
					eq(doctorCommissions.isActive, true),
				),
			)
			.orderBy(sql`${doctorCommissions.effectiveFrom} desc`);

		const commMap = new Map<string, number>();
		const catRatesByDoc = new Map<string, Record<string, number>>();
		for (const c of commRows) {
			const docKey = c.userId || c.doctorId;
			if (!docKey) continue;
			const rate = Number(c.commissionPercent || c.commissionPct || 25);
			if (!Number.isFinite(rate) || rate <= 0) continue;
			if (c.serviceCategory) {
				const catMap = catRatesByDoc.get(docKey) ?? {};
				const normCat = normalizeClinicalCategory(c.serviceCategory);
				if (catMap[normCat] === undefined) {
					catMap[normCat] = rate;
				}
				catRatesByDoc.set(docKey, catMap);
			} else if (!commMap.has(docKey)) {
				commMap.set(docKey, rate);
			}
		}

		return docUsers.map((u) => {
			const name = u.fullName || "Врач-стоматолог";
			const parts = name.trim().split(/\s+/);
			const initials = parts.length >= 2 ? `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase() : "ВС";
			const specId = Array.isArray(u.specialties) && u.specialties[0] ? String(u.specialties[0]) : "therapy";
			const specTitle = SPECIALTY_TITLES[specId] || "Врач-стоматолог";
			const settings = resolveDoctorPayrollSettings(u.uiPreferences);
			const categoryRates = catRatesByDoc.get(u.id);
			const firstCatRate = categoryRates ? Object.values(categoryRates)[0] : undefined;

			return {
				id: u.id,
				name,
				initials,
				specialtyId: specId,
				specialtyTitleRu: specTitle,
				commissionPercent: commMap.get(u.id) ?? firstCatRate ?? 25,
				payoutModel: settings.payoutModel,
				motivationScheme: settings.payoutModel === "chair_rental" ? "chair_rental" : "net_percentage",
				defaultShiftRateKop: settings.defaultShiftRateKop,
				minGuaranteeMonthlyKop: settings.minGuaranteeMonthlyKop,
				taxRegime: settings.taxRegime,
				...(categoryRates ? { categoryRates } : {}),
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
export const DEFAULT_PAYROLL_TIMEZONE = "Europe/Moscow";

export function formatDateIsoInTimeZone(
	moment: Date,
	timeZone: string | null | undefined,
): string {
	const effectiveZone = timeZone?.trim() || DEFAULT_PAYROLL_TIMEZONE;
	try {
		return new Intl.DateTimeFormat("en-CA", {
			timeZone: effectiveZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(moment);
	} catch {
		try {
			return new Intl.DateTimeFormat("en-CA", {
				timeZone: DEFAULT_PAYROLL_TIMEZONE,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}).format(moment);
		} catch {
			return moment.toISOString().slice(0, 10);
		}
	}
}

function getTimeZoneOffsetMs(dateStr: string, timeZone: string): number {
	const parts = dateStr.slice(0, 10).split("-").map((v) => Number.parseInt(v, 10));
	const [year, month, day] = parts;
	if (!year || !month || !day) return 0;
	const probeUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		hour12: false,
	});
	const map = Object.fromEntries(formatter.formatToParts(probeUtc).map((p) => [p.type, p.value]));
	const localAsUtc = Date.UTC(
		Number(map.year),
		Number(map.month) - 1,
		Number(map.day),
		Number(map.hour === "24" ? 0 : map.hour),
		Number(map.minute),
		Number(map.second),
	);
	return localAsUtc - probeUtc.getTime();
}

export function resolvePeriodDateBoundsInTimeZone(
	fromStr: string,
	toStr: string,
	timeZone: string | null | undefined,
): { fromDate: Date; toDate: Date } {
	const cleanFrom = fromStr.slice(0, 10);
	const cleanTo = toStr.slice(0, 10);
	const effectiveZone = timeZone?.trim() || DEFAULT_PAYROLL_TIMEZONE;
	try {
		const [fy, fm, fd] = cleanFrom.split("-").map((v) => Number.parseInt(v, 10));
		const [ty, tm, td] = cleanTo.split("-").map((v) => Number.parseInt(v, 10));
		if (!fy || !fm || !fd || !ty || !tm || !td) {
			return {
				fromDate: new Date(`${cleanFrom}T00:00:00.000Z`),
				toDate: new Date(`${cleanTo}T23:59:59.999Z`),
			};
		}
		const fromOffsetMs = getTimeZoneOffsetMs(cleanFrom, effectiveZone);
		const toOffsetMs = getTimeZoneOffsetMs(cleanTo, effectiveZone);
		const fromDate = new Date(Date.UTC(fy, fm - 1, fd, 0, 0, 0, 0) - fromOffsetMs);
		const toDate = new Date(Date.UTC(ty, tm - 1, td, 23, 59, 59, 999) - toOffsetMs);
		return { fromDate, toDate };
	} catch {
		return {
			fromDate: new Date(`${cleanFrom}T00:00:00.000Z`),
			toDate: new Date(`${cleanTo}T23:59:59.999Z`),
		};
	}
}

export async function resolveClinicTimeZone(
	tx: TenantDb,
	orgId: string,
): Promise<string> {
	const [clinicRow] = await tx
		.select({ timezone: clinics.timezone })
		.from(clinics)
		.where(eq(clinics.organizationId, orgId))
		.limit(1);
	return clinicRow?.timezone?.trim() || DEFAULT_PAYROLL_TIMEZONE;
}

export async function fetchClosedPayrollStatements(
	orgId: string,
	resolvedDocId: string,
	doctorName: string,
	tx?: TenantDb,
): Promise<{ closedPeriods: ClosedPayrollPeriodDto[]; statements: (typeof doctorPayrollStatements.$inferSelect)[] }> {
	const run = async (dbClient: TenantDb) => {
		const isAll = resolvedDocId === "all";
		const clinicTimeZone = await resolveClinicTimeZone(dbClient, orgId);
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
			dateClosedIso: formatDateIsoInTimeZone(s.createdAt, clinicTimeZone),
			doctorName: isAll ? (s.doctorId || doctorName) : doctorName,
			rkoReceiptNumber: isAll ? "" : (s.rkoNumber || `РКО-${s.id.slice(0, 8).toUpperCase()}`),
			grossKopecks: Number(s.grossRevenueKopecks ?? 0),
			labCostKopecks: Number(s.labCostKopecks ?? 0),
			materialCostKopecks: Number(s.materialsCostKopecks ?? 0),
			netBaseKopecks: Number(s.netBaseRevenueKopecks ?? 0),
			payoutKopecks: Number(s.netPayoutKopecks ?? 0),
			isPaidRko: Boolean(s.paidAt),
		}));

		return { closedPeriods, statements };
	};

	if (tx) {
		return run(tx);
	}
	return withTenantCtx(orgId, run);
}
