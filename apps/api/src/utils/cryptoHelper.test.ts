import assert from "node:assert";
import { describe, test } from "node:test";
import { hashCredential, verifyCredential } from "./cryptoHelper.js";

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
});
