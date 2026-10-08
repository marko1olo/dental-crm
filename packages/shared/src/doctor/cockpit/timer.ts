/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Shift Cockpit Timer (Layer 0)
 *
 * Appointment Countdown Timer Engine:
 * - "normal" (> 15 min remaining, green / emerald status)
 * - "warning" (5..15 min remaining, amber/yellow status)
 * - "critical" (< 5 min remaining, red / rose status)
 * - "overtime" (slot expired, delay tracking in minutes/seconds, crimson status)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

export const appointmentTimerStatusSchema = z.enum([
	"normal",
	"warning",
	"critical",
	"overtime",
]);
export type AppointmentTimerStatus = z.infer<typeof appointmentTimerStatusSchema>;

export const APPOINTMENT_TIMER_STATUS_META: Record<
	AppointmentTimerStatus,
	{
		labelRu: string;
		badgeColor: "emerald" | "amber" | "rose" | "crimson";
		badgeColorHex: string;
		descriptionRu: string;
		severityLevel: number;
	}
> = {
	normal: {
		labelRu: "В графике",
		badgeColor: "emerald",
		badgeColorHex: "#10b981",
		descriptionRu: "Прием идет по графику, до окончания более 15 минут.",
		severityLevel: 0,
	},
	warning: {
		labelRu: "Завершение приема",
		badgeColor: "amber",
		badgeColorHex: "#f59e0b",
		descriptionRu: "До конца слота приема осталось от 5 до 15 минут.",
		severityLevel: 1,
	},
	critical: {
		labelRu: "Критическое время",
		badgeColor: "rose",
		badgeColorHex: "#f43f5e",
		descriptionRu: "До окончания слота менее 5 минут! Необходимо завершать манипуляции.",
		severityLevel: 2,
	},
	overtime: {
		labelRu: "Задержка приема",
		badgeColor: "crimson",
		badgeColorHex: "#dc2626",
		descriptionRu: "Время приема истекло. Идет превышение длительности приема.",
		severityLevel: 3,
	},
};

export const appointmentTimerResultSchema = z.object({
	status: appointmentTimerStatusSchema,
	remainingMinutes: z.number().int().min(0),
	remainingSeconds: z.number().int().min(0),
	overtimeMinutes: z.number().int().min(0),
	overtimeSeconds: z.number().int().min(0),
	elapsedMinutes: z.number().int().min(0),
	elapsedSeconds: z.number().int().min(0),
	totalSlotDurationMinutes: z.number().int().min(0),
	totalSlotDurationSeconds: z.number().int().min(0),
	progressPercent: z.number().min(0).max(100),
	isOvertime: z.boolean(),
	badgeColor: z.enum(["emerald", "amber", "rose", "crimson"]),
	badgeColorHex: z.string(),
	labelRu: z.string(),
	startsAtIso: z.string(),
	endsAtIso: z.string(),
	currentTimestampIso: z.string(),
});
export type AppointmentTimerResult = z.infer<typeof appointmentTimerResultSchema>;

/**
 * Calculates real-time countdown timer for an active appointment slot with exact threshold gradations.
 *
 * Rules:
 * - "normal": > 15 minutes until slot end (green status)
 * - "warning": 5..15 minutes until slot end (amber status)
 * - "critical": < 5 minutes until slot end (red status)
 * - "overtime": Slot elapsed, delay in progress (crimson status)
 */
export function calculateAppointmentTimer(params: {
	startsAtIso: string;
	endsAtIso: string;
	currentTimeIso?: string;
}): AppointmentTimerResult {
	const currentIso = params.currentTimeIso ?? new Date().toISOString();
	const startMs = new Date(params.startsAtIso).getTime();
	const endMs = new Date(params.endsAtIso).getTime();
	const currentMs = new Date(currentIso).getTime();

	const totalDurationMs = Math.max(0, endMs - startMs);
	const totalSlotDurationSeconds = Math.floor(totalDurationMs / 1000);
	const totalSlotDurationMinutes = Math.round(totalDurationMs / 60000);

	const elapsedMs = Math.max(0, currentMs - startMs);
	const elapsedSeconds = Math.floor(elapsedMs / 1000);
	const elapsedMinutes = Math.floor(elapsedSeconds / 60);

	const remainingMs = endMs - currentMs;

	if (remainingMs <= 0) {
		// Overtime condition
		const overtimeMs = currentMs - endMs;
		const overtimeSeconds = Math.max(0, Math.floor(overtimeMs / 1000));
		const overtimeMinutes = Math.floor(overtimeSeconds / 60);

		const meta = APPOINTMENT_TIMER_STATUS_META.overtime;
		const labelRu =
			overtimeMinutes > 0
				? `Задержка: +${overtimeMinutes} мин`
				: `Задержка: +${overtimeSeconds} сек`;

		return {
			status: "overtime",
			remainingMinutes: 0,
			remainingSeconds: 0,
			overtimeMinutes,
			overtimeSeconds,
			elapsedMinutes,
			elapsedSeconds,
			totalSlotDurationMinutes,
			totalSlotDurationSeconds,
			progressPercent: 100,
			isOvertime: true,
			badgeColor: meta.badgeColor,
			badgeColorHex: meta.badgeColorHex,
			labelRu,
			startsAtIso: params.startsAtIso,
			endsAtIso: params.endsAtIso,
			currentTimestampIso: currentIso,
		};
	}

	const remainingSeconds = Math.ceil(remainingMs / 1000);
	const remainingMinutes = Math.ceil(remainingSeconds / 60);

	const progressPercent =
		totalDurationMs > 0
			? Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)))
			: 0;

	let status: AppointmentTimerStatus = "normal";
	if (remainingMs < 5 * 60 * 1000) {
		status = "critical";
	} else if (remainingMs <= 15 * 60 * 1000) {
		status = "warning";
	} else {
		status = "normal";
	}

	const meta = APPOINTMENT_TIMER_STATUS_META[status];
	let labelRu = "";
	if (status === "critical") {
		labelRu = `Критично: ${remainingMinutes} мин`;
	} else if (status === "warning") {
		labelRu = `Завершение: ${remainingMinutes} мин`;
	} else {
		labelRu = `В графике: ${remainingMinutes} мин`;
	}

	return {
		status,
		remainingMinutes,
		remainingSeconds,
		overtimeMinutes: 0,
		overtimeSeconds: 0,
		elapsedMinutes,
		elapsedSeconds,
		totalSlotDurationMinutes,
		totalSlotDurationSeconds,
		progressPercent,
		isOvertime: false,
		badgeColor: meta.badgeColor,
		badgeColorHex: meta.badgeColorHex,
		labelRu,
		startsAtIso: params.startsAtIso,
		endsAtIso: params.endsAtIso,
		currentTimestampIso: currentIso,
	};
}
