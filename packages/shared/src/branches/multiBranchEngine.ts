/**
 * multiBranchEngine.ts — Multi-Branch Architecture & Consolidated Network P&L Engine.
 *
 * Wave 21 — Domain 1 (Multi-Branch & Inter-Warehouse Transfer).
 *
 * INVARIANTS:
 * 1. Tenant & Network Isolation:
 *    - Unified patient database across the entire clinic chain/network (OrganizationId).
 *    - Strict branch isolation for Warehouses, Cash Desks / Registers, and Cabinets/Schedules.
 * 2. Schedule Integrity:
 *    - Cross-branch doctor shift collision detection to prevent double-booking across branches.
 * 3. Exact Financial Telemetry:
 *    - All financial figures computed strictly in integer kopecks (Kopecks = number).
 *    - Branch-level and Consolidated Network P&L calculations (Gross Revenue, Direct COGS, OPEX, EBITDA, Net Profit, Margin %).
 */

import { z } from "zod";
import { type Kopecks, formatKopecksRu } from "../utils/money.js";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

// ─── 1. BRANCH CONFIGURATION & PROFILES ────────────────────────────────────────

export const branchTypeSchema = z.enum([
	"central",      // Флагманский / Центральный филиал
	"branch",       // Стандартный филиал клиники
	"satellite",    // Сателлитный кабинет / Мини-клиника
	"mobile_unit",  // Мобильный стоматологический комплекс
]);
export type BranchType = z.infer<typeof branchTypeSchema>;

export const branchStatusSchema = z.enum([
	"active",       // Действующий филиал
	"inactive",     // Временно приостановлен
	"renovation",   // На реконструкции / ремонте
	"closed",       // Закрыт
]);
export type BranchStatus = z.infer<typeof branchStatusSchema>;

export const branchOperatingHoursSchema = z.object({
	dayOfWeek: z.number().int().min(1).max(7), // 1 = Понедельник, 7 = Воскресенье
	isOpen: z.boolean(),
	openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Формат времени HH:MM"),
	closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Формат времени HH:MM"),
	lunchBreak: z
		.object({
			startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
			endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
		})
		.optional()
		.nullable(),
});
export type BranchOperatingHours = z.infer<typeof branchOperatingHoursSchema>;

export const branchProfileSchema = z.object({
	id: z.string().min(1, "ID филиала обязателен"),
	organizationId: z.string().min(1, "ID организации обязателен"),
	code: z.string().min(1, "Код филиала обязателен").max(30),
	name: z.string().min(1, "Наименование филиала обязательно").max(255),
	shortName: z.string().max(100).optional(),
	branchType: branchTypeSchema.default("branch"),
	status: branchStatusSchema.default("active"),
	isCentral: z.boolean().default(false),
	legalEntityName: z.string().max(255).optional(),
	inn: z.string().regex(/^(\d{10}|\d{12})$/, "ИНН должен содержать 10 или 12 цифр").optional().nullable(),
	kpp: z.string().regex(/^\d{9}$/, "КПП должен содержать 9 цифр").optional().nullable(),
	ogrn: z.string().regex(/^(\d{13}|\d{15})$/, "ОГРН/ОГРНИП должен содержать 13 или 15 цифр").optional().nullable(),
	address: z.string().min(1, "Адрес филиала обязателен"),
	city: z.string().min(1, "Город обязателен"),
	postalCode: z.string().max(20).optional().nullable(),
	phone: z.string().min(1, "Телефон филиала обязателен"),
	email: z.string().email("Некорректный email").optional().nullable(),
	medicalLicenseNumber: z.string().optional().nullable(),
	medicalLicenseDate: z.string().optional().nullable(),
	medicalLicenseIssuedBy: z.string().optional().nullable(),
	cabinetCount: z.number().int().min(1).default(1),
	timezone: z.string().default("Europe/Moscow"),
	operatingHours: z.array(branchOperatingHoursSchema).default([]),
	notes: z.string().max(2000).optional().nullable(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});
export type BranchProfile = z.infer<typeof branchProfileSchema>;

export const BRANCH_TYPE_LABELS_RU: Record<BranchType, string> = {
	central: "Центральный филиал (Флагман)",
	branch: "Филиал клиники",
	satellite: "Сателлитный кабинет",
	mobile_unit: "Мобильный комплекс",
};

export const BRANCH_STATUS_LABELS_RU: Record<BranchStatus, string> = {
	active: "Действует",
	inactive: "Приостановлен",
	renovation: "Ремонт / Реконструкция",
	closed: "Закрыт",
};

// ─── 2. TENANT & BRANCH ISOLATION CONTROLS ─────────────────────────────────────

/**
 * Validates cross-branch patient accessibility.
 * Patients belong to the organization (network) and are accessible in all branches of the tenant.
 */
export function validatePatientCrossBranchAccess(params: {
	patientOrganizationId: string;
	currentBranchOrganizationId: string;
}): boolean {
	if (!params.patientOrganizationId || !params.currentBranchOrganizationId) {
		return false;
	}
	return params.patientOrganizationId === params.currentBranchOrganizationId;
}

export interface BranchWarehouseRef {
	id: string;
	branchId: string;
	organizationId: string;
	name: string;
	code?: string | undefined;
	isCentralWarehouse?: boolean | undefined;
	isCabinetStock?: boolean | undefined;
	cabinetId?: string | undefined;
	isActive: boolean;
}

/**
 * Validates warehouse isolation to ensure stock is bound to its designated branch.
 */
export function validateWarehouseBranchAccess(params: {
	warehouse: BranchWarehouseRef;
	targetBranchId: string;
	targetOrganizationId: string;
}): boolean {
	if (params.warehouse.organizationId !== params.targetOrganizationId) {
		return false;
	}
	// Central warehouse can be accessed across the tenant if flagged, otherwise strictly local branch
	if (params.warehouse.isCentralWarehouse) {
		return true;
	}
	return params.warehouse.branchId === params.targetBranchId;
}

export interface BranchCashDeskRef {
	id: string;
	branchId: string;
	organizationId: string;
	name: string;
	kktSerialNumber?: string | undefined;
	kktRegistrationNumber?: string | undefined;
	fnSerialNumber?: string | undefined;
	isActive: boolean;
	currentCashBalanceKopecks: Kopecks;
}

/**
 * Validates cash desk isolation ensuring cash transactions strictly stay within the physical branch.
 */
export function validateCashDeskBranchAccess(params: {
	cashDesk: BranchCashDeskRef;
	targetBranchId: string;
	targetOrganizationId: string;
}): boolean {
	if (params.cashDesk.organizationId !== params.targetOrganizationId) {
		return false;
	}
	return params.cashDesk.branchId === params.targetBranchId;
}

// ─── 3. CROSS-BRANCH DOCTOR SCHEDULE COLLISION DETECTION ───────────────────────

export interface DoctorBranchShift {
	id: string;
	doctorId: string;
	doctorName: string;
	organizationId: string;
	branchId: string;
	branchName: string;
	cabinetId?: string | undefined;
	cabinetName?: string | undefined;
	shiftDate: string; // YYYY-MM-DD
	startTime: string; // HH:MM
	endTime: string;   // HH:MM
}

export interface ScheduleCollisionItem {
	shiftA: DoctorBranchShift;
	shiftB: DoctorBranchShift;
	collisionType: "exact_overlap" | "insufficient_transit_time";
	overlapMinutes: number;
	messageRu: string;
}

export interface CrossBranchCollisionReport {
	hasCollisions: boolean;
	totalCollisions: number;
	collisions: ScheduleCollisionItem[];
}

function timeStringToMinutes(hhmm: string): number {
	const parts = hhmm.split(":");
	const h = Number(parts[0] ?? "0");
	const m = Number(parts[1] ?? "0");
	return h * 60 + m;
}

/**
 * Detects cross-branch scheduling conflicts where a doctor is assigned to different branches
 * simultaneously or with insufficient travel time between facilities.
 */
export function detectCrossBranchScheduleCollisions(
	shifts: readonly DoctorBranchShift[],
	minTransitMinutes = 30,
): CrossBranchCollisionReport {
	const collisions: ScheduleCollisionItem[] = [];

	// Group shifts by doctorId + shiftDate
	const doctorDateMap = new Map<string, DoctorBranchShift[]>();

	for (const shift of shifts) {
		const key = `${shift.doctorId}_${shift.shiftDate}`;
		const list = doctorDateMap.get(key) ?? [];
		list.push(shift);
		doctorDateMap.set(key, list);
	}

	for (const [, docShifts] of doctorDateMap.entries()) {
		if (docShifts.length < 2) continue;

		for (let i = 0; i < docShifts.length; i++) {
			for (let j = i + 1; j < docShifts.length; j++) {
				const s1 = docShifts[i]!;
				const s2 = docShifts[j]!;

				// Only check cross-branch conflicts (same branch cabinet conflicts are handled by local shift engine)
				if (s1.branchId === s2.branchId) continue;

				const start1 = timeStringToMinutes(s1.startTime);
				const end1 = timeStringToMinutes(s1.endTime);
				const start2 = timeStringToMinutes(s2.startTime);
				const end2 = timeStringToMinutes(s2.endTime);

				// Check overlap
				const overlapStart = Math.max(start1, start2);
				const overlapEnd = Math.min(end1, end2);

				if (overlapStart < overlapEnd) {
					const overlapMins = overlapEnd - overlapStart;
					collisions.push({
						shiftA: s1,
						shiftB: s2,
						collisionType: "exact_overlap",
						overlapMinutes: overlapMins,
						messageRu: `Врач ${s1.doctorName} одновременно назначен в филиалы «${s1.branchName}» (${s1.startTime}-${s1.endTime}) и «${s2.branchName}» (${s2.startTime}-${s2.endTime}). Пересечение: ${overlapMins} мин.`,
					});
				} else {
					// Check transit time between consecutive shifts
					const gapMinutes = Math.max(0, start2 >= end1 ? start2 - end1 : start1 - end2);
					if (gapMinutes < minTransitMinutes) {
						collisions.push({
							shiftA: s1,
							shiftB: s2,
							collisionType: "insufficient_transit_time",
							overlapMinutes: minTransitMinutes - gapMinutes,
							messageRu: `Недостаточно времени на перемещение между филиалами «${s1.branchName}» и «${s2.branchName}» для врача ${s1.doctorName} (интервал ${gapMinutes} мин при нормативе ${minTransitMinutes} мин).`,
						});
					}
				}
			}
		}
	}

	return {
		hasCollisions: collisions.length > 0,
		totalCollisions: collisions.length,
		collisions,
	};
}

// ─── 4. CONSOLIDATED & BRANCH-LEVEL P&L FINANCIAL TELEMETRY ───────────────────

export interface BranchRevenuesBreakdown {
	treatmentsKopecks: Kopecks;
	retailSalesKopecks?: Kopecks | undefined;
	insuranceDmsKopecks?: Kopecks | undefined;
	depositReplenishmentsKopecks?: Kopecks | undefined;
	otherRevenuesKopecks?: Kopecks | undefined;
}

export interface BranchDirectCostsBreakdown {
	materialsCogsKopecks: Kopecks;          // Себестоимость расходных материалов и медикаментов
	labWorksCogsKopecks?: Kopecks | undefined;           // Себестоимость зуботехнических работ
	doctorPieceRateSalariesKopecks?: Kopecks | undefined;// Сдельная оплата врачей (% от оказанных услуг)
}

export interface BranchOperatingExpensesBreakdown {
	rentKopecks: Kopecks;                   // Аренда помещений
	fixedSalariesKopecks: Kopecks;          // Оклады администраторов, ассистентов, санитарок
	utilitiesKopecks?: Kopecks | undefined;              // Коммунальные услуги и клининг
	equipmentLeaseKopecks?: Kopecks | undefined;         // Лизинг и сервис медтехники
	marketingKopecks?: Kopecks | undefined;              // Реклама и маркетинг
	taxesFeesKopecks?: Kopecks | undefined;              // Налоги, банковский эквайринг, комиссии
	administrativeOtherKopecks?: Kopecks | undefined;    // Прочие общехозяйственные расходы
}

export interface BranchPnLInput {
	branchId: string;
	branchName: string;
	periodStart: string; // YYYY-MM-DD
	periodEnd: string;   // YYYY-MM-DD
	revenues: BranchRevenuesBreakdown;
	directCosts: BranchDirectCostsBreakdown;
	operatingExpenses: BranchOperatingExpensesBreakdown;
}

export interface BranchPnLResult {
	branchId: string;
	branchName: string;
	periodStart: string;
	periodEnd: string;

	// Revenue metrics
	grossRevenueKopecks: Kopecks;
	grossRevenueRub: number;
	treatmentsRevenueKopecks: Kopecks;
	treatmentsRevenueRub: number;
	retailSalesRevenueKopecks: Kopecks;
	insuranceDmsRevenueKopecks: Kopecks;

	// Direct Costs (COGS)
	totalDirectCostsKopecks: Kopecks;
	totalDirectCostsRub: number;
	materialsCogsKopecks: Kopecks;
	labWorksCogsKopecks: Kopecks;
	doctorSalariesKopecks: Kopecks;

	// Gross Profit
	grossProfitKopecks: Kopecks;
	grossProfitRub: number;
	grossMarginPercent: number;

	// Operating Expenses (OPEX)
	totalOperatingExpensesKopecks: Kopecks;
	totalOperatingExpensesRub: number;
	rentKopecks: Kopecks;
	fixedSalariesKopecks: Kopecks;
	utilitiesKopecks: Kopecks;
	equipmentLeaseKopecks: Kopecks;
	marketingKopecks: Kopecks;
	taxesFeesKopecks: Kopecks;
	administrativeOtherKopecks: Kopecks;

	// Bottom line metrics
	operatingProfitEbitdaKopecks: Kopecks;
	operatingProfitEbitdaRub: number;
	netProfitKopecks: Kopecks;
	netProfitRub: number;
	netProfitMarginPercent: number;
	isProfitable: boolean;
}

export interface ConsolidatedNetworkPnL {
	organizationId: string;
	periodStart: string;
	periodEnd: string;
	branchCount: number;
	activeBranchCount: number;
	branchesPnL: Record<string, BranchPnLResult>;

	// Consolidated totals
	networkGrossRevenueKopecks: Kopecks;
	networkGrossRevenueRub: number;
	networkDirectCostsKopecks: Kopecks;
	networkDirectCostsRub: number;
	networkGrossProfitKopecks: Kopecks;
	networkGrossProfitRub: number;
	networkGrossMarginPercent: number;
	networkOperatingExpensesKopecks: Kopecks;
	networkOperatingExpensesRub: number;
	networkEbitdaKopecks: Kopecks;
	networkEbitdaRub: number;
	networkNetProfitKopecks: Kopecks;
	networkNetProfitRub: number;
	networkNetProfitMarginPercent: number;
	isNetworkProfitable: boolean;

	// Performance Telemetry
	branchRevenueShares: Array<{
		branchId: string;
		branchName: string;
		revenueKopecks: Kopecks;
		sharePercent: number;
	}>;
	branchProfitContributions: Array<{
		branchId: string;
		branchName: string;
		netProfitKopecks: Kopecks;
		contributionPercent: number;
	}>;
	topPerformingBranch: {
		branchId: string;
		branchName: string;
		revenueKopecks: Kopecks;
		netProfitKopecks: Kopecks;
	} | null;
}

/**
 * Computes P&L for a single clinic branch with exact kopeck arithmetic.
 */
export function calculateBranchPnL(input: BranchPnLInput): BranchPnLResult {
	const treatmentsRev = input.revenues.treatmentsKopecks || 0;
	const retailRev = input.revenues.retailSalesKopecks || 0;
	const dmsRev = input.revenues.insuranceDmsKopecks || 0;
	const depositsRev = input.revenues.depositReplenishmentsKopecks || 0;
	const otherRev = input.revenues.otherRevenuesKopecks || 0;

	const grossRevenueKopecks = treatmentsRev + retailRev + dmsRev + depositsRev + otherRev;

	const materialsCogs = input.directCosts.materialsCogsKopecks || 0;
	const labCogs = input.directCosts.labWorksCogsKopecks || 0;
	const docSalaries = input.directCosts.doctorPieceRateSalariesKopecks || 0;

	const totalDirectCostsKopecks = materialsCogs + labCogs + docSalaries;
	const grossProfitKopecks = grossRevenueKopecks - totalDirectCostsKopecks;
	const grossMarginPercent =
		grossRevenueKopecks > 0 ? Number(((grossProfitKopecks / grossRevenueKopecks) * 100).toFixed(2)) : 0;

	const rent = input.operatingExpenses.rentKopecks || 0;
	const fixedSalaries = input.operatingExpenses.fixedSalariesKopecks || 0;
	const utilities = input.operatingExpenses.utilitiesKopecks || 0;
	const eqLease = input.operatingExpenses.equipmentLeaseKopecks || 0;
	const marketing = input.operatingExpenses.marketingKopecks || 0;
	const taxes = input.operatingExpenses.taxesFeesKopecks || 0;
	const adminOther = input.operatingExpenses.administrativeOtherKopecks || 0;

	const totalOperatingExpensesKopecks =
		rent + fixedSalaries + utilities + eqLease + marketing + taxes + adminOther;

	const ebitdaKopecks = grossProfitKopecks - totalOperatingExpensesKopecks;
	const netProfitKopecks = ebitdaKopecks; // In standard dental clinic operational P&L
	const netProfitMarginPercent =
		grossRevenueKopecks > 0 ? Number(((netProfitKopecks / grossRevenueKopecks) * 100).toFixed(2)) : 0;

	return {
		branchId: input.branchId,
		branchName: input.branchName,
		periodStart: input.periodStart,
		periodEnd: input.periodEnd,

		grossRevenueKopecks,
		grossRevenueRub: kopecksToRub(grossRevenueKopecks),
		treatmentsRevenueKopecks: treatmentsRev,
		treatmentsRevenueRub: kopecksToRub(treatmentsRev),
		retailSalesRevenueKopecks: retailRev,
		insuranceDmsRevenueKopecks: dmsRev,

		totalDirectCostsKopecks,
		totalDirectCostsRub: kopecksToRub(totalDirectCostsKopecks),
		materialsCogsKopecks: materialsCogs,
		labWorksCogsKopecks: labCogs,
		doctorSalariesKopecks: docSalaries,

		grossProfitKopecks,
		grossProfitRub: kopecksToRub(grossProfitKopecks),
		grossMarginPercent,

		totalOperatingExpensesKopecks,
		totalOperatingExpensesRub: kopecksToRub(totalOperatingExpensesKopecks),
		rentKopecks: rent,
		fixedSalariesKopecks: fixedSalaries,
		utilitiesKopecks: utilities,
		equipmentLeaseKopecks: eqLease,
		marketingKopecks: marketing,
		taxesFeesKopecks: taxes,
		administrativeOtherKopecks: adminOther,

		operatingProfitEbitdaKopecks: ebitdaKopecks,
		operatingProfitEbitdaRub: kopecksToRub(ebitdaKopecks),
		netProfitKopecks,
		netProfitRub: kopecksToRub(netProfitKopecks),
		netProfitMarginPercent,
		isProfitable: netProfitKopecks >= 0,
	};
}

/**
 * Calculates consolidated P&L for the entire dental clinic network across all branches.
 */
export function calculateConsolidatedNetworkPnL(params: {
	organizationId: string;
	periodStart: string;
	periodEnd: string;
	branches: readonly BranchPnLInput[];
}): ConsolidatedNetworkPnL {
	const branchesPnL: Record<string, BranchPnLResult> = {};

	let networkGrossRevenueKopecks = 0;
	let networkDirectCostsKopecks = 0;
	let networkOperatingExpensesKopecks = 0;

	for (const branchInput of params.branches) {
		const result = calculateBranchPnL(branchInput);
		branchesPnL[result.branchId] = result;

		networkGrossRevenueKopecks += result.grossRevenueKopecks;
		networkDirectCostsKopecks += result.totalDirectCostsKopecks;
		networkOperatingExpensesKopecks += result.totalOperatingExpensesKopecks;
	}

	const networkGrossProfitKopecks = networkGrossRevenueKopecks - networkDirectCostsKopecks;
	const networkGrossMarginPercent =
		networkGrossRevenueKopecks > 0
			? Number(((networkGrossProfitKopecks / networkGrossRevenueKopecks) * 100).toFixed(2))
			: 0;

	const networkEbitdaKopecks = networkGrossProfitKopecks - networkOperatingExpensesKopecks;
	const networkNetProfitKopecks = networkEbitdaKopecks;
	const networkNetProfitMarginPercent =
		networkGrossRevenueKopecks > 0
			? Number(((networkNetProfitKopecks / networkGrossRevenueKopecks) * 100).toFixed(2))
			: 0;

	// Calculate branch revenue shares
	const branchRevenueShares = Object.values(branchesPnL).map((b) => ({
		branchId: b.branchId,
		branchName: b.branchName,
		revenueKopecks: b.grossRevenueKopecks,
		sharePercent:
			networkGrossRevenueKopecks > 0
				? Number(((b.grossRevenueKopecks / networkGrossRevenueKopecks) * 100).toFixed(2))
				: 0,
	}));

	// Calculate branch profit contributions
	const branchProfitContributions = Object.values(branchesPnL).map((b) => ({
		branchId: b.branchId,
		branchName: b.branchName,
		netProfitKopecks: b.netProfitKopecks,
		contributionPercent:
			networkNetProfitKopecks > 0
				? Number(((b.netProfitKopecks / networkNetProfitKopecks) * 100).toFixed(2))
				: 0,
	}));

	// Find top performing branch by revenue
	let topPerformingBranch: {
		branchId: string;
		branchName: string;
		revenueKopecks: Kopecks;
		netProfitKopecks: Kopecks;
	} | null = null;

	let maxRev = -1;
	for (const b of Object.values(branchesPnL)) {
		if (b.grossRevenueKopecks > maxRev) {
			maxRev = b.grossRevenueKopecks;
			topPerformingBranch = {
				branchId: b.branchId,
				branchName: b.branchName,
				revenueKopecks: b.grossRevenueKopecks,
				netProfitKopecks: b.netProfitKopecks,
			};
		}
	}

	return {
		organizationId: params.organizationId,
		periodStart: params.periodStart,
		periodEnd: params.periodEnd,
		branchCount: params.branches.length,
		activeBranchCount: Object.values(branchesPnL).filter((b) => b.grossRevenueKopecks > 0).length,
		branchesPnL,

		networkGrossRevenueKopecks,
		networkGrossRevenueRub: kopecksToRub(networkGrossRevenueKopecks),
		networkDirectCostsKopecks,
		networkDirectCostsRub: kopecksToRub(networkDirectCostsKopecks),
		networkGrossProfitKopecks,
		networkGrossProfitRub: kopecksToRub(networkGrossProfitKopecks),
		networkGrossMarginPercent,
		networkOperatingExpensesKopecks,
		networkOperatingExpensesRub: kopecksToRub(networkOperatingExpensesKopecks),
		networkEbitdaKopecks,
		networkEbitdaRub: kopecksToRub(networkEbitdaKopecks),
		networkNetProfitKopecks,
		networkNetProfitRub: kopecksToRub(networkNetProfitKopecks),
		networkNetProfitMarginPercent,
		isNetworkProfitable: networkNetProfitKopecks >= 0,

		branchRevenueShares,
		branchProfitContributions,
		topPerformingBranch,
	};
}
