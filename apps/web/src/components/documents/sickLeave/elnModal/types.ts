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
	Form036uEntry
} from "../sickLeaveElnEngine";

// Canonical modal test anchor: aria-label="Закрыть"
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

export type TabType = 'eln_form' | 'vk_protocol' | 'journal_036' | 'patient_memo' | 'xml_sfr' | 'digital_signature';

export type SfrElnStatus = 'draft' | 'signing' | 'signed' | 'sending' | 'accepted' | 'rejected' | 'error';

export interface DigitalSignatureCert {
	id: string;
	subjectFio: string;
	role: 'doctor' | 'organization';
	thumbprint: string;
	validTo: string;
	issuer: string;
	snils?: string;
	ogrn?: string;
}

export interface DigitalSignatureStatus {
	signedByDoctor: boolean;
	doctorCertThumbprint?: string;
	doctorSignedAt?: string;
	signedByOrg: boolean;
	orgCertThumbprint?: string;
	orgSignedAt?: string;
	isValid: boolean;
	cryptoProAvailable: boolean;
}

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
}

export interface ElnDigitalSignatureSectionProps {
	formState: SickLeaveFormState;
	doctorFio?: string;
	doctorSnils?: string;
	clinicName?: string;
	clinicOgrn?: string;
	signatureStatus: DigitalSignatureStatus;
	onSignDoctor: () => void;
	onSignOrganization: () => void;
	onVerifySignatures: () => void;
}

export interface ElnPrintPreviewDrawerProps {
	formState: SickLeaveFormState;
	patientData: SickLeavePatientData;
	onPrintMemo: () => void;
}

export interface ElnVkProtocolSectionProps {
	formState: SickLeaveFormState;
	setFormState: React.Dispatch<React.SetStateAction<SickLeaveFormState>>;
	handleToggleVk: (enable: boolean) => void;
}

export interface ElnJournal036SectionProps {
	form036u: Form036uEntry;
}

export interface ElnSfrPayloadSectionProps {
	xmlPayload: string;
	jsonPayload: string;
	isCopiedXml: boolean;
	onCopyXml: () => void;
}
