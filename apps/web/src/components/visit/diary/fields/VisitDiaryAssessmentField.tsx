import React from "react";
import { X } from "lucide-react";
import type { DiaryState } from "../../../useVisitDiaryLogic";
import { getIcdColor, ICD10_DICTIONARY as ICD_LIST, type ICD10_DICTIONARY } from "../../../../lib/icd10";
import { IcdSearchInputControl } from "./IcdSearchInputControl";

export interface SelectedIcdChipProps {
	readonly code: string;
	readonly fieldsDisabled: boolean;
	readonly onReset: () => void;
}

export const SelectedIcdChip: React.FC<SelectedIcdChipProps> = ({
	code,
	fieldsDisabled,
	onReset,
}) => {
	const label = ICD_LIST.find((i) => i.code === code)?.label ?? "Диагноз выбран";

	return (
		<div
			className={`clinical-diary__icd-chip min-h-[44px] min-w-0 break-words ${getIcdColor(code)}`}
		>
			<span className="clinical-diary__icd-code shrink-0">{code}</span>
			<span className="flex-1 min-w-0 break-words">{label}</span>
			{!fieldsDisabled && (
				<button
					type="button"
					onClick={onReset}
					className="clinical-diary__btn clinical-diary__btn--ghost clinical-diary__btn--icon shrink-0"
					title="Сбросить диагноз"
					aria-label="Сбросить диагноз"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			)}
		</div>
	);
};

export interface ToothInputFieldProps {
	readonly tooth: string;
	readonly disabled: boolean;
	readonly onChange: (tooth: string) => void;
	readonly onFocus: () => void;
}

export const ToothInputField: React.FC<ToothInputFieldProps> = ({
	tooth,
	disabled,
	onChange,
	onFocus,
}) => {
	return (
		<div className="clinical-diary__field">
			<label className="clinical-diary__label" htmlFor="diary-tooth">
				Зуб FDI
			</label>
			<input
				id="diary-tooth"
				disabled={disabled}
				className="clinical-diary__input clinical-diary__tooth-input"
				value={tooth}
				onChange={(e) => onChange(e.target.value)}
				onFocus={onFocus}
				placeholder="16, 36..."
				maxLength={32}
			/>
		</div>
	);
};

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
		<div className="clinical-diary__assessment">
			<div className="clinical-diary__assessment-grid">
				<div className="clinical-diary__field" ref={icdRef}>
					<label className="clinical-diary__label" htmlFor="diary-icd-search">
						<span className="clinical-diary__letter clinical-diary__letter--a">III</span> — Диагноз
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
