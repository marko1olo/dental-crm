import type React from "react";
import type { DiaryState } from "../../useVisitDiaryLogic";
import type { ICD10_DICTIONARY } from "../../../lib/icd10";
import type { DiaryPrintPhoto } from "../../VisitDiaryPhotoUpload";

export interface VisitDiarySoapFieldsProps {
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly fieldsDisabled: boolean;
	readonly fieldInterimMap: {
		readonly anamnesis?: string;
		readonly statusLocalis?: string;
		readonly treatmentDescription?: string;
		readonly complications?: string;
	};
	readonly setFieldInterimMap: React.Dispatch<
		React.SetStateAction<{
			anamnesis?: string;
			statusLocalis?: string;
			treatmentDescription?: string;
			complications?: string;
		}>
	>;
	readonly ensureRevisingIfLocked: () => void;
	readonly scheduleDebouncedSave: () => void;
	readonly handleAutoResize: (e: React.ChangeEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>) => void;
	readonly handleAddComplaintChip: (chipText: string) => void;
	readonly icdRef: React.RefObject<HTMLDivElement | null>;
	readonly icdSearch: string;
	readonly setIcdSearch: (val: string) => void;
	readonly showIcdDropdown: boolean;
	readonly setShowIcdDropdown: (val: boolean) => void;
	readonly filteredIcd: readonly (typeof ICD10_DICTIONARY)[number][];
	readonly handleIcdSelect: (code: string) => void;
	readonly commitIcdInput: () => void;
	readonly visitId: string;
	readonly diaryId?: string | null;
	readonly isLocked: boolean;
	readonly handlePrintPhotosChange: (photos: readonly DiaryPrintPhoto[]) => void;
}
