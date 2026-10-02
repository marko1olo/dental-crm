/**
 * packages/shared/src/patients/patientSchemas.ts
 *
 * DENTE Dental CRM — Canonical Patient Entity Contracts & Zod Schemas.
 * Single Source of Truth (SSOT) for Patient Profiles, Administrative Profiles,
 * Creation/Update DTOs, and Clinical Insights.
 *
 * Compliant with:
 * - Order of Minzdrav RF 804n & Form 043/u
 * - Federal Law 152-FZ & 323-FZ (Medical Confidentiality & Payload Stripping)
 * - Decree 659 (Anonymous Patient Regime, Rules of 2026)
 * - Exact Kopecks Money Arithmetic (moneyRubSchema)
 */

import { z } from "zod";
import { curatorFunnelStageSchema } from "../curator/index.js";
import {
	clockTimeSchema,
	clockTimeToMinutes,
	isPastOrTodayDateOnlyString,
	normalizeDateOnlyString,
	weekdayIndexSchema,
} from "../datetime/index.js";
import { documentKindSchema } from "../documents/documentKind.js";
import { moneyRubSchema, nonNegativeMoneyRubSchema } from "../money.js";

// ─── 1. STATUS & GENDER ──────────────────────────────────────────────────────

export const patientStatusSchema = z.enum(["active", "archived"]);
export type PatientStatus = z.infer<typeof patientStatusSchema>;

// ─── 2. INPUT VALIDATORS (PHONE & BIRTH DATE) ────────────────────────────────

export const birthDateInputSchema = z
	.string()
	.trim()
	.max(20)
	.refine((value) => !value || isPastOrTodayDateOnlyString(value), {
		message:
			"Дата рождения должна быть реальной датой не позже сегодняшнего дня в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ.",
	})
	.transform((value) =>
		value ? (normalizeDateOnlyString(value) ?? value) : value,
	)
	.nullable()
	.optional();

export const patientPhoneInputSchema = z
	.string()
	.trim()
	.max(80)
	.refine((value) => !value || value.replace(/\D/g, "").length >= 5, {
		message:
			"Телефон пациента должен содержать не меньше 5 цифр или быть пустым.",
	})
	.nullable()
	.optional();

export const patientAdministrativeTextSchema = z
	.string()
	.trim()
	.max(500)
	.nullable()
	.default(null);

// ─── 3. ADMINISTRATIVE PROFILE ───────────────────────────────────────────────

export const patientAdministrativeProfileBaseSchema = z.object({
	identityDocument: z.string().trim().max(240).nullable().default(null),
	taxpayerInn: z
		.string()
		.trim()
		.regex(/^\d{10}$|^\d{12}$/)
		.nullable()
		.default(null),
	registrationAddress: patientAdministrativeTextSchema,
	residentialAddress: patientAdministrativeTextSchema,
	insurancePolicyNumber: z.string().trim().max(120).nullable().default(null),
	snils: z.string().trim().max(40).nullable().default(null),
	legalRepresentativeFullName: z
		.string()
		.trim()
		.max(240)
		.nullable()
		.default(null),
	legalRepresentativeRelationship: z
		.string()
		.trim()
		.max(120)
		.nullable()
		.default(null),
	legalRepresentativeIdentityDocument: z
		.string()
		.trim()
		.max(240)
		.nullable()
		.default(null),
	legalRepresentativePhone: z.string().trim().max(80).nullable().default(null),
	preferredDocumentRecipient: z
		.string()
		.trim()
		.max(240)
		.nullable()
		.default(null),
	preferredAppointmentWeekdays: z.array(weekdayIndexSchema).max(7).default([]),
	preferredAppointmentStart: clockTimeSchema.nullable().default(null),
	preferredAppointmentEnd: clockTimeSchema.nullable().default(null),
	preferredAppointmentNote: patientAdministrativeTextSchema,
	dataProcessingBasisNote: patientAdministrativeTextSchema,
	orthodonticProgress: patientAdministrativeTextSchema,
	/*
	 * Уровень лояльности (ручной выбор администратором).
	 */
	loyaltyTier: z
		.enum(["standard", "silver", "gold", "platinum"])
		.nullable()
		.optional()
		.default(null),
	/*
	 * Закрепление куратора лечения за пациентом (Фича #27)
	 */
	curatorId: z.string().uuid().nullable().optional().default(null),
	curatorFullName: z.string().trim().max(240).nullable().optional().default(null),
	curatorAssignedAt: z.string().nullable().optional().default(null),
	curatorFunnelStage: curatorFunnelStageSchema.nullable().optional().default(null),
	curatorCommissionPercent: z.number().min(0).max(100).nullable().optional().default(null),
	curatorNotes: z.string().trim().max(2000).nullable().optional().default(null),
	curatorNextContactDate: z.string().nullable().optional().default(null),
	/*
	 * Режим «Анонимный пациент» (ПП РФ №659 от 30.05.2026, Rules of 2026).
	 */
	isAnonymous: z.boolean().nullable().optional(),
	anonymousCode: z.string().trim().max(80).nullable().optional(),
	decree659Compliance: z.record(z.unknown()).nullable().optional(),
	gender: z.enum(["male", "female", "other"]).nullable().optional().default(null),
	insuranceContractId: z.string().uuid().nullable().optional().default(null),
});

export const patientAdministrativeProfileSchema =
	patientAdministrativeProfileBaseSchema.superRefine((value, context) => {
		if (
			value.preferredAppointmentStart &&
			value.preferredAppointmentEnd &&
			clockTimeToMinutes(String(value.preferredAppointmentEnd)) <=
				clockTimeToMinutes(String(value.preferredAppointmentStart))
		) {
			context.addIssue({
				code: "custom",
				path: ["preferredAppointmentEnd"],
				message: "Конец удобного времени приема должен быть позже начала",
			});
		}
	});

export type PatientAdministrativeProfile = z.infer<
	typeof patientAdministrativeProfileSchema
>;

export const updatePatientAdministrativeProfileSchema =
	patientAdministrativeProfileBaseSchema
		.partial()
		.superRefine((value, context) => {
			if (
				(value.preferredAppointmentStart && !value.preferredAppointmentEnd) ||
				(!value.preferredAppointmentStart && value.preferredAppointmentEnd)
			) {
				context.addIssue({
					code: "custom",
					path: value.preferredAppointmentStart
						? ["preferredAppointmentEnd"]
						: ["preferredAppointmentStart"],
					message:
						"Начало и конец удобного времени приема нужно указывать вместе",
				});
			}
			if (
				value.preferredAppointmentStart &&
				value.preferredAppointmentEnd &&
				clockTimeToMinutes(String(value.preferredAppointmentEnd)) <=
					clockTimeToMinutes(String(value.preferredAppointmentStart))
			) {
				context.addIssue({
					code: "custom",
					path: ["preferredAppointmentEnd"],
					message: "Конец удобного времени приема должен быть позже начала",
				});
			}
		});

export type UpdatePatientAdministrativeProfileInput = z.infer<
	typeof updatePatientAdministrativeProfileSchema
>;

// ─── 4. CORE PATIENT SCHEMA ──────────────────────────────────────────────────

export const patientSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	status: patientStatusSchema,
	fullName: z.string().min(1),
	birthDate: z.string().nullable(),
	gender: z.enum(["male", "female", "other"]).nullable().optional().default(null),
	phone: z.string().nullable(),
	email: z.string().email().nullable(),
	notes: z.string().nullable(),
	weightKg: z.number().positive().max(500).nullable().optional(),
	isAnonymous: z.boolean().nullable().optional(),
	anonymousCode: z.string().nullable().optional(),
	administrativeProfile: patientAdministrativeProfileSchema
		.nullable()
		.default(null),
	/*
	 * Баланс пациента: оплачено минус запланировано.
	 * Отрицательное значение — долг (moneyRubSchema).
	 */
	balanceRub: moneyRubSchema.default(0),
	/*
	 * Привязка пациента к семейной группе (общий кошелёк).
	 */
	familyGroupId: z.string().uuid().nullable().optional(),
	mergedIntoPatientId: z.string().uuid().nullable().optional(),
	/*
	 * 152-ФЗ / 323-ФЗ ст. 13: Врачебная тайна и клинические диагнозы.
	 * Доступны ТОЛЬКО врачам и клиническому персоналу.
	 */
	diagnosis: z.string().nullable().optional(),
	emr_records: z.array(z.unknown()).nullable().optional(),
	odontogram: z.record(z.unknown()).nullable().optional(),
	clinicalNotes: z.string().nullable().optional(),
	mkb10: z.string().nullable().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type Patient = z.infer<typeof patientSchema>;

// ─── 5. PATIENT INSIGHTS ─────────────────────────────────────────────────────

export const patientInsightRiskSchema = z.enum(["low", "watch", "high"]);
export type PatientInsightRisk = z.infer<typeof patientInsightRiskSchema>;

export const patientInsightSchema = z.object({
	patientId: z.string().uuid(),
	riskLevel: patientInsightRiskSchema,
	riskReasons: z.array(z.string()),
	nextBestAction: z.string(),
	recallDueAt: z.string().nullable(),
	balanceDueRub: nonNegativeMoneyRubSchema,
	openTasks: z.number().int().nonnegative(),
	missingDocumentKinds: z.array(documentKindSchema),
	clinicalFlags: z.array(z.string()),
	adminFlags: z.array(z.string()),
	lastActivityAt: z.string().nullable(),
});

export type PatientInsight = z.infer<typeof patientInsightSchema>;

// ─── 6. DTO SCHEMAS (CREATE & UPDATE) ─────────────────────────────────────────

export const createPatientSchema = z.object({
	fullName: z.string().trim().min(1).max(240),
	birthDate: birthDateInputSchema,
	phone: patientPhoneInputSchema,
	email: z.string().trim().email().nullable().optional(),
	notes: z.string().trim().max(1000).nullable().optional(),
	weightKg: z.number().positive().max(500).nullable().optional(),
	isAnonymous: z.boolean().optional().default(false),
	anonymousCode: z.string().trim().max(80).optional().nullable(),
	administrativeProfile: patientAdministrativeProfileSchema
		.nullable()
		.optional(),
	allowDuplicate: z.boolean().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = z.object({
	fullName: z.string().trim().min(1).max(240).optional(),
	birthDate: birthDateInputSchema,
	phone: patientPhoneInputSchema,
	email: z.string().trim().email().nullable().optional(),
	notes: z.string().trim().max(1000).nullable().optional(),
	weightKg: z.number().positive().max(500).nullable().optional(),
	isAnonymous: z.boolean().optional(),
	anonymousCode: z.string().trim().max(80).optional().nullable(),
	familyGroupId: z.string().uuid().nullable().optional(),
});

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
