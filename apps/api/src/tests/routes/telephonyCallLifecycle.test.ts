import assert from "node:assert/strict";
import { describe, test } from "node:test";
import Fastify from "fastify";
import { telephonyCallLifecycleRoutes } from "../../routes/telephony/telephonyCallLifecycleHandler.js";

describe("Telephony Call Lifecycle: Answer & End Fastify Routes", () => {
	test("POST /calls/answer broadcasts event and returns answered status", async () => {
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
			console.error("EndCall Error Body:", res.body);
		}
		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.equal(json.callId, "test-call-1");
		assert.equal(json.status, "answered");
		assert.ok(json.answeredAt);
		await app.close();
	});

	test("POST /calls/end broadcasts and registers call finish", async () => {
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
		await app.close();
	});
});
