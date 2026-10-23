import type { Tag1054OperationType } from "./types.js";

/** Helper to map FFD 1.2 Tag 1054 operation types accurately */
export function resolveTag1054(operationType: Tag1054OperationType): number {
	switch (operationType) {
		case "income":
			return 1;
		case "income_return":
			return 2;
		case "expense":
			return 3;
		case "expense_return":
			return 4;
	}
}

/** Helper to map FFD 1.2 Tag 1212 payment subject */
export function resolveTag1212(subject: string): number {
	switch (subject) {
		case "commodity":
			return 1;
		case "job":
			return 3;
		case "service":
			return 4;
		case "payment":
			return 10;
		case "composite":
			return 11;
		case "other":
			return 12;
		case "excisable_goods_without_marking":
			return 30;
		case "excisable_goods_with_marking":
			return 31;
		case "goods_with_marking":
			return 32;
		case "goods_without_marking":
			return 33;
		default:
			return 4;
	}
}

/** Helper to map FFD 1.2 Tag 1214 payment method */
export function resolveTag1214(method: string): number {
	switch (method) {
		case "full_prepayment":
			return 1;
		case "prepayment":
			return 2;
		case "advance":
			return 3;
		case "full_payment":
			return 4;
		case "partial_payment_and_credit":
			return 5;
		case "credit_handover":
			return 6;
		case "credit_payment":
			return 7;
		default:
			return 4;
	}
}

/** Helper to map FFD 1.2 Tag 1199 VAT rate */
export function resolveTag1199(vatRate: string): number {
	switch (vatRate) {
		case "vat_20":
			return 1;
		case "vat_10":
			return 2;
		case "vat_20_120":
			return 3;
		case "vat_10_110":
			return 4;
		case "vat_0":
			return 5;
		default:
			return 6; // Без НДС — ст. 149 п. 2 пп. 2 НК РФ
	}
}

/** Helper to map FFD 1.2 Tag 2108 Measure of quantity */
export function resolveTag2108(measure: string): number {
	switch (measure) {
		case "piece":
			return 0; // 0 = шт / ед
		case "gram":
			return 10; // 10 = г
		case "kilogram":
			return 11; // 11 = кг
		case "other":
			return 255; // 255 = иное
		default:
			return 0;
	}
}

/** Helper to map FFD 1.2 Tag 1055 Taxation system (СНО) */
export function resolveTag1055(taxation: string): number {
	switch (taxation) {
		case "osn":
			return 1; // 1 = ОСН
		case "usn_income":
			return 2; // 2 = УСН Доходы
		case "usn_income_expense":
			return 4; // 4 = УСН Доходы минус расходы
		case "esxn":
			return 8; // 8 = ЕСХН
		case "psn":
			return 16; // 16 = Патент (ПСН)
		default:
			return 2;
	}
}
