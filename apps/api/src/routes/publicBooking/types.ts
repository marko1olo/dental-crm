import { z } from "zod";

// --- Abuse protection constants ---
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 30;

export const DEFAULT_TIMEZONE = "Europe/Samara";
export const DEFAULT_OPEN_MINUTE = 9 * 60;
export const DEFAULT_CLOSE_MINUTE = 18 * 60;
export const DEFAULT_SLOT_MINUTES = 30;

export const CLINIC_LINK_DEAD_MESSAGE =
	"Клиника по этой ссылке не найдена: ссылка на онлайн-запись устарела или скопирована не полностью. Откройте запись заново с сайта клиники или позвоните в клинику, чтобы записаться.";

export const weekdayKeys = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
] as const;

export interface DaySchedule {
	isWorking: boolean;
	openMinute: number;
	closeMinute: number;
}

export interface DoctorScheduleWindow {
	isWorking: boolean;
	startMinute: number;
	endMinute: number;
}

export interface PublicSlotDto {
	time: string;
	startsAt: string;
	endsAt: string;
	availableDoctorIds: string[];
}

export const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты: YYYY-MM-DD");

export const organizationIdSchema = z.string().uuid("Некорректный ID клиники");
export const optionalDoctorIdSchema = z.string().uuid("Некорректный ID врача").optional();

export const bookingRequestSchema = z.object({
	doctorId: z.string().uuid("Некорректный идентификатор врача"),
	startsAt: z.string().datetime({ offset: true }),
	endsAt: z.string().datetime({ offset: true }),
	patientName: z.string().trim().min(2).max(120),
	patientPhone: z
		.string()
		.trim()
		.regex(/^\+?[0-9\s\-()]{7,20}$/, "Неверный формат номера телефона"),
	comment: z.string().trim().max(500).optional(),
	verificationCode: z.string().trim().min(4).max(8).optional(),
});

export const publicBookingFieldLabels: Record<string, string> = {
	doctorId: "врач",
	startsAt: "начало приёма",
	endsAt: "окончание приёма",
	patientName: "имя пациента",
	patientPhone: "телефон",
	comment: "комментарий",
	verificationCode: "код подтверждения",
};

export const sendOtpSchema = z.object({
	phone: z.string().trim().min(7).max(25),
	method: z.enum(["sms", "flash_call"]).default("sms"),
	organizationId: z.string().uuid().optional(),
});

export const cloudIntakeSchema = z.object({
	organizationId: z.string().uuid("Некорректный ID клиники"),
	doctorId: z.string().uuid("Некорректный ID врача"),
	startsAt: z.string().datetime({ offset: true }),
	endsAt: z.string().datetime({ offset: true }),
	patientName: z.string().trim().min(2).max(120),
	patientPhone: z
		.string()
		.trim()
		.regex(/^\+?[0-9\s\-()]{7,20}$/, "Неверный формат номера телефона"),
	comment: z.string().trim().max(500).optional(),
	chairId: z.string().uuid().optional(),
	serviceName: z.string().trim().max(100).optional(),
	verificationCode: z.string().trim().min(4).max(8).optional(),
	source: z.enum(["widget", "telegram", "tilda", "wordpress", "site"]).optional(),
});

export const acceptBumpSchema = z.object({
	organizationId: z.string().uuid(),
	bookingId: z.string().uuid(),
	chosenSlot: z.object({
		startsAt: z.string().datetime({ offset: true }),
		endsAt: z.string().datetime({ offset: true }),
	}),
});
