import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { denteTelegramChatLinks, messengerInboundEvents, patients } from "../../../db/schema.js";
import type { BotChannel } from "../../../services/bots/types.js";

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
	createNew?: { fullName: string; phone?: string | null },
): Promise<{
	ok: boolean;
	statusCode?: number;
	error?: string;
	message?: string;
	patient?: { id: string; fullName: string; phone: string | null };
}> {
	let targetPatient: { id: string; fullName: string; phone: string | null } | null = null;

	if (patientId) {
		const [existing] = await db
			.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
			.from(patients)
			.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
			.limit(1);

		if (!existing) {
			return { ok: false, statusCode: 404, error: "PatientNotFound", message: "Пациент не найден." };
		}
		targetPatient = existing;
	} else if (createNew && createNew.fullName.trim()) {
		const [created] = await db
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
	await db
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
		const chatFingerprint = createHash("sha256").update(senderId).digest("hex");
		const [existingLink] = await db
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
			await db
				.update(denteTelegramChatLinks)
				.set({
					subjectType: "patient",
					subjectId: targetPatient.id,
					chatTransportRef: senderId,
					status: "active",
					lastUpdateAt: new Date(),
				})
				.where(eq(denteTelegramChatLinks.id, existingLink.id));
		} else {
			await db
				.insert(denteTelegramChatLinks)
				.values({
					organizationId: orgId,
					botConfigId: "default",
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
}
