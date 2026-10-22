/**
 * RETROACTIVE DISINFECTION MATCHER (Layer 1)
 */

import {
	AUTOCLAVE_REGIME_PRESETS,
	STATUTORY_CLINIC_CABINETS,
} from "./retroactiveDisinfectionPresets.js";
import {
	calculatePeriodDateRange,
	RUSSIAN_DAYS_OF_WEEK,
} from "./retroactiveDateRange.js";
import type { AutoclaveRegimeConfig } from "./types.js";

export {
	AUTOCLAVE_REGIME_PRESETS,
	STATUTORY_CLINIC_CABINETS,
	calculatePeriodDateRange,
	RUSSIAN_DAYS_OF_WEEK,
};

export function matchDisinfectantForCleaning(isGeneralCleaningDay: boolean): {
	cleaningTypeRu: string;
	cleaningDisinfectant: string;
} {
	if (isGeneralCleaningDay) {
		return {
			cleaningTypeRu: "Генеральная уборка (еженедельная)",
			cleaningDisinfectant: "Аламинол 3.0% (экспозиция 60 мин + УФ 120 мин)",
		};
	}
	return {
		cleaningTypeRu: "Текущая дезинфекция 2-кратная",
		cleaningDisinfectant: "Оптимакс Про 1.5% + Бациллол АФ 3 мин",
	};
}

export function matchPsoDetergent(): string {
	return "Биолот 0.5% + Аламинол 1.5%";
}

export function resolveAutoclaveRegime(
	regimeId: AutoclaveRegimeConfig["id"],
): AutoclaveRegimeConfig {
	return (
		AUTOCLAVE_REGIME_PRESETS.find((r) => r.id === regimeId) ||
		AUTOCLAVE_REGIME_PRESETS[0]!
	);
}
