/**
 * types.ts — Type definitions, contracts, and normalization utilities for AI Action Dispatcher.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy
 * - Mandate 8l: Action Engine
 * - Mandate 8n: Scale Sovereignty
 */

export type CRMActionCategory =
	| "clinical_odontogram"
	| "clinical_diary"
	| "schedule"
	| "billing_estimate"
	| "lab_order"
	| "patient"
	| "pharmacology"
	| "warehouse";

export interface CRMToolCall {
	callId: string;
	name: string;
	arguments: Record<string, unknown>;
	confirmed?: boolean;
	doctorUserId?: string;
	organizationId?: string;
}

export interface CRMActionResult {
	success: boolean;
	callId: string;
	actionName: string;
	category: CRMActionCategory;
	message: string;
	needsConfirmation?: boolean;
	destructive?: boolean;
	data?: Record<string, unknown>;
	error?: string;
}

export interface ActionExecutionContext {
	apiBaseUrl?: string;
	token?: string;
	headers?: Record<string, string>;
}

/**
 * Normalizes tooth numbers into standard FDI format (11..48, 51..85)
 */
export function normalizeToothNumber(raw: unknown): number | null {
	if (typeof raw === "number" && !Number.isNaN(raw)) {
		return raw;
	}
	if (typeof raw === "string") {
		const cleaned = raw.replace(/[^0-9]/g, "");
		const num = Number(cleaned);
		if (!Number.isNaN(num) && num >= 11 && num <= 85) {
			return num;
		}
	}
	return null;
}
