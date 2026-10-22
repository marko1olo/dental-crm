import React, { useRef, useState } from "react";
import type { VisitSoapNoteValues } from "./types";
import { useVisitSoapAutosaveDebounce } from "./useVisitSoapAutosaveDebounce";
import { useVisitSoapDraftFlush } from "./useVisitSoapDraftFlush";
import { useVisitSoapDraftInitialRestore } from "./useVisitSoapDraftInitialRestore";

export interface UseVisitSoapDraftParams {
	visitId?: string;
	patientId?: string;
	selectedTooth: number | null;
	initialValues?: VisitSoapNoteValues;
	values: VisitSoapNoteValues;
	setValues: React.Dispatch<React.SetStateAction<VisitSoapNoteValues>>;
	onSave?: (values: VisitSoapNoteValues) => void;
	onChange?: (values: VisitSoapNoteValues) => void;
}

export function useVisitSoapDraft({
	visitId,
	patientId,
	selectedTooth,
	initialValues,
	values,
	setValues,
	onSave,
	onChange,
}: UseVisitSoapDraftParams) {
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

	const valuesRef = useRef(values);
	valuesRef.current = values;
	const saveStatusRef = useRef(saveStatus);
	saveStatusRef.current = saveStatus;
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const onSaveRef = useRef(onSave);
	onSaveRef.current = onSave;

	const {
		soapStorageKey,
		unsavedDraftNotice,
		handleRestoreDraft,
		handleDiscardDraft,
	} = useVisitSoapDraftInitialRestore({
		visitId,
		patientId,
		selectedTooth,
		initialValues,
		setValues,
		onChangeRef,
		onSaveRef,
		valuesRef,
		setSaveStatus,
	});

	const soapStorageKeyRef = useRef(soapStorageKey);
	soapStorageKeyRef.current = soapStorageKey;

	useVisitSoapAutosaveDebounce({
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
	});

	const { flushDraft, saveDraftToStorage } = useVisitSoapDraftFlush({
		saveStatusRef,
		onChangeRef,
		onSaveRef,
		valuesRef,
		soapStorageKeyRef,
		soapStorageKey,
		setSaveStatus,
		selectedTooth,
	});

	return {
		saveStatus,
		setSaveStatus,
		soapStorageKey,
		unsavedDraftNotice,
		handleRestoreDraft,
		handleDiscardDraft,
		flushDraft,
		saveDraftToStorage,
		valuesRef,
		onChangeRef,
		onSaveRef,
	};
}
