/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DOCUMENTS RECENT LIST & REGISTRY (apps/web/src/documentsView/DocumentsRecentList.tsx)
 * Architecture: Patient & Clinic Document Registry, Smart Filters, Actions
 * Compliance: Mandates 8b, 8e, 8k, 8n | Zero-Truncation | Vector Lucide Icons
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { DocumentRegistryTab } from "../components/documents/tabs/DocumentRegistryTab";
import type { DocumentsRecentListProps } from "./types";

export function DocumentsRecentList({
	activeCategoryTab,
	setActiveCategoryTab,
	registrySearchQuery,
	setRegistrySearchQuery,
	registryStatusFilter,
	setRegistryStatusFilter,
	registryEdsFilter,
	setRegistryEdsFilter,
	registryKindFilter,
	setRegistryKindFilter,
	typedActiveDocuments,
	filteredActiveDocuments,
	availableRegistryKinds,
	documentsSlice,
	setDisplayLimit,
	documentActionLabels,
	documentLabels,
	documentKindMetadata,
	documentStatusLabels,
	documentSourceStatusClassNames,
	documentSourceStatusLabels,
	documentAuditFactsLoadingId,
	documentStatusSavingId,
	openDocActionMenuId,
	setOpenDocActionMenuId,
	requestDocumentIssue,
	downloadIssuedDocumentPdf,
	openIssuedDocumentHtml,
	loadDocumentAuditFacts,
	downloadIssuedDocumentHtml,
	downloadTaxDocumentXml,
	setIsFnsNdflXmlOpen,
	setIsEgiszRemdOpen,
	requestDocumentVoid,
	formatShortDate,
	money,
	className = "",
}: DocumentsRecentListProps) {
	return (
		<div
			id="document-registry-section"
			className={`my-4 pt-3 border-t border-[var(--line,#e2e8f0)] ${className}`.trim()}
		>
			<DocumentRegistryTab
				activeCategoryTab={activeCategoryTab}
				registrySearchQuery={registrySearchQuery}
				setRegistrySearchQuery={setRegistrySearchQuery}
				registryStatusFilter={registryStatusFilter}
				setRegistryStatusFilter={setRegistryStatusFilter}
				registryEdsFilter={registryEdsFilter}
				setRegistryEdsFilter={setRegistryEdsFilter}
				registryKindFilter={registryKindFilter}
				setRegistryKindFilter={setRegistryKindFilter}
				typedActiveDocuments={typedActiveDocuments}
				filteredActiveDocuments={filteredActiveDocuments}
				availableRegistryKinds={availableRegistryKinds}
				setActiveCategoryTab={setActiveCategoryTab}
				documentsSlice={documentsSlice}
				setDisplayLimit={setDisplayLimit}
				documentActionLabels={documentActionLabels}
				documentLabels={documentLabels}
				documentKindMetadata={documentKindMetadata}
				documentStatusLabels={documentStatusLabels}
				documentSourceStatusClassNames={documentSourceStatusClassNames}
				documentSourceStatusLabels={documentSourceStatusLabels}
				documentAuditFactsLoadingId={documentAuditFactsLoadingId}
				documentStatusSavingId={documentStatusSavingId}
				formatShortDate={formatShortDate}
				money={(val) => money(val ?? 0)}
				requestDocumentIssue={requestDocumentIssue}
				downloadIssuedDocumentPdf={downloadIssuedDocumentPdf}
				openIssuedDocumentHtml={openIssuedDocumentHtml}
				openDocActionMenuId={openDocActionMenuId}
				setOpenDocActionMenuId={setOpenDocActionMenuId}
				loadDocumentAuditFacts={loadDocumentAuditFacts}
				downloadIssuedDocumentHtml={downloadIssuedDocumentHtml}
				downloadTaxDocumentXml={downloadTaxDocumentXml}
				setIsFnsNdflXmlOpen={setIsFnsNdflXmlOpen}
				setIsEgiszRemdOpen={setIsEgiszRemdOpen}
				requestDocumentVoid={requestDocumentVoid}
			/>
		</div>
	);
}

export default DocumentsRecentList;
