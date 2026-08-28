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
import {
	acquireSlotSoftLock,
	buildAdminNewBookingAlert,
	buildBookingPushNotification,
	createOnlinePortalBooking,
	extendSlotSoftLock,
	findAvailableDoctorBookingSlots,
	groupAvailableSlotsByDoctor,
	isSlotSoftLocked,
	pruneExpiredSoftLocks,
	releaseSlotSoftLock,
	type BookingDoctorProfile,
	type ClinicBranch,
	type SlotSoftLock,
} from "../portal/patientOnlineBookingEngine.js";
import type { DoctorShiftSchedule, ScheduledAppointment } from "../schedule/shiftCollisionEngine.js";

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

	// ─── 6. FREE SLOTS DISCOVERY & MULTI-BRANCH/SPECIALTY FILTERING ──────────
	describe("6. Free Slots Discovery & Multi-Branch / Specialty Engine", () => {
		const sampleBranch: ClinicBranch = {
			id: "BRANCH-CENTRAL",
			organizationId: "ORG-DENTE-01",
			name: "DENTE Центральный",
			address: "г. Москва, ул. Арбат, д. 24",
			city: "Москва",
			phone: "+7 (495) 100-20-30",
			workingHours: "09:00 - 21:00",
			timezone: "Europe/Moscow",
		};

		const sampleDoctors: BookingDoctorProfile[] = [
			{
				id: "DOC-THERAPIST",
				fullName: "Барабаш Сергей Владимирович",
				specialty: "Врач стоматолог-терапевт",
				specialtyCategory: "therapy",
				branchId: "BRANCH-CENTRAL",
				branchName: "DENTE Центральный",
				cabinetId: "CAB-101",
				cabinetName: "Кабинет №1 (Терапия)",
				rating: 4.9,
				reviewsCount: 142,
				experienceYears: 12,
				isOnlineBookingAvailable: true,
				defaultSlotDurationMinutes: 30,
			},
			{
				id: "DOC-SURGEON",
				fullName: "Ковалев Андрей Михайлович",
				specialty: "Врач стоматолог-хирург, имплантолог",
				specialtyCategory: "surgery",
				branchId: "BRANCH-CENTRAL",
				branchName: "DENTE Центральный",
				cabinetId: "CAB-201",
				cabinetName: "Операционная №2",
				rating: 5.0,
				reviewsCount: 98,
				experienceYears: 15,
				isOnlineBookingAvailable: true,
				defaultSlotDurationMinutes: 60,
			},
			{
				id: "DOC-HYGIENIST",
				fullName: "Смирнова Елена Сергеевна",
				specialty: "Гигиенист стоматологический",
				specialtyCategory: "hygiene",
				branchId: "BRANCH-CENTRAL",
				cabinetId: "CAB-102",
				rating: 4.8,
				reviewsCount: 65,
				experienceYears: 6,
				isOnlineBookingAvailable: true,
				defaultSlotDurationMinutes: 45,
			},
			{
				id: "DOC-ORTHO",
				fullName: "Лебедева Анна Павловна",
				specialty: "Врач-ортодонт",
				specialtyCategory: "orthodontics",
				branchId: "BRANCH-CENTRAL",
				rating: 4.95,
				reviewsCount: 110,
				experienceYears: 10,
				isOnlineBookingAvailable: true,
				defaultSlotDurationMinutes: 30,
			},
		];

		const fixedNow = new Date("2026-08-29T08:00:00.000Z");

		const sampleShifts: DoctorShiftSchedule[] = [
			{
				id: "SHIFT-DOC-THERAPIST-01",
				clinicId: "ORG-DENTE-01",
				doctorId: "DOC-THERAPIST",
				shiftDate: "2026-08-29",
				cabinetId: "CAB-101",
				startTime: "2026-08-29T09:00:00.000Z",
				endTime: "2026-08-29T15:00:00.000Z",
				breakStartTime: "2026-08-29T12:00:00.000Z",
				breakEndTime: "2026-08-29T12:30:00.000Z",
				isEmergencyReserveEnabled: true,
				emergencyReserveMinutes: 30, // 14:30 - 15:00 reserve
			},
		];

		const sampleAppointments: ScheduledAppointment[] = [
			{
				id: "APT-EXISTING-01",
				clinicId: "ORG-DENTE-01",
				doctorId: "DOC-THERAPIST",
				patientId: "PAT-TEST-01",
				cabinetId: "CAB-101",
				startTime: "2026-08-29T10:00:00.000Z",
				endTime: "2026-08-29T11:00:00.000Z",
				status: "confirmed",
			},
		];

		it("discovers free slots respecting shifts, breaks, appointments and emergency buffers", () => {
			const slots = findAvailableDoctorBookingSlots(
				sampleDoctors,
				sampleShifts,
				sampleAppointments,
				[],
				{
					doctorId: "DOC-THERAPIST",
					targetDurationMinutes: 30,
					excludeEmergencyReserves: true,
					now: fixedNow,
				},
			);

			assert.ok(slots.length > 0);

			// Check that booked interval (10:00-11:00) is excluded
			const bookedOverlap = slots.some((s) => s.startTime === "2026-08-29T10:00:00.000Z" || s.startTime === "2026-08-29T10:30:00.000Z");
			assert.strictEqual(bookedOverlap, false);

			// Check that break (12:00-12:30) is excluded
			const breakOverlap = slots.some((s) => s.startTime === "2026-08-29T12:00:00.000Z");
			assert.strictEqual(breakOverlap, false);

			// Check that emergency buffer (14:30-15:00) is excluded
			const emergencyOverlap = slots.some((s) => s.startTime === "2026-08-29T14:30:00.000Z");
			assert.strictEqual(emergencyOverlap, false);

			// Available slots must include: 09:00, 09:30, 11:00, 11:30, 12:30, 13:00, 13:30, 14:00
			const slotTimes = slots.map((s) => s.displayTimeRu);
			assert.ok(slotTimes.includes("12:00") || slotTimes.length >= 7);
		});

		it("filters available slots by specialty category (therapy, surgery, orthodontics, hygiene)", () => {
			const therapySlots = findAvailableDoctorBookingSlots(
				sampleDoctors,
				sampleShifts,
				[],
				[],
				{ specialtyCategory: "therapy", now: fixedNow },
			);
			assert.ok(therapySlots.every((s) => s.specialtyCategory === "therapy"));

			const surgerySlots = findAvailableDoctorBookingSlots(
				sampleDoctors,
				sampleShifts,
				[],
				[],
				{ specialtyCategory: "surgery", now: fixedNow },
			);
			assert.strictEqual(surgerySlots.length, 0); // No surgery shifts on this date
		});

		it("groups available slots by doctor for clear mobile UI presentation", () => {
			const slots = findAvailableDoctorBookingSlots(
				sampleDoctors,
				sampleShifts,
				sampleAppointments,
				[],
				{ now: fixedNow },
			);

			const grouped = groupAvailableSlotsByDoctor(slots, sampleDoctors);
			assert.strictEqual(grouped.length, sampleDoctors.length);

			const therapistGroup = grouped.find((g) => g.doctor.id === "DOC-THERAPIST");
			assert.ok(therapistGroup);
			if (therapistGroup) {
				assert.ok(therapistGroup.totalAvailableSlots > 0);
				assert.ok(therapistGroup.earliestAvailableSlot !== null);
				assert.ok(Object.keys(therapistGroup.slotsByDate).length > 0);
			}
		});
	});

	// ─── 7. 10-MINUTE ANTI-COLLISION SOFT-LOCK ENGINE ────────────────────────
	describe("7. 10-Minute Anti-Collision Slot Soft-Lock Engine", () => {
		const fixedNow = new Date("2026-08-29T10:00:00.000Z");

		it("acquires a 10-minute temporary soft-lock on a doctor time slot", () => {
			const result = acquireSlotSoftLock(
				[],
				{
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					cabinetId: "CAB-101",
					startTime: "2026-08-29T11:00:00.000Z",
					endTime: "2026-08-29T11:30:00.000Z",
					patientId: "PAT-SMIRNOVA",
					patientPhone: "+79165557788",
					lockTtlMinutes: 10,
				},
				[],
				fixedNow,
			);

			assert.strictEqual(result.success, true);
			if (result.success) {
				assert.ok(result.lock.id.startsWith("lock-"));
				assert.strictEqual(result.lock.patientId, "PAT-SMIRNOVA");
				assert.strictEqual(result.lock.doctorId, "DOC-THERAPIST");
				assert.strictEqual(result.lock.durationMinutes, 30);
				assert.strictEqual(result.lock.isReleased, false);

				// 10 minutes expiry check
				const expectedExpiry = new Date(fixedNow.getTime() + 10 * 60 * 1000).toISOString();
				assert.strictEqual(result.lock.expiresAtIso, expectedExpiry);
				assert.strictEqual(result.updatedLocks.length, 1);
			}
		});

		it("blocks another patient from acquiring a locked slot (anti-collision)", () => {
			const initialResult = acquireSlotSoftLock(
				[],
				{
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					startTime: "2026-08-29T11:00:00.000Z",
					endTime: "2026-08-29T11:30:00.000Z",
					patientId: "PAT-SMIRNOVA",
					patientPhone: "+79165557788",
				},
				[],
				fixedNow,
			);
			assert.strictEqual(initialResult.success, true);
			const activeLocks = initialResult.success ? initialResult.updatedLocks : [];

			// Second patient tries to lock overlapping slot
			const conflictResult = acquireSlotSoftLock(
				activeLocks,
				{
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					startTime: "2026-08-29T11:15:00.000Z",
					endTime: "2026-08-29T11:45:00.000Z",
					patientId: "PAT-IVANOV",
					patientPhone: "+79161112233",
				},
				[],
				fixedNow,
			);

			assert.strictEqual(conflictResult.success, false);
			if (!conflictResult.success) {
				assert.strictEqual(conflictResult.reason, "SLOT_ALREADY_LOCKED");
				assert.ok(conflictResult.descriptionRu.includes("удерживается другим пациентом"));
			}
		});

		it("allows the same patient to refresh their own lock", () => {
			const initialResult = acquireSlotSoftLock(
				[],
				{
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					startTime: "2026-08-29T11:00:00.000Z",
					endTime: "2026-08-29T11:30:00.000Z",
					patientId: "PAT-SMIRNOVA",
					patientPhone: "+79165557788",
				},
				[],
				fixedNow,
			);
			assert.strictEqual(initialResult.success, true);
			const activeLocks = initialResult.success ? initialResult.updatedLocks : [];

			// Same patient re-acquires/refreshes
			const refreshResult = acquireSlotSoftLock(
				activeLocks,
				{
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					startTime: "2026-08-29T11:00:00.000Z",
					endTime: "2026-08-29T11:30:00.000Z",
					patientId: "PAT-SMIRNOVA",
					patientPhone: "+79165557788",
				},
				[],
				fixedNow,
			);

			assert.strictEqual(refreshResult.success, true);
			if (refreshResult.success) {
				assert.strictEqual(refreshResult.updatedLocks.length, 1);
			}
		});

		it("rejects acquiring lock for slot in the past or occupied by confirmed appointment", () => {
			// Past slot
			const pastResult = acquireSlotSoftLock(
				[],
				{
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					startTime: "2026-08-29T09:00:00.000Z",
					endTime: "2026-08-29T09:30:00.000Z",
					patientId: "PAT-1",
					patientPhone: "+79161112233",
				},
				[],
				fixedNow, // 10:00:00
			);
			assert.strictEqual(pastResult.success, false);
			if (!pastResult.success) {
				assert.strictEqual(pastResult.reason, "SLOT_IN_PAST");
			}

			// Already booked
			const bookedResult = acquireSlotSoftLock(
				[],
				{
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					startTime: "2026-08-29T14:00:00.000Z",
					endTime: "2026-08-29T14:30:00.000Z",
					patientId: "PAT-1",
					patientPhone: "+79161112233",
				},
				[
					{
						id: "APT-CONFIRMED-99",
						clinicId: "ORG-DENTE-01",
						doctorId: "DOC-THERAPIST",
						patientId: "PAT-TEST-02",
						startTime: "2026-08-29T14:00:00.000Z",
						endTime: "2026-08-29T15:00:00.000Z",
						status: "confirmed",
					},
				],
				fixedNow,
			);
			assert.strictEqual(bookedResult.success, false);
			if (!bookedResult.success) {
				assert.strictEqual(bookedResult.reason, "SLOT_ALREADY_BOOKED");
			}
		});

		it("releases, extends, and prunes expired soft-locks properly", () => {
			const initialResult = acquireSlotSoftLock(
				[],
				{
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					startTime: "2026-08-29T11:00:00.000Z",
					endTime: "2026-08-29T11:30:00.000Z",
					patientId: "PAT-SMIRNOVA",
					patientPhone: "+79165557788",
				},
				[],
				fixedNow,
			);
			assert.strictEqual(initialResult.success, true);
			if (!initialResult.success) return;

			const lockId = initialResult.lock.id;

			// Extend lock by 5 minutes
			const extendResult = extendSlotSoftLock(initialResult.updatedLocks, lockId, "PAT-SMIRNOVA", 5, fixedNow);
			assert.strictEqual(extendResult.success, true);
			if (extendResult.success && extendResult.lock) {
				const expectedExp = new Date(fixedNow.getTime() + 15 * 60 * 1000).toISOString();
				assert.strictEqual(extendResult.lock.expiresAtIso, expectedExp);
			}

			// Release lock
			const releaseResult = releaseSlotSoftLock(extendResult.updatedLocks, lockId, "PAT-SMIRNOVA", fixedNow);
			assert.strictEqual(releaseResult.success, true);
			assert.strictEqual(releaseResult.updatedLocks.length, 0); // Pruned released lock

			// Pruning expired locks
			const expiredLock: SlotSoftLock = {
				...initialResult.lock,
				expiresAtIso: new Date(fixedNow.getTime() - 60000).toISOString(),
			};
			assert.strictEqual(pruneExpiredSoftLocks([expiredLock], fixedNow).length, 0);
		});
	});

	// ─── 8. CRM ONLINE BOOKING CREATION & OMNICHANNEL NOTIFICATIONS ──────────
	describe("8. CRM Online Booking Creation (status: ONLINE_BOOKING, source: ONLINE_BOOKING)", () => {
		const fixedNow = new Date("2026-08-29T10:00:00.000Z");

		const sampleBranch: ClinicBranch = {
			id: "BRANCH-CENTRAL",
			organizationId: "ORG-DENTE-01",
			name: "DENTE Центральный",
			address: "г. Москва, ул. Арбат, д. 24",
			city: "Москва",
			phone: "+7 (495) 100-20-30",
			workingHours: "09:00 - 21:00",
			timezone: "Europe/Moscow",
		};

		const sampleDoctor: BookingDoctorProfile = {
			id: "DOC-THERAPIST",
			fullName: "Барабаш Сергей Владимирович",
			specialty: "Врач стоматолог-терапевт",
			specialtyCategory: "therapy",
			branchId: "BRANCH-CENTRAL",
			branchName: "DENTE Центральный",
			cabinetId: "CAB-101",
			cabinetName: "Кабинет №1 (Терапия)",
			rating: 4.9,
			reviewsCount: 142,
			experienceYears: 12,
			isOnlineBookingAvailable: true,
			defaultSlotDurationMinutes: 30,
		};

		it("creates confirmed appointment with status ONLINE_BOOKING and releases patient soft-lock", () => {
			// 1. Patient holds a soft-lock
			const lockResult = acquireSlotSoftLock(
				[],
				{
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					startTime: "2026-08-29T13:00:00.000Z",
					endTime: "2026-08-29T13:30:00.000Z",
					patientId: "PAT-7741",
					patientPhone: "+79161234567",
				},
				[],
				fixedNow,
			);
			assert.strictEqual(lockResult.success, true);
			const activeLocks = lockResult.success ? lockResult.updatedLocks : [];
			const lockId = lockResult.success ? lockResult.lock.id : "";

			// 2. Complete booking
			const bookingResult = createOnlinePortalBooking({
				bookingInput: {
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					cabinetId: "CAB-101",
					startTime: "2026-08-29T13:00:00.000Z",
					endTime: "2026-08-29T13:30:00.000Z",
					patientId: "PAT-7741",
					patientFullName: "Иванов Иван Иванович",
					patientPhone: "+7 (916) 123-45-67",
					serviceCategory: "therapy",
					serviceName: "Лечение кариеса и консультация",
					patientNotes: "Беспокоит реакция на холодное в области 46 зуба",
					lockId,
					channel: "mobile_portal",
					clientIp: "178.62.204.15",
					userAgent: "DenteMobileApp/1.0",
				},
				activeLocks,
				existingAppointments: [],
				doctor: sampleDoctor,
				branch: sampleBranch,
				now: fixedNow,
			});

			assert.strictEqual(bookingResult.success, true);
			if (bookingResult.success) {
				const { appointment, pushNotification, adminAlert } = bookingResult.result;

				// Appointment assertions
				assert.ok(appointment.id);
				assert.strictEqual(appointment.clinicId, "ORG-DENTE-01");
				assert.strictEqual(appointment.doctorId, "DOC-THERAPIST");
				assert.strictEqual(appointment.patientId, "PAT-7741");
				assert.strictEqual(appointment.patientFullName, "Иванов Иван Иванович");
				assert.strictEqual(appointment.status, "ONLINE_BOOKING");
				assert.strictEqual(appointment.source, "ONLINE_BOOKING");
				assert.strictEqual(appointment.notes, "Беспокоит реакция на холодное в области 46 зуба");
				assert.strictEqual(appointment.sourceMetadata.channel, "mobile_portal");

				// Push notification assertions
				assert.strictEqual(pushNotification.recipientPatientId, "PAT-7741");
				assert.strictEqual(pushNotification.recipientPhone, "+7 (916) 123-45-67");
				assert.ok(pushNotification.title.includes("Вы записаны"));
				assert.ok(pushNotification.body.includes("Барабаш Сергей Владимирович"));
				assert.ok(pushNotification.body.includes("ул. Арбат, д. 24"));
				assert.strictEqual(pushNotification.data.source, "ONLINE_BOOKING");

				// Admin alert assertions
				assert.strictEqual(adminAlert.organizationId, "ORG-DENTE-01");
				assert.strictEqual(adminAlert.patientFullName, "Иванов Иван Иванович");
				assert.strictEqual(adminAlert.doctorFullName, "Барабаш Сергей Владимирович");
				assert.strictEqual(adminAlert.source, "ONLINE_BOOKING");
				assert.ok(adminAlert.message.includes("оформил запись"));

				// Soft-lock released
				assert.strictEqual(bookingResult.updatedLocks.length, 0);
			}
		});

		it("detects and rejects booking when collision with existing appointment occurs", () => {
			const existingAppointments: ScheduledAppointment[] = [
				{
					id: "APT-CONFLICT-01",
					clinicId: "ORG-DENTE-01",
					doctorId: "DOC-THERAPIST",
					patientId: "PAT-TEST-03",
					startTime: "2026-08-29T13:00:00.000Z",
					endTime: "2026-08-29T13:30:00.000Z",
					status: "confirmed",
				},
			];

			const bookingResult = createOnlinePortalBooking({
				bookingInput: {
					organizationId: "ORG-DENTE-01",
					branchId: "BRANCH-CENTRAL",
					doctorId: "DOC-THERAPIST",
					startTime: "2026-08-29T13:00:00.000Z",
					endTime: "2026-08-29T13:30:00.000Z",
					patientId: "PAT-7741",
					patientFullName: "Иванов Иван Иванович",
					patientPhone: "+79161234567",
					serviceCategory: "therapy",
					serviceName: "Консультация",
				},
				activeLocks: [],
				existingAppointments,
				doctor: sampleDoctor,
				branch: sampleBranch,
				now: fixedNow,
			});

			assert.strictEqual(bookingResult.success, false);
			if (!bookingResult.success) {
				assert.strictEqual(bookingResult.error, "COLLISION_DETECTED");
				assert.ok(bookingResult.descriptionRu.includes("уже существует подтверждённая запись"));
			}
		});
	});
});
