import { sql } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";

export interface ChatLockState {
	id: string;
	organizationId: string;
	chatId: string;
	processingAgent: string;
	lockAcquiredAt: Date;
	lockExpiresAt: Date;
	lastProcessedAt: Date;
}

export interface ChatLockStatus {
	chatId: string;
	isLocked: boolean;
	lockedByAgent: string | null;
	lockAcquiredAt: string | null;
	lockExpiresAt: string | null;
	remainingSeconds: number;
}

export type AcquireLockResult =
	| {
			success: true;
			lock: {
				chatId: string;
				lockedByAgent: string;
				lockAcquiredAt: string;
				lockExpiresAt: string;
				expiresAtIso: string;
			};
	  }
	| {
			success: false;
			reason: "already_locked";
			lockedByAgent: string;
			expiresAtIso: string;
			message: string;
	  };

export type HeartbeatResult =
	| {
			success: true;
			chatId: string;
			lockedByAgent: string;
			lockExpiresAt: string;
			expiresAtIso: string;
	  }
	| {
			success: false;
			reason: "not_locked_by_agent" | "lock_expired";
			message: string;
	  };

export type ReleaseLockResult =
	| {
			success: true;
			chatId: string;
			released: boolean;
	  }
	| {
			success: false;
			reason: "locked_by_another_agent";
			lockedByAgent: string;
			message: string;
	  };

export class ChatLockService {
	/**
	 * Эксклюзивный захват чата оператором с защитой от состояния гонки (Race Condition).
	 * Внутри транзакции берется PostgreSQL advisory lock на (organizationId, chatId)
	 * и выполняется SELECT ... FOR UPDATE.
	 */
	static async acquireLock(params: {
		organizationId: string;
		chatId: string;
		agentName: string;
		durationMinutes?: number;
	}): Promise<AcquireLockResult> {
		const { organizationId, chatId, agentName, durationMinutes = 5 } = params;

		return await withTenantCtx(organizationId, async (tx) => {
			// 1. Сериализация конкурентных запросов через транзакционную консультативную блокировку
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, 'chat_lock', ${chatId}::text)))`,
			);

			// 2. Блокировка строки существующего состояния чата
			const existingResult = await tx.execute(sql`
				SELECT id, organization_id, chat_id, processing_agent, lock_acquired_at, lock_expires_at, last_processed_at
				FROM collaborative_chat_processing_states
				WHERE organization_id = ${organizationId}
				  AND chat_id = ${chatId}
				FOR UPDATE
			`);

			const existing = (existingResult.rows ?? [])[0] as
				| {
						id: string;
						organization_id: string;
						chat_id: string;
						processing_agent: string | null;
						lock_acquired_at: Date | string | null;
						lock_expires_at: Date | string | null;
						last_processed_at: Date | string | null;
				  }
				| undefined;

			const now = new Date();
			const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

			if (existing) {
				const currentLockExpires = existing.lock_expires_at
					? new Date(existing.lock_expires_at)
					: null;
				const isStillActive =
					currentLockExpires !== null &&
					currentLockExpires.getTime() > now.getTime();
				const isHeldByAnother =
					isStillActive &&
					Boolean(existing.processing_agent) &&
					existing.processing_agent !== agentName;

				if (isHeldByAnother) {
					return {
						success: false,
						reason: "already_locked",
						lockedByAgent: existing.processing_agent!,
						expiresAtIso: currentLockExpires!.toISOString(),
						message: `Чат уже заблокирован оператором ${existing.processing_agent}.`,
					};
				}

				// Блокировка свободна, истекла или удерживается тем же оператором — обновляем
				await tx.execute(sql`
					UPDATE collaborative_chat_processing_states
					SET processing_agent = ${agentName},
					    lock_acquired_at = ${now.toISOString()}::timestamptz,
					    lock_expires_at = ${expiresAt.toISOString()}::timestamptz,
					    last_processed_at = ${now.toISOString()}::timestamptz
					WHERE id = ${existing.id}
					  AND organization_id = ${organizationId}
				`);

				return {
					success: true,
					lock: {
						chatId,
						lockedByAgent: agentName,
						lockAcquiredAt: now.toISOString(),
						lockExpiresAt: expiresAt.toISOString(),
						expiresAtIso: expiresAt.toISOString(),
					},
				};
			}

			// Строки не существовало — создаем новую запись состояния
			await tx.execute(sql`
				INSERT INTO collaborative_chat_processing_states (
					id, organization_id, chat_id, processing_agent,
					lock_acquired_at, lock_expires_at, last_processed_at, created_at
				) VALUES (
					gen_random_uuid(), ${organizationId}, ${chatId}, ${agentName},
					${now.toISOString()}::timestamptz, ${expiresAt.toISOString()}::timestamptz,
					${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz
				)
			`);

			return {
				success: true,
				lock: {
					chatId,
					lockedByAgent: agentName,
					lockAcquiredAt: now.toISOString(),
					lockExpiresAt: expiresAt.toISOString(),
					expiresAtIso: expiresAt.toISOString(),
				},
			};
		});
	}

	/**
	 * Продление (heartbeat) активной блокировки оператором.
	 */
	static async heartbeatLock(params: {
		organizationId: string;
		chatId: string;
		agentName: string;
		durationMinutes?: number;
	}): Promise<HeartbeatResult> {
		const { organizationId, chatId, agentName, durationMinutes = 5 } = params;

		return await withTenantCtx(organizationId, async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, 'chat_lock', ${chatId}::text)))`,
			);

			const existingResult = await tx.execute(sql`
				SELECT id, organization_id, chat_id, processing_agent, lock_acquired_at, lock_expires_at
				FROM collaborative_chat_processing_states
				WHERE organization_id = ${organizationId}
				  AND chat_id = ${chatId}
				FOR UPDATE
			`);

			const existing = (existingResult.rows ?? [])[0] as
				| {
						id: string;
						organization_id: string;
						chat_id: string;
						processing_agent: string | null;
						lock_expires_at: Date | string | null;
				  }
				| undefined;

			const now = new Date();

			if (!existing || !existing.processing_agent) {
				return {
					success: false,
					reason: "not_locked_by_agent",
					message: "Блокировка чата не найдена.",
				};
			}

			if (existing.processing_agent !== agentName) {
				return {
					success: false,
					reason: "not_locked_by_agent",
					message: `Чат заблокирован другим оператором (${existing.processing_agent}).`,
				};
			}

			const currentLockExpires = existing.lock_expires_at
				? new Date(existing.lock_expires_at)
				: null;
			if (!currentLockExpires || currentLockExpires.getTime() < now.getTime()) {
				return {
					success: false,
					reason: "lock_expired",
					message: "Блокировка чата истекла. Захватите чат заново.",
				};
			}

			const newExpiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

			await tx.execute(sql`
				UPDATE collaborative_chat_processing_states
				SET lock_expires_at = ${newExpiresAt.toISOString()}::timestamptz,
				    last_processed_at = ${now.toISOString()}::timestamptz
				WHERE id = ${existing.id}
				  AND organization_id = ${organizationId}
			`);

			return {
				success: true,
				chatId,
				lockedByAgent: agentName,
				lockExpiresAt: newExpiresAt.toISOString(),
				expiresAtIso: newExpiresAt.toISOString(),
			};
		});
	}

	/**
	 * Явное освобождение блокировки чата при завершении диалога или передачи другому оператору.
	 */
	static async releaseLock(params: {
		organizationId: string;
		chatId: string;
		agentName?: string | null;
		force?: boolean;
	}): Promise<ReleaseLockResult> {
		const { organizationId, chatId, agentName, force = false } = params;

		return await withTenantCtx(organizationId, async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, 'chat_lock', ${chatId}::text)))`,
			);

			const existingResult = await tx.execute(sql`
				SELECT id, organization_id, chat_id, processing_agent, lock_expires_at
				FROM collaborative_chat_processing_states
				WHERE organization_id = ${organizationId}
				  AND chat_id = ${chatId}
				FOR UPDATE
			`);

			const existing = (existingResult.rows ?? [])[0] as
				| {
						id: string;
						organization_id: string;
						chat_id: string;
						processing_agent: string | null;
						lock_expires_at: Date | string | null;
				  }
				| undefined;

			const now = new Date();

			if (!existing || !existing.processing_agent) {
				return { success: true, chatId, released: false };
			}

			const currentLockExpires = existing.lock_expires_at
				? new Date(existing.lock_expires_at)
				: null;
			const isStillActive =
				currentLockExpires !== null &&
				currentLockExpires.getTime() > now.getTime();

			if (
				!force &&
				agentName &&
				isStillActive &&
				existing.processing_agent !== agentName
			) {
				return {
					success: false,
					reason: "locked_by_another_agent",
					lockedByAgent: existing.processing_agent,
					message: `Чат удерживается другим оператором (${existing.processing_agent}).`,
				};
			}

			await tx.execute(sql`
				UPDATE collaborative_chat_processing_states
				SET processing_agent = null,
				    lock_expires_at = ${now.toISOString()}::timestamptz,
				    last_processed_at = ${now.toISOString()}::timestamptz
				WHERE id = ${existing.id}
				  AND organization_id = ${organizationId}
			`);

			return { success: true, chatId, released: true };
		});
	}

	/**
	 * Проверка текущего статуса блокировки чата без захвата.
	 */
	static async getLockStatus(params: {
		organizationId: string;
		chatId: string;
	}): Promise<ChatLockStatus> {
		const { organizationId, chatId } = params;

		return await withTenantCtx(organizationId, async (tx) => {
			const existingResult = await tx.execute(sql`
				SELECT id, organization_id, chat_id, processing_agent, lock_acquired_at, lock_expires_at
				FROM collaborative_chat_processing_states
				WHERE organization_id = ${organizationId}
				  AND chat_id = ${chatId}
			`);

			const existing = (existingResult.rows ?? [])[0] as
				| {
						id: string;
						processing_agent: string | null;
						lock_acquired_at: Date | string | null;
						lock_expires_at: Date | string | null;
				  }
				| undefined;

			const now = new Date();

			if (!existing || !existing.processing_agent || !existing.lock_expires_at) {
				return {
					chatId,
					isLocked: false,
					lockedByAgent: null,
					lockAcquiredAt: null,
					lockExpiresAt: null,
					remainingSeconds: 0,
				};
			}

			const expiresAt = new Date(existing.lock_expires_at);
			const acquiredAt = existing.lock_acquired_at
				? new Date(existing.lock_acquired_at)
				: null;
			const remainingSeconds = Math.max(
				0,
				Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
			);
			const isLocked = remainingSeconds > 0;

			return {
				chatId,
				isLocked,
				lockedByAgent: isLocked ? existing.processing_agent : null,
				lockAcquiredAt: isLocked && acquiredAt ? acquiredAt.toISOString() : null,
				lockExpiresAt: isLocked ? expiresAt.toISOString() : null,
				remainingSeconds,
			};
		});
	}
}
