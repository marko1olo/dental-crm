import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildEgiszRemdSubmissionPackage,
	canonicalizeCdaXml,
	type EgiszRemdPackage,
} from "../../services/cda/signature.js";
import {
	OiisGatewayClient,
} from "../../services/egisz/OiisGatewayClient.js";
import {
	appendEgiszAuditLog,
	computeAuditEntryHash,
	computePayloadSha256,
	GENESIS_HASH,
	verifyAuditLogChain,
} from "../../services/egisz/EgiszAuditService.js";

describe("EGISZ REMD Dental SEMD 108 & OIIS Gateway Client Tests", () => {
	const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="1.2.643.5.1.13.13.11.108"/>
  <id root="1.2.643.5.1.13.13.12.2.77.1001" extension="VISIT-2026-001"/>
  <code code="108" codeSystem="1.2.643.5.1.13.13.11.108" displayName="Протокол стоматологической консультации"/>
  <title>Протокол стоматологической консультации</title>
</ClinicalDocument>`;

	it("1.1 Successfully canonicalizes XML removing BOM and normalizing CRLF to LF", () => {
		const dirtyXml = `\uFEFF<?xml version="1.0" encoding="UTF-8"?>\r\n<ClinicalDocument>\r\n  <id extension="123"/>\r\n</ClinicalDocument>   \r\n`;
		const canonical = canonicalizeCdaXml(dirtyXml);

		assert.ok(!canonical.startsWith("\uFEFF"), "BOM must be stripped");
		assert.ok(!canonical.includes("\r"), "Carriage return CRLF must be normalized to LF");
		assert.ok(canonical.startsWith("<?xml"), "XML declaration preserved");
	});

	it("1.2 Builds compliant REMD submission package with double detached CAdES-BES signatures", () => {
		const pkg = buildEgiszRemdSubmissionPackage({
			documentId: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
			documentVersion: 1,
			rawXml: sampleXml,
			doctorSignature: {
				signatureBase64: "MIIBagYJKoZIhvcNAQcCoIIBWzCCAVcCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BAQswggE1Bgk...",
				certificateSerialNumber: "20267701001",
				certificateSubject: "Иванов Иван Иванович (Врач-стоматолог)",
				signedAt: "2026-08-19T10:30:00.000Z",
				algorithmOid: "1.2.643.7.1.1.1.1",
			},
			moSignature: {
				signatureBase64: "MIIBagYJKoZIhvcNAQcCoIIBWzCCAVcCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BAQswggE2Bgk...",
				certificateSerialNumber: "20267709999",
				certificateSubject: "ООО ДЕНТЕ (Медицинская организация)",
				signedAt: "2026-08-19T10:35:00.000Z",
				algorithmOid: "1.2.643.7.1.1.1.1",
			},
			patientSnils: "11223344595",
			clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
			clinicOgrn: "1157746123456",
			docTypeNsiCode: "108",
		});

		assert.equal(pkg.documentId, "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d");
		assert.equal(pkg.documentVersion, 1);
		assert.equal(pkg.metadata.docTypeNsiCode, "108");
		assert.ok(pkg.doctorSignature.signatureBase64);
		assert.ok(pkg.moSignature?.signatureBase64);
	});

	it("1.3 OiisGatewayClient validates patient SNILS checksum and rejects invalid packages", async () => {
		const client = new OiisGatewayClient({ isSandbox: true });

		const invalidPkg = {
			documentId: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
			documentVersion: 1,
			xmlCanonicalPayload: sampleXml,
			doctorSignature: {
				signatureBase64: "MIIBagYJKoZI...",
				certificateSerialNumber: "123",
				certificateSubject: "Врач",
				signedAt: "2026-08-19T10:00:00.000Z",
				algorithmOid: "1.2.643.7.1.1.1.1",
			},
			metadata: {
				patientSnils: "11111111111", // Invalid checksum
				clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
				docTypeNsiCode: "108",
			},
		};

		const res = await client.sendRemdDocument(invalidPkg);
		assert.equal(res.success, false);
		assert.equal(res.status, "Rejected");
		assert.match(res.errorMessage || "", /СНИЛС/i);
	});

	it("1.4 OiisGatewayClient transmits valid package in sandbox/emulated mode", async () => {
		const client = new OiisGatewayClient({ isSandbox: true });

		const validPkg = {
			documentId: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
			documentVersion: 1,
			xmlCanonicalPayload: sampleXml,
			doctorSignature: {
				signatureBase64: "MIIBagYJKoZIhvcNAQcCoIIBWzCCAVcCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BAQswggE1Bgk...",
				certificateSerialNumber: "20267701001",
				certificateSubject: "Иванов И.И.",
				signedAt: "2026-08-19T10:00:00.000Z",
				algorithmOid: "1.2.643.7.1.1.1.1",
			},
			metadata: {
				patientSnils: "11223344595", // Valid checksum (sum=95)
				clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
				docTypeNsiCode: "108",
			},
		};

		const res = await client.sendRemdDocument(validPkg);
		assert.equal(res.success, true);
		assert.equal(res.status, "Sent");
		assert.ok(res.transactionId);
		assert.ok(res.remdDocumentId);
	});

	it("1.5 OiisGatewayClient queries document registration status", async () => {
		const client = new OiisGatewayClient({ isSandbox: true });
		const statusRes = await client.getRemdDocumentStatus("REMD-12345678");

		assert.equal(statusRes.status, "Registered");
		assert.ok(statusRes.remdDocumentId);
		assert.match(statusRes.statusDescription || "", /зарегистрирован/i);
	});

	it("1.6 Cryptographic hash-chaining verification validates intact ledger", () => {
		const rows = [
			{
				id: "log-1",
				organizationId: "org-1",
				sequenceNumber: 1,
				previousHash: GENESIS_HASH,
				currentHash: "",
				eventType: "REMD_SEMD_DISPATCHED",
				entityType: "egisz_log",
				entityId: "item-1",
				payloadJson: { docId: "123" },
				payloadSha256: "",
				createdAt: "2026-08-19T12:00:00.000Z",
			},
		];

		const firstRow = rows[0];
		assert.ok(firstRow);
		const payloadHash = computePayloadSha256(firstRow.payloadJson);
		firstRow.payloadSha256 = payloadHash;
		firstRow.currentHash = computeAuditEntryHash({
			previousHash: GENESIS_HASH,
			sequenceNumber: 1,
			organizationId: "org-1",
			eventType: "REMD_SEMD_DISPATCHED",
			entityType: "egisz_log",
			entityId: "item-1",
			payloadSha256: payloadHash,
			timestampIso: "2026-08-19T12:00:00.000Z",
		});

		const verification = verifyAuditLogChain(rows);
		assert.equal(verification.valid, true);
		assert.equal(verification.count, 1);
	});

	it("1.7 OiisGatewayClient handles SEMD 101, 104, 130 and foreign citizen documents without SNILS", async () => {
		const client = new OiisGatewayClient({ isSandbox: true });

		for (const docType of ["101", "104", "130"]) {
			const pkg = {
				documentId: `DOC-${docType}-TEST-001`,
				documentVersion: 1,
				xmlCanonicalPayload: `<ClinicalDocument xmlns="urn:hl7-org:v3"><code code="${docType}"/></ClinicalDocument>`,
				doctorSignature: {
					signatureBase64: "MIIBagYJKoZIhvcNAQcCoIIBWzCCAVcCAQExDzAN...",
					certificateSerialNumber: "20267701001",
					certificateSubject: "Лечащий врач",
					signedAt: new Date().toISOString(),
					algorithmOid: "1.2.643.7.1.1.1.1",
				},
				metadata: {
					patientSnils: undefined, // Foreign citizen without SNILS
					clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
					docTypeNsiCode: docType,
				},
			};

			const res = await client.sendRemdDocument(pkg as unknown as EgiszRemdPackage);
			assert.equal(res.success, true, `SEMD ${docType} should be accepted`);
			assert.equal(res.status, "Sent");
			assert.ok(res.transactionId);
		}
	});

	it("1.8 calculateEgiszRetryDelayMs implements exponential backoff delays", async () => {
		const { calculateEgiszRetryDelayMs } = await import("../../services/egisz/EgiszOutboxDispatcher.js");

		assert.equal(calculateEgiszRetryDelayMs(1), 5_000); // 5s
		assert.equal(calculateEgiszRetryDelayMs(2), 30_000); // 30s
		assert.equal(calculateEgiszRetryDelayMs(3), 300_000); // 5m
		assert.equal(calculateEgiszRetryDelayMs(4), 3_600_000); // 1h
		assert.equal(calculateEgiszRetryDelayMs(5), 86_400_000); // 24h
	});
});

