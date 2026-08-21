/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА № 043/у — МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА
 * Приказ Минздрава России от 15.12.2014 № 834н
 * Приказ Минздравсоцразвития РФ № 274н / Приказ Минздрава РФ № 804н / СтАР
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	ToothClinicalStatusCode,
	ToothSurface,
	FdiToothRecord,
	DmftIndex,
	CpitnIndex,
	DentalBiteType,
	OralMucosaStatus,
} from "@dental/shared";

/** Паспортная часть и реквизиты клиники */
export interface ClinicRequisites043 {
	clinicName: string;
	clinicLegalName: string;
	clinicAddress: string;
	clinicPhone: string;
	clinicOgrn: string;
	clinicInn: string;
	clinicKpp?: string | null;
	licenseNumber: string;
	licenseDate: string;
	licenseIssuer: string;
	chiefDoctorFullName?: string | null;
}

/** Данные пациента и титульный лист по Приказу Минздрава № 834н */
export interface PatientPassport043 {
	medicalCardNumber: string;
	cardOpenedDate: string;
	patientFullName: string;
	patientBirthDate: string;
	patientSex: "male" | "female";
	patientPhone?: string | null;
	patientEmail?: string | null;
	patientAddressRegistration: string;
	patientAddressResidence?: string | null;
	patientIdentityDocument: string; // Паспорт РФ серия, номер, кем и когда выдан, код подразделения
	patientSnils?: string | null;
	patientInsurancePolicy?: string | null; // ОМС / ДМС полис
	patientInsuranceCompany?: string | null;
	patientPrivilegeCategory?: string | null; // Категория льготности
	primaryDiagnosisText: string; // Диагноз при первичном обращении
	primaryDiagnosisIcd10: string; // Код МКБ-10 при обращении
	attendingDoctorFullName: string;
	attendingDoctorSpecialty: string;
	attendingDoctorSnils?: string | null;
}

/** Анамнез жизни, соматический статус и аллергологический статус */
export interface AnamnesisVitaeAndMorbi043 {
	chiefComplaint: string; // Жалобы при первичном обращении
	historyOfPresentIllness: string; // Анамнез настоящего заболевания (Anamnesis morbi)
	medicalHistoryVitae: string; // Анамнез жизни (Anamnesis vitae)
	allergologicalHistory: string; // Аллергологический статус и непереносимость препаратов
	concomitantSomaticDiseases: string; // Перенесенные и сопутствующие заболевания (ССЗ, сахарный диабет, гепатиты B/C, ВИЧ, туберкулез, онкология)
	currentSystemicMedications: string; // Постоянный прием медикаментов (антикоагулянты, бисфосфонаты, гормоны)
	pregnancyLactationStatus: string; // Беременность / лактация
	pastDentalInterventions: string; // Ранее перенесенные стоматологические вмешательства и реакции на местную анестезию
	occupationalHazardsAndHabits?: string | null; // Профессиональные вредности и вредные привычки (курение, бруксизм)
}

/** Стоматологический статус и индексы */
export interface DentalStatusAndIndices043 {
	odontogramTeeth: FdiToothRecord[];
	dmftIndex: DmftIndex;
	cpitnIndex: CpitnIndex;
	hygieneIndexOhiS: {
		debrisScore: number;
		calculusScore: number;
		totalScore: number;
		ratingText: string;
	};
	biteType: DentalBiteType;
	biteDescription: string;
	oralMucosaStatus: OralMucosaStatus;
	xrayFindingsDescription: string; // Описание рентгенологических данных / ОПТГ / КЛКТ
	xrayRadiationDoseMsv?: number | null; // Суммарная доза облучения (мЗв)
}

/** Дневниковая запись одного посещения (SOAP формат) */
export interface VisitDiaryEntry043 {
	id: string;
	entryDate: string;
	entryTime?: string | null;
	toothNumber?: string | null; // Номер зуба по FDI или область
	subjectiveComplaints: string; // S: Жалобы и динамика
	objectiveStatusLocalis: string; // O: Status localis, данные осмотра
	percussionVertical?: "negative" | "positive_mild" | "positive_sharp";
	percussionHorizontal?: "negative" | "positive_mild" | "positive_sharp";
	probingTenderness?: "none" | "along_enamel_dentin_border" | "at_cavity_bottom" | "bleeding_orifice";
	thermalTestResponse?: "indifferent" | "transient_pain" | "lingering_sharp_pain" | "pain_relieved_by_cold";
	eodMicroamperes?: number | null; // ЭОД в мкА
	probingPocketDepthMm?: number | null; // Глубина зондирования кармана
	assessmentDiagnosisText: string; // A: Клинический диагноз
	assessmentIcd10Code: string; // Код МКБ-10
	procedureProtocol: string; // P: Протокол проведенного лечения
	anesthesiaDetails?: string | null; // Анестетик, доза, метод
	appliedMaterials?: string | null; // Пломбировочные, эндодонтические, костные материалы
	homeCareRecommendations?: string | null; // Рекомендации и назначения на дом
	prescribedMedications?: string | null; // Выписанные рецепты (Форма 107-1/у)
	nextVisitDate?: string | null;
	doctorFullName: string;
	doctorSpecialty?: string | null;
	digitalSignatureHash?: string | null; // Хэш УКЭП (ГОСТ Р 34.10 / SHA-256)
	isSignedWithUkep?: boolean;
}

/** Эпикриз, результаты лечения и план диспансерного наблюдения */
export interface EpicrisisAndDispensary043 {
	treatmentSummary: string; // Сводка проведенного лечения
	treatmentOutcome: "complete_cure" | "remission_stable" | "improvement" | "treatment_in_progress" | "referred_specialized";
	treatmentOutcomeLabel: string;
	dispensaryGroup: "D_I_healthy" | "D_II_risk_factors" | "D_III_chronic_pathology";
	dispensaryGroupLabel: string;
	plannedRecallIntervalMonths: 1 | 3 | 6 | 12;
	preventivePlanRecommendations: string; // Рекомендации по гигиене и вторичной профилактике
	dateCompleted: string;
	headOfDepartmentFullName?: string | null;
	attendingDoctorFullName: string;
}

/** Полный пакет данных медицинской карты 043/у */
export interface MedicalCardForm043uData {
	formNumber: "043/у";
	formOrderName: "Приказ Минздрава России от 15.12.2014 № 834н";
	clinic: ClinicRequisites043;
	passport: PatientPassport043;
	anamnesis: AnamnesisVitaeAndMorbi043;
	dentalStatus: DentalStatusAndIndices043;
	generalTreatmentPlan: string;
	visitDiaries: VisitDiaryEntry043[];
	epicrisis: EpicrisisAndDispensary043;
}

/** Настройки вывода на печать и экспорта карты */
export interface Form043PrintConfig {
	activeTab: "overview" | "passport" | "anamnesis" | "odontogram" | "diaries" | "epicrisis" | "print_preview";
	pageOrientation: "portrait" | "landscape";
	includeClinicLogo: boolean;
	includeClinicRequisites: boolean;
	includeUkepStamp: boolean;
	includeDoctorStampSeal: boolean;
	includePatientSignatureBlock: boolean;
	includeXrayThumbnails: boolean;
	includeFullSoapDiaries: boolean;
	selectedDiaryIds?: string[]; // Ограничить печать выбранными визитами
	fontSizePt: 8 | 8.5 | 9 | 9.5 | 10;
	scaleRatio: number; // 0.75, 1.0, 1.25
	themeMode: "light" | "dark" | "print";
}

/** Результат валидации полноты карты перед печатью/экспортом */
export interface Form043ValidationResult {
	isComplete: boolean;
	completenessScore: number; // 0..100%
	missingFields: Array<{
		fieldKey: string;
		label: string;
		category: "passport" | "anamnesis" | "dental_status" | "diaries" | "epicrisis";
		severity: "critical" | "warning";
	}>;
	warnings: string[];
}
