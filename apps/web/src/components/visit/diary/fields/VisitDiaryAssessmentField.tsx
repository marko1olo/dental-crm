import React from "react";
import type { DiaryState } from "../../../useVisitDiaryLogic";
import type { ICD10_DICTIONARY } from "../../../../lib/icd10";
import { SelectedIcdChip } from "./SelectedIcdChip";
import { ToothInputField } from "./ToothInputField";
import { IcdSearchInputControl } from "./IcdSearchInputControl";

export interface VisitDiaryAssessmentFieldProps {
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly fieldsDisabled: boolean;
	readonly ensureRevisingIfLocked: () => void;
	readonly scheduleDebouncedSave: () => void;
	readonly icdRef: React.RefObject<HTMLDivElement | null>;
	readonly icdSearch: string;
	readonly setIcdSearch: (val: string) => void;
	readonly showIcdDropdown: boolean;
	readonly setShowIcdDropdown: (val: boolean) => void;
	readonly filteredIcd: readonly (typeof ICD10_DICTIONARY)[number][];
	readonly handleIcdSelect: (code: string) => void;
	readonly commitIcdInput: () => void;
}

export const VisitDiaryAssessmentField: React.FC<VisitDiaryAssessmentFieldProps> = ({
	diary,
	setDiary,
	fieldsDisabled,
	ensureRevisingIfLocked,
	scheduleDebouncedSave,
	icdRef,
	icdSearch,
	setIcdSearch,
	showIcdDropdown,
	setShowIcdDropdown,
	filteredIcd,
	handleIcdSelect,
	commitIcdInput,
}) => {
	const selectedIcd = diary.diagnosisIcd10;

	return (
		<div className="vde-043__assessment">
			<div className="vde-043__assessment-grid">
				<div className="vde-043__field" ref={icdRef}>
					<label className="vde-043__label" htmlFor="diary-icd-search">
						<span className="vde-043__letter vde-043__letter--a">III</span> — Диагноз
					</label>
					{selectedIcd ? (
						<SelectedIcdChip
							code={selectedIcd}
							fieldsDisabled={fieldsDisabled}
							onReset={() => {
								ensureRevisingIfLocked();
								setDiary((p) => ({ ...p, diagnosisIcd10: "" }));
								setIcdSearch("");
								scheduleDebouncedSave();
							}}
						/>
					) : (
						<IcdSearchInputControl
							icdSearch={icdSearch}
							fieldsDisabled={fieldsDisabled}
							showIcdDropdown={showIcdDropdown}
							filteredIcd={filteredIcd}
							onSearchChange={(val) => {
								ensureRevisingIfLocked();
								setIcdSearch(val);
								setShowIcdDropdown(true);
							}}
							onSearchFocus={() => {
								ensureRevisingIfLocked();
								setShowIcdDropdown(true);
							}}
							onClearSearch={() => {
								setIcdSearch("");
								setShowIcdDropdown(false);
							}}
							onCommitInput={commitIcdInput}
							onSelectIcd={handleIcdSelect}
						/>
					)}
				</div>

				<ToothInputField
					tooth={diary.diagnosisTooth}
					disabled={fieldsDisabled}
					onChange={(val) => {
						ensureRevisingIfLocked();
						setDiary((p) => ({ ...p, diagnosisTooth: val }));
						scheduleDebouncedSave();
					}}
					onFocus={ensureRevisingIfLocked}
				/>
			</div>
		</div>
	);
};
