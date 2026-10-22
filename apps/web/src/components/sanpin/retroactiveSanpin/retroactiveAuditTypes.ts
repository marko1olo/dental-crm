export interface RetroactiveBatchStats {
	readonly totalDays: number;
	readonly workingDaysCount: number;
	readonly totalTraysProcessed: number;
	readonly totalPsoSamplesTested: number;
	readonly totalAutoclaveCycles: number;
	readonly totalRecirculatorHours: number;
	readonly generalCleaningsCount: number;
	readonly totalWasteKg: number;
	readonly compliancePercentage: number;
}

export interface DossierPrintMeta {
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly headNurseName?: string | undefined;
	readonly periodLabelRu?: string | undefined;
}

export interface RetroactiveValidationIssue {
	readonly code: string;
	readonly messageRu: string;
	readonly severity: "error" | "warning";
	readonly statutoryNorm: string;
}

export interface RetroactiveValidationResult {
	readonly recordId: string;
	readonly date: string;
	readonly isCompliant: boolean;
	readonly issues: readonly RetroactiveValidationIssue[];
}

export interface RetroactiveComplianceAudit {
	readonly totalDaysAudited: number;
	readonly compliantDaysCount: number;
	readonly complianceRatePercent: number;
	readonly totalIssuesFound: number;
	readonly results: readonly RetroactiveValidationResult[];
}
