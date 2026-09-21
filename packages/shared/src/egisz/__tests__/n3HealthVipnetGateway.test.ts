/**
 * ═══════════════════════════════════════════════════════════════════════════
 * N3.HEALTH VIPNET EGISZ INTEGRATION GATEWAY UNIT TEST SUITE
 * (ИЭМК + PIX + NSI FHIR + EVENTLOG)
 *
 * 100% Verification of statutory communication structures:
 * 1. Zod configuration validation & EventLog auth header normalization.
 * 2. EMKService SOAP 1.1/1.2 XML generation (AddDocument, SendDocument, CloseCase).
 * 3. PixService SOAP XML generation (AddPatient, UpdatePatient, FindPatients).
 * 4. SOAP response & SOAP Fault XML parser.
 * 5. EventLog REST client methods (document status, reexport queue, queue stats).
 * 6. NSI FHIR client methods (CodeSystem, ValueSet $expand).
 * 7. Unified N3HealthVipnetGateway facade execution.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildEmkAddDocumentSoapXml,
	buildEmkCloseCaseSoapXml,
	buildEmkSendDocumentSoapXml,
	buildPixAddPatientSoapXml,
	buildPixFindPatientsSoapXml,
	buildPixUpdatePatientSoapXml,
	formatEventLogAuthHeader,
	n3HealthVipnetConfigSchema,
	parseN3SoapResponse,
	N3EventLogClient,
	N3FhirTerminologyClient,
	N3HealthVipnetGateway,
	type EmkAddDocumentPayload,
	type EmkCloseCasePayload,
	type EmkSendDocumentPayload,
	type N3HealthVipnetConfig,
	type PixFindPatientsCriteria,
	type PixPatientPayload,
} from "../n3HealthVipnetGateway.js";

// ─── Фикстурные тестовые данные (Синтетические, без утечек боевых секретов) ───

const TEST_CONFIG: N3HealthVipnetConfig = {
	authGuid: "11111111-2222-3333-4444-555555555555",
	idLpu: "22222222-3333-4444-5555-666666666666",
	clinicOid: "1.2.643.5.1.13.13.12.2.77.99999",
	emkServiceUrl: "http://b2b.n3health.ru/emk/EMKService.svc",
	pixServiceUrl: "http://b2b.n3health.ru/emk/PixService.svc",
	nsiFhirUrl: "http://b2b.n3health.ru/nsi/fhir/term/",
	eventLogApiUrl: "https://api.n3health.ru/eventlog/",
	eventLogToken: "N3 fixture-test-token-47276d92", // gitleaks:allow
	isVipnetChannelActive: true,
	timeoutMs: 10000,
};

const SAMPLE_CDA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
  <id root="1.2.643.5.1.13.13.12.2.77.99999" extension="VISIT-043-1001"/>
  <code code="108" displayName="Протокол стоматологического осмотра"/>
  <title>Медицинская карта стоматологического пациента</title>
</ClinicalDocument>`;

const SAMPLE_EMK_PAYLOAD: EmkAddDocumentPayload = {
	idDocumentMis: "DOC-DENT-001",
	idCaseMis: "CASE-VISIT-2026-09",
	documentType: "108",
	documentName: "Протокол стоматологического осмотра (Форма 043/у)",
	documentDate: "2026-09-21T10:00:00+03:00",
	cdaXmlContent: SAMPLE_CDA_XML,
	patient: {
		idPatientMis: "PATIENT-7788",
		snils: "112-233-445 95",
		familyName: "Смирнова",
		givenName: "Елена",
		middleName: "Александровна",
		birthDate: "1985-04-12",
		gender: "2",
	},
	doctor: {
		snils: "123-456-789 64",
		familyName: "Барабаш",
		givenName: "Сергей",
		middleName: "Владимирович",
		positionCode: "204",
		specialtyCode: "18",
	},
	signatures: [
		{
			signatureType: "Doctor",
			signatureBase64: "TUlJR3p3WUlLb1pJemowRUF3SUdnZ0d2TUlJR0NnSUI=",
			signerSnils: "123-456-789 64",
		},
	],
};

const SAMPLE_PIX_PAYLOAD: PixPatientPayload = {
	idPatientMis: "PATIENT-7788",
	familyName: "Смирнова",
	givenName: "Елена",
	middleName: "Александровна",
	birthDate: "1985-04-12",
	gender: "2",
	snils: "112-233-445 95",
	omsPolicy: {
		number: "7700000000000001",
		type: "1",
		issuer: "МАКС-М",
	},
	document: {
		docType: "14",
		series: "4515",
		number: "123456",
		issueDate: "2015-05-20",
		issuer: "ОВД Раменки г. Москвы",
	},
	phone: "+79991234567",
};

describe("N3.Health ViPNet EGISZ Integration Gateway", () => {
	// ─── 1. Валидация конфигурации и заголовков ──────────────────────────────
	it("should parse valid N3.Health ViPNet config schema", () => {
		const parsed = n3HealthVipnetConfigSchema.parse(TEST_CONFIG);
		assert.equal(parsed.authGuid, "11111111-2222-3333-4444-555555555555");
		assert.equal(parsed.idLpu, "22222222-3333-4444-5555-666666666666");
		assert.equal(parsed.clinicOid, "1.2.643.5.1.13.13.12.2.77.99999");
		assert.equal(parsed.isVipnetChannelActive, true);
	});

	it("should fail validation if required fields are missing", () => {
		assert.throws(() => {
			n3HealthVipnetConfigSchema.parse({
				authGuid: "",
				idLpu: "",
			});
		});
	});

	it("should normalize EventLog authorization header with N3 prefix", () => {
		// Already has N3 prefix
		assert.equal(
			formatEventLogAuthHeader("N3 47276d92-0e76-cd13-33b4-2c7a407cf52e"),
			"N3 47276d92-0e76-cd13-33b4-2c7a407cf52e",
		);
		// Raw GUID without prefix
		assert.equal(
			formatEventLogAuthHeader("47276d92-0e76-cd13-33b4-2c7a407cf52e"),
			"N3 47276d92-0e76-cd13-33b4-2c7a407cf52e",
		);
	});

	// ─── 2. EMKService SOAP генераторы ──────────────────────────────────────
	it("should generate valid EMKService AddDocument SOAP XML with AuthToken", () => {
		const xml = buildEmkAddDocumentSoapXml(TEST_CONFIG, SAMPLE_EMK_PAYLOAD);

		// SOAP Envelope and namespaces
		assert.ok(xml.includes('xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"'));
		assert.ok(xml.includes('xmlns:tem="http://tempuri.org/"'));
		assert.ok(xml.includes("<tem:AddDocument>"));

		// AuthToken block with Guid and IdLpu
		assert.ok(xml.includes("<tem:AuthToken>"));
		assert.ok(xml.includes("<tem:Guid>11111111-2222-3333-4444-555555555555</tem:Guid>"));
		assert.ok(xml.includes("<tem:IdLpu>22222222-3333-4444-5555-666666666666</tem:IdLpu>"));

		// Clinic OID
		assert.ok(xml.includes("<tem:ClinicOid>1.2.643.5.1.13.13.12.2.77.99999</tem:ClinicOid>"));

		// Document metadata
		assert.ok(xml.includes("<tem:IdDocumentMis>DOC-DENT-001</tem:IdDocumentMis>"));
		assert.ok(xml.includes("<tem:IdCaseMis>CASE-VISIT-2026-09</tem:IdCaseMis>"));
		assert.ok(xml.includes("<tem:DocumentType>108</tem:DocumentType>"));
		assert.ok(xml.includes("<tem:DocumentName>Протокол стоматологического осмотра (Форма 043/у)</tem:DocumentName>"));
		assert.ok(xml.includes("<tem:MimeType>text/xml</tem:MimeType>"));

		// Base64 CDA roundtrip
		const base64Match = xml.match(/<tem:DocumentData>([^<]+)<\/tem:DocumentData>/);
		assert.ok(base64Match?.[1]);
		const decoded = Buffer.from(base64Match[1], "base64").toString("utf8");
		assert.equal(decoded, SAMPLE_CDA_XML);

		// Patient normalized SNILS (11 digits without dashes)
		assert.ok(xml.includes("<tem:Snils>11223344595</tem:Snils>"));
		assert.ok(xml.includes("<tem:FamilyName>Смирнова</tem:FamilyName>"));
		assert.ok(xml.includes("<tem:Gender>2</tem:Gender>"));

		// Doctor author
		assert.ok(xml.includes("<tem:Snils>12345678964</tem:Snils>"));
		assert.ok(xml.includes("<tem:FamilyName>Барабаш</tem:FamilyName>"));
		assert.ok(xml.includes("<tem:PositionCode>204</tem:PositionCode>"));

		// Signatures
		assert.ok(xml.includes("<tem:SignatureType>Doctor</tem:SignatureType>"));
		assert.ok(xml.includes("<tem:SignerSnils>12345678964</tem:SignerSnils>"));
	});

	it("should generate valid EMKService SendDocument SOAP XML", () => {
		const payload: EmkSendDocumentPayload = {
			idDocumentMis: "DOC-DENT-001",
			idCaseMis: "CASE-VISIT-2026-09",
			targetSystem: "REMD",
		};
		const xml = buildEmkSendDocumentSoapXml(TEST_CONFIG, payload);

		assert.ok(xml.includes("<tem:SendDocument>"));
		assert.ok(xml.includes("<tem:Guid>11111111-2222-3333-4444-555555555555</tem:Guid>"));
		assert.ok(xml.includes("<tem:IdDocumentMis>DOC-DENT-001</tem:IdDocumentMis>"));
		assert.ok(xml.includes("<tem:TargetSystem>REMD</tem:TargetSystem>"));
	});

	it("should generate valid EMKService CloseCase SOAP XML", () => {
		const payload: EmkCloseCasePayload = {
			idCaseMis: "CASE-VISIT-2026-09",
			closeDate: "2026-09-21",
			resultCode: "301",
			outcomeCode: "301",
		};
		const xml = buildEmkCloseCaseSoapXml(TEST_CONFIG, payload);

		assert.ok(xml.includes("<tem:CloseCase>"));
		assert.ok(xml.includes("<tem:Guid>11111111-2222-3333-4444-555555555555</tem:Guid>"));
		assert.ok(xml.includes("<tem:IdCaseMis>CASE-VISIT-2026-09</tem:IdCaseMis>"));
		assert.ok(xml.includes("<tem:CloseDate>2026-09-21</tem:CloseDate>"));
		assert.ok(xml.includes("<tem:ResultCode>301</tem:ResultCode>"));
	});

	// ─── 3. PixService SOAP генераторы ──────────────────────────────────────
	it("should generate valid PixService AddPatient SOAP XML", () => {
		const xml = buildPixAddPatientSoapXml(TEST_CONFIG, SAMPLE_PIX_PAYLOAD);

		assert.ok(xml.includes("<tem:AddPatient>"));
		assert.ok(xml.includes("<tem:Guid>11111111-2222-3333-4444-555555555555</tem:Guid>"));
		assert.ok(xml.includes("<tem:IdPatientMis>PATIENT-7788</tem:IdPatientMis>"));
		assert.ok(xml.includes("<tem:FamilyName>Смирнова</tem:FamilyName>"));
		assert.ok(xml.includes("<tem:Snils>11223344595</tem:Snils>"));
		assert.ok(xml.includes("<tem:Number>7700000000000001</tem:Number>")); // OMS
		assert.ok(xml.includes("<tem:Series>4515</tem:Series>")); // Passport series
		assert.ok(xml.includes("<tem:Phone>+79991234567</tem:Phone>"));
	});

	it("should generate valid PixService UpdatePatient SOAP XML", () => {
		const xml = buildPixUpdatePatientSoapXml(TEST_CONFIG, SAMPLE_PIX_PAYLOAD);

		assert.ok(xml.includes("<tem:UpdatePatient>"));
		assert.ok(xml.includes("<tem:Guid>11111111-2222-3333-4444-555555555555</tem:Guid>"));
		assert.ok(xml.includes("<tem:IdPatientMis>PATIENT-7788</tem:IdPatientMis>"));
	});

	it("should generate valid PixService FindPatients SOAP XML", () => {
		const criteria: PixFindPatientsCriteria = {
			snils: "112-233-445 95",
			familyName: "Смирнова",
			birthDate: "1985-04-12",
		};
		const xml = buildPixFindPatientsSoapXml(TEST_CONFIG, criteria);

		assert.ok(xml.includes("<tem:FindPatients>"));
		assert.ok(xml.includes("<tem:Guid>11111111-2222-3333-4444-555555555555</tem:Guid>"));
		assert.ok(xml.includes("<tem:Criteria>"));
		assert.ok(xml.includes("<tem:Snils>11223344595</tem:Snils>"));
		assert.ok(xml.includes("<tem:FamilyName>Смирнова</tem:FamilyName>"));
		assert.ok(xml.includes("<tem:BirthDate>1985-04-12</tem:BirthDate>"));
	});

	// ─── 4. Парсер SOAP ответов и ошибок ────────────────────────────────────
	it("should parse successful N3 SOAP response with IdDocumentGlobal", () => {
		const successXml = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
      <s:Body>
        <AddDocumentResponse xmlns="http://tempuri.org/">
          <AddDocumentResult>
            <Success>true</Success>
            <IdDocumentGlobal>99887766-5544-3322-1100-aabbccddeeff</IdDocumentGlobal>
          </AddDocumentResult>
        </AddDocumentResponse>
      </s:Body>
    </s:Envelope>`;

		const res = parseN3SoapResponse(successXml, 200);
		assert.equal(res.success, true);
		assert.equal(res.idDocumentGlobal, "99887766-5544-3322-1100-aabbccddeeff");
	});

	it("should parse SOAP Fault from N3 WCF service", () => {
		const faultXml = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
      <s:Body>
        <s:Fault>
          <faultcode>s:Client</faultcode>
          <faultstring>Неверный токен авторизации ЛПУ или истек срок действия сертификата</faultstring>
        </s:Fault>
      </s:Body>
    </s:Envelope>`;

		const res = parseN3SoapResponse(faultXml, 500);
		assert.equal(res.success, false);
		assert.ok(res.faultString?.includes("Неверный токен авторизации"));
	});

	// ─── 5. EventLog REST клиент ───────────────────────────────────────────
	it("should correctly check document status via EventLog client", async () => {
		const mockFetch: typeof fetch = async (input, init) => {
			const urlStr = String(input);
			assert.ok(urlStr.includes("api/v1/documents"));
			assert.ok(urlStr.includes("DOC-DENT-001"));

			// Check auth header format
			const headers = init?.headers as Record<string, string>;
			assert.equal(headers["Authorization"], "N3 fixture-test-token-47276d92");

			return new Response(
				JSON.stringify({
					items: [
						{
							idDocumentMis: "DOC-DENT-001",
							status: "REGISTERED",
							remdNumber: "1.2.643.5.1.13.13.12.2.77.99999-20260921-1234",
							registeredDate: "2026-09-21T11:00:00Z",
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const client = new N3EventLogClient(TEST_CONFIG, mockFetch);
		const status = await client.getDocumentStatus("DOC-DENT-001");

		assert.equal(status.idDocumentMis, "DOC-DENT-001");
		assert.equal(status.status, "REGISTERED");
		assert.equal(status.remdRegistrationNumber, "1.2.643.5.1.13.13.12.2.77.99999-20260921-1234");
		assert.ok(status.registeredAt);
	});

	it("should queue document for reexport in EventLog", async () => {
		let postedBody: unknown = null;

		const mockFetch: typeof fetch = async (input, init) => {
			assert.equal(init?.method, "POST");
			postedBody = JSON.parse(String(init?.body));
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		};

		const client = new N3EventLogClient(TEST_CONFIG, mockFetch);
		const result = await client.queueForReexport("DOC-DENT-001", "REMD");

		assert.equal(result.success, true);
		assert.ok((postedBody as { queue?: string })?.queue === "REMD");
		assert.ok((postedBody as { idDocumentMis?: string })?.idDocumentMis === "DOC-DENT-001");
	});

	it("should fetch queue stats in EventLog", async () => {
		const mockFetch: typeof fetch = async () => {
			return new Response(
				JSON.stringify({
					iemkQueueCount: 4,
					remdQueueCount: 12,
					errorCount: 1,
				}),
				{ status: 200 },
			);
		};

		const client = new N3EventLogClient(TEST_CONFIG, mockFetch);
		const stats = await client.getQueueStats();

		assert.equal(stats.iemkQueueCount, 4);
		assert.equal(stats.remdQueueCount, 12);
		assert.equal(stats.errorCount, 1);
	});

	// ─── 6. NSI FHIR клиент ────────────────────────────────────────────────
	it("should fetch CodeSystem from NSI FHIR server", async () => {
		const mockFetch: typeof fetch = async (input) => {
			assert.ok(String(input).includes("CodeSystem?_id=1.2.643.5.1.13.13.11.1040"));
			return new Response(
				JSON.stringify({
					resourceType: "CodeSystem",
					id: "1.2.643.5.1.13.13.11.1040",
					title: "Пол пациента",
					concept: [
						{ code: "1", display: "Мужской" },
						{ code: "2", display: "Женский" },
					],
				}),
				{ status: 200 },
			);
		};

		const fhir = new N3FhirTerminologyClient(TEST_CONFIG, mockFetch);
		const cs = await fhir.getCodeSystem("1.2.643.5.1.13.13.11.1040");

		assert.ok(cs);
		assert.equal(cs.resourceType, "CodeSystem");
		assert.equal(cs.concept?.length, 2);
		assert.equal(cs.concept?.[0]?.code, "1");
		assert.equal(cs.concept?.[1]?.display, "Женский");
	});

	it("should expand ValueSet with filter", async () => {
		const mockFetch: typeof fetch = async (input) => {
			assert.ok(String(input).includes("ValueSet/$expand"));
			assert.ok(String(input).includes("filter=%D0%9A%D0%B0%D1%80%D0%B8%D0%B5%D1%81"));
			return new Response(
				JSON.stringify({
					resourceType: "ValueSet",
					expansion: {
						contains: [{ code: "K02.1", display: "Кариес дентина" }],
					},
				}),
				{ status: 200 },
			);
		};

		const fhir = new N3FhirTerminologyClient(TEST_CONFIG, mockFetch);
		const vs = await fhir.expandValueSet("urn:valueset:mkb10-dental", "Кариес");

		assert.ok(vs);
		assert.equal(vs.expansion?.contains?.[0]?.code, "K02.1");
	});

	// ─── 7. Единый фасад N3HealthVipnetGateway ──────────────────────────────
	it("should execute emkAddDocument through unified gateway facade with SOAPAction", async () => {
		let capturedSoapAction = "";
		let capturedUrl = "";

		const mockFetch: typeof fetch = async (input, init) => {
			capturedUrl = String(input);
			capturedSoapAction =
				(init?.headers as Record<string, string>)["SOAPAction"] ?? "";
			return new Response(
				`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
          <s:Body>
            <AddDocumentResponse xmlns="http://tempuri.org/">
              <AddDocumentResult>
                <Success>true</Success>
                <IdDocumentGlobal>11223344-5566-7788-9900-aabbccddeeff</IdDocumentGlobal>
              </AddDocumentResult>
            </AddDocumentResponse>
          </s:Body>
        </s:Envelope>`,
				{ status: 200 },
			);
		};

		const gateway = new N3HealthVipnetGateway(TEST_CONFIG, mockFetch);
		const result = await gateway.emkAddDocument(SAMPLE_EMK_PAYLOAD);

		assert.equal(capturedUrl, "http://b2b.n3health.ru/emk/EMKService.svc");
		assert.equal(capturedSoapAction, '"http://tempuri.org/IEMKService/AddDocument"');
		assert.equal(result.success, true);
		assert.equal(result.idDocumentGlobal, "11223344-5566-7788-9900-aabbccddeeff");
	});
});
