import { and, eq } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { db as database } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { appointments } from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { TelegramPostOpCarePipeline } from "../../services/telegram/TelegramPostOpCarePipeline.js";
import { syncRecallOnVisitCompleted } from "../../services/patients/recallSyncService.js";
import { executeAutoBomWriteoff } from "../../services/treatmentConsumables/autoBomWriteoffService.js";

export interface VisitCompletionPayload {
	orgId: string;
	visit: {
		id: string;
		appointmentId?: string | null;
		patientId?: string | null;
		diagnosis?: string | null;
		treatmentPlan?: string | null;
		complaint?: string | null;
		objectiveStatus?: string | null;
		doctorSummary?: string | null;
	};
	doctorId?: string | null;
	log: FastifyBaseLogger;
}

export async function executeVisitCompletionSideEffects({
	orgId,
	visit,
	doctorId,
	log,
}: VisitCompletionPayload): Promise<void> {
	try {
		await withTenantCtx(orgId, async (tx) => {
			if (visit.appointmentId) {
				await tx
					.update(appointments)
					.set({ status: "completed" })
					.where(
						and(
							eq(appointments.id, visit.appointmentId),
							eq(appointments.organizationId, orgId),
						),
					);
			}

			// Каноническое списание расходных материалов по техкартам (BOM - Мандаты 8e, 8v, 8bo)
			// Списание происходит строго 1 раз на сервере в транзакции с RLS
			await executeAutoBomWriteoff(tx, {
				organizationId: orgId,
				visitId: visit.id,
				userId: doctorId ?? null,
				allowOverdraft: true,
			});
		});
	} catch (bomErr) {
		log.warn(
			{ error: bomErr, visitId: visit.id },
			"Автоматическое списание по техкартам (BOM) завершилось с предупреждением (не блокирует подписание)",
		);
	}

	if (visit.appointmentId) {
		wsBroker.broadcastToOrganization(orgId, {
			type: "APPOINTMENT_UPDATED",
			payload: {
				appointmentId: visit.appointmentId,
				visitId: visit.id,
				status: "completed",
			},
		});
	}

	wsBroker.broadcastToOrganization(orgId, {
		type: "INVENTORY_STOCK_CHANGED",
		payload: {
			visitId: visit.id,
			action: "auto_deduct",
		},
	});

	void withTenantCtx(orgId, async () => {
		await syncRecallOnVisitCompleted(orgId, visit.id);
	}).catch((err) => {
		log.warn(
			{ error: err, visitId: visit.id },
			"Фоновая синхронизация recall завершилась с ошибкой (не блокирует подписание)",
		);
	});

	try {
		if (visit.patientId) {
			await TelegramPostOpCarePipeline.schedulePostVisitSurveyIfNeeded({
				organizationId: orgId,
				clinicId: orgId,
				visitId: visit.id,
				patientId: visit.patientId,
				doctorId: doctorId ?? null,
				appointmentId: visit.appointmentId,
				diagnosis: visit.diagnosis,
				treatmentPlan: visit.treatmentPlan,
				complaint: visit.complaint,
				objectiveStatus: visit.objectiveStatus,
				doctorSummary: visit.doctorSummary,
			});
		}
	} catch (postOpError) {
		log.warn(
			{ error: postOpError, visitId: visit.id },
			"Не удалось автоматически поставить опрос после приёма (не блокирует подписание)",
		);
	}
}
