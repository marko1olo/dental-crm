/**
 * linkCodes.ts
 *
 * Link code generation, verification, consumption and chat link revocation.
 */

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
	randomUUID,
	timingSafeEqual,
} from "node:crypto";
import type {
	CreateDenteTelegramLinkCodeInput,
	DenteTelegramChatLink,
	DenteTelegramChatLinkListResponse,
	DenteTelegramLinkCode,
	DenteTelegramLinkCodeCreated,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramLinkCodeStatus,
} from "@dental/shared";
import {
	denteTelegramChatLinkListResponseSchema,
	denteTelegramChatLinkPublicSchema,
	denteTelegramLinkCodeCreatedSchema,
	denteTelegramLinkCodeListResponseSchema,
} from "@dental/shared";
import { createTelegramQrSvg } from "../../../telegramQr.js";
import type {
	BuildDenteTelegramChatLinkListOptions,
	BuildDenteTelegramLinkCodeListOptions,
	DenteTelegramChatLinkListStatusFilter,
	DenteTelegramLinkCodeListStatusFilter,
	NormalizedDenteTelegramLedgerOptions,
} from "./types.js";
import {
	denteTelegramChatLinks,
	denteTelegramLinkCodes,
	inMemoryDomainState,
	recordAuditEvent,
	organizationId,
} from "./storeState.js";
import {
	getDenteTelegramBotSettings,
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

function encryptTelegramChatId(chatId: string | null): string | null {
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

function telegramChatEncryptionReady(): boolean {
	return Boolean(telegramChatEncryptionKey());
}

function chatIdLast4(chatId: string | null): string | null {
	const normalized = chatId?.trim();
	return normalized ? normalized.slice(-4) : null;
}

function normalizeDenteTelegramLinkCode(code: string): string {
	return code.trim().toUpperCase().replace(/\s+/g, "");
}

function fingerprintDenteTelegramLinkCode(code: string): string {
	const salt =
		process.env.DENTE_TELEGRAM_LINK_CODE_SALT?.trim() ||
		denteTelegramBotSettings.organizationId;
	return createHash("sha256")
		.update(`${salt}:${normalizeDenteTelegramLinkCode(code)}`)
		.digest("hex");
}

function expireStaleDenteTelegramLinkCodes(now = new Date()): void {
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

function validateDenteTelegramSubject(
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

function resolveDenteTelegramClinicId(
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

function publicDenteTelegramLinkCode(
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


function normalizeDenteTelegramLedgerOptions<TStatus extends string>(
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

export function createDenteTelegramLinkCode(
	input: CreateDenteTelegramLinkCodeInput & { botUsername?: string | null },
): DenteTelegramLinkCodeCreated {
	if (!telegramChatEncryptionReady()) {
		throw new Error(
			"Защищенная связка Telegram-чата не настроена; одноразовые коды Telegram нельзя выпускать.",
		);
	}
	const organizationId =
		input.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	validateDenteTelegramSubject(
		input.subjectType,
		input.subjectId,
		organizationId,
	);
	const botConfigId =
		input.botConfigId?.trim() || configuredTelegramBotConfigId();
	const clinicId = resolveDenteTelegramClinicId(input.clinicId, organizationId);
	expireStaleDenteTelegramLinkCodes();

	const now = new Date();
	const ttlMinutes =
		input.ttlMinutes ?? denteTelegramBotSettings.patientLinkTokenTtlMinutes;
	const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString();
	const code = `DENTE-${randomBytes(12).toString("hex").toUpperCase()}`;
	const codeFingerprint = fingerprintDenteTelegramLinkCode(code);

	for (const existing of denteTelegramLinkCodes) {
		if (
			existing.status === "pending" &&
			existing.organizationId === organizationId &&
			existing.botConfigId === botConfigId &&
			(existing.clinicId === clinicId || existing.clinicId === null) &&
			existing.subjectType === input.subjectType &&
			existing.subjectId === input.subjectId
		) {
			existing.status = "revoked";
		}
	}

	const linkCode: DenteTelegramLinkCode = {
		id: randomUUID(),
		organizationId,
		clinicId,
		botConfigId,
		subjectType: input.subjectType,
		subjectId: input.subjectId,
		codeFingerprint,
		codeLast4: code.slice(-4),
		status: "pending",
		expiresAt,
		usedAt: null,
		createdAt: now.toISOString(),
		createdByUserId: input.createdByUserId ?? null,
	};

	denteTelegramLinkCodes.unshift(linkCode);
	denteTelegramLinkCodes.splice(200);
	persistMutableState();

	const botUsername =
		safeTelegramBotUsername(input.botUsername) ??
		configuredTelegramBotUsername();
	const deepLink = botUsername
		? `https://t.me/${botUsername}?start=${code}`
		: null;
	return denteTelegramLinkCodeCreatedSchema.parse({
		...publicDenteTelegramLinkCode(linkCode),
		code,
		deepLink,
		qrSvg: createTelegramQrSvg(deepLink ?? code),
		shareText: deepLink
			? `Откройте ${deepLink} или отправьте код ${code} в Telegram-бот DENTE.`
			: `Отправьте код ${code} в Telegram-бот DENTE.`,
	});
}

export function consumeDenteTelegramLinkCode(
	code: string,
	chatFingerprintValue: string | null,
	chatId: string | null = null,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
) {
	expireStaleDenteTelegramLinkCodes();
	const organizationId =
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const clinicId = scope.clinicId?.trim() || clinicProfile.organizationId;
	const botConfigId =
		scope.botConfigId?.trim() || configuredTelegramBotConfigId();
	if (!chatFingerprintValue) {
		return {
			ok: false,
			reason: "missing_chat_fingerprint",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}
	if (!telegramChatEncryptionReady()) {
		return {
			ok: false,
			reason: "chat_encryption_key_missing",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}
	if (!chatId) {
		return {
			ok: false,
			reason: "missing_chat_transport",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}

	const fingerprint = fingerprintDenteTelegramLinkCode(code);
	const linkCode = denteTelegramLinkCodes.find(
		(candidate) =>
			candidate.organizationId === organizationId &&
			candidate.botConfigId === botConfigId &&
			candidate.codeFingerprint === fingerprint,
	);

	if (!linkCode) {
		return {
			ok: false,
			reason: "not_found",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}
	if (linkCode.clinicId && linkCode.clinicId !== clinicId) {
		return {
			ok: false,
			reason: "not_found",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		} as const;
	}
	if (linkCode.status !== "pending") {
		return {
			ok: false,
			reason: linkCode.status,
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		} as const;
	}
	if (Date.parse(linkCode.expiresAt) <= Date.now()) {
		linkCode.status = "expired";
		persistMutableState();
		return {
			ok: false,
			reason: "expired",
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		} as const;
	}

	const now = new Date().toISOString();
	const encryptedChatRef = encryptTelegramChatId(chatId);
	if (!encryptedChatRef) {
		return {
			ok: false,
			reason: "chat_encryption_failed",
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		} as const;
	}
	linkCode.status = "used";
	linkCode.usedAt = now;

	let chatLink = denteTelegramChatLinks.find(
		(candidate) =>
			candidate.organizationId === organizationId &&
			candidate.botConfigId === botConfigId &&
			candidate.subjectType === linkCode.subjectType &&
			candidate.subjectId === linkCode.subjectId &&
			candidate.chatFingerprint === chatFingerprintValue,
	);

	for (const candidate of denteTelegramChatLinks) {
		if (
			candidate.organizationId === organizationId &&
			candidate.botConfigId === botConfigId &&
			candidate.subjectType === linkCode.subjectType &&
			candidate.subjectId === linkCode.subjectId &&
			candidate.status === "active" &&
			candidate.chatFingerprint !== chatFingerprintValue
		) {
			candidate.status = "revoked";
			candidate.revokedAt = now;
			candidate.lastUpdateAt = now;
		}
	}

	if (chatLink) {
		chatLink.status = "active";
		chatLink.clinicId = linkCode.clinicId ?? chatLink.clinicId ?? clinicId;
		chatLink.botConfigId = botConfigId;
		chatLink.chatTransportRef =
			encryptedChatRef ?? chatLink.chatTransportRef ?? null;
		chatLink.chatIdLast4 = chatIdLast4(chatId) ?? chatLink.chatIdLast4 ?? null;
		chatLink.revokedAt = null;
		chatLink.lastUpdateAt = now;
	} else {
		chatLink = {
			id: randomUUID(),
			organizationId,
			clinicId: linkCode.clinicId,
			botConfigId,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
			chatFingerprint: chatFingerprintValue,
			chatTransportRef: encryptedChatRef,
			chatIdLast4: chatIdLast4(chatId),
			status: "active",
			linkedAt: now,
			revokedAt: null,
			lastUpdateAt: now,
		};
		denteTelegramChatLinks.unshift(chatLink);
		denteTelegramChatLinks.splice(200);
	}

	persistMutableState();
	return {
		ok: true,
		reason: null,
		chatLink,
		subjectType: linkCode.subjectType,
		subjectId: linkCode.subjectId,
	} as const;
}

export function listDenteTelegramLinkCodes(
	limit = 50,
): Array<Omit<DenteTelegramLinkCode, "codeFingerprint">> {
	expireStaleDenteTelegramLinkCodes();
	const currentClinicId = clinicProfile.organizationId;
	const botConfigId = configuredTelegramBotConfigId();
	return denteTelegramLinkCodes
		.filter(
			(linkCode) =>
				linkCode.organizationId === denteTelegramBotSettings.organizationId &&
				linkCode.botConfigId === botConfigId &&
				(linkCode.clinicId === currentClinicId || linkCode.clinicId === null),
		)
		.slice(0, Math.max(0, Math.min(100, limit)))
		.map((linkCode) => publicDenteTelegramLinkCode(linkCode));
}

export function buildDenteTelegramLinkCodeList(
	input: number | BuildDenteTelegramLinkCodeListOptions = 50,
): DenteTelegramLinkCodeListResponse {
	expireStaleDenteTelegramLinkCodes();
	const options =
		normalizeDenteTelegramLedgerOptions<DenteTelegramLinkCodeListStatusFilter>(
			input,
			"all",
		);
	const currentClinicId = options.clinicId;
	const visibleCodes = denteTelegramLinkCodes.filter(
		(linkCode) =>
			linkCode.organizationId === options.organizationId &&
			linkCode.botConfigId === options.botConfigId &&
			(linkCode.clinicId === currentClinicId || linkCode.clinicId === null),
	);
	const filteredCodes = visibleCodes.filter((linkCode) => {
		if (options.status !== "all" && linkCode.status !== options.status)
			return false;
		if (
			options.subjectType !== "all" &&
			linkCode.subjectType !== options.subjectType
		)
			return false;
		if (options.subjectId && linkCode.subjectId !== options.subjectId)
			return false;
		return true;
	});
	const offset = Number.parseInt(options.cursor, 10);
	const start = Math.max(0, Number.isFinite(offset) ? offset : 0);
	const items = filteredCodes
		.slice(start, start + options.limit)
		.map((linkCode) => publicDenteTelegramLinkCode(linkCode));
	const nextOffset = start + items.length;
	return denteTelegramLinkCodeListResponseSchema.parse({
		totalCount: visibleCodes.length,
		filteredCount: filteredCodes.length,
		limit: options.limit,
		cursor: options.cursor === "0" ? null : options.cursor,
		nextCursor: nextOffset < filteredCodes.length ? String(nextOffset) : null,
		pendingCount: visibleCodes.filter(
			(linkCode) => linkCode.status === "pending",
		).length,
		usedCount: visibleCodes.filter((linkCode) => linkCode.status === "used")
			.length,
		expiredCount: visibleCodes.filter(
			(linkCode) => linkCode.status === "expired",
		).length,
		revokedCount: visibleCodes.filter(
			(linkCode) => linkCode.status === "revoked",
		).length,
		linkCodes: items,
	});
}

function _listDenteTelegramChatLinks(limit = 50): DenteTelegramChatLink[] {
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

function _buildDenteTelegramChatLinkList(
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

export function revokeDenteTelegramChatLink(
	linkId: string,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
): DenteTelegramChatLink | null {
	const currentClinicId =
		scope.clinicId?.trim() || clinicProfile.organizationId;
	const organizationId =
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const botConfigId =
		scope.botConfigId?.trim() || configuredTelegramBotConfigId();
	const chatLink =
		denteTelegramChatLinks.find(
			(link) =>
				link.id === linkId &&
				link.status === "active" &&
				link.organizationId === organizationId &&
				link.botConfigId === botConfigId &&
				(link.clinicId === currentClinicId || link.clinicId === null),
		) ?? null;
	if (!chatLink) return null;
	chatLink.status = "revoked";
	chatLink.revokedAt = new Date().toISOString();
	chatLink.lastUpdateAt = chatLink.revokedAt;
	persistMutableState();
	return chatLink;
}

