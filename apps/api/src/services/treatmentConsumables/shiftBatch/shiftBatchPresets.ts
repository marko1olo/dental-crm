/**
 * shiftBatchPresets.ts — Layer 1: Standard shift consumable baseline presets.
 * Mandate 8v / 8aa: Real per-visit dynamic calculation & baseline norms.
 */

export interface ShiftConsumablePreset {
	patterns: string[];
	defaultName: string;
	category: string;
	unit: string;
	qty: number;
	perVisitQty: number;
	defaultCost: string;
}

export const STANDARD_SHIFT_CONSUMABLE_PRESETS: ShiftConsumablePreset[] = [
	{ patterns: ["перчатк", "нитрил"], defaultName: "Перчатки смотровые нитриловые (пара)", category: "Расходные материалы", unit: "пар", qty: 14, perVisitQty: 2, defaultCost: "35.00" },
	{ patterns: ["маск"], defaultName: "Маски трехслойные медицинские", category: "Расходные материалы", unit: "шт.", qty: 14, perVisitQty: 1, defaultCost: "8.00" },
	{ patterns: ["артикаин", "ультракаин"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 8, perVisitQty: 1, defaultCost: "125.00" },
	{ patterns: ["игл", "игла карпульн", "иглы"], defaultName: "Иглы карпульные 0.3x21 мм", category: "Расходные материалы", unit: "шт.", qty: 8, perVisitQty: 1, defaultCost: "18.00" },
	{ patterns: ["слюноотсос"], defaultName: "Слюноотсосы одноразовые", category: "Расходные материалы", unit: "шт.", qty: 10, perVisitQty: 1, defaultCost: "7.00" },
	{ patterns: ["валик"], defaultName: "Валики ватные стоматологические", category: "Расходные материалы", unit: "шт.", qty: 40, perVisitQty: 4, defaultCost: "1.20" },
	{ patterns: ["салфетк", "нагрудн"], defaultName: "Салфетки стоматологические нагрудные", category: "Расходные материалы", unit: "шт.", qty: 10, perVisitQty: 1, defaultCost: "6.00" },
	{ patterns: ["микроаппликатор", "браш"], defaultName: "Микроаппликаторы (браши)", category: "Расходные материалы", unit: "шт.", qty: 16, perVisitQty: 2, defaultCost: "3.50" },
	{ patterns: ["композит", "пломбировочн"], defaultName: "Композитный материал светового отверждения (доза)", category: "Терапевтические материалы", unit: "доз", qty: 6, perVisitQty: 1, defaultCost: "280.00" },
	{ patterns: ["стаканчик"], defaultName: "Стаканчики пластиковые одноразовые", category: "Расходные материалы", unit: "шт.", qty: 10, perVisitQty: 1, defaultCost: "4.00" },
];
