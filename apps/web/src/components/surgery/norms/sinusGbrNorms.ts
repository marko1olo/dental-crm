/**
 * sinusGbrNorms.ts — Реестр клинических норм синус-лифтинга (Мандаты 8e, 8i).
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { SINUS_OPEN_GBR_NORMS } from "./sinusOpenGbrNorms";
import { SINUS_CLOSED_NORMS } from "./sinusClosedNorms";

export const SINUS_GBR_NORMS: readonly SurgicalOperationNorm[] = [
	...SINUS_OPEN_GBR_NORMS,
	...SINUS_CLOSED_NORMS,
];
