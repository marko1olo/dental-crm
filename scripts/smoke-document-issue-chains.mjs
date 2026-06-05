import { createRequire } from "node:module";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { issueAttestation } from "./lib/documentIssueAttestation.mjs";

const tempRoot = mkdtempSync(path.join(tmpdir(), "dental-document-chains-"));

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR = path.join(tempRoot, "snapshots");

const routePath = path.resolve("apps/api/dist/routes/documents.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit } = await import(pathToFileURL(sampleDataPath).href);
const originalActiveVisitStatus = activeVisit.status;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function documentErrorText(response) {
  const body = response.json();
  return String(body.message ?? body.error ?? "");
}

const sha256Pattern = /^[a-f0-9]{64}$/;

function assertReleaseJournalHash(document, label) {
  const hash = document.releaseJournalEntry?.sourceSnapshotSha256;
  assert(typeof hash === "string" && sha256Pattern.test(hash), `${label} must write release journal source sha256`);
  return hash;
}

function cp1252Mojibake(value) {
  return Buffer.from(value, "utf8").toString("latin1");
}

function hasMojibakeMarker(value) {
  const markerCodepoints = new Set([0xc3, 0xc2, 0xd0, 0xd1, 0xe2, 0xfffd]);
  return [...String(value ?? "")].some((char) => markerCodepoints.has(char.codePointAt(0)));
}

function assertReadableRussian(value, expected, label) {
  assert(value === expected, `${label} must be repaired to readable Russian: ${JSON.stringify(value)}`);
  assert(!hasMojibakeMarker(value), `${label} must not contain mojibake markers`);
}

const sampleClinicalToothRows = [
  {
    toothOrArea: "36 зуб",
    surfaces: ["occlusal", "distal"],
    status: "caries",
    diagnosisOrFinding: "Кариес дентина 36 зуба по осмотру и снимку",
    indication: "восстановление функции и профилактика осложнений",
    plannedAction: "лечение кариеса и композитная реставрация",
    prognosis: "прогноз зависит от гигиены и контрольных визитов",
    periodontalStatus: "десна без острого воспаления",
    implantOrProstheticNotes: null,
    orthodonticNotes: null
  }
];

const app = Fastify({ logger: false });

try {
  await registerDocumentRoutes(app);

  const contractPayload = {
    paidMedicalServicesContract: {
      contractNumber: "DPMU-CHAIN-001",
      contractDate: "2026-05-20",
      serviceStart: "2026-05-20 10:00",
      serviceEndOrCondition: "до завершения согласованного плана лечения",
      customerFullName: "Иванова Марина Сергеевна",
      representativeFullName: null,
      plannedCareReason: "плановое стоматологическое лечение по активному визиту",
      serviceScopeSummary: "оказание платных стоматологических услуг по согласованному плану лечения",
      estimatedTotalRub: 8600,
      paymentTerms: "оплата по кассовому чеку до или в день оказания услуг",
      priceChangeRules: "изменения объема и стоимости оформляются письменным соглашением",
      freeCareAvailabilityNotice: "маршрут бесплатной помощи разъяснен при наличии оснований",
      medicalRecommendationWarning: "несоблюдение рекомендаций врача может повлиять на результат",
      refusalAndRefundTerms: "возврат оформляется по фактически оказанным услугам и расходам",
      warrantyAndClaimsTerms: "гарантийные условия действуют по локальным правилам клиники",
      doctorFullName: "Doctor",
      signedAt: "2026-05-20 10:10",
      patientReceivedClinicInfo: true,
      patientReceivedPriceAndServiceList: true,
      patientUnderstandsPaidBasis: true,
      changesRequireWrittenAgreement: true
    }
  };
  const contractCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "paid_medical_services_contract",
      payload: contractPayload
    }
  });
  assert(contractCreateResponse.statusCode === 201, `contract create failed: ${contractCreateResponse.statusCode} ${contractCreateResponse.body}`);
  const contractIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${contractCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { note: "contract chain" } })
  });
  assert(contractIssueResponse.statusCode === 200, `contract issue failed: ${contractIssueResponse.statusCode} ${contractIssueResponse.body}`);
  const issuedContract = contractIssueResponse.json();

  const actPayload = {
    completedWorksAct: {
      actNumber: "ACT-CHAIN-001",
      actDate: "2026-05-20",
      contractNumber: "DPMU-CHAIN-001 от 2026-05-20",
      linkedContractDocumentId: "77777777-7777-4777-8777-777777777777",
      servicePeriodStart: "2026-05-20 10:00",
      servicePeriodEnd: "2026-05-20 11:10",
      doctorFullName: "Doctor",
      acceptedServicesSummary: "Фактически оказанные и оплаченные стоматологические услуги по активному визиту.",
      totalByActRub: 3000,
      paidRub: 3000,
      fiscalReceiptNumbers: ["FN-2026-000001"],
      patientClaimsText: null,
      linkedToSignedContract: true,
      finalServiceScopeConfirmed: true,
      fiscalReceiptsVerified: true,
      patientAcceptedWorks: true
    }
  };
  const wrongLinkedActResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "completed_works_act",
      payload: actPayload
    }
  });
  assert(wrongLinkedActResponse.statusCode === 201, `wrong-linked act create failed: ${wrongLinkedActResponse.statusCode}`);
  const wrongLinkedActIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${wrongLinkedActResponse.json().id}/issue`
  });
  assert(wrongLinkedActIssueResponse.statusCode === 409, "act without exact issued contract link must be blocked");
  const wrongLinkedActIssueError = documentErrorText(wrongLinkedActIssueResponse);
  assert(wrongLinkedActIssueError.includes("договор"), `act contract block must mention contract: ${wrongLinkedActIssueError}`);

  const linkedActResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "completed_works_act",
      payload: {
        completedWorksAct: {
          ...actPayload.completedWorksAct,
          actNumber: "ACT-CHAIN-002",
          linkedContractDocumentId: issuedContract.id
        }
      }
    }
  });
  assert(linkedActResponse.statusCode === 201, `linked act create failed: ${linkedActResponse.statusCode} ${linkedActResponse.body}`);
  const linkedActIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${linkedActResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { note: "linked act chain" } })
  });
  assert(linkedActIssueResponse.statusCode === 200, `linked act issue failed: ${linkedActIssueResponse.statusCode} ${linkedActIssueResponse.body}`);

  const releasePayload = {
    medicalDocumentReleaseReceipt: {
      sourceRequestDocumentId: "77777777-7777-4777-8777-777777777777",
      recipientFullName: "Иванова Марина Сергеевна",
      recipientIdentityDocument: "паспорт РФ 3600 000000",
      recipientAuthority: "лично пациенту",
      releaseChannel: "pdf",
      documentTypes: ["Выписка из медицинской карты"],
      periodStart: "2026-05-01",
      periodEnd: "2026-05-20",
      deliveredAt: "2026-05-20T12:00:00.000+04:00",
      accessExpiresAt: null,
      deliveryProtectionNote: "Выдача через защищенный канал после проверки личности",
      thirdPartyDataChecked: true
    }
  };

  const releaseCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "medical_document_release_receipt",
      payload: releasePayload
    }
  });
  assert(releaseCreateResponse.statusCode === 201, `release receipt create failed: ${releaseCreateResponse.statusCode}`);
  const releaseDocument = releaseCreateResponse.json();

  const releaseWithoutRequestResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${releaseDocument.id}/issue`
  });
  assert(
    releaseWithoutRequestResponse.statusCode === 409,
    `release receipt without copy request must be blocked: ${releaseWithoutRequestResponse.statusCode}`
  );
  assert(documentErrorText(releaseWithoutRequestResponse).includes("запрос"), "release receipt block must explain missing copy request");

  const copyRequestPayload = {
    medicalRecordCopyRequest: {
      requestedDocumentTypes: ["Выписка из медицинской карты", "Копия снимков или архив исходных снимков"],
      periodStart: "2026-05-01",
      periodEnd: "2026-05-20",
      requestedFormat: "pdf",
      recipientFullName: "Иванова Марина Сергеевна",
      recipientIdentityDocument: "паспорт РФ 3600 000000",
      recipientAuthority: "лично пациенту",
      representativeAuthorityDocument: null,
      requestedAt: "2026-05-20T11:00:00.000+04:00",
      contactForDelivery: "+7 900 000-00-00",
      specialInstructions: "Выдать только после проверки личности",
      includeDicomSourceData: true,
      identityVerified: true,
      thirdPartyDataExclusionAcknowledged: true
    }
  };

  const invalidCopyRequestDateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "medical_record_copy_request",
      payload: {
        medicalRecordCopyRequest: {
          ...copyRequestPayload.medicalRecordCopyRequest,
          periodStart: "2026-02-31",
          requestedAt: "2026-05-20T11:01:00.000+04:00"
        }
      }
    }
  });
  assert(
    invalidCopyRequestDateResponse.statusCode === 201,
    `invalid-date copy request draft create failed: ${invalidCopyRequestDateResponse.statusCode}`
  );
  const invalidCopyRequestDateIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${invalidCopyRequestDateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: "Иванова Марина Сергеевна", note: "invalid copy date" } })
  });
  assert(
    invalidCopyRequestDateIssueResponse.statusCode === 409,
    `copy request with invalid dates must be blocked: ${invalidCopyRequestDateIssueResponse.statusCode}`
  );
  assert(
    documentErrorText(invalidCopyRequestDateIssueResponse).toLowerCase().includes("дат"),
    "copy request invalid-date block must mention dates"
  );

  const copyRequestResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "medical_record_copy_request",
      payload: copyRequestPayload
    }
  });
  assert(copyRequestResponse.statusCode === 201, `copy request create failed: ${copyRequestResponse.statusCode}`);
  const issuedCopyRequestId = copyRequestResponse.json().id;
  const copyRequestIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${issuedCopyRequestId}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: "Иванова Марина Сергеевна", note: "copy request chain" } })
  });
  assert(copyRequestIssueResponse.statusCode === 200, `copy request issue failed: ${copyRequestIssueResponse.statusCode}`);
  const issuedCopyRequest = copyRequestIssueResponse.json();
  assert(issuedCopyRequest.releaseJournalEntry?.entryKind === "request_registered", "copy request issue must write release journal entry");
  assertReleaseJournalHash(issuedCopyRequest, "copy request issue");
  assert(
    typeof issuedCopyRequest.issuedSnapshotSha256 === "string" && sha256Pattern.test(issuedCopyRequest.issuedSnapshotSha256),
    "copy request issue must write immutable issued snapshot sha256"
  );

  const releaseWithInvalidDateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "medical_document_release_receipt",
      payload: {
        medicalDocumentReleaseReceipt: {
          ...releasePayload.medicalDocumentReleaseReceipt,
          sourceRequestDocumentId: issuedCopyRequestId,
          periodStart: "2026-02-31",
          deliveredAt: "2026-05-20T12:02:00.000+04:00"
        }
      }
    }
  });
  assert(
    releaseWithInvalidDateResponse.statusCode === 201,
    `invalid-date release draft create failed: ${releaseWithInvalidDateResponse.statusCode}`
  );
  const releaseWithInvalidDateIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${releaseWithInvalidDateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: "Иванова Марина Сергеевна", note: "invalid release date" } })
  });
  assert(
    releaseWithInvalidDateIssueResponse.statusCode === 409,
    `release receipt with invalid dates must be blocked: ${releaseWithInvalidDateIssueResponse.statusCode}`
  );
  assert(
    documentErrorText(releaseWithInvalidDateIssueResponse).toLowerCase().includes("дат"),
    "release receipt invalid-date block must mention dates"
  );

  const releaseWithExtraTypeResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "medical_document_release_receipt",
      payload: {
        medicalDocumentReleaseReceipt: {
          ...releasePayload.medicalDocumentReleaseReceipt,
          sourceRequestDocumentId: issuedCopyRequestId,
          documentTypes: [
            ...releasePayload.medicalDocumentReleaseReceipt.documentTypes,
            "Не запрошенная копия полной медицинской карты"
          ],
          deliveredAt: "2026-05-20T12:10:00.000+04:00"
        }
      }
    }
  });
  assert(releaseWithExtraTypeResponse.statusCode === 201, `broad release create failed: ${releaseWithExtraTypeResponse.statusCode}`);
  const broadReleaseIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${releaseWithExtraTypeResponse.json().id}/issue`
  });
  assert(
    broadReleaseIssueResponse.statusCode === 409,
    `release receipt with unrequested document type must be blocked: ${broadReleaseIssueResponse.statusCode}`
  );

  const releaseWithWrongFormatResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "medical_document_release_receipt",
      payload: {
        medicalDocumentReleaseReceipt: {
          ...releasePayload.medicalDocumentReleaseReceipt,
          sourceRequestDocumentId: issuedCopyRequestId,
          releaseChannel: "paper",
          deliveredAt: "2026-05-20T12:20:00.000+04:00"
        }
      }
    }
  });
  assert(releaseWithWrongFormatResponse.statusCode === 201, `wrong-format release create failed: ${releaseWithWrongFormatResponse.statusCode}`);
  const wrongFormatReleaseIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${releaseWithWrongFormatResponse.json().id}/issue`
  });
  assert(
    wrongFormatReleaseIssueResponse.statusCode === 409,
    `release receipt with wrong channel must be blocked: ${wrongFormatReleaseIssueResponse.statusCode}`
  );

  const releaseWithWrongAuthorityResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "medical_document_release_receipt",
      payload: {
        medicalDocumentReleaseReceipt: {
          ...releasePayload.medicalDocumentReleaseReceipt,
          sourceRequestDocumentId: issuedCopyRequestId,
          recipientAuthority: "Ð´Ð¾Ð²ÐµÑ€ÐµÐ½Ð½Ð¾Ðµ Ð»Ð¸Ñ†Ð¾ Ð±ÐµÐ· ÑÐ¾Ð²Ð¿Ð°Ð´Ð°ÑŽÑ‰ÐµÐ³Ð¾ Ð·Ð°Ð¿Ñ€Ð¾ÑÐ°",
          deliveredAt: "2026-05-20T12:25:00.000+04:00"
        }
      }
    }
  });
  assert(releaseWithWrongAuthorityResponse.statusCode === 201, `wrong-authority release create failed: ${releaseWithWrongAuthorityResponse.statusCode}`);
  const wrongAuthorityReleaseIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${releaseWithWrongAuthorityResponse.json().id}/issue`
  });
  assert(
    wrongAuthorityReleaseIssueResponse.statusCode === 409,
    `release receipt with wrong recipient authority must be blocked: ${wrongAuthorityReleaseIssueResponse.statusCode}`
  );

  const readableRecipientName = "Иванова Марина Сергеевна";
  const readableRecipientAuthority = "лично пациенту";
  const repairedReleaseResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "medical_document_release_receipt",
      payload: {
        medicalDocumentReleaseReceipt: {
          ...releasePayload.medicalDocumentReleaseReceipt,
          sourceRequestDocumentId: issuedCopyRequestId,
          recipientFullName: cp1252Mojibake(readableRecipientName),
          recipientAuthority: cp1252Mojibake(readableRecipientAuthority),
          deliveredAt: "2026-05-20T12:27:00.000+04:00"
        }
      }
    }
  });
  assert(repairedReleaseResponse.statusCode === 201, `repaired release create failed: ${repairedReleaseResponse.statusCode}`);
  const repairedReleaseDraft = repairedReleaseResponse.json();
  const repairedReleaseIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${repairedReleaseDraft.id}/issue`,
    payload: issueAttestation({
      signatureAttestation: {
        recipientFullName: cp1252Mojibake(readableRecipientName),
        staffFullName: cp1252Mojibake("Главный врач"),
        staffRole: cp1252Mojibake("главный врач"),
        note: cp1252Mojibake("отметка получена")
      }
    })
  });
  assert(
    repairedReleaseIssueResponse.statusCode === 200,
    `repaired release issue failed: ${repairedReleaseIssueResponse.statusCode} ${repairedReleaseIssueResponse.body}`
  );
  const repairedIssuedRelease = repairedReleaseIssueResponse.json();
  assertReadableRussian(
    repairedIssuedRelease.signatureAttestation?.recipientFullName,
    readableRecipientName,
    "issued signature recipient full name"
  );
  assertReadableRussian(repairedIssuedRelease.signatureAttestation?.staffFullName, "Главный врач", "issued signature staff full name");
  assertReadableRussian(repairedIssuedRelease.signatureAttestation?.note, "отметка получена", "issued signature note");
  assertReadableRussian(
    repairedIssuedRelease.releaseJournalEntry?.recipientAuthority,
    readableRecipientAuthority,
    "issued release journal recipient authority"
  );
  const repairedReleaseAuditResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${repairedIssuedRelease.id}/audit-facts`
  });
  assert(repairedReleaseAuditResponse.statusCode === 200, "repaired release audit facts must load");
  const repairedReleaseAuditFacts = repairedReleaseAuditResponse.json();
  assertReadableRussian(
    repairedReleaseAuditFacts.releaseJournalEntry?.recipientAuthority,
    readableRecipientAuthority,
    "audit release journal recipient authority"
  );
  assertReadableRussian(
    repairedReleaseAuditFacts.signatureAttestation?.recipientFullName,
    readableRecipientName,
    "audit signature recipient full name"
  );
  const repairedReleaseHtmlResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${repairedIssuedRelease.id}/html?download=1`
  });
  assert(repairedReleaseHtmlResponse.statusCode === 200, "repaired release archived HTML must load");
  assert(
    repairedReleaseHtmlResponse.body.includes(readableRecipientAuthority) &&
      repairedReleaseHtmlResponse.body.includes(readableRecipientName),
    "repaired release archived HTML must contain readable recipient facts"
  );
  assert(!hasMojibakeMarker(repairedReleaseHtmlResponse.body), "repaired release archived HTML must not contain mojibake markers");

  const linkedReleaseResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "medical_document_release_receipt",
      payload: {
        medicalDocumentReleaseReceipt: {
          ...releasePayload.medicalDocumentReleaseReceipt,
          sourceRequestDocumentId: issuedCopyRequestId,
          deliveredAt: "2026-05-20T12:30:00.000+04:00"
        }
      }
    }
  });
  assert(linkedReleaseResponse.statusCode === 201, `linked release create failed: ${linkedReleaseResponse.statusCode}`);
  const releaseAfterRequestResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${linkedReleaseResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: "Иванова Марина Сергеевна", note: "release receipt chain" } })
  });
  assert(releaseAfterRequestResponse.statusCode === 200, `release receipt after request failed: ${releaseAfterRequestResponse.statusCode}`);
  const issuedReleaseReceipt = releaseAfterRequestResponse.json();
  assert(
    issuedReleaseReceipt.releaseJournalEntry?.entryKind === "release_completed",
    "release receipt issue must write release-completed journal entry"
  );
  const releaseReceiptSourceHash = assertReleaseJournalHash(issuedReleaseReceipt, "release receipt issue");
  assert(
    releaseReceiptSourceHash === issuedCopyRequest.issuedSnapshotSha256,
    "release receipt journal must point to the issued source copy-request snapshot sha256"
  );

  function outpatient025uPayload(overrides = {}) {
    const base = {
      formNumber: "025/у",
      sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н",
      medicalOrganizationName: "ООО ДЕНТЕ Чейн",
      medicalOrganizationAddress: "Самара, тестовая улица, 1",
      medicalOrganizationOgrnOrOgrnip: "1236300000000",
      medicalOrganizationLicense: "L041-01184-63/00000000",
      medicalCardNumber: "025U-CHAIN-001",
      openedAt: "2026-05-01",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-20",
      sourceVisitIds: [activeVisit.id],
      patientFullName: "Patient",
      patientBirthDate: "1988-02-03",
      patientSexCode: "1",
      citizenship: "Российская Федерация",
      identityDocument: "паспорт 36 00 123456",
      identityDocumentSeries: "36 00",
      identityDocumentNumber: "123456",
      patientPhone: "+7 900 000-00-00",
      patientEmail: null,
      registrationAddress: "Самара, улица пациента, 2",
      registrationUrbanRuralCode: "1",
      stayAddress: "Самара, улица пациента, 2",
      stayUrbanRuralCode: "1",
      omsPolicy: "1234567890123456",
      omsIssuedAt: "2020-01-01",
      insurerName: "Тестовая страховая",
      snils: "123-456-789 00",
      socialSupportCode: null,
      healthStatusDisclosureContact: "+7 900 000-00-02",
      employmentCode: "работает",
      disabilityGroup: null,
      workOrStudyPlace: "ООО Тест",
      palliativeCareNeedCode: null,
      bloodGroup: "A(II)",
      rhFactor: "Rh+",
      kellK1: "K-",
      otherBloodData: null,
      allergyHistory: "Аллергии на лекарства со слов пациента не отмечены",
      chronicDispensaryRegister: [],
      finalDiagnoses: [
        {
          date: "2026-05-20",
          diagnosis: "Кариес дентина 36 зуба.",
          icd10Code: "K02.1",
          firstOrRepeat: "unknown",
          doctorFullName: "Doctor",
          doctorPosition: "врач-стоматолог",
          doctorSpecialty: "терапевтическая стоматология"
        }
      ],
      specialistVisitRecords: [
        {
          sourceVisitId: activeVisit.id,
          visitDate: "2026-05-20",
          location: "DENTE Chain Clinic",
          doctorFullName: "Doctor",
          doctorPosition: "врач-стоматолог",
          doctorSpecialty: "терапевтическая стоматология",
          firstOrRepeat: "repeat",
          complaints: "Боль при накусывании в области 36 зуба.",
          anamnesis: "Анамнез собран со слов пациента.",
          objectiveData: "Кариозная полость 36 зуба.",
          primaryDiagnosis: "Кариес дентина 36 зуба",
          primaryDiagnosisIcd10: "K02.1",
          complications: null,
          comorbidities: null,
          externalCause: null,
          healthGroup: null,
          dispensaryObservation: null,
          orders: "Контрольный осмотр по записи.",
          treatmentProvided: "Проведено терапевтическое лечение 36 зуба.",
          medicinesAndPhysiotherapy: null,
          sickLeaveOrCertificate: null,
          preferentialPrescriptions: null,
          informedConsentOrRefusal: "Информированное согласие проверено.",
          clinicalToothRows: sampleClinicalToothRows
        }
      ],
      dynamicObservationRecords: [],
      stageEpicrisisRecords: [],
      departmentHeadConsultations: [],
      medicalCommissionRecords: [],
      dispensaryObservationEntries: [],
      hospitalizationRows: [],
      ambulatorySurgeryRows: [],
      xrayDoseRows: [],
      functionalResults: [],
      laboratoryResults: [],
      finalEpicrisis: "Лечение завершено.",
      preparedFromSignedMedicalRecords: true,
      officialForm274nChecked: true,
      thirdPartyDataChecked: true
    };
    return {
      outpatientMedicalCard025u: {
        ...base,
        ...overrides,
        specialistVisitRecords:
          overrides.specialistVisitRecords ??
          base.specialistVisitRecords.map((record) => ({
            ...record,
            sourceVisitId: overrides.sourceVisitIds?.[0] ?? record.sourceVisitId,
            visitDate: overrides.periodEnd ?? record.visitDate
          }))
      }
    };
  }

  const draftSourceCardResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "outpatient_medical_card_025u",
      payload: outpatient025uPayload()
    }
  });
  assert(draftSourceCardResponse.statusCode === 201, `draft-source 025/u create failed: ${draftSourceCardResponse.statusCode}`);
  const draftSourceCardIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${draftSourceCardResponse.json().id}/issue`
  });
  assert(
    draftSourceCardIssueResponse.statusCode === 409,
    `025/u from unsigned source visit must be blocked: ${draftSourceCardIssueResponse.statusCode}`
  );
  assert(documentErrorText(draftSourceCardIssueResponse).includes("подпис"), "025/u block must require signed source visits");

  const draftSourceExtractResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "medical_record_extract",
      payload: {
        medicalRecordExtract: {
          periodStart: "2026-05-01",
          periodEnd: "2026-05-20",
          sourceVisitIds: [activeVisit.id],
          complaintAndAnamnesis: "Source visit is still a draft.",
          objectiveStatus: "Source visit is still a draft.",
          diagnosis: "Source visit is still a draft.",
          clinicalToothRows: sampleClinicalToothRows,
          treatmentProvided: "Source visit is still a draft.",
          recommendations: "Source visit is still a draft.",
          doctorFullName: "Doctor",
          recipientFullName: "Patient",
          recipientAuthority: "patient",
          issuedAt: "2026-05-20T12:05:00.000+04:00",
          preparedFromSignedMedicalRecords: true,
          thirdPartyDataChecked: true
        }
      }
    }
  });
  assert(draftSourceExtractResponse.statusCode === 201, `draft-source extract create failed: ${draftSourceExtractResponse.statusCode}`);
  const draftSourceExtractIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${draftSourceExtractResponse.json().id}/issue`
  });
  assert(
    draftSourceExtractIssueResponse.statusCode === 409,
    `extract from unsigned source visit must be blocked: ${draftSourceExtractIssueResponse.statusCode}`
  );
  assert(documentErrorText(draftSourceExtractIssueResponse).includes("подпис"), "extract block must require signed source visits");

  activeVisit.status = "signed";
  const validSignedSourceCardResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "outpatient_medical_card_025u",
      payload: outpatient025uPayload()
    }
  });
  assert(
    validSignedSourceCardResponse.statusCode === 201,
    `valid signed-source 025/u create failed: ${validSignedSourceCardResponse.statusCode} ${validSignedSourceCardResponse.body}`
  );
  const validSignedSourceCardIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${validSignedSourceCardResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: "Patient", note: "signed source 025/u" } })
  });
  assert(
    validSignedSourceCardIssueResponse.statusCode === 200,
    `valid signed-source 025/u issue failed: ${validSignedSourceCardIssueResponse.statusCode} ${validSignedSourceCardIssueResponse.body}`
  );

  const signedSourceExtractPayload = {
    medicalRecordExtract: {
      periodStart: "2026-05-01",
      periodEnd: "2026-05-20",
      sourceVisitIds: [activeVisit.id],
      complaintAndAnamnesis: "Signed source visit complaint and anamnesis.",
      objectiveStatus: "Signed source visit objective status.",
      diagnosis: "Signed source visit diagnosis.",
      clinicalToothRows: sampleClinicalToothRows,
      treatmentProvided: "Signed source visit treatment.",
      recommendations: "Signed source visit recommendations.",
      doctorFullName: "Doctor",
      recipientFullName: "Patient",
      recipientAuthority: "patient",
      issuedAt: "2026-05-20T12:07:00.000+04:00",
      preparedFromSignedMedicalRecords: true,
      thirdPartyDataChecked: true
    }
  };
  const validSignedSourceExtractResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "medical_record_extract",
      payload: signedSourceExtractPayload
    }
  });
  assert(
    validSignedSourceExtractResponse.statusCode === 201,
    `valid signed-source extract create failed: ${validSignedSourceExtractResponse.statusCode} ${validSignedSourceExtractResponse.body}`
  );
  const validSignedSourceExtractIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${validSignedSourceExtractResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: "Patient", note: "signed source extract" } })
  });
  assert(
    validSignedSourceExtractIssueResponse.statusCode === 200,
    `valid signed-source extract issue failed: ${validSignedSourceExtractIssueResponse.statusCode} ${validSignedSourceExtractIssueResponse.body}`
  );
  const issuedExtract = validSignedSourceExtractIssueResponse.json();
  assert(
    issuedExtract.releaseJournalEntry?.entryKind === "extract_issued",
    "medical extract issue must write extract release journal entry"
  );
  assertReleaseJournalHash(issuedExtract, "medical extract issue");

  const invalidDateExtractResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "medical_record_extract",
      payload: {
        medicalRecordExtract: {
          ...signedSourceExtractPayload.medicalRecordExtract,
          periodStart: "2026-02-31",
          issuedAt: "2026-05-20T12:08:00.000+04:00"
        }
      }
    }
  });
  assert(invalidDateExtractResponse.statusCode === 201, `invalid-date extract create failed: ${invalidDateExtractResponse.statusCode}`);
  const invalidDateExtractIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${invalidDateExtractResponse.json().id}/issue`
  });
  assert(
    invalidDateExtractIssueResponse.statusCode === 409,
    `extract with invalid dates must be blocked: ${invalidDateExtractIssueResponse.statusCode}`
  );
  assert(
    documentErrorText(invalidDateExtractIssueResponse).toLowerCase().includes("дат"),
    "extract invalid-date block must mention dates"
  );

  const invalidDateCardResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "outpatient_medical_card_025u",
      payload: outpatient025uPayload({ periodStart: "2026-02-31" })
    }
  });
  assert(invalidDateCardResponse.statusCode === 201, `invalid-date 025/u create failed: ${invalidDateCardResponse.statusCode}`);
  const invalidDateCardIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${invalidDateCardResponse.json().id}/issue`
  });
  assert(
    invalidDateCardIssueResponse.statusCode === 409,
    `025/u with invalid dates must be blocked: ${invalidDateCardIssueResponse.statusCode}`
  );
  assert(documentErrorText(invalidDateCardIssueResponse).toLowerCase().includes("дат"), "025/u invalid-date block must mention dates");

  const reversedPeriodExtractResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "medical_record_extract",
      payload: {
        medicalRecordExtract: {
          ...signedSourceExtractPayload.medicalRecordExtract,
          periodStart: "2026-05-20",
          periodEnd: "2026-05-01",
          issuedAt: "2026-05-20T12:08:00.000+04:00"
        }
      }
    }
  });
  assert(reversedPeriodExtractResponse.statusCode === 201, `reversed-period extract create failed: ${reversedPeriodExtractResponse.statusCode}`);
  const reversedPeriodExtractIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${reversedPeriodExtractResponse.json().id}/issue`
  });
  assert(
    reversedPeriodExtractIssueResponse.statusCode === 409,
    `extract with reversed period must be blocked: ${reversedPeriodExtractIssueResponse.statusCode}`
  );
  assert(documentErrorText(reversedPeriodExtractIssueResponse).toLowerCase().includes("период"), "extract reversed-period block must mention period");

  const reversedPeriodCardResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "outpatient_medical_card_025u",
      payload: outpatient025uPayload({ periodStart: "2026-05-20", periodEnd: "2026-05-01" })
    }
  });
  assert(reversedPeriodCardResponse.statusCode === 201, `reversed-period 025/u create failed: ${reversedPeriodCardResponse.statusCode}`);
  const reversedPeriodCardIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${reversedPeriodCardResponse.json().id}/issue`
  });
  assert(
    reversedPeriodCardIssueResponse.statusCode === 409,
    `025/u with reversed period must be blocked: ${reversedPeriodCardIssueResponse.statusCode}`
  );
  assert(documentErrorText(reversedPeriodCardIssueResponse).toLowerCase().includes("период"), "025/u reversed-period block must mention period");

  const outsidePeriodExtractResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "medical_record_extract",
      payload: {
        medicalRecordExtract: {
          ...signedSourceExtractPayload.medicalRecordExtract,
          periodStart: "2026-05-13",
          periodEnd: "2026-05-20",
          issuedAt: "2026-05-20T12:09:00.000+04:00"
        }
      }
    }
  });
  assert(outsidePeriodExtractResponse.statusCode === 201, `outside-period extract create failed: ${outsidePeriodExtractResponse.statusCode}`);
  const outsidePeriodExtractIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${outsidePeriodExtractResponse.json().id}/issue`
  });
  assert(
    outsidePeriodExtractIssueResponse.statusCode === 409,
    `extract with source visit outside period must be blocked: ${outsidePeriodExtractIssueResponse.statusCode}`
  );
  assert(documentErrorText(outsidePeriodExtractIssueResponse).toLowerCase().includes("период"), "extract outside-period block must mention period");

  const outsidePeriodCardResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "outpatient_medical_card_025u",
      payload: outpatient025uPayload({ periodStart: "2026-05-13", periodEnd: "2026-05-20" })
    }
  });
  assert(outsidePeriodCardResponse.statusCode === 201, `outside-period 025/u create failed: ${outsidePeriodCardResponse.statusCode}`);
  const outsidePeriodCardIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${outsidePeriodCardResponse.json().id}/issue`
  });
  assert(
    outsidePeriodCardIssueResponse.statusCode === 409,
    `025/u with source visit outside period must be blocked: ${outsidePeriodCardIssueResponse.statusCode}`
  );
  assert(documentErrorText(outsidePeriodCardIssueResponse).toLowerCase().includes("период"), "025/u outside-period block must mention period");

  const extractResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: activeVisit.id,
      kind: "medical_record_extract",
      payload: {
        medicalRecordExtract: {
          periodStart: "2026-05-01",
          periodEnd: "2026-05-20",
          sourceVisitIds: ["11111111-1111-4111-8111-111111111111"],
          complaintAndAnamnesis: "Жалобы и анамнез перенесены из подписанной карты.",
          objectiveStatus: "Объективный статус перенесен из подписанной карты.",
          diagnosis: "Диагноз перенесен из подписанной карты.",
          clinicalToothRows: sampleClinicalToothRows,
          treatmentProvided: "Лечение перенесено из подписанной карты.",
          recommendations: "Рекомендации перенесены из подписанной карты.",
          doctorFullName: "Иванова Марина Сергеевна",
          recipientFullName: "Иванова Марина Сергеевна",
          recipientAuthority: "лично пациенту",
          issuedAt: "2026-05-20T12:10:00.000+04:00",
          preparedFromSignedMedicalRecords: true,
          thirdPartyDataChecked: true
        }
      }
    }
  });
  assert(extractResponse.statusCode === 201, `extract create failed: ${extractResponse.statusCode}`);
  const extractIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${extractResponse.json().id}/issue`
  });
  assert(extractIssueResponse.statusCode === 409, `extract with invalid source visits must be blocked: ${extractIssueResponse.statusCode}`);
  assert(documentErrorText(extractIssueResponse).includes("исходных приемов"), "extract block must explain invalid source visits");

  console.log(
    JSON.stringify({
      ok: true,
      releaseReceiptChain: true,
      releaseReceiptScopeGuard: true,
      extractSourceGuard: true,
      extractSignedSourceGuard: true,
      releaseJournalEntry: true,
      extractPeriodGuard: true,
      extractSourcePeriodGuard: true,
      copyRequestDateGuard: true,
      releaseReceiptDateGuard: true,
      extractDateGuard: true,
      outpatient025uSignedSourceGuard: true,
      outpatient025uDateGuard: true,
      outpatient025uSourcePeriodGuard: true
    })
  );
} finally {
  activeVisit.status = originalActiveVisitStatus;
  await app.close();
  rmSync(tempRoot, { recursive: true, force: true });
}
