/**
 * index.ts — Aggregate Statutory Registry for Minzdrav Order 804n / Service Nomenclature.
 * Mandate 8ap: Clean domain alias SERVICE_NOMENCLATURE_REGISTRY.
 * Strictly <= 30 lines.
 */

import type { StatutoryNomenclatureEntry } from "../../types.js";
import { DIAGNOSTIC_STATUTORY_REGISTRY } from "./diagnosticRegistry.js";
import { HYGIENE_STATUTORY_REGISTRY } from "./hygieneRegistry.js";
import { IMPLANT_STATUTORY_REGISTRY } from "./implantRegistry.js";
import { ORTHOPEDIC_STATUTORY_REGISTRY } from "./orthopedicRegistry.js";
import { SURGERY_STATUTORY_REGISTRY } from "./surgeryRegistry.js";
import { THERAPY_STATUTORY_REGISTRY } from "./therapyRegistry.js";

export const ORDER_804N_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	...THERAPY_STATUTORY_REGISTRY,
	...SURGERY_STATUTORY_REGISTRY,
	...IMPLANT_STATUTORY_REGISTRY,
	...ORTHOPEDIC_STATUTORY_REGISTRY,
	...HYGIENE_STATUTORY_REGISTRY,
	...DIAGNOSTIC_STATUTORY_REGISTRY,
];

export const SERVICE_NOMENCLATURE_REGISTRY = ORDER_804N_STATUTORY_REGISTRY;

export {
	THERAPY_STATUTORY_REGISTRY,
	SURGERY_STATUTORY_REGISTRY,
	IMPLANT_STATUTORY_REGISTRY,
	ORTHOPEDIC_STATUTORY_REGISTRY,
	HYGIENE_STATUTORY_REGISTRY,
	DIAGNOSTIC_STATUTORY_REGISTRY,
};
