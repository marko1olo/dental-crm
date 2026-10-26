export type CareCategory =
	| "cold"
	| "meds"
	| "food"
	| "immediate"
	| "medication"
	| "nutrition"
	| "hygiene"
	| "restrictions"
	| "warning";

export type CareInterventionType =
	| "caries"
	| "extraction"
	| "sinus_lift"
	| "implantation"
	| "endodontics"
	| "whitening"
	| "orthodontics"
	| "hygiene"
	| "custom";

export interface CareRecommendationItem {
	readonly id: string;
	readonly icon: string;
	readonly title: string;
	readonly description: string;
	readonly category: CareCategory;
	readonly isUrgent?: boolean;
	readonly badgeText?: string;
}

export interface PrescribedMedicationItem {
	readonly id: string;
	readonly name: string;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly frequencyRu: string;
	readonly durationRu: string;
	readonly purposeRu: string;
	readonly icon: string;
	readonly isImportant?: boolean;
}

export interface CarePresetData {
	readonly interventionType: CareInterventionType;
	readonly typeNameRu: string;
	readonly defaultProcedureName: string;
	readonly recommendations: readonly CareRecommendationItem[];
	readonly medications: readonly PrescribedMedicationItem[];
	readonly warningSigns: readonly string[];
	readonly dietaryRules: readonly string[];
	readonly hygieneRules: readonly string[];
	readonly activityRestrictions: readonly string[];
	readonly nextVisitText: string;
}
