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

export type PatientAdministrativeProfileDraft = {
	[K in Exclude<
		keyof PatientAdministrativeProfile,
		"preferredAppointmentWeekdays"
	>]: string;
} & {
	preferredAppointmentWeekdays: number[];
};

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
	};
}

export type AppointmentScheduleDraft = {
	patientId: string;
	doctorUserId: string;
	assistantUserId: string;
	chairId: string;
	status: Appointment["status"];
	startsAt: string;
	endsAt: string;
	reason: string;
	comment: string;
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
export type VisitNoteForm = Record<VisitNoteField, string>;

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
