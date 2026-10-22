import React, { useEffect } from "react";
import { safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { getOptimizedTiming } from "../../../utils/lowSpecHddOptimizer";
import { saveChairsideVisitDraft } from "../clinicalVisitWorkflow";
import type { VisitSoapNoteValues } from "./types";

interface AutosaveDebounceParams {
	readonly values: VisitSoapNoteValues;
	readonly saveStatus: "idle" | "saving" | "saved";
	readonly setSaveStatus: (status: "idle" | "saving" | "saved") => void;
	readonly soapStorageKey: string;
	readonly selectedTooth: number | null;
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly onChangeRef: React.MutableRefObject<((values: VisitSoapNoteValues) => void) | undefined>;
	readonly onSaveRef: React.MutableRefObject<((values: VisitSoapNoteValues) => void) | undefined>;
	readonly valuesRef: React.MutableRefObject<VisitSoapNoteValues>;
	readonly soapStorageKeyRef: React.MutableRefObject<string>;
}

export function useVisitSoapAutosaveDebounce({
	values,
	saveStatus,
	setSaveStatus,
	soapStorageKey,
	selectedTooth,
	visitId,
	patientId,
	onChangeRef,
	onSaveRef,
	valuesRef,
	soapStorageKeyRef,
}: AutosaveDebounceParams) {
	useEffect(() => {
		if (saveStatus !== "saving") return;
		const timing = getOptimizedTiming();
		const debounceMs = Math.max(500, Math.min(1000, timing.autosaveDebounceMs || 800));
		const timer = setTimeout(() => {
			onChangeRef.current?.(values);
			onSaveRef.current?.(values);
			try {
				const draftPayload = { ...values, _savedAt: new Date().toISOString(), _version: 1 };
				safeLocalStorageSetItem(soapStorageKey, JSON.stringify(draftPayload));
				if (visitId) {
					saveChairsideVisitDraft(visitId, {
						chairId: undefined,
						patientId,
						savedAtIso: draftPayload._savedAt,
						version: 1,
						diary: { ...values, toothNumber: selectedTooth ?? undefined },
					});
				}
				void import("../../../utils/offlineMutationQueue")
					.then(({ saveOfflineDraft }) => {
						void saveOfflineDraft(
							soapStorageKey,
							"DIARY_RECORD_DRAFT",
							selectedTooth ? `tooth-${selectedTooth}` : "general",
							draftPayload,
						);
					})
					.catch(() => {});
			} catch (err: unknown) {
				console.warn("[VisitSoapEditor] Failed to cache soap note values:", err);
			}
			setSaveStatus("saved");
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [values, saveStatus, soapStorageKey, selectedTooth, visitId, patientId, onChangeRef, onSaveRef, setSaveStatus]);

	useEffect(() => {
		const intervalTimer = setInterval(() => {
			const cur = valuesRef.current;
			const hasContent = Boolean(
				cur.complaint?.trim() || cur.anamnesis?.trim() || cur.objectiveStatus?.trim() ||
				cur.diagnosis?.trim() || cur.treatmentPlan?.trim() || cur.recommendations?.trim() || cur.icd10?.trim(),
			);
			if (!hasContent) return;

			try {
				const draftPayload = { ...cur, _savedAt: new Date().toISOString(), _version: 1 };
				safeLocalStorageSetItem(soapStorageKeyRef.current, JSON.stringify(draftPayload));
				if (visitId) {
					saveChairsideVisitDraft(visitId, {
						chairId: undefined,
						patientId,
						savedAtIso: draftPayload._savedAt,
						version: 1,
						diary: { ...cur, toothNumber: selectedTooth ?? undefined },
					});
				}
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
				setSaveStatus("saved");
			} catch (err: unknown) {
				console.warn("[VisitSoapEditor] periodic heartbeat autosave error:", err);
			}
		}, 60000);

		return () => clearInterval(intervalTimer);
	}, [visitId, patientId, selectedTooth, valuesRef, soapStorageKeyRef, setSaveStatus]);
}
