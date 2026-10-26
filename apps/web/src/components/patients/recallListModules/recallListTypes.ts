/**
 * recallListTypes.ts
 * Types and band constants for Patient Recall List Panel.
 * Governed by Mandate 8b (Strict <= 120 lines).
 */

import type { RecallBand, RecallCandidate, RecallReport } from "@dental/shared";

export const BAND_TITLES: Record<RecallBand, string> = {
	due: "Пора на профилактику",
	overdue: "Пропустил осмотр",
	never_arrived: "Не дошёл ни разу",
	probably_lost: "Скорее всего ушёл",
};

export const INVITABLE: RecallBand[] = ["due", "overdue"];

export const NOT_INVITABLE_REASON: Record<string, string> = {
	probably_lost: "Приглашение не предлагается: прошло больше двух лет, такое сообщение читается как спам.",
	never_arrived: "Приглашение не предлагается: сначала стоит позвонить и выяснить, почему не дошёл.",
};

export interface RecallListState {
	report: RecallReport | null;
	error: string | null;
	notice: string | null;
	busyPatient: string | null;
	called: Set<string>;
	activeBand: RecallBand | null;
	displayLimit: number;
}
