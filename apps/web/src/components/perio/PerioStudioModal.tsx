/**
 * PerioStudioModal.tsx — Канонический SSOT кабинет пародонтологии и экспресс-скрининга PSR DENTE CRM.
 * Объединяет экспресс-скрининг ВОЗ (PSR) по 6 секстантам, клинические протоколы профгигиены/кюретажа/шинирования,
 * списание расходников пакетом (Soft Negative Stock, Мандат 8n), автономию врача (Мандат 8e),
 * и ровно ОДНУ Primary CTA кнопку (var(--primary)) на видимый контекст (Мандат 8am).
 * Норматив размера: <= 300 строк (Мандат 8b / DEF-PERIO-03).
 */

import React, { useId } from "react";
import { Check } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { PerioPresetActions } from "./PerioPresetActions";
import { PerioStudioHeader } from "./PerioStudioHeader";
import { PerioPsrSextantsGrid } from "./PerioPsrSextantsGrid";
import { PerioProtocolsAndConclusion } from "./PerioProtocolsAndConclusion";
import { PerioDetailedProbeSection } from "./PerioDetailedProbeSection";
import { PerioIndicesPanel } from "./PerioIndicesPanel";
import { PerioPrintFooter } from "./PerioPrintFooter";
import { usePerioStudioState, type UsePerioStudioStateProps } from "./usePerioStudioState";

export type PerioStudioModalProps = UsePerioStudioStateProps;

export const PerioStudioModal: React.FC<PerioStudioModalProps> = React.memo((props) => {
	const {
		isOpen = true,
		onClose,
		isModal = false,
		patientName = "Пациент приёма",
		doctorName = "Лечащий врач",
		onInsertToProtocol,
	} = props;

	const modalId = useId();

	const {
		teeth,
		screeningMap,
		summary,
		psrSummary,
		olearySummary,
		ohiResult,
		pmaResult,
		isDetailedExpanded,
		setIsDetailedExpanded,
		selectedProtocolId,
		selectedToothNum,
		setSelectedToothNum,
		selectedSiteKey,
		setSelectedSiteKey,
		syncStatus,
		showIndicesPanel,
		setShowIndicesPanel,
		handleUpdateDepth,
		handleToggleBop,
		handleTogglePlaque,
		handleToggleSuppuration,
		handleUpdateGingivalMargin,
		handleUpdateMobility,
		handleUpdateFurcation,
		updateSextant,
		toggleAsterisk,
		handleSetAllIntact,
		handleApplyUpperJawNorm,
		handleApplyLowerJawNorm,
		handleApplyZeroBop,
		handleApplyZeroCalculus,
		handleApplyPreset,
		handleSelectProtocol,
		handleSave,
		handleClose,
		handlePrintProtocol,
	} = usePerioStudioState(props);

	if (!isOpen) return null;

	const content = (
		<div
			id={modalId}
			data-testid="interactive-periodontogram"
			className="interactive-periodontogram flex flex-col gap-2 select-none relative rounded-t-[24px] sm:rounded-2xl p-3 sm:p-3.5 pb-28 sm:pb-3 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xl w-full max-w-full overflow-x-clip"
		>
			<div className="w-9 h-1 rounded-full bg-[var(--line)] mx-auto my-0.5 sm:hidden print:hidden" aria-hidden="true" />
			{/* Шапка студии */}
			<PerioStudioHeader
				psrFormula={psrSummary.psrFormula}
				patientName={patientName}
				summary={summary}
				syncStatus={syncStatus}
				isModal={isModal}
				onPrintProtocol={handlePrintProtocol}
				onToggleIndices={() => setShowIndicesPanel((prev) => !prev)}
				onSave={handleSave}
				onClose={onClose ? handleClose : undefined}
			/>

			<PerioIndicesPanel
				isOpen={showIndicesPanel}
				onClose={() => setShowIndicesPanel(false)}
				olearySummary={olearySummary}
				ohiResult={ohiResult}
				pmaResult={pmaResult}
				summary={summary}
				psrFormula={psrSummary.psrFormula}
				suggestedDiagnosisRu={psrSummary.suggestedDiagnosisRu}
				icd10Code={psrSummary.icd10Code}
				onInsertDiagnosisToVisit={(icd, diag) => {
					try {
						useVisitStore.getState().setVisitNoteForm((prev) => ({ ...prev, diagnosisIcd10: icd, diagnosis: diag }));
						if (typeof window !== "undefined") {
							window.dispatchEvent(
								new CustomEvent("dente-apply-soap-protocol", {
									detail: { diagnosisIcd10: icd, diagnosis: diag, mode: "smart_append" },
								}),
							);
						}
						showToast(`✓ Диагноз ${icd} (${diag}) внесён в приём`, "success");
					} catch {
						showToast(`Диагноз ${icd} зафиксирован`, "info");
					}
				}}
			/>

			{/* Клинические пресеты и макро-выбор челюстей */}
			<div className="perio-presets-container">
				<PerioPresetActions
					onSetAllIntact={handleSetAllIntact}
					onApplyPreset={handleApplyPreset}
					onApplyUpperJawNorm={handleApplyUpperJawNorm}
					onApplyLowerJawNorm={handleApplyLowerJawNorm}
					onApplyZeroBop={handleApplyZeroBop}
					onApplyZeroCalculus={handleApplyZeroCalculus}
				/>
			</div>

			{/* Сетка 6 секстантов экспресс-скрининга PSR */}
			<PerioPsrSextantsGrid
				screeningMap={screeningMap}
				onUpdateSextant={updateSextant}
				onToggleAsterisk={toggleAsterisk}
			/>

			{/* Клинические комплексы и заключение */}
			<PerioProtocolsAndConclusion
				selectedProtocolId={selectedProtocolId}
				onSelectProtocol={handleSelectProtocol}
				psrSummary={psrSummary}
				teeth={teeth}
				summary={summary}
				doctorName={doctorName}
				onInsertToProtocol={onInsertToProtocol}
			/>

			{/* Анатомическая карта челюстей и углубленное зондирование */}
			<div className="perio-detailed-wrapper">
				<PerioDetailedProbeSection
					isDetailedExpanded={isDetailedExpanded}
					onToggleDetailedExpanded={() => setIsDetailedExpanded((prev) => !prev)}
					teeth={teeth}
					selectedToothNum={selectedToothNum}
					onSelectToothNum={setSelectedToothNum}
					selectedSiteKey={selectedSiteKey}
					onSelectSiteKey={setSelectedSiteKey}
					onUpdateMobility={handleUpdateMobility}
					onUpdateFurcation={handleUpdateFurcation}
					onUpdateDepth={handleUpdateDepth}
					onUpdateGingivalMargin={handleUpdateGingivalMargin}
					onToggleBop={handleToggleBop}
					onTogglePlaque={handleTogglePlaque}
					onToggleSuppuration={handleToggleSuppuration}
				/>
			</div>

			{/* Печатный футер A4 с подписью врача */}
			<PerioPrintFooter patientName={patientName} />

			{/* Мобильная плавающая нижняя плашка Primary CTA (Natural Thumb Zone, DEF-PERIO-04) */}
			<div className="perio-mobile-floating-bar fixed bottom-0 left-0 right-0 p-3 pb-safe bg-[var(--paper-strong)] border-t border-[var(--line)] z-[110] flex sm:hidden">
				<button
					type="button"
					onClick={handleSave}
					aria-busy={syncStatus === "saving"}
					data-testid="perio-save-mobile-btn"
					className="min-h-[52px] w-full rounded-xl text-base font-semibold shadow-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all perio-primary-cta-btn"
				>
					<Check className="w-4 h-4" />
					{syncStatus === "saving" ? "Сохранение..." : "Сохранить пародонтограмму"}
				</button>
			</div>
		</div>
	);

	if (isModal) {
		return (
			<div
				className="fixed inset-0 z-[100] pointer-events-auto flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto perio-modal-overlay bg-slate-950/65 backdrop-blur-xs"
				data-testid="perio-chart-modal"
				role="dialog"
				aria-modal="true"
				onClick={(e) => {
					if (e.target === e.currentTarget) handleClose();
				}}
			>
				<div className="w-full max-w-7xl my-0 sm:my-auto max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl perio-modal-content">
					{content}
				</div>
			</div>
		);
	}
	return content;
});

PerioStudioModal.displayName = "PerioStudioModal";
export default PerioStudioModal;
