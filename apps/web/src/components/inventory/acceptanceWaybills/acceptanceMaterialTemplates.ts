import type { VatRate } from "../acceptanceWaybillsTypes.js";

export interface DentalMaterialTemplate {
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly defaultUnitPriceKopecks: number;
	readonly vatRate: VatRate;
	readonly defaultBatchPrefix: string;
	readonly shelfLifeMonths: number;
	readonly sku: string;
	readonly barcode?: string | undefined;
}

export const CANONICAL_DENTAL_MATERIAL_TEMPLATES: readonly DentalMaterialTemplate[] = [
	{
		name: "Септанест с адреналином 1:100 000 (50 карпул/уп)",
		category: "Анестетики",
		unit: "упак",
		defaultUnitPriceKopecks: 540000,
		vatRate: 0,
		defaultBatchPrefix: "SEPT",
		shelfLifeMonths: 24,
		sku: "AN-SEPT-100",
		barcode: "4607001234567",
	},
	{
		name: "Композит Filtek Z250 шприц 4г (оттенок A2, 3M ESPE)",
		category: "Терапия / Композиты",
		unit: "шт",
		defaultUnitPriceKopecks: 295000,
		vatRate: 0,
		defaultBatchPrefix: "FLTK",
		shelfLifeMonths: 36,
		sku: "COMP-FLTK-Z250",
		barcode: "4046719001234",
	},
	{
		name: "Адгезивная система OptiBond FL (набор: праймер 8мл + адгезив 8мл, Kerr)",
		category: "Адгезивы",
		unit: "набор",
		defaultUnitPriceKopecks: 890000,
		vatRate: 0,
		defaultBatchPrefix: "OPTB",
		shelfLifeMonths: 24,
		sku: "ADH-OPTB-FL",
		barcode: "7611234567890",
	},
	{
		name: "Эндодонтические файлы ProTaper Universal Starter Kit F1-F3 (6 шт/уп)",
		category: "Эндодонтия",
		unit: "упак",
		defaultUnitPriceKopecks: 385000,
		vatRate: 0,
		defaultBatchPrefix: "PROT",
		shelfLifeMonths: 60,
		sku: "ENDO-PROT-UNI",
		barcode: "4011234567891",
	},
	{
		name: "Слюноотсосы одноразовые со съемным наконечником (100 шт/уп)",
		category: "Расходные материалы",
		unit: "упак",
		defaultUnitPriceKopecks: 38000,
		vatRate: 0,
		defaultBatchPrefix: "SLVN",
		shelfLifeMonths: 60,
		sku: "DISP-SALIV-100",
		barcode: "8001234567892",
	},
	{
		name: "Перчатки смотровые нитриловые неопудренные размер M (100 шт/уп)",
		category: "СИЗ",
		unit: "упак",
		defaultUnitPriceKopecks: 45000,
		vatRate: 20,
		defaultBatchPrefix: "GLV",
		shelfLifeMonths: 36,
		sku: "PPE-GLV-NITR-M",
		barcode: "4601234567893",
	},
];
