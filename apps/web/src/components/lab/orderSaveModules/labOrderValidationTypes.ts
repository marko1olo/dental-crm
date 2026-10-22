import type { LabSlaRiskLevel } from "@dental/shared";
import type { JawScope } from "../labMath";

export interface LabOrderValidationInput {
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	selectedTeeth: readonly number[];
	jawScope?: JawScope | null | undefined;
	constructionType?: string | null | undefined;
	material?: string | null | undefined;
	shadeFinal?: string | null | undefined;
	dueDate?: string | null | undefined;
	scheduledVisitDate?: string | null | undefined;
	frameworkTrialDate?: string | null | undefined;
	ceramicTrialDate?: string | null | undefined;
	totalLabPriceRub?: number | undefined;
}

export interface LabOrderValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
	readonly slaRisk: LabSlaRiskLevel;
}
