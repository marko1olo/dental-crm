import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isSensitiveKey,
	sanitizePayload,
	sanitizeString,
} from "../logging/index.js";

describe("Chaos & Stress Audit: 152-FZ Sanitizer & Observability Engine", () => {
	describe("1. Circular References & Infinite Recursion (Break It & WeakSet Protection)", () => {
		it("safely handles self-referencing circular object (a.self = a) without stack overflow", () => {
			const a: Record<string, unknown> = { id: 1, name: "Dr. Smirnov" };
			a.self = a;

			const sanitized = sanitizePayload(a);
			assert.equal(sanitized.id, 1);
			assert.equal(sanitized.name, "Dr. Smirnov");
			assert.equal(sanitized.self, "[CIRCULAR_REFERENCE]");
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});

		it("safely handles mutual circular cross-references (a -> b -> a)", () => {
			const a: Record<string, unknown> = { name: "Clinic Root" };
			const b: Record<string, unknown> = { name: "Branch 1", parent: a };
			a.child = b;

			const sanitized = sanitizePayload(a);
			assert.equal(sanitized.name, "Clinic Root");
			assert.equal((sanitized.child as Record<string, unknown>).name, "Branch 1");
			assert.equal(((sanitized.child as Record<string, unknown>).parent as Record<string, unknown>), "[CIRCULAR_REFERENCE]");
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});

		it("safely handles circular arrays (arr.push(arr))", () => {
			const arr: unknown[] = [1, 2, "normal"];
			arr.push(arr);

			const sanitized = sanitizePayload(arr);
			assert.equal(sanitized[0], 1);
			assert.equal(sanitized[1], 2);
			assert.equal(sanitized[2], "normal");
			assert.equal(sanitized[3], "[CIRCULAR_REFERENCE]");
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});

		it("safely handles complex multi-tier circular structures with objects and arrays", () => {
			const root: Record<string, unknown> = { title: "Root Level", items: [] };
			const item1: Record<string, unknown> = { label: "Item 1", rootRef: root };
			const item2: Record<string, unknown> = { label: "Item 2", peers: [item1, root] };
			(root.items as unknown[]).push(item1, item2);

			const sanitized = sanitizePayload(root);
			assert.equal(sanitized.title, "Root Level");
			const items = sanitized.items as Record<string, unknown>[];
			assert.equal(items[0]?.label, "Item 1");
			assert.equal(items[0]?.rootRef, "[CIRCULAR_REFERENCE]");
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});

		it("safely handles circular references attached to Error objects", () => {
			const err = new Error("Database deadlock");
			const circularContext: Record<string, unknown> = { errCode: 5001 };
			circularContext.errorRef = err;
			(err as unknown as Record<string, unknown>).ctx = circularContext;

			const sanitized = sanitizePayload(err) as unknown as Record<string, unknown>;
			assert.equal(sanitized.name, "Error");
			assert.equal(sanitized.message, "Database deadlock");
			assert.ok(sanitized.ctx);
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});
	});

	describe("2. Deep Recursion & Stack Overflow Defense (DoS Resilience)", () => {
		it("survives 120-tier deeply nested object tree without Maximum call stack size exceeded", () => {
			let deeplyNested: Record<string, unknown> = { value: "deepest leaf", secretToken: "jwt.secret.token" };
			for (let i = 0; i < 120; i++) {
				deeplyNested = { tier: i, next: deeplyNested };
			}

			// Default maxDepth = 6
			const sanitized = sanitizePayload(deeplyNested, 6);
			assert.ok(sanitized);

			// Traverse down 6 levels
			let cursor = sanitized as Record<string, unknown>;
			for (let i = 0; i < 6; i++) {
				cursor = cursor.next as Record<string, unknown>;
			}
			assert.equal(cursor, "[MAX_DEPTH_REACHED]");
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});

		it("survives 100-tier deeply nested arrays without stack overflow", () => {
			let deepArray: unknown[] = ["leaf item"];
			for (let i = 0; i < 100; i++) {
				deepArray = [deepArray];
			}

			const sanitized = sanitizePayload(deepArray, 8);
			assert.ok(Array.isArray(sanitized));
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});
	});

	describe("3. Throwing Getters & Proxy Traps (Exploit Resilience)", () => {
		it("handles objects with throwing property getters without crashing the logger", () => {
			const maliciousObject = {
				safeProp: "Visible data",
				get explosiveProperty() {
					throw new Error("Exploitative getter triggered!");
				},
				get anotherBomb() {
					throw new TypeError("Cannot read undefined");
				},
			};

			const sanitized = sanitizePayload(maliciousObject) as Record<string, unknown>;
			assert.equal(sanitized.safeProp, "Visible data");
			assert.equal(sanitized.explosiveProperty, "[UNREADABLE_PROPERTY]");
			assert.equal(sanitized.anotherBomb, "[UNREADABLE_PROPERTY]");
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});

		it("handles throwing Proxy traps gracefully", () => {
			const target = { field: "data" };
			const throwingProxy = new Proxy(target, {
				get(t, prop, receiver) {
					if (prop === "trap") {
						throw new Error("Proxy trap exploded");
					}
					return Reflect.get(t, prop, receiver);
				},
				ownKeys() {
					return ["field", "trap"];
				},
				getOwnPropertyDescriptor(t, prop) {
					return {
						enumerable: true,
						configurable: true,
						value: prop === "field" ? "data" : undefined,
					};
				},
			});

			const sanitized = sanitizePayload(throwingProxy) as Record<string, unknown>;
			assert.equal(sanitized.field, "data");
			assert.equal(sanitized.trap, "[UNREADABLE_PROPERTY]");
		});
	});

	describe("4. Non-Standard Types & Large Binary Payloads (BigInt, Map, Set, Buffers)", () => {
		it("safely serializes BigInt values without throwing JSON.stringify TypeError", () => {
			const payload = {
				largeCounter: 9007199254740991555n,
				nested: {
					anotherBigInt: 100n,
				},
			};

			const sanitized = sanitizePayload(payload) as Record<string, unknown>;
			assert.equal(sanitized.largeCounter, "9007199254740991555n");
			assert.equal((sanitized.nested as Record<string, unknown>).anotherBigInt, "100n");
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});

		it("safely sanitizes Map and Set instances with circular reference tracking", () => {
			const map = new Map<string, unknown>();
			map.set("password", "Secret123!");
			map.set("clinicName", "Dente Elite");
			map.set("circularMap", map);

			const set = new Set<unknown>();
			set.add("plain text");
			set.add(12345);

			const payload = { map, set };
			const sanitized = sanitizePayload(payload) as unknown as {
				map: Record<string, unknown>;
				set: unknown[];
			};

			assert.equal(sanitized.map.password, "[СКРЫТО]");
			assert.equal(sanitized.map.clinicName, "Dente Elite");
			assert.equal(sanitized.map.circularMap, "[CIRCULAR_REFERENCE]");
			assert.deepEqual(sanitized.set, ["plain text", 12345]);
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});

		it("prevents DoS on huge 5MB ArrayBuffers and TypedArrays in O(1)", () => {
			const largeBuffer = new Uint8Array(5 * 1024 * 1024); // 5 MB
			const rawBuffer = new ArrayBuffer(1024 * 1024); // 1 MB

			const startTime = performance.now();
			const sanitized = sanitizePayload({
				dicomScan: largeBuffer,
				rawFile: rawBuffer,
			});
			const elapsedMs = performance.now() - startTime;

			assert.ok(elapsedMs < 50, `Expected O(1) buffer handling < 50ms, took ${elapsedMs}ms`);
			assert.equal(sanitized.dicomScan, `[Binary Data: ${5 * 1024 * 1024} bytes]`);
			assert.equal(sanitized.rawFile, `[Binary Data: ${1024 * 1024} bytes]`);
			assert.doesNotThrow(() => JSON.stringify(sanitized));
		});

		it("safely formats Dates, RegExps, Symbols, and Functions", () => {
			const validDate = new Date("2026-08-25T12:00:00Z");
			const invalidDate = new Date("invalid date string");
			const regex = /^[A-Z0-9]+$/gi;
			const sym = Symbol("dente_unique_id");
			const fn = function processTreatment() { return true; };

			const sanitized = sanitizePayload({
				validDate,
				invalidDate,
				regex,
				sym,
				fn,
			});

			assert.equal(sanitized.validDate, "2026-08-25T12:00:00.000Z");
			assert.equal(sanitized.invalidDate, "[Invalid Date]");
			assert.equal(sanitized.regex, "/^[A-Z0-9]+$/gi");
			assert.equal(sanitized.sym, "Symbol(dente_unique_id)");
			assert.equal(sanitized.fn, "[Function: processTreatment]");
		});
	});

	describe("5. Exotic Headers, Sensitive Key Dictionaries & Nested Credential Arrays", () => {
		it("detects exotic authorization and session keys", () => {
			assert.equal(isSensitiveKey("x-api-key"), true);
			assert.equal(isSensitiveKey("x_api_key"), true);
			assert.equal(isSensitiveKey("apiKey"), true);
			assert.equal(isSensitiveKey("api-key"), true);
			assert.equal(isSensitiveKey("auth_token"), true);
			assert.equal(isSensitiveKey("authToken"), true);
			assert.equal(isSensitiveKey("x-auth-token"), true);
			assert.equal(isSensitiveKey("dente_session_secret"), true);
			assert.equal(isSensitiveKey("dente-session-token"), true);
			assert.equal(isSensitiveKey("client_secret"), true);
			assert.equal(isSensitiveKey("private-key"), true);
			assert.equal(isSensitiveKey("privateKey"), true);
			assert.equal(isSensitiveKey("signing_key"), true);
			assert.equal(isSensitiveKey("encryption_key"), true);
			assert.equal(isSensitiveKey("verification_code"), true);
			assert.equal(isSensitiveKey("sms_code"), true);
			assert.equal(isSensitiveKey("otp"), true);
			assert.equal(isSensitiveKey("mfa"), true);
			assert.equal(isSensitiveKey("bank_account"), true);
			assert.equal(isSensitiveKey("iban"), true);
			assert.equal(isSensitiveKey("account_number"), true);
			assert.equal(isSensitiveKey("polis"), true);
			assert.equal(isSensitiveKey("oms"), true);
			assert.equal(isSensitiveKey("ecp"), true);
			assert.equal(isSensitiveKey("eds"), true);
		});

		it("detects Cyrillic sensitive keys (152-ФЗ)", () => {
			assert.equal(isSensitiveKey("пароль"), true);
			assert.equal(isSensitiveKey("пинкод"), true);
			assert.equal(isSensitiveKey("токен"), true);
			assert.equal(isSensitiveKey("секрет"), true);
			assert.equal(isSensitiveKey("паспорт"), true);
			assert.equal(isSensitiveKey("снилс"), true);
			assert.equal(isSensitiveKey("полис"), true);
			assert.equal(isSensitiveKey("номер_карты"), true);
			assert.equal(isSensitiveKey("код_подтверждения"), true);
			assert.equal(isSensitiveKey("эцп"), true);
			assert.equal(isSensitiveKey("подпись"), true);
		});

		it("masks all elements in nested credential arrays and objects under sensitive parent keys", () => {
			const sensitiveContainer = {
				passwords: ["FirstPass123!", "SecondPass456!"],
				tokens: ["token_aaa", "token_bbb"],
				api_keys: ["key_111", "key_222"],
				dente_session_secret: {
					subSecret: "sensitive_child_secret",
					numericCode: 998877,
				},
				"x-api-key": "secret_live_api_key",
				"auth_token": "bearer_raw_value",
			};

			const sanitized = sanitizePayload(sensitiveContainer);

			assert.deepEqual(sanitized.passwords, ["[СКРЫТО]", "[СКРЫТО]"]);
			assert.deepEqual(sanitized.tokens, ["[СКРЫТО]", "[СКРЫТО]"]);
			assert.deepEqual(sanitized.api_keys, ["[СКРЫТО]", "[СКРЫТО]"]);
			assert.equal(sanitized.dente_session_secret.subSecret, "[СКРЫТО]");
			assert.equal(sanitized.dente_session_secret.numericCode, "[СКРЫТО]");
			assert.equal(sanitized["x-api-key"], "[СКРЫТО]");
			assert.equal(sanitized["auth_token"], "[СКРЫТО]");
		});

		it("masks sensitive query parameters in URL strings", () => {
			const urlWithToken = "https://crm.dente.ru/api/v1/auth/callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeak&redirect=/dashboard";
			const urlWithApiKey = "https://api.dente.ru/integrations/egisz?api_key=secret-live-123456789&clinic_id=org-01";
			const urlWithPassword = "http://localhost:3000/login?password=mySecretPassword123&user=admin";
			const urlWithSession = "https://app.dente.ru/session?dente_session_secret=super_secret_session_token_xyz";

			const sanitizedTokenUrl = sanitizeString(urlWithToken);
			assert.ok(!sanitizedTokenUrl.includes("doNotLeak"));
			assert.ok(sanitizedTokenUrl.includes("token=[СКРЫТО]"));

			const sanitizedApiKeyUrl = sanitizeString(urlWithApiKey);
			assert.ok(!sanitizedApiKeyUrl.includes("secret-live-123456789"));
			assert.ok(sanitizedApiKeyUrl.includes("api_key=[СКРЫТО]"));

			const sanitizedPasswordUrl = sanitizeString(urlWithPassword);
			assert.ok(!sanitizedPasswordUrl.includes("mySecretPassword123"));
			assert.ok(sanitizedPasswordUrl.includes("password=[СКРЫТО]"));

			const sanitizedSessionUrl = sanitizeString(urlWithSession);
			assert.ok(!sanitizedSessionUrl.includes("super_secret_session_token_xyz"));
			assert.ok(sanitizedSessionUrl.includes("dente_session_secret=[СКРЫТО]"));
		});

		it("masks Basic Authorization header strings", () => {
			const rawBasic = "Basic YWRtaW46cGFzc3dvcmQxMjM=";
			const masked = sanitizeString(rawBasic);
			assert.equal(masked, "Basic [ТОКЕН_СКРЫТ]");
		});
	});
});
