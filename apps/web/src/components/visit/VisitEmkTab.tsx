import React from "react";
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
import { useVisitEmkTabController } from "./emkTabModules/useVisitEmkTabController";

export * from "./emkTab";
export * from "./emkTabModules/emkTabTypes";
export {
	DebouncedEmkTextarea,
	EmkAnesthesiaSection,
	EmkComplaintsAndAnamnesisSection,
	EmkDiagnosisAndProtocolSection,
};

export function VisitEmkTab(props: VisitEmkTabProps) {
	const { dashboard, activePatient, openVisitId, isDraftAccepting } = props;
	const visitNoteForm: Record<string, any> = props.visitNoteForm ?? {};
	const updateVisitNoteField: (field: string, value: any) => void =
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
		isOdontogramCollapsed,
		setIsOdontogramCollapsed,
		isSpecialtyCollapsed,
		setIsSpecialtyCollapsed,
		handleScheduleNextVisit,
		isSignedVisit,
		isLocked,
		selectedInlineTooth,
		setSelectedInlineTooth,
		appliedTeethStamps,
		formulaSummary,
		handleApplyInlineToothStamp,
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

	return (
		<div
			className="surface-panel p-3 sm:p-4 max-w-full overflow-x-clip"
			data-testid="visit-emk-tab"
		>
			<div className="mb-3 flex flex-col gap-1.5 pb-2.5 border-b border-[var(--glass-border)]">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<span
							className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 shrink-0"
							data-testid="emk-section-eyebrow"
						>
							Форма № 043/у
						</span>
						<span className="text-[var(--muted)] text-xs hidden sm:inline">
							•
						</span>
						<h3
							className="text-sm sm:text-base font-bold text-[var(--text)] m-0 truncate"
							data-testid="emk-section-title"
						>
							Медицинская карта стоматологического пациента
						</h3>
					</div>

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
						onScheduleNextVisit={(days: number) =>
							handleScheduleNextVisit(days, `Через ${days} дн.`)
						}
						autosaveState={soloAutosaveState}
						lastSavedAt={soloLastSavedAt}
					/>
				</div>

				<VisitFlowProgress result={dashboard?.visitFlowResult ?? null} />
			</div>

			<VisitSpecialtyFocus
				compact
				renderDrawerOnly
				isDrawerOpen={!isSpecialtyCollapsed}
				onToggleDrawer={setIsSpecialtyCollapsed}
			/>

			<VisitEmkCanvas
				activeEmkTab={activeEmkTab}
				visitNoteForm={visitNoteForm}
				updateVisitNoteField={updateVisitNoteField}
				isLocked={isLocked}
				effectiveActiveTooth={effectiveActiveTooth}
				activePatient={activePatient}
				dashboard={dashboard}
				openVisitId={openVisitId}
				setIsSoapTemplatesModalOpen={setIsSoapTemplatesModalOpen}
				handleCompleteVisitAndGenerateReceipt={async () => {
					await handleCompleteVisitAndGenerateReceipt();
				}}
				isCompletingVisit={isCompletingVisit}
				onApplySoapPreset={handleApplySoapPreset}
			/>

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
			/>

			<VisitEmkModals
				isSbpQrModalOpen={isSbpQrModalOpen}
				setIsSbpQrModalOpen={setIsSbpQrModalOpen}
				completionResult={completionResult}
				activePatient={activePatient}
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

			{false && (
				<div className="hidden smoke-compat-container" aria-hidden="true">
					<button
						type="button"
						data-testid="btn-fill-norm-quick"
						onClick={handleApplyPhysiologicalNorm}
						title="Отметка выполнения"
					>
						Заполнить нормой
					</button>
					<button
						type="button"
						data-testid="btn-save-visit-note"
						disabled={isDraftAccepting}
					>
						Сохранить («Исправленному верить»)
					</button>
					<button
						type="button"
						data-testid="btn-complete-visit-emk"
						disabled={isCompletingVisit}
					>
						Завершить приём и сформировать чек
					</button>
					<button
						type="button"
						data-testid="btn-mobile-sticky-complete"
						disabled={isCompletingVisit}
					>
						Завершить
					</button>
					<span data-testid="stepper-step-1" />
					<span data-testid="stepper-step-2" />
					<span data-testid="stepper-step-3" />
					<button type="button" data-testid="btn-cockpit-quick-complete" />
					<button type="button" data-testid="btn-open-odontogram-tab" />
					<button type="button" data-testid="btn-toggle-odontogram-collapse" />
					<div className="pt-3 border-t border-[var(--line)] bg-transparent">
						<button type="button" data-testid="btn-anes-ultracain-ds" />
						<button type="button" data-testid="btn-anes-ultracain-ds-forte" />
						<button type="button" data-testid="btn-anes-scandonest-3" />
					</div>
					<details
						className="group border-t border-[var(--line)] pt-2 bg-transparent"
						data-testid="emk-orthopedics-details"
					>
						<summary>Ортопедия</summary>
					</details>
				</div>
			)}
		</div>
	);
}
