import assert from "node:assert";
import { describe, test } from "node:test";
import { hashCredential, verifyCredential, signToken, verifyToken } from "./cryptoHelper.js";
import { createHmac } from "node:crypto";

describe("cryptoHelper", () => {
	describe("verifyCredential", () => {
		test("returns true for legacy plain equality", () => {
			assert.strictEqual(verifyCredential("password123", "password123"), true);
		});

		test("returns false for incorrect legacy plain equality", () => {
			assert.strictEqual(verifyCredential("password123", "wrongpassword"), false);
		});

		test("returns true for valid salt:hash matching", () => {
			const hashed = hashCredential("securepassword");
			assert.strictEqual(verifyCredential("securepassword", hashed), true);
		});

		test("returns false for invalid salt:hash matching", () => {
			const hashed = hashCredential("securepassword");
			assert.strictEqual(verifyCredential("wrongpassword", hashed), false);
		});

		test("returns false when salt is missing in stored format", () => {
			assert.strictEqual(verifyCredential("password", ":somehash"), false);
		});

		test("returns false when hash is missing in stored format", () => {
			assert.strictEqual(verifyCredential("password", "somesalt:"), false);
		});

		test("returns false when stored hash has different length than expected", () => {
			// salt = "somesalt", hash = "short"
			assert.strictEqual(verifyCredential("password", "somesalt:short"), false);
		});

		test("returns false when try block throws exception", () => {
			// Passing null as stored string should throw on .includes
			assert.strictEqual(verifyCredential("password", null as unknown as string), false);
			// Passing null as plain string should throw in pbkdf2Sync
			assert.strictEqual(verifyCredential(null as unknown as string, "somesalt:somehash"), false);
		});
	});

	describe("verifyToken", () => {
		const secret = "test-secret";

		test("returns payload for a valid token", () => {
			const payload = { userId: 123 };
			const token = signToken(payload, secret);
			const result = verifyToken(token, secret);
			assert.deepStrictEqual(result?.userId, 123);
		});

		test("returns null for token with incorrect number of parts", () => {
			assert.strictEqual(verifyToken("just-one-part", secret), null);
			assert.strictEqual(verifyToken("part1.part2.part3", secret), null);
		});

		test("returns null for token with empty data or signature", () => {
			assert.strictEqual(verifyToken(".signature", secret), null);
			assert.strictEqual(verifyToken("data.", secret), null);
		});

		test("returns null for token with incorrect signature length", () => {
			const payload = { userId: 123 };
			const token = signToken(payload, secret);
			const [data] = token.split(".");
			const badToken = `${data}.shortsig`;
			assert.strictEqual(verifyToken(badToken, secret), null);
		});

		test("returns null for token with incorrect signature", () => {
			const payload = { userId: 123 };
			const token = signToken(payload, secret);
			const [data] = token.split(".");
			const badSig = createHmac("sha256", "wrong-secret").update(data).digest("base64url");
			const badToken = `${data}.${badSig}`;
			assert.strictEqual(verifyToken(badToken, secret), null);
		});

		test("returns null for expired token", () => {
			const payload = { userId: 123 };
			// Expired token (negative ttl)
			const token = signToken(payload, secret, -60);
			assert.strictEqual(verifyToken(token, secret), null);
		});

		test("returns null for token with invalid JSON payload", () => {
			const data = Buffer.from("invalid-json").toString("base64url");
			const signature = createHmac("sha256", secret).update(data).digest("base64url");
			const badToken = `${data}.${signature}`;
			assert.strictEqual(verifyToken(badToken, secret), null);
		});

		test("returns null when try block throws exception", () => {
			assert.strictEqual(verifyToken(null as unknown as string, secret), null);
		});
	});
});
