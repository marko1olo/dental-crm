/**
 * ============================================================================
 * ACCEPTANCE WAYBILLS TEMPLATES & CANONICAL SUPPLIERS
 * Канонические стоматологические поставщики и шаблоны материалов для быстрого
 * оприходования без больничной бюрократии.
 * ============================================================================
 */

import type { AcceptanceSupplier, VatRate } from "./acceptanceWaybillsTypes.js";

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

export const CANONICAL_DENTAL_SUPPLIERS: readonly AcceptanceSupplier[] = [
	{
		id: "sup_stomtorg",
		name: 'ООО "Стомторг"',
		inn: "7701234567",
		phone: "+7 (495) 789-45-12",
		email: "sales@stomtorg.ru",
		isPreferred: true,
	},
	{
		id: "sup_dental_market",
		name: 'ООО "Дентал Маркет"',
		inn: "7715892341",
		phone: "+7 (495) 640-11-22",
		email: "order@dentalmarket.ru",
		isPreferred: true,
	},
	{
		id: "sup_vladmiva",
		name: 'АО "ВладМиВа"',
		inn: "3123014589",
		phone: "+7 (4722) 20-05-55",
		email: "info@vladmiva.ru",
		isPreferred: true,
	},
	{
		id: "sup_kavo",
		name: 'ООО "КаВо Дентал Руссланд"',
		inn: "7704281920",
		phone: "+7 (495) 232-15-50",
		email: "russia@kavo.com",
		isPreferred: false,
	},
	{
		id: "sup_rokada",
		name: 'ООО "Рокада Мед"',
		inn: "1655049382",
		phone: "+7 (843) 570-68-88",
		email: "kzn@rokada-med.ru",
		isPreferred: false,
	},
];

export const CANONICAL_DENTAL_MATERIAL_TEMPLATES: readonly DentalMaterialTemplate[] = [
	{
		name: "Септанест с адреналином 1:100 000 (50 карпул/уп)",
		category: "Анестетики",
		unit: "упак",
		defaultUnitPriceKopecks: 540000, // 5 400.00 ₽
		vatRate: 0, // Лекарственный препарат (НК РФ 149 п. 2 пп. 2)
		defaultBatchPrefix: "SEPT",
		shelfLifeMonths: 24,
		sku: "AN-SEPT-100",
		barcode: "4607001234567",
	},
	{
		name: "Композит Filtek Z250 шприц 4г (оттенок A2, 3M ESPE)",
		category: "Терапия / Композиты",
		unit: "шт",
		defaultUnitPriceKopecks: 295000, // 2 950.00 ₽
		vatRate: 0, // Медизделие (РУ Росздравнадзора)
		defaultBatchPrefix: "FLTK",
		shelfLifeMonths: 36,
		sku: "COMP-FLTK-Z250",
		barcode: "4046719001234",
	},
	{
		name: "Адгезивная система OptiBond FL (набор: праймер 8мл + адгезив 8мл, Kerr)",
		category: "Адгезивы",
		unit: "набор",
		defaultUnitPriceKopecks: 890000, // 8 900.00 ₽
		vatRate: 0, // Медизделие
		defaultBatchPrefix: "OPTB",
		shelfLifeMonths: 24,
		sku: "ADH-OPTB-FL",
		barcode: "7611234567890",
	},
	{
		name: "Эндодонтические файлы ProTaper Universal Starter Kit F1-F3 (6 шт/уп)",
		category: "Эндодонтия",
		unit: "упак",
		defaultUnitPriceKopecks: 385000, // 3 850.00 ₽
		vatRate: 0, // Медизделие
		defaultBatchPrefix: "PROT",
		shelfLifeMonths: 60,
		sku: "ENDO-PROT-UNI",
		barcode: "4011234567891",
	},
	{
		name: "Слюноотсосы одноразовые со съемным наконечником (100 шт/уп)",
		category: "Расходные материалы",
		unit: "упак",
		defaultUnitPriceKopecks: 38000, // 380.00 ₽
		vatRate: 0, // Медизделие
		defaultBatchPrefix: "SLVN",
		shelfLifeMonths: 60,
		sku: "DISP-SALIV-100",
		barcode: "8001234567892",
	},
	{
		name: "Перчатки смотровые нитриловые неопудренные размер M (100 шт/уп)",
		category: "СИЗ",
		unit: "упак",
		defaultUnitPriceKopecks: 45000, // 450.00 ₽
		vatRate: 20, // Хозяйственные СИЗ (20% НДС)
		defaultBatchPrefix: "GLV",
		shelfLifeMonths: 36,
		sku: "PPE-GLV-NITR-M",
		barcode: "4601234567893",
	},
];
