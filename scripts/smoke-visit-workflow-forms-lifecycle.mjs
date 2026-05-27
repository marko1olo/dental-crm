import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { issueAttestation } from "./lib/documentIssueAttestation.mjs";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR = path.resolve(".data", "smoke-visit-workflow-form-snapshots");

const routePath = path.resolve("apps/api/dist/routes/documents.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath) || !existsSync(sharedPath)) {
  throw new Error("Build shared and API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, auditEvents, patients, payments } = await import(pathToFileURL(sampleDataPath).href);
const { documentKindMetadata } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const patient = patients.find((candidate) => candidate.id === activeVisit.patientId);
assert(patient, "fixture patient missing");

const paidPayment = payments.find(
  (payment) => payment.patientId === patient.id && payment.visitId === activeVisit.id && payment.status === "paid" && payment.fiscalReceiptNumber
);
assert(paidPayment, "fixture paid payment with fiscal receipt missing");

const sampleClinicalToothRows = [
  {
    toothOrArea: "36 зуб",
    surfaces: ["occlusal", "distal"],
    status: "caries",
    diagnosisOrFinding: "Route lifecycle кариес дентина 36 зуба",
    indication: "Route lifecycle восстановление функции и контроль осложнений",
    plannedAction: "лечение кариеса и композитная реставрация",
    prognosis: "прогноз зависит от явки на контроль",
    periodontalStatus: "десна без острого воспаления",
    implantOrProstheticNotes: null,
    orthodonticNotes: null
  }
];

const visitWorkflowCases = [
  {
    kind: "informed_consent",
    payloadKey: "informedConsent",
    requiresVisitProof: true,
    payload: {
      intervention: "Route lifecycle informed consent treatment for tooth 36",
      toothOrArea: "36 tooth",
      diagnosisOrIndication: "Route lifecycle deep caries and bite pain",
      expectedBenefit: "Route lifecycle pain control and tooth function restoration",
      plannedAnesthesia: "Route lifecycle local anesthesia with articaine 4%",
      materialOrMedicationNotes: "Route lifecycle rubber dam and composite restoration by clinical indication",
      trustedContactForMedicalInfo: "Route lifecycle no third-party disclosure allowed",
      explainedRisks: ["postoperative pain", "swelling", "allergic reaction", "additional visit may be needed"],
      alternatives: ["second opinion", "postpone treatment under observation", "another treatment method if clinically indicated"],
      aftercareRequirements: ["do not eat until anesthesia ends", "follow doctor instructions", "contact clinic if pain or swelling increases"],
      doctorFullName: "Route Lifecycle Doctor",
      consentConfirmedAt: "24.05.2026 10:02",
      patientQuestionsAnswered: true,
      patientUnderstandsRisks: true,
      patientMayWithdrawBeforeIntervention: true
    },
    fragments: ["Route lifecycle informed consent treatment for tooth 36", "Route lifecycle pain control", "Route Lifecycle Doctor"]
  },
  {
    kind: "procedure_specific_consent_packet",
    payloadKey: "procedureSpecificConsent",
    requiresVisitProof: true,
    payload: {
      procedureType: "surgery_extraction",
      procedureName: "Route lifecycle atraumatic extraction of tooth 36",
      toothOrArea: "36 tooth",
      diagnosisOrIndication: "Route lifecycle acute pain, crown destruction and infection risk",
      clinicalToothRows: sampleClinicalToothRows,
      plannedAnesthesia: "Route lifecycle mandibular block anesthesia with articaine 4%",
      materialsAndSystems: "Route lifecycle sutures and hemostatic sponge if indicated",
      patientSpecificRiskFactors: ["allergy status checked", "anticoagulants and pregnancy status checked"],
      procedureSpecificRisks: ["bleeding", "swelling", "alveolitis", "adjacent tissue injury"],
      alternatives: ["endodontic treatment when indicated", "second opinion", "refuse procedure"],
      aftercareAndLimits: ["do not heat the surgical area", "follow prescriptions", "attend control visit"],
      doctorFullName: "Route Lifecycle Surgeon",
      consentConfirmedAt: "24.05.2026 10:03",
      localClinicFormAttached: true,
      patientQuestionsAnswered: true,
      exactProcedureConfirmed: true,
      patientUnderstandsSpecificRisks: true
    },
    fragments: ["Route lifecycle atraumatic extraction of tooth 36", "alveolitis", "Route Lifecycle Surgeon"]
  },
  {
    kind: "anesthesia_consent_log",
    payloadKey: "anesthesiaConsentLog",
    payload: {
      method: "инфильтрационная и проводниковая местная анестезия",
      anesthetic: "артикаин 4%",
      vasoconstrictor: "эпинефрин 1:200000",
      plannedZone: "36 зуб и нижняя челюсть слева",
      allergyStatus: "аллергия на анестетики со слов пациента отрицается",
      restrictionNotes: "антикоагулянты и беременность уточнены перед вмешательством",
      doseRows: [
        {
          time: "24.05.2026 10:05",
          medication: "артикаин 4% с эпинефрином 1:200000",
          doseMl: "1.7 мл",
          zone: "36 зуб",
          reaction: "без особенностей"
        }
      ],
      patientAnesthesiaRisksExplained: true,
      allergyAndRestrictionStatusChecked: true,
      patientConfirmedAnesthesiaConsent: true
    },
    fragments: ["Согласие и журнал местной анестезии", "артикаин 4%", "Журнал введения"]
  },
  {
    kind: "prescription_medication_order",
    payloadKey: "prescriptionMedicationOrder",
    payload: {
      clinicalToothRows: sampleClinicalToothRows,
      medications: [
        {
          medication: "ибупрофен",
          dosage: "400 мг",
          instructions: "по 1 таблетке после еды при боли",
          duration: "до 3 дней"
        }
      ],
      safetyNotes: [
        "проверены аллергии, беременность, антикоагулянты и постоянные препараты",
        "пациенту объяснено, что нельзя превышать дозировку без врача"
      ],
      urgentContactReason: "сыпь, одышка, кровотечение, температура или нарастающая боль"
    },
    fragments: ["Назначение лекарственных препаратов", "ибупрофен", "Контроль безопасности"]
  },
  {
    kind: "lab_work_order",
    payloadKey: "labWorkOrder",
    payload: {
      clinicalToothRows: sampleClinicalToothRows,
      workType: "керамическая вкладка",
      teethOrArea: "36 зуб",
      material: "E.max",
      shade: "VITA A2",
      source: "интраоральный скан и фото-протокол",
      deadline: "до 31.05.2026",
      technicianNotes: "Route lifecycle: проверить контактные пункты, окклюзию и край препарирования."
    },
    fragments: ["Зуботехнический заказ-наряд", "E.max", "VITA A2"]
  },
  {
    kind: "xray_cbct_referral",
    payloadKey: "xrayCbctReferral",
    payload: {
      studyType: "cbct",
      clinicalToothRows: sampleClinicalToothRows,
      area: "36 зуб, нижняя челюсть слева",
      clinicalQuestion: "уточнить анатомию корней и положение нижнечелюстного канала",
      indication: "подготовка к хирургическому этапу",
      pregnancyStatus: "denied",
      safetyNotes: "беременность со слов пациента отрицается, стандартная защита",
      priority: "routine",
      includeDicomExport: true,
      includeRadiologistReport: true,
      requestedBy: "Route Lifecycle Doctor",
      recipientClinic: "DENTE Route Lifecycle Clinic",
      dueDate: "до 25.05.2026"
    },
    fragments: ["Направление на рентген/КЛКТ", "КЛКТ", "Беременность/ограничения"]
  },
  {
    kind: "visit_attendance_certificate",
    payloadKey: "visitAttendanceCertificate",
    payload: {
      attendedAtStart: "24.05.2026 10:00",
      attendedAtEnd: "24.05.2026 11:20",
      purpose: "для предъявления по месту требования",
      recipientOrganization: "работодатель пациента",
      issuedAt: "24.05.2026 11:30",
      signedByFullName: "Route Lifecycle Admin",
      signedByRole: "администратор клиники",
      diagnosisDisclosureExcluded: true,
      notSickLeaveAcknowledged: true
    },
    fragments: ["Справка о посещении", "не раскрывает диагноз", "Route Lifecycle Admin"]
  },
  {
    kind: "warranty_service_memo",
    payloadKey: "warrantyServiceMemo",
    payload: {
      serviceOrWorkName: "Route lifecycle composite restoration",
      completedAt: "24.05.2026 11:20",
      teethOrArea: "36 tooth",
      materialsOrSystems: "rubber dam, adhesive system, composite",
      warrantyPeriod: "12 months under local warranty policy",
      controlVisitSchedule: "control in 14 days and hygiene by individual schedule",
      patientObligations: ["follow recommendations", "attend control visits", "avoid overload"],
      excludedRiskFactors: ["trauma", "bruxism", "missed controls"],
      urgentContactReasons: ["acute pain", "swelling", "restoration fracture"],
      linkedActOrContract: "ACT-ROUTE-LIFECYCLE-001",
      doctorFullName: "Route Lifecycle Doctor",
      issuedAt: "24.05.2026 11:35",
      localWarrantyPolicyApplied: true,
      patientReceivedAftercare: true,
      patientUnderstandsControlVisits: true
    },
    fragments: ["Гарантийная памятка", "Route lifecycle composite restoration", "Контрольные визиты"]
  },
  {
    kind: "medical_intervention_refusal",
    payloadKey: "medicalInterventionRefusal",
    payload: {
      refusedIntervention: "Удаление зуба 36 по острому воспалению",
      clinicalIndication: "острая боль, подвижность, риск распространения инфекции",
      patientReason: "пациент хочет получить второе мнение",
      explainedRisks: ["усиление боли", "распространение инфекции", "потеря возможности сохранить соседние ткани"],
      alternativesOffered: ["повторная консультация хирурга", "обезболивание и срочный контроль"],
      urgentWarningSigns: ["отек лица", "температура", "затруднение глотания или дыхания"],
      doctorFullName: "Route Lifecycle Surgeon",
      refusalConfirmedAt: "24.05.2026 11:40",
      patientUnderstandsConsequences: true,
      secondOpinionOffered: true,
      emergencyCareExplained: true
    },
    fragments: ["Отказ от медицинского вмешательства", "Удаление зуба 36", "Предложенные альтернативы"]
  },
  {
    kind: "payment_refund_correction_request",
    payloadKey: "paymentRefundCorrection",
    payload: {
      action: "partial_refund",
      selectedPaymentIds: [paidPayment.id],
      amountRub: Math.min(1200, paidPayment.amountRub),
      reason: "коррекция плана лечения",
      refundMethod: "card",
      recipientFullName: paidPayment.payerFullName ?? patient.fullName,
      recipientIdentityDocument: paidPayment.payerIdentityDocument ?? "паспорт проверен администратором",
      bankDetails: null,
      originalFiscalReceiptNumber: paidPayment.fiscalReceiptNumber,
      correctionFiscalReceiptNumber: null,
      accountantDecision: "согласовано ответственным сотрудником"
    },
    fragments: ["Заявление на возврат или коррекцию оплаты", "коррекция плана лечения", "фискальный чек"]
  }
];

const app = Fastify({ logger: false });
await registerDocumentRoutes(app);

const beforeAuditCount = auditEvents.length;
const issuedDocumentIds = [];

for (const formCase of visitWorkflowCases) {
  if (formCase.requiresVisitProof) {
    const withoutVisitResponse = await app.inject({
      method: "POST",
      url: "/api/documents",
      payload: {
        patientId: patient.id,
        kind: formCase.kind,
        totalAmountRub: null,
        payload: { [formCase.payloadKey]: formCase.payload }
      }
    });
    assert(withoutVisitResponse.statusCode === 409, `${formCase.kind}: visit-required form without visit must be blocked`);
  }

  const missingPayloadResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: patient.id,
      visitId: activeVisit.id,
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
      visitId: activeVisit.id,
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
        note: `${formCase.kind} visit workflow route lifecycle`
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
  assert(
    issuedHtml.includes("Отметка о подписании") || issuedHtml.includes("ÐžÑ‚Ð¼ÐµÑ‚ÐºÐ° Ð¾ Ð¿Ð¾Ð´Ð¿Ð¸ÑÐ°Ð½Ð¸Ð¸"),
    `${formCase.kind}: HTML must include signature attestation block`
  );
  for (const fragment of formCase.fragments) {
    assert(issuedHtml.includes(fragment), `${formCase.kind}: HTML missing payload fragment "${fragment}"`);
  }

  const originalName = patient.fullName;
  patient.fullName = `MUTATED VISIT ROUTE ${formCase.kind}`;
  const repeatedHtmlResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${issuedDocument.id}/html`
  });
  patient.fullName = originalName;
  assert(repeatedHtmlResponse.statusCode === 200, `${formCase.kind}: repeated immutable HTML failed`);
  assert(repeatedHtmlResponse.body === issuedHtml, `${formCase.kind}: issued HTML must come from immutable snapshot`);
  assert(!repeatedHtmlResponse.body.includes("MUTATED VISIT ROUTE"), `${formCase.kind}: issued snapshot must not re-render mutable patient data`);

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
    checkedDocumentKinds: visitWorkflowCases.map((entry) => entry.kind),
    issuedDocumentCount: issuedDocumentIds.length,
    missingPayloadBlocked: true,
    signatureAttestationRequired: true,
    immutableSnapshotsVerified: true,
    storagePathHidden: true
  })
);
