/**
 * antishockPresets.ts — Layer 1: Statutory emergency antishock kit definitions (Order 786n).
 */

import type { UnifiedStockItemDefinition } from "../unifiedStockDeductionTypes.js";

export function getStatutoryAntishockDefinitions(): UnifiedStockItemDefinition[] {
	return [
		{ patterns: ["адреналин", "эпинефрин", "adrenaline"], defaultName: "Адреналин 0.1% (Эпинефрин) 1 мг/мл", category: "Неотложная помощь", unit: "амп.", qty: 2, defaultCost: "95.00" },
		{ patterns: ["преднизолон", "prednisolone"], defaultName: "Преднизолон 30 мг/мл (ампулы 1 мл)", category: "Неотложная помощь", unit: "амп.", qty: 3, defaultCost: "140.00" },
		{ patterns: ["супрастин", "хлоропирамин"], defaultName: "Супрастин 2% (20 мг/мл, 1 мл)", category: "Неотложная помощь", unit: "амп.", qty: 2, defaultCost: "80.00" },
		{ patterns: ["физраствор", "0.9% nacl"], defaultName: "Натрия хлорид 0.9% 500 мл (физраствор)", category: "Неотложная помощь", unit: "фл.", qty: 1, defaultCost: "90.00" },
		{ patterns: ["шприц", "syringe"], defaultName: "Шприцы стерильные одноразовые 2 мл / 5 мл", category: "Расходные материалы", unit: "шт.", qty: 4, defaultCost: "15.00" },
		{ patterns: ["перчатк", "gloves"], defaultName: "Перчатки смотровые нитриловые (пара)", category: "Расходные материалы", unit: "пар", qty: 2, defaultCost: "35.00" },
		{ patterns: ["салфетк", "спиртов"], defaultName: "Салфетки спиртовые инъекционные", category: "Расходные материалы", unit: "шт.", qty: 6, defaultCost: "5.00" },
	];
}

export const getAntishockKitDefinitions = getStatutoryAntishockDefinitions;
