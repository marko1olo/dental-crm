/**
 * appointmentBookingTool.ts — Chairside Appointment Booking Tool.
 *
 * Mandate 8e: Doctor autonomy — zero disabled blockers.
 * Creates planned appointments in clinic schedule with supervisor confirmation.
 */

import { z } from "zod";
import { db } from "../../../../../db/client.js";
import { appointments } from "../../../../../db/schema.js";
import type { ToolDefinition } from "../../tool.js";

export const bookVisitSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для записи"),
	doctorUserId: z
		.string()
		.uuid("Некорректный UUID врача")
		.describe("ID лечащего врача"),
	chairId: z
		.string()
		.uuid("Некорректный UUID кресла")
		.optional()
		.describe("ID стоматологической установки / кабинета"),
	startsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Время начала приема в ISO 8601"),
	endsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Время окончания приема в ISO 8601"),
	reason: z
		.string()
		.min(1, "Причина записи обязательна")
		.describe("Причина обращения / планируемая процедура"),
	comment: z.string().optional().describe("Дополнительные примечания к записи"),
});

export const bookVisitTool: ToolDefinition<typeof bookVisitSchema> = {
	name: "book_visit",
	description:
		"Создание брони / записи на прием в расписании клиники. Требует подтверждения в режиме supervised.",
	parameters: bookVisitSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const startTime = new Date(args.startsAt);
		const endTime = new Date(args.endsAt);

		if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
			throw new Error(
				"Некорректный формат даты/времени начала или окончания приема",
			);
		}

		if (startTime >= endTime) {
			throw new Error(
				"Время начала приема должно быть строго раньше времени окончания",
			);
		}

		const [created] = await targetDb
			.insert(appointments)
			.values({
				organizationId: ctx.organizationId,
				patientId: args.patientId,
				doctorUserId: args.doctorUserId,
				chairId: args.chairId ?? null,
				status: "planned",
				startsAt: startTime,
				endsAt: endTime,
				reason: args.reason,
				comment: args.comment ?? null,
			})
			.returning();

		return {
			success: true,
			appointmentId: created.id,
			patientId: created.patientId,
			doctorUserId: created.doctorUserId,
			startsAt: created.startsAt,
			endsAt: created.endsAt,
			status: created.status,
			reason: created.reason,
		};
	},
};
