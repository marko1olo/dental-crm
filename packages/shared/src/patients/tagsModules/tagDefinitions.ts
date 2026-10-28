import { z } from "zod";

export const PATIENT_TAG_CATEGORIES = [
	"clinical",       // Клинические особенности (аллергия, острая боль, беременность)
	"administrative", // Административные пометки (VIP, черный список, сложный пациент)
	"financial",      // Финансовый статус (ДМС, задолженность, рассрочка)
	"social",         // Социальная категория (пенсионер, медработник, ребенок)
] as const;

export const patientTagCategorySchema = z.enum(PATIENT_TAG_CATEGORIES);
export type PatientTagCategory = z.infer<typeof patientTagCategorySchema>;

export const PATIENT_TAG_CODES = [
	"allergy", "acute_pain", "pregnancy", "complex_patient", "vip", "blacklist",
	"dms", "child", "pensioner", "medical_staff", "disability", "debtor", "family_head",
] as const;

export const STOMX_PATIENT_TAG_CODES = PATIENT_TAG_CODES;
export const patientTagCodeSchema = z.enum(PATIENT_TAG_CODES);
export const stomxPatientTagCodeSchema = patientTagCodeSchema;
export type PatientTagCode = z.infer<typeof patientTagCodeSchema>;
export type StomxPatientTagCode = PatientTagCode;

export interface PatientTagMeta {
	readonly code: PatientTagCode;
	readonly labelRu: string;
	readonly category: PatientTagCategory;
	readonly isRedAlert: boolean;
	readonly colorHex: string;
	readonly bgHex: string;
	readonly iconName: string;
	readonly descriptionRu: string;
}

export type StomxPatientTagMeta = PatientTagMeta;

export const PATIENT_TAGS_CATALOG: readonly PatientTagMeta[] = [
	{ code: "allergy", labelRu: "Аллергия / Непереносимость", category: "clinical", isRedAlert: true, colorHex: "#ef4444", bgHex: "rgba(239, 68, 68, 0.14)", iconName: "AlertTriangle", descriptionRu: "Лекарственная непереносимость (анестетики, антибиотики, латекс). Красный алерт на приеме." },
	{ code: "acute_pain", labelRu: "Острая боль / Cito", category: "clinical", isRedAlert: true, colorHex: "#f97316", bgHex: "rgba(249, 115, 22, 0.14)", iconName: "Flame", descriptionRu: "Экстренное обращение с острой болью (пульпит, периостит). Приоритет в живой очереди." },
	{ code: "pregnancy", labelRu: "Беременность / Лактация", category: "clinical", isRedAlert: false, colorHex: "#ec4899", bgHex: "rgba(236, 72, 153, 0.14)", iconName: "Heart", descriptionRu: "Ограничения на назначение рентгенологических исследований и препаратов с адреналином." },
	{ code: "complex_patient", labelRu: "Сложный пациент / Дентафобия", category: "clinical", isRedAlert: false, colorHex: "#8b5cf6", bgHex: "rgba(139, 92, 246, 0.14)", iconName: "Activity", descriptionRu: "Выраженная дентафобия или сопутствующие патологии. Рекомендуется удлиненный слот записи." },
	{ code: "vip", labelRu: "VIP-статус", category: "administrative", isRedAlert: false, colorHex: "#f59e0b", bgHex: "rgba(245, 158, 11, 0.14)", iconName: "Crown", descriptionRu: "Пациент с приоритетным сервисным сопровождением и персональным куратором." },
	{ code: "blacklist", labelRu: "Черный список / Неблагонадежный", category: "administrative", isRedAlert: false, colorHex: "#475569", bgHex: "rgba(71, 85, 105, 0.18)", iconName: "UserX", descriptionRu: "Систематические неявки или деструктивное поведение. Предупреждение для регистратуры." },
	{ code: "dms", labelRu: "ДМС (Страховой)", category: "financial", isRedAlert: false, colorHex: "#0ea5e9", bgHex: "rgba(14, 165, 233, 0.14)", iconName: "Shield", descriptionRu: "Лечение по программе добровольного медицинского страхования по гарантийному письму." },
	{ code: "child", labelRu: "Детский прием", category: "clinical", isRedAlert: false, colorHex: "#06b6d4", bgHex: "rgba(6, 182, 212, 0.14)", iconName: "Smile", descriptionRu: "Пациент младше 18 лет. Требует наличия законного представителя и детской карты 043-1/у." },
	{ code: "pensioner", labelRu: "Пенсионер / Льготник", category: "social", isRedAlert: false, colorHex: "#64748b", bgHex: "rgba(100, 116, 139, 0.14)", iconName: "UserCheck", descriptionRu: "Право на социальные или пенсионные скидки клиники." },
	{ code: "medical_staff", labelRu: "Медработник / Коллега", category: "social", isRedAlert: false, colorHex: "#10b981", bgHex: "rgba(16, 185, 129, 0.14)", iconName: "Stethoscope", descriptionRu: "Врач или медперсонал партнерских клиник (профессиональная скидка)." },
	{ code: "disability", labelRu: "Маломобильный пациент", category: "social", isRedAlert: false, colorHex: "#3b82f6", bgHex: "rgba(59, 130, 246, 0.14)", iconName: "Accessibility", descriptionRu: "Требуется помощь ассистента при перемещении, пандус или сопровождение." },
	{ code: "debtor", labelRu: "Задолженность по оплате", category: "financial", isRedAlert: false, colorHex: "#dc2626", bgHex: "rgba(220, 38, 38, 0.14)", iconName: "DollarSign", descriptionRu: "Пациент имеет неоплаченные акты или отрицательный баланс в кассе." },
	{ code: "family_head", labelRu: "Глава семьи", category: "administrative", isRedAlert: false, colorHex: "#6366f1", bgHex: "rgba(99, 102, 241, 0.14)", iconName: "Users", descriptionRu: "Основной плательщик и распорядитель средств общего семейного депозита." },
];

export const STOMX_PATIENT_TAGS_CATALOG = PATIENT_TAGS_CATALOG;

export const PATIENT_TAGS_MAP = Object.freeze(
	Object.fromEntries(
		PATIENT_TAGS_CATALOG.map((tag) => [tag.code, tag]),
	) as Record<PatientTagCode, PatientTagMeta>,
);

export const STOMX_PATIENT_TAGS_MAP = PATIENT_TAGS_MAP;

export function isRedAlertPatientTag(code: PatientTagCode | string): boolean {
	const meta = PATIENT_TAGS_MAP[code as PatientTagCode];
	return meta?.isRedAlert ?? false;
}
