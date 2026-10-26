/**
 * consumables.ts — Фильтрация микро-расходников в планах лечения и презентациях (@dental/shared).
 *
 * Mandate 8e / Section VII: Чистая презентация для пациента (автоматическое сокрытие микро-расходников).
 * Копеечные расходники (валики, салфетки, перчатки, нагрудники, слюноотсосы) скрываются из пациентских смет,
 * но сохраняются в фоновой техкарте списания склада (BOM).
 */

export interface ConsumableItemLike {
	readonly name?: string | undefined;
	readonly category?: string | undefined;
	readonly serviceCode?: string | undefined;
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
 * Возвращает true, если элемент плана является вспомогательным микро-расходником,
 * который должен быть скрыт из пациентской презентации, но сохранен в складском списании (BOM).
 */
export function isMicroConsumable(item: ConsumableItemLike): boolean {
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
