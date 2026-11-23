import { and, eq } from "drizzle-orm";
import Fastify from "fastify";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { db } from "../../db/client.js";
import { communicationEvents, organizations, patients } from "../../db/schema.js";
import {
	cleanupStaleRingingCalls,
	telephonyCallLifecycleRoutes,
} from "../../routes/telephony/telephonyCallLifecycleHandler.js";
import { telephonyOutboundCallHandler } from "../../routes/telephony/telephonyOutboundHandler.js";
import { telephonyRoutes } from "../../routes/telephony/index.js";
import { detectTelephonyProvider } from "../../routes/telephony/telephonyEngine.js";
import { handleStreamRecording } from "../../routes/telephony/telephonyRecordingStreamHandler.js";
import {
	authenticatePbxWebhook,
	detectMarketingAttribution,
	resolveOrgTelephonySecrets,
} from "../../services/telephony/telephonySecurity.js";
import { MissedCallService } from "../../services/telephony/missedCallService.js";
import { TelephonyGatewayService } from "../../services/telephony/telephonyGatewayService.js";
import { telephonyOutboxService } from "../../services/telephonyOutboxService.js";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";

describe("Red Team Fixer Proof: Telephony Defect Fixes", () => {
	it("DEFECT 1: outbound call saves providerCallId to communicationEvents", async () => {
		const prevOnline = process.env.PBX_FORCE_ONLINE;
		const prevAmiSecret = process.env.ASTERISK_AMI_SECRET;
		const prevAmiHost = process.env.ASTERISK_AMI_HOST;
		const prevNodeEnv = process.env.NODE_ENV;

		process.env.NODE_ENV = "test";
		process.env.PBX_FORCE_ONLINE = "1";
		process.env.ASTERISK_AMI_SECRET = "test-ami-secret";
		process.env.ASTERISK_AMI_HOST = "127.0.0.1";
		await TelephonyGatewayService.setForcedFailover(DEMO_SHOWCASE_ORG_ID, false);

		try {
			const app = Fastify();
			app.post("/outbound-call", telephonyOutboundCallHandler);
			await app.ready();

			const testPhone = "+79991112233";
			const res = await app.inject({
				method: "POST",
				url: "/outbound-call",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
				},
				payload: {
					phone: testPhone,
					patientName: "Тестовый Пациент",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const json = res.json();
			assert.strictEqual(json.success, true);
			assert.ok(json.callId);

			const events = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, DEMO_SHOWCASE_ORG_ID),
						eq(communicationEvents.providerCallId, json.callId),
					),
				);

			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0]?.providerCallId, json.callId);
			assert.strictEqual(events[0]?.direction, "outbound");
			assert.strictEqual(events[0]?.status, "queued");

			await app.close();
		} finally {
			if (prevNodeEnv !== undefined) process.env.NODE_ENV = prevNodeEnv;
			else delete process.env.NODE_ENV;
			if (prevOnline !== undefined) process.env.PBX_FORCE_ONLINE = prevOnline;
			else delete process.env.PBX_FORCE_ONLINE;
			if (prevAmiSecret !== undefined) process.env.ASTERISK_AMI_SECRET = prevAmiSecret;
			else delete process.env.ASTERISK_AMI_SECRET;
			if (prevAmiHost !== undefined) process.env.ASTERISK_AMI_HOST = prevAmiHost;
			else delete process.env.ASTERISK_AMI_HOST;
		}
	});

	it("DEFECT 2: cleanupStaleRingingCalls does NOT touch needs_call and only cleans queued", async () => {
		const orgId = DEMO_SHOWCASE_ORG_ID;
		const oldDate = new Date(Date.now() - 600 * 1000); // 10 minutes ago (>300s)

		const [needsCallRow] = await db
			.insert(communicationEvents)
			.values({
				organizationId: orgId,
				providerCallId: `proof-needs-call-${Date.now()}`,
				providerName: "telephony",
				callerPhone: "+79992223344",
				channel: "phone",
				direction: "inbound",
				status: "needs_call",
				message: "Пропущенный звонок пациента, ожидающий перезвона",
				createdAt: oldDate,
			})
			.returning();

		const [queuedRow] = await db
			.insert(communicationEvents)
			.values({
				organizationId: orgId,
				providerCallId: `proof-queued-${Date.now()}`,
				providerName: "telephony",
				callerPhone: "+79993334455",
				channel: "phone",
				direction: "outbound",
				status: "queued",
				message: "Зависший исходящий звонок",
				createdAt: oldDate,
			})
			.returning();

		const result = await cleanupStaleRingingCalls(orgId, 300);
		assert.ok(result.cleanedCount >= 1);

		// Verify needs_call remains untouched!
		const [recheckedNeedsCall] = await db
			.select()
			.from(communicationEvents)
			.where(eq(communicationEvents.id, needsCallRow!.id));
		assert.strictEqual(recheckedNeedsCall?.status, "needs_call");
		assert.ok(!recheckedNeedsCall?.message?.includes("[Авто-завершение"));

		// Verify queued is transitioned to failed
		const [recheckedQueued] = await db
			.select()
			.from(communicationEvents)
			.where(eq(communicationEvents.id, queuedRow!.id));
		assert.strictEqual(recheckedQueued?.status, "failed");
		assert.ok(recheckedQueued?.message?.includes("[Авто-завершение: таймаут звонка >300с]"));
	});

	it("DEFECT 3 & 4: MissedCallService handles repeated callId with onConflictDoNothing without poisoned transaction", async () => {
		const orgId = DEMO_SHOWCASE_ORG_ID;
		const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
		const callId = `proof-missed-${Date.now()}-${randomSuffix}`;
		const phone = `+7999${randomSuffix}`;

		// First missed call
		const result1 = await MissedCallService.handleMissedCall({
			organizationId: orgId,
			phone,
			callId,
			provider: "mango",
		});
		assert.strictEqual(result1.success, true);

		// Second missed call with the same callId (idempotent replay)
		const result2 = await MissedCallService.handleMissedCall({
			organizationId: orgId,
			phone,
			callId,
			provider: "mango",
		});
		assert.strictEqual(result2.success, true);

		const events = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.providerCallId, callId),
				),
			);
		assert.strictEqual(events.length, 1);
	});

	it("DEFECT 5: Asterisk AMI ended event updates existing call durationSeconds and recordingUrl", async () => {
		const orgId = DEMO_SHOWCASE_ORG_ID;
		const callId = `asterisk-unique-${Date.now()}`;
		const phone = "+79995556677";

		// Initial ringing event
		await TelephonyGatewayService.processAsteriskAmiEvent(orgId, {
			event: "Ringing",
			uniqueid: callId,
			callerIdNum: phone,
		});

		// Follow-up ended CDR event
		const endedResult = await TelephonyGatewayService.processAsteriskAmiEvent(orgId, {
			event: "Cdr",
			uniqueid: callId,
			callerIdNum: phone,
			billsec: 95,
			recordingUrl: "https://asterisk.clinic.lan/monitor/call-rec-95.wav",
		});
		assert.strictEqual(endedResult.success, true);
		assert.strictEqual(endedResult.event, "ended");

		const events = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.providerCallId, callId),
				),
			);
		assert.strictEqual(events.length, 1);
		assert.strictEqual(events[0]?.durationSeconds, 95);
		assert.strictEqual(events[0]?.recordingUrl, "https://asterisk.clinic.lan/monitor/call-rec-95.wav");
		assert.strictEqual(events[0]?.status, "completed");
	});

	it("DEFECT 7: TelephonyGatewayService caches reachability and does not stall event loop", async () => {
		TelephonyGatewayService.clearForcedFailoverCache();

		const start = Date.now();
		const status1 = await TelephonyGatewayService.evaluateTelephonyGatewayStatus(DEMO_SHOWCASE_ORG_ID);
		const elapsed1 = Date.now() - start;

		const start2 = Date.now();
		const status2 = await TelephonyGatewayService.evaluateTelephonyGatewayStatus(DEMO_SHOWCASE_ORG_ID);
		const elapsed2 = Date.now() - start2;

		assert.ok(elapsed1 < 1500); // 400ms timeout max instead of 2000ms
		assert.ok(elapsed2 < 50);   // cached result takes <50ms
		assert.ok(status1.activeMode);
		assert.strictEqual(status2.activeMode, status1.activeMode);
	});

	it("DEFECT 8 (SEV-1.2): detectMarketingAttribution accurately maps UTM parameters, advertising channels, and target numbers", () => {
		// 1. Avito attribution
		const attrAvito = detectMarketingAttribution({
			utm_source: "avito",
			utm_medium: "cpc",
			utm_campaign: "promo_implants",
		});
		assert.strictEqual(attrAvito.channel, "avito");
		assert.strictEqual(attrAvito.channelLabel, "Авито");

		// 2. Yandex Direct attribution
		const attrYandex = detectMarketingAttribution({
			utm_source: "yandex",
			utm_medium: "direct",
			utm_campaign: "search_veneers",
		});
		assert.strictEqual(attrYandex.channel, "yandex_direct");
		assert.strictEqual(attrYandex.channelLabel, "Яндекс.Директ");

		// 3. 2GIS attribution
		const attr2Gis = detectMarketingAttribution({
			advertising_channel: "2gis",
		});
		assert.strictEqual(attr2Gis.channel, "gis_2");
		assert.strictEqual(attr2Gis.channelLabel, "2ГИС Карты");

		// 4. ProDoctorov attribution
		const attrProdoc = detectMarketingAttribution({
			targetRaw: "ПроДокторов Колл-трекинг",
		});
		assert.strictEqual(attrProdoc.channel, "prodoctorov");
		assert.strictEqual(attrProdoc.channelLabel, "ПроДокторов");
	});

	it("DEFECT 9 (SEV-2): Sipuni detection and MD5 webhook signature authentication", async () => {
		// 1. Engine detects Sipuni provider from hash or event
		const detectedFromHash = detectTelephonyProvider({
			hash: "0123456789abcdef0123456789abcdef",
			user: "sipuni_user_1",
		});
		assert.strictEqual(detectedFromHash, "sipuni");

		const detectedFromEvent = detectTelephonyProvider({
			event: "sipuni_call_record",
		});
		assert.strictEqual(detectedFromEvent, "sipuni");

		// 2. Sipuni MD5 Authentication
		const secret = "sipuni-secret-key-456";
		const bodyObj = {
			call_id: "sipuni-call-999",
			from: "+79991234567",
			to: "+74950001122",
		};
		// Sipuni calculates MD5 of concatenated sorted values + secret
		const sortedConcat = Object.keys(bodyObj).sort().map((k) => String(bodyObj[k as keyof typeof bodyObj])).join("");
		const hash = createHash("md5").update(`${sortedConcat}${secret}`).digest("hex");

		const prevSipuni = process.env.SIPUNI_API_SECRET;
		process.env.SIPUNI_API_SECRET = secret;

		try {
			const mockReq = {
				headers: {},
				query: {},
				body: { ...bodyObj, hash },
				log: { warn: () => {}, error: () => {} },
				ip: "127.0.0.1",
				url: "/telephony/webhook",
			} as unknown as Parameters<typeof authenticatePbxWebhook>[0];

			const mockReply = {
				status: () => mockReply,
				send: () => mockReply,
			} as unknown as Parameters<typeof authenticatePbxWebhook>[1];

			const isValid = await authenticatePbxWebhook(
				mockReq,
				mockReply,
				DEMO_SHOWCASE_ORG_ID,
				{ hash },
			);
			assert.strictEqual(isValid, true);
		} finally {
			if (prevSipuni !== undefined) process.env.SIPUNI_API_SECRET = prevSipuni;
			else delete process.env.SIPUNI_API_SECRET;
		}
	});

	it("DEFECT 10 (SEV-3): handleStreamRecording blocks BOLA when URL organizationId mismatches auth context", async () => {
		const app = Fastify();
		app.get("/:organizationId/recordings/:eventId/stream", handleStreamRecording);
		await app.ready();

		try {
			// Request with token for DEMO_SHOWCASE_ORG_ID, but URL points to a different org UUID
			const victimOrgId = "00000000-0000-0000-0000-999999999999";
			const fakeEventId = "00000000-0000-0000-0000-111111111111";

			const res = await app.inject({
				method: "GET",
				url: `/${victimOrgId}/recordings/${fakeEventId}/stream`,
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
				},
			});

			assert.strictEqual(res.statusCode, 403);
			const json = res.json();
			assert.strictEqual(json.error, "OrganizationMismatch");
			assert.ok(json.message.includes("Несовпадение идентификатора организации"));
		} finally {
			await app.close();
		}
	});

	it("DEFECT 11 (SEV-1): Gravitel provider detection and cryptographic webhook verification", async () => {
		// 1. Detection
		const p1 = detectTelephonyProvider({ provider: "gravitel" });
		assert.strictEqual(p1, "gravitel");

		const p2 = detectTelephonyProvider({ gravitel_call_id: "grv-call-999" });
		assert.strictEqual(p2, "gravitel");

		const p3 = detectTelephonyProvider({}, "gravitel_incoming_call");
		assert.strictEqual(p3, "gravitel");

		// 2. Authentication
		const secret = "gravitel-secret-key-789";
		const prevSecret = process.env.GRAVITEL_API_SECRET;
		process.env.GRAVITEL_API_SECRET = secret;

		try {
			const bodyObj = { call_id: "grv-12345", from: "+79998887766" };
			const rawBodyStr = JSON.stringify(bodyObj);
			const expectedHmac = createHmac("sha256", secret).update(rawBodyStr).digest("hex");

			const app = Fastify();
			app.post("/webhook", async (req, reply) => {
				const isValid = await authenticatePbxWebhook(
					req,
					reply,
					DEMO_SHOWCASE_ORG_ID,
					bodyObj,
				);
				return reply.send({ isValid });
			});
			await app.ready();

			const res = await app.inject({
				method: "POST",
				url: "/webhook",
				headers: { "x-gravitel-signature": expectedHmac },
				payload: bodyObj,
			});

			assert.strictEqual(res.statusCode, 200);
			assert.strictEqual(res.json().isValid, true);
			await app.close();
		} finally {
			if (prevSecret !== undefined) process.env.GRAVITEL_API_SECRET = prevSecret;
			else delete process.env.GRAVITEL_API_SECRET;
		}
	});

	it("DEFECT 12 (SEV-1): MTS Exolve provider detection and HMAC-SHA256 signature verification", async () => {
		// 1. Detection
		const p1 = detectTelephonyProvider({ voice_call_id: "exolve-call-101" });
		assert.strictEqual(p1, "mts_exolve");

		const p2 = detectTelephonyProvider({ provider: "mts_exolve" });
		assert.strictEqual(p2, "mts_exolve");

		const p3 = detectTelephonyProvider({}, "exolve_call_terminated");
		assert.strictEqual(p3, "mts_exolve");

		// 2. Authentication
		const secret = "mts-exolve-secret-321";
		const prevSecret = process.env.MTS_EXOLVE_WEBHOOK_SECRET;
		process.env.MTS_EXOLVE_WEBHOOK_SECRET = secret;

		try {
			const bodyObj = { voice_call_id: "exolve-call-101", duration: 45 };
			const rawBodyStr = JSON.stringify(bodyObj);
			const expectedHmac = createHmac("sha256", secret).update(rawBodyStr).digest("hex");

			const app = Fastify();
			app.post("/webhook", async (req, reply) => {
				const isValid = await authenticatePbxWebhook(
					req,
					reply,
					DEMO_SHOWCASE_ORG_ID,
					bodyObj,
				);
				return reply.send({ isValid });
			});
			await app.ready();

			const res = await app.inject({
				method: "POST",
				url: "/webhook",
				headers: { "x-mts-exolve-signature": `sha256=${expectedHmac}` },
				payload: bodyObj,
			});

			assert.strictEqual(res.statusCode, 200);
			assert.strictEqual(res.json().isValid, true);
			await app.close();
		} finally {
			if (prevSecret !== undefined) process.env.MTS_EXOLVE_WEBHOOK_SECRET = prevSecret;
			else delete process.env.MTS_EXOLVE_WEBHOOK_SECRET;
		}
	});

	it("DEFECT 13 (SEV-2): telephonyOutboxService enqueues with idempotencyKey and flags duplicate webhooks", async () => {
		const callId = `outbox-dedup-call-${Date.now()}`;
		const rawPayload = {
			call_id: callId,
			from: "+79998881122",
			to: "+74950009988",
			event: "ringing",
		};

		const res1 = await telephonyOutboxService.enqueuePbxWebhook({
			rawPayload,
			routeOrganizationId: DEMO_SHOWCASE_ORG_ID,
		});
		assert.strictEqual(res1.success, true);
		assert.strictEqual(res1.isDuplicate, false);

		// Replay same webhook payload
		const res2 = await telephonyOutboxService.enqueuePbxWebhook({
			rawPayload,
			routeOrganizationId: DEMO_SHOWCASE_ORG_ID,
		});
		assert.strictEqual(res2.success, true);
		assert.strictEqual(res2.isDuplicate, true);
		assert.strictEqual(res2.eventId, res1.eventId);
	});
});