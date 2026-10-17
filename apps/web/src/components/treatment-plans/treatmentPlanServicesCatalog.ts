/**
 * treatmentPlanServicesCatalog.ts — Каталог стоматологических услуг и процедур
 * Декомпозирован строго по Мандату 8b (лимит строк <= 120).
 */

import type { Order804nProcedureDefinition } from "./types";
import { THERAPY_DIAGNOSTIC_SERVICES } from "./catalog/therapyDiagnosticServices";
import { ENDO_SERVICES } from "./catalog/endoServices";
import { SURGERY_SERVICES } from "./catalog/surgeryServices";
import { ORTHO_SERVICES } from "./catalog/orthoServices";

export * from "./catalog/catalogPredicates";

export const DENTAL_SERVICES_CATALOG: Record<string, Order804nProcedureDefinition> = {
	...THERAPY_DIAGNOSTIC_SERVICES,
	...ENDO_SERVICES,
	...SURGERY_SERVICES,
	...ORTHO_SERVICES,
};

export const SERVICES_CATALOG_DICTIONARY = DENTAL_SERVICES_CATALOG;
export const ORDER_804N_DICTIONARY = DENTAL_SERVICES_CATALOG;

export default DENTAL_SERVICES_CATALOG;
