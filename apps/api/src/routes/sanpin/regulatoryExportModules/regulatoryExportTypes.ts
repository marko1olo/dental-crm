/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/regulatoryExportTypes.ts
 * Типы и контракты регуляторной выгрузки и закрытия смены СанПиН.
 * Мандат 8b: строго <= 120 строк.
 */

export interface RegulatoryExportPsoRecord {
	readonly id: string;
	readonly instrumentName: string;
	readonly testType: "phenolphthalein" | "azopyram" | "both";
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly isAzopyramNegative: boolean;
	readonly isPhenolphthaleinNegative: boolean;
	readonly isBatchApproved: boolean;
	readonly detergentBrand: string | null;
	readonly operatorName: string | null;
	readonly timestamp: Date | string | null;
}

export interface RegulatoryExportAutoclaveRecord {
	readonly id: string;
	readonly cycleNumber: number;
	readonly deviceName: string;
	readonly autoclaveId: string;
	readonly itemsDescription: string;
	readonly packagingType: string;
	readonly temperatureCelsius: string;
	readonly pressureBar: string;
	readonly durationMin: number;
	readonly status: string;
	readonly passedIndicator: boolean;
	readonly operatorName: string | null;
	readonly barcode: string | null;
	readonly timestamp: Date | string | null;
}

export interface ShiftCloseResultCounts {
	insertedPsoCount: number;
	insertedSterilCount: number;
	insertedWasteCount: number;
	insertedMicroCount: number;
	insertedBactCount: number;
}
