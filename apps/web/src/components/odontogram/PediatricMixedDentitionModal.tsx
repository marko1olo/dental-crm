import React from "react";
import { createPortal } from "react-dom";
import { PediatricParentMemoModal } from "../pediatric";
import { PediatricResorptionTab } from "./PediatricResorptionTab";
import {
	type PediatricAgePreset,
	type PediatricMixedDentitionModalProps,
	PEDIATRIC_AGE_PRESETS,
	usePediatricModalLogic,
	PediatricModalHeader,
	PediatricQuickProtocols,
	PediatricResorptionTimeline,
	PediatricFranklSection,
} from "./pediatricModal";
import { PediatricCariogramTab } from "./PediatricCariogramTab";
import "./odontogram.css";

export type { PediatricAgePreset, PediatricMixedDentitionModalProps };
export { PEDIATRIC_AGE_PRESETS };

export const PediatricMixedDentitionModal: React.FC<PediatricMixedDentitionModalProps> = (props) => {
	const { isOpen, onClose, onApplyAgeArch, onUpdateToothResorption, onBatchUpdateResorption } = props;
	const logic = usePediatricModalLogic(props);

	if (!isOpen) return null;

	// Anti-Matryoshka (Sin 6, Mandate 8d): Render child modal sequentially (depth strictly 1).
	if (logic.isParentMemoModalOpen) {
		return (
			<PediatricParentMemoModal
				isOpen={true}
				onClose={() => logic.setIsParentMemoModalOpen(false)}
				onBack={() => logic.setIsParentMemoModalOpen(false)}
				initialFrankl={logic.franklRating}
				patientAgeYears={logic.selectedAge}
			/>
		);
	}

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pediatric-modal-title"
			data-testid="pediatric-studio-modal"
		>
			<div
				className="relative flex flex-col w-full max-w-5xl max-h-[calc(100dvh-32px)] bg-[var(--odontogram-paper,var(--paper))] text-[var(--odontogram-ink,var(--ink))] rounded-2xl sm:rounded-3xl border border-[var(--odontogram-border,var(--line))] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<PediatricModalHeader
					activeTab={logic.activeTab}
					onTabChange={logic.setActiveTab}
					onClose={onClose}
				/>

				<div className="flex-[1_1_auto] min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 md:p-8 pb-28 sm:pb-8 space-y-6 touch-pan-y">
					<PediatricQuickProtocols
						onApplyPrimaryNorm={logic.handleApplyPrimaryNorm}
						onApplyFirstMolarNorm={logic.handleApplyFirstMolarNorm}
						onApplyEarlyMixedNorm={logic.handleApplyEarlyMixedNorm}
						onApplyPermanentNorm={logic.handleApplyPermanentNorm}
						onApplyProcedurePreset={logic.handleApplyProcedurePreset}
						onInsertCariogramToClinicalNote={logic.handleInsertCariogramToClinicalNote}
					/>

					{logic.activeTab === "timeline" && (
						<PediatricResorptionTimeline
							selectedAge={logic.selectedAge}
							onSelectAge={logic.setSelectedAge}
							timelineAnalysis={logic.timelineAnalysis}
							hasFirstPermanentMolars={logic.hasFirstPermanentMolars}
							upperRow={logic.upperRow}
							lowerRow={logic.lowerRow}
							onApplyAgeArch={onApplyAgeArch}
						/>
					)}

					{logic.activeTab === "cariogram" && (
						<PediatricCariogramTab
							cariogramInput={logic.cariogramInput}
							onCariogramInputChange={logic.setCariogramInput}
							cariogramResult={logic.cariogramResult}
							onInsertCariogramToMedicalCard={logic.handleInsertCariogramToMedicalCard}
						/>
					)}

					{logic.activeTab === "resorption" && (
						<PediatricResorptionTab
							selectedPrimaryTooth={logic.selectedPrimaryTooth}
							onSelectPrimaryTooth={logic.setSelectedPrimaryTooth}
							selectedResorptionStage={logic.selectedResorptionStage}
							onSelectResorptionStage={logic.setSelectedResorptionStage}
							onUpdateToothResorption={onUpdateToothResorption}
							onBatchUpdateResorption={onBatchUpdateResorption}
							patientAgeYears={logic.selectedAge}
							onAgeChange={logic.setSelectedAge}
						/>
					)}

					{logic.activeTab === "frankl" && (
						<PediatricFranklSection
							rating={logic.franklRating}
							onChangeRating={logic.setFranklRating}
							onOpenParentMemo={() => logic.setIsParentMemoModalOpen(true)}
						/>
					)}
				</div>

				<div className="flex items-center justify-between p-4 sm:px-8 border-t border-[var(--odontogram-border-subtle,var(--line))] bg-[var(--odontogram-surface,var(--paper-soft))] text-xs sm:text-sm">
					<div className="text-xs sm:text-sm font-medium text-[var(--odontogram-ink-muted,var(--ink-muted))]">
						DENTE Dental CRM • Детский и сменный прикус
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="dente-btn dente-btn-secondary border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] min-h-[44px] sm:min-h-[36px] px-5 py-2 text-sm font-medium transition-all cursor-pointer select-none active:scale-95"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={onClose}
							className="dente-btn dente-btn-primary bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] min-h-[44px] sm:min-h-[36px] px-7 py-2 text-sm font-medium shadow-md shadow-[var(--primary)]/20 transition-all cursor-pointer select-none active:scale-95"
						>
							Готово
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};
