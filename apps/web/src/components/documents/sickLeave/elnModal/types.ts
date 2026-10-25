import type {
	IncapacityReasonCode,
	IncapacityRegimeType,
	SickLeaveClosingCode,
	RegimeViolationCode
} from "../sickLeaveElnPresets";
import type {
	SickLeaveFormState,
	SickLeavePatientData,
	IncapacityPeriod,
	MedicalCommissionProtocol,
	SickLeaveRegistryEntry,
	Form036uEntry
} from "../sickLeaveElnEngine";

export interface SickLeaveElnModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApplyToDiary?: ((diarySnippet: string, form: SickLeaveFormState) => void) | undefined;
	initialPatientName?: string | undefined;
	initialPatientBirthDate?: string | undefined;
	initialPatientSnils?: string | undefined;
	initialPatientGender?: 'male' | 'female' | undefined;
	initialEmployerName?: string | undefined;
	initialDiagnosisText?: string | undefined;
	initialIcd10Code?: string | undefined;
	initialDoctorFio?: string | undefined;
	initialDoctorSnils?: string | undefined;
	initialDoctorSpecialty?: string | undefined;
}

export type ElnFormData = SickLeaveFormState;

export type TabType = 'eln_form' | 'patient_memo' | 'registry' | 'journal_036' | 'vk_protocol' | 'digital_signature' | 'xml_sfr';

export interface ElnPatientAndJobSectionProps {
	patientData: SickLeavePatientData;
	onPatientDataChange: (updater: (prev: SickLeavePatientData) => SickLeavePatientData) => void;
}

export interface ElnDiagnosisAndPeriodSectionProps {
	formState: SickLeaveFormState;
	setFormState: React.Dispatch<React.SetStateAction<SickLeaveFormState>>;
	handleAddPeriod: () => void;
	handleRemovePeriod: (index: number) => void;
	handlePeriodDateChange: (index: number, field: 'dateFrom' | 'dateTo', value: string) => void;
	onQuickSetDays?: (days: number) => void;
}

export interface ElnPrintPreviewDrawerProps {
	formState: SickLeaveFormState;
	patientData: SickLeavePatientData;
	onPrintMemo: () => void;
}

export type { SickLeaveRegistrySectionProps } from "./SickLeaveRegistrySection";
export type { ElnJournal036SectionProps } from "./ElnJournal036Section";
