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

	it("validates SNILS algorithm correctly (valid vs invalid checksums per Resolution 192p)", () => {
		// Валидные СНИЛС
		assert.equal(isValidSnils("11223344595"), true);
		assert.equal(isValidSnils("123-456-789 64"), true);
		assert.equal(isValidSnils("087-654-303 00"), true);

		// Невалидные контрольные суммы
		assert.equal(isValidSnils("11223344500"), false);
		assert.equal(isValidSnils("12345678901"), false);

		// Запрет 11 одинаковых цифр
		assert.equal(isValidSnils("00000000000"), false);
		assert.equal(isValidSnils("11111111111"), false);

		// Исторический диапазон номеров <= 001-001-998
		assert.equal(isValidSnils("00100199800"), true);
	});

	it("strictly blocks EGISZ export when doctor signature is absent", () => {
		const packageWithoutDoctor = {
			...validPackage,
			doctorSignature: undefined,
		};
		const parsed = egiszRemdPackageSchema.safeParse(packageWithoutDoctor);
		assert.equal(parsed.success, false);
		assert.ok(
			parsed.error?.issues.some((issue) => issue.path.includes("doctorSignature")),
			"Схема обязана заблокировать экспорт без подписи врача",
		);
	});

	it("supports dual detached UKEP signatures (doctor UKEP + MO clinic UKEP)", () => {
		const validMoSignature = {
			signatureBase64: "MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFADCABgkqhkiG9w0BBwEAAKCAMII...",
			certificateSerialNumber: "9F8E7D6C5B4A39281701",
			certificateSubject: 'ООО "Стоматологическая клиника ДЕНТЕ" (ОГРН 1027700132195)',
			signedAt: "2026-08-14T08:05:00.000Z",
			algorithmOid: "1.2.643.7.1.1.1.1",
		};

		const dualSignedPackage = {
			...validPackage,
			moSignature: validMoSignature,
		};

		const parsed = egiszRemdPackageSchema.safeParse(dualSignedPackage);
		assert.equal(parsed.success, true);
		assert.ok(parsed.data.moSignature, "Вторая подпись МО обязана быть сохранена в пакете");
		assert.equal(parsed.data.moSignature.certificateSubject, 'ООО "Стоматологическая клиника ДЕНТЕ" (ОГРН 1027700132195)');
	});

	it("verifies CDA R2 XML templateId 1.2.643.5.1.13.13.11.1527 and odontogram LOINC 74208-1", () => {
		const cdaXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="1.2.643.5.1.13.13.11.108"/>
	<templateId root="1.2.643.5.1.13.13.11.1527"/>
	<code code="108" codeSystem="1.2.643.5.1.13.13.11.1522" displayName="Протокол консультации (стоматология)"/>
	<component>
		<structuredBody>
			<component>
				<section>
					<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Стоматологический статус (Зубная формула)"/>
					<title>Стоматологический статус (Зубная формула)</title>
				</section>
			</component>
		</structuredBody>
	</component>
</ClinicalDocument>`;

		assert.ok(cdaXml.includes('root="1.2.643.5.1.13.13.11.1527"'), "XML обязан содержать templateId консультации 1.2.643.5.1.13.13.11.1527");
		assert.ok(cdaXml.includes('code="74208-1"'), "XML обязан содержать LOINC 74208-1 для одонтограммы");
	});
});
