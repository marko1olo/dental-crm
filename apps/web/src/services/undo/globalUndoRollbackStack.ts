/**
 * ============================================================================
 * GLOBAL TOAST ROLLBACK & DESTRUCTIVE ACTION UNDO STACK ENGINE
 * Authority: Mandate 8e (Doctor & Admin Autonomy), Mandate 8b (Zero Jitter),
 *            THE_HAMMER_MASTER_PROMPT.md & rules/frontend.md
 * ============================================================================
 * Provides an optimistic deletion workflow with soft 5-second rollback window:
 * 1. Immediate optimistic UI state removal + CSS collapse.
 * 2. Floating toast: «Позиция «{Название}» удалена · [Отменить (5 сек)]».
 * 3. Client-side RFC 9562 UUIDv7 idempotency keys protect against network duplicates.
 * 4. Exact-index atomic rollback: restored position, tooth code, warranty, discount, modifiers.
 * 5. Silent commit upon 5-second expiration via optional onCommit handler.
 * ============================================================================
 */

import { generateUuidV7 } from "@dental/shared";
import { showRollbackToast } from "../../components/GlobalToast.js";

export type UndoEntityType =
	| "visit_service"
	| "treatment_plan_item"
	| "treatment_plan_stage"
	| "estimator_item"
	| "custom";

export interface UndoRollbackEntry<T = unknown> {
	readonly id: string; // RFC 9562 UUIDv7
	readonly entityType: UndoEntityType | string;
	readonly description: string;
	readonly item: T;
	readonly index: number;
	readonly parentId?: string | undefined;
	readonly createdAt: number;
	readonly ttlMs: number;
	committed: boolean;
	rolledBack: boolean;
	timer: ReturnType<typeof setTimeout> | null;
	onCommit?: (() => Promise<void> | void) | undefined;
	onRollback: (item: T, index: number, entry: UndoRollbackEntry<T>) => void;
	readonly metadata?: Record<string, unknown> | undefined;
}

export interface PushDestructiveActionOptions<T = unknown> {
	readonly entityType: UndoEntityType | string;
	readonly description: string;
	readonly item: T;
	readonly index: number;
	readonly parentId?: string | undefined;
	readonly ttlMs?: number | undefined; // default 5000ms
	readonly actionLabel?: string | undefined; // default "Отменить"
	readonly onCommit?: (() => Promise<void> | void) | undefined;
	readonly onRollback: (item: T, index: number, entry: UndoRollbackEntry<T>) => void;
	readonly metadata?: Record<string, unknown> | undefined;
	readonly showToast?: boolean | undefined; // default true
}

const MAX_STACK_SIZE = 50;

class GlobalUndoRollbackStackManager {
	private stack: UndoRollbackEntry<any>[] = [];

	/**
	 * Pushes a destructive action to the undo stack, starts 5-sec commit timer,
	 * and surfaces the non-blocking rollback toast.
	 */
	public push<T>(options: PushDestructiveActionOptions<T>): UndoRollbackEntry<T> {
		const id = generateUuidV7();
		const ttlMs = options.ttlMs ?? 5000;

		const entry: UndoRollbackEntry<T> = {
			id,
			entityType: options.entityType,
			description: options.description,
			item: options.item,
			index: options.index,
			parentId: options.parentId,
			createdAt: Date.now(),
			ttlMs,
			committed: false,
			rolledBack: false,
			timer: null,
			onCommit: options.onCommit,
			onRollback: options.onRollback,
			metadata: options.metadata,
		};

		// Start commit timer
		entry.timer = setTimeout(async () => {
			if (!entry.rolledBack && !entry.committed) {
				entry.committed = true;
				try {
					if (entry.onCommit) {
						await entry.onCommit();
					}
				} catch (err) {
					console.error(`[GlobalUndoRollbackStack] Error committing mutation ${id}:`, err);
				}
				this.dispatchEvent("dente-undo-committed", {
					id: entry.id,
					entityType: entry.entityType,
				});
			}
		}, ttlMs);

		// Prune oldest uncommitted/committed entries if exceeding capacity
		if (this.stack.length >= MAX_STACK_SIZE) {
			const pruned = this.stack.shift();
			if (pruned?.timer && !pruned.committed && !pruned.rolledBack) {
				clearTimeout(pruned.timer);
				pruned.committed = true;
				try {
					pruned.onCommit?.();
				} catch {
					// silent prune
				}
			}
		}

		this.stack.push(entry);

		// Surface rollback toast if enabled
		if (options.showToast !== false) {
			showRollbackToast(
				options.description,
				() => {
					this.executeRollback(id);
				},
				ttlMs,
				options.actionLabel ?? "Отменить",
			);
		}

		this.dispatchEvent("dente-undo-pushed", {
			id: entry.id,
			entityType: entry.entityType,
			description: entry.description,
			index: entry.index,
			parentId: entry.parentId,
		});

		return entry;
	}

	/**
	 * Executes rollback: cancels commit timer, marks rolledBack, and calls onRollback.
	 * If id is omitted, rolls back the most recent pending entry.
	 */
	public executeRollback(id?: string): boolean {
		let targetEntry: UndoRollbackEntry<any> | undefined;

		if (id) {
			targetEntry = this.stack.find((e) => e.id === id);
		} else {
			// Find latest pending entry
			for (let i = this.stack.length - 1; i >= 0; i--) {
				const candidate = this.stack[i];
				if (candidate && !candidate.rolledBack && !candidate.committed) {
					targetEntry = candidate;
					break;
				}
			}
		}

		if (!targetEntry) {
			return false;
		}

		if (targetEntry.rolledBack || targetEntry.committed) {
			return false;
		}

		if (targetEntry.timer) {
			clearTimeout(targetEntry.timer);
			targetEntry.timer = null;
		}

		targetEntry.rolledBack = true;

		try {
			targetEntry.onRollback(targetEntry.item, targetEntry.index, targetEntry);
		} catch (err) {
			console.error(`[GlobalUndoRollbackStack] Error executing rollback for ${targetEntry.id}:`, err);
			return false;
		}

		this.dispatchEvent("dente-undo-rolledback", {
			id: targetEntry.id,
			entityType: targetEntry.entityType,
			item: targetEntry.item,
			index: targetEntry.index,
		});

		return true;
	}

	/**
	 * Cancels pending commit timer without rolling back.
	 */
	public cancelPendingCommit(id: string): boolean {
		const entry = this.stack.find((e) => e.id === id);
		if (entry && entry.timer && !entry.committed && !entry.rolledBack) {
			clearTimeout(entry.timer);
			entry.timer = null;
			return true;
		}
		return false;
	}

	/**
	 * Returns all active, uncommitted, and unrolled-back entries.
	 */
	public getActiveEntries(): UndoRollbackEntry<any>[] {
		return this.stack.filter((e) => !e.committed && !e.rolledBack);
	}

	/**
	 * Returns full immutable snapshot of stack.
	 */
	public getStack(): readonly UndoRollbackEntry<any>[] {
		return [...this.stack];
	}

	/**
	 * Clears stack and cancels all pending timers (useful in tests and reset).
	 */
	public clearStack(): void {
		for (const entry of this.stack) {
			if (entry.timer) {
				clearTimeout(entry.timer);
				entry.timer = null;
			}
		}
		this.stack = [];
	}

	private dispatchEvent(name: string, detail: unknown): void {
		if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
			try {
				window.dispatchEvent(new CustomEvent(name, { detail }));
			} catch {
				// SSR safe
			}
		}
	}
}

// Global Singleton Instance
export const globalUndoRollbackStack = new GlobalUndoRollbackStackManager();

/**
 * Convenience helper to push a destructive action with rollback into the global stack.
 */
export function pushDestructiveActionWithRollback<T>(
	options: PushDestructiveActionOptions<T>,
): UndoRollbackEntry<T> {
	return globalUndoRollbackStack.push(options);
}

/**
 * Convenience helper to trigger rollback for the latest or specific destructive action.
 */
export function executeRollback(id?: string): boolean {
	return globalUndoRollbackStack.executeRollback(id);
}
