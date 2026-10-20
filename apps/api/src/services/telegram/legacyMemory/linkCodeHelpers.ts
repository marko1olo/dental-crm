/**
 * linkCodeHelpers.ts
 *
 * Cryptographic helpers, link code normalization, subject validation and ledger options.
 */

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";
import type {
	DenteTelegramChatLink,
	DenteTelegramChatLinkListResponse,
	DenteTelegramLinkCode,
} from "@dental/shared";
import {
	denteTelegramChatLinkListResponseSchema,
	denteTelegramChatLinkPublicSchema,
} from "@dental/shared";
import type {
	BuildDenteTelegramChatLinkListOptions,
	DenteTelegramChatLinkListStatusFilter,
	NormalizedDenteTelegramLedgerOptions,
} from "./types.js";
import {
	clinicProfile,
	denteTelegramChatLinks,
	denteTelegramLinkCodes,
	patients,
	persistMutableState,
	staffMembers,
} from "./storeState.js";
import {
	configuredTelegramBotConfigId,
	denteTelegramBotSettings,
} from "./botSettings.js";

export function telegramChatEncryptionKey(): Buffer | null {
	const raw = process.env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY?.trim();
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

export function encryptTelegramChatId(chatId: string | null): string | null {
	if (!chatId) return null;
	const key = telegramChatEncryptionKey();
	if (!key) return null;
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([
		cipher.update(chatId, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptTelegramChatTransportRef(
	chatTransportRef: string | null | undefined,
): string | null {
	if (!chatTransportRef) return null;
	const key = telegramChatEncryptionKey();
	if (!key) return null;
	const [version, ivRaw, tagRaw, encryptedRaw] = chatTransportRef.split(".");
	if (version !== "v1" || !ivRaw || !tagRaw || !encryptedRaw) return null;
	try {
		const decipher = createDecipheriv(
			"aes-256-gcm",
			key,
			Buffer.from(ivRaw, "base64url"),
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			{ authTagLength: 16 } as any,
		);
		decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
		return Buffer.concat([
			decipher.update(Buffer.from(encryptedRaw, "base64url")),
			decipher.final(),
		]).toString("utf8");
	} catch {
		return null;
	}
}

export function telegramChatEncryptionReady(): boolean {
	return Boolean(telegramChatEncryptionKey());
}

export function chatIdLast4(chatId: string | null): string | null {
	const normalized = chatId?.trim();
	return normalized ? normalized.slice(-4) : null;
}

export function normalizeDenteTelegramLinkCode(code: string): string {
	return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function fingerprintDenteTelegramLinkCode(code: string): string {
	const salt =
		process.env.DENTE_TELEGRAM_LINK_CODE_SALT?.trim() ||
		denteTelegramBotSettings.organizationId;
	return createHash("sha256")
		.update(`${salt}:${normalizeDenteTelegramLinkCode(code)}`)
		.digest("hex");
}

export function expireStaleDenteTelegramLinkCodes(now = new Date()): void {
	let changed = false;
	for (const code of denteTelegramLinkCodes) {
		if (
			code.status === "pending" &&
			Date.parse(code.expiresAt) <= now.getTime()
		) {
			code.status = "expired";
			changed = true;
		}
	}
	if (changed) persistMutableState();
}

export function validateDenteTelegramSubject(
	subjectType: "patient" | "staff",
	subjectId: string,
	organizationScope: string,
): void {
	const subject =
		subjectType === "patient"
			? patients.find(
					(patient) =>
						patient.organizationId === organizationScope &&
						patient.id === subjectId,
				)
			: staffMembers.find(
					(staff) =>
						staff.organizationId === organizationScope &&
						staff.id === subjectId,
				);
	if (!subject) {
		throw new Error(`Субъект привязки Telegram не найден: ${subjectType}.`);
	}
	if (
		subjectType === "patient" &&
		"status" in subject &&
		subject.status !== "active"
	) {
		throw new Error("Telegram можно привязать только к активному пациенту.");
	}
	if (subjectType === "staff" && "active" in subject && !subject.active) {
		throw new Error(
			"Telegram можно привязать только к активному сотруднику клиники.",
		);
	}
}

export function resolveDenteTelegramClinicId(
	inputClinicId: string | null | undefined,
	organizationScope: string,
): string {
	return (
		inputClinicId?.trim() ||
		(organizationScope === clinicProfile.organizationId
			? clinicProfile.organizationId
			: organizationScope)
	);
}

export function publicDenteTelegramLinkCode(
	code: DenteTelegramLinkCode,
): Omit<DenteTelegramLinkCode, "codeFingerprint"> {
	const { codeFingerprint: _codeFingerprint, ...publicCode } = code;
	return publicCode;
}

export function extractDenteTelegramLinkCode(
	text: string | null,
): string | null {
	if (!text) return null;
	const match = text
		.toUpperCase()
		.match(/\bDENTE-(?:[A-F0-9]{24}|[A-F0-9]{8})\b/);
	return match ? normalizeDenteTelegramLinkCode(match[0]) : null;
}

export function normalizeDenteTelegramLedgerOptions<TStatus extends string>(
	input:
		| number
		| {
				limit?: number;
				cursor?: string | null;
				status?: TStatus;
				subjectType?: "patient" | "staff" | "all";
				subjectId?: string | null;
				organizationId?: string | null;
				clinicId?: string | null;
				botConfigId?: string | null;
		  },
	fallbackStatus: TStatus,
): NormalizedDenteTelegramLedgerOptions<TStatus> {
	const source = typeof input === "number" ? { limit: input } : input;
	const parsedLimit = Number(source.limit ?? 50);
	const limit = Number.isFinite(parsedLimit)
		? Math.max(1, Math.min(200, Math.trunc(parsedLimit)))
		: 50;
	const parsedCursor = Number.parseInt(source.cursor ?? "0", 10);
	const cursor = String(
		Math.max(0, Number.isFinite(parsedCursor) ? parsedCursor : 0),
	);
	return {
		limit,
		cursor,
		status: source.status ?? fallbackStatus,
		subjectType: source.subjectType ?? "all",
		subjectId: source.subjectId?.trim() || null,
		organizationId:
			source.organizationId?.trim() || denteTelegramBotSettings.organizationId,
		clinicId: source.clinicId?.trim() || clinicProfile.organizationId,
		botConfigId: source.botConfigId?.trim() || configuredTelegramBotConfigId(),
	};
}

export function _listDenteTelegramChatLinks(limit = 50): DenteTelegramChatLink[] {
	const currentClinicId = clinicProfile.organizationId;
	const botConfigId = configuredTelegramBotConfigId();
	return denteTelegramChatLinks
		.filter(
			(link) =>
				link.organizationId === denteTelegramBotSettings.organizationId &&
				link.botConfigId === botConfigId &&
				(link.clinicId === currentClinicId || link.clinicId === null),
		)
		.slice(0, Math.max(0, Math.min(100, limit)));
}

export function _buildDenteTelegramChatLinkList(
	input: number | BuildDenteTelegramChatLinkListOptions = 50,
): DenteTelegramChatLinkListResponse {
	const options =
		normalizeDenteTelegramLedgerOptions<DenteTelegramChatLinkListStatusFilter>(
			input,
			"all",
		);
	const currentClinicId = options.clinicId;
	const visibleLinks = denteTelegramChatLinks.filter(
		(link) =>
			link.organizationId === options.organizationId &&
			link.botConfigId === options.botConfigId &&
			(link.clinicId === currentClinicId || link.clinicId === null),
	);
	const filteredLinks = visibleLinks.filter((link) => {
		if (options.status !== "all" && link.status !== options.status)
			return false;
		if (
			options.subjectType !== "all" &&
			link.subjectType !== options.subjectType
		)
			return false;
		if (options.subjectId && link.subjectId !== options.subjectId) return false;
		return true;
	});
	const offset = Number.parseInt(options.cursor, 10);
	const start = Math.max(0, Number.isFinite(offset) ? offset : 0);
	const items = filteredLinks
		.slice(start, start + options.limit)
		.map((link) => denteTelegramChatLinkPublicSchema.parse(link));
	const nextOffset = start + items.length;
	return denteTelegramChatLinkListResponseSchema.parse({
		totalCount: visibleLinks.length,
		filteredCount: filteredLinks.length,
		limit: options.limit,
		cursor: options.cursor === "0" ? null : options.cursor,
		nextCursor: nextOffset < filteredLinks.length ? String(nextOffset) : null,
		activeCount: visibleLinks.filter((link) => link.status === "active").length,
		revokedCount: visibleLinks.filter((link) => link.status === "revoked")
			.length,
		chatLinks: items,
	});
}
