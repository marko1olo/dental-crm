/**
 * getAvailableSlotsTool.ts — Поиск свободных окон в расписании клиники.
 * Мандаты: 8b (<= 120 строк), 8e (автономия врача), 8n (соло-практика).
 */

import {
	formatDateKeyInTimeZone,
	resolveValidIanaTimeZone,
	todayDateKeyInTimeZone,
	wallClockToUtcInTimeZone,
} from "@dental/shared";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { appointments } from "../../../db/schema.js";
import { clinicTimeZone } from "../../../services/reports/managerReports/timezone.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";
import { withToolTenantDb } from "./dbTypes.js";

export const getAvailableSlotsSchema = z.object({
	date: z.string().optional().describe("Дата для поиска свободных слотов (ГГГГ-ММ-ДД или ISO строка). По умолчанию сегодня."),
	doctorId: z.string().optional().describe("ID лечащего врача (если опущен, берутся все доступные врачи или из контекста)"),
	durationMinutes: z.number().min(15).max(240).default(30).describe("Требуемая длительность приёма в минутах (по умолчанию 30)"),
});

export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsSchema>;

export interface AvailableSlotItem {
	startTime: string;
	endTime: string;
	durationMinutes: number;
	available: boolean;
}

export interface GetAvailableSlotsResult {
	readonly success: boolean;
	readonly date: string;
	readonly doctorId?: string;
	readonly durationMinutes: number;
	readonly availableSlots: AvailableSlotItem[];
	readonly totalAvailableCount: number;
	readonly message: string;
}

export async function handleGetAvailableSlots(
	args: GetAvailableSlotsInput,
	context: DentalToolContext,
): Promise<GetAvailableSlotsResult> {
	const orgId = context.organizationId;
	const doctorId = args.doctorId || context.doctorId || undefined;
	const duration = args.durationMinutes ?? 30;

	const { existingAppointments, dateStr, dayStartMs, dayEndMs } = await withToolTenantDb(
		context,
		async (activeDb) => {
			const tz = resolveValidIanaTimeZone(await clinicTimeZone(orgId, activeDb));
			const trimmedDate = args.date?.trim();
			let resolvedDateStr: string;
			if (trimmedDate && /^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
				resolvedDateStr = trimmedDate;
			} else if (trimmedDate) {
				const parsed = new Date(trimmedDate);
				resolvedDateStr = Number.isNaN(parsed.getTime())
					? todayDateKeyInTimeZone(tz)
					: formatDateKeyInTimeZone(parsed, tz);
			} else {
				resolvedDateStr = todayDateKeyInTimeZone(tz);
			}

			const dayStart = wallClockToUtcInTimeZone(resolvedDateStr, 9, 0, tz) ?? new Date();
			const dayEnd = wallClockToUtcInTimeZone(resolvedDateStr, 20, 0, tz) ?? new Date();

			const conditions = [
				eq(appointments.organizationId, orgId),
				gte(appointments.startsAt, dayStart),
				lte(appointments.endsAt, dayEnd),
			];
			if (doctorId) {
				conditions.push(eq(appointments.doctorUserId, doctorId));
			}

			const rows = await activeDb
				.select({
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					status: appointments.status,
				})
				.from(appointments)
				.where(and(...conditions));

			return {
				existingAppointments: rows,
				dateStr: resolvedDateStr,
				dayStartMs: dayStart.getTime(),
				dayEndMs: dayEnd.getTime(),
			};
		},
	);

	const busyIntervals = existingAppointments
		.filter((apt) => apt.status !== "cancelled")
		.map((apt) => ({
			start: new Date(apt.startsAt).getTime(),
			end: new Date(apt.endsAt).getTime(),
		}));

	// Нарезка слотов по duration минут
	const slots: AvailableSlotItem[] = [];
	let current = dayStartMs;
	const slotDurationMs = duration * 60 * 1000;

	while (current + slotDurationMs <= dayEndMs) {
		const slotEnd = current + slotDurationMs;
		const isBusy = busyIntervals.some(
			(busy) => current < busy.end && slotEnd > busy.start,
		);

		if (!isBusy) {
			slots.push({
				startTime: new Date(current).toISOString(),
				endTime: new Date(slotEnd).toISOString(),
				durationMinutes: duration,
				available: true,
			});
		}
		current += slotDurationMs;
	}

	return {
		success: true,
		date: dateStr,
		...(doctorId ? { doctorId } : {}),
		durationMinutes: duration,
		availableSlots: slots,
		totalAvailableCount: slots.length,
		message: `Найдено ${slots.length} свободных окон длительностью ${duration} мин на ${dateStr}.`,
	};
}

export const getAvailableSlotsTool: DentalToolEntry<typeof getAvailableSlotsSchema> = {
	name: "get_available_slots",
	description: "Поиск свободных окон для записи на приём в расписании клиники на указанную дату.",
	schema: getAvailableSlotsSchema,
	destructive: false,
	titleRu: "Поиск свободных окон в расписании",
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition(
		"get_available_slots",
		"Поиск свободных окон в расписании клиники на указанную дату с учетом существующих записей.",
		getAvailableSlotsSchema,
	),
	handler: handleGetAvailableSlots,
};
