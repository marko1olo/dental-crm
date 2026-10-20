/**
 * ============================================================================
 * GLOBAL UNDO ROLLBACK STACK UNIT TESTS
 * Authority: Mandate 8e, Mandate 8b, THE_HAMMER_MASTER_PROMPT.md
 * ============================================================================
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { isUuidV7 } from "@dental/shared";
import {
	globalUndoRollbackStack,
	pushDestructiveActionWithRollback,
	executeRollback,
	type UndoRollbackEntry,
} from "../globalUndoRollbackStack.js";

describe("GlobalUndoRollbackStack & Destructive Action Engine", () => {
	beforeEach(() => {
		globalUndoRollbackStack.clearStack();
	});

	afterEach(() => {
		globalUndoRollbackStack.clearStack();
	});

	it("1. Generates RFC 9562 UUIDv7 idempotency key and pushes entry to stack", () => {
		const sampleItem = {
			id: "svc-101",
			title: "Профессиональная гигиена полости рта",
			priceRub: 4500,
			toothCode: "16",
		};

		let rollbackCalled = false;
		const entry = pushDestructiveActionWithRollback({
			entityType: "visit_service",
			description: "Услуга «Профессиональная гигиена полости рта» удалена",
			item: sampleItem,
			index: 3,
			parentId: "visit-abc",
			showToast: false, // test mode
			onRollback: (item, index) => {
				rollbackCalled = true;
				assert.equal(item.id, "svc-101");
				assert.equal(index, 3);
			},
		});

		assert.ok(entry.id, "Entry must have an ID");
		assert.equal(isUuidV7(entry.id), true, `ID '${entry.id}' must be a valid RFC 9562 UUIDv7`);
		assert.equal(entry.entityType, "visit_service");
		assert.equal(entry.index, 3);
		assert.equal(entry.parentId, "visit-abc");
		assert.equal(entry.committed, false);
		assert.equal(entry.rolledBack, false);
		assert.equal(rollbackCalled, false);

		const active = globalUndoRollbackStack.getActiveEntries();
		assert.equal(active.length, 1);
		assert.equal(active[0]?.id, entry.id);
	});

	it("2. Executes atomic rollback with exact original index, item, and modifiers", () => {
		const originalService = {
			id: "svc-999",
			title: "Лечение кариеса дентина",
			toothCode: "46",
			quantity: 1,
			unitPriceRub: 5500,
			discountPercent: 10,
			isWarranty: false,
		};

		let restoredItem: typeof originalService | null = null;
		let restoredIndex = -1;

		const entry = pushDestructiveActionWithRollback({
			entityType: "visit_service",
			description: "Услуга удалена",
			item: originalService,
			index: 2,
			showToast: false,
			onRollback: (item, index) => {
				restoredItem = item;
				restoredIndex = index;
			},
		});

		const success = executeRollback(entry.id);
		assert.equal(success, true, "Rollback must succeed");
		assert.equal(entry.rolledBack, true, "Entry must be marked rolledBack");
		assert.equal(entry.committed, false, "Entry must not be committed");
		assert.deepEqual(restoredItem, originalService, "Must restore exact item with all modifiers");
		assert.equal(restoredIndex, 2, "Must restore at exact index 2");

		// Attempting second rollback on same ID must be safely rejected
		const secondRollback = executeRollback(entry.id);
		assert.equal(secondRollback, false, "Duplicate rollback must return false");
	});

	it("3. LIFO Rollback: without explicit ID, rolls back the most recent pending mutation", () => {
		const itemA = { id: "a", title: "Осмотр", price: 1000 };
		const itemB = { id: "b", title: "Снимок ОПТГ", price: 1500 };

		let rolledBackA = false;
		let rolledBackB = false;

		pushDestructiveActionWithRollback({
			entityType: "visit_service",
			description: "Удален осмотр",
			item: itemA,
			index: 0,
			showToast: false,
			onRollback: () => {
				rolledBackA = true;
			},
		});

		pushDestructiveActionWithRollback({
			entityType: "visit_service",
			description: "Удален снимок",
			item: itemB,
			index: 1,
			showToast: false,
			onRollback: () => {
				rolledBackB = true;
			},
		});

		// Calling executeRollback() without ID should rollback itemB (LIFO)
		const rolledLatest = executeRollback();
		assert.equal(rolledLatest, true);
		assert.equal(rolledBackB, true, "Item B must be rolled back first");
		assert.equal(rolledBackA, false, "Item A should still be pending");

		// Next executeRollback() rolls back itemA
		const rolledFirst = executeRollback();
		assert.equal(rolledFirst, true);
		assert.equal(rolledBackA, true, "Item A must be rolled back second");

		// Further rollbacks return false
		assert.equal(executeRollback(), false);
	});

	it("4. Expiration timer silently commits mutation after TTL expires", async () => {
		let committedMutation = false;

		const entry = pushDestructiveActionWithRollback({
			entityType: "treatment_plan_item",
			description: "Удаление процедуры плана",
			item: { id: "pl-1", name: "Имплантация Nobel" },
			index: 0,
			ttlMs: 40, // short TTL for test
			showToast: false,
			onCommit: () => {
				committedMutation = true;
			},
			onRollback: () => {
				throw new Error("Should not rollback committed entry");
			},
		});

		assert.equal(entry.committed, false);
		assert.equal(committedMutation, false);

		// Wait for TTL to elapse
		await new Promise((resolve) => setTimeout(resolve, 80));

		assert.equal(entry.committed, true, "Entry must be committed after TTL");
		assert.equal(committedMutation, true, "onCommit handler must have run");

		// Cannot rollback after commit
		const rollbackAfterCommit = executeRollback(entry.id);
		assert.equal(rollbackAfterCommit, false, "Cannot rollback an already committed mutation");
	});

	it("5. Cancel pending commit prevents onCommit without executing rollback", async () => {
		let committed = false;
		let rolledBack = false;

		const entry = pushDestructiveActionWithRollback({
			entityType: "treatment_plan_stage",
			description: "Удаление этапа",
			item: { stageNumber: 2, title: "Хирургический этап" },
			index: 1,
			ttlMs: 50,
			showToast: false,
			onCommit: () => {
				committed = true;
			},
			onRollback: () => {
				rolledBack = true;
			},
		});

		const cancelled = globalUndoRollbackStack.cancelPendingCommit(entry.id);
		assert.equal(cancelled, true, "Timer must be successfully cancelled");

		await new Promise((resolve) => setTimeout(resolve, 90));

		assert.equal(committed, false, "onCommit must not run after cancellation");
		assert.equal(rolledBack, false, "onRollback must not run");
		assert.equal(entry.committed, false);
	});

	it("6. Stack capacity bounding: prunes oldest entries when exceeding max capacity (50)", () => {
		for (let i = 0; i < 60; i++) {
			pushDestructiveActionWithRollback({
				entityType: "visit_service",
				description: `Item ${i}`,
				item: { id: `id-${i}` },
				index: i,
				showToast: false,
				onRollback: () => {},
			});
		}

		const stack = globalUndoRollbackStack.getStack();
		assert.equal(stack.length, 50, "Stack must not exceed MAX_STACK_SIZE of 50");
		// Check that the newest item is preserved at the end
		assert.equal(stack[stack.length - 1]?.description, "Item 59");
	});
});
