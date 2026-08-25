import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CORRELATION_ID_HEADER,
	REQUEST_ID_HEADER,
	extractCorrelationId,
	generateCorrelationId,
	isSensitiveKey,
	isValidCorrelationId,
	sanitizePayload,
	sanitizeString,
} from "../logging/index.js";

describe("Observability & Logging Utilities", () => {
	describe("Correlation ID Generator & Validator", () => {
		it("generates a valid correlation ID with default prefix", () => {
			const id = generateCorrelationId();
			assert.ok(id.startsWith("cor_"), `Expected prefix cor_, got ${id}`);
			assert.equal(isValidCorrelationId(id), true);
		});

		it("generates a valid correlation ID with custom prefix", () => {
			const id = generateCorrelationId("req");
			assert.ok(id.startsWith("req_"), `Expected prefix req_, got ${id}`);
			assert.equal(isValidCorrelationId(id), true);
		});

		it("validates correlation IDs correctly", () => {
			assert.equal(isValidCorrelationId(""), false);
			assert.equal(isValidCorrelationId("short"), false);
			assert.equal(isValidCorrelationId("cor_019532d5-e234-7000-8000-000000000000"), true);
			assert.equal(isValidCorrelationId("custom-valid-correlation-id-12345"), true);
			assert.equal(isValidCorrelationId("invalid chars $$%%"), false);
		});

		it("extracts correlation ID from plain headers object", () => {
			const headers = {
				[CORRELATION_ID_HEADER]: "cor_019532d5-e234-7000-8000-000000000000",
			};
			assert.equal(
				extractCorrelationId(headers),
				"cor_019532d5-e234-7000-8000-000000000000",
			);
		});

		it("extracts correlation ID from Fetch Headers object", () => {
			const map = new Map<string, string>();
			map.set(REQUEST_ID_HEADER, "req_019532d5-e234-7000-8000-000000000000");
			const fetchHeaders = {
				get: (name: string) => map.get(name) || null,
			};
			assert.equal(
				extractCorrelationId(fetchHeaders),
				"req_019532d5-e234-7000-8000-000000000000",
			);
		});

		it("returns null when no correlation ID header is present", () => {
			assert.equal(extractCorrelationId({ "content-type": "application/json" }), null);
			assert.equal(extractCorrelationId(null), null);
		});
	});

	describe("152-ФЗ PII & Credential Sanitizer", () => {
		it("detects sensitive keys accurately", () => {
			assert.equal(isSensitiveKey("password"), true);
			assert.equal(isSensitiveKey("userPin"), true);
			assert.equal(isSensitiveKey("authToken"), true);
			assert.equal(isSensitiveKey("dente_staff_token"), true);
			assert.equal(isSensitiveKey("credit_card_number"), true);
			assert.equal(isSensitiveKey("patient_snils"), true);
			assert.equal(isSensitiveKey("passport_series"), true);
			assert.equal(isSensitiveKey("patientName"), false);
			assert.equal(isSensitiveKey("status"), false);
		});

		it("masks JWT and Bearer tokens in strings", () => {
			const fakeJwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "doNotLeakThisSig"].join(".");
			const bearer = `Bearer ${fakeJwt}`;
			const masked = sanitizeString(bearer);
			assert.ok(!masked.includes("doNotLeakThisSig"));
			assert.ok(masked.includes("[JWT_ТОКЕН_СКРЫТ]") || masked.includes("[ТОКЕН_СКРЫТ]"));
		});

		it("masks credit cards in strings", () => {
			const text = "Payment made with card 4276 1234 5678 9012 successfully";
			const masked = sanitizeString(text);
			assert.equal(masked, "Payment made with card 4276 **** **** 9012 successfully");
		});

		it("masks SNILS in strings", () => {
			const text = "Patient SNILS: 123-456-789 01 in registry";
			const masked = sanitizeString(text);
			assert.equal(masked, "Patient SNILS: ***-***-*** 01 in registry");
		});

		it("masks Russian passports in strings", () => {
			const text = "Passport 45 12 345678 issued by OVD";
			const masked = sanitizeString(text);
			assert.ok(masked.includes("** ** ******78") || masked.includes("[ПАСПОРТ_СКРЫТ]"));
		});

		it("recursively sanitizes complex objects and arrays without mutating input", () => {
			const input = {
				organizationId: "org-1",
				patient: {
					name: "Иван Иванов",
					password: "SuperSecretPassword123!",
					pin: "1234",
					cards: [{ cardNumber: "4276 8888 9999 1234", cvv: "123" }],
				},
				metadata: {
					token: "secret-token-xyz",
					tags: ["vip", "ortho"],
				},
			};

			const sanitized = sanitizePayload(input);

			assert.equal(sanitized.organizationId, "org-1");
			assert.equal(sanitized.patient.name, "Иван Иванов");
			assert.equal(sanitized.patient.password, "[СКРЫТО]");
			assert.equal(sanitized.patient.pin, "[СКРЫТО]");
			assert.equal(sanitized.patient.cards[0]?.cardNumber, "[СКРЫТО]");
			assert.equal(sanitized.patient.cards[0]?.cvv, "[СКРЫТО]");
			assert.equal(sanitized.metadata.token, "[СКРЫТО]");
			assert.deepEqual(sanitized.metadata.tags, ["vip", "ortho"]);

			// Original is intact
			assert.equal(input.patient.password, "SuperSecretPassword123!");
		});

		it("handles circular references gracefully", () => {
			const circular: Record<string, unknown> = { name: "Test" };
			circular.self = circular;

			const sanitized = sanitizePayload(circular);
			assert.equal(sanitized.name, "Test");
			assert.equal(sanitized.self, "[CIRCULAR_REFERENCE]");
		});
	});
});
