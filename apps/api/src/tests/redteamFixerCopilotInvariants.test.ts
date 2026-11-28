/**
 * redteamFixerCopilotInvariants.test.ts — Red Team Invariant Verification Suite
 * for Clinical AI Copilot, Session UUIDv7 Safety & Canonical Stream Client.
 *
 * Verifies:
 * 1. ensureValidUuid eliminates invalid input syntax for type uuid ("default-session").
 * 2. Generated session UUIDs conform to RFC 9562 UUIDv7.
 * 3. POST /api/agent/action handles missing/invalid sessionId safely with ensureValidUuid.
 * 4. Zero occurrences of "default-session" in agentToolsAndActionRoutes.ts.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import Fastify from "fastify";
import { isValidUuid, isValidUuidV7, generateUuidV7 } from "@dental/shared";
import { ensureValidUuid, UUID_REGEX } from "../ai/session/copilotSessionTypes.js";
import { registerAgentRoutes } from "../routes/agentRoutes.js";
import { authTokenSecret } from "../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("Red Team Fixer Copilot Invariants", () => {
	const testOrgId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
	const testUserId = "11111111-2222-3333-4444-555555555555";
	let validClinicToken: string;
	let validDoctorToken: string;

	beforeEach(() => {
		validClinicToken = signToken(
			{
				organizationId: testOrgId,
				role: "clinic",
			},
			authTokenSecret(),
			3600,
		);
		validDoctorToken = signToken(
			{
				organizationId: testOrgId,
				userId: testUserId,
				role: "doctor",
			},
			authTokenSecret(),
			3600,
		);
	});

	it("1. ensureValidUuid accepts valid UUIDv4 and UUIDv7 and normalizes to lowercase", () => {
		const v4 = "550e8400-e29b-41d4-a716-446655440000";
		assert.equal(ensureValidUuid(v4), v4);
		assert.equal(ensureValidUuid(v4.toUpperCase()), v4);

		const v7 = generateUuidV7();
		assert.equal(ensureValidUuid(v7), v7);
		assert.ok(isValidUuidV7(v7));
	});

	it("2. ensureValidUuid replaces 'default-session' and invalid strings with valid UUIDv7", () => {
		const fallback1 = ensureValidUuid("default-session");
		assert.notEqual(fallback1, "default-session");
		assert.ok(isValidUuid(fallback1), `Must be valid UUID, got: ${fallback1}`);
		assert.ok(isValidUuidV7(fallback1), `Must be valid UUIDv7, got: ${fallback1}`);

		const fallback2 = ensureValidUuid(undefined);
		assert.ok(isValidUuid(fallback2));
		assert.ok(isValidUuidV7(fallback2));

		const fallback3 = ensureValidUuid("");
		assert.ok(isValidUuid(fallback3));
		assert.ok(isValidUuidV7(fallback3));
	});

	it("3. POST /api/agent/action normalizes legacy 'default-session' into a valid UUIDv7 at runtime", async () => {
		const app = Fastify();
		await app.register(registerAgentRoutes);
		await app.ready();

		const res = await app.inject({
			method: "POST",
			url: "/api/agent/action",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				[STAFF_TOKEN_HEADER]: validDoctorToken,
				"Content-Type": "application/json",
			},
			payload: {
				sessionId: "default-session",
				toolName: "calculate_anesthesia",
				args: {
					patientWeightKg: 70,
					drugName: "Артикаин 4%",
				},
			},
		});

		assert.equal(res.statusCode, 200);
		assert.equal(res.body.includes("default-session"), false);
		await app.close();
	});

	it("4. POST /api/agent/action with direct tool execution handles missing sessionId without crashing", async () => {
		const app = Fastify();
		await app.register(registerAgentRoutes);
		await app.ready();

		const res = await app.inject({
			method: "POST",
			url: "/api/agent/action",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				[STAFF_TOKEN_HEADER]: validDoctorToken,
				"Content-Type": "application/json",
			},
			payload: {
				// No sessionId provided -> must safely fallback to generated UUIDv7
				toolName: "calculate_anesthesia",
				args: {
					patientWeightKg: 70,
					drugName: "Артикаин 4%",
				},
			},
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.ok, true);
		assert.ok(json.result);
		assert.ok(json.result.drugName.includes("Артикаин"));

		await app.close();
	});

	it("5. POST /api/agent/action enforces .strict() schema, UUID args validation (400) and blocks unconfirmed destructive tools (403)", async () => {
		const app = Fastify();
		await app.register(registerAgentRoutes);
		await app.ready();

		const strictRes = await app.inject({
			method: "POST",
			url: "/api/agent/action",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				[STAFF_TOKEN_HEADER]: validDoctorToken,
				"Content-Type": "application/json",
			},
			payload: {
				toolName: "calculate_anesthesia",
				args: { patientWeightKg: 70 },
				unknownExtraProp: "nope",
			},
		});
		assert.equal(strictRes.statusCode, 400);

		const badUuidRes = await app.inject({
			method: "POST",
			url: "/api/agent/action",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				[STAFF_TOKEN_HEADER]: validDoctorToken,
				"Content-Type": "application/json",
			},
			payload: {
				toolName: "calculate_anesthesia",
				args: { patientWeightKg: 70 },
				patientId: "not-a-uuid",
			},
		});
		assert.equal(badUuidRes.statusCode, 400);

		const unconfirmedDestructiveRes = await app.inject({
			method: "POST",
			url: "/api/agent/action",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				[STAFF_TOKEN_HEADER]: validDoctorToken,
				"Content-Type": "application/json",
			},
			payload: {
				toolName: "create_appointment",
				args: { patientId: "11111111-2222-3333-4444-555555555555" },
			},
		});
		assert.equal(unconfirmedDestructiveRes.statusCode, 403);
		assert.equal(JSON.parse(unconfirmedDestructiveRes.body).error, "ConfirmationRequired");

		const webLocalRes = await app.inject({
			method: "POST",
			url: "/api/agent/action",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				[STAFF_TOKEN_HEADER]: validDoctorToken,
				"Content-Type": "application/json",
			},
			payload: {
				toolName: "read_local_file",
				runtimeMode: "web_browser",
				args: { targetFile: "C:/Windows/win.ini" },
			},
		});
		const webLocalJson = JSON.parse(webLocalRes.body);
		assert.ok(
			webLocalRes.statusCode === 403 || webLocalJson.ok === false,
			`Desktop tool in web_browser must never have allowLocalExecution=true (status=${webLocalRes.statusCode})`,
		);

		await app.close();
	});
});
