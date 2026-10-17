import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import {
	checkStaffPinRateLimit,
	clearAllStaffPinRateLimitsForTesting,
	getStaffPinRateLimitKey,
	recordStaffPinFailure,
	resetStaffPinRateLimit,
} from "../../routes/auth/loginModules/loginRateLimiter.js";
import {
	staffSwitchRoleSchema,
	staffUnlockBodySchema,
} from "../../routes/auth/loginModules/loginValidationSchemas.js";
import {
	signToken,
	verifyToken,
} from "../../utils/cryptoHelper.js";

describe("Staff PIN Security, Rate Limiter & Role Switch Invariants", () => {
	beforeEach(() => {
		clearAllStaffPinRateLimitsForTesting();
	});

	describe("1. PIN Brute-Force Rate Limiter (МАНДАТ 8e: Security & Autonomy)", () => {
		it("permits initial attempts and correctly tracks remaining attempts", () => {
			const key = getStaffPinRateLimitKey("org-1", "user-1", "127.0.0.1");
			const initial = checkStaffPinRateLimit(key);
			assert.strictEqual(initial.allowed, true);
			assert.strictEqual(initial.remainingAttempts, 5);

			// 1st failure
			const after1 = recordStaffPinFailure(key);
			assert.strictEqual(after1.allowed, true);
			assert.strictEqual(after1.remainingAttempts, 4);

			// 2nd failure
			const after2 = recordStaffPinFailure(key);
			assert.strictEqual(after2.allowed, true);
			assert.strictEqual(after2.remainingAttempts, 3);
		});

		it("triggers 5-minute lockout (429) exactly after 5 consecutive failures", () => {
			const key = getStaffPinRateLimitKey("org-2", "user-2", "192.168.1.50");

			// 4 failures
			for (let i = 0; i < 4; i++) {
				const res = recordStaffPinFailure(key);
				assert.strictEqual(res.allowed, true);
			}

			// 5th failure: triggers lockout
			const locked = recordStaffPinFailure(key);
			assert.strictEqual(locked.allowed, false);
			assert.strictEqual(locked.remainingAttempts, 0);
			assert.ok(locked.retryAfterSeconds && locked.retryAfterSeconds > 250);

			// Subsequent checks must block with remaining retry-after
			const checked = checkStaffPinRateLimit(key);
			assert.strictEqual(checked.allowed, false);
			assert.strictEqual(checked.remainingAttempts, 0);
			assert.ok(checked.retryAfterSeconds && checked.retryAfterSeconds > 250);
		});

		it("resets rate limit counter immediately upon successful PIN entry", () => {
			const key = getStaffPinRateLimitKey("org-3", "user-3", "10.0.0.1");

			// 3 failed attempts
			recordStaffPinFailure(key);
			recordStaffPinFailure(key);
			recordStaffPinFailure(key);

			const intermediate = checkStaffPinRateLimit(key);
			assert.strictEqual(intermediate.remainingAttempts, 2);

			// Successful unlock resets the bucket
			resetStaffPinRateLimit(key);

			const fresh = checkStaffPinRateLimit(key);
			assert.strictEqual(fresh.allowed, true);
			assert.strictEqual(fresh.remainingAttempts, 5);
		});

		it("isolates rate limits per IP and user ID", () => {
			const keyUserA = getStaffPinRateLimitKey("org-4", "user-A", "10.0.0.1");
			const keyUserB = getStaffPinRateLimitKey("org-4", "user-B", "10.0.0.1");
			const keyIp2 = getStaffPinRateLimitKey("org-4", "user-A", "10.0.0.2");

			// Exhaust user A from IP 1
			for (let i = 0; i < 5; i++) {
				recordStaffPinFailure(keyUserA);
			}

			assert.strictEqual(checkStaffPinRateLimit(keyUserA).allowed, false);
			// User B from same IP is NOT blocked
			assert.strictEqual(checkStaffPinRateLimit(keyUserB).allowed, true);
			// User A from different IP is isolated
			assert.strictEqual(checkStaffPinRateLimit(keyIp2).allowed, true);
		});
	});

	describe("2. Zod Validation Schemas (Layer 0 Guard)", () => {
		it("accepts valid PIN strings and numbers, transforms to string", () => {
			const validString = staffUnlockBodySchema.safeParse({
				userId: "user-123",
				pinCode: "1234",
			});
			assert.strictEqual(validString.success, true);
			if (validString.success) {
				assert.strictEqual(validString.data.pinCode, "1234");
			}

			const validNumber = staffUnlockBodySchema.safeParse({
				userId: "user-123",
				pinCode: 4321,
			});
			assert.strictEqual(validNumber.success, true);
			if (validNumber.success) {
				assert.strictEqual(validNumber.data.pinCode, "4321");
			}
		});

		it("rejects non-numeric objects or empty PIN", () => {
			const emptyPin = staffUnlockBodySchema.safeParse({
				userId: "user-123",
				pinCode: "",
			});
			assert.strictEqual(emptyPin.success, false);

			const objPin = staffUnlockBodySchema.safeParse({
				userId: "user-123",
				pinCode: { secret: 1234 },
			});
			assert.strictEqual(objPin.success, false);
		});

		it("validates staffSwitchRoleSchema with allowed clinical roles", () => {
			const validRoles = [
				"doctor",
				"administrator",
				"owner",
				"assistant",
				"hygienist",
				"receptionist",
			];
			for (const role of validRoles) {
				const res = staffSwitchRoleSchema.safeParse({ targetRole: role });
				assert.strictEqual(res.success, true, `Role ${role} should be allowed`);
			}

			const invalidRole = staffSwitchRoleSchema.safeParse({
				targetRole: "superhacker",
			});
			assert.strictEqual(invalidRole.success, false);
		});
	});

	describe("3. HMAC Signature & Token Lifecycle", () => {
		it("signs and verifies staff token with role, orgId, and sessionId", () => {
			const secret = "test-secret-staff-key-1234567890";
			const payload = {
				userId: "doc-uuid-1",
				fullName: "Д-р Соколов А. В.",
				role: "doctor",
				organizationId: "org-uuid-1",
				sessionId: "sess-uuid-99",
			};

			const token = signToken(payload, secret, 3600);
			assert.ok(typeof token === "string" && token.length > 20);

			const verified = verifyToken(token, secret);
			assert.ok(verified !== null);
			assert.strictEqual(verified.userId, payload.userId);
			assert.strictEqual(verified.role, payload.role);
			assert.strictEqual(verified.organizationId, payload.organizationId);
			assert.strictEqual(verified.sessionId, payload.sessionId);
		});

		it("rejects tampered staff tokens", () => {
			const secret = "test-secret-staff-key-1234567890";
			const token = signToken(
				{ userId: "doc-1", role: "doctor", organizationId: "org-1" },
				secret,
				3600,
			);

			// Tamper token string
			const tampered = token.slice(0, -5) + "abcde";
			const verified = verifyToken(tampered, secret);
			assert.strictEqual(verified, null);
		});
	});
});
