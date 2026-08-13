import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
	generateActionCode,
	actionCodeExpiry,
	readPublicBaseUrl,
	actionLinkFor
} from "../../services/communications/appointmentActionLinks.js";

describe("appointmentActionLinks", () => {
	describe("generateActionCode", () => {
		test("generates code of default length", () => {
			const code = generateActionCode();
			assert.equal(code.length, 10);
		});

		test("generates code of custom length", () => {
			const code = generateActionCode(15);
			assert.equal(code.length, 15);
		});

		test("uses only allowed alphabet characters", () => {
			const code = generateActionCode(100);
			const allowedAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
			for (const char of code) {
				assert.ok(allowedAlphabet.includes(char), `Character ${char} is not in allowed alphabet`);
			}
		});

		test("generates different codes on multiple calls", () => {
			const code1 = generateActionCode();
			const code2 = generateActionCode();
			assert.notEqual(code1, code2);
		});
	});

	describe("actionCodeExpiry", () => {
		test("adds 6 hours to appointmentStartsAt if it is far enough in the future", () => {
			const now = new Date("2024-01-01T10:00:00Z");
			const startsAt = new Date("2024-01-01T15:00:00Z");
			const expiry = actionCodeExpiry(startsAt, now);

			// 15:00 + 6 hours = 21:00
			assert.equal(expiry.toISOString(), "2024-01-01T21:00:00.000Z");
		});

		test("returns now + 1 hour if appointmentStartsAt + 6 hours is before now + 1 hour", () => {
			const now = new Date("2024-01-01T10:00:00Z");
			// Appointment already started 10 hours ago
			const startsAt = new Date("2024-01-01T00:00:00Z");
			const expiry = actionCodeExpiry(startsAt, now);

			// 00:00 + 6 hours = 06:00, which is less than now + 1 hour (11:00)
			// So it falls back to 11:00
			assert.equal(expiry.toISOString(), "2024-01-01T11:00:00.000Z");
		});

		test("returns exactly now + 1 hour if appointmentStartsAt + 6 hours equals now + 1 hour", () => {
			const now = new Date("2024-01-01T10:00:00Z");
			const startsAt = new Date("2024-01-01T05:00:00Z");
			const expiry = actionCodeExpiry(startsAt, now);

			// 05:00 + 6 hours = 11:00. now + 1 hour = 11:00.
			assert.equal(expiry.toISOString(), "2024-01-01T11:00:00.000Z");
		});
	});

	describe("readPublicBaseUrl", () => {
		test("returns null if env variable is missing", () => {
			assert.equal(readPublicBaseUrl({}), null);
		});

		test("returns null if env variable is empty", () => {
			assert.equal(readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "   " }), null);
		});

		test("returns null if URL is invalid", () => {
			assert.equal(readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "not-a-url" }), null);
		});

		test("returns null if protocol is not http or https", () => {
			assert.equal(readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "ftp://clinic.example" }), null);
		});

		test("returns protocol and host from a valid https URL", () => {
			assert.equal(readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "https://clinic.example" }), "https://clinic.example");
		});

		test("returns protocol and host from a valid http URL", () => {
			assert.equal(readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "http://clinic.example" }), "http://clinic.example");
		});

		test("strips path and parameters from valid URL", () => {
			assert.equal(readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "https://clinic.example/some/path?param=1" }), "https://clinic.example");
		});

		test("ignores trailing slash on host", () => {
			assert.equal(readPublicBaseUrl({ DENTE_PUBLIC_BASE_URL: "https://clinic.example/" }), "https://clinic.example");
		});
	});

	describe("actionLinkFor", () => {
		test("combines baseUrl and code correctly", () => {
			const baseUrl = "https://clinic.example";
			const code = "Ab3xK9mQ2T";
			assert.equal(actionLinkFor(baseUrl, code), "https://clinic.example/api/p/Ab3xK9mQ2T");
		});
	});
});
