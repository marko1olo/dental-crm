import type React from "react";
import "./diaryStyles/index.css";
export * from "./diary/visitDiaryTypes";
import type { VisitDiarySectionProps } from "./diary/visitDiaryTypes";
import { VisitDiarySoapFields } from "./diary/VisitDiarySoapFields";
import { VisitDiaryRevisionsHistory } from "./diary/VisitDiaryRevisionsHistory";
import { VisitDiaryHeader } from "./diary/section/VisitDiaryHeader";
import { VisitDiaryTopPanels } from "./diary/section/VisitDiaryTopPanels";
import { VisitDiaryActionsFooter } from "./diary/section/VisitDiaryActionsFooter";
import { VisitDiaryModalsHost } from "./diary/section/VisitDiaryModalsHost";
import { useVisitDiarySectionView } from "./diary/section/useVisitDiarySectionView";

export const VisitDiarySection: React.FC<VisitDiarySectionProps> = ({
	visitId,
	patientId,
	teethData = [],
}) => {
	const {
		logic,
		modals,
		ctx,
		patientInfo,
		ensureRevisingIfLocked,
		icd,
		perio,
		handleDisposalCarpules,
		handleApplyNorm,
		handleAutoResize,
		handleCompleteVisitAndBilling,
		icdEntry,
	} = useVisitDiarySectionView(visitId, patientId, teethData);

	// Мандат 8e & 8k: поля никогда не блокируются, onDisposalCarpules дезинфекция 1 клик без комиссии, списание по FEFO в 1 клик без комиссии
	const fieldsDisabled = false;

	return (
		<div className="clinical-diary vde-043 no-print" data-testid="visit-diary-editor" data-tour="visit-diary" data-form="medical-diary">
			<div className="clinical-diary__glow vde-043__glow" aria-hidden="true" />

			<VisitDiaryHeader
				logic={logic}
				modals={modals}
				onApplyNorm={handleApplyNorm}
			/>

			<VisitDiaryTopPanels
				logic={logic}
				modals={modals}
				ctx={ctx}
				patientInfo={patientInfo}
				perio={perio}
				patientId={patientId}
				visitId={visitId}
				handleApplyNorm={handleApplyNorm}
				handleDisposalCarpules={handleDisposalCarpules}
				ensureRevisingIfLocked={ensureRevisingIfLocked}
			/>

			<VisitDiarySoapFields
				diary={logic.diary}
				setDiary={logic.setDiary}
				fieldsDisabled={fieldsDisabled}
				fieldInterimMap={modals.fieldInterimMap}
				setFieldInterimMap={modals.setFieldInterimMap}
				ensureRevisingIfLocked={ensureRevisingIfLocked}
				scheduleDebouncedSave={logic.scheduleDebouncedSave}
				handleAutoResize={handleAutoResize}
				handleAddComplaintChip={perio.handleAddComplaintChip}
				icdRef={logic.icdRef}
				icdSearch={logic.icdSearch}
				setIcdSearch={logic.setIcdSearch}
				showIcdDropdown={logic.showIcdDropdown}
				setShowIcdDropdown={logic.setShowIcdDropdown}
				filteredIcd={icd.filteredIcd}
				handleIcdSelect={icd.handleIcdSelect}
				commitIcdInput={icd.commitIcdInput}
				visitId={visitId}
				diaryId={logic.diaryId}
				isLocked={logic.isLocked}
				handlePrintPhotosChange={modals.setPrintPhotos}
			/>

			<VisitDiaryActionsFooter
				isLocked={logic.isLocked}
				isSaving={logic.isSaving}
				doSave={logic.doSave}
				ensureDraftSavedForSigning={logic.ensureDraftSavedForSigning}
				doLock={logic.doLock}
				diaryHash={logic.diaryHash}
				lockedAt={logic.lockedAt}
				isRevising={logic.isRevising}
				revisionReason={logic.revisionReason}
				setRevisionReason={logic.setRevisionReason}
				cancelRevise={logic.cancelRevise}
				isRevisingBusy={logic.isRevisingBusy}
				doRevise={logic.doRevise}
				beginRevise={logic.beginRevise}
				diaryDoctorFullName={logic.diaryDoctorFullName}
				hasCryptoSignature={logic.hasCryptoSignature}
				revisionCount={logic.revisionCount}
				setShowPreview={logic.setShowPreview}
				onCompleteVisitAndBilling={handleCompleteVisitAndBilling}
			/>

			<VisitDiaryRevisionsHistory revisionCount={logic.revisionCount} diaryRevisions={logic.diaryRevisions} />

			<VisitDiaryModalsHost
				modals={modals}
				logic={logic}
				patientInfo={patientInfo}
				ctx={ctx}
				icdEntry={icdEntry}
				patientId={patientId}
			/>
		</div>
	);
};
