import { DEFAULT_PATIENT_FIELD_REQUIREMENTS, type PatientFieldRequirements, validateStaffSnils } from "@dental/shared";
import type { PatientDraftValidationInput, PatientDraftValidationResult } from "./patientFieldRequirementsTypes";

export function validatePatientDraftWithRequirements(
	draft: PatientDraftValidationInput,
	requirements: PatientFieldRequirements = DEFAULT_PATIENT_FIELD_REQUIREMENTS,
): PatientDraftValidationResult {
	const errors: Record<string, string> = {};
	const missingRequiredLabels: string[] = [];

	const nameTrimmed = (draft.fullName || "").trim();
	if (!nameTrimmed && !draft.isEmergencyOrPrimary) {
		errors.fullName = "Укажите ФИО пациента";
		missingRequiredLabels.push("ФИО");
	}

	const phoneRaw = (draft.phone || "").trim();
	const phoneDigits = phoneRaw.replace(/\D/g, "");
	if (requirements.requirePhone && !draft.isAnonymous) {
		if (!phoneRaw) {
			errors.phone = "Телефон обязателен для регистрации карты";
			missingRequiredLabels.push("Телефон");
		} else if (phoneDigits.length < 10) {
			if (!(draft.isEmergencyOrPrimary && phoneDigits.length >= 5)) {
				errors.phone = "Номер телефона слишком короткий (минимум 10 цифр)";
				missingRequiredLabels.push("Корректный телефон");
			}
		}
	} else if (phoneRaw && phoneDigits.length > 0 && phoneDigits.length < 5) {
		errors.phone = "Номер телефона слишком короткий. Исправьте или очистите поле.";
	}

	const sourceTrimmed = (draft.advertisingSource || "").trim();
	if (requirements.requireAdvertisingSource && !draft.isEmergencyOrPrimary && !sourceTrimmed) {
		errors.advertisingSource = "Укажите рекламный источник для сквозной аналитики";
		missingRequiredLabels.push("Рекламный источник");
	}

	const snilsRaw = (draft.snils || "").trim();
	if (requirements.requireSnils && !draft.isAnonymous && !draft.isEmergencyOrPrimary) {
		if (!snilsRaw) {
			errors.snils = "СНИЛС обязателен для электронной медкарты и Госуслуг";
			missingRequiredLabels.push("СНИЛС");
		} else {
			const snilsVal = validateStaffSnils(snilsRaw);
			if (!snilsVal.isValid) {
				errors.snils = snilsVal.error || "Некорректный СНИЛС (ошибка контрольной суммы)";
				missingRequiredLabels.push("СНИЛС (контрольная сумма)");
			}
		}
	} else if (snilsRaw) {
		const snilsVal = validateStaffSnils(snilsRaw);
		if (!snilsVal.isValid) errors.snils = snilsVal.error || "Некорректный формат СНИЛС";
	}

	const birthDateTrimmed = (draft.birthDate || "").trim();
	if (requirements.requireBirthDate && !draft.isEmergencyOrPrimary && !birthDateTrimmed) {
		errors.birthDate = "Дата рождения обязательна для медицинской карты";
		missingRequiredLabels.push("Дата рождения");
	}

	const docTrimmed = (draft.identityDocument || "").trim();
	if (requirements.requireIdentityDocument && !draft.isAnonymous && !draft.isEmergencyOrPrimary && !docTrimmed) {
		errors.identityDocument = "Паспортные данные обязательны для договора";
		missingRequiredLabels.push("Паспорт");
	}

	const isValid = Object.keys(errors).length === 0;
	const blockingLabels = missingRequiredLabels.filter((l) => l === "ФИО" || l.includes("телефон"));
	const advisoryLabels = missingRequiredLabels.filter((l) => l !== "ФИО" && !l.includes("телефон"));

	let guidanceMessage: string | null = null;
	if (blockingLabels.length > 0) {
		guidanceMessage = `Заполните обязательное поле для записи: «${blockingLabels.join(", ")}» (или включите режим «⚡ Срочный приём (Острая боль)»).`;
	} else if (advisoryLabels.length > 0) {
		guidanceMessage = `Рекомендуемые поля клиники: ${advisoryLabels.map((l) => `«${l}»`).join(", ")} (не блокируют регистрацию — можно внести позже в карте или при печати договора).`;
	}

	return { isValid, errors, missingRequiredLabels, guidanceMessage };
}
