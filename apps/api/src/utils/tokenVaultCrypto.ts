import crypto from "node:crypto";

export const TOKEN_VAULT_VERSION_PREFIX = "enc:v1:";
export const GCM_IV_LENGTH_BYTES = 12;
export const GCM_TAG_LENGTH_BYTES = 16;

const ALLOWED_ENV_REF_PREFIX =
	/^(DENTE_|TELEGRAM_|OMNICHANNEL_|VK_|MAX_|WHATSAPP_|GREEN_API_)[A-Z0-9_]+$/;

export class VaultCryptoFormatError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "VaultCryptoFormatError";
	}
}

export class VaultCryptoAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "VaultCryptoAuthError";
	}
}

export function deriveVaultMasterKey(
	envKeys: readonly string[],
	devFallback: string,
	vaultLabel: string,
): Buffer {
	for (const keyName of envKeys) {
		const raw = process.env[keyName]?.trim();
		if (raw) {
			return crypto.createHash("sha256").update(raw, "utf8").digest();
		}
	}
	if (process.env.NODE_ENV === "production") {
		throw new VaultCryptoFormatError(
			`${vaultLabel}: отсутствует мастер-ключ шифрования (${envKeys.join(" / ")}) в production-окружении.`,
		);
	}
	return crypto.createHash("sha256").update(devFallback, "utf8").digest();
}

export function isVaultTokenEncrypted(value: string | null | undefined): boolean {
	if (!value || typeof value !== "string") return false;
	return value.startsWith(TOKEN_VAULT_VERSION_PREFIX);
}

export function encryptVaultToken(
	rawToken: string,
	organizationId: string,
	masterKey: Buffer,
): string {
	const trimmedToken = rawToken?.trim();
	if (!trimmedToken) {
		throw new VaultCryptoFormatError("Невозможно зашифровать пустой токен/секрет.");
	}
	const trimmedOrgId = organizationId?.trim();
	if (!trimmedOrgId) {
		throw new VaultCryptoFormatError(
			"Для шифрования токена обязателен organizationId (крипто-изоляция арендатора).",
		);
	}

	if (isVaultTokenEncrypted(trimmedToken)) {
		decryptVaultToken(trimmedToken, trimmedOrgId, masterKey);
		return trimmedToken;
	}

	const iv = crypto.randomBytes(GCM_IV_LENGTH_BYTES);
	const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);
	cipher.setAAD(Buffer.from(trimmedOrgId, "utf8"));

	const ciphertext = Buffer.concat([
		cipher.update(trimmedToken, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return `${TOKEN_VAULT_VERSION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptVaultToken(
	encryptedValue: string,
	organizationId: string,
	masterKey: Buffer,
): string {
	const trimmed = encryptedValue?.trim();
	if (!trimmed) {
		throw new VaultCryptoFormatError("Невозможно расшифровать пустую строку токена.");
	}
	const trimmedOrgId = organizationId?.trim();
	if (!trimmedOrgId) {
		throw new VaultCryptoFormatError("Для дешифрования токена обязателен organizationId.");
	}

	if (!isVaultTokenEncrypted(trimmed)) {
		return trimmed;
	}

	const payload = trimmed.slice(TOKEN_VAULT_VERSION_PREFIX.length);
	const parts = payload.split(":");
	if (parts.length !== 3) {
		throw new VaultCryptoFormatError(
			"Некорректный формат зашифрованного токена (ожидалось 3 компонента).",
		);
	}

	const [ivHex, tagHex, cipherHex] = parts;
	if (!ivHex || !tagHex || !cipherHex) {
		throw new VaultCryptoFormatError(
			"Повреждены компоненты токена (IV, Tag или Ciphertext).",
		);
	}

	const iv = Buffer.from(ivHex, "hex");
	const authTag = Buffer.from(tagHex, "hex");
	const ciphertext = Buffer.from(cipherHex, "hex");

	if (iv.length !== GCM_IV_LENGTH_BYTES || authTag.length !== GCM_TAG_LENGTH_BYTES) {
		throw new VaultCryptoFormatError("Некорректная длина IV или AuthTag для AES-256-GCM.");
	}

	try {
		const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
		decipher.setAAD(Buffer.from(trimmedOrgId, "utf8"));
		decipher.setAuthTag(authTag);

		const decrypted = Buffer.concat([
			decipher.update(ciphertext),
			decipher.final(),
		]);
		return decrypted.toString("utf8");
	} catch (err: unknown) {
		throw new VaultCryptoAuthError(
			`Ошибка криптографической аутентификации токена для организации ${trimmedOrgId}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

const TEST_ENV_REF_PATTERN = /^TEST_[A-Z0-9_]+$/;

export function resolveVaultOperationalToken(
	storedTokenOrRef: string | null | undefined,
	organizationId: string,
	decryptFn: (encryptedValue: string, orgId: string) => string,
): string | null {
	if (!storedTokenOrRef || typeof storedTokenOrRef !== "string") {
		return null;
	}
	const trimmed = storedTokenOrRef.trim();
	if (!trimmed) return null;

	if (isVaultTokenEncrypted(trimmed)) {
		return decryptFn(trimmed, organizationId);
	}

	const isAllowedEnvRef =
		ALLOWED_ENV_REF_PREFIX.test(trimmed) ||
		(process.env.NODE_ENV !== "production" && TEST_ENV_REF_PATTERN.test(trimmed));
	if (isAllowedEnvRef) {
		const envVal = process.env[trimmed];
		if (envVal) return envVal;
	}

	return trimmed;
}
