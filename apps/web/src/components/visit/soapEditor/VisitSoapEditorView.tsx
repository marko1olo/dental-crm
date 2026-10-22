import React from "react";
import { SoapFieldsEditor } from "./SoapFieldsEditor";
import { SoapFullTextView } from "./SoapFullTextView";
import { SoapTemplatesDrawer } from "./SoapTemplatesDrawer";
import { SoapMobileActionBar, SoapToolbar } from "./SoapToolbar";
import type { VisitSoapEditorProps } from "./types";
import { useVisitSoapEditor } from "./useVisitSoapEditor";

export const VisitSoapEditorView: React.FC<VisitSoapEditorProps> = (props) => {
	const { className = "", isLocked = false, onSelectActiveTooth } = props;
	const e = useVisitSoapEditor(props);

	return (
		<div className={`flex flex-col bg-[var(--paper,white)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden shadow-xs ${className}`}>
			<SoapToolbar
				selectedTooth={e.selectedTooth}
				onSelectTooth={(t) => {
					e.setSelectedTooth(t);
					if (t) onSelectActiveTooth?.(t);
				}}
				selectedSurfaces={e.selectedSurfaces}
				onChangeSurfaces={e.setSelectedSurfaces}
				isLocked={isLocked}
				isCorrectionMode={e.isCorrectionMode}
				onEnableCorrection={e.handleEnableCorrection}
				isTemplatesOpen={e.isTemplatesOpen}
				onToggleTemplates={() => e.setIsTemplatesOpen(!e.isTemplatesOpen)}
				onApplyNorm={e.handleApplyNorm}
				activeViewMode={e.activeViewMode}
				onChangeViewMode={e.setActiveViewMode}
				copied={e.copied}
				onCopyFullText={e.handleCopyFullText}
				onExplicitSave={e.handleExplicitSave}
				isSoapMoreOpen={e.isSoapMoreOpen}
				onToggleSoapMore={e.setIsSoapMoreOpen}
				soapMoreRef={e.soapMoreRef}
				saveStatus={e.saveStatus}
				unsavedDraftNotice={e.unsavedDraftNotice}
				onRestoreDraft={e.handleRestoreDraft}
				onDiscardDraft={e.handleDiscardDraft}
			/>

			<SoapTemplatesDrawer
				isTemplatesOpen={e.isTemplatesOpen}
				onClose={() => e.setIsTemplatesOpen(false)}
				activeSpecialty={e.activeSpecialty}
				onSelectSpecialty={e.setActiveSpecialty}
				searchQuery={e.searchQuery}
				onSearchChange={e.setSearchQuery}
				protocols={e.filteredProtocols}
				templatesLimit={e.templatesLimit}
				onShowMore={() => e.setTemplatesLimit((prev) => prev + 30)}
				onApplyProtocol={e.handleApplyProtocol}
				previewProtocol={e.previewProtocol}
				onSetPreviewProtocol={e.setPreviewProtocol}
			/>

			{e.activeViewMode === "fields" ? (
				<SoapFieldsEditor
					values={e.values}
					onFieldChange={e.handleFieldChange}
					onInputFocus={e.handleInputFocus}
					onInputBlur={e.flushDraft}
					selectedTooth={e.selectedTooth}
					isIcd10SelectorOpen={e.isIcd10SelectorOpen}
					onToggleIcd10Selector={e.setIsIcd10SelectorOpen}
					onApplyExpressProtocol={e.handleApplyExpressProtocol}
				/>
			) : (
				<SoapFullTextView
					values={e.values}
					selectedTooth={e.selectedTooth}
					isLocked={isLocked}
					isCorrectionMode={e.isCorrectionMode}
				/>
			)}

			<SoapMobileActionBar
				isTemplatesOpen={e.isTemplatesOpen}
				onToggleTemplates={() => e.setIsTemplatesOpen(!e.isTemplatesOpen)}
				onApplyNorm={e.handleApplyNorm}
				activeViewMode={e.activeViewMode}
				onChangeViewMode={e.setActiveViewMode}
			/>
		</div>
	);
};
