import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { defineTenantMutation } from "../../core/routeFactories.js";
import {
	appointments,
	clinics,
	communicationOutbox,
	communicationTemplates,
	denteTelegramChatLinks,
	patients,
} from "../../db/schema.js";
import { issueAppointmentActionLinks } from "../../services/communications/appointmentActionLinks.js";
import { renderTemplate } from "../../services/communications/templateEngine/templateRenderer.js";
import { decryptTelegramChatId } from "../../utils/telegramChatRef.js";
import {
	batchDispatchSchema,
	dayBoundsInTimeZone,
	tomorrowInTimeZone,
} from "./timezoneAndTypes.js";

export function registerDayConfirmationDispatchRoutes(
	app: FastifyInstance,
): void {
	const dispatchSpec = {
		method: "POST" as const,
		permission: "schedule.write" as const,
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "optional_header" as const,
		bodySchema: batchDispatchSchema,
		validationErrorMessage: "Неверные параметры запроса",
		handler: async ({
			tx,
			organizationId,
			body,
			request,
			reply,
		}: {
			tx: import("../../db/rls.js").TenantDb;
			organizationId: string;
			body: import("zod").infer<typeof batchDispatchSchema>;
			request: import("fastify").FastifyRequest;
			reply: import("fastify").FastifyReply;
		}) => {
			const parsed = body;
			try {
				const clinicList = await tx
					.select({
						id: clinics.id,
						timezone: clinics.timezone,
						address: clinics.address,
						name: clinics.name,
					})
					.from(clinics)
					.where(eq(clinics.organizationId, organizationId));
				const clinic = clinicList[0];
				const timeZone = clinic?.timezone?.trim() || "Europe/Moscow";

				const date =
					parsed.date ??
					tomorrowInTimeZone(timeZone, new Date(), request.log);
				const bounds = dayBoundsInTimeZone(date, timeZone, request.log);
				if (!bounds) {
					return reply.status(400).send({
						error: "InvalidDate",
						message: "Не удалось определить границы дня в часовом поясе клиники",
					});
				}

				const nowInTz = new Intl.DateTimeFormat("en-US", {
					timeZone,
					hour: "numeric",
					hour12: false,
				}).format(new Date());
				const currentHour = Number.parseInt(nowInTz, 10);
				const isQuietHours = currentHour >= 21 || currentHour < 8;

				const apptConditions = [
					eq(appointments.organizationId, organizationId),
					gte(appointments.startsAt, bounds.from),
					lte(appointments.startsAt, bounds.to),
					inArray(appointments.status, ["planned", "confirmed"]),
				];
				if (parsed.appointmentIds && parsed.appointmentIds.length > 0) {
					apptConditions.push(inArray(appointments.id, parsed.appointmentIds));
				}

				const targetAppointments = await tx
					.select()
					.from(appointments)
					.where(and(...apptConditions))
					.orderBy(asc(appointments.startsAt));

				const patientIds = targetAppointments
					.map((a) => a.patientId)
					.filter((id): id is string => typeof id === "string");

				const patientMap = new Map<string, typeof patients.$inferSelect>();
				const telegramChatMap = new Map<string, string>();
				if (patientIds.length > 0) {
					const [foundPatients, foundTgLinks] = await Promise.all([
						tx
							.select()
							.from(patients)
							.where(
								and(
									eq(patients.organizationId, organizationId),
									inArray(patients.id, patientIds),
								),
							),
						tx
							.select({
								subjectId: denteTelegramChatLinks.subjectId,
								chatTransportRef: denteTelegramChatLinks.chatTransportRef,
							})
							.from(denteTelegramChatLinks)
							.where(
								and(
									eq(denteTelegramChatLinks.organizationId, organizationId),
									eq(denteTelegramChatLinks.subjectType, "patient"),
									eq(denteTelegramChatLinks.status, "active"),
									inArray(denteTelegramChatLinks.subjectId, patientIds),
								),
							),
					]);
					for (const p of foundPatients) patientMap.set(p.id, p);
					for (const l of foundTgLinks) {
						if (l.chatTransportRef) {
							const decrypted = decryptTelegramChatId(l.chatTransportRef);
							const raw =
								decrypted ||
								(!l.chatTransportRef.startsWith("v1.") &&
								!l.chatTransportRef.includes("aes256")
									? l.chatTransportRef
									: null);
							if (raw) telegramChatMap.set(l.subjectId, raw);
						}
					}
				}

				let skippedQuietHours = 0;
				let skippedNoContact = 0;
				const prefilteredResults: Array<{
					appointmentId: string;
					patientName: string;
					channel: string;
					status:
						| "dispatched"
						| "skipped_quiet_hours"
						| "skipped_no_contact"
						| "already_queued";
					reason: string;
					details: string;
				}> = [];

				const activeTemplates = await tx
					.select()
					.from(communicationTemplates)
					.where(
						and(
							eq(communicationTemplates.organizationId, organizationId),
							eq(communicationTemplates.isActive, true),
						),
					);
				const templateByChannel = new Map(
					activeTemplates.map((t) => [`${t.channel}:${t.intent}`, t]),
				);

				const outboxInserts: Array<typeof communicationOutbox.$inferInsert> = [];
				const outboxCandidates: Array<{
					appointmentId: string;
					patientName: string;
					channel: string;
					dedupeKey: string;
				}> = [];

				for (const appt of targetAppointments) {
					const pat = appt.patientId ? patientMap.get(appt.patientId) : null;
					const patName = pat?.fullName || "Пациент";
					const phone = pat?.phone?.trim() || null;
					const telegram =
						(appt.patientId ? telegramChatMap.get(appt.patientId) : null) ||
						null;

					if (!phone && !telegram) {
						skippedNoContact++;
						const reasonText = "У пациента нет номера телефона или Telegram";
						prefilteredResults.push({
							appointmentId: appt.id,
							patientName: patName,
							channel: "none",
							status: "skipped_no_contact",
							reason: reasonText,
							details: reasonText,
						});
						continue;
					}

					if (isQuietHours && !parsed.allowQuietHoursOverride) {
						skippedQuietHours++;
						const reasonText =
							"Тихий час (21:00–08:00). Отправка отложена до утра, чтобы не беспокоить пациента.";
						prefilteredResults.push({
							appointmentId: appt.id,
							patientName: patName,
							channel: telegram ? "telegram" : "whatsapp",
							status: "skipped_quiet_hours",
							reason: reasonText,
							details: reasonText,
						});
						continue;
					}

					let preferredChannel: "telegram" | "whatsapp" | "sms" = "whatsapp";
					if (parsed.channelOverride && parsed.channelOverride !== "auto") {
						preferredChannel = parsed.channelOverride;
					} else if (telegram) {
						preferredChannel = "telegram";
					} else if (phone) {
						preferredChannel = "whatsapp";
					}

					let recipientAddress = "";
					if (preferredChannel === "telegram") {
						if (telegram) {
							if (/^-?\d+$/.test(telegram.trim())) {
								recipientAddress = telegram.trim();
							} else {
								const cleanUsername = telegram.replace(/^@+/, "").trim();
								recipientAddress = cleanUsername ? `@${cleanUsername}` : "";
							}
						}
						if (!recipientAddress) {
							request.log.warn(
								{ appointmentId: appt.id, patientId: appt.patientId },
								"Пропуск отправки через Telegram: отсутствует Telegram Chat ID",
							);
							skippedNoContact++;
							const reasonText = "У пациента не привязан Telegram аккаунт";
							prefilteredResults.push({
								appointmentId: appt.id,
								patientName: patName,
								channel: "telegram",
								status: "skipped_no_contact",
								reason: reasonText,
								details: reasonText,
							});
							continue;
						}
					} else {
						recipientAddress = phone || "";
					}

					const dedupeKey = `reminder:appointment:${appt.id}:batch`;

					const timeStr = appt.startsAt.toLocaleTimeString("ru-RU", {
						timeZone,
						hour: "2-digit",
						minute: "2-digit",
					});

					const actionLinks = await issueAppointmentActionLinks(
						{
							organizationId,
							appointmentId: appt.id,
							startsAt: appt.startsAt,
						},
						new Date(),
						process.env,
						tx,
					);

					const values: Record<string, string> = {
						patient: patName,
						clinic: clinic?.name ?? "Клиника",
						date,
						time: timeStr,
						confirmLink: actionLinks?.confirmLink ?? "",
						cancelLink: actionLinks?.cancelLink ?? "",
						rescheduleLink: actionLinks?.rescheduleLink ?? "",
					};

					const template =
						templateByChannel.get(
							`${preferredChannel}:appointment_confirmation`,
						) ??
						templateByChannel.get(`${preferredChannel}:appointment_reminder`);

					let bodyText = "";
					if (template?.body) {
						const rendered = renderTemplate(template.body, values);
						if (rendered.ok) {
							bodyText = rendered.text;
						}
					}

					if (!bodyText) {
						const linkSuffix = actionLinks?.confirmLink
							? `\n\nПодтвердить запись: ${actionLinks.confirmLink}\nОтменить: ${actionLinks.cancelLink}`
							: "";
						bodyText = `Здравствуйте, ${patName}! Напоминаем о вашей записи в клинику на завтра (${date}) в ${timeStr}.${linkSuffix}\nЖдём вас!`;
					}

					outboxInserts.push({
						organizationId,
						clinicId: clinic?.id ?? null,
						patientId: pat?.id ?? null,
						channel:
							preferredChannel === "telegram"
								? "telegram"
								: preferredChannel === "sms"
									? "sms"
									: "whatsapp",
						intent: "appointment_confirmation",
						scope: "service",
						recipientAddress,
						subject: "Напоминание о приёме на завтра",
						body: bodyText,
						status: "queued",
						dedupeKey,
						scheduledAt: new Date(),
						nextAttemptAt: new Date(),
					});

					outboxCandidates.push({
						appointmentId: appt.id,
						patientName: patName,
						channel: preferredChannel,
						dedupeKey,
					});
				}

				let insertedDedupeKeys = new Set<string>();
				if (outboxInserts.length > 0) {
					const insertedRows = await tx
						.insert(communicationOutbox)
						.values(outboxInserts)
						.onConflictDoNothing({
							target: [
								communicationOutbox.organizationId,
								communicationOutbox.dedupeKey,
							],
						})
						.returning({
							id: communicationOutbox.id,
							dedupeKey: communicationOutbox.dedupeKey,
						});
					insertedDedupeKeys = new Set(insertedRows.map((r) => r.dedupeKey));
				}

				let dispatched = 0;
				let alreadyQueued = 0;
				const queueResults: Array<{
					appointmentId: string;
					patientName: string;
					channel: string;
					status: "dispatched" | "already_queued";
					reason: string;
					details: string;
				}> = outboxCandidates.map((c) => {
					if (insertedDedupeKeys.has(c.dedupeKey)) {
						dispatched++;
						const reasonText = "Успешно поставлено в очередь рассылки";
						return {
							appointmentId: c.appointmentId,
							patientName: c.patientName,
							channel: c.channel,
							status: "dispatched" as const,
							reason: reasonText,
							details: reasonText,
						};
					}
					alreadyQueued++;
					const reasonText = "Напоминание уже сформировано и находится в очереди";
					return {
						appointmentId: c.appointmentId,
						patientName: c.patientName,
						channel: c.channel,
						status: "already_queued" as const,
						reason: reasonText,
						details: reasonText,
					};
				});

				const results = [...prefilteredResults, ...queueResults];

				return reply.send({
					success: true,
					date,
					timeZone,
					totalAppointments: targetAppointments.length,
					dispatched,
					alreadyQueued,
					skippedQuietHours,
					skippedNoContact,
					isQuietHours,
					results,
					message: `Пакетная обработка напоминаний завершена: новых в очереди ${dispatched}, ранее создано ${alreadyQueued}, пропущено тихих часов ${skippedQuietHours}, без контакта ${skippedNoContact}.`,
				});
			} catch (err: unknown) {
				request.log.error(err, "Ошибка пакетной отправки напоминаний на завтра");
				const message =
					err instanceof Error
						? err.message
						: "Внутренняя ошибка пакетной рассылки";
				return reply.status(500).send({
					error: "BatchDispatchError",
					message,
				});
			}
		},
	};

	defineTenantMutation(app, {
		...dispatchSpec,
		path: "/api/schedule/day-confirmations/dispatch",
	});
	defineTenantMutation(app, {
		...dispatchSpec,
		path: "/api/schedule/tomorrow-reminders/dispatch",
	});
}
