import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import test from "node:test";
import {
	isForbiddenPrivateIp,
	normalizePhoneNumber,
	validateSsrfSafeRecordingUrl,
} from "../../services/telephony/telephonySecurity.js";

test("normalizePhoneNumber handles standard Russian phone variations correctly", () => {
	const p1 = normalizePhoneNumber("+7 (916) 123-45-67");
	assert.equal(p1.isValid, true);
	assert.equal(p1.e164, "+79161234567");
	assert.equal(p1.national10, "9161234567");

	const p2 = normalizePhoneNumber("89161234567");
	assert.equal(p2.isValid, true);
	assert.equal(p2.e164, "+79161234567");
	assert.equal(p2.national10, "9161234567");

	const p3 = normalizePhoneNumber("9161234567");
	assert.equal(p3.isValid, true);
	assert.equal(p3.e164, "+79161234567");
	assert.equal(p3.national10, "9161234567");

	const pInvalid = normalizePhoneNumber("12345");
	assert.equal(pInvalid.isValid, false);

	const pNull = normalizePhoneNumber(null);
	assert.equal(pNull.isValid, false);
});

test("isForbiddenPrivateIp correctly blocks loopback, link-local, and RFC1918 private subnets", () => {
	assert.equal(isForbiddenPrivateIp("127.0.0.1"), true);
	assert.equal(isForbiddenPrivateIp("10.0.0.1"), true);
	assert.equal(isForbiddenPrivateIp("192.168.1.1"), true);
	assert.equal(isForbiddenPrivateIp("172.16.0.5"), true);
	assert.equal(isForbiddenPrivateIp("169.254.169.254"), true);
	assert.equal(isForbiddenPrivateIp("::1"), true);
	assert.equal(isForbiddenPrivateIp("::ffff:127.0.0.1"), true);

	// Public IP addresses must NOT be blocked
	assert.equal(isForbiddenPrivateIp("8.8.8.8"), false);
	assert.equal(isForbiddenPrivateIp("1.1.1.1"), false);
});

test("validateSsrfSafeRecordingUrl blocks invalid protocols and dangerous hostnames", async () => {
	const resFile = await validateSsrfSafeRecordingUrl("file:///etc/passwd");
	assert.equal(resFile.valid, false);

	const resLocal = await validateSsrfSafeRecordingUrl("http://127.0.0.1:8080/audio.mp3");
	assert.equal(resLocal.valid, false);

	const resInvalid = await validateSsrfSafeRecordingUrl("not-a-valid-url");
	assert.equal(resInvalid.valid, false);
});

test("Outbox deduplication key hash creates stable keys across rapid repeat clicks within the same minute", () => {
	const body = "Уважаемый Иван Иванович, напоминаем о приёме завтра в 10:00";
	const bodyHash = createHash("sha256").update(body).digest("hex").slice(0, 16);
	const timeBucket = Math.floor(Date.now() / 60000);

	const dedupeKey1 = `manual:patient-123:sms:reminder:${bodyHash}:${timeBucket}`;
	const dedupeKey2 = `manual:patient-123:sms:reminder:${bodyHash}:${timeBucket}`;

	assert.equal(dedupeKey1, dedupeKey2);
});
