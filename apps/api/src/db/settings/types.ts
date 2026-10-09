import type { UiPreferences } from "@dental/shared";
import type {
	UpdateChairProfileInput,
	UpdateStaffMemberProfileInput,
} from "../../sampleData.js";

export type { UpdateChairProfileInput, UpdateStaffMemberProfileInput };

export function useInMemory(): boolean {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

export type UiPreferencesSaveOutcome = {
	/** Легла ли присланная копия в хранилище. */
	applied: boolean;
	/** Что лежит в хранилище ПОСЛЕ вызова — присланное либо то, чем его перебили. */
	stored: UiPreferences;
};

/**
 * Сохранение проиграло сверку прежнего значения все попытки подряд. Отдельный
 * класс от устаревшей копии: причина другая (записывали одновременно, а не
 * раньше), а действие оператора то же — перечитать настройки и повторить правку.
 * Маршрут различает их текстом отказа.
 */
export class UiPreferencesConcurrentSaveError extends Error {
	constructor() {
		super(
			"Настройки рабочего места не сохранены: значение меняли одновременно из нескольких окон.",
		);
		this.name = "UiPreferencesConcurrentSaveError";
	}
}

/**
 * Ставка врача — процент от кассы, по которому клиника платит за лечение.
 *
 * Хранится в doctor_commissions. Расчёт выплат
 * (services/finance/doctorPayouts.ts) читает её ТОЛЬКО из колонки
 * commission_pct и ТОЛЬКО по user_id: соединение по doctor_id дало бы пустоту
 * всегда, потому что ту колонку не пишет никто.
 */
export interface DoctorCommissionRate {
	userId: string;
	commissionPct: string;
	materialCostDeductionPct: string;
	effectiveFrom: string;
}
