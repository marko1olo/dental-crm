/**
 * patientFieldRequirementsConfig.ts — Single Source of Truth (SSOT) для валидации и требований к полям карты пациента.
 *
 * СНИЛС обязателен для электронной медкарты и Госуслуг (для оформления вычета и передачи данных).
 * МАНДАТЫ 8e (АВТОНОМИЯ ВРАЧА/РЕГИСТРАТОРА) & 8n (СУВЕРЕНИТЕТ СОЛО-ПРАКТИКИ):
 * - Быстрый интейк в 1 клик: создание пациента требует СТРОГО Имя и Телефон.
 * - Паспортные данные, адрес регистрации, СНИЛС и полис ОМС/ДМС — 100% опциональны
 *   и НИКОГДА не блокируют регистрацию, сохранение карты или запись в расписание.
 * - При отсутствии опциональных полей система формирует мягкое консультативное сообщение,
 *   а валидация возвращает isValid = true.
 */

import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY,
	type PatientFieldRequirements,
	patientFieldRequirementsSchema,
	validateStaffSnils,
} from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";

export {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY,
	type PatientFieldRequirements,
	patientFieldRequirementsSchema,
};

// ─── 1. ТИПЫ ─────────────────────────────────────────────────────────────────

export interface AdvertisingSourceOption {
	readonly key: string;
	readonly label: string;
	readonly category: string;
	readonly isOnlineSelfBooking: boolean;
	readonly description?: string;
}

export interface PatientDraftValidationInput {
	fullName: string;
	phone?: string | null | undefined;
	advertisingSource?: string | null | undefined;
	snils?: string | null | undefined;
	birthDate?: string | null | undefined;
	identityDocument?: string | null | undefined;
	isAnonymous?: boolean | null | undefined;
	isEmergencyOrPrimary?: boolean | null | undefined;
}

export interface PatientDraftValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	missingRequiredLabels: string[];
	guidanceMessage: string | null;
}

// ─── 2. КАТАЛОГ РЕКЛАМНЫХ ИСТОЧНИКОВ ─────────────────────────────────────────

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

// ─── 3. ХРАНИЛИЩЕ НАСТРОЕК КЛИНИКИ ───────────────────────────────────────────

export function loadPatientFieldRequirements(): PatientFieldRequirements {
	try {
		const raw = safeLocalStorageGetItem(PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			const validated = patientFieldRequirementsSchema.safeParse(parsed);
			if (validated.success) return validated.data;
		}
	} catch {
		// fallback
	}
	return { ...DEFAULT_PATIENT_FIELD_REQUIREMENTS };
}

export function savePatientFieldRequirements(requirements: PatientFieldRequirements): void {
	const validated = patientFieldRequirementsSchema.parse(requirements);
	safeLocalStorageSetItem(PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY, JSON.stringify(validated));
}

// ─── 4. НЕБЛОКИРУЮЩАЯ ВАЛИДАЦИЯ ДЛЯ БЫСТРОГО ИНТЕЙКА (МАНДАТ 8e, 8n) ──────────

export function validatePatientDraftWithRequirements(
	draft: PatientDraftValidationInput,
	requirements: PatientFieldRequirements = DEFAULT_PATIENT_FIELD_REQUIREMENTS,
): PatientDraftValidationResult {
	const errors: Record<string, string> = {};
	const missingRequiredLabels: string[] = [];

	// 1. ФИО: обязательно только при отсутствии флага острой боли / экстренного приёма
	const nameTrimmed = (draft.fullName || "").trim();
	if (!nameTrimmed && !draft.isEmergencyOrPrimary) {
		errors.fullName = "Укажите ФИО пациента";
		missingRequiredLabels.push("ФИО");
	}

	// 2. Телефон: проверка формата и обязательности
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

	// 3. Рекламный источник: консультативное поле (не блокирует регистрацию)
	const sourceTrimmed = (draft.advertisingSource || "").trim();
	if (requirements.requireAdvertisingSource && !draft.isEmergencyOrPrimary && !sourceTrimmed) {
		missingRequiredLabels.push("Рекламный источник");
	}

	// 4. СНИЛС: 100% опционален, проверяется ТОЛЬКО если пользователь ввел значение (не блокирует регистрацию)
	const snilsRaw = (draft.snils || "").trim();
	if (snilsRaw) {
		const snilsVal = validateStaffSnils(snilsRaw);
		if (!snilsVal.isValid) {
			errors.snils = snilsVal.error || "Некорректный СНИЛС (ошибка контрольной суммы)";
			missingRequiredLabels.push("СНИЛС (контрольная сумма)");
		}
	} else if (requirements.requireSnils && !draft.isAnonymous && !draft.isEmergencyOrPrimary) {
		// МАНДАТ 8e: пустое поле фиксируется в рекомендациях, но НЕ в errors!
		missingRequiredLabels.push("СНИЛС");
	}

	// 5. Дата рождения: консультативное поле (не блокирует регистрацию)
	const birthDateTrimmed = (draft.birthDate || "").trim();
	if (requirements.requireBirthDate && !draft.isEmergencyOrPrimary && !birthDateTrimmed) {
		missingRequiredLabels.push("Дата рождения");
	}

	// 6. Паспорт РФ: 100% опционален (не блокирует регистрацию)
	const docTrimmed = (draft.identityDocument || "").trim();
	if (requirements.requireIdentityDocument && !draft.isAnonymous && !draft.isEmergencyOrPrimary && !docTrimmed) {
		missingRequiredLabels.push("Паспорт");
	}

	// Валидность карты: ТОЛЬКО реальные синтаксические ошибки блокируют создание
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
