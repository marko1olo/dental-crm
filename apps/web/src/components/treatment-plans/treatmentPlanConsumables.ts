/**
 * treatmentPlanConsumables.ts — фильтрация микро-расходников в презентациях планов лечения.
 *
 * Mandate 8e / Section VII: Чистый показ пациенту (скрывать микро-расходники).
 */

export interface PlanItemLike {
	readonly name?: string | undefined;
	readonly category?: string | undefined;
	readonly code804n?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly unitPriceRub?: number | undefined;
}

export const CONSUMABLE_PATTERNS: readonly RegExp[] = [
	/валик/i,
	/салфетк/i,
	/перчатк/i,
	/слюноотсос/i,
	/шприц/i,
	/бахил/i,
	/маск[а-я]*/i,
	/микробраш/i,
	/брашик/i,
	/аппликатор.*браш/i,
	/нагрудник/i,
	/стаканчик/i,
	/канюл/i,
	/ватн.*шарик/i,
	/ватн.*тампон/i,
	/ватн.*валик/i,
	/тампон/i,
	/лоток.*одноразов/i,
	/игла.*карпульн/i,
	/игла.*одноразов/i,
	/карпул/i,
	/дезинфекц/i,
	/антисептик/i,
	/простын.*одноразов/i,
	/коффердам.*завеса/i,
	/индивидуальный гигиенический набор/i,
	/асептический комплект/i,
	/индивидуальный.*набор/i,
	/расходные материалы/i,
	/одноразовый комплект/i,
	/насадк.*одноразов/i,
	/чехол.*одноразов/i,
	/позиционер.*чехол/i,
];

/**
 * Returns true if the plan item is a minor consumable that should be hidden by default in patient presentations.
 */
export function isMicroConsumable(item: PlanItemLike): boolean {
	const name = item.name ?? "";
	if (!name) return false;

	const nameMatches = CONSUMABLE_PATTERNS.some((pattern) => pattern.test(name));
	const category = (item.category ?? "").toLowerCase();
	const isConsumableCategory =
		category.includes("расходн") || category.includes("сиз") || category.includes("материал");
	const price = item.priceRub ?? item.unitPriceRub ?? 0;

	if (nameMatches) {
		return price <= 500 || price === 0;
	}

	return isConsumableCategory && price > 0 && price <= 350;
}
