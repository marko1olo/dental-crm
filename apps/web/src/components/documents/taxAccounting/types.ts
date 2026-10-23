import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";

export interface TaxDocumentPayerOption {
	key: string;
	inn: string;
	label: string;
	amountRub: number;
	paymentCount: number;
}

export interface TaxAccountingPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly taxYear: number;
	readonly setTaxYear: (year: number) => void;
	readonly payerOptions: TaxDocumentPayerOption[];
	readonly selectedPayerKey: string;
	readonly onSelectPayerKey: (payerKey: string) => void;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	readonly onOpenFnsXmlModal: () => void;
	readonly onRequestIssueDocument?: (doc: GeneratedDocument) => void;
}

export interface TaxItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
}

export const TAX_ACCOUNTING_ITEMS: readonly TaxItem[] = [
	{
		kind: "tax_deduction_certificate",
		title: "Справка для налогового вычета (13% НДФЛ)",
		statutoryRef: "Унифицированная справка об оплате медицинских услуг",
		description: "Официальная унифицированная справка для получения социального налогового вычета 13% (НДФЛ).",
	},
	{
		kind: "completed_works_act",
		title: "Акт выполненных работ / фактически оказанных услуг",
		statutoryRef: "Договор оказания услуг и перечень выполненных процедур",
		description: "Акт приема-сдачи медицинских услуг с детализацией проведенных манипуляций, гарантией и подписями сторон.",
	},
	{
		kind: "payment_receipt",
		title: "Квитанция об оплате и кассовый чек",
		statutoryRef: "Касса и подтверждения оплаты",
		description: "Финансовое подтверждение оплаты медицинских услуг с реквизитами платежа и фискального признака.",
	},
];
