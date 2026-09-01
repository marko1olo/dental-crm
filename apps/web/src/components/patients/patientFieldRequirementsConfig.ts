/**
 * patientFieldRequirementsConfig.ts — Настраиваемая обязательность полей карточки пациента (Фича №35).
 *
 * КОНТЕКСТ (IDENT / DentalPRO паритет):
 * Руководитель клиники в настройках может включить обязательность:
 * 1. «Телефон» — обязателен для связи и СМС-оповещений.
 * 2. «Рекламный источник» — обязателен для 100% точности сквозной аналитики и ROMI.
 * 3. «СНИЛС» — обязателен для клиник, выгружающих протоколы приёмов в ЕГИСЗ (РЭМД).
 * 4. «Дата рождения» / «Паспорт» — опциональные строгие режимы.
 */

import { validateStaffSnils } from "@dental/shared";
import { z } from "zod";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../lib/safeLocalStorage";

export const patientFieldRequirementsSchema = z.object({
	requirePhone: z.boolean().default(true),
	requireAdvertisingSource: z.boolean().default(false),
	requireSnils: z.boolean().default(false),
	requireBirthDate: z.boolean().default(false),
	requireIdentityDocument: z.boolean().default(false),
});

export type PatientFieldRequirements = z.infer<typeof patientFieldRequirementsSchema>;

export const DEFAULT_PATIENT_FIELD_REQUIREMENTS: PatientFieldRequirements = {
	requirePhone: true,
	requireAdvertisingSource: false,
	requireSnils: false,
	requireBirthDate: false,
	requireIdentityDocument: false,
};

export const PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY = "dental_crm_patient_field_requirements_v1";

/**
 * Рекламные источники и каналы привлечения пациентов для стоматологии.
 */
export interface AdvertisingSourceOption {
	readonly key: string;
	readonly label: string;
	readonly category: string;
	readonly isOnlineSelfBooking: boolean;
	readonly description?: string;
}

export const DENTAL_ADVERTISING_SOURCES: readonly AdvertisingSourceOption[] = [
	{
		key: "website_online",
		label: "Официальный сайт клиники (Онлайн-запись)",
		category: "Онлайн-самозапись",
		isOnlineSelfBooking: true,
		description: "Прямая запись через виджет на лендинге или сайте",
	},
	{
		key: "yandex_maps",
		label: "Яндекс Карты (Кнопка «Записаться»)",
		category: "Гео-сервисы",
		isOnlineSelfBooking: true,
		description: "Виджет записи в гео-карточке Яндекс Бизнес",
	},
	{
		key: "gis_2",
		label: "2ГИС (Профиль клиники / Запись)",
		category: "Гео-сервисы",
		isOnlineSelfBooking: true,
		description: "Запись из справочника 2ГИС",
	},
	{
		key: "prodoctorov",
		label: "ПроДокторов / СберЗдоровье",
		category: "Мед-агрегаторы",
		isOnlineSelfBooking: true,
		description: "Запись через каталог врачей и агрегатор отзывов",
	},
	{
		key: "tg_bot",
		label: "Telegram-бот / Mini App",
		category: "Мессенджеры",
		isOnlineSelfBooking: true,
		description: "Автоматическая запись через бота в Telegram",
	},
	{
		key: "wa_bot",
		label: "WhatsApp-чатбот / WABA",
		category: "Мессенджеры",
		isOnlineSelfBooking: true,
		description: "Запись в диалоге через WhatsApp Business",
	},
	{
		key: "phone_call_admin",
		label: "Входящий телефонный звонок (Администратор)",
		category: "Телефония АТС",
		isOnlineSelfBooking: false,
		description: "Звонок в регистратуру, оформленный администратором",
	},
	{
		key: "recommendation",
		label: "Рекомендация родственников / друзей",
		category: "Сарафанное радио",
		isOnlineSelfBooking: false,
		description: "Пациент пришёл по совету знакомых",
	},
	{
		key: "walk_in",
		label: "Вывеска / Проходил мимо",
		category: "Офлайн-трафик",
		isOnlineSelfBooking: false,
		description: "Ориентация по фасадной вывеске и наружной рекламе",
	},
	{
		key: "social_media",
		label: "Социальные сети (ВКонтакте / Таргет)",
		category: "Таргетированная реклама",
		isOnlineSelfBooking: false,
		description: "Переход из таргетированной рекламы в соцсетях",
	},
	{
		key: "doctor_referral",
		label: "Направление от внешнего врача-коллеги",
		category: "Партнерская сеть",
		isOnlineSelfBooking: false,
		description: "Направление на КТ/имплантацию от смежного специалиста",
	},
	{
		key: "corporate",
		label: "Корпоративная программа / ДМС",
		category: "Корпоратив",
		isOnlineSelfBooking: false,
		description: "Прикрепление по страховому полису ДМС или договору предприятия",
	},
	{
		key: "other",
		label: "Другой источник",
		category: "Прочее",
		isOnlineSelfBooking: false,
		description: "Прочие каналы информации",
	},
];

/**
 * Чтение текущих настроек обязательности полей карточки пациента.
 */
export function loadPatientFieldRequirements(): PatientFieldRequirements {
	try {
		const raw = safeLocalStorageGetItem(PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			const validated = patientFieldRequirementsSchema.safeParse(parsed);
			if (validated.success) {
				return validated.data;
			}
		}
	} catch {
		// Fallback to default
	}
	return { ...DEFAULT_PATIENT_FIELD_REQUIREMENTS };
}

/**
 * Сохранение настроек обязательности полей карточки пациента.
 */
export function savePatientFieldRequirements(
	requirements: PatientFieldRequirements,
): void {
	const validated = patientFieldRequirementsSchema.parse(requirements);
	safeLocalStorageSetItem(
		PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY,
		JSON.stringify(validated),
	);
}

/**
 * Входные данные черновика пациента для проверки.
 */
export interface PatientDraftValidationInput {
	fullName: string;
	phone?: string | null | undefined;
	advertisingSource?: string | null | undefined;
	snils?: string | null | undefined;
	birthDate?: string | null | undefined;
	identityDocument?: string | null | undefined;
}

export interface PatientDraftValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	missingRequiredLabels: string[];
	guidanceMessage: string | null;
}

/**
 * Валидация черновика карточки пациента с учётом требований клиники (Фича №35).
 */
export function validatePatientDraftWithRequirements(
	draft: PatientDraftValidationInput,
	requirements: PatientFieldRequirements = DEFAULT_PATIENT_FIELD_REQUIREMENTS,
): PatientDraftValidationResult {
	const errors: Record<string, string> = {};
	const missingRequiredLabels: string[] = [];

	// 1. ФИО всегда обязательно
	const nameTrimmed = (draft.fullName || "").trim();
	if (!nameTrimmed) {
		errors.fullName = "Укажите ФИО пациента";
		missingRequiredLabels.push("ФИО");
	}

	// 2. Телефон (по настройке)
	const phoneRaw = (draft.phone || "").trim();
	const phoneDigits = phoneRaw.replace(/\D/g, "");
	if (requirements.requirePhone) {
		if (!phoneRaw) {
			errors.phone = "Телефон обязателен для регистрации карты";
			missingRequiredLabels.push("Телефон");
		} else if (phoneDigits.length < 10) {
			errors.phone = "Номер телефона слишком короткий (минимум 10 цифр)";
			missingRequiredLabels.push("Корректный телефон");
		}
	} else if (phoneRaw && phoneDigits.length > 0 && phoneDigits.length < 5) {
		errors.phone = "Номер телефона слишком короткий. Исправьте или очистите поле.";
	}

	// 3. Рекламный источник (по настройке)
	const sourceTrimmed = (draft.advertisingSource || "").trim();
	if (requirements.requireAdvertisingSource) {
		if (!sourceTrimmed) {
			errors.advertisingSource = "Укажите рекламный источник для сквозной аналитики";
			missingRequiredLabels.push("Рекламный источник");
		}
	}

	// 4. СНИЛС (по настройке с проверкой контрольной суммы 192-П)
	const snilsRaw = (draft.snils || "").trim();
	if (requirements.requireSnils) {
		if (!snilsRaw) {
			errors.snils = "СНИЛС обязателен для передачи данных в ЕГИСЗ (РЭМД)";
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
		if (!snilsVal.isValid) {
			errors.snils = snilsVal.error || "Некорректный формат СНИЛС";
		}
	}

	// 5. Дата рождения (по настройке)
	const birthDateTrimmed = (draft.birthDate || "").trim();
	if (requirements.requireBirthDate) {
		if (!birthDateTrimmed) {
			errors.birthDate = "Дата рождения обязательна для амбулаторной карты 043/у";
			missingRequiredLabels.push("Дата рождения");
		}
	}

	// 6. Паспорт РФ (по настройке)
	const docTrimmed = (draft.identityDocument || "").trim();
	if (requirements.requireIdentityDocument) {
		if (!docTrimmed) {
			errors.identityDocument = "Паспортные данные обязательны для договора";
			missingRequiredLabels.push("Паспорт");
		}
	}

	const isValid = Object.keys(errors).length === 0;

	let guidanceMessage: string | null = null;
	if (!isValid) {
		if (missingRequiredLabels.length === 1) {
			guidanceMessage = `Заполните обязательное поле: «${missingRequiredLabels[0]}».`;
		} else {
			guidanceMessage = `Заполните обязательные поля клиники: ${missingRequiredLabels.map((l) => `«${l}»`).join(", ")}.`;
		}
	}

	return {
		isValid,
		errors,
		missingRequiredLabels,
		guidanceMessage,
	};
}
