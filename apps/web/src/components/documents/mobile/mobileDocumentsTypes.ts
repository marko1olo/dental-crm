import type React from "react";
import type {
	DocumentKind,
	DocumentKindMetadata,
	DocumentStatus,
	GeneratedDocument,
	Patient,
	StaffMember,
} from "@dental/shared";

export type MobileCategoryTab =
	| "all"
	| "contracts"
	| "consents"
	| "acts"
	| "fns"
	| "clinical"
	| "sanpin";

export interface MobileDocumentsHubProps {
	readonly documents: GeneratedDocument[];
	readonly activePatient?: Patient | null | undefined;
	readonly activeDoctor?: StaffMember | null | undefined;
	readonly documentLabels?: Record<DocumentKind, string> | undefined;
	readonly documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	readonly documentKindMetadata?: Record<DocumentKind, DocumentKindMetadata> | undefined;
	readonly formatShortDate?: ((date: string | null | undefined) => string) | undefined;
	readonly money?: ((val: number | null | undefined) => string) | undefined;
	readonly onRequestIssue?: ((doc: GeneratedDocument) => void) | undefined;
	readonly onDownloadPdf: (id: string) => Promise<void> | void;
	readonly onOpenHtml: (id: string) => Promise<void> | void;
	readonly onLoadAuditFacts?: ((id: string) => Promise<void> | void) | undefined;
	readonly onDirectPrintPrimaryIntake?: (() => void) | undefined;
	readonly onOpenPrimaryIntakeModal?: (() => void) | undefined;
	readonly onOpenCreateDocumentModal?: ((kind: DocumentKind) => void) | undefined;
}

export interface MobileCategoryConfig {
	id: MobileCategoryTab;
	label: string;
	iconName: "contract" | "shield" | "act" | "fns" | "clinical" | "file";
	kinds?: DocumentKind[];
}
