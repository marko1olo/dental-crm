/**
 * visitBundlePresets.ts — Layer 1: General clinical visit consumables presets.
 */

import type { UnifiedStockItemDefinition } from "../unifiedStockDeductionTypes.js";
import { getOrthopedicsVisitDefinitions } from "./orthopedicsBundlePresets.js";

export type QuickWriteoffVisitBundleType =
	| "therapy"
	| "surgery"
	| "implant"
	| "sinus_gbr"
	| "orthopedics_prep"
	| "orthopedics_impression"
	| "orthopedics_temporary"
	| "orthopedics_cementation"
	| "hygiene";

export const VISIT_BUNDLE_NAMES: Record<QuickWriteoffVisitBundleType, string> = {
	therapy: "Терапевтический прием",
	surgery: "Хирургический прием",
	implant: "Дентальная имплантация",
	sinus_gbr: "Синус-лифтинг и НКР",
	orthopedics_prep: "Препарирование под коронку (Ортопедия)",
	orthopedics_impression: "Снятие слепка/скан (Ортопедия)",
	orthopedics_temporary: "Временная коронка Luxatemp (Ортопедия)",
	orthopedics_cementation: "Постоянная фиксация (Ортопедия)",
	hygiene: "Профессиональная гигиена полости рта (Air-Flow + УЗ)",
};

export function getVisitBundleDefinitions(visitType: QuickWriteoffVisitBundleType = "therapy"): UnifiedStockItemDefinition[] {
	if (visitType.startsWith("orthopedics_")) {
		return getOrthopedicsVisitDefinitions(visitType as any);
	}
	const map: Partial<Record<QuickWriteoffVisitBundleType, UnifiedStockItemDefinition[]>> = {
		therapy: [
			{ patterns: ["артикаин", "ультракаин"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 1, defaultCost: "120.00" },
			{ patterns: ["игла карпульн"], defaultName: "Иглы карпульные 0.3x21 мм", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "18.00" },
			{ patterns: ["перчатк"], defaultName: "Перчатки смотровые нитриловые (пара)", category: "Расходные материалы", unit: "пар", qty: 2, defaultCost: "35.00" },
			{ patterns: ["слюноотсос"], defaultName: "Слюноотсосы одноразовые", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "7.00" },
			{ patterns: ["валик"], defaultName: "Валики ватные стоматологические", category: "Расходные материалы", unit: "шт.", qty: 6, defaultCost: "1.50" },
			{ patterns: ["нагрудн", "салфетк"], defaultName: "Салфетки стоматологические нагрудные", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "6.00" },
		],
		surgery: [
			{ patterns: ["артикаин", "ультракаин"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 1, defaultCost: "120.00" },
			{ patterns: ["игла карпульн"], defaultName: "Иглы карпульные 0.4x35 мм", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "20.00" },
			{ patterns: ["скальпел"], defaultName: "Скальпель хирургический одноразовый №15", category: "Хирургический инструментарий", unit: "шт.", qty: 1, defaultCost: "65.00" },
			{ patterns: ["шовн", "нить"], defaultName: "Шовный материал полигликолид 4-0 с иглой", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "220.00" },
			{ patterns: ["гемостат", "губк", "альвостаз"], defaultName: "Губка гемостатическая коллагеновая", category: "Хирургический инструментарий", unit: "шт.", qty: 1, defaultCost: "85.00" },
		],
		implant: [
			{ patterns: ["имплантат", "implant"], defaultName: "Дентальный имплантат титановый", category: "Имплантология", unit: "шт.", qty: 1, defaultCost: "14000.00" },
			{ patterns: ["формировател", "винт-заглушк"], defaultName: "Формирователь десны / винт-заглушка", category: "Имплантология", unit: "шт.", qty: 1, defaultCost: "2500.00" },
			{ patterns: ["пролен", "шовн"], defaultName: "Шовный материал Prolene 4-0", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "350.00" },
			{ patterns: ["артикаин"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 2, defaultCost: "120.00" },
			{ patterns: ["физраствор", "0.9% nacl"], defaultName: "Стерильный физиологический раствор 0.9% 500 мл", category: "Хирургический инструментарий", unit: "фл.", qty: 1, defaultCost: "90.00" },
		],
		sinus_gbr: [
			{ patterns: ["костн", "графт", "био-осс"], defaultName: "Остеопластический материал ксенографт 0.5 г", category: "Костная пластика", unit: "шт.", qty: 1, defaultCost: "12500.00" },
			{ patterns: ["мембран", "bio-gide"], defaultName: "Мембрана коллагеновая барьерная 25x25 мм", category: "Костная пластика", unit: "шт.", qty: 1, defaultCost: "14500.00" },
			{ patterns: ["пины", "пин титановый"], defaultName: "Пины титановые для фиксации мембран", category: "Костная пластика", unit: "шт.", qty: 2, defaultCost: "1200.00" },
			{ patterns: ["шовн", "пга", "vicryl"], defaultName: "Шовный материал ПГА 4-0 с иглой", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "220.00" },
			{ patterns: ["артикаин"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 2, defaultCost: "120.00" },
		],
		hygiene: [
			{ patterns: ["порошок", "air-flow", "глицин"], defaultName: "Порошок для Air-Flow KaVo PROPHYflex / EMS (глицин)", category: "Профгигиена", unit: "г", qty: 25, defaultCost: "18.00" },
			{ patterns: ["cleanic", "паста полировочн"], defaultName: "Паста полировочная Cleanic / Detartrine", category: "Профгигиена", unit: "г", qty: 3, defaultCost: "40.00" },
			{ patterns: ["щетка полировочн"], defaultName: "Щетка полировочная циркулярная нейлоновая", category: "Профгигиена", unit: "шт.", qty: 1, defaultCost: "65.00" },
			{ patterns: ["фторлак", "bifluorid"], defaultName: "Фтор-лак защитный Fluor Protector / Bifluorid 12", category: "Профгигиена", unit: "мл", qty: 0.5, defaultCost: "640.00" },
			{ patterns: ["optragate", "ретрактор"], defaultName: "Ретрактор мягкий OptraGate", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "210.00" },
			{ patterns: ["слюноотсос"], defaultName: "Слюноотсосы одноразовые", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "7.00" },
		],
	};
	return map[visitType] || map.therapy || [];
}
