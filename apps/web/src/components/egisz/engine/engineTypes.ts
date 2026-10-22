/**
 * engineTypes.ts — Preflight validation report types for EGISZ REMD and FNS Tax
 */

export interface EgiszPreflightCheckResult {
	id: string;
	category: "clinic" | "doctor" | "patient" | "clinical" | "signature" | "taxpayer" | "finance";
	title: string;
	status: "passed" | "failed" | "warning";
	details: string;
	oid?: string | undefined;
}

export interface EgiszPreflightReport {
	isValid: boolean;
	canSendToRemd: boolean;
	totalChecks: number;
	passedCount: number;
	failedCount: number;
	warningCount: number;
	scorePercent: number;
	checks: EgiszPreflightCheckResult[];
}

export interface FnsTaxPreflightReport {
	isValid: boolean;
	totalChecks: number;
	passedCount: number;
	failedCount: number;
	warningCount: number;
	scorePercent: number;
	checks: EgiszPreflightCheckResult[];
}
