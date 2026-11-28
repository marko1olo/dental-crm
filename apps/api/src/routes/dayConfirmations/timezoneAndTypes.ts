import { shiftCalendarDay, tomorrowDateKeyInTimeZone } from "@dental/shared";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import { replyBadRequest } from "../routeErrors.js";

export type ReminderState =
	| "not_queued"
	| "queued"
	| "sent"
	| "delivered"
	| "failed"
	| "suppressed"
	| "cancelled";

export const OUTBOX_TO_REMINDER_STATE: Readonly<Record<string, ReminderState>> =
	{
		queued: "queued",
		sending: "queued",
		sent: "sent",
		delivered: "delivered",
		failed: "failed",
		suppressed: "suppressed",
		cancelled: "cancelled",
	};

export const dayConfirmationsQuerySchema = z
	.object({
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "дата должна быть в виде ГГГГ-ММ-ДД")
			.optional(),
	})
	.strict();

export const batchDispatchSchema = z
	.object({
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "дата должна быть в виде ГГГГ-ММ-ДД")
			.optional(),
		channelOverride: z.enum(["auto", "telegram", "whatsapp", "sms"]).optional(),
		allowQuietHoursOverride: z.boolean().default(false).optional(),
		appointmentIds: z.array(z.string().uuid()).optional(),
	})
	.strict();

export function dayBoundsInTimeZone(
	date: string,
	timeZone: string,
	logger?: { error: (obj: unknown, msg?: string) => void },
): { from: Date; to: Date } | null {
	const parts = date.split("-").map((value) => Number.parseInt(value, 10));
	const [year, month, day] = parts;
	if (!year || !month || !day) return null;

	let offsetMinutes = 0;
	try {
		const probeUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone,
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			hour12: false,
		});
		const formattedParts = formatter.formatToParts(probeUtc);
		const map = Object.fromEntries(
			formattedParts.map((p) => [p.type, p.value]),
		);
		const localAsUtc = Date.UTC(
			Number(map.year),
			Number(map.month) - 1,
			Number(map.day),
			Number(map.hour === "24" ? 0 : map.hour),
			Number(map.minute),
			Number(map.second),
		);
		offsetMinutes = (localAsUtc - probeUtc.getTime()) / 60_000;
	} catch (err) {
		logger?.error({ err }, "[Dente] timezone helper failed");
		return null;
	}

	const from = new Date(
		Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60_000,
	);
	const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
	return { from, to };
}

function dateInTimeZone(
	timeZone: string,
	moment: Date,
	logger?: { error: (obj: unknown, msg?: string) => void },
): string | null {
	try {
		return new Intl.DateTimeFormat("en-CA", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(moment);
	} catch (err) {
		logger?.error({ err }, "[Dente] timezone helper failed");
		return null;
	}
}

export function tomorrowInTimeZone(
	timeZone: string,
	now = new Date(),
	logger?: { error: (obj: unknown, msg?: string) => void },
): string {
	const today = dateInTimeZone(timeZone, now, logger);
	if (!today) {
		return tomorrowDateKeyInTimeZone("UTC", now);
	}
	return shiftCalendarDay(today, 1);
}

export function badDayConfirmationRequest(
	reply: FastifyReply,
	message: string,
) {
	return replyBadRequest(reply, "DayConfirmationValidationError", message);
}

export function reminderStateRank(state: ReminderState): number {
	switch (state) {
		case "delivered":
			return 5;
		case "sent":
			return 4;
		case "queued":
			return 3;
		case "failed":
			return 2;
		case "suppressed":
			return 1;
		default:
			return 0;
	}
}
