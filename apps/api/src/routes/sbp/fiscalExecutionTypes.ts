import type { payments } from "../../db/schema.js";
import type { ItemizedFfd12Tag } from "./types.js";

export type FiscalizeReceiptServiceResult =
	| { readonly kind: "patient_not_found" }
	| { readonly kind: "invoice_not_found" }
	| { readonly kind: "idempotency_conflict" }
	| {
			readonly kind: "existing_payment";
			readonly payment: typeof payments.$inferSelect;
			readonly fiscalReceiptNumber: string | null;
	  }
	| {
			readonly kind: "created";
			readonly payment: typeof payments.$inferSelect;
			readonly fiscalReceiptNumber: string;
			readonly queueId?: string | undefined;
			readonly queueStatus: "printed" | "hardware_offline";
			readonly ffd12Tags: {
				readonly tag1054_operationType: number;
				readonly tag1055_taxationSystem: number;
				readonly tag1008_customerContact: string;
				readonly tag1021_cashier: string;
				readonly tag1031_cashSumKopecks: number;
				readonly tag1081_electronicSumKopecks: number;
				readonly tag1215_prepaidSumKopecks: number;
				readonly items: readonly ItemizedFfd12Tag[];
			};
	  };
