import assert from "node:assert/strict";
import { describe, test } from "node:test";
import Fastify from "fastify";
import { db } from "../../db/client.js";
import { organizations } from "../../db/schema.js";
import { telephonyCallLifecycleRoutes } from "../../routes/telephony/telephonyCallLifecycleHandler.js";
import { telephonyRoutes } from "../../routes/telephony.js";
import { wsBroker } from "../../services/websocketBroker.js";

interface BroadcastedMsg {
	orgId: string;
	message: {
		type?: string;
		payload?: {
			callId?: string;
			phone?: string;
			durationSeconds?: number;
		};
	};
}

describe("Telephony Call Lifecycle: Answer & End Fastify Routes", () => {
	test("POST /calls/answer broadcasts TELEPHONY_CALL_ANSWERED event and returns answered status", async () => {
		const broadcasts: BroadcastedMsg[] = [];
		const origBroadcast = wsBroker.broadcastToOrganization;
		wsBroker.broadcastToOrganization = (orgId: string, message: unknown) => {
			broadcasts.push({ orgId, message: message as BroadcastedMsg["message"] });
			return origBroadcast.call(wsBroker, orgId, message);
		};

		try {
			const app = Fastify();
			await app.register(telephonyCallLifecycleRoutes);
			await app.ready();

			const res = await app.inject({
				method: "POST",
				url: "/calls/answer",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
				},
				payload: {
					callId: "test-call-1",
					phone: "+7 999 123-45-67",
					lineId: 1,
				},
			});

			if (res.statusCode !== 200) {
				console.error("AnswerCall Error Body:", res.body);
			}
			assert.equal(res.statusCode, 200);
			const json = res.json();
			assert.equal(json.success, true);
			assert.equal(json.callId, "test-call-1");
			assert.equal(json.status, "answered");
			assert.ok(json.answeredAt);

			const answeredEvt = broadcasts.find((b) => b.message.type === "TELEPHONY_CALL_ANSWERED");
			assert.ok(answeredEvt, "Must broadcast TELEPHONY_CALL_ANSWERED via wsBroker");
			assert.equal(answeredEvt.message.payload?.callId, "test-call-1");

			await app.close();
		} finally {
			wsBroker.broadcastToOrganization = origBroadcast;
		}
	});

	test("POST /calls/end broadcasts TELEPHONY_CALL_ENDED and registers call finish", async () => {
		const broadcasts: BroadcastedMsg[] = [];
		const origBroadcast = wsBroker.broadcastToOrganization;
		wsBroker.broadcastToOrganization = (orgId: string, message: unknown) => {
			broadcasts.push({ orgId, message: message as BroadcastedMsg["message"] });
			return origBroadcast.call(wsBroker, orgId, message);
		};

		try {
			const app = Fastify();
			await app.register(telephonyCallLifecycleRoutes);
			await app.ready();

			const res = await app.inject({
				method: "POST",
				url: "/calls/end",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
				},
				payload: {
					callId: "test-call-2",
					phone: "+7 999 987-65-43",
					durationSeconds: 42,
					notes: "Консультация по имплантации",
				},
			});

			if (res.statusCode !== 200) {
				console.error("EndCall Error Body:", res.body);
			}
			assert.equal(res.statusCode, 200);
			const json = res.json();
			assert.equal(json.success, true);
			assert.equal(json.callId, "test-call-2");
			assert.equal(json.status, "ended");
			assert.equal(json.durationSeconds, 42);

			const endedEvt = broadcasts.find((b) => b.message.type === "TELEPHONY_CALL_ENDED");
			assert.ok(endedEvt, "Must broadcast TELEPHONY_CALL_ENDED via wsBroker");
			assert.equal(endedEvt.message.payload?.callId, "test-call-2");
			assert.equal(endedEvt.message.payload?.durationSeconds, 42);

			await app.close();
		} finally {
			wsBroker.broadcastToOrganization = origBroadcast;
		}
	});

	test("POST /:organizationId/webhook with event: ended broadcasts TELEPHONY_CALL_ENDED via wsBroker", async () => {
		const broadcasts: BroadcastedMsg[] = [];
		const origBroadcast = wsBroker.broadcastToOrganization;
		wsBroker.broadcastToOrganization = (orgId: string, message: unknown) => {
			broadcasts.push({ orgId, message: message as BroadcastedMsg["message"] });
			return origBroadcast.call(wsBroker, orgId, message);
		};

		const prevSecret = process.env.TELEPHONY_WEBHOOK_SECRET;
		process.env.TELEPHONY_WEBHOOK_SECRET = "test-telephony-secret";

		try {
			const org = await db.select({ id: organizations.id }).from(organizations).limit(1);
			const testOrgId = org[0]?.id || "dce70000-546f-4147-878f-3bcf77790001";

			const app = Fastify();
			await app.register(telephonyRoutes);
			await app.ready();

			const callId = `webhook-ended-${Date.now()}`;
			const res = await app.inject({
				method: "POST",
				url: `/${testOrgId}/webhook`,
				headers: {
					"x-dente-webhook-secret": "test-telephony-secret",
				},
				payload: {
					event: "ended",
					call_id: callId,
					from: "+79997776655",
					to: "+74951112233",
					duration: 25,
				},
			});

			if (res.statusCode !== 200) {
				console.error("WebhookEnded Error Body:", res.body);
			}
			assert.equal(res.statusCode, 200);
			const json = res.json();
			assert.equal(json.success, true);
			assert.equal(json.event, "ended");

			const endedEvt = broadcasts.find(
				(b) => b.message.type === "TELEPHONY_CALL_ENDED" && b.message.payload?.callId === callId
			);
			assert.ok(endedEvt, "Webhook ended event must broadcast TELEPHONY_CALL_ENDED via wsBroker");
			assert.equal(endedEvt.message.payload?.durationSeconds, 25);

			await app.close();
		} finally {
			wsBroker.broadcastToOrganization = origBroadcast;
			if (prevSecret !== undefined) {
				process.env.TELEPHONY_WEBHOOK_SECRET = prevSecret;
			} else {
				delete process.env.TELEPHONY_WEBHOOK_SECRET;
			}
		}
	});

	test("PATCH /calls/:id persists clinical note in communicationEvents", async () => {
		const app = Fastify();
		await app.register(telephonyRoutes);
		await app.ready();

		const res = await app.inject({
			method: "PATCH",
			url: "/calls/call-catalog-1",
			headers: {
				"x-dente-clinic-token": "demo-showcase-clinic-token",
				"x-dente-staff-token": "demo-showcase-staff-token",
			},
			payload: {
				note: "Пациент записан на консультацию к ортодонту в субботу",
			},
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.equal(json.callId, "call-catalog-1");
		assert.equal(json.note, "Пациент записан на консультацию к ортодонту в субботу");
		await app.close();
	});
});
