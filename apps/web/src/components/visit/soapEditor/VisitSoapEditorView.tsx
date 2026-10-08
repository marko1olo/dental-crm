import React from "react";
import { SoapFieldsEditor } from "./SoapFieldsEditor";
import { SoapFullTextView } from "./SoapFullTextView";
import { SoapMobileActionBar, SoapToolbar } from "./SoapToolbar";
import { SoapTemplatesDrawer } from "./SoapTemplatesDrawer";
import type { VisitSoapEditorProps } from "./types";
import { useVisitSoapEditor } from "./useVisitSoapEditor";

export const VisitSoapEditorView: React.FC<VisitSoapEditorProps> = (props) => {
	const { className = "", isLocked = false, onSelectActiveTooth } = props;

	const {
		values,
		selectedTooth,
		setSelectedTooth,
		selectedSurfaces,
		setSelectedSurfaces,
		activeViewMode,
		setActiveViewMode,
		isTemplatesOpen,
		setIsTemplatesOpen,
		activeSpecialty,
		setActiveSpecialty,
		searchQuery,
		setSearchQuery,
		saveStatus,
		copied,
		previewProtocol,
		setPreviewProtocol,
		templatesLimit,
		setTemplatesLimit,
		filteredProtocols,
		isIcd10SelectorOpen,
		setIsIcd10SelectorOpen,
		isCorrectionMode,
		isSoapMoreOpen,
		setIsSoapMoreOpen,
		soapMoreRef,
		unsavedDraftNotice,
		handleRestoreDraft,
		handleDiscardDraft,
		flushDraft,
		handleEnableCorrection,
		handleFieldChange,
		handleApplyProtocol,
		handleApplyNorm,
		handleApplyExpressProtocol,
		handleExplicitSave,
		handleCopyFullText,
		handleInputFocus,
	} = useVisitSoapEditor(props);

	return (
		<div
			className={`flex flex-col bg-[var(--paper,white)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden shadow-xs ${className}`}
		>
			<SoapToolbar
				selectedTooth={selectedTooth}
				onSelectTooth={(t) => {
					setSelectedTooth(t);
					if (t) onSelectActiveTooth?.(t);
				}}
				selectedSurfaces={selectedSurfaces}
				onChangeSurfaces={setSelectedSurfaces}
				isLocked={isLocked}
				isCorrectionMode={isCorrectionMode}
				onEnableCorrection={handleEnableCorrection}
				isTemplatesOpen={isTemplatesOpen}
				onToggleTemplates={() => setIsTemplatesOpen(!isTemplatesOpen)}
				onApplyNorm={handleApplyNorm}
				activeViewMode={activeViewMode}
				onChangeViewMode={setActiveViewMode}
				copied={copied}
				onCopyFullText={handleCopyFullText}
				onExplicitSave={handleExplicitSave}
				isSoapMoreOpen={isSoapMoreOpen}
				onToggleSoapMore={setIsSoapMoreOpen}
				soapMoreRef={soapMoreRef}
				saveStatus={saveStatus}
				unsavedDraftNotice={unsavedDraftNotice}
				onRestoreDraft={handleRestoreDraft}
				onDiscardDraft={handleDiscardDraft}
			/>

			<SoapTemplatesDrawer
				isTemplatesOpen={isTemplatesOpen}
				onClose={() => setIsTemplatesOpen(false)}
				activeSpecialty={activeSpecialty}
				onSelectSpecialty={setActiveSpecialty}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				protocols={filteredProtocols}
				templatesLimit={templatesLimit}
				onShowMore={() => setTemplatesLimit((prev) => prev + 30)}
				onApplyProtocol={handleApplyProtocol}
				previewProtocol={previewProtocol}
				onSetPreviewProtocol={setPreviewProtocol}
			/>

			{/* ── ТЕЛО РЕДАКТОРА: ПОЛЯ SOAP ИЛИ РЕЖИМ ПЕЧАТИ ── */}
			{activeViewMode === "fields" ? (
				<SoapFieldsEditor
					values={values}
					onFieldChange={handleFieldChange}
					onInputFocus={handleInputFocus}
					onInputBlur={flushDraft}
					selectedTooth={selectedTooth}
					isIcd10SelectorOpen={isIcd10SelectorOpen}
					onToggleIcd10Selector={setIsIcd10SelectorOpen}
					onApplyExpressProtocol={handleApplyExpressProtocol}
				/>
			) : (
				<SoapFullTextView
					values={values}
					selectedTooth={selectedTooth}
					isLocked={isLocked}
					isCorrectionMode={isCorrectionMode}
				/>
			)}

			<SoapMobileActionBar
				isTemplatesOpen={isTemplatesOpen}
				onToggleTemplates={() => setIsTemplatesOpen(!isTemplatesOpen)}
				onApplyNorm={handleApplyNorm}
				activeViewMode={activeViewMode}
				onChangeViewMode={setActiveViewMode}
			/>
		</div>
	);
};
