import type {
	Invoice as CanonicalInvoice,
	InvoiceItem as CanonicalInvoiceItem,
	InvoiceStatus as CanonicalInvoiceStatus,
} from "@dental/shared";
import type { FiscalReceiptStatusCode } from "../finance/FiscalReceiptStatusBadge.js";

export type { CanonicalInvoice, CanonicalInvoiceItem, CanonicalInvoiceStatus };

export interface InvoiceLineItem {
	id: string;
	code?: string | undefined;
	code804n?: string | undefined;
	serviceCode?: string | null | undefined;
	name: string;
	serviceName?: string | undefined;
	title?: string | undefined;
	quantity: number;
	priceRub: number;
	unitPriceRub?: number | undefined;
	totalRub?: number | undefined;
	totalAmountRub?: number | undefined;
	toothNumber?: number | string | null | undefined;
}

export interface BillingInvoice {
	id: string;
	organizationId?: string | undefined;
	visitId?: string | null | undefined;
	number: string;
	invoiceNumber?: string | undefined;
	patientId: string;
	patientName: string;
	patientPhone?: string | undefined;
	doctorName: string;
	date: string;
	/**
	 * Canonical invoice total in RUB (SSOT synchronized with @dental/shared Invoice.totalAmountRub).
	 */
	totalAmountRub: CanonicalInvoice["totalAmountRub"];
	paidAmountRub: CanonicalInvoice["paidAmountRub"];
	status: CanonicalInvoiceStatus | "warranty_100";
	items: InvoiceLineItem[];
	createdAt: string;
	paidAt?: string | undefined;
	paymentMethod?: string | undefined;
	fiscalStatus?: FiscalReceiptStatusCode | undefined;
	isOfflineQueued?: boolean | undefined;
	notes?: string | undefined;
}

export interface InvoicesViewProps {
	initialInvoices?: BillingInvoice[];
	patientId?: string;
	patientName?: string;
	currentDoctorName?: string;
	clinicLegalName?: string;
	onClose?: () => void;
}

export type InvoiceFilterTab = "all" | "pending" | "paid" | "warranty";
