import type React from "react";
import type { DiaryLoadState, DiaryRevisionRow, DiaryState } from "../diaryLogicTypes";

export interface UseVisitDiaryStatusHandlersParams {
	readonly visitId: string;
	readonly patientId: string;
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly diaryRef: React.MutableRefObject<DiaryState>;
	readonly activeDoctor: any;
	readonly authRef: React.MutableRefObject<any>;
	readonly loadState: DiaryLoadState;
	readonly setLoadState: React.Dispatch<React.SetStateAction<DiaryLoadState>>;
	readonly diaryId: string | null;
	readonly setDiaryId: React.Dispatch<React.SetStateAction<string | null>>;
	readonly isLocked: boolean;
	readonly setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
	readonly lockedAt: string | null;
	readonly setLockedAt: React.Dispatch<React.SetStateAction<string | null>>;
	readonly diaryHash: string | null;
	readonly setDiaryHash: React.Dispatch<React.SetStateAction<string | null>>;
	readonly hasCryptoSignature: boolean;
	readonly setHasCryptoSignature: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setDiaryDoctorFullName: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setDiaryDoctorSpecialty: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setLastSavedAt: React.Dispatch<React.SetStateAction<Date | null>>;
	readonly setRevisionCount: React.Dispatch<React.SetStateAction<number>>;
	readonly setDiaryRevisions: React.Dispatch<React.SetStateAction<DiaryRevisionRow[]>>;
	readonly localDiaryStorageKey: string;
}
