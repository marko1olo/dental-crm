/**
 * apps/web/src/components/billing/cashRegisterDrawerData.ts
 *
 * Types for the cash register drawer receipts. Receipts are NEVER fabricated
 * here: every entry is built from a server-confirmed payment.
 */

import type { ReceiptItem } from "./ReceiptPreview.js";

export interface ShiftReceiptEntry {
	readonly id: string;
	readonly number: string;
	readonly time: string;
	readonly patientName: string;
	readonly totalRub: number;
	readonly method: "card" | "sbp" | "cash" | "deposit" | "split" | "warranty";
	readonly items: readonly ReceiptItem[];
}
