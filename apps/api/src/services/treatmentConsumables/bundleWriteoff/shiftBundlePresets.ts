/**
 * shiftBundlePresets.ts — Layer 1: Standard shift bundle presets for therapy, orthopedics, and surgery.
 */

import type { UnifiedStockItemDefinition } from "../unifiedStockDeductionTypes.js";

export type ShiftBundleType = "therapy" | "orthopedics" | "surgery";

export const SHIFT_BUNDLE_NAMES: Record<ShiftBundleType, string> = {
	therapy: "Терапия",
	orthopedics: "Ортопедия",
	surgery: "Хирургия",
};

export function getShiftBundleDefinitions(bundleType: ShiftBundleType = "therapy"): UnifiedStockItemDefinition[] {
	const map: Record<ShiftBundleType, UnifiedStockItemDefinition[]> = {
		therapy: [
			{ patterns: ["перчатк"], defaultName: "Перчатки смотровые нитриловые (пара)", category: "Расходные материалы", unit: "пар", qty: 10, defaultCost: "35.00" },
			{ patterns: ["маск"], defaultName: "Маски трехслойные медицинские", category: "Расходные материалы", unit: "шт.", qty: 10, defaultCost: "8.00" },
			{ patterns: ["салфетк", "нагрудн"], defaultName: "Салфетки стоматологические нагрудные", category: "Расходные материалы", unit: "шт.", qty: 10, defaultCost: "6.00" },
			{ patterns: ["слюноотсос"], defaultName: "Слюноотсосы одноразовые", category: "Расходные материалы", unit: "шт.", qty: 10, defaultCost: "7.00" },
			{ patterns: ["стаканчик"], defaultName: "Стаканчики пластиковые одноразовые", category: "Расходные материалы", unit: "шт.", qty: 10, defaultCost: "4.00" },
			{ patterns: ["валик"], defaultName: "Валики ватные стоматологические", category: "Расходные материалы", unit: "шт.", qty: 50, defaultCost: "1.20" },
			{ patterns: ["микроаппликатор", "браш"], defaultName: "Микроаппликаторы (браши)", category: "Расходные материалы", unit: "шт.", qty: 20, defaultCost: "3.50" },
			{ patterns: ["игла карпульн"], defaultName: "Иглы карпульные 0.3x21 мм", category: "Расходные материалы", unit: "шт.", qty: 5, defaultCost: "18.00" },
			{ patterns: ["артикаин", "ультракаин"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 5, defaultCost: "120.00" },
		],
		orthopedics: [
			{ patterns: ["перчатк"], defaultName: "Перчатки смотровые нитриловые (пара)", category: "Расходные материалы", unit: "пар", qty: 8, defaultCost: "35.00" },
			{ patterns: ["маск"], defaultName: "Маски трехслойные медицинские", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "8.00" },
			{ patterns: ["салфетк", "нагрудн"], defaultName: "Салфетки стоматологические нагрудные", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "6.00" },
			{ patterns: ["слюноотсос"], defaultName: "Слюноотсосы одноразовые", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "7.00" },
			{ patterns: ["стаканчик"], defaultName: "Стаканчики пластиковые одноразовые", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "4.00" },
			{ patterns: ["канюл", "смесительн"], defaultName: "Канюли смесительные для А-силикона", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "45.00" },
			{ patterns: ["ложк", "слепочн"], defaultName: "Ложки слепочные перфорированные (комплект)", category: "Расходные материалы", unit: "шт.", qty: 4, defaultCost: "60.00" },
			{ patterns: ["ретракцион", "нить"], defaultName: "Нить ретракционная Ultrapak #00", category: "Расходные материалы", unit: "уп.", qty: 1, defaultCost: "850.00" },
		],
		surgery: [
			{ patterns: ["стерильн", "перчатк"], defaultName: "Перчатки стерильные хирургические (пара)", category: "Расходные материалы", unit: "пар", qty: 6, defaultCost: "75.00" },
			{ patterns: ["маск"], defaultName: "Маски трехслойные медицинские", category: "Расходные материалы", unit: "шт.", qty: 6, defaultCost: "8.00" },
			{ patterns: ["марлев", "салфетк"], defaultName: "Салфетки марлевые стерильные 16x14 см", category: "Перевязочные средства", unit: "шт.", qty: 20, defaultCost: "5.00" },
			{ patterns: ["простын", "покрыти"], defaultName: "Простыни хирургические стерильные", category: "Расходные материалы", unit: "шт.", qty: 6, defaultCost: "95.00" },
			{ patterns: ["скальпел"], defaultName: "Скальпель хирургический одноразовый №15", category: "Хирургический инструментарий", unit: "шт.", qty: 3, defaultCost: "65.00" },
			{ patterns: ["шовн", "нить"], defaultName: "Шовный материал полигликолид 4-0 с иглой", category: "Шовный материал", unit: "шт.", qty: 3, defaultCost: "220.00" },
			{ patterns: ["артикаин", "ультракаин"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 6, defaultCost: "120.00" },
			{ patterns: ["игла карпульн"], defaultName: "Иглы карпульные 0.4x35 мм", category: "Расходные материалы", unit: "шт.", qty: 6, defaultCost: "20.00" },
		],
	};
	return map[bundleType] || map.therapy;
}
