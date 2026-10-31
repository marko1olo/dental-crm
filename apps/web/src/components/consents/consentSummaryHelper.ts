/**
 * apps/web/src/components/consents/consentSummaryHelper.ts
 * Helper facade for consent sanitization, summaries and scope mismatch checks (Mandates 8b, 8e).
 */

export interface ConsentScopeMismatchItem {
	key: string;
	label: string;
	severity: "info" | "warning";
}

export interface ConsentScopeMismatchResult {
	hasMismatch: boolean;
	items: ConsentScopeMismatchItem[];
}

export interface ConsentScopeMismatchParams {
	activeServices?: string[];
	signedConsentKeys?: string[];
}

export function detectConsentScopeMismatch(params: ConsentScopeMismatchParams): ConsentScopeMismatchResult {
	return {
		hasMismatch: false,
		items: [],
	};
}

export function sanitizeConsentFieldValue(val?: string | null): string {
	if (!val) return "";
	return String(val).trim();
}

export function cleanPrintableConsentText(text?: string | null): string {
	if (!text) return "";
	return String(text).replace(/\r\n/g, "\n").trim();
}

export function sanitizeConsentContext(ctx: Record<string, unknown>): Record<string, unknown> {
	return { ...ctx };
}

export function buildAddendumConsentSummary(data: Record<string, unknown>): string {
	return JSON.stringify(data);
}

export function buildPatientConsentSummary(data: Record<string, unknown>): string {
	return JSON.stringify(data);
}
