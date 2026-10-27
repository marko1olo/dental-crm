import type { ClinicalRecallTriggerInfo } from "./recallCycleTypes";

export type ClinicalRecallChannelId =
	| "hygiene_periodontal"
	| "implant_monitoring"
	| "orthodontic_activation"
	| "pediatric_prophylaxis";

export interface PatientClinicalStatusInput {
	readonly lastVisitDate?: (Date | string) | undefined;
	readonly lastCleaningDate?: (Date | string) | undefined;
	readonly implantSurgeryDate?: (Date | string) | undefined;
	readonly lastOrthoAdjustmentDate?: (Date | string) | undefined;
	readonly lastPediatricVisitDate?: (Date | string) | undefined;
	readonly isChildUnder14?: boolean | undefined;
	readonly age?: number | undefined;
	readonly hasBraces?: boolean | undefined;
	readonly hasAligners?: boolean | undefined;
	readonly hasOrthodonticAppliance?: boolean | undefined;
	readonly hasImplants?: boolean | undefined;
	readonly implantsCount?: number | undefined;
	readonly hasCrownsOrVeneers?: boolean | undefined;
	readonly hasProsthetics?: boolean | undefined;
	readonly maxPocketDepthMm?: number | undefined;
	readonly hasBleedingOnProbing?: boolean | undefined;
	readonly customHygieneMonths?: number | undefined;
	readonly customOrthoWeeks?: number | undefined;
	readonly customPediatricMonths?: number | undefined;
	readonly customImplantMonths?: number | undefined;
	readonly referenceDate?: (Date | string) | undefined;
}

export interface MultiRecallEvaluationResult {
	readonly triggers: readonly (ClinicalRecallTriggerInfo & { readonly channelId: ClinicalRecallChannelId })[];
	readonly activeChannels: readonly ClinicalRecallChannelId[];
	readonly hasMultipleRecalls: boolean;
	readonly primaryTrigger: ClinicalRecallTriggerInfo;
}
