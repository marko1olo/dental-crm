/**
 * apps/web/src/components/emr/__tests__/mockEradicationWave112.test.ts
 *
 * Red Team Behavioral Test: Cryptographic SMS OTP & Portal Purity.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSmsOtp, verifySmsOtp } from "../../portal/patientCabinet/patientCabinetEngine.js";
import {
	SAMPLE_PORTAL_PROFILE,
	getSafePortalProfile,
	getSafeVisitProtocols,
} from "../../portal/patientPortalPresets.js";

describe("Wave 112 - Cryptographic SMS OTP & Portal Preset Purity", () => {
	it("generates unique cryptographic 6-digit OTPs with valid expiration window", () => {
		const phone = "+7 (999) 000-11-22";
		const otp1 = generateSmsOtp(phone);
		const otp2 = generateSmsOtp(phone);

		assert.equal(otp1.code.length, 6);
		assert.equal(otp2.code.length, 6);
		assert.match(otp1.code, /^\d{6}$/);
		assert.match(otp2.code, /^\d{6}$/);
		assert.notEqual(otp1.code, "842109");
		assert.notEqual(otp2.code, "842109");
		assert.ok(otp1.expiresAt > otp1.sentTimestamp);
	});

	it("verifies valid OTP and rejects mismatched, empty, or expired OTPs", () => {
		const otp = generateSmsOtp("+7 (999) 123-45-67");

		const verifyOk = verifySmsOtp(otp.code, otp.code, otp.sentTimestamp);
		assert.equal(verifyOk.success, true);

		const verifyWrong = verifySmsOtp("000000", otp.code, otp.sentTimestamp);
		assert.equal(verifyWrong.success, false);

		const verifyEmpty = verifySmsOtp("", otp.code, otp.sentTimestamp);
		assert.equal(verifyEmpty.success, false);

		const verifyStaticOld = verifySmsOtp("842109", otp.code, otp.sentTimestamp);
		assert.equal(verifyStaticOld.success, false);

		const expiredTs = Date.now() - 20 * 60 * 1000;
		const verifyExpired = verifySmsOtp(otp.code, otp.code, expiredTs);
		assert.equal(verifyExpired.success, false);
	});

	it("portal presets contain zero synthetic names or demo OTP leaks", () => {
		const serialized = JSON.stringify({
			SAMPLE_PORTAL_PROFILE,
			safeProfile: getSafePortalProfile(null),
			safeVisits: getSafeVisitProtocols(null),
		});
		assert.equal(serialized.includes("Барабаш"), false);
		assert.equal(serialized.includes("Волкова"), false);
		assert.equal(serialized.includes("842109"), false);
		assert.equal(serialized.includes("Демо-код:"), false);
	});
});
