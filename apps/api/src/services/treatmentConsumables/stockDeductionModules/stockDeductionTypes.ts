/**
 * stockDeductionTypes.ts — Layer 0: Contracts, DTOs & interfaces for transactional stock deduction.
 *
 * Implements Mandate 8e (Doctor Autonomy) & Mandate 8n (Scale Sovereignty).
 */

import type {
	StockDeductionRecord,
	StockDeductionResult,
	StockDeductionWarning,
} from "@dental/shared";
import type { inventoryItems } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";

export type {
	StockDeductionRecord,
	StockDeductionResult,
	StockDeductionWarning,
};

export interface ServiceDescriptor {
	readonly rawToken: string;
	readonly serviceId?: string | null;
	readonly serviceCode?: string | null;
	readonly order804nCode?: string | null;
	readonly title?: string | null;
}

export interface RawRequiredMaterial {
	readonly key: string;
	readonly quantity: number;
	readonly unit: string;
	readonly name?: string | undefined;
	readonly defaultCostRub?: number | undefined;
	readonly isMdlpRequired?: boolean | undefined;
}

export interface ResolvedItemEntry {
	readonly item: typeof inventoryItems.$inferSelect;
	readonly requiredQty: number;
	readonly ruleUnit: string;
	readonly isMdlpRequired?: boolean | undefined;
}

export interface DeductForVisitParams {
	organizationId: string;
	visitId: string;
	userId?: string | null | undefined;
	transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
	clientMutationId?: string | null | undefined;
	services?: Array<{ serviceId: string; quantity?: number | undefined }> | undefined;
	items?: Array<{ inventoryItemId: string; quantity: number; reason?: string | null | undefined }> | undefined;
	carpulesCount?: number | undefined;
	drugName?: string | undefined;
	paperJournalAcknowledged?: boolean | undefined;
	allowOverdraft?: boolean | undefined;
}

export interface DeductForToothTreatmentParams {
	organizationId: string;
	treatmentItemId: string;
	serviceId: string;
	visitId?: string | null | undefined;
	toothNumber?: number | null | undefined;
	quantity?: number | undefined;
	userId?: string | null | undefined;
	transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
	clientMutationId?: string | null | undefined;
	allowOverdraft?: boolean | undefined;
}

export function isPureUuid(str: string | null | undefined): str is string {
	return (
		typeof str === "string" &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
	);
}
