/**
 * dialogSessions.ts
 *
 * In-memory dialog session state machine and cleanup lifecycle.
 */

import { randomUUID } from "node:crypto";
import type {
	SetTelegramBotDialogSessionInput,
	TelegramBotDialogSession,
	TelegramBotDialogStep,
} from "./types.js";


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
	const configId = botConfigId?.trim() || configuredTelegramBotConfigId();
	const key = getTelegramDialogSessionKey(organizationId, configId, chatFingerprint);
	const session = telegramDialogSessions.get(key);
	if (!session) return null;

	if (session.expiresAt <= nowMs) {
		telegramDialogSessions.delete(key);
		return null;
	}

	// Продлеваем активность при обращении
	session.lastActiveAt = nowMs;
	return session;
}

export function setTelegramDialogSession(
	input: SetTelegramBotDialogSessionInput,
	nowMs = Date.now(),
): TelegramBotDialogSession {
	const configId = input.botConfigId?.trim() || configuredTelegramBotConfigId();
	const key = getTelegramDialogSessionKey(input.organizationId, configId, input.chatFingerprint);
	const ttl = input.ttlMs && input.ttlMs > 0 ? input.ttlMs : DEFAULT_DIALOG_SESSION_TTL_MS;

	// Защита от утечки памяти: если размер превышает MAX_DIALOG_SESSIONS, чистим протухшие
	if (telegramDialogSessions.size >= MAX_DIALOG_SESSIONS) {
		cleanupStaleTelegramDialogSessions(nowMs);
		// Если все еще превышает, вытесняем самые старые неактивные сессии (LRU)
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
	const configId = botConfigId?.trim() || configuredTelegramBotConfigId();
	const key = getTelegramDialogSessionKey(organizationId, configId, chatFingerprint);
	const existing = telegramDialogSessions.get(key);

	if (!existing || existing.expiresAt <= nowMs) {
		// Если сессии не было, создаем новую
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
	const configId = botConfigId?.trim() || configuredTelegramBotConfigId();
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

let dialogSessionCleanupTimer: NodeJS.Timeout | null = null;

export function ensureTelegramDialogSessionCleanupTimer(): void {
	if (!dialogSessionCleanupTimer) {
		dialogSessionCleanupTimer = setInterval(() => {
			cleanupStaleTelegramDialogSessions();
		}, 5 * 60 * 1000);
		// unref гарантирует, что таймер не удерживает процесс Node.js от завершения
		dialogSessionCleanupTimer.unref();
	}
}

export function stopTelegramDialogSessionCleanup(): void {
	if (dialogSessionCleanupTimer) {
		clearInterval(dialogSessionCleanupTimer);
		dialogSessionCleanupTimer = null;
	}
}

// Запускаем фоновую периодическую очистку с unref
ensureTelegramDialogSessionCleanupTimer();

