import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { and, eq, ilike } from "drizzle-orm";
import Fastify from "fastify";
import { db } from "../../db/client.js";
import { communicationEvents, crmLeads, organizations, patients } from "../../db/schema.js";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
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

	test("PATCH /calls/:id persists clinical note in communicationEvents and preserves call_id metadata", async () => {
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
		assert.ok(
			json.call.message.includes("[call_id: call-catalog-1]"),
			"communicationEvents.message must preserve [call_id: call-catalog-1] for webhook deduplication",
		);

		// Update note a second time: ensure [call_id: call-catalog-1] is not wiped
		const res2 = await app.inject({
			method: "PATCH",
			url: `/calls/${json.call.id}`,
			headers: {
				"x-dente-clinic-token": "demo-showcase-clinic-token",
				"x-dente-staff-token": "demo-showcase-staff-token",
			},
			payload: {
				note: "Пациент подтвердил приём и перенёс на 15:00",
			},
		});

		assert.equal(res2.statusCode, 200);
		const json2 = res2.json();
		assert.equal(json2.success, true);
		assert.ok(
			json2.call.message.includes("[call_id: call-catalog-1]"),
			"Second note update must preserve original call_id marker",
		);

		await app.close();
	});

	test("POST /:organizationId/outbound-call blocks BOLA/IDOR when rawOrgId does not match auth context", async () => {
		const app = Fastify();
		await app.register(telephonyRoutes);
		await app.ready();

		const fakeAlienOrgId = "a0000000-0000-4000-8000-000000000099";

		// Request without authentication: rejected by accessGuard
		const unauthRes = await app.inject({
			method: "POST",
			url: `/${fakeAlienOrgId}/outbound-call`,
			payload: {
				phone: "+79991234567",
			},
		});
		assert.ok(
			unauthRes.statusCode === 401 || unauthRes.statusCode === 403,
			"Unauthenticated outbound call must be rejected",
		);

		// Request with demo token (which resolves to demo clinic org): mismatched with alien UUID in URL -> 403 OrganizationMismatch
		const mismatchedRes = await app.inject({
			method: "POST",
			url: `/${fakeAlienOrgId}/outbound-call`,
			headers: {
				"x-dente-clinic-token": "demo-showcase-clinic-token",
				"x-dente-staff-token": "demo-showcase-staff-token",
			},
			payload: {
				phone: "+79991234567",
			},
		});
		assert.equal(mismatchedRes.statusCode, 403);
		const mismatchJson = mismatchedRes.json();
		assert.equal(mismatchJson.error, "OrganizationMismatch");

		await app.close();
	});

	test("Split-Brain: UI handleEndCall first, then Webhook handleEndedEvent updates recordingUrl and duration without duplicating", async () => {
		const prevSecret = process.env.TELEPHONY_WEBHOOK_SECRET;
		process.env.TELEPHONY_WEBHOOK_SECRET = "test-telephony-secret";

		const testOrgId = DEMO_SHOWCASE_ORG_ID;

		const app = Fastify();
		await app.register(telephonyRoutes);
		await app.ready();

		try {
			const callId = `splitbrain-ui-first-${Date.now()}`;
			const callerPhone = "+79051234567";

			// 1. UI ends call first
			const uiRes = await app.inject({
				method: "POST",
				url: "/calls/end",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
				},
				payload: {
					callId,
					phone: callerPhone,
					durationSeconds: 15,
					notes: "Первичный звонок из UI",
				},
			});
			assert.equal(uiRes.statusCode, 200);

			// 2. Webhook arrives second with recording URL and updated duration
			const recordingUrl = `https://cloud-pbx.example.com/recordings/rec-${callId}.mp3`;
			const webhookRes = await app.inject({
				method: "POST",
				url: `/${testOrgId}/webhook`,
				headers: {
					"x-dente-webhook-secret": "test-telephony-secret",
				},
				payload: {
					event: "ended",
					call_id: callId,
					from: callerPhone,
					to: "+74951112233",
					duration: 48,
					recording_url: recordingUrl,
				},
			});
			assert.equal(webhookRes.statusCode, 200);

			// 3. Verify exactly 1 communicationEvent exists, and recordingUrl/duration were updated
			const events = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, testOrgId),
						ilike(communicationEvents.message, `%${callId}%`),
					),
				);

			assert.equal(events.length, 1, "Must NOT duplicate communicationEvent row");
			assert.ok(events[0]?.recordingUrl, "recordingUrl must be populated by the webhook");
			assert.equal(events[0]?.durationSeconds, 48, "durationSeconds must be updated to accurate PBX duration");
		} finally {
			await app.close();
			if (prevSecret !== undefined) {
				process.env.TELEPHONY_WEBHOOK_SECRET = prevSecret;
			} else {
				delete process.env.TELEPHONY_WEBHOOK_SECRET;
			}
		}
	});

	test("Split-Brain: Webhook handleEndedEvent first, then UI handleEndCall updates notes without duplicating", async () => {
		const prevSecret = process.env.TELEPHONY_WEBHOOK_SECRET;
		process.env.TELEPHONY_WEBHOOK_SECRET = "test-telephony-secret";

		const testOrgId = DEMO_SHOWCASE_ORG_ID;

		const app = Fastify();
		await app.register(telephonyRoutes);
		await app.ready();

		try {
			const callId = `splitbrain-webhook-first-${Date.now()}`;
			const callerPhone = "+79057654321";
			const recordingUrl = `https://cloud-pbx.example.com/recordings/rec-${callId}.mp3`;

			// 1. Webhook arrives first
			const webhookRes = await app.inject({
				method: "POST",
				url: `/${testOrgId}/webhook`,
				headers: {
					"x-dente-webhook-secret": "test-telephony-secret",
				},
				payload: {
					event: "ended",
					call_id: callId,
					from: callerPhone,
					to: "+74951112233",
					duration: 60,
					recording_url: recordingUrl,
				},
			});
			assert.equal(webhookRes.statusCode, 200);

			// 2. UI ends call second with operator note
			const uiRes = await app.inject({
				method: "POST",
				url: "/calls/end",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
				},
				payload: {
					callId,
					phone: callerPhone,
					durationSeconds: 60,
					notes: "Заметка оператора: пациент записался на чистку",
				},
			});
			assert.equal(uiRes.statusCode, 200);

			// 3. Verify exactly 1 communicationEvent exists, note was merged, and recordingUrl preserved
			const events = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, testOrgId),
						ilike(communicationEvents.message, `%${callId}%`),
					),
				);

			assert.equal(events.length, 1, "Must NOT create second communicationEvent on UI endCall");
			assert.ok(events[0]?.message.includes("пациент записался на чистку"), "Operator note must be preserved");
			assert.ok(events[0]?.recordingUrl, "recordingUrl must be preserved");
		} finally {
			await app.close();
			if (prevSecret !== undefined) {
				process.env.TELEPHONY_WEBHOOK_SECRET = prevSecret;
			} else {
				delete process.env.TELEPHONY_WEBHOOK_SECRET;
			}
		}
	});

	test("DEFECT-4: Inbound SMS from unknown number routes to crmLeads and does NOT create fake patients", async () => {
		const prevSecret = process.env.TELEPHONY_WEBHOOK_SECRET;
		process.env.TELEPHONY_WEBHOOK_SECRET = "test-telephony-secret";

		const testOrgId = DEMO_SHOWCASE_ORG_ID;

		const app = Fastify();
		await app.register(telephonyRoutes);
		await app.ready();

		try {
			const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
			const unknownPhone = `+7900${randomSuffix}`;
			const smsText = `Тестовое сообщение лида ${randomSuffix}`;

			const smsRes = await app.inject({
				method: "POST",
				url: `/${testOrgId}/sms/webhook`,
				headers: {
					"x-dente-webhook-secret": "test-telephony-secret",
				},
				payload: {
					from: unknownPhone,
					message: smsText,
					sms_id: `sms-${randomSuffix}`,
				},
			});
			assert.equal(smsRes.statusCode, 200);

			// 1. Verify NO patient was created
			const fakePatient = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, testOrgId),
						eq(patients.phone, unknownPhone),
					),
				);
			assert.equal(fakePatient.length, 0, "Unknown SMS sender must NOT be inserted into patients");

			// 2. Verify lead was created in crmLeads
			const lead = await db
				.select()
				.from(crmLeads)
				.where(
					and(
						eq(crmLeads.organizationId, testOrgId),
						eq(crmLeads.phone, unknownPhone),
					),
				);
			assert.equal(lead.length, 1, "Must create lead in crmLeads");
			assert.equal(lead[0]?.source, "sms");
			assert.equal(lead[0]?.status, "new");

			// 3. Verify communicationEvent has patientId: null and callerPhone set
			const event = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, testOrgId),
						eq(communicationEvents.callerPhone, unknownPhone),
					),
				);
			assert.equal(event.length, 1);
			assert.equal(event[0]?.patientId, null, "patientId must be null for prospective leads");
			assert.equal(event[0]?.channel, "sms");
		} finally {
			await app.close();
			if (prevSecret !== undefined) {
				process.env.TELEPHONY_WEBHOOK_SECRET = prevSecret;
			} else {
				delete process.env.TELEPHONY_WEBHOOK_SECRET;
			}
		}
	});

	test("ATOMIC UPSERT: Repeated webhook ended events with same call_id do not duplicate communicationEvents", async () => {
		const prevSecret = process.env.TELEPHONY_WEBHOOK_SECRET;
		process.env.TELEPHONY_WEBHOOK_SECRET = "test-telephony-secret";
		const testOrgId = DEMO_SHOWCASE_ORG_ID;

		const app = Fastify();
		await app.register(telephonyRoutes);
		await app.ready();

		try {
			const callId = `atomic-upsert-${Date.now()}`;
			const callerPhone = "+79161239988";

			// First webhook ended event
			const res1 = await app.inject({
				method: "POST",
				url: `/${testOrgId}/webhook`,
				headers: { "x-dente-webhook-secret": "test-telephony-secret" },
				payload: {
					event: "ended",
					call_id: callId,
					from: callerPhone,
					to: "+74951112233",
					duration: 35,
					recording_url: `https://cloud-pbx.example.com/rec1-${callId}.mp3`,
				},
			});
			assert.equal(res1.statusCode, 200);

			// Second webhook ended event for the same call_id (e.g. PBX retry with transcription)
			const res2 = await app.inject({
				method: "POST",
				url: `/${testOrgId}/webhook`,
				headers: { "x-dente-webhook-secret": "test-telephony-secret" },
				payload: {
					event: "ended",
					call_id: callId,
					from: callerPhone,
					to: "+74951112233",
					duration: 38,
					recording_url: `https://cloud-pbx.example.com/rec2-${callId}.mp3`,
				},
			});
			assert.equal(res2.statusCode, 200);

			const rows = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, testOrgId),
						eq(communicationEvents.providerCallId, callId),
					),
				);

			assert.equal(rows.length, 1, "Must contain exactly 1 event via atomic onConflictDoUpdate");
			assert.equal(rows[0]?.durationSeconds, 38, "Must update durationSeconds to 38");
			assert.equal(rows[0]?.recordingUrl, `https://cloud-pbx.example.com/rec2-${callId}.mp3`);
		} finally {
			await app.close();
			if (prevSecret !== undefined) process.env.TELEPHONY_WEBHOOK_SECRET = prevSecret;
			else delete process.env.TELEPHONY_WEBHOOK_SECRET;
		}
	});

	test("NOTE CORRUPTION PREVENTION: Updating note for unknown callId creates new record without overwriting past calls", async () => {
		const testOrgId = DEMO_SHOWCASE_ORG_ID;
		const app = Fastify();
		await app.register(telephonyRoutes);
		await app.ready();

		try {
			const sharedPhone = "+79037778899";

			// 1. Existing historical call with note A
			const [oldCall] = await db
				.insert(communicationEvents)
				.values({
					organizationId: testOrgId,
					providerCallId: `historic-call-${Date.now()}`,
					providerName: "telephony",
					callerPhone: sharedPhone,
					channel: "phone",
					direction: "inbound",
					status: "completed",
					message: "Исторический разговор: Заметка прошлого месяца [call_id: old-call-1]",
					durationSeconds: 120,
				})
				.returning();

			assert.ok(oldCall);

			// 2. Client sends note update with a NEW unknown callId
			const newCallId = `new-call-session-${Date.now()}`;
			const res = await app.inject({
				method: "PATCH",
				url: `/calls/${newCallId}`,
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
				},
				payload: {
					callerPhone: sharedPhone,
					note: "Свежая заметка: Пациент хочет записаться завтра",
				},
			});

			assert.equal(res.statusCode, 200);
			const json = res.json();
			assert.equal(json.success, true);

			// 3. Verify OLD call was NOT overwritten!
			const [recheckedOldCall] = await db
				.select()
				.from(communicationEvents)
				.where(eq(communicationEvents.id, oldCall.id));

			assert.ok(
				recheckedOldCall?.message.includes("Исторический разговор: Заметка прошлого месяца"),
				"Old call message must NOT be corrupted by new note!",
			);

			// 4. Verify NEW call record was created with newCallId
			const [createdNewCall] = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, testOrgId),
						eq(communicationEvents.providerCallId, newCallId),
					),
				);

			assert.ok(createdNewCall, "New call record must be created for the new callId");
			assert.ok(createdNewCall?.message.includes("Свежая заметка: Пациент хочет записаться завтра"));
		} finally {
			await app.close();
		}
	});
});
