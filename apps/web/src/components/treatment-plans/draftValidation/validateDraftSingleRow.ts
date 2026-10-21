/**
 * validateDraftSingleRow.ts — Валидация одной строки сметы плана лечения (DENTE CRM).
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
} from "@dental/shared";
import {
	normalizeRubAmountInput,
	validateRubAmountInput,
} from "../../../rubAmountInput.js";
import type { DraftPlanRow, PlanItemForApi } from "./planDraftTypes.js";

export function safeKopecks(
	value: number | string | null | undefined,
): Kopecks | null {
	if (value === null || value === undefined || value === "") return 0;
	if (typeof value === "number" && !Number.isFinite(value)) return null;
	try {
		return parseKopecks(value);
	} catch {
		return null;
	}
}

export function rowLabel(row: DraftPlanRow, index: number): string {
	const name = row.name.trim();
	if (name) return `«${name}»`;
	return `строка ${index + 1}`;
}

export interface SingleRowValidationResult {
	readonly isEmpty: boolean;
	readonly problems: string[];
	readonly item?: PlanItemForApi | undefined;
	readonly lineTotalKopecks?: Kopecks | undefined;
}

export function validateDraftSingleRow(
	row: DraftPlanRow,
	index: number,
): SingleRowValidationResult {
	const name = row.name.trim();
	const priceId = (row.priceId ?? "").trim();
	const price = row.price.trim();
	const isEmpty = !name && !priceId && !price;
	if (isEmpty) return { isEmpty: true, problems: [] };

	const problems: string[] = [];
	let rowIsValid = true;

	if (!name) {
		problems.push(`Строка ${index + 1}: не указано название услуги.`);
		rowIsValid = false;
	}

	const priceProblem = validateRubAmountInput(price, "укажите цену больше нуля");
	if (priceProblem) {
		problems.push(`${rowLabel(row, index)}: ${priceProblem}.`);
		rowIsValid = false;
	}

	if (!priceId) {
		problems.push(
			`${rowLabel(row, index)}: выберите услугу из прайса. Сохранить строку сметы без позиции прайса сервер не может.`,
		);
		rowIsValid = false;
	}

	const quantity = Number.parseInt(row.quantity, 10);
	if (!Number.isInteger(quantity) || quantity < 1) {
		problems.push(
			`${rowLabel(row, index)}: количество указывается целым числом от 1.`,
		);
		rowIsValid = false;
	}

	if (!rowIsValid) return { isEmpty: false, problems };

	const amountRub = normalizeRubAmountInput(price);
	const priceKopecks = amountRub === null ? null : safeKopecks(amountRub);
	if (amountRub === null || priceKopecks === null) {
		problems.push(`${rowLabel(row, index)}: цена не читается как сумма.`);
		return { isEmpty: false, problems };
	}

	return {
		isEmpty: false,
		problems: [],
		item: {
			priceId,
			name,
			toothNumber: row.toothNumber ?? null,
			price: amountRub,
			quantity,
		},
		lineTotalKopecks: multiplyKopecks(priceKopecks, quantity),
	};
}
