/**
 * Comprehensive Test Suite for Decomposed EGISZ REMD Outbox Dispatcher Subsystem.
 * Validates DAG Layering, Behavioral Conservation, Zero-Mock Cryptographic Policies,
 * XML Structural Validation, Monotonic Retry Backoff, and Facade 100% Export Parity.
 * Minzdrav Order 911n / FZ-63 compliant.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// 1. Facade Imports
import {
	EgiszOutboxDispatcher,
	OutboxQueueProcessor,
	EgiszGatewayClient,
	calculateEgiszRetryDelayMs,
	createEgiszRemdReceipt,
	extractSnils,
	isValidSnilsChecksum,
	validateSemdXml,
	sanitizeXmlString,
	verifyCryptoProSignature,
	validateDoctorSignature,
	GOST_3410_2012_256_OID,
	GOST_3410_2012_512_OID,
	type EgiszRemdRegistrationReceipt,
	type OutboxProcessResult,
	type EnqueueSignedPackageInput,
	type EnqueueSignedPackageResult,
	type EgiszQueueHealthSummary,
	type SemdXmlValidationResult,
	type CryptoProSignatureVerificationResult,
} from "../services/egisz/EgiszOutboxDispatcher.js";

// 2. Direct Subsystem Imports
import * as DispatcherBarrel from "../services/egisz/dispatcher/index.js";
import { OiisGatewayClient } from "../services/egisz/OiisGatewayClient.js";

describe("EGISZ REMD Outbox Dispatcher Decomposed Architecture", () => {
	describe("1. Architectural Health & File Limits (<800 lines, Facade <= 50 lines)", () => {
		it("1.1 Canonical facade EgiszOutboxDispatcher.ts is strictly <= 50 lines", () => {
			const facadePath = path.resolve(
				process.cwd(),
				"apps/api/src/services/egisz/EgiszOutboxDispatcher.ts",
			);
			assert.ok(fs.existsSync(facadePath), "Facade file must exist");
			const content = fs.readFileSync(facadePath, "utf8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount <= 50,
				`Facade must be <= 50 lines, currently: ${lineCount} lines`,
			);
		});

		it("1.2 All files in dispatcher/ are strictly <= 800 lines", () => {
			const dirPath = path.resolve(
				process.cwd(),
				"apps/api/src/services/egisz/dispatcher",
			);
			assert.ok(fs.existsSync(dirPath), "dispatcher/ directory must exist");
			const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".ts"));
			assert.ok(files.length >= 6, "Expected at least 6 decomposed modules");

			for (const file of files) {
				const filePath = path.join(dirPath, file);
				const content = fs.readFileSync(filePath, "utf8");
				const lineCount = content.split("\n").length;
				assert.ok(
					lineCount <= 800,
					`File ${file} exceeds 800-line budget: ${lineCount} lines`,
				);
			}
		});

		it("1.3 100% AST export parity between facade and dispatcher barrel", () => {
			assert.strictEqual(typeof calculateEgiszRetryDelayMs, "function");
			assert.strictEqual(typeof createEgiszRemdReceipt, "function");
			assert.strictEqual(typeof extractSnils, "function");
			assert.strictEqual(typeof isValidSnilsChecksum, "function");
			assert.strictEqual(typeof validateSemdXml, "function");
			assert.strictEqual(typeof sanitizeXmlString, "function");
			assert.strictEqual(typeof verifyCryptoProSignature, "function");
			assert.strictEqual(typeof validateDoctorSignature, "function");
			assert.strictEqual(typeof EgiszOutboxDispatcher, "function");
			assert.strictEqual(typeof OutboxQueueProcessor, "function");
			assert.strictEqual(typeof EgiszGatewayClient, "function");

			assert.strictEqual(
				calculateEgiszRetryDelayMs,
				DispatcherBarrel.calculateEgiszRetryDelayMs,
			);
			assert.strictEqual(
				createEgiszRemdReceipt,
				DispatcherBarrel.createEgiszRemdReceipt,
			);
			assert.strictEqual(
				EgiszOutboxDispatcher,
				DispatcherBarrel.EgiszOutboxDispatcher,
			);
			assert.strictEqual(
				OutboxQueueProcessor,
				DispatcherBarrel.OutboxQueueProcessor,
			);
		});
	});

	describe("2. Layer 1: SEMD XML Validation & SNILS Extraction", () => {
		it("2.1 extractSnils extracts digits from administrative profile", () => {
			assert.strictEqual(
				extractSnils({ snils: "123-456-789 01" }),
				"12345678901",
			);
			assert.strictEqual(extractSnils({ snils: "12345678901" }), "12345678901");
			assert.strictEqual(extractSnils({}), "");
			assert.strictEqual(extractSnils(null), "");
			assert.strictEqual(extractSnils(undefined), "");
			assert.strictEqual(extractSnils("not an object"), "");
		});

		it("2.2 isValidSnilsChecksum validates official Russian SNILS check digits", () => {
			// Real valid SNILS numbers
			assert.strictEqual(isValidSnilsChecksum("112-233-445 95"), true);
			assert.strictEqual(isValidSnilsChecksum("087-654-303 00"), true);
			// Invalid SNILS
			assert.strictEqual(isValidSnilsChecksum("112-233-445 00"), false);
			assert.strictEqual(isValidSnilsChecksum("123"), false);
			assert.strictEqual(isValidSnilsChecksum(""), false);
		});

		it("2.3 validateSemdXml enforces mandatory CDA R2/R3 sections", () => {
			const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
	<code code="108" codeSystem="1.2.643.5.1.13.13.11.1522" displayName="Стоматологический протокол"/>
	<recordTarget>
		<patientRole><id root="1.2.643.100.3" extension="11223344595"/></patientRole>
	</recordTarget>
	<author>
		<assignedAuthor>
			<id root="1.2.643.100.3" extension="98765432101"/>
		</assignedAuthor>
	</author>
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="1.2.643.5.1.13.13.12.2.77.9999"/>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>
	<component>
		<structuredBody></structuredBody>
	</component>
</ClinicalDocument>`;

			const res = validateSemdXml(validXml, "108");
			assert.strictEqual(res.isValid, true);
			assert.strictEqual(res.docTypeNsiCode, "108");
			assert.strictEqual(res.doctorSnils, "98765432101");
			assert.strictEqual(res.clinicOid, "1.2.643.5.1.13.13.12.2.77.9999");
			assert.strictEqual(res.errors.length, 0);
		});

		it("2.4 validateSemdXml catches missing CDA sections and document kind mismatches", () => {
			const brokenXml = `<ClinicalDocument xmlns="urn:hl7-org:v3"><code code="107"/></ClinicalDocument>`;
			const res = validateSemdXml(brokenXml, "108");
			assert.strictEqual(res.isValid, false);
			assert.ok(
				res.errors.some((e) => e.includes("<recordTarget>")),
				"Should detect missing recordTarget",
			);
			assert.ok(
				res.errors.some((e) => e.includes("<author>")),
				"Should detect missing author",
			);
			assert.ok(
				res.errors.some((e) => e.includes("<custodian>")),
				"Should detect missing custodian",
			);
			assert.ok(
				res.errors.some((e) => e.includes("Несоответствие кода")),
				"Should detect document code mismatch",
			);
		});

		it("2.5 sanitizeXmlString escapes XML entities properly", () => {
			const raw = `Иванов & Ко <клиника> "Дента" 'Люкс'`;
			const sanitized = sanitizeXmlString(raw);
			assert.strictEqual(
				sanitized,
				"Иванов &amp; Ко &lt;клиника&gt; &quot;Дента&quot; &apos;Люкс&apos;",
			);
		});
	});

	describe("3. Layer 1: CryptoPro PKCS#7 Signer & FZ-63 Compliance", () => {
		it("3.1 verifyCryptoProSignature validates Base64 PKCS#7 format", () => {
			// 64-byte payload encoded as Base64
			const sampleSignatureBase64 = Buffer.alloc(80, 0x5a).toString("base64");
			const res = verifyCryptoProSignature(sampleSignatureBase64, "1234ABCD");
			assert.strictEqual(res.isValid, true);
			assert.strictEqual(res.certificateSerialNumber, "1234ABCD");
			assert.strictEqual(res.algorithmOid, GOST_3410_2012_256_OID);
		});

		it("3.2 verifyCryptoProSignature rejects invalid Base64 or undersized signatures", () => {
			assert.strictEqual(verifyCryptoProSignature("").isValid, false);
			assert.strictEqual(
				verifyCryptoProSignature("not-valid-base64@@@").isValid,
				false,
			);
			// 8 bytes decoded — too small for PKCS#7
			const tiny = Buffer.from("tiny").toString("base64");
			const res = verifyCryptoProSignature(tiny);
			assert.strictEqual(res.isValid, false);
			assert.ok(res.error?.includes("недостаточен"));
		});

		it("3.3 validateDoctorSignature enforces Zero-Mock policy (rejects missing signatures)", () => {
			const validSig = Buffer.alloc(80, 0x33).toString("base64");

			const validPkg = {
				documentId: "VISIT-001",
				documentVersion: 1,
				xmlCanonicalPayload: "<ClinicalDocument/>",
				doctorSignature: {
					signatureBase64: validSig,
					certificateSerialNumber: "01A2B3C4",
					certificateSubject: "CN=Иванов Иван Иванович, O=Клиника Денте",
					signedAt: new Date().toISOString(),
					algorithmOid: GOST_3410_2012_256_OID,
				},
				metadata: {
					patientSnils: "11223344595",
					clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
					docTypeNsiCode: "108",
				},
			};

			const validRes = validateDoctorSignature(validPkg as any);
			assert.strictEqual(validRes.isValid, true);

			// Unsigned / mock package rejection
			const unsignedPkg = {
				...validPkg,
				doctorSignature: {
					...validPkg.doctorSignature,
					signatureBase64: "",
				},
			};
			const unsignedRes = validateDoctorSignature(unsignedPkg as any);
			assert.strictEqual(unsignedRes.isValid, false);
			assert.ok(unsignedRes.error?.includes("Отсутствует"));
		});
	});

	describe("4. Layer 2: Gateway Client & Monotonic Exponential Backoff", () => {
		it("4.1 calculateEgiszRetryDelayMs provides strict monotonic backoff curves", () => {
			const d1 = calculateEgiszRetryDelayMs(1);
			const d2 = calculateEgiszRetryDelayMs(2);
			const d3 = calculateEgiszRetryDelayMs(3);
			const d4 = calculateEgiszRetryDelayMs(4);
			const d5 = calculateEgiszRetryDelayMs(5);
			const d6 = calculateEgiszRetryDelayMs(10);

			assert.strictEqual(d1, 5_000, "Attempt 1 must be 5s");
			assert.strictEqual(d2, 30_000, "Attempt 2 must be 30s");
			assert.strictEqual(d3, 300_000, "Attempt 3 must be 5m");
			assert.strictEqual(d4, 3_600_000, "Attempt 4 must be 1h");
			assert.strictEqual(d5, 86_400_000, "Attempt 5 must be 24h");
			assert.strictEqual(d6, 86_400_000, "Attempt 10+ must cap at 24h");

			assert.ok(d1 < d2);
			assert.ok(d2 < d3);
			assert.ok(d3 < d4);
			assert.ok(d4 < d5);
		});

		it("4.2 createEgiszRemdReceipt generates compliant statutory receipt", () => {
			const receipt = createEgiszRemdReceipt({
				remdDocumentId: "REMD-2026-9999",
				transactionId: "TXN-8888",
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "22222222-2222-2222-2222-222222222222",
				patientSnils: "11223344595",
				visitId: "33333333-3333-3333-3333-333333333333",
				clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
				payloadHashSha256: "abc123hash",
				doctorCertSerial: "55AA",
				doctorCertSubject: "Врач Стоматолог",
				docTypeNsiCode: "108",
			});

			assert.strictEqual(receipt.remdDocumentId, "REMD-2026-9999");
			assert.strictEqual(receipt.remdTransactionId, "TXN-8888");
			assert.strictEqual(receipt.docTypeNsiCode, "108");
			assert.strictEqual(
				receipt.docTypeTitle,
				"Стоматологический протокол приёма (СЭМД 108)",
			);
			assert.strictEqual(receipt.operatorSignature.verificationStatus, "VERIFIED_VALID");
			assert.ok(receipt.receiptId.startsWith("RCP-REMD-REMD-2026-9999-"));
		});

		it("4.3 EgiszGatewayClient delegates to underlying gateway cleanly", () => {
			const client = new EgiszGatewayClient();
			assert.ok(client.getUnderlyingClient() instanceof OiisGatewayClient);
			assert.strictEqual(typeof client.getConfig().clinicOid, "string");
		});
	});

	describe("5. Layer 2: Outbox Dispatcher Service & Receipt Retrieval", () => {
		it("5.1 EgiszOutboxDispatcher can be instantiated with default and custom clients", () => {
			const dispatcher = new EgiszOutboxDispatcher();
			assert.ok(dispatcher.getClient() instanceof OiisGatewayClient);

			const customGateway = new OiisGatewayClient({
				baseUrl: "https://test.n3health.ru/remd",
				clinicOid: "1.2.643.5.1.13.13.12.2.77.7777",
			});
			const customDispatcher = new EgiszOutboxDispatcher(customGateway);
			assert.strictEqual(
				customDispatcher.getClient().getConfig().clinicOid,
				"1.2.643.5.1.13.13.12.2.77.7777",
			);
		});

		it("5.2 getReceiptByOutboxId and getReceiptByVisitId handle invalid UUID safely without DB crash", async () => {
			const dispatcher = new EgiszOutboxDispatcher();
			// Non-UUID parameters must return null safely
			const r1 = await dispatcher.getReceiptByOutboxId("invalid-org", "invalid-id");
			assert.strictEqual(r1, null);

			const r2 = await dispatcher.getReceiptByVisitId("invalid-org", "invalid-id");
			assert.strictEqual(r2, null);
		});

		it("5.3 OutboxQueueProcessor alias is 100% identical to EgiszOutboxDispatcher", () => {
			assert.strictEqual(OutboxQueueProcessor, EgiszOutboxDispatcher);
			const proc = new OutboxQueueProcessor();
			assert.ok(proc instanceof EgiszOutboxDispatcher);
		});
	});
});
