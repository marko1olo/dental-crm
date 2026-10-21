import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import type React from "react";

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
	// biome-ignore lint/suspicious/noExplicitAny: clinicProfileDraft
	readonly clinicProfileDraft?: any | undefined;
	readonly existingDocuments?: readonly GeneratedDocument[] | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: eligibleTaxPayments
	readonly eligibleTaxPayments?: readonly any[] | undefined;
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
