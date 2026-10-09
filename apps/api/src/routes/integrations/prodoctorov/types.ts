/**
 * routes/integrations/prodoctorov/types.ts
 * Layer 0: DTO протокола ПроДокторов/МедФлекс, форматы слотов, врачей, броней, схемы Zod.
 */

import { z } from "zod";

// ─── СЛОВАРИ ДЛЯ YML-ФИДА ПРЕЙСКУРАНТА (НОМЕНКЛАТУРА 804н) ────────────────
export const ALLOWED_NOMENCLATURE_CATEGORIES: Record<
	"therapy" | "prosthetics" | "surgery" | "hygiene",
	{ id: string; name: string }
> = {
	therapy: {
		id: "therapy",
		name: "Терапевтическая стоматология (лечение кариеса и пульпита)",
	},
	prosthetics: {
		id: "prosthetics",
		name: "Ортопедическая стоматология (протезирование, коронки)",
	},
	surgery: {
		id: "surgery",
		name: "Хирургическая стоматология и имплантация",
	},
	hygiene: {
		id: "hygiene",
		name: "Профессиональная гигиена и отбеливание",
	},
};

export type AllowedNomenclatureCategory =
	keyof typeof ALLOWED_NOMENCLATURE_CATEGORIES;

export const DENTAL_SPECIALTIES_RU: Record<string, string> = {
	universal: "Врач-стоматолог общей практики",
	therapist: "Стоматолог-терапевт",
	surgeon: "Стоматолог-хирург",
	orthopedist: "Стоматолог-ортопед",
	orthodontist: "Стоматолог-ортодонт",
	periodontist: "Стоматолог-пародонтолог",
	hygienist: "Стоматолог-гигиенист",
	pediatric: "Детский стоматолог",
};

// ─── СХЕМЫ ВАЛИДАЦИИ ────────────────────────────────────────────────────────

export const slotsQuerySchema = z.object({
	organizationId: z.string().uuid().optional(),
	doctorId: z.string().uuid().optional(),
	startDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	endDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	durationMinutes: z.coerce.number().int().min(15).max(180).default(30),
	// Технологическая пауза СанПиН 3.3686-21 на дезинфекцию кабинета и установки (10–15 минут)
	sanpinDisinfectionMinutes: z.coerce.number().int().min(0).max(30).default(10),
});

export type SlotsQueryParams = z.infer<typeof slotsQuerySchema>;

export const webhookPayloadSchema = z
	.object({
		event: z.string().optional().default("booking_created"),
		action: z.string().optional(),
		deliveryId: z.string().optional(),
		delivery_id: z.string().optional(),
		bookingId: z.string().optional(),
		booking_id: z.string().optional(),
		externalId: z.string().optional(),
		external_id: z.string().optional(),
		id: z.string().optional(),
		organizationId: z.string().uuid().optional(),
		organization_id: z.string().uuid().optional(),
		// Пациент (вложенный или плоский)
		patient: z
			.object({
				fullName: z.string().optional(),
				full_name: z.string().optional(),
				name: z.string().optional(),
				phone: z.string().optional(),
				birthDate: z.string().optional().nullable(),
				birth_date: z.string().optional().nullable(),
				email: z.string().optional().nullable(),
				notes: z.string().optional().nullable(),
			})
			.optional(),
		patientName: z.string().optional(),
		patient_name: z.string().optional(),
		patientPhone: z.string().optional(),
		patient_phone: z.string().optional(),
		patientBirthDate: z.string().optional().nullable(),
		patient_birth_date: z.string().optional().nullable(),
		patientEmail: z.string().optional().nullable(),
		patient_email: z.string().optional().nullable(),
		// Прием (вложенный или плоский)
		appointment: z
			.object({
				doctorId: z.string().uuid().optional(),
				doctor_id: z.string().uuid().optional(),
				doctorUserId: z.string().uuid().optional(),
				doctor_user_id: z.string().uuid().optional(),
				chairId: z.string().uuid().optional(),
				chair_id: z.string().uuid().optional(),
				startsAt: z.string().optional(),
				starts_at: z.string().optional(),
				endsAt: z.string().optional(),
				ends_at: z.string().optional(),
				durationMinutes: z.coerce.number().int().positive().optional(),
				duration_minutes: z.coerce.number().int().positive().optional(),
				reason: z.string().optional(),
				comment: z.string().optional(),
			})
			.optional(),
		doctorId: z.string().uuid().optional(),
		doctor_id: z.string().uuid().optional(),
		doctorUserId: z.string().uuid().optional(),
		doctor_user_id: z.string().uuid().optional(),
		chairId: z.string().uuid().optional(),
		chair_id: z.string().uuid().optional(),
		startsAt: z.string().optional(),
		starts_at: z.string().optional(),
		endsAt: z.string().optional(),
		ends_at: z.string().optional(),
		durationMinutes: z.coerce.number().int().positive().optional(),
		duration_minutes: z.coerce.number().int().positive().optional(),
		reason: z.string().optional(),
		comment: z.string().optional(),
	})
	.passthrough();

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

export interface ProdoctorovSlotItem {
	startsAt: string;
	endsAt: string;
	durationMinutes: number;
	chairId: string | null;
	chairName: string | null;
}

export interface ProdoctorovDoctorSlots {
	doctorId: string;
	doctorName: string;
	specialties: string[];
	availableSlotsCount: number;
	slots: ProdoctorovSlotItem[];
}

export interface ProdoctorovSlotsResponse {
	success: boolean;
	organizationId: string;
	startDate: string;
	endDate: string;
	totalAvailableSlots: number;
	doctors: ProdoctorovDoctorSlots[];
}

export interface ProdoctorovSyncStatusUpdate {
	priceListSyncStatus?: string;
	availableSlotsCount?: number;
}

export interface BookingResponseData {
	statusCode: number;
	body: Record<string, unknown>;
}
