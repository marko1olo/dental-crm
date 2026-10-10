/**
 * Layer 0: Контракты типов для ИИ-персонализации, стилей клинического мышления врача и памятки после приёма.
 */

export type PersonalizedPlanResult = {
	patientFriendlyExplanation: string;
	patientHygieneAdvice: string;
	alternatives?: string[];
	risksAndLimitations?: string[];
	prognosisAndLimits?: string;
	controlPlan?: string;
};

export type PostVisitPersonalizedResult = {
	allowedAfter: string[];
	temporaryRestrictions: string[];
	medicationAndRinsePlan: string[];
	hygieneInstructions: string[];
	nutritionInstructions: string[];
	urgentWarningSigns: string[];
	telegramSummary: string;
};

export type ClinicalAiPersonalizePanelProps = {
	patientId?: string | null;
	/** ФИО врача для памятки и подписи плана. */
	doctorFullName?: string | null;
	/** Повод / жалоба из заметки приёма — если есть. */
	complaint?: string | null;
	/** Диагноз из заметки приёма — если есть. */
	diagnosis?: string | null;
	/** Текст плана из заметки — запасной этап, если позиций в плане нет. */
	treatmentPlanText?: string | null;
	/** Контекст экрана — только подпись, логика одна. */
	context?: "visit" | "finance";
};

export type PlanItem = {
	patientId?: string;
	status?: string;
	serviceId?: string;
	snapshotServiceName?: string;
	snapshotServiceCategory?: string | null;
	toothCode?: string | null;
	unitPriceRub?: number;
	discountRub?: number;
	quantity?: number;
	notes?: string | null;
};

export type Scenario = {
	patientId?: string;
	active?: boolean;
	title?: string;
	phases?: Array<{
		title?: string;
		window?: string;
		amountRub?: number;
		focus?: string;
	}>;
	pros?: string[];
	tradeoffs?: string[];
	clinicalWarnings?: string[];
	totalRub?: number;
};

export type DoctorVoiceConciseness = "concise" | "standard" | "detailed";
export type XrayDetailLevel = "basic" | "detailed" | "expert";
export type Mkb10AutoMode = "suggest" | "require_confirm" | "auto_insert";
export type ToneOfVoice = "academic" | "clinical_partner" | "patient_friendly";

export interface DoctorVoiceSettings {
	conciseness: DoctorVoiceConciseness;
	xrayDetail: XrayDetailLevel;
	mkb10Mode: Mkb10AutoMode;
	tone: ToneOfVoice;
	autoComplaintsExtraction: boolean;
	highlightAllergies: boolean;
}

export interface AiProtocolPromptSettings {
	systemInstructions: string;
	clinicalTriggers: string;
	activeTemplateId: string;
	customVocabulary: string;
}

export interface AiProtocolTemplate {
	id: string;
	title: string;
	specialty: string;
	promptText: string;
	triggers: string[];
}

export interface AiPersonalizeState {
	doctorVoice: DoctorVoiceSettings;
	promptSettings: AiProtocolPromptSettings;
}
