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
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

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

export const BOT_VAULT_VERSION_PREFIX = TOKEN_VAULT_VERSION_PREFIX;
export { GCM_IV_LENGTH_BYTES, GCM_TAG_LENGTH_BYTES };

/**
 * OmnichannelTokenVault — Универсальное защищенное крипто-хранилище токенов
 * для всех поддерживаемых каналов связи клиники (Telegram, VK, WhatsApp Cloud, Green-API, Max).
 */
export class OmnichannelTokenVault {
	private static getMasterKey(): Buffer {
		try {
			return deriveVaultMasterKey(
				[
					"OMNICHANNEL_BOT_VAULT_MASTER_KEY",
					"TELEGRAM_TOKEN_VAULT_MASTER_KEY",
					"APP_SECRET",
				],
				"DENTE_CLINIC_OMNICHANNEL_VAULT_MASTER_KEY_2026",
				"OmnichannelTokenVault",
			);
		} catch (err: unknown) {
			throw new BotTokenVaultError(err instanceof Error ? err.message : String(err));
		}
	}

	static isEncrypted(value: string | null | undefined): boolean {
		return isVaultTokenEncrypted(value);
	}

	/**
	 * Шифрование токена или секрета бота через AES-256-GCM с привязкой к organizationId (AAD).
	 */
	static encrypt(rawToken: string, organizationId: string): string {
		try {
			return encryptVaultToken(rawToken, organizationId, this.getMasterKey());
		} catch (err: unknown) {
			if (err instanceof VaultCryptoAuthError) {
				throw new BotTokenVaultAuthenticationError(
					"Попытка повторного шифрования невалидного токена для текущей организации.",
				);
			}
			if (err instanceof VaultCryptoFormatError) {
				throw new BotTokenVaultError(err.message);
			}
			throw err;
		}
	}

	/**
	 * Дешифрование токена или секрета бота с обязательной проверкой подлинности и AAD (organizationId).
	 */
	static decrypt(encryptedValue: string, organizationId: string): string {
		try {
			return decryptVaultToken(encryptedValue, organizationId, this.getMasterKey());
		} catch (err: unknown) {
			if (err instanceof VaultCryptoAuthError) {
				throw new BotTokenVaultAuthenticationError(err.message);
			}
			if (err instanceof VaultCryptoFormatError) {
				throw new BotTokenVaultError(err.message);
			}
			throw err;
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
		return resolveVaultOperationalToken(
			storedTokenOrRef,
			organizationId,
			(enc, orgId) => this.decrypt(enc, orgId),
		);
	}

	static resolveOperationalToken(
		storedTokenOrRef: string | null | undefined,
		organizationId: string,
	): string | null {
		return this.resolveToken(storedTokenOrRef, organizationId);
	}

	/**
	 * Безопасное сравнение секретов со стойкостью к атакам по времени (Timing attack protection).
	 */
	static timingSafeEqual(
		a: string | null | undefined,
		b: string | null | undefined,
	): boolean {
		return timingSafeSecretEqual(a ?? null, b ?? null);
	}
}
