import fs from "node:fs";
import path from "node:path";
import { dashboardSchema } from "@dental/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../accessGuard.js";
import { createAppointmentInDb } from "../db/appointmentsQuery.js";
import { db } from "../db/client.js";
import { getDashboardFromDb } from "../db/dashboardQuery.js";
import {
	appointments,
	chairs,
	patients,
	scheduleClipboardItems,
	urgentScheduleRequests,
	users,
} from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";
import {
	appointmentNotFoundMessage,
	appointmentRejectionResponse,
	findSuggestedAvailableSlots,
	sendAppointmentRejection,
} from "./appointmentErrors.js";
import {
	createAppointmentHandler,
	registerAppointmentsRoutes,
	updateAppointmentHandler,
} from "./appointments.js";
import {
	requireClinicOrganizationId,
	requireScheduleMutationAccess,
	requireScheduleMutationContext,
} from "./scheduleAuthGuard.js";

export { findSuggestedAvailableSlots } from "./appointmentErrors.js";
export { registerAppointmentsRoutes } from "./appointments.js";

const clipboardItemMissingMessage =
	"Запись в буфере не найдена. Обновите список буфера и выберите актуальную строку.";
const clipboardAppointmentMissingMessage =
	"Исходная запись расписания не найдена. Скопируйте приём заново из актуальной карточки.";
const clipboardPasteValidationMessage =
	"Вставка не выполнена: укажите дату и время начала приёма.";
const clipboardCopyValidationMessage =
	"В буфер не скопировано: выберите запись расписания.";
const clipboardPasteResourcesMissingMessage =
	"Вставка не выполнена: у исходной записи нет пациента, врача или кресла. Откройте карточку и заполните их, затем скопируйте снова.";

export async function registerScheduleRoutes(app: FastifyInstance) {
	app.post("/api/appointments", createAppointmentHandler);
	app.patch("/api/appointments/:appointmentId", updateAppointmentHandler);
	app.patch(
		"/api/appointments/:appointmentId/status",
		updateAppointmentHandler,
	);
	app.put(
		"/api/schedule/appointments/:appointmentId",
		updateAppointmentHandler,
	);
	app.put(
		"/api/schedule/appointments/:appointmentId/status",
		updateAppointmentHandler,
	);

	/**
	 * Буфер обмена расписания — быстрый перенос приёма на другое время.
	 */
	app.get("/api/schedule/clipboard-items", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const items = await db
			.select({
				id: scheduleClipboardItems.id,
				appointmentId: scheduleClipboardItems.appointmentId,
				patientName: scheduleClipboardItems.patientName,
				doctorName: scheduleClipboardItems.doctorName,
				serviceTitle: scheduleClipboardItems.serviceTitle,
				durationMinutes: scheduleClipboardItems.durationMinutes,
				clipboardStatus: scheduleClipboardItems.clipboardStatus,
				copiedAt: scheduleClipboardItems.copiedAt,
			})
			.from(scheduleClipboardItems)
			.where(
				and(
					eq(scheduleClipboardItems.organizationId, orgId),
					eq(scheduleClipboardItems.clipboardStatus, "copied"),
				),
			)
			.orderBy(desc(scheduleClipboardItems.copiedAt))
			.limit(20);

		return items.map((item) => ({
			...item,
			copiedAt:
				item.copiedAt instanceof Date
					? item.copiedAt.toISOString()
					: String(item.copiedAt),
		}));
	});

	app.post("/api/schedule/clipboard-items", async (request, reply) => {
		const context = await requireScheduleMutationContext(
			request,
			reply,
			"schedule clipboard copy",
		);
		if (!context) return reply;
		const orgId = context.organizationId;

		const body = (request.body ?? {}) as { appointmentId?: unknown };
		const appointmentId =
			typeof body.appointmentId === "string" ? body.appointmentId.trim() : "";
		if (!appointmentId) {
			return reply.code(400).send({
				code: "ClipboardValidationError",
				message: clipboardCopyValidationMessage,
			});
		}

		const [source] = await db
			.select({
				id: appointments.id,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				reason: appointments.reason,
				patientName: patients.fullName,
				doctorName: users.fullName,
			})
			.from(appointments)
			.leftJoin(patients, eq(patients.id, appointments.patientId))
			.leftJoin(users, eq(users.id, appointments.doctorUserId))
			.where(
				and(
					eq(appointments.id, appointmentId),
					eq(appointments.organizationId, orgId),
				),
			)
			.limit(1);

		if (!source) {
			return reply.code(404).send({
				code: "AppointmentNotFound",
				message: appointmentNotFoundMessage,
			});
		}

		const startsMs =
			source.startsAt instanceof Date
				? source.startsAt.getTime()
				: Date.parse(String(source.startsAt));
		const endsMs =
			source.endsAt instanceof Date
				? source.endsAt.getTime()
				: Date.parse(String(source.endsAt));
		const durationMinutes =
			Number.isFinite(startsMs) && Number.isFinite(endsMs) && endsMs > startsMs
				? Math.max(5, Math.round((endsMs - startsMs) / 60_000))
				: 30;

		const serviceTitle =
			typeof source.reason === "string" && source.reason.trim()
				? source.reason.trim()
				: "Приём";

		const [created] = await db
			.insert(scheduleClipboardItems)
			.values({
				organizationId: orgId,
				appointmentId: source.id,
				patientName: source.patientName?.trim() || "Пациент не указан",
				doctorName: source.doctorName?.trim() || "Врач не назначен",
				serviceTitle,
				durationMinutes,
				clipboardStatus: "copied",
			})
			.returning({
				id: scheduleClipboardItems.id,
				appointmentId: scheduleClipboardItems.appointmentId,
				patientName: scheduleClipboardItems.patientName,
				doctorName: scheduleClipboardItems.doctorName,
				serviceTitle: scheduleClipboardItems.serviceTitle,
				durationMinutes: scheduleClipboardItems.durationMinutes,
				clipboardStatus: scheduleClipboardItems.clipboardStatus,
				copiedAt: scheduleClipboardItems.copiedAt,
			});

		if (!created) {
			return reply
				.code(500)
				.send({
					error: "InternalServerError",
					message: "Не удалось сохранить элемент в буфер обмена расписания.",
				});
		}

		return reply.code(201).send({
			...created,
			copiedAt:
				created.copiedAt instanceof Date
					? created.copiedAt.toISOString()
					: String(created.copiedAt),
		});
	});

	app.delete("/api/schedule/clipboard-items/:id", async (request, reply) => {
		const context = await requireScheduleMutationContext(
			request,
			reply,
			"schedule clipboard clear",
		);
		if (!context) return reply;
		const orgId = context.organizationId;

		const params = request.params as { id?: string };
		const itemId = typeof params.id === "string" ? params.id.trim() : "";
		if (!itemId) {
			return reply.code(400).send({
				code: "ClipboardRouteValidationError",
				message: clipboardItemMissingMessage,
			});
		}

		const [updated] = await db
			.update(scheduleClipboardItems)
			.set({ clipboardStatus: "cleared" })
			.where(
				and(
					eq(scheduleClipboardItems.id, itemId),
					eq(scheduleClipboardItems.organizationId, orgId),
					eq(scheduleClipboardItems.clipboardStatus, "copied"),
				),
			)
			.returning({ id: scheduleClipboardItems.id });

		if (!updated) {
			return reply.code(404).send({
				code: "ClipboardItemNotFound",
				message: clipboardItemMissingMessage,
			});
		}

		return reply.code(200).send({ id: updated.id, clipboardStatus: "cleared" });
	});

	app.post(
		"/api/schedule/clipboard-items/:id/paste",
		async (request, reply) => {
			const context = await requireScheduleMutationContext(
				request,
				reply,
				"schedule clipboard paste",
			);
			if (!context) return reply;
			const orgId = context.organizationId;

			const params = request.params as { id?: string };
			const itemId = typeof params.id === "string" ? params.id.trim() : "";
			if (!itemId) {
				return reply.code(400).send({
					code: "ClipboardRouteValidationError",
					message: clipboardItemMissingMessage,
				});
			}

			const body = (request.body ?? {}) as {
				startsAt?: unknown;
				doctorUserId?: unknown;
				chairId?: unknown;
			};
			const startsAtRaw =
				typeof body.startsAt === "string" ? body.startsAt.trim() : "";
			const startsMs = Date.parse(startsAtRaw);
			if (!startsAtRaw || !Number.isFinite(startsMs)) {
				return reply.code(400).send({
					code: "ClipboardValidationError",
					message: clipboardPasteValidationMessage,
				});
			}

			const [clipItem] = await db
				.select({
					id: scheduleClipboardItems.id,
					appointmentId: scheduleClipboardItems.appointmentId,
					durationMinutes: scheduleClipboardItems.durationMinutes,
					clipboardStatus: scheduleClipboardItems.clipboardStatus,
				})
				.from(scheduleClipboardItems)
				.where(
					and(
						eq(scheduleClipboardItems.id, itemId),
						eq(scheduleClipboardItems.organizationId, orgId),
						eq(scheduleClipboardItems.clipboardStatus, "copied"),
					),
				)
				.limit(1);

			if (!clipItem) {
				return reply.code(404).send({
					code: "ClipboardItemNotFound",
					message: clipboardItemMissingMessage,
				});
			}

			const [original] = await db
				.select({
					id: appointments.id,
					patientId: appointments.patientId,
					doctorUserId: appointments.doctorUserId,
					assistantUserId: appointments.assistantUserId,
					chairId: appointments.chairId,
					reason: appointments.reason,
					comment: appointments.comment,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.id, clipItem.appointmentId),
						eq(appointments.organizationId, orgId),
					),
				)
				.limit(1);

			if (!original) {
				return reply.code(404).send({
					code: "AppointmentNotFound",
					message: clipboardAppointmentMissingMessage,
				});
			}

			const doctorUserId =
				typeof body.doctorUserId === "string" && body.doctorUserId.trim()
					? body.doctorUserId.trim()
					: original.doctorUserId;
			let chairId =
				typeof body.chairId === "string" && body.chairId.trim()
					? body.chairId.trim()
					: original.chairId;

			if ((!chairId || chairId === "default-chair") && orgId) {
				const [firstActiveChair] = await db
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.organizationId, orgId),
							eq(chairs.isActive, true),
						),
					)
					.limit(1);
				if (firstActiveChair) {
					chairId = firstActiveChair.id;
				}
			}

			if (!original.patientId || !doctorUserId || !chairId) {
				return reply.code(409).send({
					code: "ClipboardPasteRejected",
					message: clipboardPasteResourcesMissingMessage,
				});
			}

			const durationMinutes =
				typeof clipItem.durationMinutes === "number" &&
				clipItem.durationMinutes > 0
					? clipItem.durationMinutes
					: 30;
			const endsAt = new Date(
				startsMs + durationMinutes * 60_000,
			).toISOString();
			const startsAt = new Date(startsMs).toISOString();

			try {
				const created = await db.transaction(async (tx) => {
					const newAppt = await createAppointmentInDb(
						orgId,
						{
							// biome-ignore lint/style/noNonNullAssertion: automated suppression
							patientId: original.patientId!,
							doctorUserId,
							assistantUserId: original.assistantUserId ?? null,
							chairId,
							status: "planned",
							startsAt,
							endsAt,
							reason: original.reason ?? undefined,
							comment: original.comment ?? undefined,
						},
						tx,
					);

					await tx
						.update(scheduleClipboardItems)
						.set({ clipboardStatus: "pasted" })
						.where(
							and(
								eq(scheduleClipboardItems.id, clipItem.id),
								eq(scheduleClipboardItems.organizationId, orgId),
							),
						);

					return newAppt;
				});

				const dashboard = await getDashboardFromDb(orgId);
				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_CREATED",
					payload: {
						appointmentId: created?.id ?? null,
						startsAt: created?.startsAt ?? null,
					},
				});
				const parsed = dashboardSchema.safeParse(dashboard);
				if (!parsed.success) {
					request.log.warn(
						{ appointmentId: created?.id, orgId, errors: parsed.error.errors },
						"[Schedule/Clipboard] Приём создан, но сводка расписания не прошла валидацию контракта",
					);
					return reply.code(201).send({
						success: true,
						appointmentId: created?.id ?? null,
						startsAt: created?.startsAt ?? null,
						message:
							"Запись создана из буфера обмена. Сводка обновляется — перезагрузите страницу при необходимости.",
					});
				}
				return reply.code(201).send(parsed.data);
			} catch (error) {
				const conflictContext = {
					orgId,
					doctorUserId,
					chairId,
					startsAt,
					endsAt,
				};
				return sendAppointmentRejection(
					reply,
					await appointmentRejectionResponse("create", error, conflictContext),
				);
			}
		},
	);

	app.get("/api/schedule/urgent-schedule-requests", async (request, reply) => {
		const orgId = await requireOrganizationContext(request, reply);
		if (!orgId) return reply;

		const requests = await db
			.select()
			.from(urgentScheduleRequests)
			.where(
				and(
					eq(urgentScheduleRequests.organizationId, orgId),
					eq(urgentScheduleRequests.isResolved, false),
				),
			)
			.orderBy(asc(urgentScheduleRequests.createdAt));

		return reply.code(200).send(requests);
	});

	app.patch(
		"/api/schedule/urgent-schedule-requests/:id/resolve",
		async (request, reply) => {
			if (!(await requireScheduleMutationAccess(request, reply))) return;
			const orgId = await requireOrganizationContext(request, reply);
			if (!orgId) return reply;

			const params = request.params as { id: string };

			await db
				.update(urgentScheduleRequests)
				.set({ isResolved: true })
				.where(
					and(
						eq(urgentScheduleRequests.id, params.id),
						eq(urgentScheduleRequests.organizationId, orgId),
					),
				);

			return reply.code(200).send({ success: true });
		},
	);

	const scheduleShiftsSchema = z.object({
		shifts: z.array(
			z
				.object({
					id: z.string(),
					doctorId: z.string(),
					doctorName: z.string(),
					cabinetId: z.string(),
					chairId: z.string(),
					dateIso: z.string(),
					startTime: z.string(),
					endTime: z.string(),
				})
				.passthrough(),
		),
	});

	const getScheduleShiftsFilePath = (): string => {
		const dataDir = path.resolve(process.cwd(), ".data");
		if (!fs.existsSync(dataDir)) {
			try {
				fs.mkdirSync(dataDir, { recursive: true });
			} catch (err: unknown) {
				app.log.warn({ err }, "[scheduleRoutes] Failed to create .data directory for doctor shifts");
			}
		}
		return path.join(dataDir, "doctor-shifts.json");
	};

	let inMemoryScheduleShiftsCache: Array<Record<string, unknown>> = [];

	app.get("/api/schedule/shifts", async (_req, reply) => {
		try {
			const filePath = getScheduleShiftsFilePath();
			if (fs.existsSync(filePath)) {
				const content = fs.readFileSync(filePath, "utf-8");
				const parsed = JSON.parse(content);
				if (Array.isArray(parsed)) {
					return reply.send({ ok: true, shifts: parsed });
				}
			}
			return reply.send({ ok: true, shifts: inMemoryScheduleShiftsCache });
		} catch {
			return reply.send({ ok: true, shifts: inMemoryScheduleShiftsCache });
		}
	});

	app.post("/api/schedule/shifts", async (req, reply) => {
		if (!(await requireScheduleMutationAccess(req, reply, "schedule shifts update"))) {
			return;
		}
		const parsed = scheduleShiftsSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная структура смен врачей (поле shifts обязательно).",
			});
		}
		const { shifts } = parsed.data;
		inMemoryScheduleShiftsCache = shifts as unknown as Array<Record<string, unknown>>;
		try {
			const filePath = getScheduleShiftsFilePath();
			fs.writeFileSync(filePath, JSON.stringify(shifts, null, 2), "utf-8");
		} catch (err) {
			req.log.warn({ err }, "Could not persist doctor-shifts.json; using cache");
		}
		return reply.send({ ok: true, savedCount: shifts.length });
	});
}
