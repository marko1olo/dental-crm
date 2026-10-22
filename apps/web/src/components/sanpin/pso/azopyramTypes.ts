export type AzopyramColorReaction =
	| "none_negative"
	| "violet_blue_blood"
	| "brown_rust"
	| "pink_smear";

export type PhenolphthaleinColorReaction =
	| "none_negative"
	| "pink_magenta_alkali";

export type SudanColorReaction =
	| "none_negative"
	| "yellow_pink_lipid_stain";

export interface PsoEvaluationInput {
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly categoryId?: string;
	readonly isSurgicalOrCritical?: boolean;
	readonly itemsTypesCount?: number;

	// Азопирам
	readonly isAzopyramNegative: boolean;
	readonly azopyramColor?: AzopyramColorReaction;
	readonly azopyramSolutionPreparedAt: string;
	readonly azopyramReagentLot?: string;

	// Фенолфталеин
	readonly isPhenolphthaleinNegative: boolean;
	readonly phenolphthaleinColor?: PhenolphthaleinColorReaction;

	// Судан III
	readonly isSudanNegative?: boolean;
	readonly sudanColor?: SudanColorReaction;

	// Моющее средство
	readonly detergentBrand?: string;
}

export interface PsoEvaluationResult {
	readonly isBatchApproved: boolean;
	readonly isBatchBlocked: boolean;
	readonly minSampleRequired: number;
	readonly isSamplingSufficient: boolean;

	// Срок годности рабочего раствора
	readonly solutionAgeMinutes: number;
	readonly isSolutionExpired: boolean;
	readonly solutionExpiresAtIso: string;
	readonly solutionTimeRemainingMinutes: number;

	// Клинические протоколы
	readonly rejectionReasons: readonly string[];
	readonly clinicalActionProtocolRu: string;
	readonly regulatoryClauseRu: string;
	readonly statusBadgeText: string;
	readonly statusBadgeClass: "badge-success" | "badge-danger" | "badge-warning";
}

export interface PsoPrintRecordItem {
	readonly id: string;
	readonly timestamp: string;
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly reagentLot: string;
	readonly solutionTimeRu: string;
	readonly isAzopyramNegative: boolean;
	readonly isPhenolphthaleinNegative: boolean;
	readonly detergentBrand: string;
	readonly isBatchApproved: boolean;
	readonly rejectionReason?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly electronicStampVerified: boolean;
	readonly notes?: string | undefined;
}

export interface PsoPrintDocumentParams {
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly licenseInfo: string;
	readonly chiefDoctorFullName: string;
	readonly headNurseFullName: string;
	readonly dateRangeTextRu: string;
	readonly records: readonly PsoPrintRecordItem[];
}
