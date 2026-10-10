/**
 * DENTE CRM — Offline Backup & Vault Cryptography Helpers
 * Layer 1: Pure Cryptography (PBKDF2, AES-GCM-256, SHA-256 Checksum & Container Validation)
 */

import {
	DEFAULT_DENTE_BACKUP_PASSPHRASE,
	type DatabaseSnapshot,
	type DenteBackupHeader,
	type DenteBackupItemsCount,
	type DenteBackupPayload,
	type DenteBackupValidationResult,
	type DryRunRestoreResult,
	createDatabaseSnapshot,
	createEncryptedDenteBackup,
	executeDryRunRestoreCheck,
	restoreEncryptedDenteBackup,
	validateDenteBackupContainer,
	verifyDatabaseSnapshot,
	sha256Hex,
} from "@dental/shared";
import type { ExportBackupOptions } from "./types.js";

export {
	DEFAULT_DENTE_BACKUP_PASSPHRASE,
	createDatabaseSnapshot,
	createEncryptedDenteBackup,
	executeDryRunRestoreCheck,
	restoreEncryptedDenteBackup,
	validateDenteBackupContainer,
	verifyDatabaseSnapshot,
	sha256Hex,
};

/**
 * Валидация файла бэкапа и извлечение метаданных заголовка без расшифровки
 */
export function inspectDenteBackup(rawBackupText: string): DenteBackupValidationResult {
	return validateDenteBackupContainer(rawBackupText);
}

/**
 * Выполняет безопасный симуляционный Dry-run тест восстановления без записи в постоянное хранилище.
 */
export function runDryRunRestoreVerification(
	rawBackupText: string,
	options?: {
		passphrase?: string | undefined;
		targetOrganizationId?: string | undefined;
	},
): DryRunRestoreResult {
	return executeDryRunRestoreCheck(rawBackupText, {
		passphrase: options?.passphrase,
		targetOrganizationId: options?.targetOrganizationId,
	});
}

/**
 * Вычисляет SHA-256 хеш строки или бинарных данных
 */
export function computeDataSha256(data: string | Uint8Array): string {
	return sha256Hex(data);
}

/**
 * Деривация ключа PBKDF2-HMAC-SHA256 через Web Crypto API
 */
export async function deriveWebCryptoKey(
	passphrase: string,
	salt: Uint8Array,
	iterations = 100_000,
): Promise<CryptoKey> {
	if (typeof crypto === "undefined" || !crypto.subtle) {
		throw new Error("Web Crypto API недоступен в данном окружении");
	}
	const enc = new TextEncoder();
	const baseKey = await crypto.subtle.importKey(
		"raw",
		enc.encode(passphrase),
		{ name: "PBKDF2" },
		false,
		["deriveKey", "deriveBits"],
	);
	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: salt as BufferSource,
			iterations,
			hash: "SHA-256",
		},
		baseKey,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

/**
 * AES-GCM-256 шифрование через Web Crypto API
 */
export async function encryptWebCryptoAesGcm(
	plaintext: Uint8Array,
	key: CryptoKey,
	iv: Uint8Array,
): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }> {
	if (typeof crypto === "undefined" || !crypto.subtle) {
		throw new Error("Web Crypto API недоступен в данном окружении");
	}
	const encryptedBuffer = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: iv as BufferSource,
			tagLength: 128,
		},
		key,
		plaintext as BufferSource,
	);
	const encryptedBytes = new Uint8Array(encryptedBuffer);
	// In Web Crypto API AES-GCM, the 16-byte auth tag is appended at the end of the ciphertext
	const tagLength = 16;
	const ciphertextLength = encryptedBytes.length - tagLength;
	const ciphertext = encryptedBytes.slice(0, ciphertextLength);
	const authTag = encryptedBytes.slice(ciphertextLength);
	return { ciphertext, authTag };
}

/**
 * AES-GCM-256 дешифрование через Web Crypto API
 */
export async function decryptWebCryptoAesGcm(
	ciphertext: Uint8Array,
	authTag: Uint8Array,
	key: CryptoKey,
	iv: Uint8Array,
): Promise<Uint8Array> {
	if (typeof crypto === "undefined" || !crypto.subtle) {
		throw new Error("Web Crypto API недоступен в данном окружении");
	}
	const combined = new Uint8Array(ciphertext.length + authTag.length);
	combined.set(ciphertext, 0);
	combined.set(authTag, ciphertext.length);

	const decryptedBuffer = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: iv as BufferSource,
			tagLength: 128,
		},
		key,
		combined as BufferSource,
	);
	return new Uint8Array(decryptedBuffer);
}
