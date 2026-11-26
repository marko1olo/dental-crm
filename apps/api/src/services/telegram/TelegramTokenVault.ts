import {
	deriveVaultMasterKey,
	decryptVaultToken,
	encryptVaultToken,
	GCM_IV_LENGTH_BYTES,
	GCM_TAG_LENGTH_BYTES,
	isVaultTokenEncrypted,
	resolveVaultOperationalToken,
	TOKEN_VAULT_VERSION_PREFIX,
	VaultCryptoAuthError,
	VaultCryptoFormatError,
} from "../../utils/tokenVaultCrypto.js";

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
	constructor(
		message = "Подделка или нарушение целостности зашифрованного токена Telegram (AuthTag mismatch / AAD invalid).",
	) {
		super(message);
		this.name = "TelegramTokenVaultAuthenticationError";
	}
}

export { TOKEN_VAULT_VERSION_PREFIX, GCM_IV_LENGTH_BYTES, GCM_TAG_LENGTH_BYTES };

/**
 * TelegramTokenVault — Безопасное крипто-изолированное хранилище токенов Telegram-ботов для DENTE SaaS.
 */
export class TelegramTokenVault {
	private static getMasterKey(): Buffer {
		try {
			return deriveVaultMasterKey(
				["TELEGRAM_TOKEN_VAULT_MASTER_KEY", "APP_SECRET"],
				"DENTE_CLINIC_TELEGRAM_VAULT_MASTER_SECRET_KEY_2026",
				"TelegramTokenVault",
			);
		} catch (err: unknown) {
			throw new TelegramTokenVaultError(err instanceof Error ? err.message : String(err));
		}
	}

	/**
	 * Проверка, зашифрован ли токен в формате хранилища.
	 */
	static isEncrypted(value: string | null | undefined): boolean {
		return isVaultTokenEncrypted(value);
	}

	/**
	 * Шифрование токена Telegram бота через AES-256-GCM с привязкой к organizationId (AAD).
	 */
	static encryptToken(rawToken: string, organizationId: string): string {
		try {
			return encryptVaultToken(rawToken, organizationId, this.getMasterKey());
		} catch (err: unknown) {
			if (err instanceof VaultCryptoAuthError) {
				throw new TelegramTokenVaultAuthenticationError(
					"Попытка повторного шифрования невалидного токена для текущей организации.",
				);
			}
			if (err instanceof VaultCryptoFormatError) {
				throw new TelegramTokenVaultError(err.message);
			}
			throw err;
		}
	}

	/**
	 * Дешифрование токена Telegram бота с верификацией целостности и AAD (organizationId).
	 */
	static decryptToken(encryptedToken: string, organizationId: string): string {
		try {
			return decryptVaultToken(encryptedToken, organizationId, this.getMasterKey());
		} catch (err: unknown) {
			if (err instanceof VaultCryptoAuthError) {
				throw new TelegramTokenVaultAuthenticationError(err.message);
			}
			if (err instanceof VaultCryptoFormatError) {
				throw new TelegramTokenVaultError(err.message);
			}
			throw err;
		}
	}

	/**
	 * Маскирование токена при выдаче на фронтенд (`7123****...`).
	 */
	static maskToken(token: string | null | undefined): string {
		if (!token || typeof token !== "string") return "";
		const trimmed = token.trim();
		if (!trimmed) return "";

		if (this.isEncrypted(trimmed)) {
			return "enc:v1:****...";
		}

		const prefix = trimmed.slice(0, 4);
		return `${prefix}****...`;
	}

	/**
	 * Разрешение токена в боевое значение для сетевых запросов.
	 */
	static resolveOperationalToken(
		storedTokenOrRef: string | null | undefined,
		organizationId: string,
	): string | null {
		return resolveVaultOperationalToken(
			storedTokenOrRef,
			organizationId,
			(enc, orgId) => this.decryptToken(enc, orgId),
		);
	}
}
