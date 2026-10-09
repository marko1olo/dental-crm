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
	PediatricCariogramSection,
	PediatricFranklSection,
} from "./pediatricModal";
import "./odontogram.css";
import "./pediatricMixedDentition.css";

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
		>
			<div
				className="relative flex flex-col w-full max-w-5xl max-h-[calc(100dvh-32px)] bg-[var(--odontogram-paper,var(--paper-strong,var(--paper,#ffffff)))] dark:bg-slate-900 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 rounded-2xl sm:rounded-3xl border border-[var(--odontogram-border,var(--line,#cbd5e1))] dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
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
						onInsertCariogramTo043={logic.handleInsertCariogramTo043}
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
						<PediatricCariogramSection
							cariogramInput={logic.cariogramInput}
							onCariogramInputChange={logic.setCariogramInput}
							cariogramResult={logic.cariogramResult}
							onInsertCariogramTo043={logic.handleInsertCariogramTo043}
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

				<div className="flex items-center justify-between p-4 sm:px-8 border-t border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 text-xs sm:text-sm">
					<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
						DENTE Dental CRM • Детский и сменный прикус
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] sm:min-h-[32px] px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer select-none active:scale-95"
					>
						Готово
					</button>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};
