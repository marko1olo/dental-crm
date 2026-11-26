/**
 * telegramCallbackMutations.ts — Layer 2/3: Транзакционные мутации базы данных PostgreSQL 18
 * для обработчиков Telegram (обновление статуса записи, регистрация алертов, поиск визитов).
 *
 * ИНВАРИАНТ: RLS-изоляция через withTenantCtx и поддержка tx: DatabaseTransaction.
 */

import { and, desc, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	denteTelegramChatLinks,
	messengerInboundEvents,
	patients,
} from "../../../db/schema.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { processInboundEvents } from "../../../services/messengerIngestion.js";
import type { DatabaseTransaction } from "./telegramWebhookTypes.js";

const logger = createApiLogger("telegramCallbackMutations");

/**
 * Определение идентификатора последнего приема пациента по отпечатку чата Telegram.
 */
export async function resolveLatestAppointmentForPatient(
	organizationId: string,
	chatHash: string | null,
	tx?: DatabaseTransaction,
): Promise<string | null> {
	if (!chatHash) return null;

	const execute = async (client: DatabaseTransaction) => {
		const [chatLink] = await client
			.select()
			.from(denteTelegramChatLinks)
			.where(
				and(
					eq(denteTelegramChatLinks.organizationId, organizationId),
					eq(denteTelegramChatLinks.chatFingerprint, chatHash),
				),
			)
			.limit(1);

		const chatPatientId = chatLink?.subjectType === "patient" ? chatLink.subjectId : null;
		if (!chatPatientId) return null;

		const [latestAppt] = await client
			.select({ id: appointments.id })
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.patientId, chatPatientId),
				),
			)
			.orderBy(desc(appointments.startsAt))
			.limit(1);

		return latestAppt ? latestAppt.id : null;
	};

	if (tx) {
		return execute(tx);
	}
	return withTenantCtx(organizationId, async (tenantTx) => {
		return execute(tenantTx);
	});
}

/**
 * Регистрация экстренного послеоперационного алерта в журнале входящих событий мессенджера.
 */
export async function recordPostOpCriticalAlertInDb(
	organizationId: string,
	params: {
		updateId: number;
		chatId: string | null;
		chatHash: string | null;
		day: number;
		score: number;
		alertText: string;
	},
	tx?: DatabaseTransaction,
): Promise<void> {
	const execute = async (client: DatabaseTransaction) => {
		await client.insert(messengerInboundEvents).values({
			organizationId,
			channel: "telegram" as const,
			externalId: `tg_postop_${params.updateId}`,
			externalChatId: params.chatId || params.chatHash || `tg_${params.updateId}`,
			messageText: params.alertText,
			eventKind: "message" as const,
			rawPayload: {
				type: "postop_critical_alert",
				chatId: params.chatId,
				chatHash: params.chatHash,
				day: params.day,
				painScore: params.score,
				alertText: params.alertText,
			},
		});
	};

	if (tx) {
		await execute(tx);
	} else {
		await withTenantCtx(organizationId, async (tenantTx) => {
			await execute(tenantTx);
		});
	}

	void processInboundEvents().catch((err) => {
		logger.warn(
			{ err: safeLogError(err), organizationId },
			"Failed to process post-op critical alert inbound events",
		);
	});
}

/**
 * Транзакционное обновление статуса записи на приём из бота (подтверждение / перенос / отмена).
 * Обязательно проверяет привязку chatHash -> пациент (или его семейная группа) через denteTelegramChatLinks.
 */
export async function updateAppointmentStatusFromTelegram(
	organizationId: string,
	appointmentId: string,
	status: "confirmed" | "cancelled" | "planned",
	chatHash: string | null = null,
	tx?: DatabaseTransaction,
): Promise<boolean> {
	if (!chatHash) {
		return false;
	}

	const execute = async (client: DatabaseTransaction) => {
		const [chatLink] = await client
			.select({
				subjectType: denteTelegramChatLinks.subjectType,
				subjectId: denteTelegramChatLinks.subjectId,
			})
			.from(denteTelegramChatLinks)
			.where(
				and(
					eq(denteTelegramChatLinks.organizationId, organizationId),
					eq(denteTelegramChatLinks.chatFingerprint, chatHash),
					eq(denteTelegramChatLinks.status, "active"),
				),
			)
			.limit(1);

		const linkedPatientId =
			chatLink?.subjectType === "patient" ? chatLink.subjectId : null;
		if (!linkedPatientId) {
			return false;
		}

		const [appt] = await client
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.id, appointmentId),
				),
			)
			.limit(1);

		if (!appt) {
			return false;
		}

		if (appt.patientId !== linkedPatientId) {
			const [linkedPatient] = await client
				.select({ familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						eq(patients.id, linkedPatientId),
					),
				)
				.limit(1);
			const [apptPatient] = await client
				.select({ familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						eq(patients.id, appt.patientId),
					),
				)
				.limit(1);
			const sameFamily =
				Boolean(linkedPatient?.familyGroupId) &&
				linkedPatient?.familyGroupId === apptPatient?.familyGroupId;
			if (!sameFamily) {
				return false;
			}
		}

		const updated = await client
			.update(appointments)
			.set({ status })
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.id, appointmentId),
				),
			)
			.returning({ id: appointments.id });
		return updated.length > 0;
	};

	if (tx) {
		return execute(tx);
	}
	return withTenantCtx(organizationId, async (tenantTx) => {
		return execute(tenantTx);
	});
}
