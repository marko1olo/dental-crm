import {
	formatInventoryUnitRu,
	normalizeInventoryUnit,
} from "@dental/shared";
import { pluralizeRussian } from "../../../lib/russianPlural.js";

export { pluralizeRussian };

/**
 * Русское склонение единицы измерения в зависимости от количества
 */
export function declineUnitRu(quantity: number, unit: string): string {
	if (!unit) return "";
	const clean = unit.trim().toLowerCase();

	if (clean === "пары" || clean === "пара" || clean === "пар") {
		return pluralizeRussian(quantity, "пара", "пары", "пар");
	}
	if (clean === "штука" || clean === "штуки" || clean === "штук") {
		return pluralizeRussian(quantity, "штука", "штуки", "штук");
	}
	if (clean === "доза" || clean === "дозы" || clean === "доз") {
		return pluralizeRussian(quantity, "доза", "дозы", "доз");
	}
	if (clean === "карпула" || clean === "карпулы" || clean === "карпул") {
		return pluralizeRussian(quantity, "карпула", "карпулы", "карпул");
	}
	if (clean === "упаковка" || clean === "упаковки" || clean === "упаковок") {
		return pluralizeRussian(quantity, "упаковка", "упаковки", "упаковок");
	}
	if (clean === "комплект" || clean === "комплекта" || clean === "комплектов") {
		return pluralizeRussian(quantity, "комплект", "комплекта", "комплектов");
	}
	if (clean === "тюбик" || clean === "тюбика" || clean === "тюбиков") {
		return pluralizeRussian(quantity, "тюбик", "тюбика", "тюбиков");
	}

	return unit.trim();
}

/**
 * Форматирование числа и единицы с правильным русским склонением
 */
export function formatQuantityWithUnitRu(quantity: number, unit: string): string {
	const declined = declineUnitRu(quantity, unit);
	return `${quantity} ${declined}`.trim();
}

/**
 * Единичная форма единицы измерения для корректного вывода цен (цена за единицу)
 */
export function formatUnitPriceUnitRu(unit: string): string {
	if (!unit) return "";
	const canonical = normalizeInventoryUnit(unit);
	if (canonical === "pair") return "пара";
	if (canonical === "dose") return "доза";
	return formatInventoryUnitRu(unit);
}
