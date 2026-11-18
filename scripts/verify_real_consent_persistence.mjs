import { db } from "../apps/api/src/db/client.js";
import * as schema from "../apps/api/src/db/schema.js";
import { withTenantCtx } from "../apps/api/src/db/rls.js";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== STEP 1: Logging in to Fastify API ===");
  const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const auth = await loginRes.json();
  console.log(`[AUTH OK] Staff: ${auth.user.fullName}, Role: ${auth.user.role}`);

  console.log("=== STEP 1.5: Fetching real patients from Fastify API ===");
  const defaultHeaders = {
    "Authorization": `Bearer ${auth.staffToken}`,
    "x-dente-clinic-token": auth.clinicToken,
    "x-dente-staff-token": auth.staffToken,
    "Cookie": `dente_clinic_token=${auth.clinicToken}; dente_staff_token=${auth.staffToken}`,
    "x-dente-admin-secret": "dente-admin-secret-2026",
  };

  const patientsRes = await fetch("http://127.0.0.1:4100/api/patients", {
    headers: defaultHeaders,
  });
  if (!patientsRes.ok) {
    throw new Error(`Failed to fetch patients: ${patientsRes.status} ${await patientsRes.text()}`);
  }
  const patients = await patientsRes.json();
  if (!Array.isArray(patients) || patients.length === 0) {
    throw new Error("No patients found in system!");
  }
  const targetPatient = patients[0];
  const patientId = targetPatient.id;
  const orgId = targetPatient.organizationId || "01a00000-0000-0000-0000-000000000000";
  console.log(`[TARGET PATIENT] Name: ${targetPatient.fullName}, ID: ${patientId}, OrgId: ${orgId}`);

  console.log("=== STEP 2: Creating signed informed consent document with vector signature ===");
  const sampleSignatureSvg = `<svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg"><path d="M 50 100 Q 120 20 200 80 T 350 70" fill="none" stroke="#0f766e" stroke-width="2.5"/></svg>`;
  
  const createRes = await fetch("http://127.0.0.1:4100/api/documents", {
    method: "POST",
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/json",
      "x-organization-id": orgId,
    },
    body: JSON.stringify({
      organizationId: orgId,
      patientId: patientId,
      kind: "informed_consent",
      title: "Информированное добровольное согласие на медицинское вмешательство (323-ФЗ)",
      totalAmountRub: 0,
      signatureSvg: sampleSignatureSvg,
      payload: {
        informedConsent: {
          intervention: "Первичный осмотр и комплексная диагностика полости рта",
          toothOrArea: "Полость рта в целом",
          diagnosisOrIndication: "Первичное клиническое обследование и составление комплексного плана санации",
          expectedBenefit: "Восстановление анатомической формы и функции зубочелюстной системы",
          plannedAnesthesia: "Местная инфильтрационная / проводниковая анестезия",
          materialOrMedicationNotes: null,
          trustedContactForMedicalInfo: null,
          explainedRisks: [
            "Возможная болезненность в зоне вмешательства",
            "Индивидуальная реакция на анестетик",
            "Отек мягких тканей в послеоперационном периоде",
          ],
          alternatives: [
            "Динамическое наблюдение",
            "Альтернативные методы ортопедического / терапевтического лечения",
          ],
          aftercareRequirements: [
            "Соблюдение гигиены полости рта",
            "Воздержание от приема пищи в течение 2 часов",
            "Явка на контрольный осмотр в назначенный срок",
          ],
          doctorFullName: auth.user.fullName,
          consentConfirmedAt: new Date().toISOString().slice(0, 10),
          patientQuestionsAnswered: true,
          patientUnderstandsRisks: true,
          patientMayWithdrawBeforeIntervention: true,
        },
      },
      signatureAttestation: {
        mode: "vector_tablet",
        signedAt: new Date().toISOString(),
        recipientFullName: "Иванова Марина Сергеевна",
        recipientRole: "пациент",
        staffFullName: auth.user.fullName,
        staffRole: "Врач-стоматолог",
        identityChecked: true,
        documentOpenedAndChecked: true,
        recipientSigned: true,
        clinicRepresentativeSigned: true,
        deviceFingerprint: "iPad-Pro-Safari-RedTeam-E2E",
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Create document failed: ${createRes.status} ${await createRes.text()}`);
  }
  const doc = await createRes.json();
  console.log(`[DOC CREATED] ID: ${doc.id}, Title: ${doc.title}, Status: ${doc.status}`);

  console.log("=== STEP 2.5: Ensuring clinic legal requisites in database ===");
  const profileRes = await fetch("http://127.0.0.1:4100/api/settings/clinic/profile", {
    method: "PUT",
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/json",
      "x-organization-id": orgId,
    },
    body: JSON.stringify({
      inn: "7801234567",
      medicalLicenseNumber: "ЛО-78-01-011223",
      medicalLicenseIssuedAt: "2020-01-15",
      medicalLicenseIssuer: "Комитет по здравоохранению",
      legalName: "ООО Стоматология ДЕНТЕ",
      address: "г. Санкт-Петербург, Невский пр., 1",
    }),
  });
  console.log(`[PROFILE UPDATE] Status: ${profileRes.status}`);

  console.log("=== STEP 3: Issuing the document (fixing snapshot & SHA-256) ===");
  const issueRes = await fetch(`http://127.0.0.1:4100/api/documents/${doc.id}/issue`, {
    method: "POST",
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/json",
      "x-organization-id": orgId,
    },
    body: JSON.stringify({
      signatureSvg: sampleSignatureSvg,
      signatureAttestation: {
        mode: "simple_electronic_signature",
        signedAt: new Date().toISOString(),
        recipientFullName: "Смирнова Анна Сергеевна",
        recipientRole: "пациент",
        staffFullName: auth.user.fullName,
        staffRole: "Врач-стоматолог",
        identityChecked: true,
        documentOpenedAndChecked: true,
        recipientSigned: true,
        clinicRepresentativeSigned: true,
      },
    }),
  });

  if (!issueRes.ok) {
    throw new Error(`Issue document failed: ${issueRes.status} ${await issueRes.text()}`);
  }
  const issuedDoc = await issueRes.json();
  console.log(`[DOC ISSUED] Status: ${issuedDoc.status}, SHA-256: ${issuedDoc.issuedSnapshotSha256}`);

  console.log("=== STEP 4: Directly verifying in PostgreSQL 18 table generated_documents ===");
  await withTenantCtx(orgId, async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.generatedDocuments)
      .where(eq(schema.generatedDocuments.id, doc.id));

    if (!row) {
      throw new Error(`Document ${doc.id} NOT found in PostgreSQL generated_documents!`);
    }

    console.log(`[POSTGRES VERIFIED]:`);
    console.log(`  - DB ID: ${row.id}`);
    console.log(`  - Status: ${row.status}`);
    console.log(`  - Kind: ${row.kind}`);
    console.log(`  - Title: ${row.title}`);
    console.log(`  - Has signature_svg: ${Boolean(row.signatureSvg)} (length: ${row.signatureSvg?.length})`);
    console.log(`  - Has SHA-256 hash: ${row.issuedSnapshotSha256}`);
    console.log(`  - Attestation mode: ${JSON.stringify(row.signatureAttestation?.mode)}`);
    console.log(`  - Attestation signedAt: ${row.signatureAttestation?.signedAt}`);
    
    if (!row.signatureSvg || !row.signatureSvg.includes("svg")) {
      throw new Error("signatureSvg was not properly persisted into PostgreSQL!");
    }
  });

  console.log("=== ALL END-TO-END VERIFICATION GATES PASSED (100% ZERO-MOCK REAL POSTGRESQL)! ===");
}

main().catch((err) => {
  console.error("FATAL ERROR in real consent persistence:", err);
  process.exit(1);
});
