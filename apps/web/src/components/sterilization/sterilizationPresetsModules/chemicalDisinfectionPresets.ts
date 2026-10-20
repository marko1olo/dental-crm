/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/chemicalDisinfectionPresets.ts
 *
 * Фасад пресетов химической дезинфекции.
 * Мандат 8b: строго <= 120 строк.
 */

import { CHEMICAL_DISINFECTION_PRESETS } from "./chemicalDisinfectionPresetsData.js";
import type { ChemicalDisinfectionPreset } from "./types.js";

export { CHEMICAL_DISINFECTION_PRESETS };

/**
 * Получение пресета химической дезинфекции по идентификатору
 */
export function getChemicalDisinfectionPresetById(
	id: string,
): ChemicalDisinfectionPreset | undefined {
	return CHEMICAL_DISINFECTION_PRESETS.find((p) => p.id === id);
}
