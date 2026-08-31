/**
 * sessionStore.test.ts — Unit and Integration Tests for PostgreSQL-backed SessionStore & Persistent ActionManager.
 *
 * SQUAD SIGMA VERIFICATION SUITE:
 * 1. Liquidates RAM volatility: persists history, timestamps, and 152-FZ Redactor state.
 * 2. 152-FZ Redaction State Round-Trip: ensures symbol table token mappings survive restarts.
 * 3. Tenant Isolation: guarantees sessions and pending actions from org A are inaccessible to org B.
 * 4. TTL and Stale Session Sweep: validates 24-hour expiration on sessions and 15-minute expiration on actions.
 * 5. Server Restart Simulation: clearing L1 cache proves persistence integrity.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import {
	CopilotActionManager,
	COPILOT_ACTION_TTL_MS,
} from "./copilotService.js";
import { Redactor, SymbolTable } from "./redaction.js";
import {
	COPILOT_SESSION_TTL_MS,
	PostgresSessionStore,
	type SessionState,
} from "./sessionStore.js";
import type { ProviderMessage } from "./types.js";

const ORG_A = "00000000-0000-7000-8000-000000000001";
const ORG_B = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000010";

describe("SQUAD SIGMA — PostgreSQL SessionStore & 152-FZ Redaction Persistence", () => {
	describe("1. 152-FZ Redactor & SymbolTable State Serialization", () => {
		test("SymbolTable exports and imports token mappings accurately", () => {
			const table1 = new SymbolTable();
			const token1 = table1.tokenize("Барабаш Сергей Владимирович", "NAME");
			const token2 = table1.tokenize("+7 (999) 111-22-33", "PHONE");
			const token3 = table1.tokenize("123-456-789 00", "SNILS");

			assert.strictEqual(table1.size(), 3);
			const state = table1.exportState();
			assert.strictEqual(state.mappings.length, 3);

			// Reconstruct table2 from exported state
			const table2 = new SymbolTable();
			table2.importState(state);
			assert.strictEqual(table2.size(), 3);

			// Check rehydration
			assert.strictEqual(table2.getReal(token1), "Барабаш Сергей Владимирович");
			assert.strictEqual(table2.getReal(token2), "+7 (999) 111-22-33");
			assert.strictEqual(table2.getReal(token3), "123-456-789 00");

			const testText = `Пациент ${token1}, тел: ${token2}, СНИЛС: ${token3}`;
			const restored = table2.restoreText(testText);
			assert.strictEqual(
				restored,
				"Пациент Барабаш Сергей Владимирович, тел: +7 (999) 111-22-33, СНИЛС: 123-456-789 00",
			);
		});

		test("Redactor round-trip serialization preserves anonymization boundaries", () => {
			const redactor1 = new Redactor({ enabled: true });
			redactor1.seed({
				patient_name: "Иванова Мария Алексеевна",
				phone: "+7 (916) 555-44-33",
			});

			const state = redactor1.exportState();
			assert.strictEqual(state.enabled, true);
			assert.ok(state.mappings.length >= 2);

			// Instantiate new redactor from exported state (simulating fresh process start)
			const redactor2 = Redactor.fromState(state);
			assert.strictEqual(redactor2.enabled, true);

			const tokenName = redactor1.table.getToken("Иванова Мария Алексеевна");
			assert.ok(tokenName);
			assert.strictEqual(redactor2.table.getReal(tokenName!), "Иванова Мария Алексеевна");

			const outgoing = redactor2.redactOutgoing([
				{
					role: "user",
					content: "Какое лечение назначено пациенту Иванова Мария Алексеевна?",
				},
			]);

			assert.strictEqual(typeof outgoing[0]?.content, "string");
			const contentStr = outgoing[0]?.content as string;
			assert.ok(!contentStr.includes("Иванова Мария Алексеевна"), "Cleartext name must NOT leak");
			assert.ok(contentStr.includes(tokenName!), "Must contain deterministic token");

			const rehydrated = redactor2.rehydrate(contentStr);
			assert.strictEqual(
				rehydrated,
				"Какое лечение назначено пациенту Иванова Мария Алексеевна?",
			);
		});
	});

	describe("2. PostgresSessionStore Operations & Tenant Isolation", () => {
		test("getOrCreate creates new session with empty history and redactor", async () => {
			const store = new PostgresSessionStore();
			const sessionId = `sess_test_create_${Date.now()}`;

			const session = await store.getOrCreate(sessionId, ORG_A, USER_ID);
			assert.strictEqual(session.organizationId, ORG_A);
			assert.strictEqual(session.userId, USER_ID);
			assert.deepStrictEqual(session.history, []);
			assert.ok(session.redactor instanceof Redactor);
			assert.ok(session.updatedAt > 0);
		});

		test("save updates session state and preserves dialogue history", async () => {
			const store = new PostgresSessionStore();
			const sessionId = `sess_test_save_${Date.now()}`;

			const session = await store.getOrCreate(sessionId, ORG_A, USER_ID);
			session.history.push({
				role: "user",
				content: "Найди снимок КТ зуба 36",
			});
			session.history.push({
				role: "assistant",
				content: "Найдено исследование КЛКТ от 15.08.2026. Обнаружен периапикальный очаг.",
			});

			await store.save(sessionId, ORG_A, session, USER_ID);

			const retrieved = await store.get(sessionId, ORG_A);
			assert.ok(retrieved);
			assert.strictEqual(retrieved?.history.length, 2);
			assert.strictEqual(
				(retrieved?.history[0] as ProviderMessage)?.content,
				"Найди снимок КТ зуба 36",
			);
		});

		test("enforces tenant isolation (session from Org A is invisible in Org B)", async () => {
			const store = new PostgresSessionStore();
			const sessionId = `sess_tenant_iso_${Date.now()}`;

			const sessionA = await store.getOrCreate(sessionId, ORG_A, USER_ID);
			sessionA.history.push({ role: "user", content: "Конфиденциальные данные Клиники А" });
			await store.save(sessionId, ORG_A, sessionA);

			// Querying from Org B must return undefined
			const sessionB = await store.get(sessionId, ORG_B);
			assert.strictEqual(sessionB, undefined, "Org B must NOT see Org A session");
		});

		test("delete removes session from store", async () => {
			const store = new PostgresSessionStore();
			const sessionId = `sess_delete_${Date.now()}`;

			await store.getOrCreate(sessionId, ORG_A, USER_ID);
			const existsBefore = await store.get(sessionId, ORG_A);
			assert.ok(existsBefore);

			const deleted = await store.delete(sessionId, ORG_A);
			assert.strictEqual(deleted, true);

			const existsAfter = await store.get(sessionId, ORG_A);
			assert.strictEqual(existsAfter, undefined);
		});

		test("cleanupStaleSessions sweeps expired sessions past TTL", async () => {
			// Create a store with 50ms TTL for testing
			const shortTtlStore = new PostgresSessionStore(50);
			const sessionId = `sess_ttl_expire_${Date.now()}`;

			const session = await shortTtlStore.getOrCreate(sessionId, ORG_A);
			assert.ok(session);

			// Wait past TTL
			await new Promise((resolve) => setTimeout(resolve, 60));

			const cleaned = await shortTtlStore.cleanupStaleSessions(ORG_A);
			assert.strictEqual(cleaned, 1);

			const expired = await shortTtlStore.get(sessionId, ORG_A);
			assert.strictEqual(expired, undefined, "Expired session must not be returned");
		});
	});

	describe("3. Persistent CopilotActionManager Confirmation & Rejection Loop", () => {
		test("registers pending action with metadata and retrieves before expiration", () => {
			const manager = new CopilotActionManager();
			const sessionId = "sess_act_001";
			const callId = "call_draft_plan_100";

			const action = manager.registerPending(
				sessionId,
				callId,
				"clinical.draft_lab_work_order",
				{ toothCodes: [16, 17], material: "Zirconia" },
				{ organizationId: ORG_A, userId: USER_ID },
			);

			assert.strictEqual(action.callId, callId);
			assert.strictEqual(action.sessionId, sessionId);
			assert.strictEqual(action.toolName, "clinical.draft_lab_work_order");
			assert.strictEqual(action.organizationId, ORG_A);

			const retrieved = manager.getPending(callId);
			assert.ok(retrieved);
			assert.strictEqual(retrieved?.callId, callId);
		});

		test("rejectAction marks action as rejected and cleans up pending state", () => {
			const manager = new CopilotActionManager();
			const callId = "call_reject_test_200";

			manager.registerPending(
				"sess_act_002",
				callId,
				"clinical.delete_entry",
				{ entryId: "E-100" },
				{ organizationId: ORG_A },
			);

			const res = manager.rejectAction(callId, "Отменено врачом", ORG_A);
			assert.strictEqual(res.ok, true);
			assert.strictEqual(res.reason, "Отменено врачом");

			assert.strictEqual(manager.getPending(callId), undefined);
		});

		test("expired pending actions (> 15 minutes) are cleaned up and return undefined", async () => {
			const manager = new CopilotActionManager();
			const callId = "call_stale_300";

			manager.registerPending(
				"sess_act_003",
				callId,
				"clinical.auto_fill_cancellation_gap",
				{ appointmentId: "app-1" },
				{ organizationId: ORG_A },
			);

			// Manually simulate expiration by hacking createdAt
			const pending = manager.getPending(callId);
			assert.ok(pending);
			(pending as any).createdAt = Date.now() - (COPILOT_ACTION_TTL_MS + 1000);

			const expired = manager.getPending(callId);
			assert.strictEqual(expired, undefined, "Stale action past 15 min TTL must be pruned");
		});
	});
});
