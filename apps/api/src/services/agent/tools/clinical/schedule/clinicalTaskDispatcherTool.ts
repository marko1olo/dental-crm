/**
 * clinicalTaskDispatcherTool.ts — Staff Task Dispatcher & Preventive Recalls Manager.
 *
 * Implements create_staff_task, get_patient_recalls, and schedule_recall.
 */

import {
	calculateNextRecallDueMonth,
	RECALL_INTERVAL_MONTHS,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../../db/client.js";
import {
	communicationTasks,
	patients,
	visits,
} from "../../../../../db/schema.js";
import type { ToolDefinition } from "../../tool.js";

// ─── 15. create_staff_task ──────────────────────────────────────────────────

export const createStaffTaskSchema = z.object({
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

export const getPatientRecallsSchema = z.object({
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

export const scheduleRecallSchema = z.object({
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
