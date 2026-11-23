/**
 * dialogSessions.ts
 *
 * In-memory dialog session state machine and cleanup lifecycle for Telegram interactive triage.
 */

import { randomUUID } from "node:crypto";

export type TelegramBotDialogStep =
	| "idle"
	| "menu"
	| "awaiting_link_code"
	| "awaiting_appointment_choice"
	| "awaiting_reschedule_reason"
	| "awaiting_callback_phone"
	| "awaiting_feedback"
	| "awaiting_care_topic"
	| "awaiting_doc_type"
	| (string & {});

export type TelegramBotDialogSession = {
	sessionId: string;
	organizationId: string;
	clinicId: string | null;
	botConfigId: string;
	chatFingerprint: string;
	chatId: string | null;
	subjectType: "patient" | "staff" | "unknown";
	subjectId: string | null;
	currentStep: TelegramBotDialogStep;
	lastCommand: string | null;
	lastMessageText: string | null;
	metadata: Record<string, unknown>;
	createdAt: number;
	lastActiveAt: number;
	expiresAt: number;
};

export type SetTelegramBotDialogSessionInput = {
	organizationId: string;
	clinicId?: string | null;
	botConfigId?: string | null;
	chatFingerprint: string;
	chatId?: string | null;
	subjectType?: "patient" | "staff" | "unknown";
	subjectId?: string | null;
	currentStep?: TelegramBotDialogStep;
	lastCommand?: string | null;
	lastMessageText?: string | null;
	metadata?: Record<string, unknown>;
	ttlMs?: number;
};

const DEFAULT_DIALOG_SESSION_TTL_MS = 60 * 60 * 1000; // 1 час неактивности
const MAX_DIALOG_SESSIONS = 5000; // Жесткий потолок на размер кэша для защиты от утечек памяти

export const telegramDialogSessions = new Map<string, TelegramBotDialogSession>();

export function getTelegramDialogSessionKey(
	organizationId: string,
	botConfigId: string,
	chatFingerprint: string,
): string {
	return `${organizationId}:${botConfigId}:${chatFingerprint}`;
}

export function cleanupStaleTelegramDialogSessions(nowMs = Date.now()): number {
	let purgedCount = 0;
	for (const [key, session] of telegramDialogSessions.entries()) {
		if (session.expiresAt <= nowMs) {
			telegramDialogSessions.delete(key);
			purgedCount++;
		}
	}
	return purgedCount;
}

export function getTelegramDialogSession(
	chatFingerprint: string,
	organizationId: string,
	botConfigId?: string | null,
	nowMs = Date.now(),
): TelegramBotDialogSession | null {
	const configId = botConfigId?.trim() || "default";
	const key = getTelegramDialogSessionKey(organizationId, configId, chatFingerprint);
	const session = telegramDialogSessions.get(key);
	if (!session) return null;

	if (session.expiresAt <= nowMs) {
		telegramDialogSessions.delete(key);
		return null;
	}

	session.lastActiveAt = nowMs;
	return session;
}

export function setTelegramDialogSession(
	input: SetTelegramBotDialogSessionInput,
	nowMs = Date.now(),
): TelegramBotDialogSession {
	const configId = input.botConfigId?.trim() || "default";
	const key = getTelegramDialogSessionKey(input.organizationId, configId, input.chatFingerprint);
	const ttl = input.ttlMs && input.ttlMs > 0 ? input.ttlMs : DEFAULT_DIALOG_SESSION_TTL_MS;

	if (telegramDialogSessions.size >= MAX_DIALOG_SESSIONS) {
		cleanupStaleTelegramDialogSessions(nowMs);
		if (telegramDialogSessions.size >= MAX_DIALOG_SESSIONS) {
			const sortedEntries = Array.from(telegramDialogSessions.entries()).sort(
				(a, b) => a[1].lastActiveAt - b[1].lastActiveAt,
			);
			const toEvict = sortedEntries.slice(0, 500);
			for (const [evictKey] of toEvict) {
				telegramDialogSessions.delete(evictKey);
			}
		}
	}

	const existing = telegramDialogSessions.get(key);
	const session: TelegramBotDialogSession = {
		sessionId: existing?.sessionId ?? randomUUID(),
		organizationId: input.organizationId,
		clinicId: input.clinicId ?? existing?.clinicId ?? null,
		botConfigId: configId,
		chatFingerprint: input.chatFingerprint,
		chatId: input.chatId ?? existing?.chatId ?? null,
		subjectType: input.subjectType ?? existing?.subjectType ?? "unknown",
		subjectId: input.subjectId ?? existing?.subjectId ?? null,
		currentStep: input.currentStep ?? existing?.currentStep ?? "idle",
		lastCommand: input.lastCommand !== undefined ? input.lastCommand : (existing?.lastCommand ?? null),
		lastMessageText: input.lastMessageText !== undefined ? input.lastMessageText : (existing?.lastMessageText ?? null),
		metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
		createdAt: existing?.createdAt ?? nowMs,
		lastActiveAt: nowMs,
		expiresAt: nowMs + ttl,
	};

	telegramDialogSessions.set(key, session);
	return session;
}

export function updateTelegramDialogSession(
	chatFingerprint: string,
	organizationId: string,
	updates: Partial<TelegramBotDialogSession>,
	botConfigId?: string | null,
	nowMs = Date.now(),
): TelegramBotDialogSession | null {
	const configId = botConfigId?.trim() || "default";
	const key = getTelegramDialogSessionKey(organizationId, configId, chatFingerprint);
	const existing = telegramDialogSessions.get(key);

	if (!existing || existing.expiresAt <= nowMs) {
		return setTelegramDialogSession(
			{
				organizationId,
				botConfigId: configId,
				chatFingerprint,
				...updates,
			},
			nowMs,
		);
	}

	const updated: TelegramBotDialogSession = {
		...existing,
		...updates,
		metadata: {
			...existing.metadata,
			...(updates.metadata ?? {}),
		},
		lastActiveAt: nowMs,
		expiresAt: nowMs + DEFAULT_DIALOG_SESSION_TTL_MS,
	};

	telegramDialogSessions.set(key, updated);
	return updated;
}

export function clearTelegramDialogSession(
	chatFingerprint: string,
	organizationId: string,
	botConfigId?: string | null,
): boolean {
	const configId = botConfigId?.trim() || "default";
	const key = getTelegramDialogSessionKey(organizationId, configId, chatFingerprint);
	return telegramDialogSessions.delete(key);
}

export function countTelegramDialogSessions(
	organizationId?: string,
	nowMs = Date.now(),
): number {
	let count = 0;
	for (const session of telegramDialogSessions.values()) {
		if (session.expiresAt > nowMs) {
			if (!organizationId || session.organizationId === organizationId) {
				count++;
			}
		}
	}
	return count;
}

export function resetTelegramDialogSessions(): void {
	telegramDialogSessions.clear();
}
