import type { FastImplantPassportData, MischDensity, ImplantCapType } from "../implantQuickPresets";

export interface AssemblePassportParams {
	readonly toothFdi: number;
	readonly brand: string;
	readonly model: string;
	readonly catalogArticle: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly boneDensity: MischDensity;
	readonly isqDay0: number;
	readonly capType: ImplantCapType;
	readonly patientName: string;
	readonly patientId: string;
	readonly doctorName: string;
	readonly doctorId: string;
	readonly isWarehouseOverdraft: boolean;
	readonly inventoryItemId: string;
	readonly expirationDate: string;
	readonly operationPriceRub: number;
	readonly implantCostRub: number;
	readonly consumablesCostRub: number;
	readonly doctorGrossMarginRub: number;
	readonly isImmediateLoadingFeasible: boolean;
	readonly boneGraftMaterial?: string | undefined;
	readonly membraneUsed?: string | undefined;
	readonly sutureMaterial?: string | undefined;
}

export function buildAssembledPassportData(params: AssemblePassportParams): FastImplantPassportData {
	return {
		passportId: `IMP-PASSPORT-${params.toothFdi}-${Date.now().toString().slice(-6)}`,
		toothFdi: params.toothFdi,
		brand: params.brand,
		model: params.model,
		catalogArticle: params.catalogArticle.trim() || "TS3S4010S",
		diameterMm: params.diameterMm,
		lengthMm: params.lengthMm,
		torqueNcm: params.torqueNcm,
		lotNumber: params.lotNumber.trim() || `LOT-${params.brand.slice(0, 3)}-AUTO`,
		serialNumber: params.serialNumber.trim() || `SN-${Date.now().toString().slice(-4)}`,
		boneDensity: params.boneDensity,
		isqDay0: params.isqDay0,
		capType: params.capType,
		patientName: params.patientName,
		patientId: params.patientId,
		doctorName: params.doctorName,
		doctorId: params.doctorId,
		dateIso: new Date().toISOString(),
		isWarehouseOverdraft: params.isWarehouseOverdraft,
		inventoryItemId: params.inventoryItemId,
		expirationDate: params.expirationDate,
		operationPriceRub: params.operationPriceRub,
		implantCostRub: params.implantCostRub,
		consumablesCostRub: params.consumablesCostRub,
		doctorGrossMarginRub: params.doctorGrossMarginRub,
		netDoctorIncomeRub: params.doctorGrossMarginRub,
		isImmediateLoadingFeasible: params.isImmediateLoadingFeasible,
		boneGraftMaterial: params.boneGraftMaterial,
		membraneUsed: params.membraneUsed,
		sutureMaterial: params.sutureMaterial,
	};
}
