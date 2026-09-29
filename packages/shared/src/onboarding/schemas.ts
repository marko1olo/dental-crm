/**
 * Clinic Onboarding & Rapid Launch Wizard Zod Schemas
 * DENTE Dental CRM — Mandates 8e (Doctor Autonomy), 8k (Friction Killer), 8n (Solo Doctor Sovereignty)
 */

import { z } from "zod";

export const onboardingWizardStepSchema = z.enum([
	"clinic_profile",
	"chairs_schedule",
	"starter_pricelist",
]);

export const clinicOperationalModeSchema = z.enum([
	"solo_doctor",
	"one_chair",
	"small_clinic",
	"network_clinic",
]);

export const starterDentalServiceSchema = z.object({
	code: z.string().min(1, "Код услуги 804н обязателен"),
	title: z.string().min(1, "Название услуги обязательно"),
	category: z.enum([
		"consultation",
		"therapy",
		"surgery",
		"prosthetics",
		"orthodontics",
		"periodontology",
		"hygiene",
		"imaging",
		"documents",
		"other",
	]),
	specialty: z.enum([
		"universal",
		"therapist",
		"orthopedist",
		"surgeon",
		"orthodontist",
		"periodontist",
		"hygienist",
		"pediatric",
	]),
	priceRub: z.number().nonnegative("Цена должна быть не отрицательной"),
	priceKopecks: z.number().int().nonnegative("Цена в копейках должна быть целым неотрицательным числом"),
	durationMinutes: z.number().int().positive("Длительность должна быть положительной"),
	taxDeductible: z.boolean().default(true),
	description: z.string().optional(),
});

export const dentalChairDraftSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1, "Название кресла обязательно"),
	specialty: z.string().optional(),
	isDefault: z.boolean().optional(),
});

export const clinicScheduleDraftSchema = z.object({
	workdayStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Формат времени ЧЧ:ММ"),
	workdayEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Формат времени ЧЧ:ММ"),
	workingDays: z.array(z.number().int().min(0).max(6)).min(1, "Выберите хотя бы один рабочий день"),
	defaultVisitMinutes: z.number().int().positive("Длительность визита должна быть положительной").default(30),
	appointmentBufferMinutes: z.number().int().nonnegative().optional().default(5),
});

export const clinicProfileOnboardingSchema = z.object({
	clinicName: z.string().min(1, "Название клиники обязательно").default("Стоматология"),
	phone: z.string().default("+7 (999) 000-00-00"),
	timezone: z.string().min(1).default("Europe/Moscow"),
	mode: clinicOperationalModeSchema.default("solo_doctor"),
	legalName: z.string().optional(),
	inn: z.string().optional(),
	address: z.string().optional(),
});

export const onboardingLaunchWizardDataSchema = z.object({
	step: onboardingWizardStepSchema.default("clinic_profile"),
	currentStepIndex: z.number().int().min(0).max(2).default(0),
	totalSteps: z.number().int().default(3),
	profile: clinicProfileOnboardingSchema,
	chairs: z.array(dentalChairDraftSchema).min(1, "Должно быть хотя бы одно кресло"),
	schedule: clinicScheduleDraftSchema,
	selectedServiceCodes: z.array(z.string()).default([]),
	isCompleted: z.boolean().default(false),
	isSkipped: z.boolean().default(false),
	completedAt: z.string().nullable().optional(),
});
