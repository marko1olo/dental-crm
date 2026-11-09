/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DOCUMENTS VIEW DOMAIN TYPES (Layer 0)
 * Architecture: Pure Contracts | Zero Side-Effects | Mandates 8b, 8e, 8k, 8n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	DocumentKind,
	DocumentKindMetadata,
	DocumentSourceStatus,
	DocumentStatus,
	GeneratedDocument,
	Patient,
	Payment,
} from "@dental/shared";
import type { DocumentCategoryTab } from "../components/documents/DocumentNavTabs";
import type {
	DocumentEdsFilter,
	DocumentStatusFilter,
} from "../components/documents/DocumentRegistryFilterBar";

export interface DocumentsViewProps {
	readonly activePatient?: Patient | null | undefined;
	readonly activeDoctor?: { readonly fullName?: string; readonly id?: string; readonly specialty?: string } | null | undefined;
	readonly activeDocuments?: readonly GeneratedDocument[] | undefined;
	readonly activeUsableDocuments?: readonly GeneratedDocument[] | undefined;
	readonly clinicProfileDraft?: Record<string, unknown> | undefined;
	readonly dashboard?: unknown;
	readonly patientName?: string | undefined;
	readonly selectedEligibleTaxPayments?: readonly Payment[] | undefined;
	readonly taxDocumentPayerOptions?: ReadonlyArray<{ readonly id: string; readonly label: string }> | undefined;
	readonly documentActionLabels?: Record<string, string> | undefined;
	readonly documentLabels?: Record<string, string> | undefined;
	readonly documentStatusLabels?: Record<string, string> | undefined;
	readonly documentSourceStatusClassNames?: Record<string, string> | undefined;
	readonly documentIssueSignatureModeLabels?: Record<string, string> | undefined;
	readonly documentVoidReasonLabels?: Record<string, string> | undefined;
	readonly confirmDocumentIssue?: () => Promise<void> | void;
	readonly confirmDocumentVoid?: () => Promise<void> | void;
	readonly createDocument?: (kind: DocumentKind | string) => Promise<void> | void;
	readonly downloadIssuedDocumentHtml?: (id: string) => void;
	readonly downloadIssuedDocumentPdf?: (id: string) => void;
	readonly downloadTaxDocumentXml?: (id: string) => void;
	readonly loadDocumentAuditFacts?: (id: string) => Promise<void> | void;
	readonly openIssuedDocumentHtml?: (id: string) => void;
	readonly requestDocumentIssue?: (id: string) => void;
	readonly requestDocumentVoid?: (id: string) => void;
	readonly updateDocumentStatus?: (id: string, status: DocumentStatus) => Promise<void> | void;
	readonly className?: string | undefined;
}

export type { DocumentCategoryTab, DocumentEdsFilter, DocumentStatusFilter };

export interface DocumentTemplateItem {
	readonly id: string;
	readonly kind: DocumentKind | (string & {});
	readonly titleRu: string;
	readonly category: DocumentCategoryTab;
	readonly descriptionRu: string;
	readonly badgeRu: string;
	readonly regulationRu?: string | undefined;
	readonly printSupported: boolean;
	readonly isPrimary?: boolean | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly isStatutory?: boolean | undefined;
}

export interface DocumentsToolbarProps {
	readonly activePatient?: Patient | null | undefined;
	readonly patientIssuedDocsCount: number;
	readonly patientDraftDocsCount: number;
	readonly activeCategoryTab: DocumentCategoryTab;
	readonly onSelectCategoryTab: (tab: DocumentCategoryTab) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly onOpenAutoclaveLog: () => void;
	readonly onOpenPrimaryIntakePackage: () => void;
	readonly onDirectPrintPrimaryIntake?: (() => void) | undefined;
	readonly navCategoryCounts?: Record<DocumentCategoryTab, number> | undefined;
	readonly className?: string | undefined;
}

export interface DocumentsTemplateGridProps {
	readonly selectedDocumentKind: DocumentKind | (string & {});
	readonly onSelectDocumentKind: (kind: DocumentKind | (string & {})) => void;
	readonly onCreateDocument: (kind: DocumentKind | (string & {})) => void | Promise<void>;
	readonly onOpenFocusEditor: (kind: DocumentKind | (string & {})) => void;
	readonly onOpenA4Preview?: ((kind: DocumentKind | (string & {})) => void) | undefined;
	readonly activeCategoryTab: DocumentCategoryTab;
	readonly searchQuery: string;
	readonly isCreating?: boolean | undefined;
	readonly documentCreateSavingKind?: DocumentKind | (string & {}) | null | undefined;
	readonly sanitizedDocumentFactoryGroups?: Array<{
		title: string;
		kinds: DocumentKind[];
	}> | undefined;
	readonly documentLabels?: Record<string, string> | undefined;
	readonly className?: string | undefined;
	readonly onOpenPrimaryIntakePackage?: (() => void) | undefined;
	readonly onDirectPrintPrimaryIntake?: (() => void) | undefined;
}

export interface DocumentsRecentListProps {
	readonly activePatient?: Patient | null | undefined;
	readonly activeDoctor?: { fullName?: string | undefined; id?: string | undefined } | null | undefined;
	readonly typedActiveDocuments: GeneratedDocument[];
	readonly filteredActiveDocuments: GeneratedDocument[];
	readonly activeCategoryTab: DocumentCategoryTab;
	readonly setActiveCategoryTab: (tab: DocumentCategoryTab) => void;
	readonly registrySearchQuery: string;
	readonly setRegistrySearchQuery: (query: string) => void;
	readonly registryStatusFilter: DocumentStatusFilter;
	readonly setRegistryStatusFilter: (status: DocumentStatusFilter) => void;
	readonly registryEdsFilter: DocumentEdsFilter;
	readonly setRegistryEdsFilter: (eds: DocumentEdsFilter) => void;
	readonly registryKindFilter: "all" | DocumentKind;
	readonly setRegistryKindFilter: (kind: "all" | DocumentKind) => void;
	readonly availableRegistryKinds: Array<{ key: DocumentKind; label: string; count: number }>;
	readonly documentsSlice: {
		visibleItems: GeneratedDocument[];
		hasMore: boolean;
		remainingCount: number;
	};
	readonly setDisplayLimit: React.Dispatch<React.SetStateAction<number>>;
	readonly documentActionLabels?: Record<string, string> | undefined;
	readonly documentLabels?: Record<string, string> | undefined;
	readonly documentKindMetadata?: Record<DocumentKind, DocumentKindMetadata> | undefined;
	readonly documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	readonly documentSourceStatusClassNames?: Record<DocumentSourceStatus, string> | undefined;
	readonly documentSourceStatusLabels?: Record<DocumentSourceStatus, string> | undefined;
	readonly documentAuditFactsLoadingId?: string | null | undefined;
	readonly documentStatusSavingId?: string | null | undefined;
	readonly openDocActionMenuId: string | null;
	readonly setOpenDocActionMenuId: (id: string | null) => void;
	readonly requestDocumentIssue: (doc: GeneratedDocument) => void;
	readonly downloadIssuedDocumentPdf: (id: string) => void | Promise<void>;
	readonly openIssuedDocumentHtml: (id: string) => void | Promise<void>;
	readonly loadDocumentAuditFacts: (id: string) => void | Promise<void>;
	readonly downloadIssuedDocumentHtml: (id: string) => void | Promise<void>;
	readonly downloadTaxDocumentXml: (id: string) => void | Promise<void>;
	readonly setIsFnsNdflXmlOpen: (open: boolean) => void;
	readonly setIsEgiszRemdOpen: (open: boolean) => void;
	readonly requestDocumentVoid: (doc: GeneratedDocument) => void;
	readonly formatShortDate: (date: string | null | undefined) => string;
	readonly money: (kopecks: number) => string;
	readonly className?: string | undefined;
}

export interface DocumentsA4PrintPreviewProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly isEditingInFocus?: boolean | undefined;
	readonly onCloseFocus?: (() => void) | undefined;
	readonly selectedDocumentKind?: DocumentKind | undefined;
	readonly setSelectedDocumentKind?: ((kind: DocumentKind) => void) | undefined;
	readonly isCreating?: boolean | undefined;
	readonly onCreateDocument?: ((kind: DocumentKind) => void | Promise<void>) | undefined;
	readonly documentLabels?: Record<string, string> | undefined;
	readonly sanitizedDocumentFactoryGroups?: Array<{
		title: string;
		kinds: DocumentKind[];
	}> | undefined;
	readonly documentCreateSavingKind?: DocumentKind | null | undefined;
	readonly selectedDocumentCreateGuidanceId?: string | undefined;
	readonly patient?: Patient | null | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: profile draft
	readonly clinicProfileDraft?: any | undefined;
	readonly onPrint?: (() => void) | undefined;
	readonly onDownloadPdf?: (() => void) | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: form props
	readonly formProps?: Record<string, any> | undefined;
	readonly children?: React.ReactNode | undefined;
	readonly className?: string | undefined;
}
