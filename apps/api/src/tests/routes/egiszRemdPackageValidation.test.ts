import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canonicalizeCdaXml,
	detachedSignatureSchema,
	egiszRemdPackageSchema,
} from "../../services/cda/index.js";
import { isValidSnils } from "../../utils/snils.js";

describe("EGISZ REMD Package & Detached UKEP Signature Validation", () => {
	const validDoctorSignature = {
		signatureBase64: "MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFADCABgkqhkiG9w0BBwEAAKCAMII...",
		certificateSerialNumber: "4A8B9C0D1E2F3A4B5C6D7E8F",
		certificateSubject: "Иванов Иван Иванович (Врач-стоматолог)",
		signedAt: "2026-08-14T08:00:00.000Z",
		algorithmOid: "1.2.643.7.1.1.1.1",
	};

	const validPackage = {
		documentId: "11111111-1111-1111-1111-111111111111",
		documentVersion: 1,
		xmlCanonicalPayload: "<?xml version=\"1.0\" encoding=\"UTF-8\"?><ClinicalDocument></ClinicalDocument>",
		doctorSignature: validDoctorSignature,
		metadata: {
			patientSnils: "11223344595",
			clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
			clinicOgrn: "1027700132195",
			docTypeNsiCode: "75",
		},
	};

	it("canonicalizes XML payload to UTF-8 LF and trimmed boundaries", () => {
		const raw = "  <?xml version=\"1.0\"?>\r\n<root>\r\n  <elem>Text</elem>\r\n</root>\r\n  ";
		const canon = canonicalizeCdaXml(raw);

		assert.ok(!canon.includes("\r"));
		assert.equal(canon.startsWith("<?xml"), true);
		assert.equal(canon.endsWith("</root>"), true);
	});

	it("validates compliant GOST detached UKEP signature structures", () => {
		const parsed = detachedSignatureSchema.safeParse(validDoctorSignature);
		assert.equal(parsed.success, true);
	});

	it("rejects signatures missing base64 payload or certificate subject", () => {
		const invalid = {
			...validDoctorSignature,
			signatureBase64: "",
		};
		const parsed = detachedSignatureSchema.safeParse(invalid);
		assert.equal(parsed.success, false);
	});

	it("validates complete REMD package with patient SNILS and clinic OID", () => {
		const parsed = egiszRemdPackageSchema.safeParse(validPackage);
		assert.equal(parsed.success, true);
	});

	it("rejects REMD package with malformed documentId UUID", () => {
		const invalid = {
			...validPackage,
			documentId: "not-a-valid-uuid",
		};
		const parsed = egiszRemdPackageSchema.safeParse(invalid);
		assert.equal(parsed.success, false);
	});

	it("validates SNILS algorithm correctly (valid vs invalid checksums)", () => {
		assert.equal(isValidSnils("11223344595"), true);
		assert.equal(isValidSnils("00000000000"), false);
		assert.equal(isValidSnils("12345678901"), false);
	});
});
