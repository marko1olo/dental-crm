import type { MedicalRecordValidationResult, MedicalRecordData } from "../types/recordDataTypes";

/**
 * Каноническая валидация полноты медицинской карты приёма DENTE CRM.
 * Мандаты 8e (Автономия врача), 8n (Соло-врач), 8y (Запрет палок в колеса).
 *
 * Инвариант: Отсутствие необязательных полей (СНИЛС, полис, место работы)
 * НИКОГДА не блокирует сохранение карты и не окрашивает интерфейс в агрессивный красный цвет.
 */
export function validateMedicalRecordCompleteness(data: MedicalRecordData): MedicalRecordValidationResult {
	const missingFields: MedicalRecordValidationResult["missingFields"] = [];
	const warnings: string[] = [];

	let totalChecks = 0;
	let passedChecks = 0;

	const check = (
		condition: boolean,
		fieldKey: string,
		label: string,
		category: MedicalRecordValidationResult["missingFields"][0]["category"],
		severity: "critical" | "warning" = "warning",
	) => {
		totalChecks++;
		if (condition) {
			passedChecks++;
		} else {
			missingFields.push({ fieldKey, label, category, severity });
		}
	};

	// 1. Паспортная часть и базовые реквизиты пациента
	check(Boolean(data.passport?.patientFullName?.trim()), "patientFullName", "ФИО пациента", "passport", "warning");
	check(Boolean(data.passport?.patientBirthDate?.trim()), "patientBirthDate", "Дата рождения пациента", "passport", "warning");
	check(Boolean(data.passport?.patientSex), "patientSex", "Пол пациента", "passport", "warning");
	check(Boolean(data.passport?.medicalCardNumber?.trim()), "medicalCardNumber", "Номер медицинской карты", "passport", "warning");
	check(Boolean(data.passport?.cardOpenedDate?.trim()), "cardOpenedDate", "Дата заведения карты", "passport", "warning");
	check(Boolean(data.passport?.primaryDiagnosisText?.trim()), "primaryDiagnosisText", "Диагноз при первичном обращении", "passport", "warning");
	check(Boolean(data.passport?.primaryDiagnosisIcd10?.trim()), "primaryDiagnosisIcd10", "Код МКБ-10 первичного диагноза", "passport", "warning");
	check(Boolean(data.passport?.attendingDoctorFullName?.trim()), "attendingDoctorFullName", "ФИО лечащего врача", "passport", "warning");

	// Необязательные поля (СНИЛС, полис, адрес регистрации) — мягкие рекомендации, никогда не блокирующие
	if (data.passport?.patientSnils?.trim()) {
		totalChecks++;
		passedChecks++;
	} else {
		totalChecks++;
		missingFields.push({
			fieldKey: "patientSnils",
			label: "СНИЛС пациента (рекомендуется для ЕГИСЗ)",
			category: "passport",
			severity: "warning",
		});
	}

	if (data.passport?.patientAddressRegistration?.trim()) {
		totalChecks++;
		passedChecks++;
	} else {
		totalChecks++;
		missingFields.push({
			fieldKey: "patientAddressRegistration",
			label: "Адрес регистрации",
			category: "passport",
			severity: "warning",
		});
	}

	// 2. Жалобы и соматический анамнез (по умолчанию норма в 1 клик)
	check(Boolean(data.anamnesis?.chiefComplaint?.trim()), "chiefComplaint", "Жалобы при обращении", "anamnesis", "warning");
	check(Boolean(data.anamnesis?.historyOfPresentIllness?.trim()), "historyOfPresentIllness", "Анамнез заболевания (Anamnesis morbi)", "anamnesis", "warning");
	check(Boolean(data.anamnesis?.medicalHistoryVitae?.trim()), "medicalHistoryVitae", "Анамнез жизни (Anamnesis vitae)", "anamnesis", "warning");
	check(Boolean(data.anamnesis?.allergologicalHistory?.trim()), "allergologicalHistory", "Аллергологический статус", "anamnesis", "warning");
	check(Boolean(data.anamnesis?.concomitantSomaticDiseases?.trim()), "concomitantSomaticDiseases", "Сопутствующие соматические патологии (норма по умолчанию)", "anamnesis", "warning");

	// 3. Стоматологический статус и зубная формула
	check(Boolean(data.dentalStatus?.odontogramTeeth && data.dentalStatus.odontogramTeeth.length > 0), "odontogramTeeth", "Зубная формула FDI", "dental_status", "warning");
	check(Boolean(data.dentalStatus?.biteType), "biteType", "Прикус по Энглю (ортогнатический по умолчанию)", "dental_status", "warning");
	check(Boolean(data.dentalStatus?.oralMucosaStatus?.color), "oralMucosaStatus", "Состояние СОПР (слизистой)", "dental_status", "warning");

	// 4. Дневники визитов
	check(Boolean(data.visitDiaries && data.visitDiaries.length > 0), "visitDiaries", "Запись в дневнике приёма", "diaries", "warning");

	// 5. Эпикриз
	check(Boolean(data.epicrisis?.treatmentSummary?.trim()), "treatmentSummary", "Эпикриз / сводка лечения", "epicrisis", "warning");
	check(Boolean(data.epicrisis?.treatmentOutcome), "treatmentOutcome", "Результат лечения / исход", "epicrisis", "warning");
	check(Boolean(data.epicrisis?.dispensaryGroup), "dispensaryGroup", "Группа контрольного наблюдения", "epicrisis", "warning");

	const score = Math.max(10, Math.round((passedChecks / Math.max(1, totalChecks)) * 100));

	// По Мандату 8e автономия врача гарантирована: карта всегда сохраняема (isComplete: true),
	// сохранение никогда не блокируется из-за незаполненных второстепенных полей.
	return {
		isComplete: true,
		completenessScore: score,
		missingFields,
		warnings,
	};
}

/** Алиас для обратной совместимости */
export const validateForm043uCompleteness = validateMedicalRecordCompleteness;
