/**
 * tabs/registry/documentRegistryTypes.ts
 * Types for Document Registry tab and rows (Mandate 8b <= 120 lines)
 */

import type React from "react";
import type {
	DocumentKind,
	DocumentKindMetadata,
	DocumentSourceStatus,
	DocumentStatus,
	GeneratedDocument,
} from "@dental/shared";
import type { DocumentEdsFilter, DocumentStatusFilter } from "../../DocumentRegistryFilterBar";
import type { DocumentCategoryTab } from "../../DocumentNavTabs";

export interface DocumentRegistryTabProps {
	activeCategoryTab?: DocumentCategoryTab;
	registrySearchQuery: string;
	setRegistrySearchQuery: (val: string) => void;
	registryStatusFilter: DocumentStatusFilter;
	setRegistryStatusFilter: (val: DocumentStatusFilter) => void;
	registryEdsFilter: DocumentEdsFilter;
	setRegistryEdsFilter: (val: DocumentEdsFilter) => void;
	registryKindFilter: "all" | DocumentKind;
	setRegistryKindFilter: (val: "all" | DocumentKind) => void;
	typedActiveDocuments?: GeneratedDocument[];
	filteredActiveDocuments: GeneratedDocument[];
	availableRegistryKinds: Array<{ key: DocumentKind; label: string; count: number }>;
	setActiveCategoryTab: (tab: DocumentCategoryTab) => void;
	documentsSlice: {
		visibleItems: GeneratedDocument[];
		hasMore: boolean;
		remainingCount: number;
	};
	setDisplayLimit: React.Dispatch<React.SetStateAction<number>>;
	documentActionLabels?: Record<DocumentKind, string> | undefined;
	documentLabels?: Record<DocumentKind, string> | undefined;
	documentKindMetadata?: Record<DocumentKind, DocumentKindMetadata> | undefined;
	documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	documentSourceStatusClassNames?: Record<DocumentSourceStatus, string> | undefined;
	documentSourceStatusLabels?: Record<DocumentSourceStatus, string> | undefined;
	documentAuditFactsLoadingId?: string | null | undefined;
	documentStatusSavingId?: string | null | undefined;
	formatShortDate?: ((date: string | null | undefined) => string) | undefined;
	money?: ((val: number | null | undefined) => string) | undefined;
	requestDocumentIssue: (doc: GeneratedDocument) => void;
	downloadIssuedDocumentPdf: (id: string) => Promise<void> | void;
	openIssuedDocumentHtml: (id: string) => Promise<void> | void;
	openDocActionMenuId: string | null;
	setOpenDocActionMenuId: (id: string | null) => void;
	loadDocumentAuditFacts: (id: string) => Promise<void> | void;
	downloadIssuedDocumentHtml?: ((id: string) => Promise<void> | void) | undefined;
	handleDirectPrintDocumentA4?: ((id: string, title?: string) => Promise<void> | void) | undefined;
	downloadTaxDocumentXml?: ((id: string) => Promise<void> | void) | undefined;
	setIsFnsNdflXmlOpen?: ((open: boolean) => void) | undefined;
	setIsEgiszRemdOpen?: ((open: boolean) => void) | undefined;
	requestDocumentVoid: (doc: GeneratedDocument) => void;
}

export type DocumentRowProps = {
	document: GeneratedDocument;
	documentActionLabels?: Record<DocumentKind, string> | undefined;
	documentLabels?: Record<DocumentKind, string> | undefined;
	documentKindMetadata?: Record<DocumentKind, DocumentKindMetadata> | undefined;
	documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	documentSourceStatusClassNames?: Record<DocumentSourceStatus, string> | undefined;
	documentSourceStatusLabels?: Record<DocumentSourceStatus, string> | undefined;
	documentAuditFactsLoadingId?: string | null | undefined;
	documentStatusSavingId?: string | null | undefined;
	formatShortDate?: ((date: string | null | undefined) => string) | undefined;
	money?: ((val: number | null | undefined) => string) | undefined;
	requestDocumentIssue: (doc: GeneratedDocument) => void;
	downloadIssuedDocumentPdf: (id: string) => Promise<void> | void;
	openIssuedDocumentHtml: (id: string) => Promise<void> | void;
	openDocActionMenuId: string | null;
	setOpenDocActionMenuId: (id: string | null) => void;
	loadDocumentAuditFacts: (id: string) => Promise<void> | void;
	downloadIssuedDocumentHtml?: ((id: string) => Promise<void> | void) | undefined;
	handleDirectPrintDocumentA4?: ((id: string, title?: string) => Promise<void> | void) | undefined;
	downloadTaxDocumentXml?: ((id: string) => Promise<void> | void) | undefined;
	setIsFnsNdflXmlOpen?: ((open: boolean) => void) | undefined;
	setIsEgiszRemdOpen?: ((open: boolean) => void) | undefined;
	requestDocumentVoid: (doc: GeneratedDocument) => void;
};
