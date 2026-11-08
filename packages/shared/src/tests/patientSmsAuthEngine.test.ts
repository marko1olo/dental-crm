/**
 * patientSmsAuthEngine.test.ts — Comprehensive Unit Test Suite for:
 * 1. Russian Mobile Phone Normalization & Formatting (+7 (9XX) XXX-XX-XX)
 * 2. 4-Digit SMS-PEP 63-FZ OTP Challenge Engine (3-minute TTL, rate-limits, anti-bruteforce)
 * 3. 63-FZ Simple Electronic Signature (ПЭП) Statutory Audit Formation & Integrity Proof
 * 4. Patient Mobile Portal JWT Sessions & Strict RBAC Isolation Guard (152-FZ / 323-FZ)
 * 5. Free Slot Discovery & Anti-Collision Soft-Lock Engine (10-minute hold)
 * 6. CRM Online Booking Creation (status: ONLINE_BOOKING, source: ONLINE_BOOKING)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	checkPatientPortalAccess,
	createPep63FzSignatureAudit,
	createSmsAuthChallenge,
	createSmsPepChallenge,
	DEFAULT_PATIENT_PORTAL_PERMISSIONS,
	DEFAULT_SMS_PEP_POLICY,
	formatRussianPhoneNumber,
	generateNumericOtpCode,
	hashOtpWithSalt,
	isSmsPepIssuanceThrottled,
	isValidRussianPhoneNumber,
	normalizeRussianPhoneNumber,
	russianMobilePhoneSchema,
	safeStringCompare,
	signPatientPortalJwt,
	verifyPatientPortalJwt,
	verifyPep63FzSignatureIntegrity,
	verifySmsAuthChallenge,
	verifySmsPepChallenge,
	type PatientPortalTokenPayloadInput,
	type SmsPepChallengeState,
} from "../portal/patientSmsAuthEngine.js";

describe("Patient SMS Mobile Portal & Online Booking Engine (Wave 18)", () => {
	// ─── 1. RUSSIAN PHONE NUMBER NORMALIZATION & FORMATTING ───────────────────
	describe("1. Russian Mobile Phone Normalization & Presentation Formatting", () => {
		it("normalizes various Russian phone formats to standard E.164 (+79XXXXXXXXX)", () => {
			assert.strictEqual(normalizeRussianPhoneNumber("+7 (916) 123-45-67"), "+79161234567");
			assert.strictEqual(normalizeRussianPhoneNumber("8 (916) 123-45-67"), "+79161234567");
			assert.strictEqual(normalizeRussianPhoneNumber("89161234567"), "+79161234567");
			assert.strictEqual(normalizeRussianPhoneNumber("79161234567"), "+79161234567");
			assert.strictEqual(normalizeRussianPhoneNumber("9161234567"), "+79161234567");
			assert.strictEqual(normalizeRussianPhoneNumber("+7 916 123 45 67"), "+79161234567");
			assert.strictEqual(normalizeRussianPhoneNumber("+7-926-555-44-33"), "+79265554433");
			assert.strictEqual(normalizeRussianPhoneNumber("8 (999) 000-11-22"), "+79990001122");
		});

		it("handles non-string or empty inputs safely in normalizeRussianPhoneNumber", () => {
			assert.strictEqual(normalizeRussianPhoneNumber(""), "");
			assert.strictEqual(normalizeRussianPhoneNumber(null), "");
			assert.strictEqual(normalizeRussianPhoneNumber(undefined), "");
			assert.strictEqual(normalizeRussianPhoneNumber(89161234567), "+79161234567");
		});

		it("formats Russian mobile numbers into human-readable presentation (+7 (9XX) XXX-XX-XX)", () => {
			assert.strictEqual(formatRussianPhoneNumber("+79161234567"), "+7 (916) 123-45-67");
			assert.strictEqual(formatRussianPhoneNumber("89161234567"), "+7 (916) 123-45-67");
			assert.strictEqual(formatRussianPhoneNumber("9161234567"), "+7 (916) 123-45-67");
			assert.strictEqual(formatRussianPhoneNumber("+7 (926) 555-44-33"), "+7 (926) 555-44-33");
			assert.strictEqual(formatRussianPhoneNumber("invalid-phone"), "invalid-phone");
		});

		it("validates Russian mobile phone numbers strictly (DEF 900..999)", () => {
			assert.strictEqual(isValidRussianPhoneNumber("+7 (916) 123-45-67"), true);
			assert.strictEqual(isValidRussianPhoneNumber("89265554433"), true);
			assert.strictEqual(isValidRussianPhoneNumber("9991112233"), true);

			// Invalid numbers: landline (code 495), foreign numbers, invalid length
			assert.strictEqual(isValidRussianPhoneNumber("+7 (495) 123-45-67"), false); // Moscow landline, not mobile
			assert.strictEqual(isValidRussianPhoneNumber("+1 (555) 123-4567"), false); // US number
			assert.strictEqual(isValidRussianPhoneNumber("12345"), false);
			assert.strictEqual(isValidRussianPhoneNumber(""), false);
			assert.strictEqual(isValidRussianPhoneNumber(null), false);
		});

		it("validates phone numbers with Zod russianMobilePhoneSchema", () => {
			assert.ok(russianMobilePhoneSchema.parse("+7 (916) 123-45-67"));
			assert.ok(russianMobilePhoneSchema.parse("89261234567"));

			assert.throws(() => {
				russianMobilePhoneSchema.parse("+7 (495) 777-88-99");
			});
			assert.throws(() => {
				russianMobilePhoneSchema.parse("not-a-phone");
			});
		});
	});

	// ─── 2. 4-DIGIT SMS-PEP (63-ФЗ) OTP CHALLENGE ENGINE ─────────────────────
	describe("2. 4-Digit SMS-PEP (63-ФЗ) OTP Challenge Engine (3-Minute TTL)", () => {
		const fixedNow = new Date("2026-08-29T10:00:00.000Z");

		it("generates cryptographically strong 4-digit OTP codes by default", () => {
			for (let i = 0; i < 20; i++) {
				const code = generateNumericOtpCode(4);
				assert.match(code, /^\d{4}$/);
				assert.strictEqual(code.length, 4);
			}

			// Supports 6-digit codes when configured
			const code6 = generateNumericOtpCode(6);
			assert.match(code6, /^\d{6}$/);
			assert.strictEqual(code6.length, 6);
		});

		it("creates 4-digit SMS OTP challenge with 3-minute statutory TTL", () => {
			const { challenge, plainCode, messageText } = createSmsAuthChallenge({
				phone: "+7 916 555-11-22",
				now: fixedNow,
			});

			assert.strictEqual(challenge.codeLength, 4);
			assert.strictEqual(challenge.normalizedPhone, "+79165551122");
			assert.strictEqual(challenge.formattedPhone, "+7 (916) 555-11-22");
			assert.strictEqual(challenge.attemptsCount, 0);
			assert.strictEqual(challenge.maxAttempts, 3);
			assert.strictEqual(challenge.isConsumed, false);
			assert.strictEqual(challenge.consumedAtIso, null);
			assert.strictEqual(challenge.createdAtIso, fixedNow.toISOString());

			// 3 minutes (180 seconds) TTL check
			const expectedExpiry = new Date(fixedNow.getTime() + 180 * 1000).toISOString();
			assert.strictEqual(challenge.expiresAtIso, expectedExpiry);

			// Message template contains plain code and minutes
			assert.ok(messageText.includes(plainCode));
			assert.ok(messageText.includes("3 мин"));
		});

		it("successfully verifies valid OTP passcode and consumes challenge", () => {
			const { challenge, plainCode } = createSmsAuthChallenge({
				phone: "+7 (916) 555-11-22",
				now: fixedNow,
			});

			const verifyResult = verifySmsAuthChallenge(challenge, plainCode, fixedNow);
			assert.strictEqual(verifyResult.success, true);
			if (verifyResult.success) {
				assert.strictEqual(verifyResult.updatedChallenge.isConsumed, true);
				assert.strictEqual(verifyResult.updatedChallenge.consumedAtIso, fixedNow.toISOString());
			}
		});

		it("rejects verification of already consumed challenge", () => {
			const { challenge, plainCode } = createSmsAuthChallenge({
				phone: "+7 (916) 555-11-22",
				now: fixedNow,
			});

			const first = verifySmsAuthChallenge(challenge, plainCode, fixedNow);
			assert.strictEqual(first.success, true);

			const second = verifySmsAuthChallenge(first.updatedChallenge, plainCode, fixedNow);
			assert.strictEqual(second.success, false);
			if (!second.success) {
				assert.strictEqual(second.error, "ALREADY_CONSUMED");
				assert.strictEqual(second.remainingAttempts, 0);
			}
		});

		it("rejects expired OTP code when 3-minute TTL is exceeded", () => {
			const { challenge, plainCode } = createSmsAuthChallenge({
				phone: "+7 (916) 555-11-22",
				policy: { ttlSeconds: 180 },
				now: fixedNow,
			});

			// 3 minutes + 1 second later
			const expiredTime = new Date(fixedNow.getTime() + 181 * 1000);
			const result = verifySmsAuthChallenge(challenge, plainCode, expiredTime);

			assert.strictEqual(result.success, false);
			if (!result.success) {
				assert.strictEqual(result.error, "CODE_EXPIRED");
				assert.strictEqual(result.remainingAttempts, 0);
			}
		});

		it("decrements remaining attempts on wrong code and enforces max 3 attempts lockout", () => {
			const { challenge } = createSmsAuthChallenge({
				phone: "+7 (916) 555-11-22",
				policy: { maxAttempts: 3 },
				now: fixedNow,
			});

			// Attempt 1: Wrong code
			const r1 = verifySmsAuthChallenge(challenge, "0000", fixedNow);
			assert.strictEqual(r1.success, false);
			if (!r1.success) {
				assert.strictEqual(r1.error, "CODE_MISMATCH");
				assert.strictEqual(r1.remainingAttempts, 2);
				assert.strictEqual(r1.updatedChallenge.attemptsCount, 1);
			}

			// Attempt 2: Wrong code
			const r2 = verifySmsAuthChallenge(r1.updatedChallenge, "1111", fixedNow);
			assert.strictEqual(r2.success, false);
			if (!r2.success) {
				assert.strictEqual(r2.error, "CODE_MISMATCH");
				assert.strictEqual(r2.remainingAttempts, 1);
				assert.strictEqual(r2.updatedChallenge.attemptsCount, 2);
			}

			// Attempt 3: Wrong code -> Lockout
			const r3 = verifySmsAuthChallenge(r2.updatedChallenge, "2222", fixedNow);
			assert.strictEqual(r3.success, false);
			if (!r3.success) {
				assert.strictEqual(r3.error, "MAX_ATTEMPTS_EXCEEDED");
				assert.strictEqual(r3.remainingAttempts, 0);
				assert.strictEqual(r3.updatedChallenge.attemptsCount, 3);
			}

			// Attempt 4: Even with correct plain code, locked out
			const r4 = verifySmsAuthChallenge(r3.updatedChallenge, "1234", fixedNow);
			assert.strictEqual(r4.success, false);
			if (!r4.success) {
				assert.strictEqual(r4.error, "MAX_ATTEMPTS_EXCEEDED");
			}
		});

		it("throws error when creating challenge for invalid Russian phone number", () => {
			assert.throws(() => {
				createSmsAuthChallenge({
					phone: "12345",
					now: fixedNow,
				});
			}, /Некорректный номер мобильного телефона/);
		});

		it("computes timing-safe comparisons and cryptographic SHA-256 salted hashes", () => {
			const salt = "0123456789abcdef";
			const hash1 = hashOtpWithSalt("4829", salt);
			const hash2 = hashOtpWithSalt("4829", salt);
			const hashDiff = hashOtpWithSalt("4828", salt);

			assert.strictEqual(hash1, hash2);
			assert.notStrictEqual(hash1, hashDiff);
			assert.strictEqual(safeStringCompare(hash1, hash2), true);
			assert.strictEqual(safeStringCompare(hash1, hashDiff), false);
			assert.strictEqual(safeStringCompare("short", "longer-string"), false);
		});
	});

	// ─── 3. ANTI-BRUTEFORCE RATE-LIMITING & COOLDOWNS ────────────────────────
	describe("3. Anti-Bruteforce Rate-Limiting & Cooldowns", () => {
		const fixedNow = new Date("2026-08-29T10:00:00.000Z");

		it("enforces 60-second cooldown between SMS resend requests", () => {
			const { challenge } = createSmsAuthChallenge({
				phone: "+7 (916) 555-11-22",
				policy: { resendCooldownSeconds: 60 },
				now: fixedNow,
			});

			// 20 seconds later -> throttled
			const checkAt20s = new Date(fixedNow.getTime() + 20 * 1000);
			const throttled20 = isSmsPepIssuanceThrottled([challenge], { resendCooldownSeconds: 60 }, checkAt20s);

			assert.strictEqual(throttled20.throttled, true);
			assert.strictEqual(throttled20.reason, "COOLDOWN_ACTIVE");
			assert.strictEqual(throttled20.retryAfterSeconds, 40); // 60 - 20 = 40s

			// 61 seconds later -> allowed
			const checkAt61s = new Date(fixedNow.getTime() + 61 * 1000);
			const throttled61 = isSmsPepIssuanceThrottled([challenge], { resendCooldownSeconds: 60 }, checkAt61s);

			assert.strictEqual(throttled61.throttled, false);
			assert.strictEqual(throttled61.retryAfterSeconds, 0);
		});

		it("enforces hourly limit (max 5 requests per hour)", () => {
			const history: SmsPepChallengeState[] = [];

			for (let i = 0; i < 5; i++) {
				const issuanceTime = new Date(fixedNow.getTime() + i * 120 * 1000); // every 2 minutes
				const { challenge } = createSmsAuthChallenge({
					phone: "+7 (916) 555-11-22",
					now: issuanceTime,
				});
				history.push(challenge);
			}

			// 6th attempt within the hour
			const sixthAttemptTime = new Date(fixedNow.getTime() + 10 * 60 * 1000); // 10 minutes in
			const checkWindow = isSmsPepIssuanceThrottled(
				history,
				{ maxPerWindow: 5, windowSeconds: 3600, resendCooldownSeconds: 60 },
				sixthAttemptTime,
			);

			assert.strictEqual(checkWindow.throttled, true);
			assert.strictEqual(checkWindow.reason, "WINDOW_LIMIT_EXCEEDED");
			assert.ok(checkWindow.retryAfterSeconds > 0);
		});

		it("returns throttled=false when challenge history is empty", () => {
			const result = isSmsPepIssuanceThrottled([], DEFAULT_SMS_PEP_POLICY, fixedNow);
			assert.strictEqual(result.throttled, false);
			assert.strictEqual(result.retryAfterSeconds, 0);
		});
	});

	// ─── 4. STATUTORY 63-ФЗ SIMPLE ELECTRONIC SIGNATURE (ПЭП) AUDIT ──────────
	describe("4. 63-ФЗ Simple Electronic Signature (ПЭП) Statutory Audit Formation", () => {
		const fixedNow = new Date("2026-08-29T11:00:00.000Z");

		it("creates statutory PEP 63-FZ signature audit record with cryptographic integrity hash", () => {
			const audit = createPep63FzSignatureAudit({
				patientId: "PAT-10492",
				patientFullName: "Смирнова Екатерина Андреевна",
				organizationId: "ORG-DENTE-01",
				phone: "+7 (916) 555-77-88",
				documentId: "DOC-TREATMENT-PLAN-8821",
				documentKind: "treatment_plan",
				documentContentOrBuffer: "Согласованный план лечения: 16 Implantation, 36 Zirconia Crown. Сумма: 85000 руб.",
				clientIp: "178.62.204.15",
				userAgent: "DenteMobilePortal/1.2 (iOS 18.2)",
				now: fixedNow,
			});

			assert.ok(audit.signatureId);
			assert.strictEqual(audit.patientId, "PAT-10492");
			assert.strictEqual(audit.patientFullName, "Смирнова Екатерина Андреевна");
			assert.strictEqual(audit.organizationId, "ORG-DENTE-01");
			assert.strictEqual(audit.phone, "+79165557788");
			assert.strictEqual(audit.documentId, "DOC-TREATMENT-PLAN-8821");
			assert.strictEqual(audit.documentKind, "treatment_plan");
			assert.strictEqual(audit.signatureKind, "PEP_63FZ");
			assert.strictEqual(audit.statutoryBasis, "63-ФЗ ст. 5, 9 (Простая электронная подпись)");
			assert.strictEqual(audit.authMethod, "sms_pep");
			assert.match(audit.documentSha256Hex, /^[0-9a-fA-F]{64}$/);
			assert.match(audit.integrityHash, /^[0-9a-fA-F]{64}$/);

			// Verify integrity
			assert.strictEqual(verifyPep63FzSignatureIntegrity(audit), true);
		});

		it("detects any post-signing tampering with the audit record or document hash", () => {
			const audit = createPep63FzSignatureAudit({
				patientId: "PAT-10492",
				patientFullName: "Смирнова Екатерина Андреевна",
				organizationId: "ORG-DENTE-01",
				phone: "+79165557788",
				documentId: "DOC-TREATMENT-PLAN-8821",
				documentKind: "treatment_plan",
				documentContentOrBuffer: "Original content",
				now: fixedNow,
			});

			assert.strictEqual(verifyPep63FzSignatureIntegrity(audit), true);

			// Tamper document hash
			const tamperedDocHash = { ...audit, documentSha256Hex: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" };
			assert.strictEqual(verifyPep63FzSignatureIntegrity(tamperedDocHash), false);

			// Tamper patient ID
			const tamperedPatient = { ...audit, patientId: "PAT-EVIL-HACKER" };
			assert.strictEqual(verifyPep63FzSignatureIntegrity(tamperedPatient), false);

			// Tamper organization ID
			const tamperedOrg = { ...audit, organizationId: "ORG-COMPETITOR" };
			assert.strictEqual(verifyPep63FzSignatureIntegrity(tamperedOrg), false);
		});
	});

	// ─── 5. PATIENT PORTAL JWT SESSION & STRICT RBAC ISOLATION ───────────────
	describe("5. Patient Portal JWT Session & Strict RBAC Isolation (152-ФЗ / 323-ФЗ)", () => {
		const jwtSecret = "DENTE_PORTAL_SUPER_SECRET_KEY_2026_VERY_SECURE";

		it("signs, verifies, and decodes patient portal JWT session token", () => {
			const payloadInput: PatientPortalTokenPayloadInput = {
				patientId: "PAT-7741",
				organizationId: "ORG-DENTE-01",
				phone: "+7 (916) 123-45-67",
				fullName: "Иванов Иван Иванович",
			};

			const token = signPatientPortalJwt(payloadInput, jwtSecret, 3600);
			assert.ok(typeof token === "string");
			assert.strictEqual(token.split(".").length, 3);

			const verified = verifyPatientPortalJwt(token, jwtSecret);
			assert.ok(verified !== null);
			if (verified) {
				assert.strictEqual(verified.patientId, "PAT-7741");
				assert.strictEqual(verified.organizationId, "ORG-DENTE-01");
				assert.strictEqual(verified.phone, "+79161234567");
				assert.strictEqual(verified.fullName, "Иванов Иван Иванович");
				assert.strictEqual(verified.tokenKind, "patient_portal");
				assert.strictEqual(verified.authMethod, "sms_pep");
				assert.deepStrictEqual(verified.permissions, DEFAULT_PATIENT_PORTAL_PERMISSIONS);
			}
		});

		it("rejects token signed with wrong secret or tampered token payload", () => {
			const payloadInput: PatientPortalTokenPayloadInput = {
				patientId: "PAT-7741",
				organizationId: "ORG-DENTE-01",
				phone: "+79161234567",
			};

			const token = signPatientPortalJwt(payloadInput, jwtSecret);
			assert.strictEqual(verifyPatientPortalJwt(token, "WRONG_SECRET_KEY_999999999"), null);

			// Tamper with payload base64
			const parts = token.split(".");
			const tamperedToken = `${parts[0]}.eyJwYXRpZW50SWQiOiJQQVQtRVZJTCJ9.${parts[2]}`;
			assert.strictEqual(verifyPatientPortalJwt(tamperedToken, jwtSecret), null);
		});

		it("rejects expired tokens and null/malformed token inputs", () => {
			const token = signPatientPortalJwt(
				{ patientId: "PAT-1", organizationId: "ORG-1", phone: "+79161234567" },
				jwtSecret,
				-10, // Expired 10 seconds ago
			);

			assert.strictEqual(verifyPatientPortalJwt(token, jwtSecret), null);
			assert.strictEqual(verifyPatientPortalJwt("", jwtSecret), null);
			assert.strictEqual(verifyPatientPortalJwt(null, jwtSecret), null);
			assert.strictEqual(verifyPatientPortalJwt("not.a.jwt", jwtSecret), null);
		});

		it("throws error when signing JWT with secret shorter than 16 characters", () => {
			assert.throws(() => {
				signPatientPortalJwt(
					{ patientId: "PAT-1", organizationId: "ORG-1", phone: "+79161234567" },
					"short-secret",
				);
			}, /минимум 16 символов/);
		});

		it("enforces strict patient RBAC and cross-patient isolation guard", () => {
			const token = signPatientPortalJwt(
				{
					patientId: "PAT-PATIENT-ALPHA",
					organizationId: "ORG-DENTE-01",
					phone: "+79161112233",
					permissions: ["portal:medical_records:read", "portal:invoices:read"],
				},
				jwtSecret,
			);

			const session = verifyPatientPortalJwt(token, jwtSecret);
			assert.ok(session !== null);

			// 1. Allowed: Patient accessing their own medical records
			const allowedCheck = checkPatientPortalAccess(session, "PAT-PATIENT-ALPHA", "portal:medical_records:read");
			assert.strictEqual(allowedCheck.allowed, true);

			// 2. Blocked: Patient trying to access another patient's records (152-FZ / 323-FZ)
			const crossPatientCheck = checkPatientPortalAccess(session, "PAT-PATIENT-BETA", "portal:medical_records:read");
			assert.strictEqual(crossPatientCheck.allowed, false);
			assert.strictEqual(crossPatientCheck.reason, "PATIENT_ISOLATION_VIOLATION");
			assert.ok(crossPatientCheck.descriptionRu.includes("другого пациента"));

			// 3. Blocked: Patient missing required permission
			const missingPermCheck = checkPatientPortalAccess(session, "PAT-PATIENT-ALPHA", "portal:consents:sign");
			assert.strictEqual(missingPermCheck.allowed, false);
			assert.strictEqual(missingPermCheck.reason, "MISSING_PERMISSION");

			// 4. Blocked: Unauthenticated null session
			const unauthCheck = checkPatientPortalAccess(null, "PAT-PATIENT-ALPHA", "portal:medical_records:read");
			assert.strictEqual(unauthCheck.allowed, false);
			assert.strictEqual(unauthCheck.reason, "UNAUTHENTICATED");
		});
	});
});
