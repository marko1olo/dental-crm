import type { DenteTelegramChatLink } from "@dental/shared";
import type { FastifyRequest } from "fastify";
import { hydrateDomainStateFromDb } from "../../db/domainStateHydration.js";
import type { DomainState } from "../../services/telegram/telegramLegacyMemoryStore.js";
import { inMemoryDomainState } from "../../services/telegram/telegramLegacyMemoryStore.js";
import { isDbConnectionError } from "../../services/telegram/TelegramReferralLoyaltyService.js";
import { upsertDenteTelegramChatLink } from "../../telegram/chatLinks.js";
import type { TelegramRuntimeContext } from "./types.js";

/**
 * Загружает срез клиники из базы (или возвращает in-memory при in-memory режиме)
 * и передает его в построители очереди отправок Telegram.
 */
export async function hydrateTelegramDomainState(
	_request: FastifyRequest,
	organizationId: string,
): Promise<DomainState> {
	try {
		const { state } = await hydrateDomainStateFromDb(organizationId);
		return state;
	} catch (err) {
		if (
			isDbConnectionError(err) &&
			(process.env.NODE_ENV === "test" || !process.env.DATABASE_URL)
		) {
			return inMemoryDomainState;
		}
		throw err;
	}
}

/**
 * Переносит только что созданную связку чата в таблицу `dente_telegram_chat_links`.
 */
export async function persistTelegramChatLinkToDatabase(
	request: FastifyRequest,
	runtime: TelegramRuntimeContext,
	chatLink: DenteTelegramChatLink,
): Promise<void> {
	try {
		await upsertDenteTelegramChatLink({
			organizationId: runtime.organizationId,
			clinicId: chatLink.clinicId ?? runtime.clinicId,
			botConfigId: runtime.botConfigId,
			subjectType: chatLink.subjectType,
			subjectId: chatLink.subjectId,
			chatFingerprint: chatLink.chatFingerprint,
			chatTransportRef: chatLink.chatTransportRef ?? null,
			chatIdLast4: chatLink.chatIdLast4 ?? null,
		});
	} catch (error) {
		request.log.error(
			{
				err: error,
				organizationId: runtime.organizationId,
				subjectType: chatLink.subjectType,
			},
			"[Telegram] Связка чата не записана в базу: напоминания этому пациенту не уйдут",
		);
	}
}
