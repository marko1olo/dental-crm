export interface InventoryItem {
	id: string;
	name: string;
	stockQuantity: number;
	criticalThreshold: number;
	unitCostRub: string;
	updatedAt: string;
	unit?: string;
	unitOfMeasure?: string;
	sku?: string;
	barcode?: string;
	expirationDate?: string;
	lotNumber?: string;
	category?: string;
	supplier?: string;
}

/** Календарный день значения даты по местному времени, в виде «ГГГГ-ММ-ДД». */
export function localDayOf(value: string): string {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
	const month = String(parsed.getMonth() + 1).padStart(2, "0");
	const day = String(parsed.getDate()).padStart(2, "0");
	return `${parsed.getFullYear()}-${month}-${day}`;
}

/**
 * Приведение строки склада, пришедшей с сервера, к обещанному виду.
 *
 * Тип InventoryItem объявляет stockQuantity и criticalThreshold числами, а
 * сервер присылает их СТРОКАМИ: колонки объявлены numeric без mode "number", и
 * drizzle гонит значение через String(). Компилятор об этом не знает, потому
 * что ответ раскладывался в состояние без разбора — `Array.isArray(data)`, и
 * готово.
 */
export function inventoryItemFromServer(raw: unknown): InventoryItem {
	const row = (raw ?? {}) as Record<string, unknown>;
	const asNumber = (value: unknown) => {
		const parsed = typeof value === "number" ? value : Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	};
	/*
	 * Необязательные поля собираются через локальные строки, а не через функцию,
	 * возвращающую `string | undefined`: при exactOptionalPropertyTypes значение
	 * `undefined` не подходит свойству, объявленному как `sku?: string`.
	 */
	const asText = (value: unknown) =>
		typeof value === "string" ? value.trim() : "";
	const sku = asText(row.sku);
	const barcode = asText(row.barcode);
	const lotNumber = asText(row.lotNumber);
	const expiration = asText(row.expirationDate);
	const category = asText(row.category);
	const supplier = asText(row.supplier);
	const unit = asText(row.unit || row.unitOfMeasure);
	return {
		id: String(row.id ?? ""),
		name: typeof row.name === "string" ? row.name : "",
		stockQuantity: asNumber(row.stockQuantity),
		criticalThreshold: asNumber(row.criticalThreshold),
		// Цена остаётся строкой: так объявлен тип, и её везде читают через Number().
		unitCostRub:
			row.unitCostRub !== null && row.unitCostRub !== undefined
				? String(row.unitCostRub)
				: row.unitCostKopecks !== null && row.unitCostKopecks !== undefined
				? String(Number(row.unitCostKopecks) / 100)
				: "0",
		updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : "",
		...(unit ? { unit } : {}),
		...(sku ? { sku } : {}),
		...(barcode ? { barcode } : {}),
		...(lotNumber ? { lotNumber } : {}),
		...(category ? { category } : {}),
		...(supplier ? { supplier } : {}),
		/*
		 * Срок годности приводим к «ГГГГ-ММ-ДД» по местному дню.
		 *
		 * Колонка date часового пояса не несёт, но сервер отдаёт её строкой ISO с
		 * временем; взять первые десять знаков напрямую нельзя — при отрицательном
		 * смещении часового пояса дата уехала бы на сутки назад.
		 */
		...(expiration ? { expirationDate: localDayOf(expiration) } : {}),
	};
}
