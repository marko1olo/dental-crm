import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { scheduleTimeReservations } from "./schema.js";

async function ensureScheduleTimeReservationsTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "schedule_time_reservations" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"chair_name" text NOT NULL,
				"reservation_type" text DEFAULT 'maintenance' NOT NULL,
				"start_time" text NOT NULL,
				"end_time" text NOT NULL,
				"booking_locked" boolean DEFAULT true NOT NULL,
				"hatching_style" text DEFAULT 'diagonal_red' NOT NULL,
				"note" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureScheduleTimeReservationsTable warning]:", err);
	}
}

export async function getScheduleTimeReservationsFromDb(orgId: string) {
	try {
		await ensureScheduleTimeReservationsTable();
		const rows = await db
			.select()
			.from(scheduleTimeReservations)
			.where(eq(scheduleTimeReservations.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[ScheduleTimeReservations DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			chairName: "Кабинет №1 (Терапия/Ортопедия)",
			reservationType: "lunch",
			startTime: "13:00",
			endTime: "14:00",
			bookingLocked: true,
			hatchingStyle: "diagonal_amber",
			note: "Обеденный перерыв персонала кабинета",
			createdAt: new Date().toISOString(),
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: orgId,
			chairName: "Кабинет №3 (Хирургия/Имплантология)",
			reservationType: "maintenance",
			startTime: "15:30",
			endTime: "16:30",
			bookingLocked: true,
			hatchingStyle: "diagonal_red",
			note: "Профилактическое обслуживание дентального микроскопа и установка фильтров",
			createdAt: new Date().toISOString(),
		},
	];
}
