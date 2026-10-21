/**
 * types.ts — Контракты финансово-математического ядра ДМС
 */

export interface DmsInsurerItem {
	readonly id: string;
	readonly key: string;
	readonly shortName: string;
	readonly fullName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly phone: string;
	readonly email: string;
	readonly standardDmsTerms: string;
}

export interface DmsExclusionDefinition {
	readonly id: string;
	readonly key: string;
	readonly title: string;
	readonly description: string;
	readonly defaultExcluded: boolean;
	readonly matchedCategories: readonly string[];
}

export interface Nomenclature804nItem {
	readonly code: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "hygiene" | "orthopedics" | "orthodontics" | "diagnostics" | "anesthesia";
	readonly categoryTitleRu: string;
	readonly defaultPriceRub: number;
	readonly standardCoveredDms: boolean;
	readonly uet?: number | undefined;
}

export interface DmsGuaranteeLetter {
	id: string;
	organizationId?: string | undefined;
	patientId: string;
	patientFullName: string;
	patientBirthDate?: string | undefined;
	policyNumber: string;
	insurerKey: string;
	insurerName: string;
	letterNumber: string;
	issueDate: string;
	validFrom: string;
	validUntil: string;
	maxCoverageRub: number;
	usedAmountRub: number;
	franchisePct: number;
	franchiseType: "percent" | "fixed_rub";
	franchiseFixedRub: number;
	programExclusions: string[];
	approvedServiceCodes: string[];
	approvedDiagnosisCodes: string[];
	notes: string;
	status:
		| "draft"
		| "pending_approval"
		| "approved"
		| "active"
		| "billed"
		| "paid"
		| "exhausted"
		| "expired"
		| "cancelled";
}

export interface DmsRegistryServiceRecord {
	id: string;
	visitId: string;
	visitDate: string;
	patientId: string;
	patientFullName: string;
	policyNumber: string;
	letterNumber?: string | undefined;
	insurerKey?: string | undefined;
	insurerName: string;
	serviceCode804n: string;
	serviceName: string;
	diagnosisCodeMkb10: string;
	toothNumber?: number | string | undefined;
	quantity: number;
	unitPriceRub: number;
	totalPriceRub: number;
	dmsCoveredRub: number;
	patientPaidRub: number;
	doctorFullName: string;
	isExcluded: boolean;
	exclusionReason?: string | undefined;
}

export interface DmsRegistrySummary {
	totalServicesCount: number;
	totalAmountRub: number;
	totalDmsCoveredRub: number;
	totalPatientPaidRub: number;
	uniquePatientsCount: number;
	periodStart: string;
	periodEnd: string;
	insurerName: string;
	isBalanced: boolean;
}
