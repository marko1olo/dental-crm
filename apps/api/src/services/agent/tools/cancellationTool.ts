/**
 * cancellationTool.ts — Intelligent cancellation gap auto-fill and patient recall matching tool.
 * Scans waiting lists, communication tasks, and incomplete treatment plans to rapidly fill schedule openings.
 */

import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import {
	appointments,
	chairs,
	communicationTasks,
	patientTaskTickets,
	patients,
	treatmentPlans,
	users,
} from "../../../db/schema.js";
import type { ToolDefinition } from "./tool.js";

// ─── PARAMETERS SCHEMA ───────────────────────────────────────────────────────

const autoFillCancellationGapSchema = z.object({
	appointmentId: z
		.string()
		.uuid("Некорректный UUID записи на прием")
		.describe("ID отмененного визита для анализа освободившегося временного слота"),
	maxCandidates: z
		.number()
		.int()
		.min(1)
		.max(20)
		.optional()
		.default(5)
		.describe("Максимальное количество кандидатов в выдаче (по умолчанию 5)"),
});

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────

export interface CancellationGapCandidate {
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string | null;
	readonly source: "waiting_list" | "recall" | "treatment_plan" | "staff_ticket";
	readonly matchScore: number;
	readonly callReason: string;
	readonly priority: "urgent" | "high" | "normal" | "low";
	readonly oneClickBookingSlot: {
		readonly patientId: string;
		readonly doctorUserId: string | null;
		readonly chairId: string | null;
		readonly startsAt: string;
		readonly endsAt: string;
		readonly proposedReason: string;
	};
}

export interface AutoFillCancellationGapResult {
	readonly gapSummary: {
		readonly appointmentId: string;
		readonly startsAt: string;
		readonly endsAt: string;
		readonly durationMinutes: number;
		readonly doctorUserId: string | null;
		readonly doctorName: string;
		readonly chairId: string | null;
		readonly chairName: string;
		readonly originalReason: string;
		readonly status: string;
	};
	readonly candidatesCount: number;
	readonly candidates: CancellationGapCandidate[];
	readonly recommendedAction: string;
}

// ─── TOOL DEFINITION ────────────────────────────────────────────────────────

export const autoFillCancellationGapTool: ToolDefinition<
	typeof autoFillCancellationGapSchema,
	AutoFillCancellationGapResult
> = {
	name: "auto_fill_cancellation_gap",
	description:
		"Интеллектуальный подбор кандидатов для оперативного заполнения образовавшегося окна отмены (из листа ожидания, recall-вызовов и незавершенных планов лечения) с готовым слотом для 1-клик записи.",
	parameters: autoFillCancellationGapSchema,
	permissions: ["schedule.read", "patients.read", "clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		// 1. Fetch canceled appointment
		const [apt] = await targetDb
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				doctorUserId: appointments.doctorUserId,
				chairId: appointments.chairId,
				status: appointments.status,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				reason: appointments.reason,
				comment: appointments.comment,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.limit(1);

		if (!apt) {
			throw new Error(`Запись на прием с ID ${args.appointmentId} не найдена`);
		}

		// 2. Fetch doctor info
		let doctorInfo: { fullName: string; role: string; specialties: unknown } | null = null;
		if (apt.doctorUserId) {
			const [doc] = await targetDb
				.select({
					fullName: users.fullName,
					role: users.role,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, ctx.organizationId),
						eq(users.id, apt.doctorUserId),
					),
				)
				.limit(1);
			if (doc) {
				doctorInfo = doc;
			}
		}

		// 3. Fetch chair info
		let chairInfo: { name: string; equipment: string | null } | null = null;
		if (apt.chairId) {
			const [ch] = await targetDb
				.select({
					name: chairs.name,
					equipment: chairs.equipment,
				})
				.from(chairs)
				.where(
					and(
						eq(chairs.organizationId, ctx.organizationId),
						eq(chairs.id, apt.chairId),
					),
				)
				.limit(1);
			if (ch) {
				chairInfo = ch;
			}
		}

		const durationMinutes = Math.max(
			15,
			Math.round((apt.endsAt.getTime() - apt.startsAt.getTime()) / 60000),
		);

		// 4. Find busy patients who already have overlapping appointments in this slot
		const overlapping = await targetDb
			.select({
				patientId: appointments.patientId,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					inArray(appointments.status, ["planned", "confirmed", "in_treatment"]),
					sql`${appointments.startsAt} < ${apt.endsAt} AND ${appointments.endsAt} > ${apt.startsAt}`,
				),
			);

		const busyPatientIds = new Set<string>();
		for (const row of overlapping) {
			if (row.patientId) {
				busyPatientIds.add(row.patientId);
			}
		}
		// Also exclude the patient who cancelled this appointment
		if (apt.patientId) {
			busyPatientIds.add(apt.patientId);
		}

		// Map to collect candidates scored by priority
		const candidateMap = new Map<string, CancellationGapCandidate>();

		// 5. Candidate Source A: communicationTasks (queued, needs_call, scheduled)
		const commTasks = await targetDb
			.select({
				taskId: communicationTasks.id,
				patientId: communicationTasks.patientId,
				intent: communicationTasks.intent,
				status: communicationTasks.status,
				priority: communicationTasks.priority,
				dueAt: communicationTasks.dueAt,
				title: communicationTasks.title,
				body: communicationTasks.body,
				patientName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(communicationTasks)
			.innerJoin(patients, eq(communicationTasks.patientId, patients.id))
			.where(
				and(
					eq(communicationTasks.organizationId, ctx.organizationId),
					inArray(communicationTasks.status, ["queued", "needs_call", "scheduled"]),
				),
			)
			.limit(60);

		for (const task of commTasks) {
			if (busyPatientIds.has(task.patientId)) continue;

			let source: "waiting_list" | "recall" = "recall";
			let matchScore = 50;
			const titleLower = (task.title || "").toLowerCase();
			const bodyLower = (task.body || "").toLowerCase();
			const isWaitingList =
				titleLower.includes("ожидан") ||
				titleLower.includes("окн") ||
				titleLower.includes("остра") ||
				bodyLower.includes("ожидан") ||
				bodyLower.includes("окн");

			if (isWaitingList || task.intent === "appointment_confirmation") {
				source = "waiting_list";
				matchScore += 35;
			} else if (task.intent === "recall") {
				source = "recall";
				matchScore += 25;
			}

			if (task.priority === "urgent") matchScore += 30;
			else if (task.priority === "high") matchScore += 20;

			// Boost if overdue
			if (task.dueAt.getTime() <= Date.now()) {
				matchScore += 15;
			}

			const priorityMapped: "urgent" | "high" | "normal" | "low" =
				task.priority === "urgent"
					? "urgent"
					: task.priority === "high"
						? "high"
						: task.priority === "low"
							? "low"
							: "normal";

			const callReason = isWaitingList
				? `Лист ожидания: ${task.title}`
				: `Recall-вызов: ${task.title}`;

			const proposedReason = isWaitingList
				? `Запись из листа ожидания: ${task.title}`
				: `Профилактический прием по Recall: ${task.title}`;

			const candidate: CancellationGapCandidate = {
				patientId: task.patientId,
				patientName: task.patientName,
				phone: task.patientPhone,
				source,
				matchScore,
				callReason,
				priority: priorityMapped,
				oneClickBookingSlot: {
					patientId: task.patientId,
					doctorUserId: apt.doctorUserId,
					chairId: apt.chairId,
					startsAt: apt.startsAt.toISOString(),
					endsAt: apt.endsAt.toISOString(),
					proposedReason,
				},
			};

			const existing = candidateMap.get(task.patientId);
			if (!existing || candidate.matchScore > existing.matchScore) {
				candidateMap.set(task.patientId, candidate);
			}
		}

		// 6. Candidate Source B: patientTaskTickets (pending, in_progress)
		const tickets = await targetDb
			.select({
				ticketId: patientTaskTickets.id,
				patientId: patientTaskTickets.patientId,
				title: patientTaskTickets.title,
				description: patientTaskTickets.description,
				status: patientTaskTickets.status,
				priority: patientTaskTickets.priority,
				patientName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(patientTaskTickets)
			.innerJoin(patients, eq(patientTaskTickets.patientId, patients.id))
			.where(
				and(
					eq(patientTaskTickets.organizationId, ctx.organizationId),
					inArray(patientTaskTickets.status, ["pending", "in_progress"]),
				),
			)
			.limit(40);

		for (const ticket of tickets) {
			if (busyPatientIds.has(ticket.patientId)) continue;

			let matchScore = 45;
			const titleLower = (ticket.title || "").toLowerCase();
			const descLower = (ticket.description || "").toLowerCase();
			const isWaiting =
				titleLower.includes("ожидан") ||
				titleLower.includes("запис") ||
				titleLower.includes("прием") ||
				descLower.includes("ожидан");

			if (isWaiting) matchScore += 30;
			if (ticket.priority === "urgent") matchScore += 30;
			else if (ticket.priority === "high") matchScore += 20;

			const priorityMapped: "urgent" | "high" | "normal" | "low" =
				ticket.priority === "urgent"
					? "urgent"
					: ticket.priority === "high"
						? "high"
						: ticket.priority === "low"
							? "low"
							: "normal";

			const candidate: CancellationGapCandidate = {
				patientId: ticket.patientId,
				patientName: ticket.patientName,
				phone: ticket.patientPhone,
				source: isWaiting ? "waiting_list" : "staff_ticket",
				matchScore,
				callReason: `Поручение администратору: ${ticket.title}`,
				priority: priorityMapped,
				oneClickBookingSlot: {
					patientId: ticket.patientId,
					doctorUserId: apt.doctorUserId,
					chairId: apt.chairId,
					startsAt: apt.startsAt.toISOString(),
					endsAt: apt.endsAt.toISOString(),
					proposedReason: `Запись по поручению: ${ticket.title}`,
				},
			};

			const existing = candidateMap.get(ticket.patientId);
			if (!existing || candidate.matchScore > existing.matchScore) {
				candidateMap.set(ticket.patientId, candidate);
			}
		}

		// 7. Candidate Source C: treatmentPlans (Draft, Active, Approved)
		const plans = await targetDb
			.select({
				planId: treatmentPlans.id,
				patientId: treatmentPlans.patientId,
				doctorId: treatmentPlans.doctorId,
				name: treatmentPlans.name,
				title: treatmentPlans.title,
				status: treatmentPlans.status,
				totalPrice: treatmentPlans.totalPrice,
				totalPriceRub: treatmentPlans.totalPriceRub,
				patientName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(treatmentPlans)
			.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
			.where(
				and(
					eq(treatmentPlans.organizationId, ctx.organizationId),
					inArray(treatmentPlans.status, ["Draft", "Active", "Approved"]),
				),
			)
			.orderBy(desc(treatmentPlans.updatedAt))
			.limit(50);

		for (const plan of plans) {
			if (busyPatientIds.has(plan.patientId)) continue;

			let matchScore = 40;
			const planTitle = plan.name || plan.title || "Комплексный план лечения";

			// Doctor match bonus
			if (apt.doctorUserId && plan.doctorId === apt.doctorUserId) {
				matchScore += 40;
			}

			if (plan.status === "Approved" || plan.status === "Active") {
				matchScore += 25;
			}

			const amountStr = plan.totalPriceRub ?? plan.totalPrice;
			const amount = Number(amountStr) || 0;
			if (amount > 0) {
				matchScore += 10;
			}

			const candidate: CancellationGapCandidate = {
				patientId: plan.patientId,
				patientName: plan.patientName,
				phone: plan.patientPhone,
				source: "treatment_plan",
				matchScore,
				callReason: `Незавершенный план лечения: ${planTitle}${amount > 0 ? ` (${amount} ₽)` : ""}`,
				priority: matchScore >= 80 ? "high" : "normal",
				oneClickBookingSlot: {
					patientId: plan.patientId,
					doctorUserId: apt.doctorUserId,
					chairId: apt.chairId,
					startsAt: apt.startsAt.toISOString(),
					endsAt: apt.endsAt.toISOString(),
					proposedReason: `Продолжение лечения по плану: ${planTitle}`,
				},
			};

			const existing = candidateMap.get(plan.patientId);
			if (!existing || candidate.matchScore > existing.matchScore) {
				candidateMap.set(plan.patientId, candidate);
			}
		}

		// 8. Sort candidates descending by match score
		const rankedCandidates = Array.from(candidateMap.values()).sort(
			(a, b) => b.matchScore - a.matchScore,
		);

		const selectedCandidates = rankedCandidates.slice(0, args.maxCandidates);

		const doctorLabel = doctorInfo?.fullName || "Врач клиники";
		const chairLabel = chairInfo?.name || "Основное кресло";
		const startFormatted = apt.startsAt.toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		});
		const endFormatted = apt.endsAt.toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		});

		const firstCandidate = selectedCandidates[0];
		const recommendedAction = firstCandidate
			? `Окно отмены (${startFormatted}–${endFormatted}, ${durationMinutes} мин, ${doctorLabel}, ${chairLabel}): найдено ${selectedCandidates.length} приоритетных кандидатов. Рекомендуется связаться с «${firstCandidate?.patientName ?? "Пациент"}» (${firstCandidate?.callReason ?? "Плановый прием"}) для подтверждения записи в 1 клик.`
			: `Окно отмены (${startFormatted}–${endFormatted}, ${durationMinutes} мин, ${doctorLabel}): в листе ожидания и незавершенных планах нет подходящих кандидатов. Слот открыт для свободной записи.`;

		return {
			gapSummary: {
				appointmentId: apt.id,
				startsAt: apt.startsAt.toISOString(),
				endsAt: apt.endsAt.toISOString(),
				durationMinutes,
				doctorUserId: apt.doctorUserId,
				doctorName: doctorLabel,
				chairId: apt.chairId,
				chairName: chairLabel,
				originalReason: apt.reason || "Отмена визита",
				status: apt.status,
			},
			candidatesCount: selectedCandidates.length,
			candidates: selectedCandidates,
			recommendedAction,
		};
	},
};
