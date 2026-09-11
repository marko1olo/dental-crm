/**
 * packages/shared/src/patients/stomxPatientTagsCatalog.ts
 *
 * StomX Patient Tags, Legal Representatives, Marketing Sources & Appointment Reasons Harmonizer.
 * Derived from StomX catalogs:
 *   - data/catalogs/client_labels.json (Audit & Event timeline labels)
 *   - data/catalogs/representative_types.json (Statutory & Family representatives)
 *   - data/catalogs/info_sources.json (Marketing lead generation channels)
 *   - data/catalogs/appt_reasons.json (Visit clinical & doctor blocking reasons)
 *   - data/catalogs/appt_refuse_reasons.json (Visit cancellation & refusal reasons)
 *
 * Invariants & Regulatory Compliance:
 * - Mandate 8e: Doctor & Staff Autonomy (Red alert badges for allergy/acute pain without blocking workflows)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Zero dead-ends, no mandatory assistant, fast 1-click tagging)
 * - Russian Family Code (СК РФ ст. 64) & Healthcare Law (323-ФЗ ст. 20) for legal representatives
 * - Maximum file length strictly <= 800 lines
 */

import { z } from "zod";

// ============================================================================
// 1. PATIENT TAGS & CLINICAL / ADMIN LABELS (МЕТКИ И БЕЙДЖИ ПАЦИЕНТА)
// ============================================================================

export const PATIENT_TAG_CATEGORIES = [
	"clinical",       // Клинические особенности (аллергия, острая боль, беременность)
	"administrative", // Административные пометки (VIP, черный список, сложный пациент)
	"financial",      // Финансовый статус (ДМС, задолженность, рассрочка)
	"social",         // Социальная категория (пенсионер, медработник, ребенок)
] as const;

export const patientTagCategorySchema = z.enum(PATIENT_TAG_CATEGORIES);
export type PatientTagCategory = z.infer<typeof patientTagCategorySchema>;

export const STOMX_PATIENT_TAG_CODES = [
	"allergy",         // Аллергия / Осторожно: лекарственная непереносимость (КРИТИЧЕСКИЙ АЛЕРТ)
	"acute_pain",      // Острая боль / Cito (Экстренный прием)
	"pregnancy",       // Беременность / Лактация (Ограничения по анестезии/рентгену)
	"complex_patient", // Сложный пациент / Дентафобия / Требует удлиненный тайминг
	"vip",             // VIP-пациент / Особое сервисное сопровождение
	"blacklist",       // Черный список / Конфликтный / Неявщик (Предупреждение, не блокирует прием)
	"dms",             // ДМС / Обслуживание по страховому полису
	"child",           // Детский прием (молочный / сменный прикус)
	"pensioner",       // Пенсионер / Ветеран (льготные программы)
	"medical_staff",   // Медработник / Коллега (профессиональная скидка)
	"disability",      // Маломобильный пациент / Помощь с креслом
	"debtor",          // Наличие задолженности за прошлые приемы
	"family_head",     // Владелец общего семейного счета / Глава семьи
] as const;

export const stomxPatientTagCodeSchema = z.enum(STOMX_PATIENT_TAG_CODES);
export type StomxPatientTagCode = z.infer<typeof stomxPatientTagCodeSchema>;

export interface StomxPatientTagMeta {
	readonly code: StomxPatientTagCode;
	readonly labelRu: string;
	readonly category: PatientTagCategory;
	readonly isRedAlert: boolean; // Отображать ли критический красный алерт в Tier 1 шапке
	readonly colorHex: string;
	readonly bgHex: string;
	readonly iconName: string;
	readonly descriptionRu: string;
}

export const STOMX_PATIENT_TAGS_CATALOG: readonly StomxPatientTagMeta[] = [
	{
		code: "allergy",
		labelRu: "Аллергия / Непереносимость",
		category: "clinical",
		isRedAlert: true,
		colorHex: "#ef4444",
		bgHex: "rgba(239, 68, 68, 0.14)",
		iconName: "AlertTriangle",
		descriptionRu: "Лекарственная непереносимость (анестетики, антибиотики, латекс). Красный алерт на приеме.",
	},
	{
		code: "acute_pain",
		labelRu: "Острая боль / Cito",
		category: "clinical",
		isRedAlert: true,
		colorHex: "#f97316",
		bgHex: "rgba(249, 115, 22, 0.14)",
		iconName: "Flame",
		descriptionRu: "Экстренное обращение с острой болью (пульпит, периостит). Приоритет в живой очереди.",
	},
	{
		code: "pregnancy",
		labelRu: "Беременность / Лактация",
		category: "clinical",
		isRedAlert: false,
		colorHex: "#ec4899",
		bgHex: "rgba(236, 72, 153, 0.14)",
		iconName: "Heart",
		descriptionRu: "Ограничения на назначение рентгенологических исследований и препаратов с адреналином.",
	},
	{
		code: "complex_patient",
		labelRu: "Сложный пациент / Дентафобия",
		category: "clinical",
		isRedAlert: false,
		colorHex: "#8b5cf6",
		bgHex: "rgba(139, 92, 246, 0.14)",
		iconName: "Activity",
		descriptionRu: "Выраженная дентафобия или сопутствующие патологии. Рекомендуется удлиненный слот записи.",
	},
	{
		code: "vip",
		labelRu: "VIP-статус",
		category: "administrative",
		isRedAlert: false,
		colorHex: "#f59e0b",
		bgHex: "rgba(245, 158, 11, 0.14)",
		iconName: "Crown",
		descriptionRu: "Пациент с приоритетным сервисным сопровождением и персональным куратором.",
	},
	{
		code: "blacklist",
		labelRu: "Черный список / Неблагонадежный",
		category: "administrative",
		isRedAlert: false,
		colorHex: "#475569",
		bgHex: "rgba(71, 85, 105, 0.18)",
		iconName: "UserX",
		descriptionRu: "Систематические неявки или деструктивное поведение. Предупреждение для регистратуры.",
	},
	{
		code: "dms",
		labelRu: "ДМС (Страховой)",
		category: "financial",
		isRedAlert: false,
		colorHex: "#0ea5e9",
		bgHex: "rgba(14, 165, 233, 0.14)",
		iconName: "Shield",
		descriptionRu: "Лечение по программе добровольного медицинского страхования по гарантийному письму.",
	},
	{
		code: "child",
		labelRu: "Детский прием",
		category: "clinical",
		isRedAlert: false,
		colorHex: "#06b6d4",
		bgHex: "rgba(6, 182, 212, 0.14)",
		iconName: "Smile",
		descriptionRu: "Пациент младше 18 лет. Требует наличия законного представителя и детской карты 043-1/у.",
	},
	{
		code: "pensioner",
		labelRu: "Пенсионер / Льготник",
		category: "social",
		isRedAlert: false,
		colorHex: "#64748b",
		bgHex: "rgba(100, 116, 139, 0.14)",
		iconName: "UserCheck",
		descriptionRu: "Право на социальные или пенсионные скидки клиники.",
	},
	{
		code: "medical_staff",
		labelRu: "Медработник / Коллега",
		category: "social",
		isRedAlert: false,
		colorHex: "#10b981",
		bgHex: "rgba(16, 185, 129, 0.14)",
		iconName: "Stethoscope",
		descriptionRu: "Врач или медперсонал партнерских клиник (профессиональная скидка).",
	},
	{
		code: "disability",
		labelRu: "Маломобильный пациент",
		category: "social",
		isRedAlert: false,
		colorHex: "#3b82f6",
		bgHex: "rgba(59, 130, 246, 0.14)",
		iconName: "Accessibility",
		descriptionRu: "Требуется помощь ассистента при перемещении, пандус или сопровождение.",
	},
	{
		code: "debtor",
		labelRu: "Задолженность по оплате",
		category: "financial",
		isRedAlert: false,
		colorHex: "#dc2626",
		bgHex: "rgba(220, 38, 38, 0.14)",
		iconName: "DollarSign",
		descriptionRu: "Пациент имеет неоплаченные акты или отрицательный баланс в кассе.",
	},
	{
		code: "family_head",
		labelRu: "Глава семьи",
		category: "administrative",
		isRedAlert: false,
		colorHex: "#6366f1",
		bgHex: "rgba(99, 102, 241, 0.14)",
		iconName: "Users",
		descriptionRu: "Основной плательщик и распорядитель средств общего семейного депозита.",
	},
];

export const STOMX_PATIENT_TAGS_MAP = Object.freeze(
	Object.fromEntries(
		STOMX_PATIENT_TAGS_CATALOG.map((tag) => [tag.code, tag]),
	) as Record<StomxPatientTagCode, StomxPatientTagMeta>,
);

// ============================================================================
// 2. STATUTORY & FAMILY REPRESENTATIVE TYPES (ЗАКОННЫЕ ПРЕДСТАВИТЕЛИ)
// ============================================================================

export const STOMX_REPRESENTATIVE_TYPES = [
	"mother",                    // Мать (id: 6) - Законный представитель
	"father",                    // Отец (id: 5) - Законный представитель
	"parent",                    // Родитель общий (id: 1) - Законный представитель
	"guardian",                  // Опекун (id: 2) - Законный представитель
	"curator",                   // Попечитель - Законный представитель
	"adoptive_parent",           // Усыновитель - Законный представитель
	"authorized_representative", // Представитель по нотариальной доверенности
	"husband",                   // Муж (id: 3) - Член семьи
	"wife",                      // Жена (id: 4) - Член семьи
	"son",                       // Сын (id: 8) - Член семьи
	"daughter",                  // Дочь (id: 7) - Член семьи
	"brother",                   // Брат (id: 10) - Родственник
	"sister",                    // Сестра (id: 9) - Родственник
	"other",                     // Другой родственник
] as const;

export const stomxRepresentativeTypeSchema = z.enum(STOMX_REPRESENTATIVE_TYPES);
export type StomxRepresentativeType = z.infer<typeof stomxRepresentativeTypeSchema>;

export interface StomxRepresentativeTypeMeta {
	readonly id?: number;
	readonly code: StomxRepresentativeType;
	readonly nameRu: string;
	readonly isLegalRepresentative: boolean; // Имеет ли законное право подписывать ИДС за несовершеннолетнего (323-ФЗ ст. 20)
	readonly canAccessFamilyDeposit: boolean;
}

export const STOMX_REPRESENTATIVE_CATALOG: readonly StomxRepresentativeTypeMeta[] = [
	{ id: 6, code: "mother", nameRu: "Мать", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ id: 5, code: "father", nameRu: "Отец", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ id: 1, code: "parent", nameRu: "Родитель", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ id: 2, code: "guardian", nameRu: "Опекун", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ code: "curator", nameRu: "Попечитель", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ code: "adoptive_parent", nameRu: "Усыновитель", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ code: "authorized_representative", nameRu: "Представитель по доверенности", isLegalRepresentative: true, canAccessFamilyDeposit: false },
	{ id: 3, code: "husband", nameRu: "Муж", isLegalRepresentative: false, canAccessFamilyDeposit: true },
	{ id: 4, code: "wife", nameRu: "Жена", isLegalRepresentative: false, canAccessFamilyDeposit: true },
	{ id: 8, code: "son", nameRu: "Сын", isLegalRepresentative: false, canAccessFamilyDeposit: false },
	{ id: 7, code: "daughter", nameRu: "Дочь", isLegalRepresentative: false, canAccessFamilyDeposit: false },
	{ id: 10, code: "brother", nameRu: "Брат", isLegalRepresentative: false, canAccessFamilyDeposit: false },
	{ id: 9, code: "sister", nameRu: "Сестра", isLegalRepresentative: false, canAccessFamilyDeposit: false },
	{ code: "other", nameRu: "Другой родственник", isLegalRepresentative: false, canAccessFamilyDeposit: false },
];

export const STOMX_REPRESENTATIVE_BY_CODE = Object.freeze(
	Object.fromEntries(
		STOMX_REPRESENTATIVE_CATALOG.map((item) => [item.code, item]),
	) as Record<StomxRepresentativeType, StomxRepresentativeTypeMeta>,
);

// ============================================================================
// 3. MARKETING SOURCES & LEAD CHANNELS (ИСТОЧНИКИ ИНФОРМАЦИИ И РЕКЛАМЫ)
// ============================================================================

export const STOMX_MARKETING_CHANNELS = [
	"yandex",         // Яндекс (Карты, Поиск, Директ)
	"gis2",           // 2GIS (ДубльГис)
	"word_of_mouth",  // Через знакомых / Сарафанное радио (id: 3)
	"prodoctorov",    // ПроДокторов (id: 5, system: 1)
	"napopravku",     // НаПоправку (id: 6, system: 1)
	"social_media",   // Социальные сети (ВКонтакте, Telegram)
	"signboard",      // Вывеска / Проходил мимо (id: 2)
	"advertising",    // Реклама наружная / Листовки (id: 1)
	"internet",       // Интернет / Сайт клиники (id: 4)
	"mila",           // Mila агрегатор (id: 7, system: 1)
	"insurance_dms",  // Страховая компания по ДМС
	"doctor_referral",// Направление от врача другой клиники
	"other",          // Другой источник
] as const;

export const stomxMarketingChannelSchema = z.enum(STOMX_MARKETING_CHANNELS);
export type StomxMarketingChannel = z.infer<typeof stomxMarketingChannelSchema>;

export interface StomxMarketingSourceMeta {
	readonly id?: number;
	readonly channel: StomxMarketingChannel;
	readonly nameRu: string;
	readonly isSystem: boolean;
	readonly sort: number;
}

export const STOMX_MARKETING_SOURCES_CATALOG: readonly StomxMarketingSourceMeta[] = [
	{ channel: "yandex", nameRu: "Яндекс (Карты, Поиск, Директ)", isSystem: false, sort: 1 },
	{ channel: "gis2", nameRu: "2GIS (ДубльГис)", isSystem: false, sort: 2 },
	{ id: 3, channel: "word_of_mouth", nameRu: "Через знакомых / Сарафанное радио", isSystem: false, sort: 3 },
	{ id: 5, channel: "prodoctorov", nameRu: "ПроДокторов", isSystem: true, sort: 4 },
	{ id: 6, channel: "napopravku", nameRu: "НаПоправку", isSystem: true, sort: 5 },
	{ channel: "social_media", nameRu: "Социальные сети (ВКонтакте, Telegram)", isSystem: false, sort: 6 },
	{ id: 2, channel: "signboard", nameRu: "Вывеска / Проходил мимо", isSystem: false, sort: 7 },
	{ id: 1, channel: "advertising", nameRu: "Реклама (наружная, полиграфия)", isSystem: false, sort: 8 },
	{ id: 4, channel: "internet", nameRu: "Интернет / Официальный сайт клиники", isSystem: false, sort: 9 },
	{ id: 7, channel: "mila", nameRu: "Mila", isSystem: true, sort: 10 },
	{ channel: "insurance_dms", nameRu: "Страховая компания (ДМС)", isSystem: false, sort: 11 },
	{ channel: "doctor_referral", nameRu: "Направление от коллеги-врача", isSystem: false, sort: 12 },
	{ channel: "other", nameRu: "Другой источник", isSystem: false, sort: 13 },
];

export const STOMX_MARKETING_BY_CHANNEL = Object.freeze(
	Object.fromEntries(
		STOMX_MARKETING_SOURCES_CATALOG.map((item) => [item.channel, item]),
	) as Record<StomxMarketingChannel, StomxMarketingSourceMeta>,
);

export interface StomxMarketingSourceItem {
	readonly id: number;
	readonly channelKey: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly defaultSpendRub: number;
	readonly isOrganic: boolean;
	readonly descriptionRu: string;
}

/**
 * Канонические рекламные каналы StomX для стоматологии:
 * 2GIS, Яндекс Карты, ПроДокторов, Сарафанное радио, СберЗдоровье,
 * ВКонтакте, Наружная реклама, Сайт, Инстаграм, Листовки.
 */
export const STOMX_MARKETING_SOURCES: readonly StomxMarketingSourceItem[] = [
	{
		id: 201,
		channelKey: "gis2",
		nameRu: "2GIS",
		categoryRu: "Гео-сервисы",
		defaultSpendRub: 18000,
		isOrganic: false,
		descriptionRu: "Картографический справочник 2ГИС: гео-профиль клиники и кнопка онлайн-записи",
	},
	{
		id: 202,
		channelKey: "yandex_maps",
		nameRu: "Яндекс Карты",
		categoryRu: "Гео-сервисы",
		defaultSpendRub: 25000,
		isOrganic: false,
		descriptionRu: "Гео-приоритет клиники в Яндекс Картах и Навигаторе с синей меткой",
	},
	{
		id: 5,
		channelKey: "prodoctorov",
		nameRu: "ПроДокторов",
		categoryRu: "Мед-агрегаторы",
		defaultSpendRub: 15000,
		isOrganic: false,
		descriptionRu: "Профили ведущих врачей на медицинском портале отзывов ПроДокторов",
	},
	{
		id: 3,
		channelKey: "word_of_mouth",
		nameRu: "Сарафанное радио",
		categoryRu: "Органика",
		defaultSpendRub: 0,
		isOrganic: true,
		descriptionRu: "Рекомендации постоянных пациентов, членов семьи и знакомых (0 ₽ бюджет)",
	},
	{
		id: 205,
		channelKey: "sberhealth",
		nameRu: "СберЗдоровье",
		categoryRu: "Мед-агрегаторы",
		defaultSpendRub: 12000,
		isOrganic: false,
		descriptionRu: "Записи пациентов через экосистему медицинских сервисов СберЗдоровье (DocDoc)",
	},
	{
		id: 206,
		channelKey: "vk",
		nameRu: "ВКонтакте",
		categoryRu: "Соцсети",
		defaultSpendRub: 20000,
		isOrganic: false,
		descriptionRu: "Таргетированная реклама и официальное сообщество клиники ВКонтакте",
	},
	{
		id: 2,
		channelKey: "outdoor",
		nameRu: "Наружная реклама",
		categoryRu: "Наружная реклама",
		defaultSpendRub: 15000,
		isOrganic: false,
		descriptionRu: "Фасадная световая вывеска, панель-кронштейн и указатели",
	},
	{
		id: 4,
		channelKey: "website",
		nameRu: "Сайт",
		categoryRu: "Сайт / SEO",
		defaultSpendRub: 30000,
		isOrganic: false,
		descriptionRu: "Официальный сайт стоматологии, поисковое SEO-продвижение и веб-виджет",
	},
	{
		id: 209,
		channelKey: "instagram",
		nameRu: "Инстаграм",
		categoryRu: "Соцсети",
		defaultSpendRub: 14000,
		isOrganic: false,
		descriptionRu: "Клинические кейсы до/после, сторис и запись через директ Инстаграм",
	},
	{
		id: 1,
		channelKey: "flyers",
		nameRu: "Листовки",
		categoryRu: "Полиграфия",
		defaultSpendRub: 8000,
		isOrganic: false,
		descriptionRu: "Печатные промо-листовки, буклеты в жилые комплексы и партнерские стойки",
	},
];

// ============================================================================
// 4. APPOINTMENT REASONS & BLOCKING INTERVALS (ПРИЧИНЫ ВИЗИТОВ И БЛОКИРОВКИ)
// ============================================================================

export const STOMX_APPT_REASON_TYPES = ["common", "block"] as const;
export type StomxApptReasonType = typeof STOMX_APPT_REASON_TYPES[number];

export const STOMX_APPT_REASONS = [
	"acute_pain",      // id: 1,  Острая боль (common, emergency)
	"routine_checkup", // id: 2,  Плановое обследование (common)
	"follow_up",       // id: 3,  Повторно (common)
	"treatment",       // id: 4,  Лечение (common)
	"consultation",    // Первичная консультация (common)
	"hygiene",         // Профгигиена полости рта (common)
	"lunch",           // id: 5,  Обед (block)
	"break",           // id: 6,  Перерыв (block)
	"vacation",        // id: 7,  Отпуск (block)
	"study",           // id: 8,  Учеба (block)
	"absent",          // id: 9,  Отсутствует (block)
	"other_block",     // id: 10, Другое (block)
] as const;

export const stomxApptReasonSchema = z.enum(STOMX_APPT_REASONS);
export type StomxApptReason = z.infer<typeof stomxApptReasonSchema>;

export interface StomxApptReasonMeta {
	readonly id?: number;
	readonly code: StomxApptReason;
	readonly nameRu: string;
	readonly type: StomxApptReasonType; // common = визит пациента, block = блокировка слота врача
	readonly isEmergency: boolean;
	readonly colorHex: string;
}

export const STOMX_APPT_REASONS_CATALOG: readonly StomxApptReasonMeta[] = [
	{ id: 1, code: "acute_pain", nameRu: "Острая боль", type: "common", isEmergency: true, colorHex: "#ef4444" },
	{ id: 2, code: "routine_checkup", nameRu: "Плановое обследование", type: "common", isEmergency: false, colorHex: "#3b82f6" },
	{ id: 3, code: "follow_up", nameRu: "Повторно", type: "common", isEmergency: false, colorHex: "#10b981" },
	{ id: 4, code: "treatment", nameRu: "Лечение", type: "common", isEmergency: false, colorHex: "#8b5cf6" },
	{ code: "consultation", nameRu: "Первичная консультация", type: "common", isEmergency: false, colorHex: "#06b6d4" },
	{ code: "hygiene", nameRu: "Профессиональная гигиена", type: "common", isEmergency: false, colorHex: "#14b8a6" },
	{ id: 5, code: "lunch", nameRu: "Обед", type: "block", isEmergency: false, colorHex: "#f59e0b" },
	{ id: 6, code: "break", nameRu: "Перерыв", type: "block", isEmergency: false, colorHex: "#eab308" },
	{ id: 7, code: "vacation", nameRu: "Отпуск", type: "block", isEmergency: false, colorHex: "#64748b" },
	{ id: 8, code: "study", nameRu: "Учеба", type: "block", isEmergency: false, colorHex: "#6366f1" },
	{ id: 9, code: "absent", nameRu: "Отсутствует", type: "block", isEmergency: false, colorHex: "#94a3b8" },
	{ id: 10, code: "other_block", nameRu: "Другое", type: "block", isEmergency: false, colorHex: "#71717a" },
];

export const STOMX_APPT_REASON_BY_CODE = Object.freeze(
	Object.fromEntries(
		STOMX_APPT_REASONS_CATALOG.map((item) => [item.code, item]),
	) as Record<StomxApptReason, StomxApptReasonMeta>,
);

// ============================================================================
// 5. APPOINTMENT CANCELLATION & REFUSAL REASONS (ПРИЧИНЫ ОТМЕНЫ И ОТКАЗОВ)
// ============================================================================

export const STOMX_REFUSE_RESPONSIBILITY = ["patient", "clinic", "system"] as const;
export type StomxRefuseResponsibility = typeof STOMX_REFUSE_RESPONSIBILITY[number];

export const STOMX_APPT_REFUSE_REASONS = [
	"no_show_confirmed",             // id: 1,  Пациент не пришел (после подтверждения)
	"no_show_unconfirmed",           // id: 2,  Пациент не пришел (без подтверждения)
	"patient_cancelled",             // id: 3,  Пациент отказался от приема
	"patient_refused_clinic",        // id: 4,  Пациент отказался от клиники
	"patient_rescheduled",           // id: 5,  Пациент перенес прием
	"clinic_cancelled",              // id: 6,  Клиника отменила прием (болезнь врача/авария)
	"clinic_rescheduled_better_time",// id: 7,  Клиника предложила лучшее время
	"clinic_error",                  // id: 8,  Клиника ошибочно добавила
	"no_available_time",             // id: 9,  Нет свободного времени
	"expired_slot",                  // id: 10, Истек срок приема (system: 1)
] as const;

export const stomxApptRefuseReasonSchema = z.enum(STOMX_APPT_REFUSE_REASONS);
export type StomxApptRefuseReason = z.infer<typeof stomxApptRefuseReasonSchema>;

export interface StomxApptRefuseReasonMeta {
	readonly id: number;
	readonly code: StomxApptRefuseReason;
	readonly nameRu: string;
	readonly responsibility: StomxRefuseResponsibility;
	readonly isSystem: boolean;
}

export const STOMX_REFUSE_REASONS_CATALOG: readonly StomxApptRefuseReasonMeta[] = [
	{ id: 1, code: "no_show_confirmed", nameRu: "Пациент не пришел (после подтверждения)", responsibility: "patient", isSystem: false },
	{ id: 2, code: "no_show_unconfirmed", nameRu: "Пациент не пришел (без подтверждения)", responsibility: "patient", isSystem: false },
	{ id: 3, code: "patient_cancelled", nameRu: "Пациент отказался от приема", responsibility: "patient", isSystem: false },
	{ id: 4, code: "patient_refused_clinic", nameRu: "Пациент отказался от клиники", responsibility: "patient", isSystem: false },
	{ id: 5, code: "patient_rescheduled", nameRu: "Пациент перенес прием", responsibility: "patient", isSystem: false },
	{ id: 6, code: "clinic_cancelled", nameRu: "Клиника отменила прием", responsibility: "clinic", isSystem: false },
	{ id: 7, code: "clinic_rescheduled_better_time", nameRu: "Клиника предложила лучшее время", responsibility: "clinic", isSystem: false },
	{ id: 8, code: "clinic_error", nameRu: "Клиника ошибочно добавила", responsibility: "clinic", isSystem: false },
	{ id: 9, code: "no_available_time", nameRu: "Нет свободного времени", responsibility: "clinic", isSystem: false },
	{ id: 10, code: "expired_slot", nameRu: "Истек срок приема", responsibility: "system", isSystem: true },
];

export const STOMX_REFUSE_REASON_BY_CODE = Object.freeze(
	Object.fromEntries(
		STOMX_REFUSE_REASONS_CATALOG.map((item) => [item.code, item]),
	) as Record<StomxApptRefuseReason, StomxApptRefuseReasonMeta>,
);

export const STOMX_APPT_REFUSE_REASONS_CATALOG = STOMX_REFUSE_REASONS_CATALOG;

// ============================================================================
// 6. CLIENT ACTIVITY TIMELINE EVENT LABELS (СОБЫТИЯ И ЛОГИ ИЗ CLIENT_LABELS)
// ============================================================================

export const STOMX_CLIENT_TIMELINE_EVENT_KEYS = [
	"client.create",
	"client.update",
	"outpatient_card.create",
	"outpatient_card.update",
	"invoice.create",
	"invoice.update",
	"appointment.edit",
	"appointment.confirmed",
	"appointment.status_new",
	"appointment.status_completed",
	"appointment.status_active",
	"appointment.status_refuse",
	"appointment.status_waiting",
	"appointment.move",
	"payment.appointment_payment",
	"payment.advance_payment",
	"payment.return_appointment",
	"payment.sale_product",
	"notification.new",
	"notification.error",
	"notification.delivery",
	"voip.call_in",
	"voip.call_out",
	"task_call.appointment.confirmation",
	"task_call.appointment.refuse",
	"task_call.client.birthday",
	"task_call.client.learn_health",
	"task_call.medplan.not_finished",
	"task_call.medplan.not_started",
	"task_call.client.preventive_inspection",
] as const;

export const stomxClientTimelineEventKeySchema = z.enum(STOMX_CLIENT_TIMELINE_EVENT_KEYS);
export type StomxClientTimelineEventKey = z.infer<typeof stomxClientTimelineEventKeySchema>;

export interface StomxClientTimelineEventMeta {
	readonly key: StomxClientTimelineEventKey;
	readonly labelRu: string;
	readonly domain: "patient" | "medical_record" | "billing" | "schedule" | "telephony" | "tasks";
}

export const STOMX_CLIENT_TIMELINE_EVENTS_CATALOG: readonly StomxClientTimelineEventMeta[] = [
	{ key: "client.create", labelRu: "Создание карточки пациента", domain: "patient" },
	{ key: "client.update", labelRu: "Изменение карточки пациента", domain: "patient" },
	{ key: "outpatient_card.create", labelRu: "Создание амбулаторной карты 043/у", domain: "medical_record" },
	{ key: "outpatient_card.update", labelRu: "Редактирование амбулаторной карты", domain: "medical_record" },
	{ key: "invoice.create", labelRu: "Создание счёта", domain: "billing" },
	{ key: "invoice.update", labelRu: "Редактирование счёта", domain: "billing" },
	{ key: "appointment.edit", labelRu: "Редактирование приема", domain: "schedule" },
	{ key: "appointment.confirmed", labelRu: "Прием подтвержден", domain: "schedule" },
	{ key: "appointment.status_new", labelRu: "Запись на прием", domain: "schedule" },
	{ key: "appointment.status_completed", labelRu: "Прием проведен", domain: "schedule" },
	{ key: "appointment.status_active", labelRu: "Прием начат", domain: "schedule" },
	{ key: "appointment.status_refuse", labelRu: "Прием отменен", domain: "schedule" },
	{ key: "appointment.status_waiting", labelRu: "Прием оформлен", domain: "schedule" },
	{ key: "appointment.move", labelRu: "Прием перенесен", domain: "schedule" },
	{ key: "payment.appointment_payment", labelRu: "Оплата приема", domain: "billing" },
	{ key: "payment.advance_payment", labelRu: "Внесение аванса", domain: "billing" },
	{ key: "payment.return_appointment", labelRu: "Возврат за прием", domain: "billing" },
	{ key: "payment.sale_product", labelRu: "Оплата товара", domain: "billing" },
	{ key: "notification.new", labelRu: "Новое сообщение пациенту", domain: "telephony" },
	{ key: "notification.error", labelRu: "Ошибка отправки сообщения", domain: "telephony" },
	{ key: "notification.delivery", labelRu: "Отправлено сообщение", domain: "telephony" },
	{ key: "voip.call_in", labelRu: "Звонок пациенту (Входящий)", domain: "telephony" },
	{ key: "voip.call_out", labelRu: "Звонок пациенту (Исходящий)", domain: "telephony" },
	{ key: "task_call.appointment.confirmation", labelRu: "Звонок: Подтверждение приема", domain: "tasks" },
	{ key: "task_call.appointment.refuse", labelRu: "Звонок: Отмена приема", domain: "tasks" },
	{ key: "task_call.client.birthday", labelRu: "Звонок: Поздравить с днем рождения", domain: "tasks" },
	{ key: "task_call.client.learn_health", labelRu: "Звонок: Узнать о самочувствии после лечения", domain: "tasks" },
	{ key: "task_call.medplan.not_finished", labelRu: "Звонок: Узнать почему план лечения не закончен", domain: "tasks" },
	{ key: "task_call.medplan.not_started", labelRu: "Звонок: Узнать почему план лечения не начат", domain: "tasks" },
	{ key: "task_call.client.preventive_inspection", labelRu: "Звонок: Пригласить на проф. осмотр пациента", domain: "tasks" },
];

export const STOMX_CLIENT_TIMELINE_BY_KEY = Object.freeze(
	Object.fromEntries(
		STOMX_CLIENT_TIMELINE_EVENTS_CATALOG.map((item) => [item.key, item]),
	) as Record<StomxClientTimelineEventKey, StomxClientTimelineEventMeta>,
);

// ============================================================================
// 7. HELPER FUNCTIONS & BUSINESS LOGIC PREDICATES
// ============================================================================

/**
 * Проверяет, является ли тег пациента критическим медицинским алертом (Аллергия / Острая боль)
 */
export function isRedAlertPatientTag(code: StomxPatientTagCode): boolean {
	return STOMX_PATIENT_TAGS_MAP[code]?.isRedAlert ?? false;
}

/**
 * Проверяет, является ли статус законным представителем (СК РФ ст. 64, 323-ФЗ)
 */
export function isStatutoryLegalRepresentative(code: StomxRepresentativeType): boolean {
	return STOMX_REPRESENTATIVE_BY_CODE[code]?.isLegalRepresentative ?? false;
}

/**
 * Возвращает строковый ярлык маркетингового канала
 */
export function getMarketingChannelLabel(channel: StomxMarketingChannel): string {
	return STOMX_MARKETING_BY_CHANNEL[channel]?.nameRu ?? channel;
}

/**
 * Возвращает причину визита по коду
 */
export function getApptReasonMeta(code: StomxApptReason): StomxApptReasonMeta | undefined {
	return STOMX_APPT_REASON_BY_CODE[code];
}

/**
 * Возвращает причину отмены визита по коду
 */
export function getApptRefuseReasonMeta(code: StomxApptRefuseReason): StomxApptRefuseReasonMeta | undefined {
	return STOMX_REFUSE_REASON_BY_CODE[code];
}

/**
 * Возвращает русское наименование события таймлайна пациента
 */
export function getTimelineEventLabel(key: StomxClientTimelineEventKey): string {
	return STOMX_CLIENT_TIMELINE_BY_KEY[key]?.labelRu ?? key;
}

// ============================================================================
// 8. STOMX TASK CALLS & PATIENT CARE WORKFLOW (СЕРВИСНЫЕ ЗВОНКИ ЗАБОТЫ)
// ============================================================================

export const STOMX_TASK_CALL_TYPES = [
	"learn_health",             // Контроль самочувствия на 1-2 день после операции/лечения
	"preventive_inspection",    // Приглашение на плановый полугодовой осмотр и профгигиену
	"medplan_not_started",      // План лечения согласован, но не начат
	"medplan_not_finished",     // План лечения начат, но визиты прерваны
	"appointment_confirmation", // Подтверждение записи на прием на завтра
	"appointment_refuse",       // Выяснение причины отмены / возврат в воронку
	"birthday",                 // Поздравление с днем рождения и бонусные рубли
] as const;

export const stomxTaskCallTypeSchema = z.enum(STOMX_TASK_CALL_TYPES);
export type StomxTaskCallType = z.infer<typeof stomxTaskCallTypeSchema>;

export interface StomxTaskCallMeta {
	readonly type: StomxTaskCallType;
	readonly timelineKey: StomxClientTimelineEventKey;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly defaultDueDays: number;
	readonly iconName: string;
	readonly defaultScriptRu: string;
}

export const STOMX_TASK_CALLS_CATALOG: readonly StomxTaskCallMeta[] = [
	{
		type: "learn_health",
		timelineKey: "task_call.client.learn_health",
		titleRu: "Контроль самочувствия после лечения (1-2 день)",
		shortLabelRu: "Самочувствие",
		defaultDueDays: 1,
		iconName: "HeartPulse",
		defaultScriptRu: "«Добрый день! Клиника «DENTE», меня зовут [Имя]. Звоню по поручению Вашего доктора узнать, как Ваше самочувствие после визита? Есть ли отек, болезненность, всё ли в порядке?»",
	},
	{
		type: "preventive_inspection",
		timelineKey: "task_call.client.preventive_inspection",
		titleRu: "Приглашение на плановую профгигиену (6 мес.)",
		shortLabelRu: "Профгигиена 6 мес",
		defaultDueDays: 180,
		iconName: "Sparkles",
		defaultScriptRu: "«Здравствуйте! Прошло 6 месяцев с прошлой профессиональной гигиены. Доктор рекомендовал плановый осмотр для сохранения гарантии. Подобрать удобное время на этой неделе?»",
	},
	{
		type: "medplan_not_started",
		timelineKey: "task_call.medplan.not_started",
		titleRu: "Выяснить почему план лечения не начат",
		shortLabelRu: "План не начат",
		defaultDueDays: 7,
		iconName: "FileQuestion",
		defaultScriptRu: "«Добрый день! Доктор составил для Вас комплексный план лечения. Хотели уточнить, остались ли вопросы по стоимости или этапам, чтобы мы могли забронировать удобное время?»",
	},
	{
		type: "medplan_not_finished",
		timelineKey: "task_call.medplan.not_finished",
		titleRu: "Выяснить почему план лечения не закончен",
		shortLabelRu: "План не закончен",
		defaultDueDays: 14,
		iconName: "ClockAlert",
		defaultScriptRu: "«Здравствуйте! Вы успешно прошли первые этапы лечения, но следующий визит пока не назначен. Для стабильности результата важно не прерывать график. Когда Вам удобно подойти?»",
	},
	{
		type: "appointment_confirmation",
		timelineKey: "task_call.appointment.confirmation",
		titleRu: "Подтверждение записи на прием на завтра",
		shortLabelRu: "Подтверждение",
		defaultDueDays: 1,
		iconName: "CalendarCheck",
		defaultScriptRu: "«Добрый день! Напоминаем о Вашей записи к доктору на завтра. Вы планируете быть вовремя?»",
	},
	{
		type: "appointment_refuse",
		timelineKey: "task_call.appointment.refuse",
		titleRu: "Выяснить причину отмены приема",
		shortLabelRu: "Причина отмены",
		defaultDueDays: 2,
		iconName: "PhoneOff",
		defaultScriptRu: "«Здравствуйте! Очень жаль, что пришлось отменить прием. Подскажите, пожалуйста, самочувствие позволяет перенести запись на следующую неделю?»",
	},
	{
		type: "birthday",
		timelineKey: "task_call.client.birthday",
		titleRu: "Поздравление с днем рождения и бонус",
		shortLabelRu: "День рождения",
		defaultDueDays: 0,
		iconName: "Gift",
		defaultScriptRu: "«Поздравляем Вас с днем рождения от всего коллектива клиники «DENTE»! Желаем крепкого здоровья и дарим 1000 бонусных рублей на профгигиену!»",
	},
];

export const STOMX_TASK_CALL_BY_TYPE = Object.freeze(
	Object.fromEntries(
		STOMX_TASK_CALLS_CATALOG.map((item) => [item.type, item]),
	) as Record<StomxTaskCallType, StomxTaskCallMeta>,
);

/**
 * Возвращает метаданные сервисного звонка по его типу
 */
export function getTaskCallMeta(type: StomxTaskCallType): StomxTaskCallMeta | undefined {
	return STOMX_TASK_CALL_BY_TYPE[type];
}
