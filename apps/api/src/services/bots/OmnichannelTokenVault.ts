import crypto from "node:crypto";

/**
 * Ошибки крипто-хранилища токенов многоканальных ботов.
 */
export class BotTokenVaultError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BotTokenVaultError";
	}
}

export class BotTokenVaultAuthenticationError extends BotTokenVaultError {
	constructor(
		message = "Подделка или нарушение целостности зашифрованного токена бота (AuthTag mismatch / AAD invalid).",
	) {
		super(message);
		this.name = "BotTokenVaultAuthenticationError";
	}
}

export const BOT_VAULT_VERSION_PREFIX = "enc:v1:";
export const GCM_IV_LENGTH_BYTES = 12; // 96 бит - стандарт NIST для GCM
export const GCM_TAG_LENGTH_BYTES = 16; // 128 бит - максимальная аутентификационная стойкость

/**
 * OmnichannelTokenVault — Универсальное защищенное крипто-хранилище токенов
 * для всех поддерживаемых каналов связи клиники (Telegram, VK, WhatsApp Cloud, Green-API, Max).
 *
 * МАНДАТ БЕЗОПАСНОСТИ:
 * 1. Категорический запрет на хранение открытых токенов в БД.
 * 2. Шифрование через AES-256-GCM с уникальной солью AAD организации (`organizationId`).
 * 3. Крипто-изоляция: зашифрованный токен одной клиники невозможно расшифровать под `organizationId` другой клиники.
 * 4. Безопасное маскирование при отдаче в UI (`vk1.a.****...` / `7123****...`).
 */
export class OmnichannelTokenVault {
	private static getMasterKey(): Buffer {
		const rawKey =
			process.env.OMNICHANNEL_BOT_VAULT_MASTER_KEY ||
			process.env.TELEGRAM_TOKEN_VAULT_MASTER_KEY ||
			process.env.APP_SECRET ||
			"DENTE_CLINIC_OMNICHANNEL_VAULT_MASTER_KEY_2026";

		return crypto.createHash("sha256").update(rawKey, "utf8").digest();
	}

	static isEncrypted(value: string | null | undefined): boolean {
		if (!value || typeof value !== "string") return false;
		return value.startsWith(BOT_VAULT_VERSION_PREFIX);
	}

	/**
	 * Шифрование токена или секрета бота через AES-256-GCM с привязкой к organizationId (AAD).
	 */
	static encrypt(rawToken: string, organizationId: string): string {
		const trimmedToken = rawToken?.trim();
		if (!trimmedToken) {
			throw new BotTokenVaultError("Невозможно зашифровать пустой токен/секрет бота.");
		}
		const trimmedOrgId = organizationId?.trim();
		if (!trimmedOrgId) {
			throw new BotTokenVaultError(
				"Для шифрования токена обязателен organizationId (крипто-изоляция арендатора).",
			);
		}

		if (this.isEncrypted(trimmedToken)) {
			try {
				this.decrypt(trimmedToken, trimmedOrgId);
				return trimmedToken;
			} catch {
				throw new BotTokenVaultAuthenticationError(
					"Попытка повторного шифрования невалидного токена для текущей организации.",
				);
			}
		}

		const masterKey = this.getMasterKey();
		const iv = crypto.randomBytes(GCM_IV_LENGTH_BYTES);
		const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

		cipher.setAAD(Buffer.from(trimmedOrgId, "utf8"));

		const ciphertext = Buffer.concat([
			cipher.update(trimmedToken, "utf8"),
			cipher.final(),
		]);
		const authTag = cipher.getAuthTag();

		return `${BOT_VAULT_VERSION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
	}

	/**
	 * Дешифрование токена или секрета бота с обязательной проверкой подлинности и AAD (organizationId).
	 */
	static decrypt(encryptedValue: string, organizationId: string): string {
		const trimmed = encryptedValue?.trim();
		if (!trimmed) {
			throw new BotTokenVaultError("Невозможно расшифровать пустую строку токена.");
		}
		const trimmedOrgId = organizationId?.trim();
		if (!trimmedOrgId) {
			throw new BotTokenVaultError("Для дешифрования токена обязателен organizationId.");
		}

		if (!this.isEncrypted(trimmed)) {
			return trimmed;
		}

		const payload = trimmed.slice(BOT_VAULT_VERSION_PREFIX.length);
		const parts = payload.split(":");
		if (parts.length !== 3) {
			throw new BotTokenVaultError("Некорректный формат зашифрованного токена (ожидалось 3 компонента).");
		}

		const [ivHex, tagHex, cipherHex] = parts;
		if (!ivHex || !tagHex || !cipherHex) {
			throw new BotTokenVaultError("Повреждены компоненты токена (IV, Tag или Ciphertext).");
		}

		try {
			const masterKey = this.getMasterKey();
			const iv = Buffer.from(ivHex, "hex");
			const authTag = Buffer.from(tagHex, "hex");
			const ciphertext = Buffer.from(cipherHex, "hex");

			if (iv.length !== GCM_IV_LENGTH_BYTES || authTag.length !== GCM_TAG_LENGTH_BYTES) {
				throw new BotTokenVaultError("Некорректная длина IV или AuthTag для AES-256-GCM.");
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
			if (err instanceof BotTokenVaultError) throw err;
			throw new BotTokenVaultAuthenticationError(
				`Ошибка криптографической аутентификации токена для клиники ${trimmedOrgId}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	/**
	 * Безопасное маскирование токена для показа в UI и логах.
	 */
	static maskToken(token: string | null | undefined): string {
		if (!token || typeof token !== "string") return "";
		const trimmed = token.trim();
		if (!trimmed) return "";

		if (this.isEncrypted(trimmed)) {
			return "enc:v1:****...";
		}

		if (trimmed.length <= 8) {
			return `${trimmed.slice(0, 3)}****...`;
		}

		const prefix = trimmed.slice(0, 4);
		return `${prefix}****...`;
	}

	/**
	 * Разрешение токена в боевое значение для сетевых вызовов (дешифрует или читает из env).
	 */
	static resolveToken(
		storedTokenOrRef: string | null | undefined,
		organizationId: string,
	): string | null {
		if (!storedTokenOrRef || typeof storedTokenOrRef !== "string") {
			return null;
		}

		const trimmed = storedTokenOrRef.trim();
		if (!trimmed) return null;

		if (this.isEncrypted(trimmed)) {
			return this.decrypt(trimmed, organizationId);
		}

		if (process.env[trimmed]) {
			return process.env[trimmed]!;
		}

		return trimmed;
	}

	/**
	 * Безопасное сравнение секретов со стойкостью к атакам по времени (Timing attack protection).
	 */
	static timingSafeEqual(
		a: string | null | undefined,
		b: string | null | undefined,
	): boolean {
		if (!a || !b) return false;
		const bufA = Buffer.from(a);
		const bufB = Buffer.from(b);
		if (bufA.length !== bufB.length) return false;
		return crypto.timingSafeEqual(bufA, bufB);
	}
}
