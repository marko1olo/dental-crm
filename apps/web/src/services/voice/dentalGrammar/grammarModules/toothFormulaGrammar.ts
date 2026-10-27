/**
 * toothFormulaGrammar.ts — Распознавание команд переключения квадрантов и зубной формулы
 */

import type { OdontogramQuadrantId } from "../../../components/odontogram/ToothChart";

export function extractQuadrantIntent(text: string): OdontogramQuadrantId | null {
	if (!text) return null;
	const lower = text.toLowerCase().trim();

	if (
		lower.includes("все зубы") ||
		lower.includes("вся челюсть") ||
		lower.includes("все квадранты") ||
		lower.includes("полная формула") ||
		lower.includes("вся формула") ||
		lower.includes("общий вид") ||
		lower.includes("сброс квадрант") ||
		lower.includes("сброс") ||
		lower.includes("показать все") ||
		lower.includes("вся дуга")
	) {
		return "all";
	}

	if (
		lower.includes("первый квадрант") ||
		lower.includes("1-й квадрант") ||
		lower.includes("1 квадрант") ||
		lower.includes("квадрант 1") ||
		lower.includes("верх право") ||
		lower.includes("верхний правый") ||
		lower.includes("верхняя челюсть справа") ||
		lower.includes("вверх справа") ||
		/(?:^|[^a-zа-я0-9])(?:q1|к1|q-1|к-1)(?:$|[^a-zа-я0-9])/i.test(lower)
	) {
		return "Q1";
	}
	if (
		lower.includes("второй квадрант") ||
		lower.includes("2-й квадрант") ||
		lower.includes("2 квадрант") ||
		lower.includes("квадрант 2") ||
		lower.includes("верх лево") ||
		lower.includes("верхний левый") ||
		lower.includes("верхняя челюсть слева") ||
		lower.includes("вверх слева") ||
		/(?:^|[^a-zа-я0-9])(?:q2|к2|q-2|к-2)(?:$|[^a-zа-я0-9])/i.test(lower)
	) {
		return "Q2";
	}
	if (
		lower.includes("третий квадрант") ||
		lower.includes("3-й квадрант") ||
		lower.includes("3 квадрант") ||
		lower.includes("квадрант 3") ||
		lower.includes("низ лево") ||
		lower.includes("нижний левый") ||
		lower.includes("нижняя челюсть слева") ||
		lower.includes("снизу слева") ||
		/(?:^|[^a-zа-я0-9])(?:q3|к3|q-3|к-3)(?:$|[^a-zа-я0-9])/i.test(lower)
	) {
		return "Q3";
	}
	if (
		lower.includes("четвертый квадрант") ||
		lower.includes("4-й квадрант") ||
		lower.includes("4 квадрант") ||
		lower.includes("квадрант 4") ||
		lower.includes("низ право") ||
		lower.includes("нижний правый") ||
		lower.includes("нижняя челюсть справа") ||
		lower.includes("снизу справа") ||
		/(?:^|[^a-zа-я0-9])(?:q4|к4|q-4|к-4)(?:$|[^a-zа-я0-9])/i.test(lower)
	) {
		return "Q4";
	}
	return null;
}
