/**
 * types.ts — Layer 0: Core types, errors, and utility contracts for treatment consumables.
 */

import crypto from "node:crypto";
import type { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
/**
 * @deprecated Mandate 8v (Soft Negative Stock & Doctor Autonomy):
 * Clinical inventory natively supports soft overdraft (quantity < 0, isOverdraft: true).
 * Treatment procedures and chairside care are never blocked by warehouse shortages.
 */
export class InsufficientStockError extends Error {
	readonly statusCode = 400;
	readonly error = "InsufficientStock";
	readonly inventoryItemId: string;
	readonly inventoryItemName: string;
	readonly availableStock: number;
	readonly requiredStock: number;

	constructor(params: {
		inventoryItemId: string;
		inventoryItemName: string;
		availableStock: number;
		requiredStock: number;
	}) {
		super(
			`Недостаточно материалов на складе: «${params.inventoryItemName}» (требуется ${params.requiredStock}, в наличии ${params.availableStock}).`,
		);
		this.name = "InsufficientStockError";
		this.inventoryItemId = params.inventoryItemId;
		this.inventoryItemName = params.inventoryItemName;
		this.availableStock = params.availableStock;
		this.requiredStock = params.requiredStock;
	}
}

export type DbExecutor =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| TenantDb;

export class TreatmentConsumablesServiceError extends Error {
	readonly statusCode: number;
	readonly code: string;

	constructor(message: string, statusCode = 400, code = "TreatmentConsumablesError") {
		super(message);
		this.name = "TreatmentConsumablesServiceError";
		this.statusCode = statusCode;
		this.code = code;
	}
}

export function toValidUuid(str: string): string;
export function toValidUuid(str?: string | null): string | null;
export function toValidUuid(str?: string | null): string | null {
	if (!str) return null;
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
		return str;
	}
	const hash = crypto.createHash("md5").update(str).digest("hex");
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}
