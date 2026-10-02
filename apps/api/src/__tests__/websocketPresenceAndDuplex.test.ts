/**
 * websocketPresenceAndDuplex.test.ts — Unit Tests for WebSocket Presence & Multi-tenant Broker
 *
 * Verifies:
 * 1. Soft Presence registration and tenant isolation.
 * 2. Active peer queries for visit and patient.
 * 3. Immediate peer cleanup on client disconnection / leave.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { wsBroker } from "../services/websocketBroker.js";

// Mock WebSocket implementation for unit testing
class MockWebSocket {
	public readyState = 1;
	public sentFrames: string[] = [];
	private listeners: Record<string, Array<() => void>> = {};

	send(data: string, cb?: (err?: Error) => void) {
		this.sentFrames.push(data);
		if (cb) cb();
	}

	on(event: string, fn: () => void) {
		if (!this.listeners[event]) this.listeners[event] = [];
		this.listeners[event].push(fn);
	}

	close() {
		this.readyState = 3;
		const closeFns = this.listeners["close"] || [];
		for (const fn of closeFns) fn();
	}
}

describe("WebSocket Broker & Soft Presence Protocol", () => {
	beforeEach(() => {
		wsBroker.clear();
	});

	it("1. Registers client and tracks active presence for visit", () => {
		const ws1 = new MockWebSocket() as unknown as import("ws").WebSocket;
		const orgId = "org-1111-2222";

		wsBroker.addClient(ws1, orgId, undefined, true);
		assert.strictEqual(wsBroker.getClientCount(), 1);

		wsBroker.updatePresence(ws1, orgId, {
			staffId: "usr-doctor-1",
			staffName: "Доктор Иванов",
			role: "doctor",
			visitId: "visit-alpha",
			action: "editing",
		});

		const peers = wsBroker.getPresence(orgId, { visitId: "visit-alpha" });
		assert.strictEqual(peers.length, 1);
		assert.strictEqual(peers[0]?.staffName, "Доктор Иванов");
		assert.strictEqual(peers[0]?.action, "editing");
	});

	it("2. Enforces multi-tenant isolation: presence in Org A is not visible in Org B", () => {
		const wsA = new MockWebSocket() as unknown as import("ws").WebSocket;
		const wsB = new MockWebSocket() as unknown as import("ws").WebSocket;

		wsBroker.addClient(wsA, "org-A", undefined, true);
		wsBroker.addClient(wsB, "org-B", undefined, true);

		wsBroker.updatePresence(wsA, "org-A", {
			staffId: "usr-admin-A",
			staffName: "Админ Клиники А",
			role: "admin",
			visitId: "shared-visit-id",
			action: "viewing",
		});

		const peersInA = wsBroker.getPresence("org-A", { visitId: "shared-visit-id" });
		const peersInB = wsBroker.getPresence("org-B", { visitId: "shared-visit-id" });

		assert.strictEqual(peersInA.length, 1);
		assert.strictEqual(peersInB.length, 0, "Org B must NOT see presence from Org A");
	});

	it("3. Automatically cleans up presence when client socket disconnects", () => {
		const mockWs = new MockWebSocket();
		const ws = mockWs as unknown as import("ws").WebSocket;
		const orgId = "org-cleanup-test";

		wsBroker.addClient(ws, orgId, undefined, true);
		wsBroker.updatePresence(ws, orgId, {
			staffId: "usr-assistant-3",
			staffName: "Ассистент Сидоров",
			role: "assistant",
			visitId: "visit-beta",
			action: "viewing",
		});

		assert.strictEqual(wsBroker.getPresence(orgId, { visitId: "visit-beta" }).length, 1);

		// Disconnect socket
		mockWs.close();

		assert.strictEqual(
			wsBroker.getPresence(orgId, { visitId: "visit-beta" }).length,
			0,
			"Presence must be purged immediately upon socket close",
		);
	});
});
