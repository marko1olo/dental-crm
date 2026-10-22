import React from "react";
import { DEFAULT_DOM_CHUNK_STEP } from "../../utils/domVirtualizationHelper";
import {
	type DocumentsOutpatientArchiveProps,
	OutpatientDocumentCard,
	OutpatientArchiveQuickToolbar,
	OutpatientArchiveSearchFilter,
	OutpatientArchiveEmptyState,
	OutpatientArchivePagination,
	useOutpatientArchiveState,
} from "./outpatientArchive";

export type { DocumentsOutpatientArchiveProps };

export const DocumentsOutpatientArchive: React.FC<DocumentsOutpatientArchiveProps> = (props) => {
	const { className = "", onOpenDocument, onPrintDocument } = props;
	const s = useOutpatientArchiveState(props);

	return (
		<div className={`outpatient-archive-container ${className}`} data-testid="outpatient-documents-archive">
			<OutpatientArchiveQuickToolbar
				onPrintBlankContract={s.handlePrintBlankContract}
				onPrintBlankConsent={s.handlePrintBlankConsent}
				onPrintBlankForm043={s.handlePrintBlankForm043}
				onOpenLatest={s.handleOpenLatest}
			/>

			<OutpatientArchiveSearchFilter
				searchQuery={s.searchQuery}
				setSearchQuery={s.setSearchQuery}
				statusFilter={s.statusFilter}
				setStatusFilter={s.setStatusFilter}
			/>

			{s.filteredDocuments.length === 0 ? (
				<OutpatientArchiveEmptyState />
			) : (
				<div className="archive-cards-list flex flex-col gap-2">
					{s.documentSlice.visibleItems.map((doc) => (
						<OutpatientDocumentCard
							key={doc.id}
							doc={doc}
							isDropdownOpen={s.activeDropdownDocId === doc.id}
							onToggleDropdown={() => s.setActiveDropdownDocId(s.activeDropdownDocId === doc.id ? null : doc.id)}
							onOpen={() => {
								if (onOpenDocument) onOpenDocument(doc.id);
								else if (s.appLogic?.openIssuedDocumentHtml) s.appLogic.openIssuedDocumentHtml(doc.id);
							}}
							onPrint={() => {
								if (onPrintDocument) onPrintDocument(doc.id);
								else if (s.appLogic?.downloadIssuedDocumentPdf) s.appLogic.downloadIssuedDocumentPdf(doc.id);
							}}
							onDownloadHtml={() => {
								s.setActiveDropdownDocId(null);
								if (s.appLogic?.downloadIssuedDocumentHtml) s.appLogic.downloadIssuedDocumentHtml(doc.id);
							}}
						/>
					))}

					{s.documentSlice.hasMore && (
						<OutpatientArchivePagination
							totalCount={s.documentSlice.totalCount}
							remainingCount={s.documentSlice.remainingCount}
							onLoadMore={() => s.setDisplayLimit((prev) => prev + DEFAULT_DOM_CHUNK_STEP)}
							onLoadAll={() => s.setDisplayLimit(s.documentSlice.totalCount)}
						/>
					)}
				</div>
			)}
		</div>
	);
};

export default DocumentsOutpatientArchive;
