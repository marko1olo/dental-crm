import React, { useState } from "react";
import type { GeneratedDocument } from "@dental/shared";
import { FileText } from "lucide-react";
import { EmptyState } from "../../EmptyState";
import { MobileDocumentPreviewSheet } from "./MobileDocumentPreviewSheet";
import type { MobileDocumentsHubProps } from "./mobileDocumentsTypes";
import { useMobileDocumentsFilter } from "./useMobileDocumentsFilter";
import { MobileDocumentsHeader } from "./MobileDocumentsHeader";
import { MobileDocumentsSearch } from "./MobileDocumentsSearch";
import { MobileCategoryChips } from "./MobileCategoryChips";
import { MobileStatusSegmentedBar } from "./MobileStatusSegmentedBar";
import { MobileDocumentItemCard } from "./MobileDocumentItemCard";
import { MobileDocumentsFloatingBar } from "./MobileDocumentsFloatingBar";

export type { MobileDocumentsHubProps } from "./mobileDocumentsTypes";

export function MobileDocumentsHub(props: MobileDocumentsHubProps): React.JSX.Element {
	const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
	const filter = useMobileDocumentsFilter(props.documents, props.documentLabels);
	const triggerTactile = () => {
		try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10); } catch { /* no-op */ }
	};
	const handleOpenPreview = (doc: GeneratedDocument) => {
		triggerTactile();
		setPreviewDoc(doc);
	};

	return (
		<div
			className="w-full flex flex-col space-y-3 pb-[calc(140px+env(safe-area-inset-bottom,0px))] overflow-x-clip"
			data-testid="mobile-documents-hub"
			style={{ maxWidth: "100vw" }}
		>
			<MobileDocumentsHeader
				totalCount={filter.effectiveDocuments.length}
				activePatient={props.activePatient}
				onDirectPrintPrimaryIntake={props.onDirectPrintPrimaryIntake}
				triggerTactile={triggerTactile}
			/>
			<MobileDocumentsSearch
				searchQuery={filter.searchQuery}
				onSearchChange={filter.setSearchQuery}
				onClear={() => filter.setSearchQuery("")}
			/>
			<MobileCategoryChips
				activeCategory={filter.activeCategory}
				categoryCounts={filter.categoryCounts}
				onSelectCategory={filter.setActiveCategory}
				triggerTactile={triggerTactile}
			/>
			<MobileStatusSegmentedBar
				activeStatus={filter.activeStatus}
				totalCount={filter.filteredDocs.length}
				onStatusChange={filter.setActiveStatus}
			/>
			<div className="px-4 pb-32">
				{filter.filteredDocs.length === 0 ? (
					<EmptyState
						title="Документы не найдены"
						description="По заданным фильтрам нет документов. Попробуйте изменить параметры поиска или категорию."
						icon={<FileText size={28} className="text-[var(--muted)]" aria-hidden="true" />}
						className="my-4 py-8"
					/>
				) : (
					<div
						className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] shadow-sm overflow-hidden divide-y divide-[var(--line-subtle)]"
						role="list"
						aria-label="Список документов"
					>
						{filter.filteredDocs.map((doc) => (
							<MobileDocumentItemCard
								key={doc.id}
								doc={doc}
								documentLabels={props.documentLabels}
								money={props.money}
								formatShortDate={props.formatShortDate}
								onOpenPreview={handleOpenPreview}
							/>
						))}
					</div>
				)}
			</div>
			<MobileDocumentsFloatingBar
				onDirectPrintPrimaryIntake={props.onDirectPrintPrimaryIntake}
				onOpenPrimaryIntakeModal={props.onOpenPrimaryIntakeModal}
				onOpenCreateDocumentModal={props.onOpenCreateDocumentModal}
				triggerTactile={triggerTactile}
			/>
			<MobileDocumentPreviewSheet
				document={previewDoc}
				isOpen={Boolean(previewDoc)}
				onClose={() => setPreviewDoc(null)}
				onPrint={(doc) => { setPreviewDoc(null); void props.onDownloadPdf(doc.id); }}
				onSharePdf={(doc) => { setPreviewDoc(null); void props.onDownloadPdf(doc.id); }}
				onOpenHtml={(doc) => { setPreviewDoc(null); void props.onOpenHtml(doc.id); }}
				onViewAuditFacts={(doc) => { setPreviewDoc(null); void props.onLoadAuditFacts?.(doc.id); }}
				onVerifyAndIssue={(doc) => { setPreviewDoc(null); props.onRequestIssue?.(doc); }}
				documentLabels={props.documentLabels}
				documentStatusLabels={props.documentStatusLabels}
				money={props.money}
				formatShortDate={props.formatShortDate}
				activePatientName={props.activePatient?.fullName}
				activePatientPhone={props.activePatient?.phone}
				activeDoctorName={props.activeDoctor?.fullName}
			/>
		</div>
	);
}
