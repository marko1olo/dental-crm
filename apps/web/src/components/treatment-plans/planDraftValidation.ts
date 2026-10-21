/**
 * planDraftValidation.ts — Валидация строк формы сметы плана лечения перед сохранением (DENTE CRM).
 *
 * Принципы (Мандаты 8e, 8n):
 * 1. Ни одна заполненная строка не исчезает молча при сохранении.
 * 2. Каждая ошибка точно указывает номер строки или название услуги и действие для исправления.
 * 3. Строгий запрет на сохранение строк без привязки к позиции прайса (priceId).
 * 4. Точный денежный перевод без тихих округлений трех знаков после запятой.
 */

import { type Kopecks, sumKopecks } from "@dental/shared";
import type {
	DraftPlanRow,
	DraftPlanValidation,
	PlanItemForApi,
} from "./draftValidation/planDraftTypes.js";
import { validateDraftSingleRow } from "./draftValidation/validateDraftSingleRow.js";

export * from "./draftValidation/planDraftTypes.js";
export { safeKopecks, rowLabel } from "./draftValidation/validateDraftSingleRow.js";

/**
 * Проверка формы перед сохранением.
 *
 * Ни одна заполненная строка не исчезает молча: либо план сохраняется
 * целиком, либо человеку названы конкретные строки и сказано, что с ними сделать.
 */
export function validateDraftPlanRows(
	rows: readonly DraftPlanRow[],
): DraftPlanValidation {
	const problems: string[] = [];
	const items: PlanItemForApi[] = [];
	const lineTotals: Kopecks[] = [];

	rows.forEach((row, index) => {
		const result = validateDraftSingleRow(row, index);
		if (result.isEmpty) return;

		if (result.problems.length > 0) {
			problems.push(...result.problems);
			return;
		}

		if (result.item && result.lineTotalKopecks !== undefined) {
			items.push(result.item);
			lineTotals.push(result.lineTotalKopecks);
		}
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
