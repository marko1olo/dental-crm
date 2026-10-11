import { kopecksToNumericString } from "@dental/shared";
import { money } from "../../AppHelpers";
import type { PanelSubject } from "../../lib/panelStateText";
import type { ToothData } from "./ToothChart";
import type { PlanItem } from "./treatmentEstimatorPricing";

export interface EstimatorProps {
	patientId: string;
	currentTeeth: ToothData[];
}

export interface SavedTreatmentPlan {
	id: string;
	name: string;
	totalPrice: number;
	patientSignature?: string | null;
	items: PlanItem[];
}

export function rub(kopecks: number): string {
	return money(kopecksToNumericString(kopecks));
}

export type PlanLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "ready" }
	| { readonly phase: "failed"; readonly status: number | null };

export const PLAN_SUBJECT: PanelSubject = {
	notLoadedTitle: "Позиции плана лечения не загружены",
	accusative: "план лечения",
	emptyTitle: "План лечения пуст",
	emptyHint:
		"Выберите зуб на зубной формуле слева, укажите клинический статус, и система автоматически сформирует смету из прайс-листа",
	failureConsequence:
		"Не считайте, что плана нет: он не прочитан. Сохранение и подписание отключены — иначе рядом с сохранённым планом появится второй, а подпись пациента останется у старого.",
};

export function jsonObjectOrNull(rawBody: string): Record<string, unknown> | null {
	const trimmed = rawBody.trim();
	if (!trimmed) return null;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return typeof parsed === "object" &&
			parsed !== null &&
			!Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}
