/**
 * ═══════════════════════════════════════════════════════════════════════════
 * N3.HEALTH SOAP XML PAYLOAD BUILDERS (EMKSERVICE & PIXSERVICE)
 * (ПРИКАЗ МИНЗДРАВА РФ 911Н / 555-ПП / ГОСТ Р 34.10-2012 / VIPNET ENCRYPTION)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { escapeXml } from "../../cda/c14n.js";
import {
	n3HealthVipnetConfigSchema,
	type N3HealthVipnetConfig,
	type EmkAddDocumentPayload,
	type EmkSendDocumentPayload,
	type EmkCloseCasePayload,
	type PixPatientPayload,
	type PixFindPatientsCriteria,
} from "./types.js";

// ─── 1. Генератор SOAP XML для EMKService ────────────────────────────────────

/**
 * Формирует SOAP 1.1 / 1.2 XML-конверт для вызова AddDocument в EMKService.svc.
 * Включает стандартный для N3.Health блок авторизации AuthToken:
 * `<AuthToken><Guid>{authGuid}</Guid><IdLpu>{idLpu}</IdLpu></AuthToken>`.
 */
export function buildEmkAddDocumentSoapXml(
	config: N3HealthVipnetConfig,
	payload: EmkAddDocumentPayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	const cleanPatientSnils = payload.patient.snils.replace(/\D/g, "");
	const cleanDoctorSnils = payload.doctor.snils.replace(/\D/g, "");
	const base64Cda = Buffer.from(payload.cdaXmlContent, "utf8").toString("base64");

	const signaturesXml = payload.signatures && payload.signatures.length > 0
		? `<tem:Signatures>
${payload.signatures.map((sig) => `            <tem:SignatureData>
              <tem:SignatureType>${escapeXml(sig.signatureType)}</tem:SignatureType>
              <tem:Data>${escapeXml(sig.signatureBase64)}</tem:Data>
              ${sig.signerSnils ? `<tem:SignerSnils>${escapeXml(sig.signerSnils.replace(/\D/g, ""))}</tem:SignerSnils>` : ""}
            </tem:SignatureData>`).join("\n")}
          </tem:Signatures>`
		: "";

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:AddDocument>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:ClinicOid>${escapeXml(config.clinicOid)}</tem:ClinicOid>
        <tem:Document>
          <tem:IdDocumentMis>${escapeXml(payload.idDocumentMis)}</tem:IdDocumentMis>
          ${payload.idCaseMis ? `<tem:IdCaseMis>${escapeXml(payload.idCaseMis)}</tem:IdCaseMis>` : ""}
          <tem:DocumentType>${escapeXml(payload.documentType)}</tem:DocumentType>
          <tem:DocumentName>${escapeXml(payload.documentName)}</tem:DocumentName>
          <tem:DocumentDate>${escapeXml(payload.documentDate)}</tem:DocumentDate>
          <tem:MimeType>text/xml</tem:MimeType>
          <tem:DocumentData>${base64Cda}</tem:DocumentData>
          ${signaturesXml}
        </tem:Document>
        <tem:Patient>
          <tem:IdPatientMis>${escapeXml(payload.patient.idPatientMis)}</tem:IdPatientMis>
          <tem:Snils>${escapeXml(cleanPatientSnils)}</tem:Snils>
          <tem:FamilyName>${escapeXml(payload.patient.familyName)}</tem:FamilyName>
          <tem:GivenName>${escapeXml(payload.patient.givenName)}</tem:GivenName>
          ${payload.patient.middleName ? `<tem:MiddleName>${escapeXml(payload.patient.middleName)}</tem:MiddleName>` : ""}
          <tem:BirthDate>${escapeXml(payload.patient.birthDate)}</tem:BirthDate>
          <tem:Gender>${escapeXml(payload.patient.gender)}</tem:Gender>
        </tem:Patient>
        <tem:Doctor>
          <tem:Snils>${escapeXml(cleanDoctorSnils)}</tem:Snils>
          <tem:FamilyName>${escapeXml(payload.doctor.familyName)}</tem:FamilyName>
          <tem:GivenName>${escapeXml(payload.doctor.givenName)}</tem:GivenName>
          ${payload.doctor.middleName ? `<tem:MiddleName>${escapeXml(payload.doctor.middleName)}</tem:MiddleName>` : ""}
          ${payload.doctor.positionCode ? `<tem:PositionCode>${escapeXml(payload.doctor.positionCode)}</tem:PositionCode>` : ""}
          ${payload.doctor.specialtyCode ? `<tem:SpecialtyCode>${escapeXml(payload.doctor.specialtyCode)}</tem:SpecialtyCode>` : ""}
        </tem:Doctor>
      </tem:request>
    </tem:AddDocument>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Формирует SOAP XML-конверт для вызова SendDocument в EMKService.svc.
 */
export function buildEmkSendDocumentSoapXml(
	config: N3HealthVipnetConfig,
	payload: EmkSendDocumentPayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:SendDocument>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:IdDocumentMis>${escapeXml(payload.idDocumentMis)}</tem:IdDocumentMis>
        ${payload.idCaseMis ? `<tem:IdCaseMis>${escapeXml(payload.idCaseMis)}</tem:IdCaseMis>` : ""}
        <tem:TargetSystem>${escapeXml(payload.targetSystem ?? "REMD")}</tem:TargetSystem>
      </tem:request>
    </tem:SendDocument>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Формирует SOAP XML-конверт для закрытия случая обслуживания (CloseCase) в EMKService.svc.
 */
export function buildEmkCloseCaseSoapXml(
	config: N3HealthVipnetConfig,
	payload: EmkCloseCasePayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:CloseCase>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:IdCaseMis>${escapeXml(payload.idCaseMis)}</tem:IdCaseMis>
        <tem:CloseDate>${escapeXml(payload.closeDate)}</tem:CloseDate>
        ${payload.resultCode ? `<tem:ResultCode>${escapeXml(payload.resultCode)}</tem:ResultCode>` : ""}
        ${payload.outcomeCode ? `<tem:OutcomeCode>${escapeXml(payload.outcomeCode)}</tem:OutcomeCode>` : ""}
      </tem:request>
    </tem:CloseCase>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ─── 2. Генератор SOAP XML для PixService ────────────────────────────────────

/**
 * Формирует SOAP XML-конверт для вызова AddPatient в PixService.svc.
 */
export function buildPixAddPatientSoapXml(
	config: N3HealthVipnetConfig,
	payload: PixPatientPayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	const cleanSnils = payload.snils.replace(/\D/g, "");

	const omsXml = payload.omsPolicy
		? `        <tem:OmsPolicy>
          <tem:Number>${escapeXml(payload.omsPolicy.number)}</tem:Number>
          ${payload.omsPolicy.type ? `<tem:Type>${escapeXml(payload.omsPolicy.type)}</tem:Type>` : ""}
          ${payload.omsPolicy.issuer ? `<tem:Issuer>${escapeXml(payload.omsPolicy.issuer)}</tem:Issuer>` : ""}
        </tem:OmsPolicy>`
		: "";

	const docXml = payload.document
		? `        <tem:Document>
          <tem:DocType>${escapeXml(payload.document.docType)}</tem:DocType>
          ${payload.document.series ? `<tem:Series>${escapeXml(payload.document.series)}</tem:Series>` : ""}
          <tem:Number>${escapeXml(payload.document.number)}</tem:Number>
          ${payload.document.issueDate ? `<tem:IssueDate>${escapeXml(payload.document.issueDate)}</tem:IssueDate>` : ""}
          ${payload.document.issuer ? `<tem:Issuer>${escapeXml(payload.document.issuer)}</tem:Issuer>` : ""}
        </tem:Document>`
		: "";

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:AddPatient>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:Patient>
          <tem:IdPatientMis>${escapeXml(payload.idPatientMis)}</tem:IdPatientMis>
          <tem:FamilyName>${escapeXml(payload.familyName)}</tem:FamilyName>
          <tem:GivenName>${escapeXml(payload.givenName)}</tem:GivenName>
          ${payload.middleName ? `<tem:MiddleName>${escapeXml(payload.middleName)}</tem:MiddleName>` : ""}
          <tem:BirthDate>${escapeXml(payload.birthDate)}</tem:BirthDate>
          <tem:Gender>${escapeXml(payload.gender)}</tem:Gender>
          <tem:Snils>${escapeXml(cleanSnils)}</tem:Snils>
${omsXml}
${docXml}
          ${payload.phone ? `<tem:Phone>${escapeXml(payload.phone)}</tem:Phone>` : ""}
        </tem:Patient>
      </tem:request>
    </tem:AddPatient>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Формирует SOAP XML-конверт для вызова UpdatePatient в PixService.svc.
 */
export function buildPixUpdatePatientSoapXml(
	config: N3HealthVipnetConfig,
	payload: PixPatientPayload,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	const cleanSnils = payload.snils.replace(/\D/g, "");

	const omsXml = payload.omsPolicy
		? `        <tem:OmsPolicy>
          <tem:Number>${escapeXml(payload.omsPolicy.number)}</tem:Number>
          ${payload.omsPolicy.type ? `<tem:Type>${escapeXml(payload.omsPolicy.type)}</tem:Type>` : ""}
          ${payload.omsPolicy.issuer ? `<tem:Issuer>${escapeXml(payload.omsPolicy.issuer)}</tem:Issuer>` : ""}
        </tem:OmsPolicy>`
		: "";

	const docXml = payload.document
		? `        <tem:Document>
          <tem:DocType>${escapeXml(payload.document.docType)}</tem:DocType>
          ${payload.document.series ? `<tem:Series>${escapeXml(payload.document.series)}</tem:Series>` : ""}
          <tem:Number>${escapeXml(payload.document.number)}</tem:Number>
          ${payload.document.issueDate ? `<tem:IssueDate>${escapeXml(payload.document.issueDate)}</tem:IssueDate>` : ""}
          ${payload.document.issuer ? `<tem:Issuer>${escapeXml(payload.document.issuer)}</tem:Issuer>` : ""}
        </tem:Document>`
		: "";

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:UpdatePatient>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:Patient>
          <tem:IdPatientMis>${escapeXml(payload.idPatientMis)}</tem:IdPatientMis>
          <tem:FamilyName>${escapeXml(payload.familyName)}</tem:FamilyName>
          <tem:GivenName>${escapeXml(payload.givenName)}</tem:GivenName>
          ${payload.middleName ? `<tem:MiddleName>${escapeXml(payload.middleName)}</tem:MiddleName>` : ""}
          <tem:BirthDate>${escapeXml(payload.birthDate)}</tem:BirthDate>
          <tem:Gender>${escapeXml(payload.gender)}</tem:Gender>
          <tem:Snils>${escapeXml(cleanSnils)}</tem:Snils>
${omsXml}
${docXml}
          ${payload.phone ? `<tem:Phone>${escapeXml(payload.phone)}</tem:Phone>` : ""}
        </tem:Patient>
      </tem:request>
    </tem:UpdatePatient>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Формирует SOAP XML-конверт для поиска пациентов FindPatients в PixService.svc.
 */
export function buildPixFindPatientsSoapXml(
	config: N3HealthVipnetConfig,
	criteria: PixFindPatientsCriteria,
): string {
	n3HealthVipnetConfigSchema.parse(config);

	const cleanSnils = criteria.snils ? criteria.snils.replace(/\D/g, "") : "";

	return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:FindPatients>
      <tem:request>
        <tem:AuthToken>
          <tem:Guid>${escapeXml(config.authGuid)}</tem:Guid>
          <tem:IdLpu>${escapeXml(config.idLpu)}</tem:IdLpu>
        </tem:AuthToken>
        <tem:Criteria>
          ${criteria.idPatientMis ? `<tem:IdPatientMis>${escapeXml(criteria.idPatientMis)}</tem:IdPatientMis>` : ""}
          ${cleanSnils ? `<tem:Snils>${escapeXml(cleanSnils)}</tem:Snils>` : ""}
          ${criteria.familyName ? `<tem:FamilyName>${escapeXml(criteria.familyName)}</tem:FamilyName>` : ""}
          ${criteria.givenName ? `<tem:GivenName>${escapeXml(criteria.givenName)}</tem:GivenName>` : ""}
          ${criteria.middleName ? `<tem:MiddleName>${escapeXml(criteria.middleName)}</tem:MiddleName>` : ""}
          ${criteria.birthDate ? `<tem:BirthDate>${escapeXml(criteria.birthDate)}</tem:BirthDate>` : ""}
          ${criteria.omsNumber ? `<tem:OmsNumber>${escapeXml(criteria.omsNumber)}</tem:OmsNumber>` : ""}
        </tem:Criteria>
      </tem:request>
    </tem:FindPatients>
  </soapenv:Body>
</soapenv:Envelope>`;
}
