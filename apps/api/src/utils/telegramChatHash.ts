import { createHash } from "node:crypto";

/**
 * Единый 64-символьный SHA-256 отпечаток Telegram/мессенджерного chatId/senderId
 * для referral и omnichannel triage модулей (Мандат SSOT).
 */
export function hashTelegramChatFingerprint(senderOrChatId: string | number): string {
	return createHash("sha256").update(String(senderOrChatId)).digest("hex");
}
