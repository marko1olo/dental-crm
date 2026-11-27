import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { onTenantTxCommit, runDetachedInTenantCtx, withSavepoint } from "../../db/rls.js";
import { visits } from "../../db/schema.js";
import {
	ensureDefaultStaffChannels,
	insertStaffMessage,
} from "../../db/staffChatQuery.js";
import { openVisitForAppointmentInDb } from "../../db/visitsQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import { syncRecallOnAppointmentCompleted } from "../../services/patients/recallSyncService.js";
import { executeAutoBomWriteoff } from "../../services/treatmentConsumables/autoBomWriteoffService.js";
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

		await ensureDefaultStaffChannels(orgId, tx);

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
				tx,
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

			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(orgId, {
					type: "STAFF_CHAT_MESSAGE",
					payload: createdMessage,
				});
			});
		}

		onTenantTxCommit(() => {
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
	previousStatus?: string,
): Promise<void> {
	if (status === "in_treatment") {
		try {
			await openVisitForAppointmentInDb(orgId, appointmentId, tx);
		} catch (err) {
			request.log.error(
				{ err, appointmentId, orgId },
				"[scheduleRoutes] Не удалось открыть визит при переходе в in_treatment (откат транзакции)",
			);
			throw err;
		}
	} else if (status === "completed") {
		try {
			const updatedVisits = await tx
				.update(visits)
				.set({ status: "signed", updatedAt: new Date() })
				.where(
					and(
						eq(visits.appointmentId, appointmentId),
						eq(visits.organizationId, orgId),
						eq(visits.status, "draft"),
					),
				)
				.returning({
					id: visits.id,
					patientId: visits.patientId,
				});

			const isTransitionToCompleted = previousStatus !== "completed";
			if (isTransitionToCompleted || updatedVisits.length > 0) {
				onTenantTxCommit(() => {
					void runDetachedInTenantCtx(orgId, async () => {
						await syncRecallOnAppointmentCompleted(orgId, appointmentId);
					}).catch((err) => {
						request.log.warn(
							{ err, appointmentId, orgId },
							"[scheduleRoutes] Фоновая синхронизация recall завершилась с ошибкой",
						);
					});
				});
			}

			const targetVisits =
				updatedVisits.length > 0
					? updatedVisits
					: isTransitionToCompleted
						? await tx
								.select({
									id: visits.id,
									patientId: visits.patientId,
								})
								.from(visits)
								.where(
									and(
										eq(visits.appointmentId, appointmentId),
										eq(visits.organizationId, orgId),
									),
								)
								.limit(1)
						: [];

			const identity = getRequestIdentity(request);
			for (const visit of targetVisits) {
				try {
					await withSavepoint(tx, async (spTx) =>
						executeAutoBomWriteoff(spTx, {
							organizationId: orgId,
							visitId: visit.id,
							patientId: visit.patientId,
							userId: identity.userId,
							allowOverdraft: true,
						}),
					);
					onTenantTxCommit(() => {
						wsBroker.broadcastToOrganization(orgId, {
							type: "INVENTORY_STOCK_CHANGED",
							payload: {
								visitId: visit.id,
								action: "auto_deduct",
							},
						});
					});
				} catch (bomErr) {
					request.log.warn(
						{ bomErr, visitId: visit.id, appointmentId, orgId },
						"[scheduleRoutes] Предупреждение автоматического списания по техкартам (BOM) при завершении приёма (мягкий овердрафт)",
					);
				}
			}
		} catch (err) {
			request.log.error(
				{ err, appointmentId, orgId },
				"[scheduleRoutes] Не удалось обновить статус визита при переходе в completed (откат транзакции)",
			);
			throw err;
		}
	}
}

export function registerAppointmentStatusRoutes(
	app: FastifyInstance,
	statusHandler: (
		request: FastifyRequest<{ Params: AppointmentIdParams }>,
		reply: FastifyReply,
	) => Promise<unknown>,
) {
	const routeOpts = { config: { tenantTxSelfManaged: true } } as const;
	app.patch("/api/appointments/:appointmentId/status", routeOpts, statusHandler);
	app.put("/api/appointments/:appointmentId/status", routeOpts, statusHandler);
	app.put("/api/schedule/appointments/:appointmentId/status", routeOpts, statusHandler);
	app.patch("/api/schedule/appointments/:appointmentId/status", routeOpts, statusHandler);
}
