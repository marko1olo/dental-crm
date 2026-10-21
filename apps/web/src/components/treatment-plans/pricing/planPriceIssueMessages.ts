/**
 * apps/web/src/components/treatment-plans/pricing/planPriceIssueMessages.ts
 *
 * Формирование сообщений для врача о причинах отсутствия цен в прайсе.
 */

import type { PlanPriceIssue, ResolvedPlanRow } from "./planSuggestionsResolver";

function toothList(numbers: readonly number[]): string {
	const sorted = [...numbers].sort((left, right) => left - right);
	return sorted.length === 1 ? `зуб ${sorted[0]}` : `зубы ${sorted.join(", ")}`;
}

export function planPriceIssueMessages(rows: readonly ResolvedPlanRow[]): string[] {
	const groups = new Map<string, { issue: PlanPriceIssue; teeth: number[] }>();
	for (const row of rows) {
		if (!row.issue) continue;
		const key = `${row.issue.kind}|${row.issue.humanName}`;
		const group = groups.get(key);
		if (group) group.teeth.push(row.toothNumber);
		else groups.set(key, { issue: row.issue, teeth: [row.toothNumber] });
	}

	const messages: string[] = [];
	for (const { issue, teeth } of groups.values()) {
		switch (issue.kind) {
			case "catalog_empty":
				messages.push("Прайс-лист пуст: в нём нет ни одной активной услуги. Заполните прайс.");
				break;
			case "not_in_catalog":
				messages.push(`«${issue.humanName}» (${toothList(teeth)}): такой услуги нет в прайсе. Добавьте её в прайс.`);
				break;
			case "ambiguous":
				messages.push(`«${issue.humanName}» (${toothList(teeth)}): в прайсе несколько подходящих услуг (${issue.matches}).`);
				break;
			case "no_rule":
				messages.push(`Состояние «${issue.humanName}» (${toothList(teeth)}) требует ручного выбора услуги.`);
				break;
		}
	}
	return messages;
}
