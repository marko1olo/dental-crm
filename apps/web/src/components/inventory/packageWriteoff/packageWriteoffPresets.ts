import type { ClinicalWriteoffPackage } from "./packageWriteoffTypes.js";
import { ANESTHESIA_PACKAGE, FILLING_PACKAGE, HYGIENE_PACKAGE } from "./packageWriteoffPresetsAnesthesia.js";
import { SURGERY_PACKAGE, CARPULE_QUICK_PACKAGE, STERILIZATION_KIT_PACKAGE } from "./packageWriteoffPresetsSurgery.js";

export { ANESTHESIA_PACKAGE, FILLING_PACKAGE, HYGIENE_PACKAGE };
export { SURGERY_PACKAGE, CARPULE_QUICK_PACKAGE, STERILIZATION_KIT_PACKAGE };

/**
 * Канонические клинические пакеты расходных материалов для стоматологического приёма
 */
export const CLINICAL_WRITEOFF_PACKAGES: readonly ClinicalWriteoffPackage[] = [
	ANESTHESIA_PACKAGE,
	FILLING_PACKAGE,
	HYGIENE_PACKAGE,
	SURGERY_PACKAGE,
	CARPULE_QUICK_PACKAGE,
	STERILIZATION_KIT_PACKAGE,
];
