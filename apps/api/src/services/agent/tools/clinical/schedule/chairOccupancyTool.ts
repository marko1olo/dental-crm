/**
 * chairOccupancyTool.ts — Chair Occupancy, Conflict Resolution, Rescheduling and Cancellations.
 *
 * Verifies doctor and dental unit (chair) collisions and manages appointment updates.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../../db/client.js";
import { appointments } from "../../../../../db/schema.js";
import { checkAppointmentConflict } from "../../../../schedule/scheduleConflictService.js";
import type { ToolDefinition } from "../../tool.js";

// ─── Reschedule Appointment ─────────────────────────────────────────────────

export const rescheduleAppointmentSchema = z.object({
	appointmentId: z
		.string()
		.uuid("Некорректный UUID записи")
		.describe("ID существующей записи приема"),
	newStartsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Новое время начала приема в ISO 8601"),
	newEndsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Новое время окончания приема в ISO 8601"),
	reason: z.string().optional().describe("Причина переноса записи приема"),
});

export const rescheduleAppointmentTool: ToolDefinition<
	typeof rescheduleAppointmentSchema
> = {
	name: "reschedule_appointment",
	description:
		"Перенос существующей записи приема на другое время с проверкой пересечений и занятости врача/кресла. Требует подтверждения (supervised/write).",
	parameters: rescheduleAppointmentSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const newStart = new Date(args.newStartsAt);
		const newEnd = new Date(args.newEndsAt);

		if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) {
			throw new Error(
				"Некорректный формат даты/времени начала или окончания приема",
			);
		}

		if (newStart >= newEnd) {
			throw new Error(
				"Новое время начала приема должно быть строго раньше времени окончания",
			);
		}

		const [currentApp] = await targetDb
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.limit(1);

		if (!currentApp) {
			throw new Error(`Запись приема с ID ${args.appointmentId} не найдена`);
		}

		if (currentApp.status === "cancelled") {
			throw new Error("Нельзя перенести ранее отмененную запись приема");
		}

		if (currentApp.doctorUserId || currentApp.chairId) {
			const conflict = await checkAppointmentConflict(targetDb, {
				organizationId: ctx.organizationId,
				startsAt: newStart,
				endsAt: newEnd,
				doctorUserId: currentApp.doctorUserId,
				chairId: currentApp.chairId,
				excludeAppointmentId: args.appointmentId,
			});

			if (conflict.hasConflict) {
				throw new Error(
					`Конфликт расписания: выбранный интервал (${args.newStartsAt} — ${args.newEndsAt}) пересекается с другой записью врача или кресла.`,
				);
			}
		}

		const updateNote = args.reason
			? `[Перенесено]: ${args.reason}`
			: `[Перенесено с ${currentApp.startsAt.toISOString()}]`;

		const newComment = currentApp.comment
			? `${currentApp.comment}\n${updateNote}`
			: updateNote;

		const [updated] = await targetDb
			.update(appointments)
			.set({
				startsAt: newStart,
				endsAt: newEnd,
				comment: newComment,
			})
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.returning();

		return {
			success: true,
			appointmentId: updated.id,
			patientId: updated.patientId,
			doctorUserId: updated.doctorUserId,
			chairId: updated.chairId,
			previousStartsAt: currentApp.startsAt.toISOString(),
			previousEndsAt: currentApp.endsAt.toISOString(),
			newStartsAt: updated.startsAt.toISOString(),
			newEndsAt: updated.endsAt.toISOString(),
			status: updated.status,
		};
	},
};

// ─── Cancel Appointment ─────────────────────────────────────────────────────

export const cancelAppointmentSchema = z.object({
	appointmentId: z
		.string()
		.uuid("Некорректный UUID записи")
		.describe("ID отменяемой записи приема"),
	cancellationReason: z
		.string()
		.min(1, "Укажите причину отмены приема")
		.describe(
			"Причина отмены приема (пациент заболел, передумал, форс-мажор врача)",
		),
});

export const cancelAppointmentTool: ToolDefinition<
	typeof cancelAppointmentSchema
> = {
	name: "cancel_appointment",
	description:
		"Отмена записи на прием в расписании клиники с фиксацией причины отмены. Требует подтверждения (supervised/write).",
	parameters: cancelAppointmentSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [currentApp] = await targetDb
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.limit(1);

		if (!currentApp) {
			throw new Error(`Запись приема с ID ${args.appointmentId} не найдена`);
		}

		if (currentApp.status === "cancelled") {
			return {
				success: true,
				appointmentId: currentApp.id,
				status: "cancelled",
				message: "Запись приема уже была отменена ранее",
			};
		}

		const cancelNote = `[Отменено]: ${args.cancellationReason}`;
		const newComment = currentApp.comment
			? `${currentApp.comment}\n${cancelNote}`
			: cancelNote;

		const [updated] = await targetDb
			.update(appointments)
			.set({
				status: "cancelled",
				comment: newComment,
			})
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.returning();

		return {
			success: true,
			appointmentId: updated.id,
			patientId: updated.patientId,
			doctorUserId: updated.doctorUserId,
			status: "cancelled",
			cancellationReason: args.cancellationReason,
			cancelledAt: new Date().toISOString(),
		};
	},
};
