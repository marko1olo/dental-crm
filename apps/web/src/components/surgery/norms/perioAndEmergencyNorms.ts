/**
 * perioAndEmergencyNorms.ts — Реестр пародонтологических и экстренных хирургических норм (Мандаты 8e, 8i).
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { EMERGENCY_PERIOSTOTOMY_NORMS } from "./emergencyPeriostotomyNorms";
import { PERIO_PERICORONITIS_AND_APICO_NORMS } from "./perioPericoronitisAndApicoNorms";

export const PERIO_AND_EMERGENCY_NORMS: readonly SurgicalOperationNorm[] = [
	...EMERGENCY_PERIOSTOTOMY_NORMS,
	...PERIO_PERICORONITIS_AND_APICO_NORMS,
];
