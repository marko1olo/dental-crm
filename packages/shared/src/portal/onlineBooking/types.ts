/**
 * types.ts — Online Booking Schemas, Slot Models, Soft-Lock Types & Attribution DTOs.
 */

import { z } from "zod";

// ─── 1. SPECIALTY & BRANCH SCHEMAS ───────────────────────────────────────────

export const DOCTOR_SPECIALTY_CATEGORIES = [
	"therapy",
	"orthopedics",
	"surgery",
	"orthodontics",
	"periodontics",
	"pediatric",
	"hygiene",
	"all",
] as const;
export type DoctorSpecialtyCategory = (typeof DOCTOR_SPECIALTY_CATEGORIES)[number];
export const doctorSpecialtyCategorySchema = z.enum(DOCTOR_SPECIALTY_CATEGORIES);

export interface SpecialtyMetadata {
	category: DoctorSpecialtyCategory;
	titleRu: string;
	shortTitleRu: string;
	descriptionRu: string;
	defaultSlotDurationMinutes: number;
}

export const clinicBranchSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	name: z.string().min(1),
	address: z.string().min(1),
	city: z.string().default("Москва"),
	phone: z.string().min(10),
	workingHours: z.string().default("Пн-Вс 09:00 - 21:00"),
	timezone: z.string().default("Europe/Moscow"),
});
export type ClinicBranch = z.infer<typeof clinicBranchSchema>;

export const bookingDoctorProfileSchema = z.object({
	id: z.string().min(1),
	fullName: z.string().min(1),
	specialty: z.string().min(1),
	specialtyCategory: doctorSpecialtyCategorySchema,
	branchId: z.string().min(1),
	branchName: z.string().optional(),
	cabinetId: z.string().optional().nullable(),
	cabinetName: z.string().optional().nullable(),
	rating: z.number().min(0).max(5).default(5.0),
	reviewsCount: z.number().int().min(0).default(0),
	experienceYears: z.number().int().min(0).default(5),
	photoUrl: z.string().optional().nullable(),
	isOnlineBookingAvailable: z.boolean().default(true),
	defaultSlotDurationMinutes: z.number().int().positive().default(30),
});
export type BookingDoctorProfile = z.infer<typeof bookingDoctorProfileSchema>;

// ─── 2. ANTI-COLLISION SOFT-LOCK ENGINE TYPES (10-MIN HOLD) ─────────────────

export const SOFT_LOCK_DEFAULT_TTL_MINUTES = 10; // 10 minutes hold during booking flow

export const slotSoftLockSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	branchId: z.string().min(1),
	doctorId: z.string().min(1),
	cabinetId: z.string().optional().nullable(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	durationMinutes: z.number().int().positive(),
	patientId: z.string().min(1), // Patient ID or temporary mobile session ID
	patientPhone: z.string().min(10),
	acquiredAtIso: z.string().datetime(),
	expiresAtIso: z.string().datetime(),
	isReleased: z.boolean().default(false),
	releasedAtIso: z.string().datetime().optional().nullable(),
});
export type SlotSoftLock = z.infer<typeof slotSoftLockSchema>;

export interface AcquireSoftLockRequest {
	organizationId: string;
	branchId: string;
	doctorId: string;
	cabinetId?: string | null | undefined;
	startTime: string; // ISO datetime
	endTime: string; // ISO datetime
	patientId: string;
	patientPhone: string;
	lockTtlMinutes?: number | undefined;
}

export type AcquireSoftLockResult =
	| {
			success: true;
			lock: SlotSoftLock;
			updatedLocks: SlotSoftLock[];
	  }
	| {
			success: false;
			reason: "SLOT_IN_PAST" | "SLOT_ALREADY_BOOKED" | "SLOT_ALREADY_LOCKED" | "INVALID_INTERVAL";
			descriptionRu: string;
			conflictAppointmentId?: string | undefined;
			conflictLockId?: string | undefined;
	  };

// ─── 3. FREE SLOTS DISCOVERY & AGGREGATION TYPES ─────────────────────────────

export interface FreeBookingSlot {
	slotId: string;
	doctorId: string;
	doctorFullName: string;
	specialty: string;
	specialtyCategory: DoctorSpecialtyCategory;
	branchId: string;
	cabinetId?: string | null | undefined;
	cabinetName?: string | null | undefined;
	startTime: string; // ISO
	endTime: string; // ISO
	durationMinutes: number;
	displayDateRu: string; // "29 августа 2026, Сб"
	displayTimeRu: string; // "14:30"
	isEmergencyBuffer: boolean;
	isSoftLocked: boolean;
}

export interface DoctorAvailableSlotsGroup {
	doctor: BookingDoctorProfile;
	totalAvailableSlots: number;
	earliestAvailableSlot: FreeBookingSlot | null;
	slotsByDate: Record<string, FreeBookingSlot[]>; // YYYY-MM-DD -> slots
}

export interface FindBookingSlotsOptions {
	branchId?: string | undefined;
	specialtyCategory?: DoctorSpecialtyCategory | undefined;
	doctorId?: string | undefined;
	startDate?: string | undefined; // YYYY-MM-DD or ISO
	endDate?: string | undefined; // YYYY-MM-DD or ISO
	targetDurationMinutes?: number | undefined; // 30, 45, 60
	excludeEmergencyReserves?: boolean | undefined;
	requestingPatientId?: string | undefined;
	now?: Date | undefined;
}

// ─── 4. CRM BOOKING CREATION & ATTRIBUTION TYPES ─────────────────────────────

export const createOnlineBookingInputSchema = z.object({
	organizationId: z.string().min(1),
	branchId: z.string().min(1),
	doctorId: z.string().min(1),
	cabinetId: z.string().optional().nullable(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	patientPhone: z.string().min(10),
	serviceCategory: doctorSpecialtyCategorySchema.default("therapy"),
	serviceName: z.string().default("Первичный приём и консультация стоматолога"),
	patientNotes: z.string().max(1000).optional().nullable(),
	lockId: z.string().optional().nullable(),
	channel: z.enum(["mobile_portal", "web_portal", "widget"]).default("mobile_portal"),
	clientIp: z.string().default("127.0.0.1"),
	userAgent: z.string().default("patient_mobile_portal"),
});
export type CreateOnlineBookingInput = z.input<typeof createOnlineBookingInputSchema>;
export type CreateOnlineBookingOutput = z.output<typeof createOnlineBookingInputSchema>;

export const portalBookingPushNotificationSchema = z.object({
	recipientPatientId: z.string().min(1),
	recipientPhone: z.string().min(10),
	title: z.string().min(1),
	body: z.string().min(1),
	data: z.object({
		appointmentId: z.string().min(1),
		doctorId: z.string().min(1),
		startTime: z.string().datetime(),
		endTime: z.string().datetime(),
		branchAddress: z.string().min(1),
		source: z.enum(["ONLINE_PORTAL", "ONLINE_BOOKING"]).default("ONLINE_BOOKING"),
		actionUrl: z.string().url(),
	}),
});
export type PortalBookingPushNotification = z.infer<typeof portalBookingPushNotificationSchema>;

export const adminNewBookingAlertSchema = z.object({
	alertId: z.string().uuid(),
	organizationId: z.string().min(1),
	branchId: z.string().min(1),
	appointmentId: z.string().min(1),
	title: z.string().min(1),
	message: z.string().min(1),
	patientFullName: z.string().min(1),
	patientPhone: z.string().min(10),
	doctorFullName: z.string().min(1),
	appointmentStartTime: z.string().datetime(),
	source: z.enum(["ONLINE_PORTAL", "ONLINE_BOOKING"]).default("ONLINE_BOOKING"),
	createdAtIso: z.string().datetime(),
});
export type AdminNewBookingAlert = z.infer<typeof adminNewBookingAlertSchema>;

export const onlinePortalBookingResultSchema = z.object({
	appointment: z.object({
		id: z.string().uuid(),
		clinicId: z.string().min(1),
		doctorId: z.string().min(1),
		cabinetId: z.string().optional().nullable(),
		patientId: z.string().min(1),
		patientFullName: z.string().min(1),
		startTime: z.string().datetime(),
		endTime: z.string().datetime(),
		status: z.enum(["planned", "ONLINE_BOOKING", "confirmed"]).default("ONLINE_BOOKING"),
		isEmergency: z.boolean().default(false),
		notes: z.string().nullable().optional(),
		source: z.enum(["ONLINE_PORTAL", "ONLINE_BOOKING"]).default("ONLINE_BOOKING"),
		sourceMetadata: z.object({
			channel: z.string(),
			bookedAtIso: z.string().datetime(),
			lockId: z.string().nullable().optional(),
			clientIp: z.string(),
			userAgent: z.string(),
			serviceCategory: z.string(),
			serviceName: z.string(),
		}),
	}),
	pushNotification: portalBookingPushNotificationSchema,
	adminAlert: adminNewBookingAlertSchema,
});
export type OnlinePortalBookingResult = z.infer<typeof onlinePortalBookingResultSchema>;
