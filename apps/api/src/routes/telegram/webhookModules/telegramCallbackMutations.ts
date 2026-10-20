/**
 * telegramCallbackMutations.ts — Layer 2/3: Транзакционные мутации базы данных PostgreSQL 18
 * для обработчиков Telegram (обновление статуса записи, регистрация алертов, поиск визитов).
 *
 * ИНВАРИАНТ: RLS-изоляция через withTenantCtx и поддержка tx: DatabaseTransaction.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	appointments,
	denteTelegramChatLinks,
	messengerInboundEvents,
} from "../../../db/schema.js";
import { processInboundEvents } from "../../../services/messengerIngestion.js";
import type { DatabaseTransaction } from "./telegramWebhookTypes.js";

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

	void processInboundEvents().catch(() => {});
}

/**
 * Транзакционное обновление статуса записи на приём из бота (подтверждение / перенос / отмена).
 */
export async function updateAppointmentStatusFromTelegram(
	organizationId: string,
	appointmentId: string,
	status: "confirmed" | "cancelled" | "planned",
	tx?: DatabaseTransaction,
): Promise<boolean> {
	const execute = async (client: DatabaseTransaction) => {
		const res = await client
			.update(appointments)
			.set({ status })
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.id, appointmentId),
				),
			);
		return true;
	};

	if (tx) {
		return execute(tx);
	}
	return withTenantCtx(organizationId, async (tenantTx) => {
		return execute(tenantTx);
	});
}
