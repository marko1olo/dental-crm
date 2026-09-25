export interface InvoiceLineItem {
	id: string;
	code?: string | undefined;
	name: string;
	quantity: number;
	priceRub: number;
}

export interface BillingInvoice {
	id: string;
	number: string;
	patientId: string;
	patientName: string;
	patientPhone?: string | undefined;
	doctorName: string;
	date: string;
	totalAmountRub: number;
	paidAmountRub: number;
	status: "draft" | "issued" | "paid" | "partially_paid" | "warranty_100";
	items: InvoiceLineItem[];
	createdAt: string;
	paidAt?: string | undefined;
	paymentMethod?: string | undefined;
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
