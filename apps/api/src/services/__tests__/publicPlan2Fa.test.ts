import assert from "node:assert";
import { describe, test } from "node:test";
import {
	MAX_CONSECUTIVE_FAILURES,
	TOTAL_FAILURES_PERMANENT_LOCKOUT,
	hashVerbalPin,
	resolvePublicAuthMethod,
	validatePublicPlanSessionToken,
	verifyPatientKnowledgeFactor,
	type PublicPlanPatientRecord,
} from "../publicPlan2Fa.js";

describe("publicPlan2Fa service & security cascade", () => {
	const secret = "fixture_sample_auth_secret_key";

	const basePatient: PublicPlanPatientRecord = {
		id: "pat-123",
		publicToken: "tok-abc-456",
		phone: "+7 (999) 123-45-67",
		birthDate: "1985-04-12",
		verbalPinHash: hashVerbalPin("1234"),
		failedAttempts: 0,
		totalFailures: 0,
		isLocked: false,
	};

	describe("resolvePublicAuthMethod cascade", () => {
		test("resolves phone_last4 when phone is present with >= 4 digits", () => {
			const method = resolvePublicAuthMethod({
				phone: "+7 (999) 123-45-67",
				birthDate: "1990-01-01",
				verbalPinHash: "abc",
			});
			assert.strictEqual(method, "phone_last4");
		});

		test("resolves dob when phone is missing but birthDate is present", () => {
			const method = resolvePublicAuthMethod({
				phone: null,
				birthDate: "1990-01-01",
				verbalPinHash: "abc",
			});
			assert.strictEqual(method, "dob");
		});

		test("resolves manual_code when phone and birthDate are missing", () => {
			const method = resolvePublicAuthMethod({
				phone: null,
				birthDate: null,
				verbalPinHash: "abc",
			});
			assert.strictEqual(method, "manual_code");
		});

		test("returns none when clinic explicitly disables verification", () => {
			const method = resolvePublicAuthMethod(
				{
					phone: "+7 (999) 123-45-67",
				},
				true,
			);
			assert.strictEqual(method, "none");
		});
	});

	describe("verifyPatientKnowledgeFactor", () => {
		test("verifies successfully with phone last 4 digits (structured input)", () => {
			const result = verifyPatientKnowledgeFactor(
				basePatient,
				{ method: "phone_last4", value: "4567" },
				secret,
			);
			assert.strictEqual(result.success, true);
			assert.ok(result.sessionToken);

			const isValid = validatePublicPlanSessionToken(
				result.sessionToken!,
				"pat-123",
				"tok-abc-456",
				secret,
			);
			assert.strictEqual(isValid, true);
		});

		test("verifies successfully with date of birth (both ISO and DD.MM.YYYY format)", () => {
			const resultIso = verifyPatientKnowledgeFactor(
				basePatient,
				{ method: "dob", value: "1985-04-12" },
				secret,
			);
			assert.strictEqual(resultIso.success, true);

			const resultRu = verifyPatientKnowledgeFactor(
				basePatient,
				{ method: "dob", value: "12.04.1985" },
				secret,
			);
			assert.strictEqual(resultRu.success, true);
		});

		test("verifies successfully with verbal PIN (manual_code)", () => {
			const result = verifyPatientKnowledgeFactor(
				basePatient,
				{ method: "manual_code", value: "1234" },
				secret,
			);
			assert.strictEqual(result.success, true);
		});

		test("fails on incorrect factor and counts remaining attempts", () => {
			const result = verifyPatientKnowledgeFactor(
				basePatient,
				{ method: "phone_last4", value: "9999" },
				secret,
			);
			assert.strictEqual(result.success, false);
			assert.strictEqual(result.remainingAttempts, 4);
			assert.strictEqual(result.isLocked, false);
		});

		test("locks rolling window on 5 consecutive failures", () => {
			const failingPatient: PublicPlanPatientRecord = {
				...basePatient,
				failedAttempts: 4,
			};
			const result = verifyPatientKnowledgeFactor(
				failingPatient,
				{ method: "phone_last4", value: "0000" },
				secret,
			);
			assert.strictEqual(result.success, false);
			assert.strictEqual(result.isLocked, true);
			assert.strictEqual(result.errorCode, "rate_limited");
		});

		test("triggers permanent lockout on 10 total failures", () => {
			const severelyFailingPatient: PublicPlanPatientRecord = {
				...basePatient,
				failedAttempts: 0,
				totalFailures: 9,
			};
			const result = verifyPatientKnowledgeFactor(
				severelyFailingPatient,
				{ method: "phone_last4", value: "0000" },
				secret,
			);
			assert.strictEqual(result.success, false);
			assert.strictEqual(result.isPermanentlyLocked, true);
			assert.strictEqual(result.errorCode, "locked");
		});
	});

	describe("validatePublicPlanSessionToken", () => {
		test("rejects tampered session tokens", () => {
			const valid = verifyPatientKnowledgeFactor(
				basePatient,
				{ method: "phone_last4", value: "4567" },
				secret,
			);
			const tampered = `${valid.sessionToken!}tampered`;
			const isValid = validatePublicPlanSessionToken(tampered, "pat-123", "tok-abc-456", secret);
			assert.strictEqual(isValid, false);
		});

		test("rejects mismatched patientId or publicToken", () => {
			const valid = verifyPatientKnowledgeFactor(
				basePatient,
				{ method: "phone_last4", value: "4567" },
				secret,
			);
			const isWrongPatient = validatePublicPlanSessionToken(
				valid.sessionToken!,
				"wrong-patient",
				"tok-abc-456",
				secret,
			);
			assert.strictEqual(isWrongPatient, false);

			const isWrongToken = validatePublicPlanSessionToken(
				valid.sessionToken!,
				"pat-123",
				"wrong-token",
				secret,
			);
			assert.strictEqual(isWrongToken, false);
		});
	});
});
