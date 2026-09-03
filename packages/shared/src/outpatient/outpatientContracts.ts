import { z } from "zod";

/**
 * 55 сущностей зубного ряда и челюстной системы:
 * - 32 постоянных зуба (11-18, 21-28, 31-38, 41-48)
 * - 20 молочных зубов (51-55, 61-65, 71-75, 81-85)
 * - 3 челюстные/окклюзионные сущности:
 *     JU — Верхняя челюсть (Maxilla)
 *     JL — Нижняя челюсть (Mandibula)
 *     C  — Центральное соотношение / окклюзия
 */
export const ADULT_TEETH_CODES = [
	"11", "12", "13", "14", "15", "16", "17", "18",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"31", "32", "33", "34", "35", "36", "37", "38",
	"41", "42", "43", "44", "45", "46", "47", "48",
] as const;

export const PEDIATRIC_TEETH_CODES = [
	"51", "52", "53", "54", "55",
	"61", "62", "63", "64", "65",
	"71", "72", "73", "74", "75",
	"81", "82", "83", "84", "85",
] as const;

export const JAW_OCCLUSION_CODES = ["JU", "JL", "C"] as const;

export const ALL_CLINICAL_TEETH_CODES = [
	...ADULT_TEETH_CODES,
	...PEDIATRIC_TEETH_CODES,
	...JAW_OCCLUSION_CODES,
] as const;

export const toothOrJawCodeSchema = z.enum([
	"11", "12", "13", "14", "15", "16", "17", "18",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"31", "32", "33", "34", "35", "36", "37", "38",
	"41", "42", "43", "44", "45", "46", "47", "48",
	"51", "52", "53", "54", "55",
	"61", "62", "63", "64", "65",
	"71", "72", "73", "74", "75",
	"81", "82", "83", "84", "85",
	"JU", "JL", "C",
]);

export type ToothOrJawCode = z.infer<typeof toothOrJawCodeSchema>;

export const clinicalToothTypeSchema = z.enum(["T", "J"]);
export type ClinicalToothType = z.infer<typeof clinicalToothTypeSchema>;

/**
 * Валидатор кода зуба / челюсти
 */
export function isValidToothOrJawCode(code: string): code is ToothOrJawCode {
	return (ALL_CLINICAL_TEETH_CODES as readonly string[]).includes(code);
}

/**
 * 91 дефект одонтограммы: группы и типы
 */
export const toothDefectTypeSchema = z.enum(["outpatient", "orthodontic", "anomaly"]);
export type ToothDefectType = z.infer<typeof toothDefectTypeSchema>;

export const toothDefectKeySchema = z.enum([
	"require_treatment",
	"cured_teeth",
	"rg_klkt",
	"position",
	"time_cut",
	"amount",
	"colors",
	"forms",
	"md",
	"tvtk",
]).nullable();
export type ToothDefectKey = z.infer<typeof toothDefectKeySchema>;

export const toothDefectColorSchema = z.enum([
	"red",
	"yellow",
	"green",
	"white",
	"orange",
	"blue",
	"gray",
]).nullable();
export type ToothDefectColor = z.infer<typeof toothDefectColorSchema>;

/**
 * DTO схемы каталогов
 */
export const clinicalToothEntitySchema = z.object({
	id: z.number().int(),
	code: toothOrJawCodeSchema,
	nameRu: z.string(),
	type: clinicalToothTypeSchema,
	isChild: z.boolean(),
	quoter: z.number().int().nullable().optional(),
	order: z.number().int(),
});
export type ClinicalToothEntity = z.infer<typeof clinicalToothEntitySchema>;

export const toothDefectCatalogItemSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	alias: z.string(),
	type: toothDefectTypeSchema,
	key: z.string().nullable(),
	color: z.string().nullable(),
	order: z.number().int(),
	canDelete: z.boolean().optional(),
	isActive: z.boolean().optional(),
});
export type ToothDefectCatalogItem = z.infer<typeof toothDefectCatalogItemSchema>;

export const mkbCategoryItemSchema = z.object({
	id: z.string(),
	code: z.string(),
	name: z.string(),
	parentId: z.string().nullable(),
	isDentalSpecialty: z.boolean(),
	order: z.number().int(),
});
export type MkbCategoryItem = z.infer<typeof mkbCategoryItemSchema>;

/**
 * Назначение патологии / дефекта пациенту
 */
export const assignPatientToothDefectSchema = z.object({
	toothCode: toothOrJawCodeSchema,
	defectId: z.number().int().positive(),
	visitId: z.string().uuid().optional().nullable(),
	diagnosedByDoctorId: z.string().uuid().optional().nullable(),
	comment: z.string().max(1000).optional().nullable(),
});
export type AssignPatientToothDefectInput = z.infer<typeof assignPatientToothDefectSchema>;

export const updatePatientToothDefectSchema = z.object({
	resolvedAt: z.string().datetime({ offset: true }).optional().nullable(),
	comment: z.string().max(1000).optional().nullable(),
});
export type UpdatePatientToothDefectInput = z.infer<typeof updatePatientToothDefectSchema>;

/**
 * Контур верификации карт начмедом (24-часовой замок)
 */
export const outpatientVerificationStatusSchema = z.enum([
	"draft",
	"review",
	"approved",
	"rejected",
]);
export type OutpatientVerificationStatus = z.infer<typeof outpatientVerificationStatusSchema>;

export const submitOutpatientForVerificationSchema = z.object({
	visitId: z.string().uuid(),
	patientId: z.string().uuid(),
	doctorId: z.string().uuid(),
});
export type SubmitOutpatientForVerificationInput = z.infer<typeof submitOutpatientForVerificationSchema>;

export const updateOutpatientVerificationStatusSchema = z.object({
	status: z.enum(["approved", "rejected", "review"]),
	rejectionReason: z.string().max(2000).optional().nullable(),
});
export type UpdateOutpatientVerificationStatusInput = z.infer<typeof updateOutpatientVerificationStatusSchema>;

/**
 * 24-часовой замок проверки прав редактирования:
 * Если истек дедлайн (24 часа с момента приема/создания), редактирование врачом блокируется.
 */
export function isOutpatientEditDeadlineExpired(editableDeadline: Date | string): boolean {
	const deadline = typeof editableDeadline === "string" ? new Date(editableDeadline) : editableDeadline;
	return Date.now() > deadline.getTime();
}

/**
 * Вычисление 24-часового дедлайна
 */
export function calculateOutpatientEditableDeadline(baseDate: Date = new Date()): Date {
	return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Фильтры шаблонов амбулаторных карт 043/у
 */
export const outpatientTemplatesFilterSchema = z.object({
	categoryId: z.coerce.number().int().optional(),
	search: z.string().optional(),
	mkbCode: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(500).default(100),
	offset: z.coerce.number().int().min(0).default(0),
});
export type OutpatientTemplatesFilter = z.infer<typeof outpatientTemplatesFilterSchema>;

/**
 * Фильтры МКБ-10
 */
export const mkbCategoriesFilterSchema = z.object({
	dentalOnly: z.enum(["true", "false", "1", "0"]).optional(),
	search: z.string().optional(),
	parentId: z.string().optional(),
});
export type MkbCategoriesFilter = z.infer<typeof mkbCategoriesFilterSchema>;
