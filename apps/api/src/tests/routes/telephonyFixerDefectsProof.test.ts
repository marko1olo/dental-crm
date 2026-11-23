import { and, eq } from "drizzle-orm";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { db } from "../../db/client.js";
import { communicationEvents, organizations, patients } from "../../db/schema.js";
import {
	cleanupStaleRingingCalls,
	telephonyCallLifecycleRoutes,
} from "../../routes/telephony/telephonyCallLifecycleHandler.js";
import { telephonyOutboundCallHandler } from "../../routes/telephony/telephonyOutboundHandler.js";
import { telephonyRoutes } from "../../routes/telephony/index.js";
import { MissedCallService } from "../../services/telephony/missedCallService.js";
import { TelephonyGatewayService } from "../../services/telephony/telephonyGatewayService.js";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";

describe("Red Team Fixer Proof: Telephony Defect Fixes", () => {
	it("DEFECT 1: outbound call saves providerCallId to communicationEvents", async () => {
		const prevOnline = process.env.PBX_FORCE_ONLINE;
		const prevAmiSecret = process.env.ASTERISK_AMI_SECRET;
		const prevAmiHost = process.env.ASTERISK_AMI_HOST;

		process.env.PBX_FORCE_ONLINE = "1";
		process.env.ASTERISK_AMI_SECRET = "test-ami-secret";
		process.env.ASTERISK_AMI_HOST = "127.0.0.1";

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

			expect(res.statusCode).toBe(200);
			const json = res.json();
			expect(json.success).toBe(true);
			expect(json.callId).toBeDefined();

			const events = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, DEMO_SHOWCASE_ORG_ID),
						eq(communicationEvents.providerCallId, json.callId),
					),
				);

			expect(events.length).toBe(1);
			expect(events[0]?.providerCallId).toBe(json.callId);
			expect(events[0]?.direction).toBe("outbound");
			expect(events[0]?.status).toBe("queued");

			await app.close();
		} finally {
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
		expect(result.cleanedCount).toBeGreaterThanOrEqual(1);

		// Verify needs_call remains untouched!
		const [recheckedNeedsCall] = await db
			.select()
			.from(communicationEvents)
			.where(eq(communicationEvents.id, needsCallRow!.id));
		expect(recheckedNeedsCall?.status).toBe("needs_call");
		expect(recheckedNeedsCall?.message).not.toContain("[Авто-завершение");

		// Verify queued is transitioned to failed
		const [recheckedQueued] = await db
			.select()
			.from(communicationEvents)
			.where(eq(communicationEvents.id, queuedRow!.id));
		expect(recheckedQueued?.status).toBe("failed");
		expect(recheckedQueued?.message).toContain("[Авто-завершение: таймаут звонка >300с]");
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
		expect(result1.success).toBe(true);

		// Second missed call with the same callId (idempotent replay)
		const result2 = await MissedCallService.handleMissedCall({
			organizationId: orgId,
			phone,
			callId,
			provider: "mango",
		});
		expect(result2.success).toBe(true);

		const events = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.providerCallId, callId),
				),
			);
		expect(events.length).toBe(1);
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
		expect(endedResult.success).toBe(true);
		expect(endedResult.event).toBe("ended");

		const events = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.providerCallId, callId),
				),
			);
		expect(events.length).toBe(1);
		expect(events[0]?.durationSeconds).toBe(95);
		expect(events[0]?.recordingUrl).toBe("https://asterisk.clinic.lan/monitor/call-rec-95.wav");
		expect(events[0]?.status).toBe("completed");
	});

	it("DEFECT 7: TelephonyGatewayService caches reachability and does not stall event loop", async () => {
		TelephonyGatewayService.clearForcedFailoverCache();

		const start = Date.now();
		const status1 = await TelephonyGatewayService.evaluateTelephonyGatewayStatus(DEMO_SHOWCASE_ORG_ID);
		const elapsed1 = Date.now() - start;

		const start2 = Date.now();
		const status2 = await TelephonyGatewayService.evaluateTelephonyGatewayStatus(DEMO_SHOWCASE_ORG_ID);
		const elapsed2 = Date.now() - start2;

		expect(elapsed1).toBeLessThan(1500); // 400ms timeout max instead of 2000ms
		expect(elapsed2).toBeLessThan(50);   // cached result takes <50ms
		expect(status1.activeMode).toBeDefined();
		expect(status2.activeMode).toBe(status1.activeMode);
	});
});
