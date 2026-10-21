/**
 * planDraftTypes.ts — Типы валидации строк формы сметы плана лечения (DENTE CRM).
 */

import type { Kopecks } from "@dental/shared";

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
