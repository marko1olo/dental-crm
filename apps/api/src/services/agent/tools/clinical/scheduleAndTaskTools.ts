/**
 * @file scheduleAndTaskTools.ts
 * @description Layer 2: Clinic appointment booking, rescheduling, cancellations, staff tasks, and recalls tools.
 */

import {
	calculateNextRecallDueMonth,
	RECALL_INTERVAL_MONTHS,
} from "@dental/shared";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db/client.js";
import {
	appointments,
	communicationTasks,
	patients,
	visits,
} from "../../../../db/schema.js";
import { checkAppointmentConflict } from "../../../schedule/scheduleConflictService.js";
import type { ToolDefinition } from "../tool.js";

// ─── 11. book_visit ─────────────────────────────────────────────────────────

const bookVisitSchema = z.object({
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

// ─── 12. reschedule_appointment ─────────────────────────────────────────────

const rescheduleAppointmentSchema = z.object({
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

// ─── 13. cancel_appointment ─────────────────────────────────────────────────

const cancelAppointmentSchema = z.object({
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

// ─── 14. get_doctor_schedule ────────────────────────────────────────────────

const getDoctorScheduleSchema = z.object({
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

// ─── 15. create_staff_task ──────────────────────────────────────────────────

const createStaffTaskSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента, к которому привязана задача"),
	title: z
		.string()
		.min(1, "Название задачи обязательно")
		.describe(
			"Заголовок задачи (например, 'Перезвонить по поводу плана лечения')",
		),
	description: z
		.string()
		.optional()
		.describe("Подробное описание задачи для сотрудника"),
	priority: z
		.enum(["low", "normal", "high", "urgent"])
		.optional()
		.default("normal")
		.describe("Приоритет задачи"),
	assignedRole: z
		.enum([
			"admin",
			"nurse",
			"doctor",
			"receptionist",
			"call_center",
			"hygienist",
		])
		.optional()
		.default("admin")
		.describe("Роль ответственного исполнителя"),
	dueDate: z
		.string()
		.datetime({ offset: true })
		.optional()
		.describe("Срок исполнения задачи в ISO 8601 (по умолчанию +24 часа)"),
});

export const createStaffTaskTool: ToolDefinition<typeof createStaffTaskSchema> =
	{
		name: "create_staff_task",
		description:
			"Создание внутреннего поручения / задачи сотрудникам клиники (администратору, медсестре, врачу) с привязкой к пациенту и сроку выполнения. Требует подтверждения (supervised/write).",
		parameters: createStaffTaskSchema,
		permissions: ["clinical.write", "tasks.write"],
		category: "write",
		handler: async (ctx, args) => {
			const targetDb = ctx.db ?? db;

			const [patient] = await targetDb
				.select({
					id: patients.id,
					fullName: patients.fullName,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, ctx.organizationId),
						eq(patients.id, args.patientId),
					),
				)
				.limit(1);

			if (!patient) {
				throw new Error(`Пациент с ID ${args.patientId} не найден`);
			}

			const dueTimestamp = args.dueDate
				? new Date(args.dueDate)
				: new Date(Date.now() + 24 * 60 * 60 * 1000);

			if (Number.isNaN(dueTimestamp.getTime())) {
				throw new Error("Некорректный формат срока dueDate");
			}

			const [created] = await targetDb
				.insert(communicationTasks)
				.values({
					organizationId: ctx.organizationId,
					clinicId: ctx.clinicId ?? null,
					patientId: args.patientId,
					assignedRole: args.assignedRole,
					channel: "phone",
					intent: "general",
					status: "needs_call",
					priority: args.priority,
					dueAt: dueTimestamp,
					title: args.title,
					body: args.description || args.title,
				})
				.returning();

			return {
				success: true,
				taskId: created.id,
				patientId: created.patientId,
				patientName: patient.fullName,
				title: created.title,
				description: created.body,
				assignedRole: created.assignedRole,
				priority: created.priority,
				status: created.status,
				dueAt: created.dueAt.toISOString(),
				createdAt: created.createdAt.toISOString(),
			};
		},
	};

// ─── 16. get_patient_recalls ────────────────────────────────────────────────

const getPatientRecallsSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe(
			"ID пациента для поиска назначенных и рекомендуемых вызовов (recalls)",
		),
	statusFilter: z
		.enum(["all", "pending", "due_now", "overdue"])
		.optional()
		.default("all")
		.describe("Фильтр по статусу вызова (all, pending, due_now, overdue)"),
});

export const getPatientRecallsTool: ToolDefinition<
	typeof getPatientRecallsSchema
> = {
	name: "get_patient_recalls",
	description:
		"Запрос истории и текущего статуса профилактических вызовов (recalls) пациента: профгигиена, осмотр имплантов, ортодонтический контроль, санация.",
	parameters: getPatientRecallsSchema,
	permissions: ["clinical.read", "communications.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const existingRecalls = await targetDb
			.select({
				id: communicationTasks.id,
				title: communicationTasks.title,
				body: communicationTasks.body,
				channel: communicationTasks.channel,
				status: communicationTasks.status,
				priority: communicationTasks.priority,
				dueAt: communicationTasks.dueAt,
				createdAt: communicationTasks.createdAt,
			})
			.from(communicationTasks)
			.where(
				and(
					eq(communicationTasks.organizationId, ctx.organizationId),
					eq(communicationTasks.patientId, args.patientId),
					eq(communicationTasks.intent, "recall"),
				),
			)
			.orderBy(desc(communicationTasks.dueAt));

		const nowMs = Date.now();
		const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

		const enrichedRecalls = existingRecalls.map(
			(r: typeof communicationTasks.$inferSelect) => {
				const dueMs = r.dueAt.getTime();
				let urgency: "upcoming" | "due_now" | "overdue" = "upcoming";
				if (dueMs < nowMs - fourteenDaysMs) {
					urgency = "overdue";
				} else if (dueMs <= nowMs + fourteenDaysMs) {
					urgency = "due_now";
				}

				return {
					id: r.id,
					title: r.title,
					notes: r.body,
					channel: r.channel,
					status: r.status,
					priority: r.priority,
					urgency,
					dueAt: r.dueAt.toISOString(),
					createdAt: r.createdAt.toISOString(),
				};
			},
		);

		const [lastVisit] = await targetDb
			.select({
				id: visits.id,
				diagnosis: visits.diagnosis,
				treatmentPlan: visits.treatmentPlan,
				signedAt: visits.signedAt,
				createdAt: visits.createdAt,
			})
			.from(visits)
			.where(
				and(
					eq(visits.organizationId, ctx.organizationId),
					eq(visits.patientId, args.patientId),
				),
			)
			.orderBy(desc(visits.createdAt))
			.limit(1);

		const recommendedRecalls: {
			reason: string;
			title: string;
			recommendedIntervalMonths: number;
			calculatedDueMonth: string;
		}[] = [];

		if (lastVisit) {
			const visitDate = lastVisit.signedAt ?? lastVisit.createdAt;
			const diagLower = (lastVisit.diagnosis || "").toLowerCase();

			recommendedRecalls.push({
				reason: "hygiene",
				title: "Профессиональная гигиена и ремотерапия (каждые 6 мес)",
				recommendedIntervalMonths: RECALL_INTERVAL_MONTHS.hygiene ?? 6,
				calculatedDueMonth: calculateNextRecallDueMonth(visitDate, "hygiene"),
			});

			if (diagLower.includes("имплант") || diagLower.includes("операц")) {
				recommendedRecalls.push({
					reason: "implant_review",
					title: "Контрольный осмотр дентальных имплантатов и ISQ (6 мес)",
					recommendedIntervalMonths: RECALL_INTERVAL_MONTHS.implant_review ?? 6,
					calculatedDueMonth: calculateNextRecallDueMonth(
						visitDate,
						"implant_review",
					),
				});
			}
		}

		let filteredRecalls = enrichedRecalls;
		if (args.statusFilter === "due_now") {
			filteredRecalls = enrichedRecalls.filter(
				(r: { urgency: string }) => r.urgency === "due_now",
			);
		} else if (args.statusFilter === "overdue") {
			filteredRecalls = enrichedRecalls.filter(
				(r: { urgency: string }) => r.urgency === "overdue",
			);
		} else if (args.statusFilter === "pending") {
			filteredRecalls = enrichedRecalls.filter(
				(r: { status: string }) =>
					r.status === "queued" ||
					r.status === "scheduled" ||
					r.status === "needs_call",
			);
		}

		return {
			patientId: args.patientId,
			totalActiveRecallsCount: enrichedRecalls.length,
			recalls: filteredRecalls,
			medicalRecommendations: recommendedRecalls,
		};
	},
};

// ─── 17. schedule_recall ────────────────────────────────────────────────────

const scheduleRecallSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для планирования recall"),
	recallReason: z
		.enum([
			"hygiene",
			"implant_review",
			"ortho_review",
			"checkup",
			"treatment_followup",
			"preventive",
		])
		.default("hygiene")
		.describe("Клиническая причина профилактического вызова"),
	dueAt: z
		.string()
		.datetime({ offset: true })
		.describe("Плановая дата/время recall в ISO 8601"),
	channel: z
		.enum(["whatsapp", "sms", "phone", "telegram", "email"])
		.optional()
		.default("whatsapp")
		.describe("Канал первичной коммуникации"),
	priority: z
		.enum(["low", "normal", "high", "urgent"])
		.optional()
		.default("normal")
		.describe("Приоритет вызова"),
	assignedRole: z
		.string()
		.optional()
		.default("admin")
		.describe("Роль ответственного сотрудника (admin/hygienist)"),
	notes: z.string().optional().describe("Клинические примечания к вызову"),
});

export const scheduleRecallTool: ToolDefinition<typeof scheduleRecallSchema> = {
	name: "schedule_recall",
	description:
		"Планирование профилактического вызова (recall) пациента на профгигиену, плановый осмотр или контроль лечения. Требует подтверждения (supervised/write).",
	parameters: scheduleRecallSchema,
	permissions: ["clinical.write", "communications.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [patient] = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден`);
		}

		const dueTimestamp = new Date(args.dueAt);
		if (Number.isNaN(dueTimestamp.getTime())) {
			throw new Error("Некорректный формат даты dueAt");
		}

		const titleByReason: Record<string, string> = {
			hygiene: "Профгигиена полости рта и ремотерапия (Recall)",
			implant_review: "Контрольный осмотр имплантов и прикуса (Recall)",
			ortho_review: "Ортодонтический контроль и активация аппарата (Recall)",
			checkup: "Плановый профилактический осмотр стоматолога (Recall)",
			treatment_followup:
				"Контроль после сложного эндодонтического/хирургического лечения (Recall)",
			preventive: "Профилактический диспансерный осмотр (Recall)",
		};

		const reasonKey = args.recallReason || "hygiene";
		const taskTitle =
			titleByReason[reasonKey] || "Профилактический осмотр (Recall)";
		const taskBody = args.notes
			? `${taskTitle}. Примечания: ${args.notes}`
			: taskTitle;

		const [created] = await targetDb
			.insert(communicationTasks)
			.values({
				organizationId: ctx.organizationId,
				clinicId: ctx.clinicId ?? null,
				patientId: args.patientId,
				assignedRole: args.assignedRole || "admin",
				// biome-ignore lint/suspicious/noExplicitAny: Enum cast
				channel: (args.channel || "whatsapp") as any,
				intent: "recall",
				status: "queued",
				priority: args.priority || "normal",
				dueAt: dueTimestamp,
				title: taskTitle,
				body: taskBody,
			})
			.returning();

		return {
			success: true,
			recallTaskId: created.id,
			patientId: created.patientId,
			patientName: patient.fullName,
			recallReason: args.recallReason,
			title: created.title,
			channel: created.channel,
			dueAt: created.dueAt.toISOString(),
			priority: created.priority,
			status: created.status,
			createdAt: created.createdAt.toISOString(),
		};
	},
};
