import type { MischDensity, FastImplantPassportData, ImplantCapType } from "./implantPresetTypes";
import { FAST_IMPLANT_SYSTEM_PRESETS } from "./implantPresetConstants";

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
	const preset = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === params.brand) ?? FAST_IMPLANT_SYSTEM_PRESETS[0]!;
	const tooth = params.toothFdi || 46;
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
