/**
 * types.ts — Layer 0: Core types, errors, and utility contracts for treatment consumables.
 */

import crypto from "node:crypto";
import type { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import { InsufficientStockError } from "../inventory/materialDeduction.js";

export { InsufficientStockError };

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

export function toValidUuid(str: string): string {
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
		return str;
	}
	const hash = crypto.createHash("md5").update(str).digest("hex");
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}
