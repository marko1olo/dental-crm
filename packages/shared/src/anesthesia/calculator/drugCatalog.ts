/**
 * @dental/shared/anesthesia/calculator/drugCatalog.ts
 * Statutory Pharmacological Parameters, Concentrations & Carpule Volume References
 */

import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	HEALTHY_MAX_EPINEPHRINE_MG,
} from "../catalog.js";
import type {
	AnesthesiaDrugDefinition,
	AnesthesiaDrugKey,
	AnesthesiaMethodKey,
} from "./types.js";

export {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	HEALTHY_MAX_EPINEPHRINE_MG,
};

/**
 * Стандартные объемы стоматологических карпул и ампул в РФ и за рубежом (мл).
 */
export const CARPULE_STANDARD_VOLUMES_ML = [1.7, 1.8, 2.0] as const;
export type CarpuleStandardVolumeMl = (typeof CARPULE_STANDARD_VOLUMES_ML)[number];

/**
 * Безопасное получение определения анестетика с фолбэком на Ультракаин Д-С.
 */
export function getAnesthesiaDrug(key: AnesthesiaDrugKey): AnesthesiaDrugDefinition {
	return ANESTHESIA_DRUGS[key] ?? ANESTHESIA_DRUGS.ultracain_ds;
}

/**
 * Безопасное получение метода анестезии с фолбэком на инфильтрационную.
 */
export function getAnesthesiaMethod(key: AnesthesiaMethodKey) {
	return ANESTHESIA_METHODS[key] ?? ANESTHESIA_METHODS.infiltration;
}
