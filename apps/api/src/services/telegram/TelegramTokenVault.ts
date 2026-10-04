import crypto from "node:crypto";

/**
 * Ошибки крипто-хранилища токенов Telegram.
 */
export class TelegramTokenVaultError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TelegramTokenVaultError";
	}
}

export class TelegramTokenVaultAuthenticationError extends TelegramTokenVaultError {
	constructor(message = "Подделка или нарушение целостности зашифрованного токена Telegram (AuthTag mismatch / AAD invalid).") {
		super(message);
		this.name = "TelegramTokenVaultAuthenticationError";
	}
}

/**
 * Префикс версии крипто-хранилища токенов.
 */
export const TOKEN_VAULT_VERSION_PREFIX = "enc:v1:";

/**
 * Параметры AES-256-GCM.
 */
export const GCM_IV_LENGTH_BYTES = 12; // 96 бит - стандарт NIST для GCM
export const GCM_TAG_LENGTH_BYTES = 16; // 128 бит - максимальная аутентификационная стойкость

/**
 * TelegramTokenVault — Безопасное крипто-изолированное хранилище токенов Telegram-ботов для DENTE SaaS.
 * 
 * МАНДАТ БЕЗОПАСНОСТИ:
 * 1. Категорический запрет на хранение открытых токенов ботов в БД или открытых логах.
 * 2. Шифрование токенов через AES-256-GCM с уникальной солью / AAD организации (`organizationId`).
 * 3. Крипто-изоляция: зашифрованный токен одной клиники невозможно расшифровать под `organizationId` другой клиники.
 * 4. Маскирование токена при выдаче на фронтенд (`7123****...`).
 */
export class TelegramTokenVault {
	/**
	 * Получение 256-битного мастер-ключа шифрования.
	 */
	private static getMasterKey(): Buffer {
		const rawKey =
			process.env.TELEGRAM_TOKEN_VAULT_MASTER_KEY ||
			process.env.APP_SECRET ||
			"DENTE_CLINIC_TELEGRAM_VAULT_MASTER_SECRET_KEY_2026";

		// Хешируем мастер-ключ в строгие 32 байта (256 бит) через SHA-256
		return crypto.createHash("sha256").update(rawKey, "utf8").digest();
	}

	/**
	 * Проверка, зашифрован ли токен в формате хранилища.
	 */
	static isEncrypted(value: string | null | undefined): boolean {
		if (!value || typeof value !== "string") return false;
		return value.startsWith(TOKEN_VAULT_VERSION_PREFIX);
	}

	/**
	 * Шифрование токена Telegram бота через AES-256-GCM с привязкой к organizationId (AAD).
	 *
	 * @param rawToken Исходный токен от BotFather (например `7123456789:AAFn_SomeToken...`)
	 * @param organizationId UUID организации клиники (выступает в качестве AAD — Additional Authenticated Data)
	 * @returns Зашифрованная строка в формате `enc:v1:<ivHex>:<tagHex>:<ciphertextHex>`
	 */
	static encryptToken(rawToken: string, organizationId: string): string {
		const trimmedToken = rawToken?.trim();
		if (!trimmedToken) {
			throw new TelegramTokenVaultError("Невозможно зашифровать пустой токен Telegram.");
		}
		const trimmedOrgId = organizationId?.trim();
		if (!trimmedOrgId) {
			throw new TelegramTokenVaultError("Для шифрования токена обязателен organizationId (крипто-изоляция).");
		}

		// Если токен уже зашифрован, проверяем его валидность для этой организации
		if (this.isEncrypted(trimmedToken)) {
			try {
				// Проверяем, что он расшифровывается именно для этой orgId
				this.decryptToken(trimmedToken, trimmedOrgId);
				return trimmedToken;
			} catch {
				// Если не расшифровался, значит это чужой токен или поврежден
				throw new TelegramTokenVaultAuthenticationError(
					"Попытка повторного шифрования невалидного токена для текущей организации.",
				);
			}
		}

		const masterKey = this.getMasterKey();
		const iv = crypto.randomBytes(GCM_IV_LENGTH_BYTES);
		const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

		// Устанавливаем AAD (Additional Authenticated Data) — привязываем шифротекст к конкретной организации
		cipher.setAAD(Buffer.from(trimmedOrgId, "utf8"));

		const ciphertext = Buffer.concat([
			cipher.update(trimmedToken, "utf8"),
			cipher.final(),
		]);
		const authTag = cipher.getAuthTag();

		return `${TOKEN_VAULT_VERSION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
	}

	/**
	 * Дешифрование токена Telegram бота с верификацией целостности и AAD (organizationId).
	 *
	 * @param encryptedToken Зашифрованная строка формата `enc:v1:<ivHex>:<tagHex>:<ciphertextHex>`
	 * @param organizationId UUID организации клиники
	 * @returns Исходный расшифрованный токен бота
	 */
	static decryptToken(encryptedToken: string, organizationId: string): string {
		const trimmed = encryptedToken?.trim();
		if (!trimmed) {
			throw new TelegramTokenVaultError("Невозможно расшифровать пустую строку токена.");
		}
		const trimmedOrgId = organizationId?.trim();
		if (!trimmedOrgId) {
			throw new TelegramTokenVaultError("Для дешифрования токена обязателен organizationId.");
		}

		// Если передан незашифрованный токен (обратная совместимость во время миграции)
		if (!this.isEncrypted(trimmed)) {
			return trimmed;
		}

		const payload = trimmed.slice(TOKEN_VAULT_VERSION_PREFIX.length);
		const parts = payload.split(":");
		if (parts.length !== 3) {
			throw new TelegramTokenVaultError("Некорректный формат зашифрованного токена (ожидалось 3 компонента).");
		}

		const [ivHex, tagHex, cipherHex] = parts;
		if (!ivHex || !tagHex || !cipherHex) {
			throw new TelegramTokenVaultError("Повреждены криптографические компоненты токена (IV, Tag или Ciphertext).");
		}

		try {
			const masterKey = this.getMasterKey();
			const iv = Buffer.from(ivHex, "hex");
			const authTag = Buffer.from(tagHex, "hex");
			const ciphertext = Buffer.from(cipherHex, "hex");

			if (iv.length !== GCM_IV_LENGTH_BYTES || authTag.length !== GCM_TAG_LENGTH_BYTES) {
				throw new TelegramTokenVaultError("Некорректная длина IV или AuthTag для AES-256-GCM.");
			}

			const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
			decipher.setAAD(Buffer.from(trimmedOrgId, "utf8"));
			decipher.setAuthTag(authTag);

			const decrypted = Buffer.concat([
				decipher.update(ciphertext),
				decipher.final(),
			]);

			return decrypted.toString("utf8");
		} catch (err: unknown) {
			if (err instanceof TelegramTokenVaultError) throw err;
			// Любая ошибка расшифровки или несовпадения тега означает попытку взлома или чужую организацию
			throw new TelegramTokenVaultAuthenticationError(
				`Ошибка криптографической аутентификации токена для организации ${trimmedOrgId}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	/**
	 * Маскирование токена при выдаче на фронтенд (`7123****...`).
	 * Безопасно для показа администраторам в UI и для логирования.
	 */
	static maskToken(token: string | null | undefined): string {
		if (!token || typeof token !== "string") return "";
		const trimmed = token.trim();
		if (!trimmed) return "";

		// Если передан зашифрованный токен, маскируем его специальным образом
		if (this.isEncrypted(trimmed)) {
			return "enc:v1:****...";
		}

		// Если это стандартный токен Telegram (например, 7123456789:AAFn_...)
		// ТЗ требует маскирование вида "7123****..."
		if (trimmed.length <= 8) {
			return `${trimmed.slice(0, 4)}****...`;
		}

		const prefix = trimmed.slice(0, 4);
		return `${prefix}****...`;
	}

	/**
	 * Разрешение токена в боевое значение для сетевых запросов.
	 * Поддерживает:
	 * 1. Зашифрованные токены `enc:v1:...` (дешифрует через AES-256-GCM с orgId)
	 * 2. Ссылки на переменные окружения (например `DENTE_TELEGRAM_BOT_TOKEN`)
	 * 3. Прямые токены Telegram Bot API
	 */
	static resolveOperationalToken(
		storedTokenOrRef: string | null | undefined,
		organizationId: string,
	): string | null {
		if (!storedTokenOrRef || typeof storedTokenOrRef !== "string") {
			return null;
		}

		const trimmed = storedTokenOrRef.trim();
		if (!trimmed) return null;

		// 1. Если это зашифрованный токен
		if (this.isEncrypted(trimmed)) {
			return this.decryptToken(trimmed, organizationId);
		}

		// 2. Если это ссылка на переменную окружения
		if (process.env[trimmed]) {
			return process.env[trimmed]!;
		}

		// 3. Если это прямой токен бота
		return trimmed;
	}
}
