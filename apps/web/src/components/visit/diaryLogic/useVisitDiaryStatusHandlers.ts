import { useState } from "react";
import type { UseVisitDiaryStatusHandlersParams } from "./statusHandlersModules/diaryStatusTypes";
import { useVisitDiaryDraftSave } from "./statusHandlersModules/useVisitDiaryDraftSave";
import { useVisitDiaryLockSeal } from "./statusHandlersModules/useVisitDiaryLockSeal";
import { useVisitDiaryRevisionActions } from "./statusHandlersModules/useVisitDiaryRevisionActions";
import { useVisitDiaryTrayHandlers } from "./useVisitDiaryTrayHandlers";

export * from "./statusHandlersModules/diaryStatusTypes";
export * from "./statusHandlersModules/useVisitDiaryDoctorInfoBuilder";
export * from "./statusHandlersModules/useVisitDiaryDraftSave";
export * from "./statusHandlersModules/useVisitDiaryLockSeal";
export * from "./statusHandlersModules/useVisitDiaryRevisionActions";

/**
 * Канонический координатор статусов и подписания дневника (useVisitDiaryStatusHandlers).
 * Декомпозирован по МАНДАТУ 8b до <= 120 строк на файл:
 * - useVisitDiaryTrayHandlers: Сканирование и привязка лотков стерилизации
 * - useVisitDiaryDraftSave: Черновое сохранение и автосохранение дневника
 * - useVisitDiaryLockSeal: Подписание ЭЦП врача и фиксация от правок
 * - useVisitDiaryRevisionActions: Ревизии «Исправленному верить» и журнал правок
 */
export function useVisitDiaryStatusHandlers(params: UseVisitDiaryStatusHandlersParams) {
	const [isSaving, setIsSaving] = useState(false);

	const trayHandlers = useVisitDiaryTrayHandlers({
		visitId: params.visitId,
		patientId: params.patientId,
		diary: params.diary,
		setDiary: params.setDiary,
		activeDoctor: params.activeDoctor,
		authRef: params.authRef,
		isLocked: params.isLocked,
		isRevising: false,
		loadState: params.loadState,
		setLoadState: params.setLoadState,
		setDiaryId: params.setDiaryId,
		setDiaryHash: params.setDiaryHash,
		setLastSavedAt: params.setLastSavedAt,
		setIsSaving,
		diaryHash: params.diaryHash,
	});

	const draftSave = useVisitDiaryDraftSave({
		visitId: params.visitId,
		patientId: params.patientId,
		diary: params.diary,
		activeDoctor: params.activeDoctor,
		authRef: params.authRef,
		loadState: params.loadState,
		setLoadState: params.setLoadState,
		diaryId: params.diaryId,
		setDiaryId: params.setDiaryId,
		isLocked: params.isLocked,
		diaryHash: params.diaryHash,
		setDiaryHash: params.setDiaryHash,
		setLastSavedAt: params.setLastSavedAt,
		setIsSaving,
		trayBarcode: trayHandlers.trayBarcode,
		linkSterilizationTray: trayHandlers.linkSterilizationTray,
	});

	const lockSeal = useVisitDiaryLockSeal({
		activeDoctor: params.activeDoctor,
		loadState: params.loadState,
		diaryId: params.diaryId,
		isLocked: params.isLocked,
		trayBarcode: trayHandlers.trayBarcode,
		authRef: params.authRef,
		localDiaryStorageKey: params.localDiaryStorageKey,
		setIsLocked: params.setIsLocked,
		setLockedAt: params.setLockedAt,
		setDiaryHash: params.setDiaryHash,
		setHasCryptoSignature: params.setHasCryptoSignature,
		setDiaryDoctorFullName: params.setDiaryDoctorFullName,
		setDiaryDoctorSpecialty: params.setDiaryDoctorSpecialty,
		doSave: draftSave.doSave,
		linkSterilizationTray: trayHandlers.linkSterilizationTray,
	});

	const revisions = useVisitDiaryRevisionActions({
		diary: params.diary,
		setDiary: params.setDiary,
		diaryId: params.diaryId,
		isLocked: params.isLocked,
		trayBarcode: trayHandlers.trayBarcode,
		setTrayBarcode: trayHandlers.setTrayBarcode,
		authRef: params.authRef,
		activeDoctor: params.activeDoctor,
		setDiaryHash: params.setDiaryHash,
		setHasCryptoSignature: params.setHasCryptoSignature,
		setRevisionCount: params.setRevisionCount,
		setDiaryRevisions: params.setDiaryRevisions,
		setLastSavedAt: params.setLastSavedAt,
		setIsLocked: params.setIsLocked,
	});

	return {
		isSaving,
		...trayHandlers,
		...draftSave,
		...lockSeal,
		...revisions,
	};
}
