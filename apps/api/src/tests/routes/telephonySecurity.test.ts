import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	isForbiddenPrivateIp,
	normalizePhoneNumber,
	validateSsrfSafeRecordingUrl,
} from "../../routes/telephony.js";

describe("IP Telephony Phone Normalization & E.164 Standards", () => {
	test("normalizes standard Russian 11-digit mobile numbers with +7 and 8", () => {
		const res1 = normalizePhoneNumber("+7 (999) 123-45-67");
		assert.equal(res1.isValid, true);
		assert.equal(res1.e164, "+79991234567");
		assert.equal(res1.national10, "9991234567");

		const res2 = normalizePhoneNumber("8 (999) 123-45-67");
		assert.equal(res2.isValid, true);
		assert.equal(res2.e164, "+79991234567");
		assert.equal(res2.national10, "9991234567");
	});

	test("normalizes 10-digit national numbers to +7", () => {
		const res = normalizePhoneNumber("9991234567");
		assert.equal(res.isValid, true);
		assert.equal(res.e164, "+79991234567");
		assert.equal(res.national10, "9991234567");
	});

	test("handles short or invalid numbers gracefully without crash", () => {
		const res1 = normalizePhoneNumber("");
		assert.equal(res1.isValid, false);

		const res2 = normalizePhoneNumber("123");
		assert.equal(res2.isValid, false);

		const res3 = normalizePhoneNumber(null);
		assert.equal(res3.isValid, false);
	});
});

describe("Telephony Audio Recording SSRF Mitigation & Private IP Defense", () => {
	test("identifies and blocks private, loopback, link-local, and cloud metadata IPs", () => {
		assert.equal(isForbiddenPrivateIp("127.0.0.1"), true);
		assert.equal(isForbiddenPrivateIp("10.0.1.5"), true);
		assert.equal(isForbiddenPrivateIp("192.168.1.1"), true);
		assert.equal(isForbiddenPrivateIp("172.16.0.1"), true);
		assert.equal(isForbiddenPrivateIp("169.254.169.254"), true); // AWS IMDS
		assert.equal(isForbiddenPrivateIp("::1"), true);
		assert.equal(isForbiddenPrivateIp("fc00::1"), true);
	});

	test("allows legitimate public IP addresses", () => {
		assert.equal(isForbiddenPrivateIp("8.8.8.8"), false);
		assert.equal(isForbiddenPrivateIp("1.1.1.1"), false);
		assert.equal(isForbiddenPrivateIp("213.180.204.62"), false); // Yandex
	});

	test("validateSsrfSafeRecordingUrl rejects non-http protocols (file:, javascript:, data:)", async () => {
		const fileUrl = await validateSsrfSafeRecordingUrl("file:///etc/passwd");
		assert.equal(fileUrl.valid, false);

		const jsUrl = await validateSsrfSafeRecordingUrl("javascript:alert(1)");
		assert.equal(jsUrl.valid, false);

		const dataUrl = await validateSsrfSafeRecordingUrl("data:text/html,evil");
		assert.equal(dataUrl.valid, false);
	});
});
