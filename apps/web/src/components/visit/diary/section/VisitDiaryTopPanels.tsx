import type React from "react";
import { VisitDiaryPresetsAccordion } from "./VisitDiaryPresetsAccordion";
import { VisitDiaryAnesthesiaBar } from "../VisitDiaryAnesthesiaBar";
import { VisitDiaryLoadingBanners } from "./VisitDiaryLoadingBanners";
import { VisitDiarySuggestionBanner } from "./VisitDiarySuggestionBanner";

export interface VisitDiaryTopPanelsProps {
	readonly logic: any;
	readonly modals: any;
	readonly ctx: any;
	readonly patientInfo: any;
	readonly perio: any;
	readonly patientId?: string | undefined;
	readonly visitId: string;
	readonly handleApplyNorm: () => void;
	readonly handleDisposalCarpules: (c: number, b: string) => void;
	readonly ensureRevisingIfLocked: () => void;
}

export const VisitDiaryTopPanels: React.FC<VisitDiaryTopPanelsProps> = ({
	logic,
	modals,
	ctx,
	patientInfo,
	perio,
	patientId,
	visitId,
	handleApplyNorm,
	handleDisposalCarpules,
	ensureRevisingIfLocked,
}) => {
	return (
		<>
			<VisitDiaryPresetsAccordion
				fieldsDisabled={false}
				activeTeeth={patientInfo.activeTeeth}
				onPopulateFromOdontogram={logic.populateFromOdontogram}
				onApplyNorm={handleApplyNorm}
				handleInsertPerioStatus={perio.handleInsertPerioStatus}
				handleApplyPerioPathology={perio.handleApplyPerioPathology}
				handleInsertPediatricStatus={perio.handleInsertPediatricStatus}
				applyClinicalPreset={logic.applyClinicalPreset}
				onOpenTemplatesModal={() => modals.setShowTemplatesModal(true)}
				isLocked={logic.isLocked}
				isRevising={logic.isRevising}
				beginRevise={logic.beginRevise}
				setDiary={logic.setDiary}
				setIcdSearch={logic.setIcdSearch}
				scheduleDebouncedSave={logic.scheduleDebouncedSave}
			/>

			<VisitDiaryAnesthesiaBar
				fieldsDisabled={false}
				activePatient={ctx.activePatient}
				diary={logic.diary}
				doctorName={patientInfo.doctorName}
				isLocked={logic.isLocked}
				isRevising={logic.isRevising}
				beginRevise={logic.beginRevise}
				applyAnesthesiaPreset={logic.applyAnesthesiaPreset}
				onDisposalCarpules={handleDisposalCarpules}
				visitId={visitId}
				{...(patientId ? { patientId } : {})}
			/>

			<VisitDiaryLoadingBanners
				loadState={logic.loadState}
				loadStateText={logic.loadStateText}
				diarySubject={logic.diarySubject}
				onRetry={logic.reloadDiary}
			/>

			{logic.pendingSoapSuggestion && (
				<VisitDiarySuggestionBanner
					suggestion={logic.pendingSoapSuggestion}
					onApply={() => {
						ensureRevisingIfLocked();
						logic.applyPendingSoapSuggestion();
					}}
					onDismiss={logic.dismissPendingSoapSuggestion}
				/>
			)}
		</>
	);
};
