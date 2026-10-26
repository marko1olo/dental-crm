import type { MedicalCardForm043uData } from "../emr043Types";

export type RecordTabType = "overview" | "passport" | "anamnesis" | "odontogram" | "diaries" | "epicrisis";

export interface MedicalRecordPrintModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Partial<MedicalCardForm043uData> | undefined;
	onSave?: ((data: MedicalCardForm043uData) => void) | undefined;
	readOnly?: boolean | undefined;
	onOpenProtocolGenerator?: (() => void) | undefined;
	isLocked?: boolean | undefined;
	isDraft?: boolean | undefined;
	status?: "draft" | "signed" | "completed" | "voided" | string | undefined;
}

export type Form043PrintModalProps = MedicalRecordPrintModalProps;
