import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import type { DiaryState } from "./diaryLogicTypes";
import { EMPTY_DIARY } from "./diaryLogicTypes";
import {
	deleteOfflineDraft,
	loadOfflineDraft,
	saveOfflineDraft,
	saveOfflineDraftDebounced,
} from "../../../utils/offlineMutationQueue";
import { getOptimizedTiming } from "../../../utils/lowSpecHddOptimizer";
import { showToast } from "../../GlobalToast";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "../../../lib/safeLocalStorage";

export interface UseVisitDiaryDraftAutosaveParams {
	readonly visitId: string;
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly loadStatePhase: string;
	readonly setIcdSearch: React.Dispatch<React.SetStateAction<string>>;
	readonly doSaveRef: React.RefObject<
		(silent?: boolean) => Promise<{ id: string; hash: string | null } | null>
	>;
}

export function useVisitDiaryDraftAutosave({
	visitId,
	diary,
	setDiary,
	isLocked,
	isRevising,
	loadStatePhase,
	setIcdSearch,
	doSaveRef,
}: UseVisitDiaryDraftAutosaveParams) {
	const localDiaryStorageKey = `dente_diary_draft_${visitId}`;
	const [isDraftRecovered, setIsDraftRecovered] = useState(false);
	const [recoveredDraftTime, setRecoveredDraftTime] = useState<string | null>(null);
	const [localDraftSavedAt, setLocalDraftSavedAt] = useState<Date | null>(null);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedDiarySnapshotRef = useRef<string>("");

	// 1-Click Draft Recovery & Auto-Hydration on initial load
	useEffect(() => {
		if (loadStatePhase !== "empty" || !visitId) return;
		let cancelled = false;

		// Fast synchronous restoration from localStorage via safeLocalStorage in-memory cache
		try {
			const cached = safeLocalStorageGetItem(localDiaryStorageKey);
			if (cached) {
				const parsed = JSON.parse(cached) as Partial<DiaryState>;
				if (parsed && typeof parsed === "object") {
					const hasContent = Object.values(parsed).some(
						(v) => typeof v === "string" && v.trim().length > 0,
					);
					if (hasContent) {
						setDiary((prev) => ({ ...prev, ...parsed }));
						setIsDraftRecovered(true);
						setRecoveredDraftTime(new Date().toLocaleTimeString("ru-RU"));
						if (parsed.diagnosisIcd10) {
							setIcdSearch((c) => (c.trim() ? c : (parsed.diagnosisIcd10 ?? c)));
						}
						showToast("Черновик приема восстановлен из локального хранилища", "info", 5000);
					}
				}
			}
		} catch {
			// ignore JSON parse error on corrupted local state
		}

		// Async restoration from IndexedDB (outbox drafts store)
		void loadOfflineDraft<DiaryState>(localDiaryStorageKey).then((idbDraft) => {
			if (!cancelled && idbDraft?.data) {
				const hasContent = Object.values(idbDraft.data).some(
					(v) => typeof v === "string" && v.trim().length > 0,
				);
				if (hasContent) {
					setDiary((prev) => ({ ...prev, ...idbDraft.data }));
					setIsDraftRecovered(true);
					setRecoveredDraftTime(
						idbDraft.updatedAt
							? new Date(idbDraft.updatedAt).toLocaleTimeString("ru-RU")
							: new Date().toLocaleTimeString("ru-RU"),
					);
					if (idbDraft.data.diagnosisIcd10) {
						setIcdSearch((c) =>
							c.trim() ? c : (idbDraft.data.diagnosisIcd10 ?? c),
						);
					}
				}
			}
		});

		return () => {
			cancelled = true;
		};
	}, [loadStatePhase, visitId, localDiaryStorageKey, setDiary, setIcdSearch]);

	// 5-Second Local Draft Protection Autosave Loop (IndexedDB + LocalStorage)
	useEffect(() => {
		if (!visitId || (isLocked && !isRevising) || loadStatePhase === "loading") return;

		const flushLocalDraft = () => {
			const hasContent = Object.values(diary).some(
				(v) => typeof v === "string" && v.trim().length > 0,
			);
			if (!hasContent) return;

			const currentSnapshot = JSON.stringify(diary);
			if (currentSnapshot === lastSavedDiarySnapshotRef.current) {
				// Защита от троттлинга HDD 5400 RPM: не пишем на диск, если текст дневника не изменился
				return;
			}
			lastSavedDiarySnapshotRef.current = currentSnapshot;

			const storageKey = isRevising ? `${localDiaryStorageKey}_revision` : localDiaryStorageKey;
			try {
				safeLocalStorageSetItem(storageKey, currentSnapshot);
			} catch {
				// ignore localStorage quota errors
			}
			saveOfflineDraftDebounced(
				storageKey,
				"DIARY_043_DRAFT",
				visitId,
				diary,
			);
			setLocalDraftSavedAt(new Date());
		};

		const timing = getOptimizedTiming();
		const debounceMs = timing.autosaveDebounceMs || 800;

		const debounceTimer = setTimeout(flushLocalDraft, debounceMs);

		const intervalTimer = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			flushLocalDraft();
		}, 5000);

		return () => {
			clearTimeout(debounceTimer);
			clearInterval(intervalTimer);
		};
	}, [diary, visitId, isLocked, isRevising, loadStatePhase, localDiaryStorageKey]);

	// Window beforeunload, visibilitychange, blur, pagehide & incoming call tab closure protection
	useEffect(() => {
		if (!visitId || (isLocked && !isRevising) || loadStatePhase === "loading") return;

		const flushImmediately = () => {
			const hasUnsavedContent = Object.values(diary).some(
				(v) => typeof v === "string" && v.trim().length > 0,
			);
			if (!hasUnsavedContent) return;
			const currentSnapshot = JSON.stringify(diary);
			lastSavedDiarySnapshotRef.current = currentSnapshot;
			const storageKey = isRevising ? `${localDiaryStorageKey}_revision` : localDiaryStorageKey;
			try {
				safeLocalStorageSetItem(storageKey, currentSnapshot, true);
			} catch {
				// ignore localStorage quota errors
			}
			void saveOfflineDraft(
				storageKey,
				"DIARY_043_DRAFT",
				visitId,
				diary,
				undefined,
				{ immediate: true },
			);
			setLocalDraftSavedAt(new Date());
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
			if (!isLocked && doSaveRef.current) {
				void doSaveRef.current(true);
			}
		};

		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			const hasUnsavedContent = Object.values(diary).some(
				(v) => typeof v === "string" && v.trim().length > 0,
			);
			if (hasUnsavedContent) {
				flushImmediately();
				e.preventDefault();
				e.returnValue = "В приеме есть несохраненные данные дневника. Закрыть страницу?";
				return e.returnValue;
			}
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushImmediately();
			}
		};

		const handleBlur = () => {
			flushImmediately();
		};

		const handleTelephonyCall = () => {
			flushImmediately();
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		window.addEventListener("pagehide", flushImmediately);
		window.addEventListener("blur", handleBlur);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("dente-telephony-incoming-call", handleTelephonyCall);

		return () => {
			flushImmediately();
			window.removeEventListener("beforeunload", handleBeforeUnload);
			window.removeEventListener("pagehide", flushImmediately);
			window.removeEventListener("blur", handleBlur);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("dente-telephony-incoming-call", handleTelephonyCall);
		};
	}, [diary, isLocked, isRevising, loadStatePhase, localDiaryStorageKey, visitId, doSaveRef]);

	// Debounced Auto-Save (400ms) with in-memory safeLocalStorage protection
	const scheduleDebouncedSave = useCallback(() => {
		if (isLocked && !isRevising) return;
		const storageKey = isRevising ? `${localDiaryStorageKey}_revision` : localDiaryStorageKey;
		try {
			safeLocalStorageSetItem(storageKey, JSON.stringify(diary));
		} catch {
			// ignore localStorage quota errors
		}
		if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		debounceTimerRef.current = setTimeout(() => {
			if (!isLocked) {
				void doSaveRef.current?.(true);
			} else if (isRevising) {
				void saveOfflineDraft(
					storageKey,
					"DIARY_043_DRAFT",
					visitId,
					diary,
				);
				setLocalDraftSavedAt(new Date());
			}
		}, 400);
	}, [isLocked, isRevising, diary, localDiaryStorageKey, visitId, doSaveRef]);

	const clearDraft = useCallback(() => {
		void deleteOfflineDraft(localDiaryStorageKey);
		try {
			safeLocalStorageRemoveItem(localDiaryStorageKey);
		} catch {
			// ignore
		}
		setDiary(EMPTY_DIARY);
		setIsDraftRecovered(false);
		setRecoveredDraftTime(null);
		showToast("Черновик приема очищен", "info", 3000);
	}, [localDiaryStorageKey, setDiary]);

	return {
		isDraftRecovered,
		recoveredDraftTime,
		localDraftSavedAt,
		setLocalDraftSavedAt,
		scheduleDebouncedSave,
		clearDraft,
		localDiaryStorageKey,
	};
}
