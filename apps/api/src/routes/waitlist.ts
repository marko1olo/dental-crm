import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { defineStreamRoute } from "../core/routeFactories.js";
import { onTenantTxCommit, withSavepoint, withTenantReadCtx, withTenantWriteCtx } from "../db/rls.js";
import { appointmentWaitlists, patients, users } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";
import { createCrmLeadFromPublicIntake } from "./publicBooking/bookingModules/publicBookingMutations.js";

const waitlistParamsSchema = z
	.object({
		id: z.string().uuid("Некорректный UUID записи листа ожидания"),
	})
	.strict();

const waitlistTimeRangeSchema = z
	.object({
		day: z.string(),
		slot: z.string(),
		notes: z.string().optional(),
		urgency: z.string().optional(),
		treatmentCategory: z.string().optional(),
	})
	.strict();

const waitlistSchema = z
	.object({
		patientId: z.string().uuid().or(z.literal("")).nullable().optional(),
		patientName: z.string().optional(),
		patientPhone: z.string().optional(),
		preferredDoctorId: z.string().uuid().nullable().optional(),
		priorityLevel: z.enum(["high", "medium", "low"]).default("medium"),
		notes: z.string().optional(),
		urgency: z.string().optional(),
		treatmentCategory: z.string().optional(),
		preferredTimeRanges: z.array(waitlistTimeRangeSchema).optional(),
	})
	.strict();

function extractWaitlistMetadata(preferredTimeRanges: unknown): {
	notes: string;
	urgency?: string;
	treatmentCategory?: string;
} {
	if (!Array.isArray(preferredTimeRanges) || preferredTimeRanges.length === 0) {
		return { notes: "" };
	}
	const notesList: string[] = [];
	let urgency: string | undefined;
	let treatmentCategory: string | undefined;

	for (const range of preferredTimeRanges) {
		if (!range || typeof range !== "object") continue;
		const r = range as Record<string, unknown>;
		if (typeof r.notes === "string" && r.notes.trim().length > 0) {
			const trimmed = r.notes.trim();
			if (!notesList.includes(trimmed)) {
				notesList.push(trimmed);
			}
		}
		if (!urgency && typeof r.urgency === "string" && r.urgency.trim().length > 0) {
			urgency = r.urgency.trim();
		}
		if (!treatmentCategory && typeof r.treatmentCategory === "string" && r.treatmentCategory.trim().length > 0) {
			treatmentCategory = r.treatmentCategory.trim();
		}
	}

	return {
		notes: notesList.join("; "),
		...(urgency ? { urgency } : {}),
		...(treatmentCategory ? { treatmentCategory } : {}),
	};
}

export async function registerWaitlistRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * GET /api/waitlist
	 * Returns active waitlist entries with patient details.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/waitlist",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const context = await requireClinicalReadContext(
					request,
					reply,
					"waitlist read",
				);
				if (!context) return;
				const orgId = context.organizationId;

				const items = await withTenantReadCtx(orgId, async (tx) =>
					tx
						.select({
							id: appointmentWaitlists.id,
							patientId: appointmentWaitlists.patientId,
							patientName: patients.fullName,
							patientPhone: patients.phone,
							storedPatientName: appointmentWaitlists.patientName,
							storedPatientPhone: appointmentWaitlists.patientPhone,
							preferredDoctorId: appointmentWaitlists.preferredDoctorId,
							preferredDoctorName: users.fullName,
							priorityLevel: appointmentWaitlists.priorityLevel,
							preferredTimeRanges: appointmentWaitlists.preferredTimeRanges,
							status: appointmentWaitlists.status,
							createdAt: appointmentWaitlists.createdAt,
						})
						.from(appointmentWaitlists)
						.leftJoin(
							patients,
							and(
								eq(patients.id, appointmentWaitlists.patientId),
								eq(patients.organizationId, orgId),
							),
						)
						.leftJoin(
							users,
							and(
								eq(users.id, appointmentWaitlists.preferredDoctorId),
								eq(users.organizationId, orgId),
							),
						)
						.where(
							and(
								eq(appointmentWaitlists.organizationId, orgId),
								inArray(appointmentWaitlists.status, ["active", "waiting"]),
							),
						)
						.orderBy(desc(appointmentWaitlists.createdAt)),
				);

				return items.map((item) => {
					const meta = extractWaitlistMetadata(item.preferredTimeRanges);
					return {
						id: item.id,
						patientId: item.patientId,
						patientName: item.patientName ?? item.storedPatientName ?? null,
						patientPhone: item.patientPhone ?? item.storedPatientPhone ?? null,
						preferredDoctorId: item.preferredDoctorId,
						preferredDoctorName: item.preferredDoctorName,
						priorityLevel: item.priorityLevel,
						preferredTimeRanges: item.preferredTimeRanges,
						notes: meta.notes,
						...(meta.urgency ? { urgency: meta.urgency } : {}),
						...(meta.treatmentCategory
							? { treatmentCategory: meta.treatmentCategory }
							: {}),
						status: item.status,
						createdAt: item.createdAt,
					};
				});
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				request.log.error({ error: msg }, "Ошибка при получении записей листа ожидания");
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при получении записей листа ожидания.",
				});
			}
		},
	});

	/**
	 * POST /api/waitlist
	 * Adds a patient to the waitlist.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/waitlist",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const context = await requireClinicalMutationContext(
					request,
					reply,
					"waitlist write",
				);
				if (!context) return;
				const orgId = context.organizationId;

				const parsed = waitlistSchema.safeParse(request.body);
				if (!parsed.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Проверьте корректность введенных данных листа ожидания.",
					});
				}

				const data = parsed.data;
				const cleanPhone = data.patientPhone?.trim();
				const cleanName = data.patientName?.trim();

				const txResult = await withTenantWriteCtx(orgId, async (tx) => {
				let patient: typeof patients.$inferSelect | undefined;

				// 1. Поиск по валидному patientId
				if (data.patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.patientId)) {
					const [found] = await tx
						.select()
						.from(patients)
						.where(
							and(
								eq(patients.id, data.patientId),
								eq(patients.organizationId, orgId),
							),
						)
						.limit(1);
					patient = found;
				}

				// 2. Если patientId пустой или не найден — пробуем найти по телефону в организации
				if (!patient && cleanPhone && cleanPhone.length > 0) {
					const [foundByPhone] = await tx
						.select()
						.from(patients)
						.where(
							and(
								eq(patients.phone, cleanPhone),
								eq(patients.organizationId, orgId),
							),
						)
						.limit(1);
					patient = foundByPhone;
				}

				// 3. Если всё ещё не найден, но указано имя — создаем легкого пациента-кандидата (Lightweight Patient)
				if (!patient && cleanName && cleanName.length > 0) {
					const [newPatient] = await tx
						.insert(patients)
						.values({
							organizationId: orgId,
							fullName: cleanName,
							phone: cleanPhone || null,
						})
						.returning();
					patient = newPatient;
				}

				if (!patient) {
					return { kind: "patient_required" as const };
				}

				// If a preferred doctor is named, it must be a doctor of this organization.
				if (data.preferredDoctorId) {
					const [doctor] = await tx
						.select({ id: users.id })
						.from(users)
						.where(
							and(
								eq(users.id, data.preferredDoctorId),
								eq(users.organizationId, orgId),
							),
						)
						.limit(1);
					if (!doctor) {
						return { kind: "doctor_not_found" as const };
					}
				}

				const normalizedTimeRanges =
					data.preferredTimeRanges && data.preferredTimeRanges.length > 0
						? data.preferredTimeRanges.map((tr, index) =>
								index === 0
									? {
											...tr,
											...(data.notes !== undefined && !tr.notes
												? { notes: data.notes }
												: {}),
											...(data.urgency !== undefined && !tr.urgency
												? { urgency: data.urgency }
												: {}),
											...(data.treatmentCategory !== undefined &&
											!tr.treatmentCategory
												? { treatmentCategory: data.treatmentCategory }
												: {}),
										}
									: tr,
							)
						: data.notes || data.urgency || data.treatmentCategory
							? [
									{
										day: "Любой",
										slot: "any",
										...(data.notes ? { notes: data.notes } : {}),
										...(data.urgency ? { urgency: data.urgency } : {}),
										...(data.treatmentCategory
											? { treatmentCategory: data.treatmentCategory }
											: {}),
									},
								]
							: [];

				const [newItem] = await tx
					.insert(appointmentWaitlists)
					.values({
						organizationId: orgId,
						patientId: patient.id,
						patientName: patient.fullName,
						patientPhone: patient.phone,
						preferredDoctorId: data.preferredDoctorId ?? null,
						priorityLevel: data.priorityLevel,
						preferredTimeRanges: normalizedTimeRanges,
						status: "active",
					})
					.returning();

				if (!newItem) {
					return { kind: "not_saved" as const };
				}

				const meta = extractWaitlistMetadata(newItem.preferredTimeRanges);
				const responseItem = {
					...newItem,
					patientName: patient.fullName,
					patientPhone: patient.phone,
					notes: meta.notes,
					...(meta.urgency ? { urgency: meta.urgency } : {}),
					...(meta.treatmentCategory
						? { treatmentCategory: meta.treatmentCategory }
						: {}),
				};

				// Create CRM Lead for the waitlist addition (DEF-PB-03) in SAVEPOINT
				try {
					const patientFullName = patient.fullName;
					const patientPhone = patient.phone || "";
					await withSavepoint(tx, (spTx) =>
						createCrmLeadFromPublicIntake(spTx, {
							organizationId: orgId,
							patientName: patientFullName,
							patientPhone,
							source: "waitlist",
							receiptStatus: "WAITLIST",
							comment: `Лист ожидания: ${meta.notes || ""}`.trim(),
							doctorId: data.preferredDoctorId || undefined,
						}),
					);
				} catch (leadErr: unknown) {
					request.log.warn(
						{ err: leadErr, orgId, waitlistId: newItem.id },
						"[waitlist] Не удалось создать CRM-лид для записи листа ожидания",
					);
				}

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(orgId, {
						type: "WAITLIST_UPDATED",
						payload: responseItem,
					});
				});

				return { kind: "ok" as const, responseItem };
			});

			if (txResult.kind === "patient_required") {
				return reply.code(400).send({
					error: "PatientRequired",
					message: "Необходимо выбрать пациента или указать ФИО для добавления в лист ожидания.",
				});
			}
			if (txResult.kind === "doctor_not_found") {
				return reply.code(404).send({
					error: "DoctorNotFound",
					message: "Выбранный врач не найден в вашей клинике.",
				});
			}
			if (txResult.kind === "not_saved") {
				return reply.code(500).send({
					error: "WaitlistNotSaved",
					message:
						"Пациент не добавлен в лист ожидания: сервер не сохранил запись. Проверьте данные и повторите; если снова не выйдет — сообщите администратору клиники.",
				});
			}

			return txResult.responseItem;
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			request.log.error({ error: msg }, "Ошибка при добавлении пациента в лист ожидания");
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при добавлении пациента в лист ожидания.",
			});
		}
		},
	});

	/**
	 * PUT /api/waitlist/:id
	 * Updates a waitlist entry (e.g. priority, doctor, or status to fulfilled).
	 */
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/waitlist/:id",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const context = await requireClinicalMutationContext(
					request,
					reply,
					"waitlist write",
				);
				if (!context) return;
				const orgId = context.organizationId;

				const parsedParams = waitlistParamsSchema.safeParse(request.params);
				if (!parsedParams.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный ID записи листа ожидания.",
					});
				}
				const { id } = parsedParams.data;

				const updateSchema = z
					.object({
						preferredDoctorId: z.string().uuid().nullable().optional(),
						priorityLevel: z.enum(["high", "medium", "low"]).optional(),
						preferredTimeRanges: z
							.array(
								z
									.object({
										day: z.string(),
										slot: z.string(),
									})
									.strict(),
							)
							.optional(),
						status: z.enum(["active", "waiting", "fulfilled", "booked", "cancelled"]).optional(),
					})
					.strict();

				const parsed = updateSchema.safeParse(request.body);
				if (!parsed.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Проверьте параметры обновления листа ожидания.",
					});
				}

				const updateData = parsed.data;

				const txResult = await withTenantWriteCtx(orgId, async (tx) => {
					if (updateData.preferredDoctorId) {
						const [doctor] = await tx
							.select({ id: users.id })
							.from(users)
							.where(
								and(
									eq(users.id, updateData.preferredDoctorId),
									eq(users.organizationId, orgId),
								),
							)
							.limit(1);
						if (!doctor) {
							return { kind: "doctor_not_found" as const };
						}
					}

					const [updated] = await tx
						.update(appointmentWaitlists)
						.set({
							...updateData,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(appointmentWaitlists.id, id),
								eq(appointmentWaitlists.organizationId, orgId),
							),
						)
						.returning();

					if (!updated) {
						return { kind: "not_found" as const };
					}

					onTenantTxCommit(() => {
						wsBroker.broadcastToOrganization(orgId, {
							type: "WAITLIST_UPDATED",
							payload: updated,
						});
					});

					return { kind: "ok" as const, updated };
				});

				if (txResult.kind === "doctor_not_found") {
					return reply.code(404).send({
						error: "DoctorNotFound",
						message: "Выбранный врач не найден в вашей клинике.",
					});
				}
				if (txResult.kind === "not_found") {
					return reply.code(404).send({
						error: "WaitlistItemNotFound",
						message: "Запись листа ожидания не найдена.",
					});
				}

				return txResult.updated;
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				request.log.error({ error: msg }, "Ошибка при обновлении записи листа ожидания");
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при обновлении записи листа ожидания.",
				});
			}
		},
	});

	/**
	 * PATCH /api/waitlist/:id/status
	 * Updates the status of a waitlist entry (e.g. fulfilled).
	 */
	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/waitlist/:id/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const context = await requireClinicalMutationContext(
					request,
					reply,
					"waitlist write",
				);
				if (!context) return;
				const orgId = context.organizationId;

				const parsedParams = waitlistParamsSchema.safeParse(request.params);
				if (!parsedParams.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный ID записи листа ожидания.",
					});
				}
				const { id } = parsedParams.data;
				const statusSchema = z
					.object({
						status: z.enum(["active", "waiting", "fulfilled", "booked", "cancelled"]),
					})
					.strict();

				const parsed = statusSchema.safeParse(request.body);
				if (!parsed.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный статус записи листа ожидания.",
					});
				}

				const updated = await withTenantWriteCtx(orgId, async (tx) => {
					const [row] = await tx
						.update(appointmentWaitlists)
						.set({
							status: parsed.data.status,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(appointmentWaitlists.id, id),
								eq(appointmentWaitlists.organizationId, orgId),
							),
						)
						.returning();

					if (row) {
						onTenantTxCommit(() => {
							wsBroker.broadcastToOrganization(orgId, {
								type: "WAITLIST_UPDATED",
								payload: row,
							});
						});
					}
					return row ?? null;
				});

				if (!updated) {
					return reply.code(404).send({
						error: "WaitlistItemNotFound",
						message: "Запись листа ожидания не найдена.",
					});
				}

				return updated;
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				request.log.error({ error: msg }, "Ошибка при обновлении статуса листа ожидания");
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при обновлении статуса листа ожидания.",
				});
			}
		},
	});

	/**
	 * DELETE /api/waitlist/:id
	 * Removes an entry from the waitlist.
	 */
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/waitlist/:id",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const context = await requireClinicalMutationContext(
					request,
					reply,
					"waitlist delete",
				);
				if (!context) return;
				const orgId = context.organizationId;

				const parsedParams = waitlistParamsSchema.safeParse(request.params);
				if (!parsedParams.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный ID записи листа ожидания.",
					});
				}
				const { id } = parsedParams.data;

				const deleted = await withTenantWriteCtx(orgId, async (tx) => {
					const [row] = await tx
						.delete(appointmentWaitlists)
						.where(
							and(
								eq(appointmentWaitlists.id, id),
								eq(appointmentWaitlists.organizationId, orgId),
							),
						)
						.returning();

					if (row) {
						onTenantTxCommit(() => {
							wsBroker.broadcastToOrganization(orgId, {
								type: "WAITLIST_DELETED",
								payload: { id },
							});
						});
					}
					return row ?? null;
				});

				if (!deleted) {
					return reply.code(404).send({
						error: "WaitlistItemNotFound",
						message: "Запись листа ожидания не найдена.",
					});
				}

				return { success: true };
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				request.log.error({ error: msg }, "Ошибка при удалении записи листа ожидания");
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при удалении записи листа ожидания.",
				});
			}
		},
	});
}
