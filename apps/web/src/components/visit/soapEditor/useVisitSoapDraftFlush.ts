import React, { useCallback, useEffect } from "react";
import { safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import type { VisitSoapNoteValues } from "./types";

interface DraftFlushParams {
	readonly saveStatusRef: React.MutableRefObject<"idle" | "saving" | "saved">;
	readonly onChangeRef: React.MutableRefObject<((values: VisitSoapNoteValues) => void) | undefined>;
	readonly onSaveRef: React.MutableRefObject<((values: VisitSoapNoteValues) => void) | undefined>;
	readonly valuesRef: React.MutableRefObject<VisitSoapNoteValues>;
	readonly soapStorageKeyRef: React.MutableRefObject<string>;
	readonly soapStorageKey: string;
	readonly setSaveStatus: (status: "idle" | "saving" | "saved") => void;
	readonly selectedTooth: number | null;
}

export function useVisitSoapDraftFlush({
	saveStatusRef,
	onChangeRef,
	onSaveRef,
	valuesRef,
	soapStorageKeyRef,
	soapStorageKey,
	setSaveStatus,
	selectedTooth,
}: DraftFlushParams) {
	const flushDraft = useCallback(() => {
		if (saveStatusRef.current === "saving") {
			onChangeRef.current?.(valuesRef.current);
			onSaveRef.current?.(valuesRef.current);
			try {
				const draftPayload = { ...valuesRef.current, _savedAt: new Date().toISOString(), _version: 1 };
				safeLocalStorageSetItem(soapStorageKeyRef.current, JSON.stringify(draftPayload));
				void import("../../../utils/offlineMutationQueue")
					.then(({ saveOfflineDraft }) => {
						void saveOfflineDraft(
							soapStorageKeyRef.current,
							"DIARY_RECORD_DRAFT",
							selectedTooth ? `tooth-${selectedTooth}` : "general",
							draftPayload,
						);
					})
					.catch(() => {});
			} catch (err: unknown) {
				console.warn("[VisitSoapEditor] Failed to cache soap note values on flush:", err);
			}
			setSaveStatus("saved");
		}
	}, [selectedTooth, saveStatusRef, onChangeRef, onSaveRef, valuesRef, soapStorageKeyRef, setSaveStatus]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushDraft();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("beforeunload", flushDraft);
		window.addEventListener("pagehide", flushDraft);
		window.addEventListener("blur", flushDraft);
		window.addEventListener("dente-telephony-incoming-call", flushDraft);
		window.addEventListener("dente:visit-tab-change", flushDraft);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("beforeunload", flushDraft);
			window.removeEventListener("pagehide", flushDraft);
			window.removeEventListener("blur", flushDraft);
			window.removeEventListener("dente-telephony-incoming-call", flushDraft);
			window.removeEventListener("dente:visit-tab-change", flushDraft);
			flushDraft();
		};
	}, [flushDraft]);

	const saveDraftToStorage = useCallback(
		(nextValues: VisitSoapNoteValues) => {
			try {
				safeLocalStorageSetItem(soapStorageKey, JSON.stringify(nextValues));
			} catch (err: unknown) {
				console.warn("[VisitSoapEditor] Failed to cache soap note values to storage:", err);
			}
		},
		[soapStorageKey],
	);

	return { flushDraft, saveDraftToStorage };
}
