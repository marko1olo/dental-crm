/**
 * doctorScheduleLookupTool.ts — Doctor Schedule & Free Capacity Lookup Tool.
 *
 * Queries doctor appointments, booked minutes, and calculates available chairside capacity.
 */

import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../../db/client.js";
import { appointments, patients } from "../../../../../db/schema.js";
import type { ToolDefinition } from "../../tool.js";

export const getDoctorScheduleSchema = z.object({
	doctorUserId: z
		.string()
		.uuid("Некорректный UUID врача")
		.describe("ID врача для получения расписания и занятости"),
	dateFrom: z
		.string()
		.datetime({ offset: true })
		.describe("Начало временного интервала в ISO 8601"),
	dateTo: z
		.string()
		.datetime({ offset: true })
		.describe("Конец временного интервала в ISO 8601"),
});

export const getDoctorScheduleTool: ToolDefinition<
	typeof getDoctorScheduleSchema
> = {
	name: "get_doctor_schedule",
	description:
		"Запрос рабочего расписания врача, занятых слотов и свободной емкости в заданном временном диапазоне.",
	parameters: getDoctorScheduleSchema,
	permissions: ["schedule.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const fromDate = new Date(args.dateFrom);
		const toDate = new Date(args.dateTo);

		if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
			throw new Error("Некорректный формат диапазона дат dateFrom / dateTo");
		}

		if (fromDate >= toDate) {
			throw new Error("dateFrom должно быть строго раньше dateTo");
		}

		const doctorApps = await targetDb
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				patientName: patients.fullName,
				chairId: appointments.chairId,
				status: appointments.status,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				reason: appointments.reason,
				comment: appointments.comment,
			})
			.from(appointments)
			.leftJoin(patients, eq(patients.id, appointments.patientId))
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.doctorUserId, args.doctorUserId),
					ne(appointments.status, "cancelled"),
					sql`${appointments.startsAt} < ${toDate} AND ${appointments.endsAt} > ${fromDate}`,
				),
			)
			.orderBy(appointments.startsAt);

		let totalBookedMinutes = 0;
		const slots = doctorApps.map(
			(a: {
				id: string;
				patientId: string;
				patientName: string | null;
				chairId: string | null;
				status: string;
				startsAt: Date;
				endsAt: Date;
				reason: string;
				comment: string | null;
			}) => {
				const startMs = Math.max(a.startsAt.getTime(), fromDate.getTime());
				const endMs = Math.min(a.endsAt.getTime(), toDate.getTime());
				const durationMin = Math.round((endMs - startMs) / 60000);
				if (durationMin > 0) {
					totalBookedMinutes += durationMin;
				}

				return {
					appointmentId: a.id,
					patientId: a.patientId,
					patientName: a.patientName || "Пациент",
					chairId: a.chairId,
					status: a.status,
					startsAt: a.startsAt.toISOString(),
					endsAt: a.endsAt.toISOString(),
					durationMinutes: durationMin,
					reason: a.reason,
				};
			},
		);

		const totalRangeMinutes = Math.round(
			(toDate.getTime() - fromDate.getTime()) / 60000,
		);
		const freeCapacityMinutes = Math.max(
			0,
			totalRangeMinutes - totalBookedMinutes,
		);

		return {
			doctorUserId: args.doctorUserId,
			dateFrom: args.dateFrom,
			dateTo: args.dateTo,
			totalAppointmentsCount: doctorApps.length,
			totalBookedMinutes,
			freeCapacityMinutes,
			bookedSlots: slots,
		};
	},
};
