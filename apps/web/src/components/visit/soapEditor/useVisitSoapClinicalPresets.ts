import type { ChairsideSmartProtocolKey } from "../clinicalVisitWorkflow";
import type { VisitSoapNoteValues } from "./types";
import { useVisitSoapApplyNorm } from "./useVisitSoapApplyNorm";
import { useVisitSoapExpressProtocol } from "./useVisitSoapExpressProtocol";

interface ClinicalPresetsParams {
	readonly selectedTooth: number | null;
	readonly selectedSurfaces: string;
	readonly isLocked: boolean;
	readonly isCorrectionMode: boolean;
	readonly setIsCorrectionMode: (val: boolean) => void;
	readonly setValues: React.Dispatch<React.SetStateAction<VisitSoapNoteValues>>;
	readonly valuesRef: React.MutableRefObject<VisitSoapNoteValues>;
	readonly setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
	readonly saveDraftToStorage: (vals: VisitSoapNoteValues) => void;
	readonly onSave?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onChange?: ((vals: VisitSoapNoteValues) => void) | undefined;
	readonly onApplyFullDiary?: ((fullText: string) => void) | undefined;
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
}

export function useVisitSoapClinicalPresets(params: ClinicalPresetsParams) {
	const { handleApplyNorm } = useVisitSoapApplyNorm(params);
	const { handleApplyExpressProtocol } = useVisitSoapExpressProtocol(params);

	return {
		handleApplyNorm,
		handleApplyExpressProtocol,
	};
}
