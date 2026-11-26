import { and, desc, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	messengerInboundEvents,
	patients,
} from "../../../db/schema.js";
import type { BotChannel } from "../../../services/bots/types.js";
import { hashTelegramChatFingerprint } from "../../../utils/telegramChatHash.js";

/**
 * Привязка активного чата к существующей или новой карте пациента.
 * Связывание выполняется строго через профильные таблицы (messenger_inbound_events, dente_telegram_chat_links),
 * полностью исключая загрязнение медицинского поля patients.notes техническими маркерами ботов (Мандат 8ap).
 */
export async function handleLinkPatient(
	orgId: string,
	senderId: string,
	channel: BotChannel = "telegram",
	patientId?: string,
	createNew?: { fullName: string; phone?: string | null | undefined },
): Promise<{
	ok: boolean;
	statusCode?: number;
	error?: string;
	message?: string;
	patient?: { id: string; fullName: string; phone: string | null };
}> {
	return await withTenantCtx(orgId, async (tx) => {
		let targetPatient: { id: string; fullName: string; phone: string | null } | null = null;

		if (patientId) {
			const [existing] = await tx
				.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
				.limit(1);

			if (!existing) {
				return { ok: false, statusCode: 404, error: "PatientNotFound", message: "Пациент не найден." };
			}
			targetPatient = existing;
		} else if (createNew && createNew.fullName.trim()) {
			const [created] = await tx
				.insert(patients)
				.values({
					organizationId: orgId,
					fullName: createNew.fullName.trim(),
					phone: createNew.phone?.trim() || null,
					status: "active",
					notes: null,
				})
				.returning({ id: patients.id, fullName: patients.fullName, phone: patients.phone });

			if (!created) {
				return { ok: false, statusCode: 500, error: "CreateFailed", message: "Не удалось создать карту пациента." };
			}
			targetPatient = created;
		} else {
			return {
				ok: false,
				statusCode: 400,
				error: "ValidationError",
				message: "Укажите ID существующего пациента либо данные для создания нового.",
			};
		}

		// Обновляем все входящие события этого чата
		await tx
			.update(messengerInboundEvents)
			.set({ patientId: targetPatient.id })
			.where(
				and(
					eq(messengerInboundEvents.organizationId, orgId),
					eq(messengerInboundEvents.channel, channel),
					eq(messengerInboundEvents.externalChatId, senderId),
				),
			);

		// Если канал Telegram, сохраняем привязку в dente_telegram_chat_links
		if (channel === "telegram") {
			const chatFingerprint = hashTelegramChatFingerprint(senderId);
			const [existingLink] = await tx
				.select({ id: denteTelegramChatLinks.id })
				.from(denteTelegramChatLinks)
				.where(
					and(
						eq(denteTelegramChatLinks.organizationId, orgId),
						eq(denteTelegramChatLinks.chatFingerprint, chatFingerprint),
					),
				)
				.limit(1);

			if (existingLink) {
				await tx
					.update(denteTelegramChatLinks)
					.set({
						subjectType: "patient",
						subjectId: targetPatient.id,
						chatTransportRef: senderId,
						status: "active",
						lastUpdateAt: new Date(),
					})
					.where(
						and(
							eq(denteTelegramChatLinks.id, existingLink.id),
							eq(denteTelegramChatLinks.organizationId, orgId),
						),
					);
			} else {
				const [activeBotConfig] = await tx
					.select({ botConfigId: denteTelegramBotConfigs.botConfigId })
					.from(denteTelegramBotConfigs)
					.where(
						and(
							eq(denteTelegramBotConfigs.organizationId, orgId),
							eq(denteTelegramBotConfigs.isActive, true),
						),
					)
					.orderBy(desc(denteTelegramBotConfigs.updatedAt))
					.limit(1);

				await tx
					.insert(denteTelegramChatLinks)
					.values({
						organizationId: orgId,
						botConfigId: activeBotConfig?.botConfigId ?? "default",
						subjectType: "patient",
						subjectId: targetPatient.id,
						chatFingerprint,
						chatTransportRef: senderId,
						status: "active",
					});
			}
		}

		return {
			ok: true,
			patient: targetPatient,
			message: `Чат ${channel.toUpperCase()} успешно привязан к карте: ${targetPatient.fullName}`,
		};
	});
}
