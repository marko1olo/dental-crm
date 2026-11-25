import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
	denteTelegramLinkCodeCreatedSchema,
	denteTelegramLinkCodeListResponseSchema,
	type CreateDenteTelegramLinkCodeInput,
	type DenteTelegramChatLink,
	type DenteTelegramLinkCode,
	type DenteTelegramLinkCodeCreated,
	type DenteTelegramLinkCodeListResponse,
} from "@dental/shared";
import { createTelegramQrSvg } from "../../../telegramQr.js";
import {
	encryptTelegramChatId,
	telegramChatEncryptionKey,
} from "../../../utils/telegramChatRef.js";
import { safeTelegramBotUsername } from "../telegramUrlHelpers.js";
import {
	configuredTelegramBotConfigId,
	configuredTelegramBotUsername,
	denteTelegramBotSettings,
	denteTelegramChatLinks,
	denteTelegramLinkCodes,
} from "./telegramRuntimeDefaults.js";

export type DenteTelegramLinkCodeListStatusFilter =
	| "all"
	| "pending"
	| "used"
	| "expired"
	| "revoked";

export type BuildDenteTelegramLinkCodeListOptions = {
	readonly limit?: number;
	readonly cursor?: string | null;
	readonly status?: DenteTelegramLinkCodeListStatusFilter;
	readonly subjectType?: "patient" | "staff" | "all";
	readonly subjectId?: string | null;
	readonly organizationId?: string | null;
	readonly clinicId?: string | null;
	readonly botConfigId?: string | null;
};

export type DenteTelegramChatLinkListStatusFilter = "all" | "active" | "revoked";

export type BuildDenteTelegramChatLinkListOptions = {
	readonly limit?: number;
	readonly cursor?: string | null;
	readonly status?: DenteTelegramChatLinkListStatusFilter;
	readonly subjectType?: "patient" | "staff" | "all";
	readonly subjectId?: string | null;
	readonly organizationId?: string | null;
	readonly clinicId?: string | null;
	readonly botConfigId?: string | null;
};

export function telegramChatEncryptionReady(): boolean {
	return Boolean(telegramChatEncryptionKey());
}

export function fingerprintDenteTelegramLinkCode(code: string): string {
	return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function extractDenteTelegramLinkCode(
	text: string | null | undefined,
): string | null {
	if (!text) return null;
	const match = text.match(/\b(DENTE-[A-F0-9]{24})\b/i);
	if (!match) return null;
	const captured = match[1];
	return typeof captured === "string" ? captured.toUpperCase() : null;
}

export function expireStaleDenteTelegramLinkCodes(): void {
	const nowMs = Date.now();
	for (const code of denteTelegramLinkCodes) {
		if (code.status === "pending" && Date.parse(code.expiresAt) <= nowMs) {
			code.status = "expired";
		}
	}
}

export function publicDenteTelegramLinkCode(
	linkCode: DenteTelegramLinkCode,
): Omit<DenteTelegramLinkCode, "codeFingerprint"> {
	const { codeFingerprint: _, ...publicFields } = linkCode;
	return publicFields;
}

export function createDenteTelegramLinkCode(
	input: CreateDenteTelegramLinkCodeInput & { botUsername?: string | null },
): DenteTelegramLinkCodeCreated {
	const organizationId =
		input.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const botConfigId =
		input.botConfigId?.trim() || configuredTelegramBotConfigId();
	const clinicId = input.clinicId?.trim() || null;
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

	const botUsername =
		safeTelegramBotUsername(input.botUsername) ?? configuredTelegramBotUsername();
	const deepLink = botUsername ? `https://t.me/${botUsername}?start=${code}` : null;
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
):
	| {
			ok: false;
			reason:
				| "missing_chat_fingerprint"
				| "chat_encryption_key_missing"
				| "missing_chat_transport"
				| "chat_encryption_failed"
				| "not_found"
				| "used"
				| "expired"
				| "revoked";
			chatLink: null;
			subjectType: "patient" | "staff" | null;
			subjectId: string | null;
	  }
	| {
			ok: true;
			reason: null;
			chatLink: DenteTelegramChatLink;
			subjectType: "patient" | "staff";
			subjectId: string;
	  } {
	expireStaleDenteTelegramLinkCodes();
	const organizationId =
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const clinicId = scope.clinicId?.trim() || null;
	const botConfigId =
		scope.botConfigId?.trim() || configuredTelegramBotConfigId();

	if (!chatFingerprintValue) {
		return {
			ok: false,
			reason: "missing_chat_fingerprint",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		};
	}
	if (!telegramChatEncryptionReady()) {
		return {
			ok: false,
			reason: "chat_encryption_key_missing",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		};
	}
	if (!chatId) {
		return {
			ok: false,
			reason: "missing_chat_transport",
			chatLink: null,
			subjectType: null,
			subjectId: null,
		};
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
		};
	}
	if (linkCode.status !== "pending") {
		return {
			ok: false,
			reason:
				linkCode.status === "used"
					? "used"
					: linkCode.status === "expired"
						? "expired"
						: "revoked",
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		};
	}
	if (Date.parse(linkCode.expiresAt) <= Date.now()) {
		linkCode.status = "expired";
		return {
			ok: false,
			reason: "expired",
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		};
	}

	const encryptedChatRef = encryptTelegramChatId(chatId);
	if (!encryptedChatRef) {
		return {
			ok: false,
			reason: "chat_encryption_failed",
			chatLink: null,
			subjectType: linkCode.subjectType,
			subjectId: linkCode.subjectId,
		};
	}

	const now = new Date().toISOString();
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

	if (chatLink) {
		chatLink.status = "active";
		chatLink.clinicId = linkCode.clinicId ?? chatLink.clinicId ?? clinicId;
		chatLink.chatTransportRef = encryptedChatRef;
		chatLink.chatIdLast4 = chatId.slice(-4);
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
			chatIdLast4: chatId.slice(-4),
			status: "active",
			linkedAt: now,
			revokedAt: null,
			lastUpdateAt: now,
		};
		denteTelegramChatLinks.unshift(chatLink);
		denteTelegramChatLinks.splice(200);
	}

	return {
		ok: true,
		reason: null,
		chatLink,
		subjectType: linkCode.subjectType,
		subjectId: linkCode.subjectId,
	};
}

export function listDenteTelegramLinkCodes(
	limit = 50,
): Array<Omit<DenteTelegramLinkCode, "codeFingerprint">> {
	expireStaleDenteTelegramLinkCodes();
	const botConfigId = configuredTelegramBotConfigId();
	return denteTelegramLinkCodes
		.filter(
			(linkCode) =>
				linkCode.organizationId === denteTelegramBotSettings.organizationId &&
				linkCode.botConfigId === botConfigId,
		)
		.slice(0, Math.max(0, Math.min(100, limit)))
		.map((linkCode) => publicDenteTelegramLinkCode(linkCode));
}

export function buildDenteTelegramLinkCodeList(
	input: number | BuildDenteTelegramLinkCodeListOptions = 50,
): DenteTelegramLinkCodeListResponse {
	expireStaleDenteTelegramLinkCodes();
	const options = typeof input === "number" ? { limit: input } : input;
	const limit = Math.max(1, Math.min(200, options.limit ?? 50));
	const orgId =
		options.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const botConfigId =
		options.botConfigId?.trim() || configuredTelegramBotConfigId();

	const visibleCodes = denteTelegramLinkCodes.filter(
		(linkCode) =>
			linkCode.organizationId === orgId && linkCode.botConfigId === botConfigId,
	);

	const items = visibleCodes.slice(0, limit).map(publicDenteTelegramLinkCode);

	return denteTelegramLinkCodeListResponseSchema.parse({
		totalCount: visibleCodes.length,
		filteredCount: visibleCodes.length,
		limit,
		cursor: null,
		nextCursor: null,
		pendingCount: visibleCodes.filter((c) => c.status === "pending").length,
		usedCount: visibleCodes.filter((c) => c.status === "used").length,
		expiredCount: visibleCodes.filter((c) => c.status === "expired").length,
		revokedCount: visibleCodes.filter((c) => c.status === "revoked").length,
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
				link.botConfigId === botConfigId,
		) ?? null;
	if (!chatLink) return null;
	chatLink.status = "revoked";
	chatLink.revokedAt = new Date().toISOString();
	chatLink.lastUpdateAt = chatLink.revokedAt;
	return chatLink;
}
