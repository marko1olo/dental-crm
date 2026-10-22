import type { AcceptanceWaybillItem } from "../acceptanceWaybillsTypes.js";

/**
 * Валидация черновика приходной накладной перед проведением.
 */
export function validateWaybillDraft(waybill: {
	readonly waybillNumber: string;
	readonly receiptDate: string;
	readonly supplier: { readonly name: string; readonly inn?: string | undefined };
	readonly items: readonly AcceptanceWaybillItem[];
}): {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!waybill.waybillNumber.trim()) {
		errors.push("Укажите номер накладной");
	}
	if (!waybill.receiptDate.trim()) {
		errors.push("Укажите дату прихода");
	}
	if (!waybill.supplier.name.trim()) {
		errors.push("Укажите наименование поставщика");
	}

	if (waybill.supplier.inn) {
		const innClean = waybill.supplier.inn.trim();
		if (innClean.length > 0 && !/^\d{10}(\d{2})?$/.test(innClean)) {
			warnings.push("ИНН поставщика должен состоять из 10 (юрлицо) или 12 (ИП) цифр");
		}
	}

	if (waybill.items.length === 0) {
		errors.push("Накладная не содержит позиций для оприходования");
	}

	for (let i = 0; i < waybill.items.length; i++) {
		const item = waybill.items[i]!;
		const rowNum = i + 1;

		if (!item.name.trim()) {
			errors.push(`Строка ${rowNum}: укажите наименование материала`);
		}
		if (!item.batchNumber.trim()) {
			errors.push(`Строка ${rowNum} (${item.name || "Без названия"}): укажите номер серии / партии`);
		}
		if (!item.expirationDate.trim()) {
			errors.push(`Строка ${rowNum} (${item.name || "Без названия"}): укажите срок годности`);
		} else if (item.fefoStatus === "expired") {
			errors.push(`Строка ${rowNum} (${item.name}): срок годности (${item.expirationDate}) истек. Оприходование просроченных медикаментов запрещено`);
		} else if (item.fefoStatus === "critical") {
			warnings.push(`Строка ${rowNum} (${item.name}): критический остаточный срок (${item.daysUntilExpiration} дн., требуется приоритетное списание FEFO)`);
		}

		if (item.quantity <= 0) {
			errors.push(`Строка ${rowNum} (${item.name}): количество должно быть больше нуля`);
		}
		if (item.unitPriceKopecks < 0) {
			errors.push(`Строка ${rowNum} (${item.name}): цена не может быть отрицательной`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}
