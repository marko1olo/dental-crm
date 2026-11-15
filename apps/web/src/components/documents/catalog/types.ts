import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import type React from "react";
import type { DocumentClinicProfileRequisites } from "../tabs/formSwitch/documentFormSwitchTypes";

export interface EligibleTaxPaymentInput {
	readonly id?: string | undefined;
	readonly amountRub?: number | string | undefined;
	readonly amount?: number | string | undefined;
	readonly code804n?: string | null | undefined;
	readonly description?: string | null | undefined;
	readonly serviceName?: string | null | undefined;
	readonly taxServiceCode?: string | null | undefined;
	readonly taxCode?: string | null | undefined;
	readonly isExpensiveTreatment?: boolean | null | undefined;
	readonly paidAt?: string | null | undefined;
	readonly createdAt?: string | null | undefined;
	readonly dateIso?: string | null | undefined;
	readonly receiptNumber?: string | null | undefined;
	readonly fiscalDocumentNumber?: string | null | undefined;
	readonly fiscalSign?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly isRefund?: boolean | null | undefined;
}

export type DocumentCatalogCategory =
	| "all"
	| "intake"
	| "clinical"
	| "finance_tax"
	| "refusal"
	| "pediatric"
	| "registry";

export interface DocumentCatalogItem {
	readonly id: string;
	readonly kind?: DocumentKind | undefined;
	readonly titleRu: string;
	readonly category: DocumentCatalogCategory;
	readonly descriptionRu: string;
	readonly badgeRu: string;
	readonly regulationRu: string;
	readonly icon: React.ComponentType<{ className?: string; size?: number }>;
	readonly isPediatric?: boolean | undefined;
	readonly isStatutory?: boolean | undefined;
	readonly printSupported: boolean;
	readonly onQuickAction?: () => void;
}

export interface DocumentsCatalogViewProps {
	readonly patient?: Patient | null | undefined;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicProfileDraft?: DocumentClinicProfileRequisites | Record<string, unknown> | null | undefined;
	readonly existingDocuments?: readonly GeneratedDocument[] | undefined;
	readonly eligibleTaxPayments?: readonly EligibleTaxPaymentInput[] | undefined;
	readonly onCreateDocument?:
		| ((kind: DocumentKind) => void | Promise<void>)
		| undefined;
	readonly onOpenIssuedDocumentHtml?:
		| ((id: string) => void | Promise<void>)
		| undefined;
	readonly onOpenDocument?: ((kind: DocumentKind) => void) | undefined;
	readonly onOpenPrimaryIntakePackage?: (() => void) | undefined;
	readonly onOpenTaxCertificate?: (() => void) | undefined;
	readonly onSelectRegistryTab?: (() => void) | undefined;
	readonly onOpenFocusEditor?: ((kind: DocumentKind) => void) | undefined;
	readonly onOpenAutoclaveLog?: (() => void) | undefined;
	readonly className?: string | undefined;
}
