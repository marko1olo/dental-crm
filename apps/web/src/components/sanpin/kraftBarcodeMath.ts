/**
 * apps/web/src/components/sanpin/kraftBarcodeMath.ts
 *
 * Математика сроков стерильности крафт-пакетов и генерация машиночитаемых штрихкодов.
 * (Мандаты 8e, 8n, 8x, 8ap)
 */

export interface KraftBarcodeParams {
	readonly batchNumber: string;
	readonly serialNumber: number;
	readonly expDateIsoOrFormatted: string;
	readonly sterilizerCode: string;
}

export function calculateKraftSterilityExpiration(
	packDateInput: string | Date,
	packagingType = "kraft_heat_sealed",
): {
	daysLifespan: number;
	expDateIso: string;
	expDateFormatted: string;
	isExpired: boolean;
} {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : new Date(packDateInput.getTime());
	const daysLifespan = packagingType.includes("laminated") ? 180 : 50;
	const expDate = new Date(packDate.getTime() + daysLifespan * 24 * 3600 * 1000);
	return {
		daysLifespan,
		expDateIso: expDate.toISOString(),
		expDateFormatted: expDate.toISOString().slice(0, 10),
		isExpired: expDate.getTime() < Date.now(),
	};
}

export function generateKraftBarcode(params: KraftBarcodeParams): string {
	const serialStr = `S${String(params.serialNumber).padStart(3, "0")}`;
	const cleanExp = params.expDateIsoOrFormatted.slice(0, 10).replace(/-/g, "");
	return `DNT-${params.sterilizerCode.replace(/[^a-zA-Z0-9]/g, "")}-${params.batchNumber}-${serialStr}-${cleanExp}`;
}

export const SAMPLE_TEST_BARCODES = [
	{ label: "Терапевтический лоток (50 сут.)", barcode: "KB2608250001", badge: "Терапия", description: "Стандартный смотровой лоток в самоклеящемся крафт-пакете" },
	{ label: "Эндодонтический набор (134°C / Класс 5)", barcode: "ENDO-TRAY-2026", badge: "Эндодонтия", description: "Стерильный эндодонтический лоток с химическим интегратором 5 класса" },
	{ label: "Хирургический набор экстракционный", barcode: "SURG-TRAY-2026", badge: "Хирургия", description: "Хирургические элеваторы и щипцы в двойной стерильной упаковке" },
	{ label: "2D DataMatrix (АК-01, Цикл №3)", barcode: "KB-20260826-01#1|АК-01|CYC3|2026-08-26|2026-10-15|NURSE-01|set_therapeutic_tray", badge: "DataMatrix 2D", description: "Полный машиночитаемый паспорт стерилизации DataMatrix 2D" },
	{ label: "Просроченный пакет (Мягкий допуск острая боль)", barcode: "KB2401010001", badge: "Просрочен", description: "Тест обнаружения нарушения с мягким допуском" },
] as const;
