import React from "react";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { showToast } from "../GlobalToast";
import { DebouncedEmkTextarea, EmkAnesthesiaSection, EmkToolbar } from "./emk";
import {
	VisitEmkCanvas,
	VisitEmkCompletionSection,
	VisitEmkModals,
	VisitFlowProgress,
	VisitSpecialtyFocus,
} from "./emkTab";
import { EmkComplaintsAndAnamnesisSection } from "./emkTabModules/EmkComplaintsAndAnamnesisSection";
import { EmkDiagnosisAndProtocolSection } from "./emkTabModules/EmkDiagnosisAndProtocolSection";
import type { VisitEmkTabProps } from "./emkTabModules/emkTabTypes";
import type { VisitDoctorEntity, VisitPatientEntity } from "./view/VisitViewProps";
import { useVisitEmkTabController } from "./emkTabModules/useVisitEmkTabController";
import {
	EmkFollowupSlotsPopoverButton,
	EmkInlineFollowupChips,
	EmkRecentVisitCopyButton,
} from "./emkTabModules/VisitEmkHabitsControls";

export * from "./emkTab";
export * from "./emkTabModules/emkTabTypes";
export {
	DebouncedEmkTextarea,
	EmkAnesthesiaSection,
	EmkComplaintsAndAnamnesisSection,
	EmkDiagnosisAndProtocolSection,
};

export function VisitEmkTab(props: VisitEmkTabProps) {
	const { dashboard, openVisitId, isDraftAccepting } = props;
	const activePatient: VisitPatientEntity | null | undefined = props.activePatient;
	const activeDoctor: VisitDoctorEntity | null | undefined = props.activeDoctor;
	const visitNoteForm: Record<string, unknown> = props.visitNoteForm ?? {};
	const updateVisitNoteField: (field: string, value: unknown) => void =
		props.updateVisitNoteField ?? (() => {});

	const {
		activeEmkTab,
		setActiveEmkTab,
		isPrintModalOpen,
		setIsPrintModalOpen,
		isStarProtocolsOpen,
		setIsStarProtocolsOpen,
		isConsentModalOpen,
		setIsConsentModalOpen,
		isSoapTemplatesModalOpen,
		setIsSoapTemplatesModalOpen,
		isRevisingVisitNote,
		setIsRevisingVisitNote,
		isOdontogramCollapsed: _isOdontogramCollapsed,
		setIsOdontogramCollapsed: _setIsOdontogramCollapsed,
		isSpecialtyCollapsed,
		setIsSpecialtyCollapsed,
		nextFreeSlots,
		isLoadingSlots,
		bookingSlotKey,
		loadNextFreeSlots,
		handleBookFollowupSlot,
		recentVisits,
		handleCopyRecentVisit,
		isSignedVisit,
		isLocked,
		selectedInlineTooth: _selectedInlineTooth,
		setSelectedInlineTooth: _setSelectedInlineTooth,
		appliedTeethStamps: _appliedTeethStamps,
		formulaSummary: _formulaSummary,
		handleApplyInlineToothStamp: _handleApplyInlineToothStamp,
		effectiveActiveTooth,
		soloAutosaveState,
		soloLastSavedAt,
		handleApplyPhysiologicalNorm,
		handleApplySoapPreset,
		handleSaveVisitNote,
		isCompletingVisit,
		completionResult,
		completionError,
		isSbpQrModalOpen,
		setIsSbpQrModalOpen,
		handleCompleteVisitAndGenerateReceipt,
		handleApplyCatalogPatch,
	} = useVisitEmkTabController(props);

	const handleVoiceResult = React.useCallback((text: string) => {
		if (!text.trim()) return;
		const target = /^(complaint|anamnesis)/.test(activeEmkTab)
			? "complaint"
			: /^(objective|status)/.test(activeEmkTab)
				? "objectiveStatus"
				: /^(treatment|diary)/.test(activeEmkTab)
					? "treatmentPlan"
					: "complaint";
		const curr = String(visitNoteForm?.[target] || "").trim();
		const nextVal = curr ? `${curr} ${text}` : text;
		updateVisitNoteField(target, nextVal);
		showToast("Голос добавлен в дневник приёма", "success", 2000);
	}, [activeEmkTab, visitNoteForm, updateVisitNoteField]);

	return (
		<div
			className="surface-panel p-2 sm:p-2.5 max-w-full overflow-x-clip"
			data-testid="visit-emk-tab"
		>
			{/* Компактный единый верхний контур (без 6-ярусного нагромождения и дубля одонтограммы) */}
			<div className="mb-2 flex flex-col gap-1.5">
				<h3
					className="sr-only"
					data-testid="emk-section-title"
				>
					Дневник приёма
				</h3>
				<span className="sr-only" data-testid="emk-section-eyebrow">
					Медицинская карта приёма
				</span>

				<EmkToolbar
					activeEmkTab={activeEmkTab}
					setActiveEmkTab={(tabId) => setActiveEmkTab(tabId)}
					isSignedVisit={isSignedVisit}
					isRevisingVisitNote={isRevisingVisitNote}
					onBeginRevise={() => setIsRevisingVisitNote(true)}
					onOpenStarProtocols={() => setIsStarProtocolsOpen(true)}
					onOpenSoapTemplates={() => setIsSoapTemplatesModalOpen(true)}
					onOpenConsentModal={() => setIsConsentModalOpen(true)}
					onOpenPrintModal={() => setIsPrintModalOpen(true)}
					onApplyPhysiologicalNorm={handleApplyPhysiologicalNorm}
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					autosaveState={soloAutosaveState}
					lastSavedAt={soloLastSavedAt}
					recentVisitActionNode={
						<EmkRecentVisitCopyButton
							recentVisits={recentVisits}
							onCopyRecentVisit={handleCopyRecentVisit}
						/>
					}
					followupScheduleNode={
						<EmkFollowupSlotsPopoverButton
							slots={nextFreeSlots}
							isLoadingSlots={isLoadingSlots}
							bookingSlotKey={bookingSlotKey}
							onOpenPopover={() => void loadNextFreeSlots()}
							onBookSlot={handleBookFollowupSlot}
						/>
					}
					specialtyFocusNode={
						<VisitSpecialtyFocus
							compact
							renderBarOnly
							activePatient={activePatient}
							activeDoctor={activeDoctor}
							isDrawerOpen={!isSpecialtyCollapsed}
							onToggleDrawer={(open: boolean) => setIsSpecialtyCollapsed(!open)}
						/>
					}
					voicePilotNode={
						<SmartMicrophoneButton
							context="visit"
							sterileMode={false}
							className="h-[28px] px-2 rounded-lg"
							title="Голосовая диктовка: надиктуйте жалобы, осмотр или лечение"
							onResult={handleVoiceResult}
						/>
					}
				/>

				<VisitSpecialtyFocus
					compact
					renderDrawerOnly
					activePatient={activePatient}
					activeDoctor={activeDoctor}
					isDrawerOpen={!isSpecialtyCollapsed}
					onToggleDrawer={(open: boolean) => setIsSpecialtyCollapsed(!open)}
				/>

				<VisitFlowProgress result={dashboard?.visitFlowResult ?? null} />
			</div>

			<React.Suspense fallback={null}>
				<VisitEmkCanvas
					activeEmkTab={activeEmkTab}
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
					effectiveActiveTooth={effectiveActiveTooth}
					activePatient={activePatient}
					dashboard={dashboard}
					openVisitId={openVisitId || ""}
					setIsSoapTemplatesModalOpen={setIsSoapTemplatesModalOpen}
					handleCompleteVisitAndGenerateReceipt={async () => {
						await handleCompleteVisitAndGenerateReceipt();
					}}
					isCompletingVisit={isCompletingVisit}
					onApplySoapPreset={handleApplySoapPreset}
				/>
			</React.Suspense>

			<VisitEmkCompletionSection
				isSignedVisit={isSignedVisit}
				isRevisingVisitNote={isRevisingVisitNote}
				setIsRevisingVisitNote={setIsRevisingVisitNote}
				handleSaveVisitNote={handleSaveVisitNote}
				handleCompleteVisitAndGenerateReceipt={async () => {
					await handleCompleteVisitAndGenerateReceipt();
				}}
				isDraftAccepting={isDraftAccepting}
				isCompletingVisit={isCompletingVisit}
				completionResult={completionResult}
				completionError={completionError}
				setIsSbpQrModalOpen={setIsSbpQrModalOpen}
				activeEmkTab={activeEmkTab}
				setActiveEmkTab={setActiveEmkTab}
				followupSlotChipsNode={
					<EmkInlineFollowupChips
						slots={nextFreeSlots}
						bookingSlotKey={bookingSlotKey}
						onBookSlot={handleBookFollowupSlot}
					/>
				}
			/>

			<VisitEmkModals
				isSbpQrModalOpen={isSbpQrModalOpen}
				setIsSbpQrModalOpen={setIsSbpQrModalOpen}
				completionResult={completionResult}
				activePatient={activePatient}
				activeDoctor={activeDoctor}
				isStarProtocolsOpen={isStarProtocolsOpen}
				setIsStarProtocolsOpen={setIsStarProtocolsOpen}
				isSoapTemplatesModalOpen={isSoapTemplatesModalOpen}
				setIsSoapTemplatesModalOpen={setIsSoapTemplatesModalOpen}
				isConsentModalOpen={isConsentModalOpen}
				setIsConsentModalOpen={setIsConsentModalOpen}
				isPrintModalOpen={isPrintModalOpen}
				setIsPrintModalOpen={setIsPrintModalOpen}
				visitNoteForm={visitNoteForm}
				updateVisitNoteField={updateVisitNoteField}
				isSignedVisit={isSignedVisit}
				dashboard={dashboard}
				onApplyCatalogPatch={handleApplyCatalogPatch}
			/>


		</div>
	);
}
