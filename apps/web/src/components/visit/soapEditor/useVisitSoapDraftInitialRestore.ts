import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
} from "../../../lib/safeLocalStorage";
import type { UnsavedDraftNoticeState, VisitSoapNoteValues } from "./types";

interface InitialRestoreParams {
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly selectedTooth: number | null;
	readonly initialValues?: VisitSoapNoteValues | undefined;
	readonly setValues: React.Dispatch<React.SetStateAction<VisitSoapNoteValues>>;
	readonly onChangeRef: React.MutableRefObject<((values: VisitSoapNoteValues) => void) | undefined>;
	readonly onSaveRef: React.MutableRefObject<((values: VisitSoapNoteValues) => void) | undefined>;
	readonly valuesRef: React.MutableRefObject<VisitSoapNoteValues>;
	readonly setSaveStatus: (status: "idle" | "saving" | "saved") => void;
}

export function useVisitSoapDraftInitialRestore({
	visitId,
	patientId,
	selectedTooth,
	initialValues,
	setValues,
	onChangeRef,
	onSaveRef,
	valuesRef,
	setSaveStatus,
}: InitialRestoreParams) {
	const soapStorageKey = useMemo(() => {
		const prefix = visitId ? `${visitId}_` : patientId ? `${patientId}_` : "";
		return `dente_soap_editor_draft_${prefix}${selectedTooth ?? "general"}`;
	}, [visitId, patientId, selectedTooth]);

	const [unsavedDraftNotice, setUnsavedDraftNotice] = useState<UnsavedDraftNoticeState | null>(null);

	useEffect(() => {
		try {
			const saved = safeLocalStorageGetItem(soapStorageKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed && typeof parsed === "object") {
					const candidate: VisitSoapNoteValues = {
						complaint: parsed.complaint || "",
						anamnesis: parsed.anamnesis || "",
						objectiveStatus: parsed.objectiveStatus || "",
						diagnosis: parsed.diagnosis || "",
						treatmentPlan: parsed.treatmentPlan || "",
						recommendations: parsed.recommendations || "",
						icd10: parsed.icd10 || "",
					};
					const hasContent = Boolean(
						candidate.complaint?.trim() ||
						candidate.anamnesis?.trim() ||
						candidate.objectiveStatus?.trim() ||
						candidate.diagnosis?.trim() ||
						candidate.treatmentPlan?.trim() ||
						candidate.recommendations?.trim() ||
						candidate.icd10?.trim(),
					);

					const isDifferent =
						(candidate.complaint || "") !== (initialValues?.complaint || "") ||
						(candidate.anamnesis || "") !== (initialValues?.anamnesis || "") ||
						(candidate.objectiveStatus || "") !== (initialValues?.objectiveStatus || "") ||
						(candidate.diagnosis || "") !== (initialValues?.diagnosis || "") ||
						(candidate.treatmentPlan || "") !== (initialValues?.treatmentPlan || "") ||
						(candidate.recommendations || "") !== (initialValues?.recommendations || "") ||
						(candidate.icd10 || "") !== (initialValues?.icd10 || "");

					if (hasContent && isDifferent) {
						if (!initialValues?.complaint && !initialValues?.treatmentPlan) {
							setValues((prev) => ({ ...prev, ...candidate }));
						}
						const savedDate = parsed._savedAt || parsed.savedAt ? new Date(parsed._savedAt || parsed.savedAt) : new Date();
						const timeStr = !Number.isNaN(savedDate.getTime())
							? savedDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
							: "недавнего времени";
						setUnsavedDraftNotice({ draftValues: candidate, timeStr });
					} else {
						setUnsavedDraftNotice(null);
					}
				}
			}
		} catch {
			// ignore parse errors
		}
	}, [soapStorageKey, initialValues, setValues]);

	const handleRestoreDraft = useCallback(() => {
		if (!unsavedDraftNotice) return;
		const restored = unsavedDraftNotice.draftValues;
		setValues(restored);
		valuesRef.current = restored;
		setSaveStatus("saved");
		setUnsavedDraftNotice(null);
		onChangeRef.current?.(restored);
		onSaveRef.current?.(restored);
	}, [unsavedDraftNotice, setValues, valuesRef, setSaveStatus, onChangeRef, onSaveRef]);

	const handleDiscardDraft = useCallback(() => {
		try {
			safeLocalStorageRemoveItem(soapStorageKey);
			if (visitId || patientId) {
				safeLocalStorageRemoveItem(`dente_soap_editor_draft_${selectedTooth ?? "general"}`);
			}
		} catch (err: unknown) {
			console.warn("[VisitSoapEditor] Failed to discard draft:", err);
		}
		setUnsavedDraftNotice(null);
	}, [soapStorageKey, visitId, patientId, selectedTooth]);

	return { soapStorageKey, unsavedDraftNotice, handleRestoreDraft, handleDiscardDraft };
}
