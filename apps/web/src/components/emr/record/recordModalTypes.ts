import type { MedicalRecordData } from "../types/recordDataTypes";

export type RecordTabType = "overview" | "passport" | "anamnesis" | "odontogram" | "diaries" | "epicrisis";

export interface MedicalRecordPrintModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Partial<MedicalRecordData> | undefined;
	onSave?: ((data: MedicalRecordData) => void) | undefined;
	readOnly?: boolean | undefined;
	onOpenProtocolGenerator?: (() => void) | undefined;
	isLocked?: boolean | undefined;
	isDraft?: boolean | undefined;
	status?: "draft" | "signed" | "completed" | "voided" | string | undefined;
}

export type Form043PrintModalProps = MedicalRecordPrintModalProps;
