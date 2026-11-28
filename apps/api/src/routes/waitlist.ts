import {
	normalizePhone,
	waitlistCreateSchema,
	waitlistParamsSchema,
	waitlistStatusSchema,
	waitlistUpdateSchema,
} from "@dental/shared";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { defineTenantMutation, defineTenantQuery } from "../core/routeFactories.js";
import { onTenantTxCommit, withSavepoint } from "../db/rls.js";
import { appointmentWaitlists, organizations, patients, users } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";
import { createCrmLeadFromPublicIntake } from "./publicBooking/bookingModules/publicBookingMutations.js";
import { normalizePhoneDigits } from "./publicBooking/slotAvailabilityEngine.js";

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
	const authOptions = {
		allowClinicTokenWithoutStaff: true,
		allowAdminSecretBypass: true,
	} as const;

	/**
	 * GET /api/waitlist
	 * Returns active waitlist entries with patient details.
	 */
	defineTenantQuery(app, {
		method: "GET",
		path: "/api/waitlist",
		permission: "schedule.read",
		authOptions,
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			try {
				const items = await tx
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
					.orderBy(desc(appointmentWaitlists.createdAt));

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
	defineTenantMutation(app, {
		method: "POST",
		path: "/api/waitlist",
		permission: "schedule.write",
		authOptions,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			try {
				const parsed = waitlistCreateSchema.safeParse(request.body);
				if (!parsed.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Проверьте корректность введенных данных листа ожидания.",
					});
				}

				const data = parsed.data;
				const rawPhone = data.patientPhone?.trim();
				const normalizedPhone = rawPhone ? (normalizePhone(rawPhone) ?? rawPhone) : undefined;
				const phoneDigits = rawPhone ? normalizePhoneDigits(rawPhone) : "";
				const cleanName = data.patientName?.trim();

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

				// 2. Если patientId пустой или не найден — пробуем найти по нормализованному телефону в организации
				if (!patient && rawPhone && rawPhone.length > 0) {
					const last10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";
					const phoneConds = [
						eq(patients.phone, rawPhone),
						...(normalizedPhone && normalizedPhone !== rawPhone ? [eq(patients.phone, normalizedPhone)] : []),
						...(phoneDigits.length >= 5 ? [eq(patients.phone, phoneDigits)] : []),
						...(last10 ? [ilike(patients.phone, `%${last10}%`)] : []),
					];
					const candidatesByPhone = await tx
						.select()
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, orgId),
								or(...phoneConds),
							),
						)
						.limit(10);
					patient =
						candidatesByPhone.find((c) => {
							const cDigits = normalizePhoneDigits(c.phone ?? "");
							return phoneDigits.length >= 10 && cDigits.length >= 10
								? cDigits.slice(-10) === phoneDigits.slice(-10)
								: c.phone === rawPhone || c.phone === normalizedPhone;
						}) ?? candidatesByPhone[0];
				}

				// 3. Если всё ещё не найден, но указано имя — создаем легкого пациента-кандидата (Lightweight Patient)
				if (!patient && cleanName && cleanName.length > 0) {
					const [newPatient] = await tx
						.insert(patients)
						.values({
							organizationId: orgId,
							fullName: cleanName,
							phone: normalizedPhone || null,
						})
						.returning();
					patient = newPatient;
				}

				if (!patient) {
					return reply.code(400).send({
						error: "PatientRequired",
						message: "Необходимо выбрать пациента или указать ФИО для добавления в лист ожидания.",
					});
				}

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
						return reply.code(404).send({
							error: "DoctorNotFound",
							message: "Выбранный врач не найден в вашей клинике.",
						});
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
					return reply.code(500).send({
						error: "WaitlistNotSaved",
						message:
							"Пациент не добавлен в лист ожидания: сервер не сохранил запись. Проверьте данные и повторите; если снова не выйдет — сообщите администратору клиники.",
					});
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

				// Create CRM Lead for the waitlist addition in SAVEPOINT (gated off in solo_doctor)
				try {
					const [orgMeta] = await tx
						.select({ clinicMode: organizations.clinicMode })
						.from(organizations)
						.where(eq(organizations.id, orgId))
						.limit(1);
					if (orgMeta?.clinicMode !== "solo_doctor") {
						const patientFullName = patient.fullName;
						const patientPhone = patient.phone || "";
						await withSavepoint(tx, (spTx) =>
							createCrmLeadFromPublicIntake(spTx, {
								organizationId: orgId,
								patientId: patient.id,
								patientName: patientFullName,
								patientPhone,
								source: "waitlist",
								receiptStatus: "WAITLIST",
								comment: `Лист ожидания: ${meta.notes || ""}`.trim(),
								doctorId: data.preferredDoctorId || undefined,
							}),
						);
					}
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

				return reply.send(responseItem);
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
	 * Updates a waitlist entry (e.g. priority, doctor, preferredTimeRanges, notes, urgency, treatmentCategory, status).
	 */
	defineTenantMutation(app, {
		method: "PUT",
		path: "/api/waitlist/:id",
		permission: "schedule.write",
		authOptions,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			try {
				const parsedParams = waitlistParamsSchema.safeParse(request.params);
				if (!parsedParams.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный ID записи листа ожидания.",
					});
				}
				const { id } = parsedParams.data;

				const parsed = waitlistUpdateSchema.safeParse(request.body);
				if (!parsed.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Проверьте параметры обновления листа ожидания.",
					});
				}

				const { notes, urgency, treatmentCategory, preferredTimeRanges, ...restUpdate } = parsed.data;

				if (restUpdate.preferredDoctorId) {
					const [doctor] = await tx
						.select({ id: users.id })
						.from(users)
						.where(
							and(
								eq(users.id, restUpdate.preferredDoctorId),
								eq(users.organizationId, orgId),
							),
						)
						.limit(1);
					if (!doctor) {
						return reply.code(404).send({
							error: "DoctorNotFound",
							message: "Выбранный врач не найден в вашей клинике.",
						});
					}
				}

				let mergedTimeRanges = preferredTimeRanges;
				if (
					mergedTimeRanges &&
					mergedTimeRanges.length > 0 &&
					(notes !== undefined || urgency !== undefined || treatmentCategory !== undefined)
				) {
					mergedTimeRanges = mergedTimeRanges.map((tr, idx) =>
						idx === 0
							? {
									...tr,
									...(notes !== undefined && !tr.notes ? { notes } : {}),
									...(urgency !== undefined && !tr.urgency ? { urgency } : {}),
									...(treatmentCategory !== undefined && !tr.treatmentCategory
										? { treatmentCategory }
										: {}),
								}
							: tr,
					);
				} else if (
					!mergedTimeRanges &&
					(notes !== undefined || urgency !== undefined || treatmentCategory !== undefined)
				) {
					mergedTimeRanges = [
						{
							day: "Любой",
							slot: "any",
							...(notes !== undefined ? { notes } : {}),
							...(urgency !== undefined ? { urgency } : {}),
							...(treatmentCategory !== undefined ? { treatmentCategory } : {}),
						},
					];
				}

				const [updated] = await tx
					.update(appointmentWaitlists)
					.set({
						...restUpdate,
						...(mergedTimeRanges !== undefined ? { preferredTimeRanges: mergedTimeRanges } : {}),
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
					return reply.code(404).send({
						error: "WaitlistItemNotFound",
						message: "Запись листа ожидания не найдена.",
					});
				}

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(orgId, {
						type: "WAITLIST_UPDATED",
						payload: updated,
					});
				});

				return reply.send(updated);
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
	defineTenantMutation(app, {
		method: "PATCH",
		path: "/api/waitlist/:id/status",
		permission: "schedule.write",
		authOptions,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			try {
				const parsedParams = waitlistParamsSchema.safeParse(request.params);
				if (!parsedParams.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный ID записи листа ожидания.",
					});
				}
				const { id } = parsedParams.data;

				const parsed = waitlistStatusSchema.safeParse(request.body);
				if (!parsed.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный статус записи листа ожидания.",
					});
				}

				const [updated] = await tx
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

				if (!updated) {
					return reply.code(404).send({
						error: "WaitlistItemNotFound",
						message: "Запись листа ожидания не найдена.",
					});
				}

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(orgId, {
						type: "WAITLIST_UPDATED",
						payload: updated,
					});
				});

				return reply.send(updated);
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
	defineTenantMutation(app, {
		method: "DELETE",
		path: "/api/waitlist/:id",
		permission: "schedule.write",
		authOptions,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			try {
				const parsedParams = waitlistParamsSchema.safeParse(request.params);
				if (!parsedParams.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный ID записи листа ожидания.",
					});
				}
				const { id } = parsedParams.data;

				const [deleted] = await tx
					.delete(appointmentWaitlists)
					.where(
						and(
							eq(appointmentWaitlists.id, id),
							eq(appointmentWaitlists.organizationId, orgId),
						),
					)
					.returning();

				if (!deleted) {
					return reply.code(404).send({
						error: "WaitlistItemNotFound",
						message: "Запись листа ожидания не найдена.",
					});
				}

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(orgId, {
						type: "WAITLIST_DELETED",
						payload: { id },
					});
				});

				return reply.send({ success: true });
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
