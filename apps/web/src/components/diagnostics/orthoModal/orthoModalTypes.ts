import type { OrthodonticPhotoSession } from "@dental/shared";
import type { OrthodonticClinicalPreset } from "../orthodonticPresets";

export interface OrthodonticPhotoProtocolModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | undefined;
	patientName?: string | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	initialSession?: OrthodonticPhotoSession;
	previousSession?: OrthodonticPhotoSession | null | undefined;
	treatmentPlanId?: string;
	treatmentPlanStageId?: string;
	treatmentStageTitle?: string;
	onSaveSession?: (session: OrthodonticPhotoSession) => void;
	onInsertProtocol043?: (protocolText: string) => void;
}

export type OrthoClinicalPreset = OrthodonticClinicalPreset;
export type OrthoPhotoProtocolModalProps = OrthodonticPhotoProtocolModalProps;
