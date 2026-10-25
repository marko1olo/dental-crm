/**
 * surgeryNormsRegistry.ts — Единый агрегированный реестр хирургических норм DENTE CRM.
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { IMPLANT_NORMS } from "./implantNorms";
import { EXTRACTION_NORMS } from "./extractionNorms";
import { SINUS_GBR_NORMS } from "./sinusGbrNorms";
import { PERIO_AND_EMERGENCY_NORMS } from "./perioAndEmergencyNorms";

export const SURGICAL_OPERATION_NORMS: readonly SurgicalOperationNorm[] = [
	...IMPLANT_NORMS,
	...EXTRACTION_NORMS,
	...SINUS_GBR_NORMS,
	...PERIO_AND_EMERGENCY_NORMS,
];

export const CANONICAL_SURGICAL_OPERATION_NORMS = SURGICAL_OPERATION_NORMS;
