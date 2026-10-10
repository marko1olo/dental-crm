/**
 * linkCodes.ts
 *
 * Link code generation, verification, consumption and chat link revocation.
 */

import { randomBytes, randomUUID } from "node:crypto";
import type {
	CreateDenteTelegramLinkCodeInput,
	DenteTelegramChatLink,
	DenteTelegramLinkCode,
	DenteTelegramLinkCodeCreated,
	DenteTelegramLinkCodeListResponse,
} from "@dental/shared";
import {
	denteTelegramLinkCodeCreatedSchema,
	denteTelegramLinkCodeListResponseSchema,
} from "@dental/shared";
import { createTelegramQrSvg } from "../../../telegramQr.js";
import type {
	BuildDenteTelegramLinkCodeListOptions,
	DenteTelegramLinkCodeListStatusFilter,
} from "./types.js";
import {
	clinicProfile,
	denteTelegramChatLinks,
	denteTelegramLinkCodes,
	persistMutableState,
} from "./storeState.js";
import {
	configuredTelegramBotConfigId,
	configuredTelegramBotUsername,
	denteTelegramBotSettings,
	safeTelegramBotUsername,
} from "./botSettings.js";
import {
	chatIdLast4,
	encryptTelegramChatId,
	expireStaleDenteTelegramLinkCodes,
	fingerprintDenteTelegramLinkCode,
	normalizeDenteTelegramLedgerOptions,
	publicDenteTelegramLinkCode,
	resolveDenteTelegramClinicId,
	telegramChatEncryptionReady,
	validateDenteTelegramSubject,
} from "./linkCodeHelpers.js";

export * from "./linkCodeHelpers.js";

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
