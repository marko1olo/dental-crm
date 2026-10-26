import type { MedicalCardForm043uData, Form043ValidationResult } from "../emr043Types";

/** Валидация полноты медицинской карты по Приказу Минздрава РФ № 834н */
export function validateForm043uCompleteness(data: MedicalCardForm043uData): Form043ValidationResult {
	const missingFields: Form043ValidationResult["missingFields"] = [];
	const warnings: string[] = [];

	let totalChecks = 0;
	let passedChecks = 0;

	const check = (
		condition: boolean,
		fieldKey: string,
		label: string,
		category: Form043ValidationResult["missingFields"][0]["category"],
		severity: "critical" | "warning" = "critical",
	) => {
		totalChecks++;
		if (condition) {
			passedChecks++;
		} else {
			missingFields.push({ fieldKey, label, category, severity });
		}
	};

	// Паспортная часть (Раздел 1)
	check(Boolean(data.passport?.patientFullName?.trim()), "patientFullName", "ФИО пациента", "passport", "critical");
	check(Boolean(data.passport?.patientBirthDate?.trim()), "patientBirthDate", "Дата рождения пациента", "passport", "critical");
	check(Boolean(data.passport?.patientSex), "patientSex", "Пол пациента", "passport", "critical");
	check(Boolean(data.passport?.patientAddressRegistration?.trim()), "patientAddressRegistration", "Адрес регистрации", "passport", "critical");
	check(Boolean(data.passport?.patientIdentityDocument?.trim()), "patientIdentityDocument", "Паспортные данные / документ", "passport", "critical");
	check(Boolean(data.passport?.medicalCardNumber?.trim()), "medicalCardNumber", "Номер медицинской карты", "passport", "critical");
	check(Boolean(data.passport?.cardOpenedDate?.trim()), "cardOpenedDate", "Дата заведения карты", "passport", "critical");
	check(Boolean(data.passport?.primaryDiagnosisText?.trim()), "primaryDiagnosisText", "Диагноз при первичном обращении", "passport", "critical");
	check(Boolean(data.passport?.primaryDiagnosisIcd10?.trim()), "primaryDiagnosisIcd10", "Код МКБ-10 первичного диагноза", "passport", "critical");
	check(Boolean(data.passport?.attendingDoctorFullName?.trim()), "attendingDoctorFullName", "ФИО лечащего врача", "passport", "critical");

	if (!data.passport?.patientSnils?.trim()) {
		check(false, "patientSnils", "СНИЛС пациента (рекомендуется для ЕГИСЗ)", "passport", "warning");
	} else {
		totalChecks++;
		passedChecks++;
	}

	// Анамнез (Раздел 2)
	check(Boolean(data.anamnesis?.chiefComplaint?.trim()), "chiefComplaint", "Жалобы при обращении", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.historyOfPresentIllness?.trim()), "historyOfPresentIllness", "Анамнез заболевания (Anamnesis morbi)", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.medicalHistoryVitae?.trim()), "medicalHistoryVitae", "Анамнез жизни (Anamnesis vitae)", "anamnesis", "warning");
	check(Boolean(data.anamnesis?.allergologicalHistory?.trim()), "allergologicalHistory", "Аллергологический статус", "anamnesis", "critical");
	check(Boolean(data.anamnesis?.concomitantSomaticDiseases?.trim()), "concomitantSomaticDiseases", "Сопутствующие соматические патологии (норма по умолчанию)", "anamnesis", "warning");

	// Стоматологический статус и зубная формула (Раздел 3)
	check(Boolean(data.dentalStatus?.odontogramTeeth && data.dentalStatus.odontogramTeeth.length > 0), "odontogramTeeth", "Зубная формула FDI (не менее 1 зуба)", "dental_status", "critical");
	check(Boolean(data.dentalStatus?.biteType), "biteType", "Прикус по Энглю (ортогнатический по умолчанию)", "dental_status", "warning");
	check(Boolean(data.dentalStatus?.oralMucosaStatus?.color), "oralMucosaStatus", "Состояние СОПР (слизистой)", "dental_status", "warning");

	// Дневники визитов (Раздел 4)
	check(Boolean(data.visitDiaries && data.visitDiaries.length > 0), "visitDiaries", "Хотя бы 1 запись в дневнике приёма (Форма 043/у)", "diaries", "critical");

	// Эпикриз (Раздел 5)
	check(Boolean(data.epicrisis?.treatmentSummary?.trim()), "treatmentSummary", "Эпикриз / сводка лечения", "epicrisis", "warning");
	check(Boolean(data.epicrisis?.treatmentOutcome), "treatmentOutcome", "Результат лечения / исход", "epicrisis", "warning");
	check(Boolean(data.epicrisis?.dispensaryGroup), "dispensaryGroup", "Группа контрольного наблюдения", "epicrisis", "warning");

	const score = Math.round((passedChecks / Math.max(1, totalChecks)) * 100);
	const criticalMissing = missingFields.filter((m) => m.severity === "critical");

	return { isComplete: criticalMissing.length === 0, completenessScore: score, missingFields, warnings };
}
