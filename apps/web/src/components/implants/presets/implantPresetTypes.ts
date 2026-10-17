export type MischDensity = "D1" | "D2" | "D3" | "D4";
export type ImplantCapType = "fdm" | "plug";

export interface FastImplantSystemPreset {
	readonly brand: string;
	readonly model: string;
	readonly defaultDiameterMm: number;
	readonly defaultLengthMm: number;
	readonly defaultTorqueNcm: number;
	readonly recommendedDrillRpm: number;
}

export interface ParsedImplantBarcode {
	readonly rawBarcode: string;
	readonly article?: string | undefined;
	readonly lot?: string | undefined;
	readonly serial?: string | undefined;
	readonly expirationDate?: string | undefined;
}

export interface ImplantWarehouseStockItem {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly stockQuantity: string;
	readonly currentQty: string;
	readonly unitCostRub: string;
	readonly pricePerUnit: string;
	readonly sku?: string | null;
	readonly barcode?: string | null;
	readonly lotNumber?: string | null;
	readonly expirationDate?: string | null;
	readonly notes?: string | null;
}

export interface ImplantConsumableItem {
	readonly id: string;
	readonly name: string;
	readonly unitCostRub: string | number;
	readonly lotNumber?: string | null;
	readonly expirationDate?: string | null;
	readonly stockQuantity?: string | null;
}

export interface ImplantConsumablesStock {
	readonly grafts: readonly ImplantConsumableItem[];
	readonly membranes: readonly ImplantConsumableItem[];
	readonly sutures: readonly ImplantConsumableItem[];
}

export interface FastImplantPassportData {
	readonly passportId: string;
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
	readonly isqDay0?: number | undefined;
	readonly capType?: ImplantCapType | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly dateIso: string;
	readonly isWarehouseOverdraft?: boolean | undefined;
	readonly inventoryItemId?: string | undefined;
	readonly expirationDate?: string | undefined;
	readonly operationPriceRub?: number | undefined;
	readonly implantCostRub?: number | undefined;
	readonly consumablesCostRub?: number | undefined;
	readonly doctorGrossMarginRub?: number | undefined;
	readonly netDoctorIncomeRub?: number | undefined;
	readonly isImmediateLoadingFeasible?: boolean | undefined;
	readonly boneGraftMaterial?: string | undefined;
	readonly membraneUsed?: string | undefined;
	readonly sutureMaterial?: string | undefined;
}
