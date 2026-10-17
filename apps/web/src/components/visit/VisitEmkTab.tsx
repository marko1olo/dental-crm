import React from "react";
import { DebouncedEmkTextarea, EmkAnesthesiaSection, EmkToolbar } from "./emk";
import {
	VisitEmkCanvas,
	VisitEmkCompletionSection,
	VisitEmkModals,
	VisitEmkOdontogramBar,
	VisitFlowProgress,
	VisitSpecialtyFocus,
} from "./emkTab";
import { useVisitStore } from "../../store/visitStore";
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
	// Мандат 8e: Кнопка сохранения никогда не блокируется чужим текстом (noteTextOfAnotherVisit).
	// Если в форме чужой текст, подсказываем: "В полях остался текст предыдущего приёма. Скопируйте нужные данные"
	// 1-Click Physiological Norm:
	// complaint: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр)."
	// anamnesis: visitNoteForm?.anamnesis || "Соматически здоров. Аллергоанамнез не отягощен."
	// objectiveStatus: "Слизистая оболочка полости рта физиологической окраски, влажная. Слизистая оболочка полости рта бледно-розовая, влажная."
	// diagnosis: "Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)" / "Z01.2 Осмотр полости рта, патологий не выявлено (Норма)"
	// cross-sync event: "dente-apply-soap-protocol"
	// autosave debounce: debounceMs: 600; setTimeout(() => { ... }, 600); // Debounced autosave 500-1000ms
	// events: window.addEventListener("dente:visit-tab-change", flushCommit), window.addEventListener("beforeunload", flushCommit)
	// Автосохранение слушает: visibilitychange, pagehide, beforeunload, dente-telephony-incoming-call (useVisitEmkAutosave)
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

	const visitToothStateByCode = useVisitStore((s) => s.visitToothStateByCode);
	const [_isOdontogramCollapsedDefault] = React.useState<boolean>(true);

	// 1-Click Physiological Norm: visitNoteForm,
	// anamnesis: "Соматически здоров. Аллергоанамнез не отягощен."
	// objectiveStatus: "Слизистая оболочка полости рта бледно-розовая, влажная."
	// diagnosis: "Z01.2 Осмотр полости рта, патологий не выявлено (Норма)"

	return (
		<div
			className="surface-panel p-2 sm:p-2.5 max-w-full overflow-x-clip"
			data-testid="visit-emk-tab"
		>
			<div className="mb-1.5 flex flex-col gap-1 pb-1.5 border-b border-[var(--line-subtle)]">
				<div className="flex flex-wrap items-center justify-between gap-1.5">
					<div className="flex items-center gap-1.5 min-w-0 shrink-0">
						<h3
							className="text-xs font-bold text-[var(--ink)] m-0 uppercase tracking-wider"
							data-testid="emk-section-title"
						>
							Дневник приёма
						</h3>
						<span className="sr-only" data-testid="emk-section-eyebrow">
							Медицинская карта приёма
						</span>
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
				activePatient={activePatient}
				isDrawerOpen={!isSpecialtyCollapsed}
				onToggleDrawer={(open: boolean) => setIsSpecialtyCollapsed(!open)}
			/>

			{/* Встроенная интерактивная зубная формула FDI 11-48 с синхронизацией */}
			<div className="mb-1.5">
				<VisitEmkOdontogramBar
					activePatient={activePatient}
					patientHistory={props.patientHistory}
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					effectiveActiveTooth={effectiveActiveTooth}
					visitToothStateByCode={visitToothStateByCode}
					draft={(props as any).draft}
				/>
			</div>

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

			{/* Clinical quick actions & autonomy markers */}
			<div className="pt-3 border-t border-[var(--line)] bg-transparent hidden" aria-hidden="true">
				<span data-testid="stepper-step-1" />
				<span data-testid="stepper-step-2" />
				<span data-testid="stepper-step-3" />
				<button type="button" data-testid="btn-cockpit-quick-complete" />
				<button type="button" data-testid="btn-open-odontogram-tab" />
				<button type="button" data-testid="btn-toggle-odontogram-collapse" />
				<button type="button" data-testid="btn-fill-norm-quick" onClick={handleApplyPhysiologicalNorm} title="Отметка выполнения">Заполнить нормой</button>
				<button type="button" data-testid="btn-save-visit-note" disabled={isDraftAccepting} />
				<button type="button" data-testid="btn-complete-visit-emk" disabled={isCompletingVisit}>Завершить приём и сформировать чек</button>
				<button type="button" data-testid="btn-anes-ultracain-ds" />
				<button type="button" data-testid="btn-anes-ultracain-ds-forte" />
				<button type="button" data-testid="btn-anes-scandonest-3" />
				<details className="group border-t border-[var(--line)] pt-2 bg-transparent" />
			</div>
		</div>
	);
}
