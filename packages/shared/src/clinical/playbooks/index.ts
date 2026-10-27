/**
 * packages/shared/src/clinical/playbooks/index.ts
 * Unified exports for DENTE Smart Clinical Playbooks (Wave 132 / Mandates 8b, 8e, 8x, 8ap).
 */

import { formatKopecksRu } from "../../utils/money.js";
import {
	calculateCandidateMatchScore,
	evaluateDentalPathologyUrgency,
	findCancellationGapCandidates,
	recoverCancellationGap,
} from "./cancellationGapRecovery.js";
import { generateMorningBriefing } from "./morningBriefingEngine.js";
import { formatPlaybookForm043A4Protocol } from "./playbookSummaryFormatter.js";
import { calculateDaysBetween } from "./playbookTypes.js";
import { generatePreAppointmentSummary } from "./preVisitSummaryEngine.js";

export * from "./playbookTypes.js";
export * from "./morningBriefingEngine.js";
export * from "./cancellationGapRecovery.js";
export * from "./preVisitSummaryEngine.js";
export * from "./playbookSummaryFormatter.js";

export const smartClinicalPlaybooksEngine = {
	generateMorningBriefing,
	findCancellationGapCandidates,
	recoverCancellationGap,
	generatePreAppointmentSummary,
	formatPlaybookForm043A4Protocol,
	calculateCandidateMatchScore,
	evaluateDentalPathologyUrgency,
	formatKopecksRu,
	calculateDaysBetween,
} as const;
