/**
 * planEstimator.ts
 *
 * Smart plan estimator: generates Standard vs Premium implant treatment plans
 * with full cost breakdown, margin analysis, and smart bundle detection.
 * Pure algorithmic — no external calls.
 */

export type ImplantSystem =
	| "osstem"
	| "straumann"
	| "nobel"
	| "bredent"
	| "mdi"
	| "other";
export type PlanTier = "standard" | "premium";

export interface ServiceLine {
	code: string;
	name: string;
	quantity: number;
	unitPriceFee: number; // what the patient pays for the service itself
	materialCost: number; // clinic's material cost (implant, crown lab work, etc.)
	phase: 1 | 2 | 3; // 1=Sanation, 2=Surgery, 3=Prosthetics
	durationMinutes: number;
}

export interface PlanEstimate {
	tier: PlanTier;
	systemName: string;
	services: ServiceLine[];
	totalRevenue: number;
	totalMaterialCost: number;
	grossProfit: number;
	grossMarginPct: number;
	phases: {
		phase: 1 | 2 | 3;
		name: string;
		revenue: number;
		durationMinutes: number;
	}[];
}

// --- Implant system cost catalog (RUB approximate) ---
const SYSTEM_COSTS: Record<
	ImplantSystem,
	{ implantCost: number; label: string }
> = {
	osstem: { implantCost: 8_500, label: "Osstem TS III SA" },
	straumann: { implantCost: 24_000, label: "Straumann BLX" },
	nobel: { implantCost: 28_000, label: "Nobel Biocare Active" },
	bredent: { implantCost: 12_000, label: "Bredent SKY Blue" },
	mdi: { implantCost: 5_000, label: "MDI Mini Implant" },
	other: { implantCost: 6_000, label: "Другая система" },
};

const CROWN_COSTS: Record<
	PlanTier,
	{ lab: number; fee: number; label: string }
> = {
	standard: {
		lab: 8_000,
		fee: 18_000,
		label: "Коронка циркониевая (стандарт)",
	},
	premium: {
		lab: 14_000,
		fee: 28_000,
		label: "Коронка монолитная HIGH TECH (премиум)",
	},
};

const ABUTMENT_COSTS: Record<
	PlanTier,
	{ mat: number; fee: number; label: string }
> = {
	standard: { mat: 2_500, fee: 5_000, label: "Абатмент титановый стандартный" },
	premium: {
		mat: 6_000,
		fee: 10_000,
		label: "Абатмент индивидуальный CAD/CAM",
	},
};

const SURGERY_FEE: Record<PlanTier, number> = {
	standard: 15_000,
	premium: 22_000,
};

/**
 * Generate both Standard and Premium plans for a single implant case.
 */
export function estimateDualPlan(
	toothFdi: number,
	primarySystem: ImplantSystem,
	premiumSystem: ImplantSystem = "nobel",
): { standard: PlanEstimate; premium: PlanEstimate } {
	return {
		standard: buildPlan("standard", toothFdi, primarySystem),
		premium: buildPlan("premium", toothFdi, premiumSystem),
	};
}

function buildPlan(
	tier: PlanTier,
	toothFdi: number,
	system: ImplantSystem,
): PlanEstimate {
	const sysData = SYSTEM_COSTS[system];
	const crown = CROWN_COSTS[tier];
	const abutment = ABUTMENT_COSTS[tier];
	const surgFee = SURGERY_FEE[tier];

	const services: ServiceLine[] = [
		// Phase 1: Sanation (pre-op consult + imaging if needed)
		{
			code: "B01.016.001",
			name: "Консультация врача-имплантолога + план лечения",
			quantity: 1,
			unitPriceFee: 3_000,
			materialCost: 0,
			phase: 1,
			durationMinutes: 30,
		},
		// Phase 2: Surgery
		{
			code: "A16.07.004.001",
			name: `Установка имплантата ${sysData.label} (зуб ${toothFdi})`,
			quantity: 1,
			unitPriceFee: surgFee,
			materialCost: sysData.implantCost,
			phase: 2,
			durationMinutes: 60,
		},
		{
			code: "A16.07.004.002",
			name: "Формирователь десны (установка)",
			quantity: 1,
			unitPriceFee: tier === "premium" ? 4_500 : 3_000,
			materialCost: tier === "premium" ? 1_500 : 800,
			phase: 2,
			durationMinutes: 30,
		},
		// Phase 3: Prosthetics
		{
			code: "A16.07.012.001",
			name: abutment.label,
			quantity: 1,
			unitPriceFee: abutment.fee,
			materialCost: abutment.mat,
			phase: 3,
			durationMinutes: 20,
		},
		{
			code: "A16.07.022.001",
			name: crown.label,
			quantity: 1,
			unitPriceFee: crown.fee,
			materialCost: crown.lab,
			phase: 3,
			durationMinutes: 45,
		},
	];

	const totalRevenue = services.reduce(
		(s, l) => s + l.unitPriceFee * l.quantity,
		0,
	);
	const totalMaterialCost = services.reduce(
		(s, l) => s + l.materialCost * l.quantity,
		0,
	);
	const grossProfit = totalRevenue - totalMaterialCost;
	const grossMarginPct =
		totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

	const phaseGroups: PlanEstimate["phases"] = [
		{ phase: 1, name: "Фаза I: Санация", revenue: 0, durationMinutes: 0 },
		{ phase: 2, name: "Фаза II: Хирургия", revenue: 0, durationMinutes: 0 },
		{ phase: 3, name: "Фаза III: Ортопедия", revenue: 0, durationMinutes: 0 },
	];

	for (const svc of services) {
		const pg = phaseGroups.find((p) => p.phase === svc.phase)!;
		pg.revenue += svc.unitPriceFee * svc.quantity;
		pg.durationMinutes += svc.durationMinutes * svc.quantity;
	}

	return {
		tier,
		systemName: sysData.label,
		services,
		totalRevenue,
		totalMaterialCost,
		grossProfit,
		grossMarginPct,
		phases: phaseGroups,
	};
}

/**
 * Smart bundle detector: given a list of tooth surfaces affected by caries,
 * determines if a simple "filling" should be upgraded to a complex restoration.
 *
 * MOD (Mesial + Occlusal + Distal) = 3+ surfaces → complex restoration.
 */
export interface CariesBundleResult {
	surfaces: string[];
	surfaceCount: number;
	isComplex: boolean;
	recommendedCode: string;
	recommendedName: string;
	basePrice: number;
}

export function detectCariesBundle(surfaces: string[]): CariesBundleResult {
	const count = surfaces.length;
	const isComplex = count >= 3;

	if (isComplex) {
		return {
			surfaces,
			surfaceCount: count,
			isComplex: true,
			recommendedCode: "A16.07.002.007",
			recommendedName: `Сложная реставрация ${count} поверхностей (MOD) — композит светового отверждения`,
			basePrice: 4_500 + (count - 2) * 1_200,
		};
	}

	return {
		surfaces,
		surfaceCount: count,
		isComplex: false,
		recommendedCode: count === 1 ? "A16.07.002.001" : "A16.07.002.004",
		recommendedName:
			count === 1
				? "Пломба 1 поверхность (композит)"
				: `Пломба 2 поверхности (композит)`,
		basePrice: count === 1 ? 2_200 : 3_200,
	};
}
