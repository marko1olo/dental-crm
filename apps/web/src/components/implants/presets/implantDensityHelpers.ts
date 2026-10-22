import type { MischDensity, FastImplantPassportData, ImplantCapType } from "./implantPresetTypes";
import { FAST_IMPLANT_SYSTEM_PRESETS } from "./implantPresetConstants";

export interface AnatomicalImplantDefaults {
	readonly toothFdi: number;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly boneDensity: MischDensity;
	readonly capType: ImplantCapType;
	readonly isqDay0: number;
	readonly sutureMaterial: string;
}

export function getBoneDensityByToothFdi(toothFdi: number): MischDensity {
	if (toothFdi >= 11 && toothFdi <= 28) {
		if ([17, 18, 27, 28].includes(toothFdi)) return "D4";
		return "D3";
	}
	if (toothFdi >= 31 && toothFdi <= 48) {
		if ([31, 32, 33, 41, 42, 43].includes(toothFdi)) return "D1";
		if ([37, 38, 47, 48].includes(toothFdi)) return "D3";
		return "D2";
	}
	return "D2";
}

/**
 * Анатомический выбор параметров имплантата по зубу FDI (11–48).
 * Моляры (36, 46, 16, 26) -> Ø 4.5 × 10 мм;
 * Резцы (11, 21) -> Ø 3.5 × 12 мм;
 * Премоляры -> Ø 4.0 × 10 мм;
 * Торк первичной стабильности 35 Н·см, ФДМ, шов Викрил 4-0.
 */
export function getAnatomicalImplantDefaults(toothFdi: number): AnatomicalImplantDefaults {
	const tooth = toothFdi || 46;
	const boneDensity = getBoneDensityByToothFdi(tooth);
	const toothNum = tooth % 10;
	const isUpper = tooth >= 11 && tooth <= 28;

	// Моляры (16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48): стандартно 4.5 x 10 мм
	if (toothNum === 6 || toothNum === 7 || toothNum === 8) {
		return {
			toothFdi: tooth,
			diameterMm: 4.5,
			lengthMm: 10.0,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Премоляры (14, 15, 24, 25, 34, 35, 44, 45): стандартно 4.0 x 10 мм
	if (toothNum === 4 || toothNum === 5) {
		return {
			toothFdi: tooth,
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Верхние резцы (11, 21, 12, 22): 3.5 x 12.0 мм
	if (isUpper && (toothNum === 1 || toothNum === 2)) {
		return {
			toothFdi: tooth,
			diameterMm: 3.5,
			lengthMm: 12.0,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Клыки (13, 23, 33, 43): 4.0 x 11.5 мм
	if (toothNum === 3) {
		return {
			toothFdi: tooth,
			diameterMm: 4.0,
			lengthMm: 11.5,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Нижние резцы (31, 32, 41, 42): 3.5 x 10.0 мм
	return {
		toothFdi: tooth,
		diameterMm: 3.5,
		lengthMm: 10.0,
		torqueNcm: 35,
		boneDensity,
		capType: "fdm",
		isqDay0: 72,
		sutureMaterial: "Викрил 4-0",
	};
}

export function createDefaultPassportRecord(params: {
	toothFdi?: number;
	brand?: string;
	diameterMm?: number;
	lengthMm?: number;
	torqueNcm?: number;
	boneDensity?: MischDensity;
	isqDay0?: number;
	capType?: ImplantCapType;
	patientName?: string;
	patientId?: string;
	doctorName?: string;
	doctorId?: string;
	lotNumber?: string;
	serialNumber?: string;
	catalogArticle?: string;
	expirationDate?: string;
	inventoryItemId?: string;
	operationPriceRub?: number;
	implantCostRub?: number;
	consumablesCostRub?: number;
}): FastImplantPassportData {
	const tooth = params.toothFdi || 46;
	const preset = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === params.brand) ?? FAST_IMPLANT_SYSTEM_PRESETS[0]!;
	const timestampSuffix = Date.now().toString().slice(-6);
	const torque = params.torqueNcm ?? 35;
	const isq = params.isqDay0 ?? 72;
	const isImmediateLoadingFeasible = torque >= 35 && torque <= 55 && isq >= 70;
	const article = params.catalogArticle ?? (preset.brand === "Osstem" ? "TS3S4010S" : preset.brand === "Dentium" ? "FX4010" : preset.brand === "Straumann" ? "021.2310" : preset.brand === "Ankylos" ? "A-B110-CX" : preset.brand === "Astra Tech" ? "EV-42110" : preset.brand === "Nobel Biocare" ? "NP-35115" : "TS3S4010S");

	return {
		passportId: `IMP-PASSPORT-${tooth}-${timestampSuffix}`,
		toothFdi: tooth,
		brand: preset.brand,
		model: preset.model,
		catalogArticle: article,
		diameterMm: params.diameterMm ?? preset.defaultDiameterMm,
		lengthMm: params.lengthMm ?? preset.defaultLengthMm,
		torqueNcm: torque,
		lotNumber: params.lotNumber ?? `LOT-${new Date().getFullYear()}-${preset.brand.slice(0, 3).toUpperCase()}-${timestampSuffix}`,
		serialNumber: params.serialNumber ?? `SN-${timestampSuffix}`,
		expirationDate: params.expirationDate ?? "2028-11-30",
		inventoryItemId: params.inventoryItemId,
		boneDensity: params.boneDensity ?? getBoneDensityByToothFdi(tooth),
		isqDay0: isq,
		capType: params.capType ?? "fdm",
		patientName: params.patientName ?? "Пациент",
		patientId: params.patientId ?? "PAT-01",
		doctorName: params.doctorName ?? "Хирург-имплантолог",
		doctorId: params.doctorId ?? "DOC-01",
		dateIso: new Date().toISOString(),
		isWarehouseOverdraft: false,
		operationPriceRub: params.operationPriceRub ?? 45000,
		implantCostRub: params.implantCostRub ?? 12500,
		consumablesCostRub: params.consumablesCostRub ?? 0,
		doctorGrossMarginRub: (params.operationPriceRub ?? 45000) - ((params.implantCostRub ?? 12500) + (params.consumablesCostRub ?? 0)),
		netDoctorIncomeRub: Math.max(0, (params.operationPriceRub ?? 45000) - ((params.implantCostRub ?? 12500) + (params.consumablesCostRub ?? 0))),
		isImmediateLoadingFeasible,
	};
}

export function createFastImplantPreset(brandName: string, toothFdi = 46): FastImplantPassportData {
	return createDefaultPassportRecord({ brand: brandName, toothFdi });
}
