import type {
	FdiToothRecord,
	DmftIndex,
	CpitnIndex,
	DentalBiteType,
	OralMucosaStatus,
} from "@dental/shared";
import type { ClinicRequisites043 } from "./recordConfigTypes";

export interface HygieneIndexOhiS {
	score?: number | undefined;
	totalScore?: number | undefined;
	rating?: "good" | "satisfactory" | "unsatisfactory" | "poor" | string | undefined;
	ratingLabel?: string | undefined;
	ratingText?: string | undefined;
	debrisScore?: number | undefined;
	calculusScore?: number | undefined;
}

export interface Form043PassportData {
	medicalCardNumber: string;
	cardOpenedDate: string;
	patientFullName: string;
	patientBirthDate: string;
	patientSex: "male" | "female";
	patientPhone: string;
	patientEmail: string;
	patientAddressRegistration: string;
	patientAddressResidence: string;
	patientIdentityDocument: string;
	patientSnils: string;
	patientInsurancePolicy: string;
	patientInsuranceCompany: string;
	patientPrivilegeCategory: string;
	primaryDiagnosisText: string;
	primaryDiagnosisIcd10: string;
	attendingDoctorFullName: string;
	attendingDoctorSpecialty: string;
	attendingDoctorSnils: string;
}

export interface Form043AnamnesisData {
	chiefComplaint: string;
	historyOfPresentIllness: string;
	medicalHistoryVitae: string;
	allergologicalHistory: string;
	concomitantSomaticDiseases: string;
	currentSystemicMedications: string;
	pregnancyLactationStatus: string;
	pastDentalInterventions: string;
	occupationalHazardsAndHabits: string;
}

export interface Form043DentalStatusData {
	odontogramTeeth: FdiToothRecord[];
	dmftIndex: DmftIndex;
	cpitnIndex: CpitnIndex;
	hygieneIndexOhiS: HygieneIndexOhiS;
	biteType: DentalBiteType;
	biteDescription: string;
	oralMucosaStatus: OralMucosaStatus;
	xrayFindingsDescription: string;
	xrayRadiationDoseMsv: number;
}

export interface Form043VisitDiaryEntry {
	id: string;
	entryDate: string;
	entryTime: string | null;
	doctorFullName: string;
	doctorSpecialty: string;
	toothNumber: string | null;
	subjectiveComplaints: string;
	objectiveStatusLocalis: string;
	assessmentDiagnosisText: string;
	assessmentIcd10Code: string;
	procedureProtocol: string;
	anesthesiaDetails?: string | undefined;
	appliedMaterials?: string | undefined;
	homeCareRecommendations?: string | undefined;
	nextVisitDate?: string | undefined;
	isSignedWithUkep?: boolean | undefined;
	digitalSignatureHash?: string | undefined;
	eodMicroamperes?: number | null | undefined;
	percussionVertical?: string | undefined;
	percussionHorizontal?: string | undefined;
	probingTenderness?: string | undefined;
	thermalTestResponse?: string | undefined;
	probingPocketDepthMm?: number | null | undefined;
}

export interface Form043EpicrisisData {
	treatmentSummary: string;
	treatmentOutcome: "cured_complete" | "improvement_remission" | "without_change" | "deterioration" | "treatment_in_progress" | "complete_cure";
	treatmentOutcomeLabel: string;
	dispensaryGroup: "D_I_healthy" | "D_II_risk" | "D_III_chronic_compensated" | "D_III_chronic_subcompensated";
	dispensaryGroupLabel: string;
	plannedRecallIntervalMonths: number;
	preventivePlanRecommendations: string;
	dateCompleted: string;
	headOfDepartmentFullName: string;
	attendingDoctorFullName: string;
}

export interface MedicalCardForm043uData {
	formNumber: "043/у" | "Медицинская карта приёма" | string;
	formOrderName: "Приказ Минздрава СССР от 04.10.1980 № 1030" | "Приказ Минздрава России от 15.12.2014 № 834н" | "Медицинская карта стоматологического пациента" | "Медицинская карта приёма" | string;
	clinic: ClinicRequisites043;
	passport: Form043PassportData;
	anamnesis: Form043AnamnesisData;
	dentalStatus: Form043DentalStatusData;
	generalTreatmentPlan: string;
	visitDiaries: Form043VisitDiaryEntry[];
	epicrisis: Form043EpicrisisData;
}
