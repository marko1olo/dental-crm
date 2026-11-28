/**
 * Comprehensive Test Suite for Decomposed EGISZ REMD Outbox Dispatcher Subsystem (6G Live SUT).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

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
} from "../services/egisz/EgiszOutboxDispatcher.js";

import * as DispatcherBarrel from "../services/egisz/dispatcher/index.js";
import { OiisGatewayClient } from "../services/egisz/OiisGatewayClient.js";
import { buildDeterministicGostCmsTestContainer } from "@dental/shared";

describe("EGISZ REMD Outbox Dispatcher Decomposed Architecture (6G Live SUT)", () => {
	describe("1. Facade & Dispatcher Barrel Behavioral Parity", () => {
		it("1.1 Facade and barrel export identical functioning utilities & service constructors", () => {
			assert.strictEqual(
				calculateEgiszRetryDelayMs(2),
				DispatcherBarrel.calculateEgiszRetryDelayMs(2),
			);
			assert.strictEqual(
				extractSnils({ snils: "123-456-789 01" }),
				DispatcherBarrel.extractSnils({ snils: "123-456-789 01" }),
			);
			assert.strictEqual(
				isValidSnilsChecksum("112-233-445 95"),
				DispatcherBarrel.isValidSnilsChecksum("112-233-445 95"),
			);
			assert.strictEqual(
				sanitizeXmlString("A & B"),
				DispatcherBarrel.sanitizeXmlString("A & B"),
			);
			assert.strictEqual(EgiszOutboxDispatcher, DispatcherBarrel.EgiszOutboxDispatcher);
			assert.strictEqual(OutboxQueueProcessor, DispatcherBarrel.OutboxQueueProcessor);
			assert.strictEqual(EgiszGatewayClient, DispatcherBarrel.EgiszGatewayClient);
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
			assert.strictEqual(isValidSnilsChecksum("112-233-445 95"), true);
			assert.strictEqual(isValidSnilsChecksum("087-654-303 00"), true);
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
			const sampleContainer = buildDeterministicGostCmsTestContainer({
				documentHashSha256Hex: Buffer.alloc(32, 0x11).toString("hex"),
				certificateSerialNumber: "1234ABCD",
				doctorFullName: "Иванов Иван Иванович",
				validFromIso: "2024-01-01T00:00:00.000Z",
				validToIso: "2030-01-01T23:59:59.000Z",
			});
			const sampleSignatureBase64 = sampleContainer.toString("base64");
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
			const tiny = Buffer.from("tiny").toString("base64");
			const res = verifyCryptoProSignature(tiny);
			assert.strictEqual(res.isValid, false);
			assert.ok(res.error?.includes("недостаточен"));
		});

		it("3.3 validateDoctorSignature enforces Zero-Mock policy (rejects missing signatures)", () => {
			const validSig = buildDeterministicGostCmsTestContainer({
				documentHashSha256Hex: Buffer.alloc(32, 0x22).toString("hex"),
				certificateSerialNumber: "01A2B3C4",
				doctorFullName: "Иванов Иван Иванович",
				validFromIso: "2024-01-01T00:00:00.000Z",
				validToIso: "2030-01-01T23:59:59.000Z",
			}).toString("base64");

			const validPkg: Parameters<typeof validateDoctorSignature>[0] = {
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

			const validRes = validateDoctorSignature(validPkg);
			assert.strictEqual(validRes.isValid, true);

			const unsignedPkg: Parameters<typeof validateDoctorSignature>[0] = {
				...validPkg,
				doctorSignature: {
					...validPkg.doctorSignature,
					signatureBase64: "",
				},
			};
			const unsignedRes = validateDoctorSignature(unsignedPkg);
			assert.strictEqual(unsignedRes.isValid, false);
			assert.ok(unsignedRes.error?.includes("Отсутствует"));
		});

		it("3.4 verifyCryptoProSignature strictly rejects buffers without ASN.1 SEQUENCE (0x30)", () => {
			const nonDerSignatureBase64 = Buffer.alloc(80, 0x5a).toString("base64");
			const res = verifyCryptoProSignature(nonDerSignatureBase64, "1234ABCD");
			assert.strictEqual(res.isValid, false);
			assert.ok(res.error?.includes("0x30"));
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
			const pendingReceipt = createEgiszRemdReceipt({
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

			assert.strictEqual(pendingReceipt.remdDocumentId, "REMD-2026-9999");
			assert.strictEqual(pendingReceipt.remdTransactionId, "TXN-8888");
			assert.strictEqual(pendingReceipt.docTypeNsiCode, "108");
			assert.strictEqual(
				pendingReceipt.docTypeTitle,
				"Стоматологический протокол приёма (СЭМД 108)",
			);
			assert.strictEqual(pendingReceipt.operatorSignature.verificationStatus, "pending_gateway");
			assert.strictEqual(pendingReceipt.receiptId, null);

			const verifiedReceipt = createEgiszRemdReceipt({
				receiptId: "RCP-REMD-REMD-2026-9999-123456",
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
			assert.strictEqual(verifiedReceipt.operatorSignature.verificationStatus, "VERIFIED_VALID");
			assert.ok(verifiedReceipt.receiptId?.startsWith("RCP-REMD-REMD-2026-9999-"));
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
