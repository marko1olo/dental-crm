import type {
	Appointment,
	DenteTelegramVisualCardUrls,
	MprProjection,
	MprWindowPreset,
	PatientAdministrativeProfile,
} from "@dental/shared";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export function emptyPatientCoreDraft(): PatientCoreDraft {
	return {
		fullName: "",
		birthDate: "",
		phone: "",
		email: "",
		notes: "",
	};
}

import type { PatientAdministrativeProfileDraft } from "../constants/onboardingConstants";
export type { PatientAdministrativeProfileDraft };

export function emptyPatientAdministrativeProfileDraft(): PatientAdministrativeProfileDraft {
	return {
		identityDocument: "",
		taxpayerInn: "",
		registrationAddress: "",
		residentialAddress: "",
		insurancePolicyNumber: "",
		snils: "",
		legalRepresentativeFullName: "",
		legalRepresentativeRelationship: "",
		legalRepresentativeIdentityDocument: "",
		legalRepresentativePhone: "",
		preferredDocumentRecipient: "",
		preferredAppointmentWeekdays: [],
		preferredAppointmentStart: "",
		preferredAppointmentEnd: "",
		preferredAppointmentNote: "",
		dataProcessingBasisNote: "",
		orthodonticProgress: "",
		loyaltyTier: "standard",
		curatorId: "",
		curatorFullName: "",
		curatorAssignedAt: "",
		curatorFunnelStage: "consultation",
		curatorCommissionPercent: "",
		curatorNotes: "",
		curatorNextContactDate: "",
		isAnonymous: false,
		anonymousCode: null,
		gender: "",
		insuranceContractId: "",
		dmsInsuranceCompany: "",
		dmsPolicyNumber: "",
		dmsGuaranteeLetterNumber: "",
		dmsCoverageLimitKopecks: null,
		dmsCoverageLimitRub: null,
		utmSource: "",
		utmMedium: "",
		utmCampaign: "",
		utmContent: "",
		utmTerm: "",
		leadSource: "",
		advertisingSource: "",
		telegramUserId: null,
		telegramUsername: null,
	};
}



export type AppointmentScheduleDraft = {
	patientId?: string | null | undefined;
	doctorUserId: string;
	assistantUserId?: string | null | undefined;
	chairId: string;
	status: Appointment["status"];
	startsAt: string;
	endsAt: string;
	reason?: string | undefined;
	comment?: string | undefined;
	notes?: string | undefined;
	cancellationReason?: string | undefined;
};

export function emptyAppointmentScheduleDraft(): AppointmentScheduleDraft {
	return {
		patientId: "",
		doctorUserId: "",
		assistantUserId: "",
		chairId: "",
		status: "planned",
		startsAt: "",
		endsAt: "",
		reason: "",
		comment: "",
	};
}

export const emptyTelegramVisualCardUrlDrafts =
	(): DenteTelegramVisualCardUrls => ({
		mainMenu: null,
		appointment: null,
		documents: null,
		tax: null,
		billing: null,
		care: null,
		review: null,
		staff: null,
	});

export type VisitNoteField =
	| "complaint"
	| "anamnesis"
	| "objectiveStatus"
	| "diagnosis"
	| "treatmentPlan";
export type VisitNoteForm = Record<VisitNoteField, string> & {
	recommendations?: string;
	treatment?: string;
};

export const emptyVisitNoteForm: VisitNoteForm = {
	complaint: "",
	anamnesis: "",
	objectiveStatus: "",
	diagnosis: "",
	treatmentPlan: "",
};

export const defaultClinicalToothRowsText =
	"36 | окклюзионная, дистальная | кариес | кариес дентина 36 зуба по осмотру и снимку | восстановление функции и профилактика осложнений | лечение кариеса и композитная реставрация | прогноз зависит от гигиены и контроля | десна без острого воспаления | | ";

export type ImagingViewerState = {
	rotationDeg: number;
	flipHorizontal: boolean;
	inverted: boolean;
	brightness: number;
	contrast: number;
	zoom: number;
	panX: number;
	panY: number;
	projection: MprProjection;
	preset: MprWindowPreset;
};

export const defaultImagingViewerState: ImagingViewerState = {
	rotationDeg: 0,
	flipHorizontal: false,
	inverted: false,
	brightness: 1,
	contrast: 1.08,
	zoom: 1,
	panX: 0,
	panY: 0,
	projection: "axial",
	preset: "bone",
};

export const defaultDicomFirstFrameViewerState: ImagingViewerState = {
	rotationDeg: 0,
	flipHorizontal: false,
	inverted: false,
	brightness: 1,
	contrast: 1,
	zoom: 1,
	panX: 0,
	panY: 0,
	projection: "axial",
	preset: "bone",
};

export type ClinicalMaterialPreferencesDraft = {
	defaultImplantSystemId: string;
	defaultBoneMaterialId: string;
	defaultEndoFileId: string;
	defaultEndoSealerId: string;
	defaultBracketSystemId: string;
	defaultProsthoImpressionId: string;
	defaultProsthoCementId: string;
};

export const defaultClinicalMaterialPreferences: ClinicalMaterialPreferencesDraft = {
	defaultImplantSystemId: "implant_osstem_tsiii",
	defaultBoneMaterialId: "bone_bio_oss_spongiosa",
	defaultEndoFileId: "endo_protaper_gold",
	defaultEndoSealerId: "sealer_ah_plus",
	defaultBracketSystemId: "damon_q2",
	defaultProsthoImpressionId: "silicone_elite_hd_plus",
	defaultProsthoCementId: "cement_relyx_u200",
};
