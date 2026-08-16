import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	TelephonyAnalyticsGateway,
	type CallWebhookPayload,
} from "./TelephonyAnalyticsGateway.js";

describe("TelephonyAnalyticsGateway — Feature #114 Virtual PBX Webhook Gateway", () => {
	const gateway = new TelephonyAnalyticsGateway();

	test("1. Normalize Russian phone numbers to standard format", () => {
		assert.equal(gateway.normalizePhone("8 (999) 123-45-67"), "+79991234567");
		assert.equal(gateway.normalizePhone("+79991234567"), "+79991234567");
		assert.equal(gateway.normalizePhone("9991234567"), "+79991234567");
		assert.equal(gateway.normalizePhone("89271234567"), "+79271234567");
	});

	test("2. Parses inbound completed call webhook correctly", () => {
		const payload: CallWebhookPayload = {
			organizationId: "org-1",
			provider: "uis",
			type: "inbound",
			callId: "uis-call-99123",
			patientPhone: "8 (916) 555-44-33",
			durationSeconds: 145,
			audioUrl: "https://uis.st/recordings/uis-call-99123.mp3",
		};

		const event = gateway.parseWebhook(payload);
		assert.equal(event.organizationId, "org-1");
		assert.equal(event.provider, "uis");
		assert.equal(event.patientPhone, "+79165554433");
		assert.equal(event.direction, "inbound");
		assert.equal(event.status, "completed");
		assert.equal(event.durationSeconds, 145);
		assert.equal(event.recordingUrl, "https://uis.st/recordings/uis-call-99123.mp3");
		assert.equal(event.isMissed, false);
		assert.equal(event.callbackRequired, false);
	});

	test("3. Parses missed call webhook and generates callback task metadata", () => {
		const payload: CallWebhookPayload = {
			organizationId: "org-1",
			provider: "mango",
			type: "missed",
			callId: "mango-call-7741",
			patientPhone: "+7 (926) 777-88-99",
			durationSeconds: 0,
		};

		const event = gateway.parseWebhook(payload);
		assert.equal(event.isMissed, true);
		assert.equal(event.callbackRequired, true);
		assert.equal(event.status, "missed");
		assert.ok(event.taskTitle?.includes("+79267778899"));
		assert.ok(event.taskBody?.includes("MANGO"));
		assert.ok(event.taskBody?.includes("mango-call-7741"));
	});

	test("4. Calculates call to booking conversion rate accurately", () => {
		assert.equal(gateway.calculateCallToBookingRate(100, 25), 25);
		assert.equal(gateway.calculateCallToBookingRate(50, 10), 20);
		assert.equal(gateway.calculateCallToBookingRate(0, 0), 0);
		assert.equal(gateway.calculateCallToBookingRate(30, 0), 0);
		assert.equal(gateway.calculateCallToBookingRate(10, 10), 100);
	});

	test("5. Calculates average call duration accurately", () => {
		const calls = [
			{ durationSeconds: 120, status: "completed" },
			{ durationSeconds: 180, status: "completed" },
			{ durationSeconds: 0, status: "missed" },
			{ durationSeconds: 60, status: "completed" },
		];
		assert.equal(gateway.calculateAverageCallDuration(calls), 120); // (120+180+60)/3 = 120
	});
});
