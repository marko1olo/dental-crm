/**
 * planDraftValidation.ts — Валидация строк формы сметы плана лечения перед сохранением (DENTE CRM).
 *
 * Принципы (Мандаты 8e, 8n):
 * 1. Ни одна заполненная строка не исчезает молча при сохранении.
 * 2. Каждая ошибка точно указывает номер строки или название услуги и действие для исправления.
 * 3. Строгий запрет на сохранение строк без привязки к позиции прайса (priceId).
 * 4. Точный денежный перевод без тихих округлений трех знаков после запятой.
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	normalizeRubAmountInput,
	validateRubAmountInput,
} from "../../rubAmountInput";

/** Строка формы создания плана. */
export interface DraftPlanRow {
	/** Название услуги — из прайса или введённое руками. */
	name: string;
	/** Позиция прайса; пусто — не выбрана. */
	priceId?: string | undefined;
	/** Цена так, как её видит человек в поле ввода. */
	price: string;
	quantity: string;
	toothNumber?: number | null | undefined;
}

/** Строка сметы, готовая уйти в POST /api/patients/:id/treatment-plans. */
export interface PlanItemForApi {
	priceId: string;
	name: string;
	toothNumber: number | null;
	price: number;
	quantity: number;
}

export type DraftPlanValidation =
	| { ok: true; items: PlanItemForApi[]; totalKopecks: Kopecks }
	| { ok: false; problems: string[] };

function safeKopecks(
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

function rowLabel(row: DraftPlanRow, index: number): string {
	const name = row.name.trim();
	if (name) return `«${name}»`;
	return `строка ${index + 1}`;
}

/**
 * Проверка формы перед сохранением.
 *
 * Ни одна заполненная строка не исчезает молча: либо план сохраняется
 * целиком, либо человеку названы конкретные строки и сказано, что с ними
 * сделать.
 */
export function validateDraftPlanRows(
	rows: readonly DraftPlanRow[],
): DraftPlanValidation {
	const problems: string[] = [];
	const items: PlanItemForApi[] = [];
	const lineTotals: Kopecks[] = [];

	rows.forEach((row, index) => {
		const name = row.name.trim();
		const priceId = (row.priceId ?? "").trim();
		const price = row.price.trim();
		const isEmptyRow = !name && !priceId && !price;
		if (isEmptyRow) return;

		let rowIsValid = true;

		if (!name) {
			problems.push(`Строка ${index + 1}: не указано название услуги.`);
			rowIsValid = false;
		}

		const priceProblem = validateRubAmountInput(
			price,
			"укажите цену больше нуля",
		);
		if (priceProblem) {
			problems.push(`${rowLabel(row, index)}: ${priceProblem}.`);
			rowIsValid = false;
		}

		if (!priceId) {
			problems.push(
				`${rowLabel(row, index)}: выберите услугу из прайса. ` +
					"Сохранить строку сметы без позиции прайса сервер не может.",
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

		if (!rowIsValid) return;

		/*
		 * Разбор — тем же единственным разборщиком, что и в кассе
		 * (apps/web/src/rubAmountInput.ts): запятая и точка равноправны,
		 * разделители разрядов отбрасываются, три знака после запятой
		 * отвергаются. Своего разбора денег здесь нет намеренно.
		 */
		const amountRub = normalizeRubAmountInput(price);
		const priceKopecks = amountRub === null ? null : safeKopecks(amountRub);
		if (amountRub === null || priceKopecks === null) {
			problems.push(`${rowLabel(row, index)}: цена не читается как сумма.`);
			return;
		}

		lineTotals.push(multiplyKopecks(priceKopecks, quantity));
		items.push({
			priceId,
			name,
			toothNumber: row.toothNumber ?? null,
			price: amountRub,
			quantity,
		});
	});

	if (problems.length > 0) return { ok: false, problems };
	if (items.length === 0) {
		return {
			ok: false,
			problems: [
				"В плане нет ни одной услуги. Добавьте услугу из прайса — иначе смету не посчитать.",
			],
		};
	}
	return { ok: true, items, totalKopecks: sumKopecks(lineTotals) };
}
