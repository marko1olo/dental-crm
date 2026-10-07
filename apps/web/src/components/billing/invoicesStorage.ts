/**
 * apps/web/src/components/billing/invoicesStorage.ts
 *
 * LocalStorage persistence and initial loading for Billing Invoices.
 * Compliance: Mandate 8b (file length <= 800 lines).
 */

import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../../lib/safeLocalStorage.js";
import type { BillingInvoice } from "./invoiceTypes.js";

export const INVOICES_STORAGE_KEY = "dente_billing_invoices";

export function loadStoredInvoices(): BillingInvoice[] {
	if (typeof window === "undefined") {
		return [];
	}
	const stored = safeLocalStorageGetJson<BillingInvoice[]>(INVOICES_STORAGE_KEY, []);
	if (!Array.isArray(stored)) return [];
	return stored.filter((item): item is BillingInvoice => Boolean(item && typeof item === "object"));
}

export function saveStoredInvoices(invoices: BillingInvoice[]): void {
	if (typeof window === "undefined") {
		return;
	}
	safeLocalStorageSetJson(INVOICES_STORAGE_KEY, invoices);
}
