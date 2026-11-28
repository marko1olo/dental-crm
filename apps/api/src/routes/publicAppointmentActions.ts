import { escapeHtml } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { definePublicRoute } from "../core/routeFactories.js";
import { type TenantDb, withSavepoint, withTenantWriteCtx } from "../db/rls.js";
import { BoundedTtlMap } from "../lib/boundedTtlMap.js";
import {
	appointments,
	clinics,
	communicationTasks,
	organizations,
	patients,
} from "../db/schema.js";
import {
	markActionCodeUsed,
	resolveActionCode,
} from "../services/communications/appointmentActionLinks.js";
import { invalidateAppointmentReminders } from "../services/communications/appointmentReminders.js";
import { wsBroker } from "../services/websocketBroker.js";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestCounts = new BoundedTtlMap<string, { count: number; resetAt: number }>({
	maxEntries: 5000,
	ttlMs: RATE_LIMIT_WINDOW_MS,
	touchOnGet: false,
});

function isRateLimited(ip: string, now = Date.now()): boolean {
	const entry = requestCounts.get(ip);
	if (!entry || entry.resetAt <= now) {
		requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	entry.count += 1;
	return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function renderPage(
	title: string,
	message: string,
	tone: "ok" | "warn" | "error",
): string {
	const accent =
		tone === "ok" ? "#0f766e" : tone === "warn" ? "#b45309" : "#b91c1c";
	return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; padding: 32px 20px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         background: #f8fafc; color: #0f172a; line-height: 1.5; }
  main { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px 24px;
         box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08); }
  h1 { margin: 0 0 12px; font-size: 20px; color: ${accent}; }
  p { margin: 0; font-size: 16px; }
</style>
</head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></main></body>
</html>`;
}

function sendPage(
	reply: FastifyReply,
	statusCode: number,
	title: string,
	message: string,
	tone: "ok" | "warn" | "error",
) {
	return reply
		.code(statusCode)
		.type("text/html; charset=utf-8")
		.send(renderPage(title, message, tone));
}

async function clinicTitle(tx: TenantDb, organizationId: string): Promise<string> {
	const [clinic] = await tx
		.select({ name: clinics.name })
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);
	if (clinic?.name) return clinic.name;

	const [organization] = await tx
		.select({ name: organizations.name })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);
	return organization?.name ?? "Клиника";
}

function formatAppointmentMoment(
	startsAt: Date,
	timezone: string,
	logger?: FastifyBaseLogger,
): string {
	try {
		return new Intl.DateTimeFormat("ru-RU", {
			timeZone: timezone,
			day: "numeric",
			month: "long",
			hour: "2-digit",
			minute: "2-digit",
		}).format(startsAt);
	} catch (err) {
		logger?.warn(
			{ err, timezone },
			"[publicAppointmentActions] formatAppointmentMoment failed, using default timezone",
		);
		return new Intl.DateTimeFormat("ru-RU", {
			day: "numeric",
			month: "long",
			hour: "2-digit",
			minute: "2-digit",
		}).format(startsAt);
	}
}

export async function registerPublicAppointmentActionRoutes(
	app: FastifyInstance,
) {
	const handle = async (request: FastifyRequest, reply: FastifyReply) => {
		if (isRateLimited(request.ip)) {
			return sendPage(
				reply,
				429,
				"Слишком много запросов",
				"Попробуйте открыть ссылку через минуту.",
				"warn",
			);
		}

		const rawCode = (request.params as { code?: string }).code ?? "";
		const resolved = await resolveActionCode(rawCode);
		if (!resolved || resolved.expired) {
			return sendPage(
				reply,
				400,
				"Ссылка недействительна",
				"Срок действия ссылки истёк или она неполная. Позвоните в клинику, чтобы подтвердить или отменить приём.",
				"error",
			);
		}

		const payload = {
			organizationId: resolved.organizationId,
			appointmentId: resolved.appointmentId,
		};
		const expectedAction = resolved.action;

		return withTenantWriteCtx(payload.organizationId, async (tx) => {
			const [appointment] = await tx
				.select({
					id: appointments.id,
					status: appointments.status,
					startsAt: appointments.startsAt,
					patientId: appointments.patientId,
					comment: appointments.comment,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.id, payload.appointmentId),
						eq(appointments.organizationId, payload.organizationId),
					),
				)
				.limit(1);

			const title = await clinicTitle(tx, payload.organizationId);
			if (!appointment) {
				return sendPage(
					reply,
					404,
					title,
					"Запись не найдена. Возможно, её уже отменили. Позвоните в клинику.",
					"error",
				);
			}

			const [clinic] = await tx
				.select({ timezone: clinics.timezone })
				.from(clinics)
				.where(eq(clinics.organizationId, payload.organizationId))
				.limit(1);
			const moment = formatAppointmentMoment(
				appointment.startsAt,
				clinic?.timezone ?? "Europe/Moscow",
				request.log,
			);

			if (appointment.startsAt.getTime() < Date.now()) {
				return sendPage(
					reply,
					409,
					title,
					`Приём ${moment} уже прошёл. Чтобы записаться снова, позвоните в клинику.`,
					"warn",
				);
			}

			if (expectedAction === "confirm") {
				if (appointment.status === "confirmed") {
					return sendPage(
						reply,
						200,
						title,
						`Приём ${moment} уже подтверждён. Ждём вас.`,
						"ok",
					);
				}
				if (appointment.status !== "planned") {
					return sendPage(
						reply,
						409,
						title,
						`Приём ${moment} уже нельзя подтвердить: его статус изменила клиника. Позвоните нам.`,
						"warn",
					);
				}

				const [confirmed] = await tx
					.update(appointments)
					.set({ status: "confirmed" })
					.where(
						and(
							eq(appointments.id, appointment.id),
							eq(appointments.organizationId, payload.organizationId),
						),
					)
					.returning({ id: appointments.id });
				if (!confirmed) {
					return sendPage(
						reply,
						404,
						title,
						"Запись не найдена. Возможно, её уже отменили. Позвоните в клинику.",
						"error",
					);
				}
				await markActionCodeUsed(
					resolved.code,
					new Date(),
					payload.organizationId,
					tx,
				);
				wsBroker.broadcastToOrganization(payload.organizationId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId: appointment.id,
						source: "patient_confirmation",
					},
				});
				return sendPage(
					reply,
					200,
					title,
					`Спасибо! Приём ${moment} подтверждён. Ждём вас.`,
					"ok",
				);
			}

			if (expectedAction === "reschedule") {
				if (appointment.status === "cancelled") {
					return sendPage(
						reply,
						200,
						title,
						`Приём ${moment} уже отменён. Чтобы записаться снова, позвоните в клинику.`,
						"ok",
					);
				}

				const updatedComment = appointment.comment
					? `${appointment.comment}\n[Запрос переноса пациентом]`
					: "[Запрос переноса пациентом]";

				await withSavepoint(tx, async (spTx) => {
					await spTx
						.update(appointments)
						.set({ comment: updatedComment })
						.where(
							and(
								eq(appointments.id, appointment.id),
								eq(appointments.organizationId, payload.organizationId),
							),
						);

					if (appointment.patientId) {
						const [patient] = await spTx
							.select({ fullName: patients.fullName })
							.from(patients)
							.where(
								and(
									eq(patients.id, appointment.patientId),
									eq(patients.organizationId, payload.organizationId),
								),
							)
							.limit(1);

						await spTx.insert(communicationTasks).values({
							organizationId: payload.organizationId,
							patientId: appointment.patientId,
							appointmentId: appointment.id,
							assignedRole: "administrator",
							channel: "phone",
							intent: "appointment_confirmation",
							status: "queued",
							priority: "high",
							dueAt: new Date(),
							title: "Запрос переноса приёма по ссылке",
							body:
								`${patient?.fullName ?? "Пациент"} запросил перенос приёма ${moment} через ссылку в сообщении. ` +
								"Свяжитесь с пациентом для выбора удобного времени.",
							workflowCode: "appointment_reschedule_followup",
						});
					}
				});

				await markActionCodeUsed(
					resolved.code,
					new Date(),
					payload.organizationId,
					tx,
				);

				wsBroker.broadcastToOrganization(payload.organizationId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId: appointment.id,
						source: "patient_reschedule_request",
					},
				});

				return sendPage(
					reply,
					200,
					title,
					`Запрос на перенос приёма ${moment} принят. Администратор свяжется с вами для согласования нового удобного времени.`,
					"ok",
				);
			}

			if (appointment.status === "cancelled") {
				return sendPage(
					reply,
					200,
					title,
					`Приём ${moment} уже отменён. Чтобы записаться снова, позвоните в клинику.`,
					"ok",
				);
			}
			if (
				appointment.status !== "planned" &&
				appointment.status !== "confirmed"
			) {
				return sendPage(
					reply,
					409,
					title,
					`Приём ${moment} уже нельзя отменить по ссылке. Позвоните в клинику.`,
					"warn",
				);
			}

			const cancelled = await withSavepoint(tx, async (spTx) => {
				const [res] = await spTx
					.update(appointments)
					.set({ status: "cancelled" })
					.where(
						and(
							eq(appointments.id, appointment.id),
							eq(appointments.organizationId, payload.organizationId),
						),
					)
					.returning({ id: appointments.id });

				if (!res) return null;

				if (appointment.patientId) {
					const [patient] = await spTx
						.select({ fullName: patients.fullName })
						.from(patients)
						.where(
							and(
								eq(patients.id, appointment.patientId),
								eq(patients.organizationId, payload.organizationId),
							),
						)
						.limit(1);

					await spTx.insert(communicationTasks).values({
						organizationId: payload.organizationId,
						patientId: appointment.patientId,
						appointmentId: appointment.id,
						assignedRole: "administrator",
						channel: "phone",
						intent: "appointment_confirmation",
						status: "queued",
						priority: "high",
						dueAt: new Date(),
						title: "Пациент отменил приём по ссылке",
						body:
							`${patient?.fullName ?? "Пациент"} отменил приём ${moment} через ссылку в сообщении. ` +
							"Слот освободился: предложите время другому пациенту из листа ожидания и уточните, нужен ли перенос.",
						workflowCode: "appointment_reschedule_followup",
					});
				}

				return res;
			});

			if (!cancelled) {
				return sendPage(
					reply,
					404,
					title,
					"Запись не найдена. Возможно, её уже отменили. Позвоните в клинику.",
					"error",
				);
			}
			await markActionCodeUsed(
				resolved.code,
				new Date(),
				payload.organizationId,
				tx,
			);

			await invalidateAppointmentReminders(
				payload.organizationId,
				appointment.id,
				"Приём отменён пациентом по ссылке",
				tx,
			);

			wsBroker.broadcastToOrganization(payload.organizationId, {
				type: "APPOINTMENT_UPDATED",
				payload: {
					appointmentId: appointment.id,
					source: "patient_cancellation",
				},
			});

			return sendPage(
				reply,
				200,
				title,
				`Приём ${moment} отменён. Мы получили ваш отказ; при необходимости администратор свяжется с вами для переноса.`,
				"ok",
			);
		});
	};

	definePublicRoute(app, {
		method: "GET",
		path: "/api/p/:code",
		handler: async ({ request, reply }) => handle(request, reply),
	});
}
