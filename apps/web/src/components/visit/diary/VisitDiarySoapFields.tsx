import React from "react";
import { VisitDiaryPhotoUpload } from "../../VisitDiaryPhotoUpload";
import type { VisitDiarySoapFieldsProps } from "./visitDiarySoapTypes";
import { useVisitDiarySoapStenographers } from "./useVisitDiarySoapStenographers";
import { VisitDiaryAnamnesisField } from "./fields/VisitDiaryAnamnesisField";
import { VisitDiaryObjectiveField } from "./fields/VisitDiaryObjectiveField";
import { VisitDiaryAssessmentField } from "./fields/VisitDiaryAssessmentField";
import { VisitDiaryTreatmentField } from "./fields/VisitDiaryTreatmentField";
import { VisitDiaryComplicationsField } from "./fields/VisitDiaryComplicationsField";

export { type VisitDiarySoapFieldsProps } from "./visitDiarySoapTypes";

export function VisitDiarySoapFields(props: VisitDiarySoapFieldsProps) {
	const {
		diary, setDiary, fieldsDisabled, fieldInterimMap, setFieldInterimMap,
		ensureRevisingIfLocked, scheduleDebouncedSave, handleAutoResize,
		handleAddComplaintChip, icdRef, icdSearch, setIcdSearch,
		showIcdDropdown, setShowIcdDropdown, filteredIcd, handleIcdSelect,
		commitIcdInput, visitId, diaryId, isLocked, handlePrintPhotosChange,
	} = props;

	const { anamnesisSteno, treatmentSteno, statusLocalisSteno } = useVisitDiarySoapStenographers({
		diary,
		setDiary,
		fieldsDisabled,
		ensureRevisingIfLocked,
		scheduleDebouncedSave,
	});

	return (
		<div className="clinical-diary__grid vde-043__grid">
			<VisitDiaryAnamnesisField
				diary={diary}
				setDiary={setDiary}
				fieldsDisabled={fieldsDisabled}
				interimText={fieldInterimMap.anamnesis}
				setInterimText={(text) => setFieldInterimMap((p) => ({ ...p, anamnesis: text }))}
				ensureRevisingIfLocked={ensureRevisingIfLocked}
				scheduleDebouncedSave={scheduleDebouncedSave}
				handleAutoResize={handleAutoResize}
				handleAddComplaintChip={handleAddComplaintChip}
				steno={anamnesisSteno}
			/>

			<VisitDiaryObjectiveField
				diary={diary}
				setDiary={setDiary}
				fieldsDisabled={fieldsDisabled}
				interimText={fieldInterimMap.statusLocalis ?? ""}
				setInterimText={(text) => setFieldInterimMap((p) => ({ ...p, statusLocalis: text }))}
				ensureRevisingIfLocked={ensureRevisingIfLocked}
				scheduleDebouncedSave={scheduleDebouncedSave}
				handleAutoResize={handleAutoResize}
				steno={statusLocalisSteno}
			/>

			<VisitDiaryAssessmentField
				diary={diary}
				setDiary={setDiary}
				fieldsDisabled={fieldsDisabled}
				ensureRevisingIfLocked={ensureRevisingIfLocked}
				scheduleDebouncedSave={scheduleDebouncedSave}
				icdRef={icdRef}
				icdSearch={icdSearch}
				setIcdSearch={setIcdSearch}
				showIcdDropdown={showIcdDropdown}
				setShowIcdDropdown={setShowIcdDropdown}
				filteredIcd={filteredIcd}
				handleIcdSelect={handleIcdSelect}
				commitIcdInput={commitIcdInput}
			/>

			<VisitDiaryTreatmentField
				diary={diary}
				setDiary={setDiary}
				fieldsDisabled={fieldsDisabled}
				interimText={fieldInterimMap.treatmentDescription ?? ""}
				setInterimText={(text) => setFieldInterimMap((p) => ({ ...p, treatmentDescription: text }))}
				ensureRevisingIfLocked={ensureRevisingIfLocked}
				scheduleDebouncedSave={scheduleDebouncedSave}
				handleAutoResize={handleAutoResize}
				steno={treatmentSteno}
			/>

			<VisitDiaryComplicationsField
				diary={diary}
				setDiary={setDiary}
				fieldsDisabled={fieldsDisabled}
				interimText={fieldInterimMap.complications ?? ""}
				setInterimText={(text) => setFieldInterimMap((p) => ({ ...p, complications: text }))}
				ensureRevisingIfLocked={ensureRevisingIfLocked}
				scheduleDebouncedSave={scheduleDebouncedSave}
				handleAutoResize={handleAutoResize}
			/>

			<VisitDiaryPhotoUpload
				visitId={visitId}
				diaryId={diaryId ?? null}
				isLocked={isLocked}
				onPrintPhotosChange={handlePrintPhotosChange}
			/>
		</div>
	);
}

