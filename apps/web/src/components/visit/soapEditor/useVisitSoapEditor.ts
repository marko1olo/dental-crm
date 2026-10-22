import { useState } from "react";
import type { VisitSoapEditorProps, VisitSoapNoteValues } from "./types";
import { useVisitSoapActions } from "./useVisitSoapActions";
import { useVisitSoapApiTemplates } from "./useVisitSoapApiTemplates";
import { useVisitSoapApplyProtocol } from "./useVisitSoapApplyProtocol";
import { useVisitSoapClinicalPresets } from "./useVisitSoapClinicalPresets";
import { useVisitSoapDraft } from "./useVisitSoapDraft";
import { useVisitSoapExternalSync } from "./useVisitSoapExternalSync";
import { useVisitSoapUiState } from "./useVisitSoapUiState";

export function useVisitSoapEditor({
	visitId, patientId, initialValues, activeTooth = null,
	onSave, onChange, onApplyFullDiary, isLocked = false,
	isTemplatesOpen: isTemplatesOpenProp, onToggleTemplates,
}: VisitSoapEditorProps) {
	const [values, setValues] = useState<VisitSoapNoteValues>({
		complaint: initialValues?.complaint || "",
		anamnesis: initialValues?.anamnesis || "",
		objectiveStatus: initialValues?.objectiveStatus || "",
		diagnosis: initialValues?.diagnosis || "",
		treatmentPlan: initialValues?.treatmentPlan || "",
		recommendations: initialValues?.recommendations || "",
		icd10: initialValues?.icd10 || "",
	});
	const [selectedTooth, setSelectedTooth] = useState<number | null>(activeTooth ?? 16);
	const [selectedSurfaces, setSelectedSurfaces] = useState<string>("");
	const uiState = useVisitSoapUiState({ isTemplatesOpenProp, onToggleTemplates });

	const draft = useVisitSoapDraft({
		visitId: visitId || "", patientId: patientId || "", selectedTooth,
		initialValues, values, setValues, onSave, onChange,
	} as any);

	useVisitSoapExternalSync({
		activeTooth, setSelectedTooth, initialValues, setValues,
		valuesRef: draft.valuesRef, setSaveStatus: draft.setSaveStatus,
		saveDraftToStorage: draft.saveDraftToStorage, onSave, onChange,
	});

	const templates = useVisitSoapApiTemplates(uiState.searchQuery, uiState.activeSpecialty);

	const { handleApplyProtocol } = useVisitSoapApplyProtocol({
		selectedTooth, selectedSurfaces, values, setValues, isLocked,
		isCorrectionMode: uiState.isCorrectionMode, setIsCorrectionMode: uiState.setIsCorrectionMode,
		setIsTemplatesOpen: uiState.setIsTemplatesOpen, setPreviewProtocol: uiState.setPreviewProtocol,
		setSaveStatus: draft.setSaveStatus, saveDraftToStorage: draft.saveDraftToStorage,
		onSave, onChange, onApplyFullDiary,
	});

	const clinicalPresets = useVisitSoapClinicalPresets({
		selectedTooth, selectedSurfaces, isLocked,
		isCorrectionMode: uiState.isCorrectionMode, setIsCorrectionMode: uiState.setIsCorrectionMode,
		setValues, valuesRef: draft.valuesRef, setSaveStatus: draft.setSaveStatus,
		saveDraftToStorage: draft.saveDraftToStorage, onSave, onChange, onApplyFullDiary,
		visitId, patientId,
	});

	const actions = useVisitSoapActions({
		values, setValues, valuesRef: draft.valuesRef, setSaveStatus: draft.setSaveStatus,
		saveDraftToStorage: draft.saveDraftToStorage, onSave, onChange, isLocked,
		isCorrectionMode: uiState.isCorrectionMode, setIsCorrectionMode: uiState.setIsCorrectionMode,
		selectedTooth,
	});

	return {
		values, selectedTooth, setSelectedTooth, selectedSurfaces, setSelectedSurfaces,
		...uiState, ...draft, ...templates, handleApplyProtocol, ...clinicalPresets, ...actions,
	};
}
