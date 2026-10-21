import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { visits } from "../../db/schema.js";
import {
	ensureDefaultStaffChannels,
	insertStaffMessage,
} from "../../db/staffChatQuery.js";
import { openVisitForAppointmentInDb } from "../../db/visitsQuery.js";
import { triggerSmartGapFiller } from "../../services/daemons/smartGapFillerService.js";
import { syncRecallOnAppointmentCompleted } from "../../services/patients/recallSyncService.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	fetchArrivalAppointmentMeta,
	fetchTargetIntercomChannels,
} from "./appointmentsQueryRoutes.js";
import { ARRIVAL_INTERCOM_CHANNEL_SLUGS } from "./appointmentsSchemas.js";
import type { AppointmentIdParams, DbClientOrTransaction } from "./types.js";

export async function dispatchPatientArrivedIntercom(
	tx: DbClientOrTransaction = db,
	request: FastifyRequest,
	orgId: string,
	appointmentId: string,
	updatedAppt: { patientId: string | null; chairId: string | null },
	identity: {
		userId: string | null;
		fullName?: string | null;
		role?: string | null;
	},
): Promise<void> {
	try {
		const apptMeta = await fetchArrivalAppointmentMeta(
			tx,
			orgId,
			appointmentId,
		);

		const patientName = apptMeta?.patientName || "Пациент";
		const doctorName = apptMeta?.doctorName || "Врач";
		const chairName = apptMeta?.chairName || "Кабинет";

		await ensureDefaultStaffChannels(orgId);

		const senderName = identity.fullName || "Ресепшен (Регистратура)";
		const senderRole = identity.role || "admin";

		const targetChannels = await fetchTargetIntercomChannels(
			tx,
			orgId,
			ARRIVAL_INTERCOM_CHANNEL_SLUGS,
		);

		for (const targetChannel of targetChannels) {
			const slug = targetChannel.slug;
			const createdMessage = await insertStaffMessage({
				organizationId: orgId,
				channelId: targetChannel.id,
				senderUserId: identity.userId,
				senderName,
				senderRole,
				messageType: "intercom_ping",
				content: `🛎️ Пациент ${patientName} прибыл в холл клиники и ожидает приёма. Назначен к: ${doctorName} (${chairName}).`,
				urgency: "urgent",
				intercomPreset: "patient_arrived",
				targetAudience: slug === "reception" ? "reception" : "all_assistants",
				patientAttachment: updatedAppt.patientId
					? {
							patientId: updatedAppt.patientId,
							fullName: patientName,
							cabinetNumber: chairName,
							doctorName,
						}
					: null,
				metadata: {
					appointmentId,
					cabinetNumber: chairName,
					chairId: updatedAppt.chairId,
				},
			});

			wsBroker.broadcastToOrganization(orgId, {
				type: "STAFF_CHAT_MESSAGE",
				payload: createdMessage,
			});
		}

		wsBroker.broadcastToOrganization(orgId, {
			type: "INTERCOM_PING",
			payload: {
				ping: {
					content: `🛎️ Пациент ${patientName} прибыл в холл клиники (${doctorName})`,
					urgency: "urgent",
					intercomPreset: "patient_arrived",
					patientAttachment: {
						patientId: updatedAppt.patientId,
						fullName: patientName,
						cabinetNumber: chairName,
						doctorName,
					},
					createdAt: new Date().toISOString(),
				},
				preset: {
					key: "patient_arrived",
					label: "Пациент в холле",
					badge: "🛎️ В холле",
					urgency: "urgent",
				},
				appointmentId,
			},
		});
	} catch (intercomErr) {
		request.log.warn(
			{ err: intercomErr, appointmentId, orgId },
			"[appointments] Не удалось разослать интерком-сигнал о прибытии пациента",
		);
	}
}

export async function applyAppointmentStatusTransitions(
	tx: DbClientOrTransaction = db,
	request: FastifyRequest,
	orgId: string,
	appointmentId: string,
	status: string | undefined,
): Promise<void> {
	if (status === "in_treatment") {
		try {
			await openVisitForAppointmentInDb(orgId, appointmentId, tx);
		} catch (err) {
			request.log.warn(
				{ err, appointmentId, orgId },
				"[scheduleRoutes] Не удалось открыть визит при переходе в in_treatment",
			);
		}
	} else if (status === "completed") {
		void syncRecallOnAppointmentCompleted(orgId, appointmentId);
		try {
			await tx
				.update(visits)
				.set({ status: "signed", updatedAt: new Date() })
				.where(
					and(
						eq(visits.appointmentId, appointmentId),
						eq(visits.organizationId, orgId),
						eq(visits.status, "draft"),
					),
				);
		} catch (err) {
			request.log.warn(
				{ err, appointmentId, orgId },
				"[scheduleRoutes] Не удалось обновить статус визита при переходе в completed",
			);
		}
	}
}

export function triggerCancellationGapFillerEffect(
	request: FastifyRequest,
	orgId: string,
	appointmentId: string,
	status: string | undefined,
): void {
	if (status === "cancelled" || status === "no_show") {
		triggerSmartGapFiller(appointmentId, { organizationId: orgId })
			.then((alert) => {
				if (alert && alert.candidates.length > 0) {
					wsBroker.broadcastToOrganization(orgId, {
						type: "HOT_SLOT_FREED",
						payload: alert,
					});
				}
			})
			.catch((gapErr) => {
				request.log.warn(
					{ err: gapErr, appointmentId, orgId },
					"[appointments] Не удалось выполнить анализ smartGapFiller при отмене приёма",
				);
			});
	}
}

export function registerAppointmentStatusRoutes(
	app: FastifyInstance,
	statusHandler: (
		request: FastifyRequest<{ Params: AppointmentIdParams }>,
		reply: FastifyReply,
	) => Promise<unknown>,
) {
	app.patch("/api/appointments/:appointmentId/status", statusHandler);
	app.put("/api/appointments/:appointmentId/status", statusHandler);
	app.put("/api/schedule/appointments/:appointmentId/status", statusHandler);
	app.patch("/api/schedule/appointments/:appointmentId/status", statusHandler);
}
