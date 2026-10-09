import { TelegramTokenVault } from "../TelegramTokenVault.js";

/**
 * Модуль криптографической безопасности токенов Telegram Bot API (Layer 1).
 * Обеспечивает:
 * - Валидацию синтаксического формата токена (формат BotFather: digits:base64url)
 * - Маскирование токенов в логах и ответах API (защита от утечек)
 * - AES-256-GCM шифрование с мультитенантным AAD (organizationId)
 * - Безопасное извлечение операционного токена для рантайма
 */
export class TelegramTokenCrypto {
	/**
	 * Валидация формата токена бота.
	 * Формат BotFather: `<bot_id>:<token_secret>`, где bot_id - число от 5 до 16 цифр.
	 */
	static isValidBotTokenFormat(token: string | null | undefined): boolean {
		if (!token) return false;
		const trimmed = token.trim();
		if (!trimmed || !trimmed.includes(":")) return false;
		const [idPart, secretPart] = trimmed.split(":");
		if (!idPart || !secretPart) return false;
		if (!/^\d{5,16}$/.test(idPart)) return false;
		if (secretPart.length < 20) return false;
		return true;
	}

	/**
	 * Безопасное маскирование токена для отображения в логах и UI.
	 * Пример: "1234567890:ABCdefGHIjklMNOpq" -> "123456:***pq"
	 */
	static maskToken(token: string | null | undefined): string {
		if (!token) return "";
		return TelegramTokenVault.maskToken(token);
	}

	/**
	 * AES-256-GCM шифрование токена с привязкой к тенанту (organizationId).
	 */
	static encryptToken(rawToken: string, organizationId: string): string {
		const trimmed = rawToken.trim();
		return TelegramTokenVault.encryptToken(trimmed, organizationId);
	}

	/**
	 * Безопасное извлечение и расшифровка операционного токена.
	 */
	static resolveOperationalToken(
		tokenSecretRef: string | null | undefined,
		organizationId: string,
	): string | null {
		if (!tokenSecretRef) return null;
		return TelegramTokenVault.resolveOperationalToken(tokenSecretRef, organizationId);
	}
}
