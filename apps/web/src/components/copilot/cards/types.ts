import type React from "react";
import type {
  DdiSafetyAlertData,
  ProactiveAlertCardData,
  Protocol043Data,
  ReactStepItem,
  TriageUrgency,
  WhatsAppApprovalCard,
} from "../copilotTypes";

export interface PatientProfileCardData {
	id: string;
	fullName: string;
	phone?: string | undefined;
	birthDate?: string | undefined;
	gender?: "male" | "female" | string | undefined;
	cardNumber?: string | undefined;
	status?: string | undefined;
	balanceRub?: number | undefined;
	depositRub?: number | undefined;
	debtRub?: number | undefined;
	familyBalanceRub?: number | undefined;
	allergies?: string[] | undefined;
	lastVisitDate?: string | undefined;
	lastDoctorName?: string | undefined;
	lastDiagnosis?: string | undefined;
	nextAppointmentDate?: string | undefined;
	activePlanStage?: string | undefined;
}

export interface PatientProfileCardProps {
	patient: PatientProfileCardData;
	onOpenCard?: ((patientId: string) => void) | undefined;
	onSelectPatient?: ((patientId: string) => void) | undefined;
	onBookAppointment?: ((patientId: string) => void) | undefined;
	onSelectPlan?: ((patientId: string) => void) | undefined;
}

export interface ScheduleSlotOption {
	id: string;
	time: string;
	endTime?: string | undefined;
	startTime?: string | undefined;
	durationMinutes?: number | undefined;
	cabinet?: string | undefined;
	chairName?: string | undefined;
	isAvailable?: boolean | undefined;
	priceRub?: number | undefined;
}

export interface ScheduleSlotPickerData {
	doctorId?: string | undefined;
	doctorName?: string | undefined;
	doctorSpecialty?: string | undefined;
	cabinet?: string | undefined;
	date?: string | undefined;
	availableDates?: string[] | undefined;
	slots: ScheduleSlotOption[];
}

export interface ScheduleSlotPickerCardProps {
	data: ScheduleSlotPickerData;
	selectedSlotId?: string | undefined;
	onSelectSlot?: ((slot: ScheduleSlotOption) => void) | undefined;
	onBookSlot?: ((slot: ScheduleSlotOption) => void) | undefined;
	onChangeDate?: ((date: string) => void) | undefined;
}

export interface Prescription107DrugItem {
	id: string;
	mnn: string;
	tradeName?: string | undefined;
	latinName: string;
	dosageForm: string;
	dosage: string;
	quantity: string;
	signa: string;
	icd10?: string | undefined;
}

export interface Prescription107Data {
	id?: string | undefined;
	series?: string | undefined;
	number?: string | undefined;
	issueDate?: string | undefined;
	validityDays?: number | string | undefined;
	patientName: string;
	patientBirthDate?: string | undefined;
	patientAgeYears?: number | undefined;
	patientAddress?: string | undefined;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	doctorSnils?: string | undefined;
	clinicName?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicAddress?: string | undefined;
	medicalLicense?: string | undefined;
	diagnosisIcd10?: string | undefined;
	diagnosisName?: string | undefined;
	drugs: Prescription107DrugItem[];
	isChronicallyIll?: boolean | undefined;
	isSignedUkep?: boolean | undefined;
	ukepCertificate?: string | undefined;
	ukepSignedAt?: string | undefined;
}

export interface Prescription107CardProps {
	prescription: Prescription107Data;
	onPrint?: ((prescription: Prescription107Data) => void) | undefined;
	onSignUkep?: ((prescription: Prescription107Data) => void) | undefined;
}

export interface EstimateStageBreakdown {
	stageName: string;
	proceduresCount: number;
	totalRub: number;
}

export interface EstimateTierOption {
	tierKey: "economy" | "optimum" | "premium";
	tierName: string;
	badge: string;
	totalRub: number;
	monthlyInstallmentRub?: number | undefined;
	installmentMonths?: number | undefined;
	taxDeductionRub: number;
	netCostAfterDeductionRub: number;
	warrantyDescription: string;
	materialsDescription: string;
	keyAdvantages: string[];
	stages?: EstimateStageBreakdown[] | undefined;
}

export interface EstimateTierData {
	patientId?: string | undefined;
	patientName?: string | undefined;
	discountPercent?: number | undefined;
	createdAt?: string | undefined;
	diagnoses?: string[] | undefined;
	teeth?: (string | number)[] | undefined;
	selectedTier?: "economy" | "optimum" | "premium" | undefined;
	tiers: EstimateTierOption[];
}

export interface EstimateTierCardProps {
	data: EstimateTierData;
	activeTier?: "economy" | "optimum" | "premium" | undefined;
	onSelectTier?:
		| ((tierKey: "economy" | "optimum" | "premium") => void)
		| undefined;
	onApplyTier?:
		| ((
				tierKey: "economy" | "optimum" | "premium",
				tier: EstimateTierOption,
		  ) => void)
		| undefined;
}

export interface CopilotReactTrackerProps {
	title?: string | undefined;
	steps?: ReactStepItem[] | undefined;
	currentStepIndex?: number | undefined;
	isComplete?: boolean | undefined;
	totalDurationMs?: number | undefined;
	onStepClick?: ((step: ReactStepItem) => void) | undefined;
}

export interface ClinicalProtocolCardData {
	procedureId?: string | undefined;
	procedureName: string;
	categoryKey?: string | undefined;
	categoryName?: string | undefined;
	matchedIcd10?: string | undefined;
	tooth?: number | string | null | undefined;
	toothNumber?: number | string | null | undefined;
	patch?: {
		complaint?: string | undefined;
		anamnesis?: string | undefined;
		objectiveStatus?: string | undefined;
		treatmentPlan?: string | undefined;
		recommendations?: string | undefined;
		diagnosis?: string | undefined;
	} | undefined;
	toothState?: "treatment" | "done" | "missing" | "idle" | undefined;
	applied?: boolean | undefined;
	totalCatalogProtocols?: number | undefined;
	alternatives?: Array<{
		id: string;
		procedureName: string;
		categoryKey?: string | undefined;
		categoryName?: string | undefined;
		matchedIcd10?: string | undefined;
	}> | undefined;
}

export interface CopilotClinicalProtocolCardProps {
	data: ClinicalProtocolCardData;
	callId?: string | undefined;
	resolved?: ("confirm" | "reject") | undefined;
	onApply?: ((data: ClinicalProtocolCardData) => void) | undefined;
	onOpenCatalog?: (() => void) | undefined;
	onSelectAlternative?: ((altId: string) => void) | undefined;
	disabled?: boolean | undefined;
}

export interface CopilotProtocol043ConfirmCardProps {
	data: Protocol043Data;
	callId?: string | undefined;
	resolved?: ("confirm" | "reject") | undefined;
	onConfirm?: ((data: Protocol043Data) => void) | undefined;
	onReject?: (() => void) | undefined;
	disabled?: boolean | undefined;
}

export interface CopilotDdiSafetyCardProps {
	data: DdiSafetyAlertData;
	callId?: string | undefined;
	resolved?: ("confirm" | "reject") | undefined;
	onReplaceDrug?: ((alternative: string) => void) | undefined;
	onOverride?: (() => void) | undefined;
	disabled?: boolean | undefined;
}


export interface ProactiveAlertCardViewProps {
	alert: ProactiveAlertCardData;
	onDismiss?: ((alertId: string) => void) | undefined;
	onExecuteAction?:
		| ((action: ProactiveAlertCardData["actions"][0]) => void)
		| undefined;
	onSendPrompt?: ((prompt: string) => void) | undefined;
}


export interface WhatsAppApprovalCardViewProps {
	card: WhatsAppApprovalCard;
	onApprove?:
		| ((approvalId: string, modifiedReply?: string) => void)
		| undefined;
	onReject?: ((approvalId: string, reason?: string) => void) | undefined;
	onSendPrompt?: ((prompt: string) => void) | undefined;
}

