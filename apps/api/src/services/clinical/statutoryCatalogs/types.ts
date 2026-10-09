import type { DentalSpecialty, ServiceCategory } from "@dental/shared";

export interface Baseline804nServiceDefinition {
	readonly code: string;
	readonly title: string;
	readonly category: ServiceCategory;
	readonly specialty: DentalSpecialty;
	readonly basePriceRub: number;
	readonly basePriceKopecks: number;
	readonly durationMinutes: number;
	readonly taxDeductible: boolean;
	readonly active: boolean;
}

export interface Statutory804nItem {
	readonly code: string;
	readonly name: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly defaultPriceKopecks: number;
	readonly isBaseDmsCovered?: boolean;
	readonly requiresToothNumber?: boolean;
	readonly requiresXrayProof?: boolean;
}

export interface StatutoryIcd10Item {
	readonly code: string;
	readonly label: string;
	readonly group: string;
	readonly requiresTooth?: boolean;
}

export interface StatutoryEmrTemplateItem {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly category: string;
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly defaultSubjectiveComplaints: string;
	readonly defaultAnamnesisMorbi: string;
	readonly defaultObjectiveStatus: string;
	readonly defaultProcedureProtocol: string;
	readonly defaultRecommendations: string;
}