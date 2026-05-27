import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { issueAttestation } from "./lib/documentIssueAttestation.mjs";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR = path.resolve(".data", "smoke-patient-form-snapshots");

const routePath = path.resolve("apps/api/dist/routes/documents.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath) || !existsSync(sharedPath)) {
  throw new Error("Build shared and API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, auditEvents, patients } = await import(pathToFileURL(sampleDataPath).href);
const { documentKindMetadata } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = Fastify({ logger: false });
await registerDocumentRoutes(app);

const patient = patients.find((candidate) => candidate.id === activeVisit.patientId);
assert(patient, "fixture patient missing");

const patientFormCases = [
  {
    kind: "patient_intake_questionnaire",
    visitId: null,
    payloadKey: "patientIntakeQuestionnaire",
    payload: {
      chiefComplaint: "Route smoke chief complaint before appointment",
      allergyStatus: "Route smoke allergies: denied by patient",
      currentMedications: "Route smoke medications: none",
      chronicConditions: "Route smoke chronic conditions: denied",
      pregnancyStatus: "not_applicable",
      anticoagulants: "Route smoke anticoagulants: denied",
      infectiousRiskNotes: "Route smoke infectious risks: not reported",
      cardioEndocrineNotes: "Route smoke cardio and endocrine risks: check before procedure",
      emergencyContact: "+7 900 000-00-02, route smoke contact",
      additionalNotes: "Route smoke patient confirms updates before each visit",
      accuracyConfirmed: true
    },
    fragments: ["Route smoke chief complaint", "Route smoke allergies", "Route smoke anticoagulants"]
  },
  {
    kind: "personal_data_processing_consent",
    visitId: null,
    payloadKey: "personalDataProcessingConsent",
    payload: {
      operatorLegalName: "DENTE Route Smoke Clinic LLC",
      operatorInn: "6312000000",
      operatorAddress: "Samara, route smoke street, 1",
      processingPurposes: ["dental care", "medical record keeping", "billing and document generation"],
      personalDataCategories: ["identity and contacts", "medical data", "payment and document data"],
      processingActions: ["collection", "recording", "storage", "use", "transfer by legal basis", "deletion after retention period"],
      thirdPartyTransferRules: "Transfer is limited to laboratories, fiscal services, insurers, IT contractors, public authorities and the patient portal by protected channel.",
      crossBorderTransferAllowed: false,
      automatedDecisionMakingAllowed: false,
      retentionPeriod: "during care and mandatory medical/accounting retention period",
      revocationChannel: "written clinic request or protected patient portal request",
      consentGivenAt: "24.05.2026 10:10",
      patientConfirmedVoluntaryConsent: true,
      medicalDataProcessingAcknowledged: true
    },
    fragments: ["DENTE Route Smoke Clinic LLC", "dental care", "protected patient portal request"]
  },
  {
    kind: "minor_legal_representative_consent",
    visitId: activeVisit.id,
    payloadKey: "minorLegalRepresentativeConsent",
    requiresVisitBlockCheck: true,
    payload: {
      representativeFullName: "Route Smoke Legal Representative",
      representativeRelationship: "mother",
      representativeIdentityDocument: "passport 36 00 123456",
      authorityDocument: "birth certificate ROUTE-SMOKE-123456",
      representativePhone: "+7 900 000-00-03",
      minorFullName: "Route Smoke Minor Patient",
      minorBirthDate: "2014-05-01",
      interventionScope: "route smoke caries treatment with local anesthesia",
      diagnosisOrIndication: "route smoke caries indication",
      explainedRisks: ["pain", "swelling", "allergic reaction"],
      alternativesExplained: ["observation", "alternative treatment method", "second opinion"],
      doctorFullName: "Route Smoke Doctor",
      signedAt: "24.05.2026 10:20",
      representativeIdentityVerified: true,
      representativeAuthorityVerified: true,
      informedConsentExplained: true,
      medicalRecordConsentStored: true,
      ageAppropriateExplanationGiven: true
    },
    fragments: ["Route Smoke Legal Representative", "Route Smoke Minor Patient", "route smoke caries treatment"]
  },
  {
    kind: "photo_video_consent",
    visitId: null,
    payloadKey: "photoVideoConsent",
    payload: {
      clinicalRecordUse: true,
      labTransferAllowed: true,
      colleagueConsultationAllowed: true,
      educationUseAllowed: true,
      marketingUseAllowed: false,
      recognizablePublicationAllowed: false,
      materials: ["intraoral_photo", "xray", "scan"],
      anonymizationRequired: true,
      revocationChannel: "written clinic request before non-clinical use",
      scopeNotes: "Route smoke: clinical archive, laboratory transfer and consultation only."
    },
    fragments: ["written clinic request before non-clinical use", "Route smoke: clinical archive"]
  }
];

const beforeAuditCount = auditEvents.length;
const issuedDocumentIds = [];

for (const formCase of patientFormCases) {
  if (formCase.requiresVisitBlockCheck) {
    const noVisitResponse = await app.inject({
      method: "POST",
      url: "/api/documents",
      payload: {
        patientId: patient.id,
        kind: formCase.kind,
        totalAmountRub: null,
        payload: { [formCase.payloadKey]: formCase.payload }
      }
    });
    assert(noVisitResponse.statusCode === 409, `${formCase.kind}: create without required visit must be blocked`);
  }

  const missingPayloadResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: patient.id,
      visitId: formCase.visitId,
      kind: formCase.kind,
      totalAmountRub: null
    }
  });
  assert(missingPayloadResponse.statusCode === 409, `${formCase.kind}: missing structured payload must be blocked`);

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: patient.id,
      visitId: formCase.visitId,
      kind: formCase.kind,
      totalAmountRub: null,
      payload: { [formCase.payloadKey]: formCase.payload }
    }
  });
  assert(createResponse.statusCode === 201, `${formCase.kind}: create failed: ${createResponse.statusCode} ${createResponse.body}`);
  const draftDocument = createResponse.json();
  assert(draftDocument.status === "draft", `${formCase.kind}: created document must start as draft`);
  assert(!Object.hasOwn(draftDocument, "storagePath"), `${formCase.kind}: draft response must not expose snapshot storage path`);

  const issueWithoutAttestationResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${draftDocument.id}/issue`
  });
  assert(
    issueWithoutAttestationResponse.statusCode === 400,
    `${formCase.kind}: issue without signature attestation must be blocked`
  );

  const issueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${draftDocument.id}/issue`,
    payload: issueAttestation({
      signatureAttestation: {
        recipientFullName: patient.fullName,
        note: `${formCase.kind} route lifecycle`
      }
    })
  });
  assert(issueResponse.statusCode === 200, `${formCase.kind}: issue failed: ${issueResponse.statusCode} ${issueResponse.body}`);
  const issuedDocument = issueResponse.json();
  issuedDocumentIds.push(issuedDocument.id);
  assert(issuedDocument.status === "issued", `${formCase.kind}: issue must return issued status`);
  assert(issuedDocument.signatureAttestation?.recipientSigned === true, `${formCase.kind}: issued response must include signature attestation`);
  assert(/^[a-f0-9]{64}$/.test(issuedDocument.issuedSnapshotSha256 ?? ""), `${formCase.kind}: issued snapshot hash missing`);
  assert(!Object.hasOwn(issuedDocument, "storagePath"), `${formCase.kind}: issued response must not expose snapshot storage path`);

  const auditFactsResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${issuedDocument.id}/audit-facts`
  });
  assert(auditFactsResponse.statusCode === 200, `${formCase.kind}: audit facts failed`);
  const auditFacts = auditFactsResponse.json();
  assert(auditFacts.immutableSnapshotReady === true, `${formCase.kind}: audit must confirm immutable snapshot`);
  assert(auditFacts.canDownloadHtml === true, `${formCase.kind}: audit must expose archived HTML`);
  assert(auditFacts.canExportPdf === true, `${formCase.kind}: audit must expose PDF export readiness`);
  assert(auditFacts.htmlDownloadUrl === `/api/documents/${issuedDocument.id}/html?download=1`, `${formCase.kind}: HTML download URL mismatch`);
  assert(auditFacts.pdfDownloadUrl === `/api/documents/${issuedDocument.id}/pdf`, `${formCase.kind}: PDF download URL mismatch`);
  assert(auditFacts.sourceStatus === documentKindMetadata[formCase.kind].sourceStatus, `${formCase.kind}: source status mismatch`);
  assert(auditFacts.sourceAuthority, `${formCase.kind}: source authority must be present`);
  assert(!Object.hasOwn(auditFacts, "storagePath"), `${formCase.kind}: audit facts must not expose snapshot storage path`);

  const htmlResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${issuedDocument.id}/html`
  });
  assert(htmlResponse.statusCode === 200, `${formCase.kind}: issued HTML failed`);
  const issuedHtml = htmlResponse.body;
  assert(issuedHtml.includes(documentKindMetadata[formCase.kind].title), `${formCase.kind}: HTML must contain document title`);
  assert(issuedHtml.includes("Отметка о подписании") || issuedHtml.includes("ÐžÑ‚Ð¼ÐµÑ‚ÐºÐ° Ð¾ Ð¿Ð¾Ð´Ð¿Ð¸ÑÐ°Ð½Ð¸Ð¸"), `${formCase.kind}: HTML must include signature attestation block`);
  for (const fragment of formCase.fragments) {
    assert(issuedHtml.includes(fragment), `${formCase.kind}: HTML missing payload fragment "${fragment}"`);
  }

  const originalName = patient.fullName;
  patient.fullName = `MUTATED ROUTE SMOKE ${formCase.kind}`;
  const repeatedHtmlResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${issuedDocument.id}/html`
  });
  patient.fullName = originalName;
  assert(repeatedHtmlResponse.statusCode === 200, `${formCase.kind}: repeated immutable HTML failed`);
  assert(repeatedHtmlResponse.body === issuedHtml, `${formCase.kind}: issued HTML must come from immutable snapshot`);
  assert(!repeatedHtmlResponse.body.includes("MUTATED ROUTE SMOKE"), `${formCase.kind}: issued snapshot must not re-render mutable patient data`);

  const downloadResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${issuedDocument.id}/html?download=1`
  });
  assert(downloadResponse.statusCode === 200, `${formCase.kind}: archived HTML download failed`);
  assert(
    String(downloadResponse.headers["content-disposition"] ?? "").includes(`dente-${formCase.kind}-`),
    `${formCase.kind}: archived HTML download filename must include document kind`
  );
}

const loopAudit = auditEvents.slice(0, auditEvents.length - beforeAuditCount);
for (const issuedDocumentId of issuedDocumentIds) {
  assert(
    loopAudit.some((event) => event.action === "document_created" && event.entityId === issuedDocumentId),
    `${issuedDocumentId}: document_created audit event missing`
  );
  assert(
    loopAudit.some((event) => event.action === "document_issued" && event.entityId === issuedDocumentId),
    `${issuedDocumentId}: document_issued audit event missing`
  );
}

await app.close();

console.log(
  JSON.stringify({
    ok: true,
    checkedDocumentKinds: patientFormCases.map((entry) => entry.kind),
    issuedDocumentCount: issuedDocumentIds.length,
    missingPayloadBlocked: true,
    signatureAttestationRequired: true,
    immutableSnapshotsVerified: true,
    storagePathHidden: true
  })
);
