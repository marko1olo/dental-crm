/**
 * Обратимое шифрование идентификаторов чатов Telegram.
 *
 * Формат хранения в `dente_telegram_chat_links.chat_transport_ref`:
 *   v1.<iv base64url>.<tag base64url>.<шифртекст base64url>, AES-256-GCM.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ: тот же алгоритм лежит приватными функциями внутри
 * sampleData.ts (442 КБ), импортировать оттуда нельзя. Диспетчеру исходящих
 * сообщений идентификатор чата нужен для отправки, поэтому реализация вынесена
 * сюда как единственная переиспользуемая точка. Копию в sampleData.ts следует
 * заменить обращением к этому модулю — формат обязан оставаться одним.
 *
 * Ключ читается из DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY и никогда не логируется.
 * Без ключа функции возвращают null: это «нечем расшифровать», а не «пусто».
 */

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";

const CHAT_REF_VERSION = "v1";
/** AES-GCM: 96-битный IV и полный 128-битный тег. Обе длины проверяются явно. */
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

/** 32-байтовый ключ base64, 64-символьный hex или произвольная парольная фраза. */
export function telegramChatEncryptionKey(
	env: NodeJS.ProcessEnv = process.env,
): Buffer | null {
	const raw = env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY?.trim();
	if (!raw) return null;

	const base64Candidate = /^[A-Za-z0-9+/=]{43,88}$/.test(raw)
		? Buffer.from(raw, "base64")
		: null;
	if (base64Candidate?.length === 32) return base64Candidate;

	const hexCandidate = /^[a-fA-F0-9]{64}$/.test(raw)
		? Buffer.from(raw, "hex")
		: null;
	if (hexCandidate?.length === 32) return hexCandidate;

	return createHash("sha256").update(raw).digest();
}

export function encryptTelegramChatId(
	chatId: string | null | undefined,
	env: NodeJS.ProcessEnv = process.env,
): string | null {
	if (!chatId) return null;
	const key = telegramChatEncryptionKey(env);
	if (!key) return null;

	const iv = randomBytes(GCM_IV_BYTES);
	const cipher = createCipheriv("aes-256-gcm", key, iv, {
		authTagLength: GCM_TAG_BYTES,
	});
	const encrypted = Buffer.concat([
		cipher.update(chatId, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `${CHAT_REF_VERSION}.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptTelegramChatId(
	chatTransportRef: string | null | undefined,
	env: NodeJS.ProcessEnv = process.env,
): string | null {
	if (!chatTransportRef) return null;
	const key = telegramChatEncryptionKey(env);
	if (!key) return null;

	const [version, ivRaw, tagRaw, encryptedRaw] = chatTransportRef.split(".");
	if (version !== CHAT_REF_VERSION || !ivRaw || !tagRaw || !encryptedRaw)
		return null;

	// Длина тега проверяется явно, а не оставляется на усмотрение Node.
	// Без authTagLength setAuthTag принимает у GCM любой тег длиной 4..16 байт, а
	// chatTransportRef приходит извне — атакующий подсунул бы 4-байтовый тег и
	// сложность подделки упала бы с 2^128 до 2^32 (semgrep gcm-no-tag-length).
	// Существующие значения не ломаются: getAuthTag() всегда отдаёт 16 байт.
	const iv = Buffer.from(ivRaw, "base64url");
	const tag = Buffer.from(tagRaw, "base64url");
	if (iv.length !== GCM_IV_BYTES || tag.length !== GCM_TAG_BYTES) return null;

	try {
		const decipher = createDecipheriv("aes-256-gcm", key, iv, {
			authTagLength: GCM_TAG_BYTES,
		});
		decipher.setAuthTag(tag);
		return Buffer.concat([
			decipher.update(Buffer.from(encryptedRaw, "base64url")),
			decipher.final(),
		]).toString("utf8");
	} catch {
		// Подменённый или испорченный шифртекст не проходит проверку тега.
		return null;
	}
}
