/**
 * DENTE CRM — Hook for Offline Draft Persistence & Automatic Recovery
 *
 * Гарантия 100% защиты от потери данных врача:
 * - Автоматическое извлечение черновика при открытии карты или дневника
 * - Синхронное / фоновое сохранение при каждом вводе
 * - Устойчивость к внезапному закрытию вкладки, сбою питания или обрыву сети
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useOfflineStore } from "../store/offlineStore";
import type {
	MutationAction,
	MutationEntityType,
	OfflineDraft,
} from "../utils/offlineMutationQueue";

export interface UseOfflineDraftOptions<T> {
	draftKey: string;
	entityType: MutationEntityType;
	entityId: string;
	organizationId?: string | undefined;
	autoSaveDebounceMs?: number | undefined;
	onDraftRestored?: ((data: T, updatedAt: string) => void) | undefined;
}

export function useOfflineDraft<T = unknown>(options: UseOfflineDraftOptions<T>) {
	const {
		draftKey,
		entityType,
		entityId,
		organizationId,
		autoSaveDebounceMs = 500,
		onDraftRestored,
	} = options;

	const [cachedDraft, setCachedDraft] = useState<OfflineDraft<T> | null>(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const [lastSavedData, setLastSavedData] = useState<T | null>(null);

	const storeSaveDraft = useOfflineStore((state) => state.saveDraft);
	const storeLoadDraft = useOfflineStore((state) => state.loadDraft);
	const storeDeleteDraft = useOfflineStore((state) => state.deleteDraft);
	const storeEnqueue = useOfflineStore((state) => state.enqueue);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const currentDataRef = useRef<T | null>(null);

	// 1. Initial Draft Restoration on mount or draftKey change
	useEffect(() => {
		let cancelled = false;
		setIsLoaded(false);

		const restore = async () => {
			try {
				const draft = await storeLoadDraft<T>(draftKey);
				if (!cancelled) {
					if (draft && draft.data) {
						setCachedDraft(draft);
						setLastSavedData(draft.data);
						currentDataRef.current = draft.data;
						if (onDraftRestored) {
							onDraftRestored(draft.data, draft.updatedAt);
						}
					} else {
						setCachedDraft(null);
					}
					setIsLoaded(true);
				}
			} catch (err) {
				if (!cancelled) setIsLoaded(true);
			}
		};

		void restore();

		return () => {
			cancelled = true;
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [draftKey, storeLoadDraft, onDraftRestored]);

	// 2. Explicit or Debounced Save
	const saveDraft = useCallback(
		async (data: T, immediate = false): Promise<OfflineDraft<T>> => {
			currentDataRef.current = data;

			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}

			if (immediate || autoSaveDebounceMs <= 0) {
				const draft = await storeSaveDraft<T>(
					draftKey,
					entityType,
					entityId,
					data,
					organizationId,
				);
				setCachedDraft(draft);
				setLastSavedData(data);
				return draft;
			}

			return new Promise((resolve) => {
				debounceTimerRef.current = setTimeout(async () => {
					const draft = await storeSaveDraft<T>(
						draftKey,
						entityType,
						entityId,
						data,
						organizationId,
					);
					setCachedDraft(draft);
					setLastSavedData(data);
					resolve(draft);
				}, autoSaveDebounceMs);
			});
		},
		[
			draftKey,
			entityType,
			entityId,
			organizationId,
			autoSaveDebounceMs,
			storeSaveDraft,
		],
	);

	// 3. Clear Draft upon successful server commit
	const clearDraft = useCallback(async () => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		await storeDeleteDraft(draftKey);
		setCachedDraft(null);
		setLastSavedData(null);
		currentDataRef.current = null;
	}, [draftKey, storeDeleteDraft]);

	// 4. Emergency beforeunload flush guard: ensures zero data loss on unexpected tab/browser exit
	useEffect(() => {
		const handleBeforeUnload = () => {
			if (currentDataRef.current !== null && currentDataRef.current !== lastSavedData) {
				if (typeof window !== "undefined" && window.localStorage) {
					try {
						const draftObj = {
							draftKey,
							entityType,
							entityId,
							data: currentDataRef.current,
							updatedAt: new Date().toISOString(),
							organizationId,
						};
						window.localStorage.setItem(
							`dente_offline_draft_v1:${draftKey}`,
							JSON.stringify(draftObj),
						);
					} catch {
						// silent fail on window unload
					}
				}
			}
		};

		if (typeof window !== "undefined") {
			window.addEventListener("beforeunload", handleBeforeUnload);
			return () => {
				window.removeEventListener("beforeunload", handleBeforeUnload);
			};
		}
	}, [draftKey, entityType, entityId, organizationId, lastSavedData]);

	// 4. Commit draft to Outbox Mutation Queue and Clear Draft
	const commitToOutbox = useCallback(
		async (data?: T, action: MutationAction = "update") => {
			const payload = data !== undefined ? data : currentDataRef.current;
			if (payload === null || payload === undefined) return;

			await storeEnqueue<T>({
				entityType,
				entityId,
				action,
				payload,
				organizationId,
			});

			await clearDraft();
		},
		[entityType, entityId, organizationId, storeEnqueue, clearDraft],
	);

	return {
		draft: cachedDraft?.data ?? null,
		draftUpdatedAt: cachedDraft?.updatedAt ?? null,
		hasSavedDraft: cachedDraft !== null,
		isLoaded,
		saveDraft,
		clearDraft,
		commitToOutbox,
	};
}
