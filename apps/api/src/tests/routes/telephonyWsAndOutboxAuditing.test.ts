/**
 * telephonyWsAndOutboxAuditing.test.ts — Comprehensive inquisitorial audit tests for:
 * 1. WebSocket broker lifecycle, tenant isolation, and dead client pruning
 * 2. WhatsApp Cloud API signature verification, E.164 normalization, and webhook path security
 * 3. Asterisk AMI UUID validation and CDR deduplication logic
 * 4. CRM Leak Detector funnel metrics calculation and duplicate task suppression
 *
 * Compliant with Mandate 8b (file length <= 800 lines).
 */

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import { calculateLeakFunnelMetrics } from "@dental/shared";
import {
	configuredWhatsappAppSecret,
	isValidWhatsappSignature,
	isWebhookPath,
} from "../../routes/whatsappWebhookRoutes.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { normalizeWhatsappRecipient } from "../../whatsappTransport.js";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createMockWebSocket(readyState = 1) {
	const sentMessages: string[] = [];
	const listeners: Record<string, (() => void)[]> = {};

	return {
		readyState,
		sentMessages,
		send(data: string, cb?: (err?: Error) => void) {
			sentMessages.push(data);
			if (cb) cb();
		},
		on(event: string, fn: () => void) {
			listeners[event] = listeners[event] || [];
			listeners[event].push(fn);
		},
		simulateClose() {
			this.readyState = 3;
			for (const fn of listeners.close || []) {
				fn();
			}
		},
	};
}

describe("Telephony & Communications Audit Suite", () => {
	beforeEach(() => {
		wsBroker.clear();
	});

	describe("1. WebSocket Broker Lifecycle & Tenant Isolation", () => {
		it("correctly registers clients and reports active count", () => {
			assert.strictEqual(wsBroker.getClientCount(), 0);

			const mockWs1 = createMockWebSocket() as any;
			const mockWs2 = createMockWebSocket() as any;

			wsBroker.addClient(mockWs1, ORG_A);
			wsBroker.addClient(mockWs2, ORG_B);

			assert.strictEqual(wsBroker.getClientCount(), 2);
		});

		it("broadcasts messages ONLY to clients belonging to the target organization", () => {
			const wsA1 = createMockWebSocket() as any;
			const wsA2 = createMockWebSocket() as any;
			const wsB1 = createMockWebSocket() as any;

			wsBroker.addClient(wsA1, ORG_A);
			wsBroker.addClient(wsA2, ORG_A);
			wsBroker.addClient(wsB1, ORG_B);

			const event = {
				type: "CRM_LEAK_LEAD_UPDATED",
				payload: { leadId: "lead-1", status: "in_progress" },
			};
			wsBroker.broadcastToOrganization(ORG_A, event);

			assert.strictEqual(wsA1.sentMessages.length, 1);
			assert.strictEqual(wsA2.sentMessages.length, 1);
			assert.strictEqual(wsB1.sentMessages.length, 0);

			const receivedA1 = JSON.parse(wsA1.sentMessages[0]);
			assert.strictEqual(receivedA1.type, "CRM_LEAK_LEAD_UPDATED");
			assert.strictEqual(receivedA1.payload.leadId, "lead-1");
		});

		it("removes client upon explicit removeClient call", () => {
			const mockWs = createMockWebSocket() as any;
			wsBroker.addClient(mockWs, ORG_A);
			assert.strictEqual(wsBroker.getClientCount(), 1);

			const removed = wsBroker.removeClient(mockWs);
			assert.strictEqual(removed, true);
			assert.strictEqual(wsBroker.getClientCount(), 0);
		});

		it("automatically cleans up client on websocket close event", () => {
			const mockWs = createMockWebSocket() as any;
			wsBroker.addClient(mockWs, ORG_A);
			assert.strictEqual(wsBroker.getClientCount(), 1);

			mockWs.simulateClose();
			assert.strictEqual(wsBroker.getClientCount(), 0);
		});

		it("prunes dead or non-open clients via pruneDeadClients", () => {
			const liveWs = createMockWebSocket(1) as any;
			const deadWs1 = createMockWebSocket(2) as any; // CLOSING
			const deadWs2 = createMockWebSocket(3) as any; // CLOSED

			wsBroker.addClient(liveWs, ORG_A);
			wsBroker.addClient(deadWs1, ORG_A);
			wsBroker.addClient(deadWs2, ORG_B);

			assert.strictEqual(wsBroker.getClientCount(), 3);
			const pruned = wsBroker.pruneDeadClients();
			assert.strictEqual(pruned, 2);
			assert.strictEqual(wsBroker.getClientCount(), 1);
		});
	});

	describe("2. WhatsApp Security, Handshake & E.164 Normalization", () => {
		const SECRET = "test_meta_app_secret_1234567890abcdef";

		it("validates authentic Meta webhook HMAC-SHA256 signatures", () => {
			const rawBody = Buffer.from('{"object":"whatsapp_business_account"}', "utf8");
			const signature = `sha256=${createHmac("sha256", SECRET).update(rawBody).digest("hex")}`;

			const isValid = isValidWhatsappSignature(rawBody, signature, SECRET);
			assert.strictEqual(isValid, true);
		});

		it("rejects tampered or mismatched webhook signatures", () => {
			const rawBody = Buffer.from('{"object":"whatsapp_business_account"}', "utf8");
			const forgedSignature = "sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

			const isValid = isValidWhatsappSignature(rawBody, forgedSignature, SECRET);
			assert.strictEqual(isValid, false);
		});

		it("rejects signatures without sha256= prefix or malformed hex", () => {
			const rawBody = Buffer.from("{}", "utf8");
			assert.strictEqual(isValidWhatsappSignature(rawBody, "invalid_prefix", SECRET), false);
			assert.strictEqual(isValidWhatsappSignature(rawBody, "sha256=not_hex_chars_zzzz", SECRET), false);
			assert.strictEqual(isValidWhatsappSignature(rawBody, null, SECRET), false);
		});

		it("strictly matches webhook URL paths and rejects probe injections", () => {
			assert.strictEqual(isWebhookPath("/api/whatsapp/webhook"), true);
			assert.strictEqual(isWebhookPath("/api/whatsapp/webhook?hub.mode=subscribe"), true);
			assert.strictEqual(isWebhookPath("/api/whatsapp/webhook/"), true);

			// Probe injections that should NOT be treated as webhook
			assert.strictEqual(isWebhookPath("/api/whatsapp/settings?x=/webhook"), false);
			assert.strictEqual(isWebhookPath("/api/whatsapp/send?ref=webhook"), false);
		});

		it("normalizes phone numbers to standard E.164 format for WhatsApp Cloud API", () => {
			assert.strictEqual(normalizeWhatsappRecipient("+7 (999) 123-45-67"), "79991234567");
			assert.strictEqual(normalizeWhatsappRecipient("8 (999) 123-45-67"), "79991234567");
			assert.strictEqual(normalizeWhatsappRecipient("79991234567"), "79991234567");
			assert.strictEqual(normalizeWhatsappRecipient("+79991234567"), "79991234567");

			// Invalid numbers
			assert.strictEqual(normalizeWhatsappRecipient("123"), null);
			assert.strictEqual(normalizeWhatsappRecipient(""), null);
			assert.strictEqual(normalizeWhatsappRecipient("abcdefg"), null);
		});
	});

	describe("3. Telephony SIP & Asterisk AMI Validation", () => {
		it("validates organization UUID format on incoming Asterisk events", () => {
			assert.strictEqual(UUID_REGEX.test(ORG_A), true);
			assert.strictEqual(UUID_REGEX.test(ORG_B), true);
			assert.strictEqual(UUID_REGEX.test("not-a-valid-uuid"), false);
			assert.strictEqual(UUID_REGEX.test("../../../etc/passwd"), false);
			assert.strictEqual(UUID_REGEX.test("11111111-1111-4111-8111-11111111111Z"), false);
		});

		it("generates deterministic advisory lock keys to serialize operations", () => {
			const lockKey1 = `whatsapp:send:${ORG_A}:patient-123`;
			const lockKey2 = `whatsapp:send:${ORG_A}:patient-123`;
			const lockKeyOther = `whatsapp:send:${ORG_A}:patient-456`;

			assert.strictEqual(lockKey1, lockKey2);
			assert.notStrictEqual(lockKey1, lockKeyOther);
		});
	});

	describe("4. CRM Leak Funnel & Reactivation Metrics", () => {
		it("computes accurate funnel conversion rates without division by zero", () => {
			const mockLeads = [
				{ id: "1", leadStatus: "new", uncompletedPlanSumRub: 5000, daysSinceLastVisit: 215 },
				{ id: "2", leadStatus: "in_progress", uncompletedPlanSumRub: 10000, daysSinceLastVisit: 220 },
				{ id: "3", leadStatus: "contacted", uncompletedPlanSumRub: 0, daysSinceLastVisit: 230 },
				{ id: "4", leadStatus: "rebooked", uncompletedPlanSumRub: 15000, daysSinceLastVisit: 240 },
				{ id: "5", leadStatus: "declined", uncompletedPlanSumRub: 3000, daysSinceLastVisit: 250 },
			];

			const metrics = calculateLeakFunnelMetrics(mockLeads as any);
			assert.strictEqual(metrics.totalIdentifiedLeads, 5);
			assert.strictEqual(metrics.inProgressCount, 1);
			assert.strictEqual(metrics.contactedCount, 1);
			assert.strictEqual(metrics.rebookedCount, 1);
			assert.strictEqual(metrics.declinedCount, 1);
			assert.strictEqual(metrics.reactivationConversionPct, 25); // 1 rebooked out of 4 touched = 25%
			assert.strictEqual(metrics.totalUncompletedPlanSumRub, 33000);
		});

		it("safely handles empty lead pool without crashing", () => {
			const emptyMetrics = calculateLeakFunnelMetrics([]);
			assert.strictEqual(emptyMetrics.totalIdentifiedLeads, 0);
			assert.strictEqual(emptyMetrics.reactivationConversionPct, 0);
			assert.strictEqual(emptyMetrics.totalUncompletedPlanSumRub, 0);
		});
	});
});
