/**
 * orthopedicsBundlePresets.ts — Layer 1: Orthopedic visit consumables presets.
 */

import type { UnifiedStockItemDefinition } from "../unifiedStockDeductionTypes.js";

export function getOrthopedicsVisitDefinitions(
	visitType: "orthopedics_prep" | "orthopedics_impression" | "orthopedics_temporary" | "orthopedics_cementation",
): UnifiedStockItemDefinition[] {
	if (visitType === "orthopedics_prep") {
		return [
			{ patterns: ["ретракцион", "нить"], defaultName: "Нить ретракционная Ultrapak #00", category: "Расходные материалы", unit: "уп.", qty: 1, defaultCost: "850.00" },
			{ patterns: ["а-силикон", "слепочн"], defaultName: "А-силикон база + корректор (Express XT)", category: "Слепочные материалы", unit: "компл.", qty: 1, defaultCost: "1600.00" },
			{ patterns: ["канюл", "смесительн"], defaultName: "Канюли смесительные для А-силикона", category: "Расходные материалы", unit: "шт.", qty: 2, defaultCost: "45.00" },
			{ patterns: ["артикаин", "анестетик"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 1, defaultCost: "120.00" },
			{ patterns: ["игла карпульн"], defaultName: "Иглы карпульные 0.3x21 мм", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "18.00" },
			{ patterns: ["protemp", "luxatemp", "временн"], defaultName: "Бис-акриловый композит Protemp 4 / Luxatemp", category: "Ортопедические материалы", unit: "доза", qty: 1, defaultCost: "450.00" },
			{ patterns: ["temp-bond", "временный цемент"], defaultName: "Цемент временный Temp-Bond NE", category: "Ортопедические материалы", unit: "доза", qty: 1, defaultCost: "180.00" },
		];
	}
	if (visitType === "orthopedics_impression") {
		return [
			{ patterns: ["а-силикон", "elite hd"], defaultName: "А-силикон Elite HD+ / Express XT", category: "Слепочные материалы", unit: "компл.", qty: 1, defaultCost: "1600.00" },
			{ patterns: ["альгинат", "hydrogum"], defaultName: "Альгинатная слепочная масса Hydrogum / Phase Plus", category: "Слепочные материалы", unit: "порция", qty: 1, defaultCost: "320.00" },
			{ patterns: ["скан-спрей"], defaultName: "Интраоральный скан-спрей 3D", category: "Расходные материалы", unit: "доза", qty: 1, defaultCost: "150.00" },
			{ patterns: ["канюл", "смесительн"], defaultName: "Канюли смесительные с насадками", category: "Расходные материалы", unit: "шт.", qty: 2, defaultCost: "45.00" },
			{ patterns: ["окклюзион", "futar"], defaultName: "Окклюзионный силикон для регистрации прикуса", category: "Слепочные материалы", unit: "доза", qty: 1, defaultCost: "350.00" },
			{ patterns: ["ложк", "слепочн"], defaultName: "Ложка слепочная перфорированная", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "60.00" },
		];
	}
	if (visitType === "orthopedics_temporary") {
		return [
			{ patterns: ["luxatemp", "protemp"], defaultName: "Бис-акриловый композит Luxatemp Star / Protemp 4", category: "Ортопедические материалы", unit: "доза", qty: 1, defaultCost: "450.00" },
			{ patterns: ["канюл", "смесительн"], defaultName: "Смесительные канюли для композита 1:10", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "50.00" },
			{ patterns: ["temp-bond"], defaultName: "Цемент временный Temp-Bond NE", category: "Ортопедические материалы", unit: "доза", qty: 1, defaultCost: "180.00" },
			{ patterns: ["диск", "sof-lex"], defaultName: "Диски полировочные Sof-Lex", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "65.00" },
		];
	}
	return [
		{ patterns: ["relyx", "panavia", "fuji"], defaultName: "Композитный цемент RelyX U200 / Panavia V5", category: "Ортопедические материалы", unit: "доза", qty: 1, defaultCost: "650.00" },
		{ patterns: ["monobond", "праймер"], defaultName: "Праймер керамики Monobond Plus", category: "Ортопедические материалы", unit: "доза", qty: 1, defaultCost: "250.00" },
		{ patterns: ["пескоструй", "cojet"], defaultName: "Оксид алюминия 50 мкм для пескоструйной обработки", category: "Ортопедические материалы", unit: "порция", qty: 1, defaultCost: "120.00" },
		{ patterns: ["ретракцион", "нить"], defaultName: "Нить ретракционная Ultrapak #000", category: "Расходные материалы", unit: "уп.", qty: 1, defaultCost: "850.00" },
		{ patterns: ["liquid strip", "глицерин"], defaultName: "Глицериновый гель Liquid Strip / Oxyguard", category: "Ортопедические материалы", unit: "доза", qty: 1, defaultCost: "90.00" },
	];
}
