import { useState } from "react";
import type { LabOrderStageKey } from "../labClinicalStages";

export function useOrderFormDatesAndOcclusion() {
	const [occlusalScheme, setOcclusalScheme] = useState<string>("mutually_protected");
	const [contactTightness, setContactTightness] = useState<string>("normal");
	const [surfaceTexture, setSurfaceTexture] = useState<string>("natural_anatomy");
	const [cementGapMicrons, setCementGapMicrons] = useState<number>(30);

	const [currentStage, setCurrentStage] = useState<LabOrderStageKey>("sent_to_lab");
	const [dueDate, setDueDate] = useState<string>("");
	const [scheduledVisitDate, setScheduledVisitDate] = useState<string>("");
	const [frameworkTrialDate, setFrameworkTrialDate] = useState<string>("");
	const [ceramicTrialDate, setCeramicTrialDate] = useState<string>("");
	const [clinicalNotes, setClinicalNotes] = useState<string>("");
	const [secureToken, setSecureToken] = useState<string>("");

	return {
		occlusalScheme,
		setOcclusalScheme,
		contactTightness,
		setContactTightness,
		surfaceTexture,
		setSurfaceTexture,
		cementGapMicrons,
		setCementGapMicrons,
		currentStage,
		setCurrentStage,
		dueDate,
		setDueDate,
		scheduledVisitDate,
		setScheduledVisitDate,
		frameworkTrialDate,
		setFrameworkTrialDate,
		ceramicTrialDate,
		setCeramicTrialDate,
		clinicalNotes,
		setClinicalNotes,
		secureToken,
		setSecureToken,
	};
}
