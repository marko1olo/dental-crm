/**
 * packages/shared/src/billing/invoiceContract.ts
 *
 * Canonical Single Source of Truth (SSOT) for Invoice, InvoiceItem & InvoiceStatus
 * across @dental/shared, apps/api (PostgreSQL patient_invoices), and apps/web (Billing & POS).
 *
 * Eliminates contract drift between `totalRub` and `totalAmountRub` by establishing
 * `totalAmountRub` as the single canonical numeric total field.
 */

import { z } from "zod";

export const INVOICE_STATUS_VALUES = [
	"draft",
	"issued",
	"partially_paid",
	"paid",
	"cancelled",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUS_VALUES)[number];

export const invoiceStatusSchema = z.enum(INVOICE_STATUS_VALUES);

export interface InvoiceItem {
	id: string;
	serviceId?: string | null | undefined;
	serviceCode?: string | null | undefined;
	name: string;
	serviceName?: string | undefined;
	toothNumber?: string | null | undefined;
	toothCode?: string | null | undefined;
	quantity: number;
	unitPriceRub: number;
	discountPercent?: number | undefined;
	discountRub?: number | undefined;
	totalRub: number;
	totalAmountRub?: number | undefined;
	status?: string | undefined;
}

/**
 * Alias for backward compatibility with UI components expecting InvoiceLineItem.
 */
export type InvoiceLineItem = InvoiceItem;

export const invoiceItemSchema = z.object({
	id: z.string().min(1),
	serviceId: z.string().nullable().optional(),
	serviceCode: z.string().nullable().optional(),
	name: z.string().min(1),
	serviceName: z.string().optional(),
	toothNumber: z.string().nullable().optional(),
	toothCode: z.string().nullable().optional(),
	quantity: z.number().positive(),
	unitPriceRub: z.number().nonnegative(),
	discountPercent: z.number().min(0).max(100).optional(),
	discountRub: z.number().nonnegative().optional(),
	totalRub: z.number().nonnegative(),
	totalAmountRub: z.number().nonnegative().optional(),
	status: z.string().optional(),
});

export interface Invoice {
	id: string;
	organizationId: string;
	patientId: string;
	visitId: string | null;
	appointmentId?: string | null | undefined;
	doctorId?: string | null | undefined;
	invoiceNumber?: string | undefined;
	status: InvoiceStatus;
	subtotalRub?: number | undefined;
	discountPercent?: number | undefined;
	discountRub?: number | undefined;
	/**
	 * Canonical invoice total in RUB (SSOT across DB, API, and Web UI).
	 */
	totalAmountRub: number;
	paidAmountRub: number;
	remainingRub?: number | undefined;
	paymentMethod?: string | null | undefined;
	items: InvoiceItem[];
	notes?: string | null | undefined;
	issuedAt?: string | undefined;
	paidAt?: string | null | undefined;
	createdAt: string;
	updatedAt?: string | undefined;
}

export const invoiceSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	patientId: z.string().min(1),
	visitId: z.string().nullable(),
	appointmentId: z.string().nullable().optional(),
	doctorId: z.string().nullable().optional(),
	invoiceNumber: z.string().optional(),
	status: invoiceStatusSchema,
	subtotalRub: z.number().nonnegative().optional(),
	discountPercent: z.number().min(0).max(100).optional(),
	discountRub: z.number().nonnegative().optional(),
	totalAmountRub: z.number().nonnegative(),
	paidAmountRub: z.number().nonnegative(),
	remainingRub: z.number().nonnegative().optional(),
	paymentMethod: z.string().nullable().optional(),
	items: z.array(invoiceItemSchema),
	notes: z.string().nullable().optional(),
	issuedAt: z.string().optional(),
	paidAt: z.string().nullable().optional(),
	createdAt: z.string().min(1),
	updatedAt: z.string().optional(),
});

/**
 * Normalizes any raw status string into the canonical InvoiceStatus union.
 */
export function normalizeInvoiceStatus(
	rawStatus: string | null | undefined,
	totalAmountRub = 0,
	paidAmountRub = 0,
): InvoiceStatus {
	const lower = (rawStatus ?? "").trim().toLowerCase();
	if (lower === "paid" || lower === "оплачен" || lower === "оплачено") {
		return "paid";
	}
	if (
		lower === "partially_paid" ||
		lower === "partial" ||
		lower === "частично оплачен"
	) {
		return "partially_paid";
	}
	if (
		lower === "cancelled" ||
		lower === "canceled" ||
		lower === "void" ||
		lower === "refunded" ||
		lower === "отменен"
	) {
		return "cancelled";
	}
	if (lower === "draft" || lower === "черновик") {
		return "draft";
	}
	if (lower === "issued" || lower === "unpaid" || lower === "overdue") {
		if (paidAmountRub > 0 && paidAmountRub >= totalAmountRub && totalAmountRub > 0) {
			return "paid";
		}
		if (paidAmountRub > 0 && paidAmountRub < totalAmountRub) {
			return "partially_paid";
		}
		return "issued";
	}
	if (paidAmountRub > 0 && paidAmountRub >= totalAmountRub && totalAmountRub > 0) {
		return "paid";
	}
	if (paidAmountRub > 0 && paidAmountRub < totalAmountRub) {
		return "partially_paid";
	}
	return "issued";
}

/**
 * Resolves the canonical `totalAmountRub` from any DB row or API payload,
 * bridging legacy `totalRub` / `subtotalRub` fields without silent NaN/0 loss.
 */
export function resolveInvoiceTotalAmountRub(input: {
	totalAmountRub?: number | string | null | undefined;
	totalRub?: number | string | null | undefined;
	subtotalRub?: number | string | null | undefined;
	discountRub?: number | string | null | undefined;
}): number {
	const parseNum = (val: unknown): number | null => {
		if (typeof val === "number" && Number.isFinite(val)) return val;
		if (typeof val === "string" && val.trim().length > 0) {
			const parsed = Number(val);
			if (Number.isFinite(parsed)) return parsed;
		}
		return null;
	};

	const canonical = parseNum(input.totalAmountRub);
	const legacy = parseNum(input.totalRub);

	if (canonical !== null && canonical > 0) return canonical;
	if (legacy !== null && legacy > 0) return legacy;
	if (canonical !== null) return canonical;
	if (legacy !== null) return legacy;

	const subtotal = parseNum(input.subtotalRub) ?? 0;
	const discount = parseNum(input.discountRub) ?? 0;
	return Math.max(0, subtotal - discount);
}

/**
 * Normalizes a raw invoice item into canonical InvoiceItem format.
 */
export function normalizeInvoiceItem(
	raw: Record<string, unknown>,
	fallbackIndex = 0,
): InvoiceItem {
	const quantity = Math.max(1, Number(raw.quantity ?? 1) || 1);
	const unitPriceRub = Math.max(
		0,
		Number(raw.unitPriceRub ?? raw.priceRub ?? raw.totalRub ?? 0) || 0,
	);
	const discountRub = Math.max(0, Number(raw.discountRub ?? 0) || 0);
	const discountPercent = Math.max(
		0,
		Math.min(100, Number(raw.discountPercent ?? 0) || 0),
	);
	const rawTotal = Number(
		raw.totalAmountRub ?? raw.totalRub ?? quantity * unitPriceRub - discountRub,
	);
	const totalRub = Number.isFinite(rawTotal) ? Math.max(0, rawTotal) : 0;
	const name = String(
		raw.name ?? raw.serviceName ?? raw.title ?? "Стоматологическая услуга",
	);
	const tooth =
		raw.toothNumber != null
			? String(raw.toothNumber)
			: raw.toothCode != null
				? String(raw.toothCode)
				: null;

	return {
		id: String(raw.id ?? `item-${fallbackIndex + 1}`),
		serviceId: raw.serviceId != null ? String(raw.serviceId) : null,
		serviceCode: raw.serviceCode != null ? String(raw.serviceCode) : null,
		name,
		serviceName: name,
		toothNumber: tooth,
		toothCode: tooth,
		quantity,
		unitPriceRub,
		discountPercent,
		discountRub,
		totalRub,
		totalAmountRub: totalRub,
		status: raw.status != null ? String(raw.status) : undefined,
	};
}
