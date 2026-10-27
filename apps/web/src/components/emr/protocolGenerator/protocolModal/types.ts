import type {
	VisitDiaryEntry043,
	Statutory043ComplianceReport,
	FdiToothRecord,
	ToothSurface,
	ClinicalSpecialtyKind,
} from "../emrProtocolEngine";

export type EmrProtocolTabMode = "preview" | "soap_cards" | "compliance";

export type EmrEndoStage =
	| "single_visit_complete"
	| "access_instrumentation_temporary_calcium"
	| "final_obturation_restoration";

export interface EmrProtocolGeneratorModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly medicalCardNumber?: string | null | undefined;
	readonly initialToothNumber?: number | string | null | undefined;
	readonly initialIcd10Code?: string | null | undefined;
	readonly initialSurfaces?: readonly ToothSurface[] | null | undefined;
	readonly initialSpecialty?: ClinicalSpecialtyKind | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly odontogramTeeth?: readonly FdiToothRecord[] | null | undefined;
	readonly onApplyDiary?: (diary: VisitDiaryEntry043) => void;
	readonly onApplyBatchDiaries?: (diaries: VisitDiaryEntry043[]) => void;
}
