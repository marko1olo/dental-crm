/**
 * unifiedStockDeductionTypes.ts — Layer 0: Contracts for unified warehouse stock deduction.
 * Complies with Mandates 8e (Doctor Autonomy), 8n (Scale Sovereignty), and 8aa (Soft Overdraft).
 */

import type { inventoryItems } from "../../db/schema.js";

export interface UnifiedStockItemDefinition {
	patterns?: string[] | undefined;
	defaultName: string;
	category: string;
	unit: string;
	qty: number;
	defaultCost?: string | undefined;
	exactItemId?: string | undefined;
	notes?: string | undefined;
	label?: string | undefined;
}

export interface UnifiedDeductedItemRecord {
	itemId: string;
	itemName: string;
	quantity: number;
	unit: string;
	remainingStock: number;
	isOverdraft: boolean;
}

export interface UnifiedStockDeductionParams {
	organizationId: string;
	items: UnifiedStockItemDefinition[];
	transactionType: string;
	visitId?: string | null | undefined;
	userId?: string | null | undefined;
	notes?: string | null | undefined;
	reasonPrefix?: string | undefined;
	successMessageTemplate?: ((deductedCount: number, hasOverdraft: boolean) => string) | undefined;
}

export interface UnifiedStockDeductionResult {
	success: boolean;
	isOverdraft: boolean;
	warning?: string | undefined;
	deductedItems: UnifiedDeductedItemRecord[];
	warnings: string[];
	message: string;
}

export interface ResolvedItemTarget {
	item: typeof inventoryItems.$inferSelect;
	qty: number;
	label?: string | undefined;
}
