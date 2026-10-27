/**
 * createAppointmentTool.ts — Создание записи пациента в расписании клиники.
 * Мандаты: 8b (<= 120 строк), 8e (2-фазный Guard), 8n (соло-врач: нет обязательных ассистентов).
 */

import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import { appointments } from "../../../db/schema.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const createAppointmentSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	doctorId: z.string().uuid("Некорректный UUID врача").describe("ID лечащего врача"),
	startTime: z.string().describe("Время начала приёма (ISO 8601 строка, например 2026-10-15T10:00:00Z)"),
	durationMinutes: z.number().min(15, "Минимум 15 минут").max(240, "Максимум 4 часа").default(30).describe("Длительность приёма в минутах"),
	chairId: z.string().uuid("Некорректный UUID кресла").optional().describe("ID стоматологической установки"),
	serviceTitle: z.string().optional().describe("Планируемая услуга или повод обращения"),
	notes: z.string().optional().describe("Примечания к визиту"),
	confirmed: z.boolean().optional().default(true).describe("Флаг подтверждения бронирования (2-фазный Guard)"),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export interface CreateAppointmentResult {
	readonly success: boolean;
	readonly appointmentId: string;
	readonly patientId: string;
	readonly doctorId: string;
	readonly startTime: string;
	readonly endTime: string;
	readonly durationMinutes: number;
	readonly status: string;
	readonly message: string;
}

export async function handleCreateAppointment(args: CreateAppointmentInput, context: DentalToolContext): Promise<CreateAppointmentResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const start = new Date(args.startTime);
	if (Number.isNaN(start.getTime())) {
		throw new Error(`Некорректный формат времени startTime: '${args.startTime}'`);
	}

	const duration = args.durationMinutes ?? 30;
	const end = new Date(start.getTime() + duration * 60 * 1000);

	// 2-Phase Confirmation Guard (Мандат 8e)
	if (args.confirmed === false || (context.requireConfirmation && args.confirmed !== true)) {
		return {
			success: false,
			appointmentId: "",
			patientId: args.patientId,
			doctorId: args.doctorId,
			startTime: start.toISOString(),
			endTime: end.toISOString(),
			durationMinutes: duration,
			status: "confirmation_required",
			message: `Требуется подтверждение записи пациента на ${start.toLocaleString("ru-RU")}.`,
		};
	}

	const [inserted] = await activeDb
		.insert(appointments)
		.values({
			organizationId: orgId,
			patientId: args.patientId,
			doctorId: args.doctorId,
			chairId: args.chairId ?? null,
			startTime: start,
			endTime: end,
			durationMinutes: duration,
			status: "scheduled",
			serviceTitle: args.serviceTitle ?? "Стоматологический приём",
			notes: args.notes ?? null,
		})
		.returning({ id: appointments.id });

	return {
		success: true,
		appointmentId: inserted.id,
		patientId: args.patientId,
		doctorId: args.doctorId,
		startTime: start.toISOString(),
		endTime: end.toISOString(),
		durationMinutes: duration,
		status: "scheduled",
		message: `Запись успешно добавлена в расписание клиники на ${start.toLocaleString("ru-RU")}.`,
	};
}

export const createAppointmentTool: DentalToolEntry<typeof createAppointmentSchema> = {
	name: "create_appointment",
	description: "Создание записи пациента в расписании клиники на свободное время с привязкой к врачу и креслу.",
	schema: createAppointmentSchema,
	destructive: true,
	titleRu: "Создание записи на приём в расписании",
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("create_appointment", "Создание записи пациента в расписании клиники.", createAppointmentSchema),
	handler: handleCreateAppointment,
};
