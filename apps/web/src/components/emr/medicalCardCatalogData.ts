/**
 * apps/web/src/components/emr/medicalRecordCatalogData.ts
 *
 * Канонический SSOT-модуль медицинской карты приёма и клинического каталога DENTE (Мандаты 8b, 8e, 8n, 8x, 8ap).
 * Единый доменный язык: «Медицинская карта приёма» и «Дневник визита».
 * Полный отказ от номеров советских приказов («043/у») и бюрократического канцелярита.
 * 
 * Sweet Spot: ~280-340 строк.
 */

import type { FdiToothRecord } from "@dental/shared";
import type {
	ClinicRequisites043,
	MedicalRecordData,
	Form043VisitDiaryEntry,
} from "./types/recordDataTypes";

/** Канонический набор 32 постоянных зубов по формуле FDI (11–48) */
export const DEFAULT_32_PERMANENT_TEETH: FdiToothRecord[] = [
	{ toothNumber: 18, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 17, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 16, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 15, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 14, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 13, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 12, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 11, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 21, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 22, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 23, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 24, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 25, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 26, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 27, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 28, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 48, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 47, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 46, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 45, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 44, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 43, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 42, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 41, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 31, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 32, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 33, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 34, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 35, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 36, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 37, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
	{ toothNumber: 38, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
];

/** Канонические эталонные данные по умолчанию для медицинской карты пациента (Мандат 8x, 8ap) */
export const DEFAULT_MEDICAL_CARD_DATA: MedicalRecordData = {
	formNumber: "Медицинская карта приёма",
	formOrderName: "Медицинская карта стоматологического пациента",
	clinic: {
		clinicName: "Стоматологическая клиника «ДЕНТЕ»",
		clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicAddress: "",
		clinicPhone: "",
		clinicOgrn: "",
		clinicInn: "",
		clinicKpp: "",
		licenseNumber: "",
		licenseDate: "",
		licenseIssuer: "",
		chiefDoctorFullName: "",
	},
	passport: {
		medicalCardNumber: "",
		cardOpenedDate: "",
		patientFullName: "",
		patientBirthDate: "",
		patientSex: "male",
		patientPhone: "",
		patientEmail: "",
		patientAddressRegistration: "",
		patientAddressResidence: "",
		patientIdentityDocument: "",
		patientSnils: "",
		patientInsurancePolicy: "",
		patientInsuranceCompany: "",
		patientPrivilegeCategory: "Нет льгот",
		primaryDiagnosisText: "",
		primaryDiagnosisIcd10: "",
		attendingDoctorFullName: "",
		attendingDoctorSpecialty: "",
		attendingDoctorSnils: "",
	},
	anamnesis: {
		chiefComplaint: "",
		historyOfPresentIllness: "",
		medicalHistoryVitae: "",
		allergologicalHistory: "",
		concomitantSomaticDiseases: "",
		currentSystemicMedications: "",
		pregnancyLactationStatus: "",
		pastDentalInterventions: "",
		occupationalHazardsAndHabits: "",
	},
	dentalStatus: {
		odontogramTeeth: DEFAULT_32_PERMANENT_TEETH,
		dmftIndex: {
			decayed: 0,
			filled: 0,
			missing: 0,
			totalDmft: 0,
			decayedSurfaces: 0,
			filledSurfaces: 0,
			totalDmfs: 0,
			deciduousDecayed: 0,
			deciduousFilled: 0,
			deciduousExtracted: 0,
			totalDft: 0,
			intensityLevel: "very_low",
		},
		cpitnIndex: {
			sextant18_14: "0_healthy",
			sextant13_23: "0_healthy",
			sextant24_28: "0_healthy",
			sextant48_44: "0_healthy",
			sextant43_33: "0_healthy",
			sextant34_38: "0_healthy",
			treatmentNeedCategory: "0_none",
		},
		hygieneIndexOhiS: { debrisScore: 0, calculusScore: 0, totalScore: 0, ratingText: "OHI-S = 0 (Хороший уровень гигиены)" },
		biteType: "orthognathic",
		biteDescription: "Прикус ортогнатический, смыкание моляров и клыков по I классу Энгля, резцовое перекрытие в пределах 1/3 высоты коронки.",
		oralMucosaStatus: {
			color: "pale_pink_normal",
			moisture: "normal",
			pathologicalElements: null,
			gingivalPapillae: "normal_pointed",
			bleedingPBI: "grade_0",
			tongueStatus: "Язык чистый, влажный, сосочковый слой выражен умеренно, налета нет.",
			regionalLymphNodes: "Подчелюстные, шейные, подбородочные лимфатические узлы не пальпируются, безболезненные.",
			tmjFunction: "Открывание рта свободное, в полном объеме, движений девиации и крепитации/щелчков в суставах нет.",
		},
		xrayFindingsDescription: "",
		xrayRadiationDoseMsv: 0,
	},
	generalTreatmentPlan: "",
	visitDiaries: [],
	epicrisis: {
		treatmentSummary: "",
		treatmentOutcome: "treatment_in_progress",
		treatmentOutcomeLabel: "Лечение продолжается",
		dispensaryGroup: "D_I_healthy",
		dispensaryGroupLabel: "Д-I (Здоров)",
		plannedRecallIntervalMonths: 6,
		preventivePlanRecommendations: "",
		dateCompleted: "",
		headOfDepartmentFullName: "",
		attendingDoctorFullName: "",
	},
};

/** Быстрые клинические пресеты дневников приёма (SOAP) */
export const CLINICAL_SOAP_PRESETS = [
	{
		id: "caries_therapy",
		label: "Терапия: Кариес дентина (K02.1)",
		mkb10: "K02.1",
		complaint: "Кратковременные боли от холодного и сладкого, быстро проходящие после устранения раздражителя.",
		objective: "Кариозная полость в пределах средних слоев дентина. Зондирование слабо болезненно по эмалево-дентинной границе. Перкуссия безболезненна.",
		treatment: "Препарирование полости, медикаментозная обработка 2% хлоргексидином, изолирующая прокладка, адгезивный протокол, послойная реставрация композитом светового отверждения, шлифовка и полировка.",
		recommendations: "Ограничение красящих продуктов на 24 часа. Гигиенический уход щеткой средней жесткости.",
	},
	{
		id: "pulpitis_endo",
		label: "Эндодонтия: Пульпит острый очаговый (K04.0)",
		mkb10: "K04.0",
		complaint: "Самопроизвольные приступообразные боли, усиливающиеся в ночное время, иррадиирующие по ходу ветвей тройничного нерва.",
		objective: "Глубокая кариозная полость, дно размягчено, зондирование одной точки болезненно. Реакция на холод длительная, перкуссия интактна.",
		treatment: "Анестезия проводниковая/инфильтрационная, раскрытие полости зуба, ампутация и экстирпация пульпы, механическая и медикаментозная обработка корневых каналов NaOCl 3%, обтурация гуттаперчей с силером.",
		recommendations: "Прием НПВС при возникновении постпломбировочной чувствительности. Контрольный рентген-снимок.",
	},
	{
		id: "hygiene_prophylaxis",
		label: "Профилактика: Профессиональная гигиена",
		mkb10: "Z01.2",
		complaint: "Жалоб нет. Обратился для плановой профессиональной гигиены и снятия зубных отложений.",
		objective: "Наддесневой и поддесневой зубной камень в области фронтальных зубов нижней челюсти. Пигментированный налет курильщика/чая. Десна гиперемирована, кровоточивость при зондировании I степени.",
		treatment: "Ультразвуковой скейлинг над- и поддесневых зубных отложений, воздушно-абразивная обработка Air-Flow глициновым порошком, полировка пастой, аппликация фторлака.",
		recommendations: "Смена зубной щетки, использование флосса и межзубных ершиков. Контрольный осмотр через 6 месяцев.",
	},
];

/** Алиасы обратной совместимости (Мандат 8ap) */
export const DEFAULT_043_DATA = DEFAULT_MEDICAL_CARD_DATA;
export const DEFAULT_CLINICAL_DIARY_DATA = DEFAULT_MEDICAL_CARD_DATA;

/** Резолвер реквизитов клиники из настроек и профиля */
export function resolveClinicRequisites(
	initialClinic?: Partial<ClinicRequisites043>,
	profile?: {
		clinicName?: string | null | undefined;
		legalName?: string | null | undefined;
		address?: string | null | undefined;
		phone?: string | null | undefined;
		ogrn?: string | null | undefined;
		inn?: string | null | undefined;
		kpp?: string | null | undefined;
		medicalLicenseNumber?: string | null | undefined;
		medicalLicenseIssuedAt?: string | null | undefined;
		medicalLicenseIssuer?: string | null | undefined;
		signatoryName?: string | null | undefined;
		[key: string]: unknown;
	} | null | undefined,
	staff?: { role?: string; specialties?: string[]; fullName?: string }[],
): ClinicRequisites043 {
	const resolvedChiefDoctor =
		staff?.find(
			(s) =>
				s.role === "owner" ||
				(s.specialties && s.specialties.some((sp) => sp.toLowerCase().includes("глав"))),
		)?.fullName ||
		profile?.signatoryName ||
		"";

	return {
		clinicName:
			initialClinic?.clinicName ||
			profile?.clinicName ||
			DEFAULT_MEDICAL_CARD_DATA.clinic.clinicName,
		clinicLegalName:
			initialClinic?.clinicLegalName ||
			profile?.legalName ||
			profile?.clinicName ||
			DEFAULT_MEDICAL_CARD_DATA.clinic.clinicLegalName,
		clinicAddress: initialClinic?.clinicAddress || profile?.address || "",
		clinicPhone: initialClinic?.clinicPhone || profile?.phone || "",
		clinicOgrn: initialClinic?.clinicOgrn || profile?.ogrn || "",
		clinicInn: initialClinic?.clinicInn || profile?.inn || "",
		clinicKpp: initialClinic?.clinicKpp || profile?.kpp || "",
		licenseNumber: initialClinic?.licenseNumber || profile?.medicalLicenseNumber || "",
		licenseDate: initialClinic?.licenseDate || profile?.medicalLicenseIssuedAt || "",
		licenseIssuer: initialClinic?.licenseIssuer || profile?.medicalLicenseIssuer || "",
		chiefDoctorFullName: initialClinic?.chiefDoctorFullName || resolvedChiefDoctor || "",
	};
}

/**
 * 1-клик фиксация физиологической нормы соматического статуса и интактных зубов (Мандат 8e).
 * Врач у кресла лечит патологию, а норма заполняется мгновенно без 50 больничных чекбоксов.
 */
export function applyMedicalCardPhysiologicalNorm(prev: MedicalRecordData): MedicalRecordData {
	return {
		...prev,
		anamnesis: {
			...prev.anamnesis,
			chiefComplaint: prev.anamnesis?.chiefComplaint?.trim()
				? prev.anamnesis.chiefComplaint
				: "Плановый профилактический осмотр, санация полости рта.",
			historyOfPresentIllness: prev.anamnesis?.historyOfPresentIllness?.trim()
				? prev.anamnesis.historyOfPresentIllness
				: "Обратился для планового профилактического осмотра и оценки гигиенического состояния полости рта.",
			medicalHistoryVitae: prev.anamnesis?.medicalHistoryVitae?.trim()
				? prev.anamnesis.medicalHistoryVitae
				: "Рос и развивался соответственно возрасту. Туберкулез, гепатиты, ВИЧ, сифилис отрицает. Наследственный анамнез не отягощен.",
			allergologicalHistory: prev.anamnesis?.allergologicalHistory?.trim()
				? prev.anamnesis.allergologicalHistory
				: "Аллергологический анамнез не отягощен. Непереносимости местных анестетиков артикаинового ряда и лекарственных средств не отмечает.",
			concomitantSomaticDiseases: prev.anamnesis?.concomitantSomaticDiseases?.trim()
				? prev.anamnesis.concomitantSomaticDiseases
				: "Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.",
			currentSystemicMedications: prev.anamnesis?.currentSystemicMedications?.trim()
				? prev.anamnesis.currentSystemicMedications
				: "Постоянный прием лекарственных препаратов отрицает.",
			pastDentalInterventions: prev.anamnesis?.pastDentalInterventions?.trim()
				? prev.anamnesis.pastDentalInterventions
				: "Ранее проводившиеся стоматологические вмешательства и местную анестезию переносил удовлетворительно.",
			occupationalHazardsAndHabits: prev.anamnesis?.occupationalHazardsAndHabits?.trim()
				? prev.anamnesis.occupationalHazardsAndHabits
				: "Вредных производственных факторов и вредных привычек не отмечает.",
		},
		dentalStatus: {
			...prev.dentalStatus,
			odontogramTeeth: prev.dentalStatus?.odontogramTeeth?.length
				? prev.dentalStatus.odontogramTeeth
				: DEFAULT_32_PERMANENT_TEETH,
			biteType: prev.dentalStatus?.biteType || "orthognathic",
			biteDescription:
				prev.dentalStatus?.biteDescription ||
				"Прикус ортогнатический, смыкание моляров и клыков по I классу Энгля, резцовое перекрытие в пределах 1/3 высоты коронки.",
			oralMucosaStatus: {
				color: prev.dentalStatus?.oralMucosaStatus?.color || "pale_pink_normal",
				moisture: prev.dentalStatus?.oralMucosaStatus?.moisture || "normal",
				pathologicalElements: prev.dentalStatus?.oralMucosaStatus?.pathologicalElements ?? null,
				gingivalPapillae: prev.dentalStatus?.oralMucosaStatus?.gingivalPapillae || "normal_pointed",
				bleedingPBI: prev.dentalStatus?.oralMucosaStatus?.bleedingPBI || "grade_0",
				tongueStatus:
					prev.dentalStatus?.oralMucosaStatus?.tongueStatus ||
					"Язык чистый, влажный, сосочковый слой выражен умеренно, налета нет.",
				regionalLymphNodes:
					prev.dentalStatus?.oralMucosaStatus?.regionalLymphNodes ||
					"Подчелюстные, шейные, подбородочные лимфатические узлы не пальпируются, безболезненные.",
				tmjFunction:
					prev.dentalStatus?.oralMucosaStatus?.tmjFunction ||
					"Открывание рта свободное, в полном объеме, движений девиации и крепитации/щелчков в суставах нет.",
			},
		},
	};
}

/** Алиасы обратной совместимости (Мандат 8ap) */
export const applyForm043PhysiologicalNorm = applyMedicalCardPhysiologicalNorm;
export const applyClinicalDiaryPhysiologicalNorm = applyMedicalCardPhysiologicalNorm;
