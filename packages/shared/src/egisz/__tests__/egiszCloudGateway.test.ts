/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ CLOUD GATEWAY ENGINE COMPREHENSIVE UNIT TEST SUITE
 * (N3.HEALTH / MEDELEMENT / СТ. 9 63-ФЗ / МАНДАТЫ 8d, 8e, 8n)
 *
 * 100% Statutory and Technical Verification:
 * 1. N3.Health REST package generation (Base64 XML, Headers, SNILS digits, OID).
 * 2. MedElement REST package generation (Partner ID, OID, specialist, raw XML).
 * 3. Solo doctor autonomy (local_autonomous per Art. 9 63-FZ) with 0-delay registration.
 * 4. Cloud operator validation errors classification and friendly doctor remediations.
 * 5. Form 043/u A4 audit protocol verification with 0 emojis (Mandate 8d p. 7).
 * 6. Async dispatcher with real fetch simulation, error resilience and timeout handling.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildN3HealthRequestPackage,
	buildMedElementRequestPackage,
	evaluateOperatorValidationErrors,
	dispatchCloudSemdSubmission,
	dispatchCloudSemdSubmissionAsync,
	formatCloudGatewayAuditForm043A4Protocol,
	CLOUD_OPERATOR_LABELS_RU,
	DEFAULT_OPERATOR_ENDPOINTS,
	type CloudOperatorConfig,
	type CloudSemdSubmissionPayload,
	type CloudGatewaySubmissionResult,
} from "../egiszCloudGatewayEngine.js";

const TEST_CLINIC_CONFIG_N3: CloudOperatorConfig = {
	provider: "n3_health",
	endpointUrl: DEFAULT_OPERATOR_ENDPOINTS.n3_health,
	clinicOid: "1.2.643.5.1.13.13.12.2.77.10425",
	clinicOgrn: "1157746123457",
	apiKey: "N3_API_KEY_SECURE_TOKEN_2026",
	secretToken: "mock-secret-token", // gitleaks:allow
	senderName: 'ООО "Стоматология ДЕНТЕ Эксперт"',
	timeoutMs: 12000,
	maxRetryAttempts: 3,
	enableAutoRegistrationPolling: true,
};

const TEST_CLINIC_CONFIG_MEDELEMENT: CloudOperatorConfig = {
	provider: "medelement",
	endpointUrl: DEFAULT_OPERATOR_ENDPOINTS.medelement,
	clinicOid: "1.2.643.5.1.13.13.12.2.77.10425",
	clinicOgrn: "1157746123457",
	apiKey: "MEDELEMENT_PARTNER_DENTE_77",
	senderName: 'ООО "Стоматология ДЕНТЕ Эксперт"',
	timeoutMs: 15000,
	maxRetryAttempts: 3,
	enableAutoRegistrationPolling: true,
};

const TEST_CLINIC_CONFIG_SOLO: CloudOperatorConfig = {
	provider: "local_autonomous",
	endpointUrl: DEFAULT_OPERATOR_ENDPOINTS.local_autonomous,
	clinicOid: "1.2.643.5.1.13.13.12.2.77.10425",
	clinicOgrn: "1157746123457",
	senderName: "ИП Барабаш С.В. (Стоматологический кабинет)",
	timeoutMs: 5000,
	maxRetryAttempts: 1,
	enableAutoRegistrationPolling: false,
};

const REALISTIC_CDA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <realmCode code="RU"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="1.2.643.5.1.13.13.14.108.1"/>
  <id root="1.2.643.5.1.13.13.12.2.77.10425.100.1.1" extension="VISIT-043U-2026-9901"/>
  <code code="108" codeSystem="1.2.643.5.1.13.13.11.1520" displayName="Протокол первичного осмотра врача-стоматолога (Форма 043/у)"/>
  <title>Медицинская карта стоматологического пациента № 10042</title>
  <effectiveTime value="20260912103000+0300"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <recordTarget>
    <patientRole>
      <id root="1.2.643.100.3" extension="11223344595"/>
      <patient>
        <name><family>Смирнова</family><given>Елена</given><identity>Александровна</identity></name>
        <administrativeGenderCode code="2" codeSystem="1.2.643.5.1.13.13.11.1040"/>
        <birthTime value="19850412"/>
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <time value="20260912103000+0300"/>
    <assignedAuthor>
      <id root="1.2.643.100.3" extension="12345678964"/>
      <assignedPerson>
        <name><family>Барабаш</family><given>Сергей</given><identity>Владимирович</identity></name>
      </assignedPerson>
    </assignedAuthor>
  </author>
</ClinicalDocument>`;

const TEST_SEMD_PAYLOAD: CloudSemdSubmissionPayload = {
	documentId: "DOC-043U-2026-7788",
	documentVersion: 1,
	docTypeNsiCode: "108",
	docTypeName: "Протокол стоматологического осмотра (Форма 043/у)",
	patientSnils: "112-233-445 95",
	patientFullName: "Смирнова Елена Александровна",
	patientBirthDate: "1985-04-12",
	doctorSnils: "123-456-789 64",
	doctorFullName: "Барабаш Сергей Владимирович",
	doctorPositionNsiCode: "204",
	cdaXmlContent: REALISTIC_CDA_XML,
	isDraft: false,
	clinicalNotes: "Санация полости рта. Диагноз: К02.1 Кариес дентина зуба 1.6.",
	createdAt: "2026-09-12T10:30:00.000Z",
};

describe("EGISZ Cloud Operator Gateway Engine", () => {
	// ─── 1. N3.Health REST Package Builder ─────────────────────────────────────
	it("should correctly build statutory N3.Health REST request package", () => {
		const pkg = buildN3HealthRequestPackage(TEST_CLINIC_CONFIG_N3, TEST_SEMD_PAYLOAD);

		// Headers
		assert.equal(pkg.Header.Sender, 'ООО "Стоматология ДЕНТЕ Эксперт"');
		assert.equal(pkg.Header.ClinicOid, "1.2.643.5.1.13.13.12.2.77.10425");
		assert.equal(pkg.Header.ClinicOgrn, "1157746123457");
		assert.equal(pkg.Header.DocTypeNsiCode, "108");
		assert.ok(pkg.Header.RequestTimestamp);

		// Patient (Normalized SNILS without dashes or spaces)
		assert.equal(pkg.Patient.Snils, "11223344595");
		assert.equal(pkg.Patient.FullName, "Смирнова Елена Александровна");
		assert.equal(pkg.Patient.BirthDate, "1985-04-12");

		// Doctor (Normalized SNILS)
		assert.equal(pkg.Doctor.Snils, "12345678964");
		assert.equal(pkg.Doctor.FullName, "Барабаш Сергей Владимирович");
		assert.equal(pkg.Doctor.PositionCode, "204");

		// Document and Base64 Payload
		assert.equal(pkg.Document.Id, "DOC-043U-2026-7788");
		assert.equal(pkg.Document.Version, 1);
		assert.equal(pkg.Document.MimeType, "text/xml");
		assert.equal(pkg.Document.Encoding, "UTF-8");

		// Verify Base64 content roundtrip
		const decodedXml = Buffer.from(pkg.Document.Base64Content, "base64").toString("utf8");
		assert.equal(decodedXml, REALISTIC_CDA_XML);
		assert.ok(decodedXml.includes("<realmCode code=\"RU\"/>"));
		assert.ok(decodedXml.includes("Смирнова"));
	});

	// ─── 2. MedElement REST Package Builder ────────────────────────────────────
	it("should correctly build statutory MedElement REST request package", () => {
		const pkg = buildMedElementRequestPackage(TEST_CLINIC_CONFIG_MEDELEMENT, TEST_SEMD_PAYLOAD);

		assert.equal(pkg.partner_id, "MEDELEMENT_PARTNER_DENTE_77");
		assert.equal(pkg.clinic_oid, "1.2.643.5.1.13.13.12.2.77.10425");
		assert.equal(pkg.document_type, "108");

		// Patient
		assert.equal(pkg.patient.snils, "11223344595");
		assert.equal(pkg.patient.name, "Смирнова Елена Александровна");
		assert.equal(pkg.patient.birth_date, "1985-04-12");

		// Doctor
		assert.equal(pkg.specialist.snils, "12345678964");
		assert.equal(pkg.specialist.fio, "Барабаш Сергей Владимирович");

		// Raw XML content
		assert.equal(pkg.data_xml, REALISTIC_CDA_XML);
		assert.ok(pkg.submitted_at);
	});

	// ─── 3. Solo Doctor Autonomy (63-FZ Art. 9 / Mandate 8e/8n) ─────────────────
	it("should guarantee instant zero-blockage local autonomy registration for solo doctor", () => {
		const result: CloudGatewaySubmissionResult = dispatchCloudSemdSubmission(
			TEST_CLINIC_CONFIG_SOLO,
			TEST_SEMD_PAYLOAD,
		);

		assert.equal(result.success, true);
		assert.equal(result.provider, "local_autonomous");
		assert.equal(result.status, "SAVED_LOCAL_AUTONOMOUS");
		assert.equal(result.httpStatusCode, 200);
		assert.ok(result.remdRegistrationNumber?.startsWith("LOCAL-EMK-"));
		assert.equal(result.errors.length, 0);
		assert.equal(result.retryCount, 0);
		assert.ok(result.statutoryDisclaimerRu.includes("ст. 9"));
		assert.ok(result.statutoryDisclaimerRu.includes("63-ФЗ"));
		assert.ok(result.statutoryDisclaimerRu.includes("автономии соло-врача"));
	});

	// ─── 4. Operator Validation Error Diagnostics ──────────────────────────────
	it("should evaluate and classify operator validation errors into clear clinical remediations", () => {
		const rawOperatorErrors = [
			"Ошибка ФРМР: СНИЛС 123-456-789 64 не найден в реестре медицинских работников",
			"Сертификат УКЭП отозван или не прошел валидацию цепочки доверия",
			"Нарушение XSD-схемы клинического документа в теге ClinicalDocument",
			"Код услуги по Номенклатуре 804н отсутствует в справочнике НСИ",
			"OID клиники не зарегистрирован в реестре ФРМО ЕГИСЗ",
			"Несоответствие контрольной суммы хэша C14N XML подписи CAdES-BES",
			"Дубликат документа: СЭМД с данным ID уже зарегистрирован в РЭМД",
			"Нестандартное техническое замечание облачного шлюза оператора",
		];

		const diagnostics = evaluateOperatorValidationErrors(rawOperatorErrors);
		assert.equal(diagnostics.length, 8);

		// 1: FRMR doctor
		assert.equal(diagnostics[0]?.code, "REMD_ERR_001");
		assert.equal(diagnostics[0]?.category, "FRMR_DOCTOR");
		assert.equal(diagnostics[0]?.affectedEntity, "DOCTOR");
		assert.ok(diagnostics[0]?.remediation.includes("ФРМР"));

		// 2: Certificate
		assert.equal(diagnostics[1]?.code, "REMD_ERR_002");
		assert.equal(diagnostics[1]?.category, "CERTIFICATE");

		// 3: XSD Schema
		assert.equal(diagnostics[2]?.code, "REMD_ERR_003");
		assert.equal(diagnostics[2]?.category, "XSD_SCHEMA");

		// 4: Nomenclature 804n
		assert.equal(diagnostics[3]?.code, "REMD_ERR_004");
		assert.equal(diagnostics[3]?.category, "OID_CLASSIFIER");

		// 5: FRMO Clinic
		assert.equal(diagnostics[4]?.code, "REMD_ERR_005");
		assert.equal(diagnostics[4]?.category, "FRMO_CLINIC");

		// 6: Checksum
		assert.equal(diagnostics[5]?.code, "REMD_ERR_006");
		assert.equal(diagnostics[5]?.category, "CHECKSUM_SIGNATURE");

		// 7: Duplicate
		assert.equal(diagnostics[6]?.code, "REMD_ERR_007");
		assert.equal(diagnostics[6]?.category, "DUPLICATE");

		// 8: General
		assert.equal(diagnostics[7]?.code, "OPERATOR_GENERAL_ERR");
		assert.equal(diagnostics[7]?.isRetryable, true);
	});

	// ─── 5. Error Dispatch Handling ────────────────────────────────────────────
	it("should handle operator validation failure gracefully without blocking doctor", () => {
		const result = dispatchCloudSemdSubmission(
			TEST_CLINIC_CONFIG_N3,
			TEST_SEMD_PAYLOAD,
			{
				forcedStatusCode: 422,
				forcedErrors: ["СНИЛС врача не подтвержден в реестре ФРМР"],
			},
		);

		assert.equal(result.success, false);
		assert.equal(result.status, "REJECTED_VALIDATION");
		assert.equal(result.httpStatusCode, 422);
		assert.equal(result.remdRegistrationNumber, null);
		assert.equal(result.errors.length, 1);
		assert.equal(result.errors[0]?.code, "REMD_ERR_001");
		assert.ok(result.statutoryDisclaimerRu.includes("Мандат 8e"));
	});

	// ─── 6. Statutory Form 043/u A4 Protocol (Strictly 0 Emojis, Mandate 8d p. 7) ───
	it("should generate statutory Form 043/u A4 audit protocol strictly without emojis", () => {
		const successResult: CloudGatewaySubmissionResult = {
			success: true,
			transmissionId: "TX-N3_HEALTH-1726135000",
			documentId: TEST_SEMD_PAYLOAD.documentId,
			provider: "n3_health",
			status: "REGISTERED_SUCCESS",
			httpStatusCode: 200,
			remdRegistrationNumber: "REMD-2026-1042-882319",
			registeredAt: "2026-09-12T10:35:00.000Z",
			errors: [],
			retryCount: 0,
			statutoryDisclaimerRu: "СЭМД успешно зарегистрирован в РЭМД ЕГИСЗ.",
		};

		const protocol = formatCloudGatewayAuditForm043A4Protocol(
			successResult,
			TEST_SEMD_PAYLOAD,
			'ООО "Стоматология ДЕНТЕ Эксперт"',
		);

		// Core statutory data presence
		assert.ok(protocol.includes('ООО "Стоматология ДЕНТЕ Эксперт"'));
		assert.ok(protocol.includes("DOC-043U-2026-7788"));
		assert.ok(protocol.includes("REMD-2026-1042-882319"));
		assert.ok(protocol.includes("Смирнова Елена Александровна"));
		assert.ok(protocol.includes("112-233-445 95"));
		assert.ok(protocol.includes("Барабаш Сергей Владимирович"));
		assert.ok(protocol.includes("123-456-789 64"));
		assert.ok(protocol.includes("ЗАРЕГИСТРИРОВАНО В ФРЭМД ЕГИСЗ МИНЗДРАВА РФ"));

		// Mandate 8d clause 7: Absolutely zero emojis in official documents and protocols
		const emojiRegex = /\p{Extended_Pictographic}/u;
		assert.equal(
			emojiRegex.test(protocol),
			false,
			"Form 043/u A4 protocol must not contain cartoon emojis per Mandate 8d p. 7",
		);
	});

	// ─── 7. Async Cloud Dispatcher with Fetch Simulation ────────────────────────
	it("should asynchronously submit to cloud operator and parse response", async () => {
		const mockFetch: typeof fetch = async (url, init) => {
			assert.equal(url, DEFAULT_OPERATOR_ENDPOINTS.n3_health);
			assert.equal(init?.method, "POST");

			const headers = init?.headers as Record<string, string>;
			assert.ok(headers.Authorization?.includes("N3_API_KEY_SECURE_TOKEN_2026"));

			return {
				ok: true,
				status: 200,
				json: async () => ({
					registrationNumber: "REMD-2026-N3-999444",
					trackingId: "N3-TRK-771122",
					status: "REGISTERED",
				}),
				text: async () => "",
			} as unknown as Response;
		};

		const result = await dispatchCloudSemdSubmissionAsync(
			TEST_CLINIC_CONFIG_N3,
			TEST_SEMD_PAYLOAD,
			mockFetch,
		);

		assert.equal(result.success, true);
		assert.equal(result.status, "REGISTERED_SUCCESS");
		assert.equal(result.remdRegistrationNumber, "REMD-2026-N3-999444");
		assert.equal(result.rawOperatorTrackingId, "N3-TRK-771122");
	});

	it("should handle network timeouts in async dispatcher without crashing or blocking doctor", async () => {
		const timeoutFetch: typeof fetch = async () => {
			throw new Error("ETIMEDOUT: Connection timed out to api.n3health.ru");
		};

		const result = await dispatchCloudSemdSubmissionAsync(
			TEST_CLINIC_CONFIG_N3,
			TEST_SEMD_PAYLOAD,
			timeoutFetch,
		);

		assert.equal(result.success, false);
		assert.equal(result.status, "OPERATOR_TIMEOUT");
		assert.equal(result.httpStatusCode, 504);
		assert.equal(result.errors.length, 1);
		assert.equal(result.errors[0]?.code, "OPERATOR_NETWORK_TIMEOUT");
		assert.equal(result.errors[0]?.isRetryable, true);
		assert.ok(result.statutoryDisclaimerRu.includes("Мандат 8e"));
	});
});
