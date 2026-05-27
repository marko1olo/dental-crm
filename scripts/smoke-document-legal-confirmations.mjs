import fs from "node:fs";

const appSource = [
  fs.readFileSync("apps/web/src/App.tsx", "utf8"),
  fs.readFileSync("apps/web/src/DocumentsView.tsx", "utf8")
].join("\n");
const sharedSource = fs.readFileSync("packages/shared/src/index.ts", "utf8");
const styleSource = fs.readFileSync("apps/web/src/styles/main.css", "utf8");

const requiredAppSnippets = [
  "const [informedConsentQuestionsAnswered, setInformedConsentQuestionsAnswered] = useState(false)",
  "checked={informedConsentQuestionsAnswered}",
  "patientQuestionsAnswered: confirmedDocumentLiteral(informedConsentQuestionsAnswered",
  "const [informedConsentRisksUnderstood, setInformedConsentRisksUnderstood] = useState(false)",
  "patientUnderstandsRisks: confirmedDocumentLiteral(informedConsentRisksUnderstood",
  "const [informedConsentWithdrawUnderstood, setInformedConsentWithdrawUnderstood] = useState(false)",
  "patientMayWithdrawBeforeIntervention: confirmedDocumentLiteral(informedConsentWithdrawUnderstood",
  "const [procedureConsentQuestionsAnswered, setProcedureConsentQuestionsAnswered] = useState(false)",
  "patientQuestionsAnswered: confirmedDocumentLiteral(procedureConsentQuestionsAnswered",
  "const [procedureConsentExactProcedureConfirmed, setProcedureConsentExactProcedureConfirmed] = useState(false)",
  "exactProcedureConfirmed: confirmedDocumentLiteral(procedureConsentExactProcedureConfirmed",
  "const [procedureConsentRisksUnderstood, setProcedureConsentRisksUnderstood] = useState(false)",
  "patientUnderstandsSpecificRisks: confirmedDocumentLiteral(procedureConsentRisksUnderstood",
  "const [anesthesiaRisksExplained, setAnesthesiaRisksExplained] = useState(false)",
  "patientAnesthesiaRisksExplained: confirmedDocumentLiteral(anesthesiaRisksExplained",
  "const [anesthesiaAllergyRestrictionsChecked, setAnesthesiaAllergyRestrictionsChecked] = useState(false)",
  "allergyAndRestrictionStatusChecked: confirmedDocumentLiteral(anesthesiaAllergyRestrictionsChecked",
  "const [anesthesiaConsentConfirmed, setAnesthesiaConsentConfirmed] = useState(false)",
  "patientConfirmedAnesthesiaConsent: confirmedDocumentLiteral(anesthesiaConsentConfirmed",
  "const [minorConsentIdentityVerified, setMinorConsentIdentityVerified] = useState(false)",
  "representativeIdentityVerified: confirmedDocumentLiteral(minorConsentIdentityVerified",
  "const [minorConsentAuthorityVerified, setMinorConsentAuthorityVerified] = useState(false)",
  "representativeAuthorityVerified: confirmedDocumentLiteral(minorConsentAuthorityVerified",
  "const [minorConsentExplained, setMinorConsentExplained] = useState(false)",
  "informedConsentExplained: confirmedDocumentLiteral(minorConsentExplained",
  "const [minorConsentStored, setMinorConsentStored] = useState(false)",
  "medicalRecordConsentStored: confirmedDocumentLiteral(minorConsentStored",
  "const [minorConsentAgeExplanation, setMinorConsentAgeExplanation] = useState(false)",
  "ageAppropriateExplanationGiven: confirmedDocumentLiteral(minorConsentAgeExplanation",
  "const [intakeAccuracyConfirmed, setIntakeAccuracyConfirmed] = useState(false)",
  "accuracyConfirmed: confirmedDocumentLiteral(intakeAccuracyConfirmed",
  "const [taxApplicationDuplicateWarningAccepted, setTaxApplicationDuplicateWarningAccepted] = useState(false)",
  "duplicateWarningAccepted: confirmedDocumentLiteral(taxApplicationDuplicateWarningAccepted",
  "const [photoVideoClinicalRecordUseConfirmed, setPhotoVideoClinicalRecordUseConfirmed] = useState(false)",
  "clinicalRecordUse: confirmedDocumentLiteral(photoVideoClinicalRecordUseConfirmed",
  "const [photoVideoAnonymizationConfirmed, setPhotoVideoAnonymizationConfirmed] = useState(false)",
  "anonymizationRequired: confirmedDocumentLiteral(photoVideoAnonymizationConfirmed",
  "const [personalDataVoluntaryConsentConfirmed, setPersonalDataVoluntaryConsentConfirmed] = useState(false)",
  "patientConfirmedVoluntaryConsent: confirmedDocumentLiteral(personalDataVoluntaryConsentConfirmed",
  "const [personalDataMedicalProcessingAcknowledged, setPersonalDataMedicalProcessingAcknowledged] = useState(false)",
  "medicalDataProcessingAcknowledged: confirmedDocumentLiteral(personalDataMedicalProcessingAcknowledged",
  "const [refusalConsequencesUnderstood, setRefusalConsequencesUnderstood] = useState(false)",
  "patientUnderstandsConsequences: confirmedDocumentLiteral(refusalConsequencesUnderstood",
  "const [refusalSecondOpinionOffered, setRefusalSecondOpinionOffered] = useState(false)",
  "secondOpinionOffered: confirmedDocumentLiteral(refusalSecondOpinionOffered",
  "const [refusalEmergencyCareExplained, setRefusalEmergencyCareExplained] = useState(false)",
  "emergencyCareExplained: confirmedDocumentLiteral(refusalEmergencyCareExplained",
  "const [paidContractClinicInfoConfirmed, setPaidContractClinicInfoConfirmed] = useState(false)",
  "patientReceivedClinicInfo: confirmedDocumentLiteral(paidContractClinicInfoConfirmed",
  "const [paidContractServiceListConfirmed, setPaidContractServiceListConfirmed] = useState(false)",
  "patientReceivedPriceAndServiceList: confirmedDocumentLiteral(paidContractServiceListConfirmed",
  "const [paidContractPaidBasisConfirmed, setPaidContractPaidBasisConfirmed] = useState(false)",
  "patientUnderstandsPaidBasis: confirmedDocumentLiteral(paidContractPaidBasisConfirmed",
  "const [paidContractWrittenChangesConfirmed, setPaidContractWrittenChangesConfirmed] = useState(false)",
  "changesRequireWrittenAgreement: confirmedDocumentLiteral(paidContractWrittenChangesConfirmed",
  "const [completedActLinkedContract, setCompletedActLinkedContract] = useState(false)",
  "linkedToSignedContract: confirmedDocumentLiteral(completedActLinkedContract",
  "const [completedActFinalScopeConfirmed, setCompletedActFinalScopeConfirmed] = useState(false)",
  "finalServiceScopeConfirmed: confirmedDocumentLiteral(completedActFinalScopeConfirmed",
  "const [completedActFiscalReceiptsVerified, setCompletedActFiscalReceiptsVerified] = useState(false)",
  "fiscalReceiptsVerified: confirmedDocumentLiteral(completedActFiscalReceiptsVerified",
  "const [completedActAccepted, setCompletedActAccepted] = useState(false)",
  "patientAcceptedWorks: confirmedDocumentLiteral(completedActAccepted",
  "const [copyRequestIdentityVerified, setCopyRequestIdentityVerified] = useState(false)",
  "identityVerified: confirmedDocumentLiteral(copyRequestIdentityVerified",
  "const [copyRequestThirdPartyDataChecked, setCopyRequestThirdPartyDataChecked] = useState(false)",
  "thirdPartyDataExclusionAcknowledged: confirmedDocumentLiteral(copyRequestThirdPartyDataChecked",
  "const [releaseThirdPartyDataChecked, setReleaseThirdPartyDataChecked] = useState(false)",
  "thirdPartyDataChecked: confirmedDocumentLiteral(releaseThirdPartyDataChecked",
  "const [documentIssueConfirmationId, setDocumentIssueConfirmationId] = useState<string | null>(null)",
  "const [documentIssueIdentityChecked, setDocumentIssueIdentityChecked] = useState(false)",
  "const [documentIssueDocumentOpenedAndChecked, setDocumentIssueDocumentOpenedAndChecked] = useState(false)",
  "const [documentIssueRecipientSigned, setDocumentIssueRecipientSigned] = useState(false)",
  "const [documentIssueClinicSigned, setDocumentIssueClinicSigned] = useState(false)",
  "const documentIssueAttestationReady = useMemo(() =>",
  "signatureAttestation",
  "identityChecked: true",
  "documentOpenedAndChecked: true",
  "recipientSigned: true",
  "clinicRepresentativeSigned: true",
  "disabled={!documentIssueAttestationReady || documentIssueSaving}",
  "const documentIssueConfirmation = useMemo(() =>",
  "function requestDocumentIssue(document: GeneratedDocument)",
  "async function confirmDocumentIssue()",
  "onClick={() => requestDocumentIssue(document)}",
  "role=\"dialog\" aria-label=\"Подтверждение выдачи документа\"",
  "Откройте HTML и проверьте пациента",
  "Проверить и выдать",
  "Выдать после проверки"
];

const forbiddenAppSnippets = [
  "patientQuestionsAnswered: true",
  "patientUnderstandsRisks: true",
  "patientMayWithdrawBeforeIntervention: true",
  "exactProcedureConfirmed: true",
  "patientUnderstandsSpecificRisks: true",
  "patientAnesthesiaRisksExplained: true",
  "allergyAndRestrictionStatusChecked: true",
  "patientConfirmedAnesthesiaConsent: true",
  "representativeIdentityVerified: true",
  "representativeAuthorityVerified: true",
  "informedConsentExplained: true",
  "medicalRecordConsentStored: true",
  "ageAppropriateExplanationGiven: true",
  "accuracyConfirmed: true",
  "duplicateWarningAccepted: true",
  "const [minorConsentIdentityVerified, setMinorConsentIdentityVerified] = useState(true)",
  "const [minorConsentAuthorityVerified, setMinorConsentAuthorityVerified] = useState(true)",
  "const [minorConsentExplained, setMinorConsentExplained] = useState(true)",
  "const [minorConsentStored, setMinorConsentStored] = useState(true)",
  "const [minorConsentAgeExplanation, setMinorConsentAgeExplanation] = useState(true)",
  "const [intakeAccuracyConfirmed, setIntakeAccuracyConfirmed] = useState(true)",
  "const [taxApplicationDuplicateWarningAccepted, setTaxApplicationDuplicateWarningAccepted] = useState(true)",
  "clinicalRecordUse: true",
  "anonymizationRequired: true",
  "patientConfirmedVoluntaryConsent: true",
  "medicalDataProcessingAcknowledged: true",
  "patientUnderstandsConsequences: true",
  "secondOpinionOffered: true",
  "emergencyCareExplained: true",
  "const [paidContractClinicInfoConfirmed, setPaidContractClinicInfoConfirmed] = useState(true)",
  "const [paidContractServiceListConfirmed, setPaidContractServiceListConfirmed] = useState(true)",
  "const [paidContractPaidBasisConfirmed, setPaidContractPaidBasisConfirmed] = useState(true)",
  "const [paidContractWrittenChangesConfirmed, setPaidContractWrittenChangesConfirmed] = useState(true)",
  "const [completedActLinkedContract, setCompletedActLinkedContract] = useState(true)",
  "const [completedActFinalScopeConfirmed, setCompletedActFinalScopeConfirmed] = useState(true)",
  "const [completedActFiscalReceiptsVerified, setCompletedActFiscalReceiptsVerified] = useState(true)",
  "const [completedActAccepted, setCompletedActAccepted] = useState(true)",
  "const [copyRequestIdentityVerified, setCopyRequestIdentityVerified] = useState(true)",
  "const [copyRequestThirdPartyDataChecked, setCopyRequestThirdPartyDataChecked] = useState(true)",
  "const [releaseThirdPartyDataChecked, setReleaseThirdPartyDataChecked] = useState(true)",
  "const [documentIssueIdentityChecked, setDocumentIssueIdentityChecked] = useState(true)",
  "const [documentIssueDocumentOpenedAndChecked, setDocumentIssueDocumentOpenedAndChecked] = useState(true)",
  "const [documentIssueRecipientSigned, setDocumentIssueRecipientSigned] = useState(true)",
  "const [documentIssueClinicSigned, setDocumentIssueClinicSigned] = useState(true)"
];

const requiredSharedSnippets = [
  "patientAnesthesiaRisksExplained: z.literal(true)",
  "allergyAndRestrictionStatusChecked: z.literal(true)",
  "patientConfirmedAnesthesiaConsent: z.literal(true)"
];

const requiredStyleSnippets = [
  ".document-issue-confirmation",
  ".document-issue-confirmation-actions"
];

const missing = [
  ...requiredAppSnippets.filter((snippet) => !appSource.includes(snippet)).map((snippet) => `app:${snippet}`),
  ...requiredSharedSnippets.filter((snippet) => !sharedSource.includes(snippet)).map((snippet) => `shared:${snippet}`),
  ...requiredStyleSnippets.filter((snippet) => !styleSource.includes(snippet)).map((snippet) => `style:${snippet}`)
];
const forbidden = forbiddenAppSnippets.filter((snippet) => appSource.includes(snippet));
if (/document\.status === "draft"[\s\S]{0,320}updateDocumentStatus\(document\.id, "issue"\)/.test(appSource)) {
  forbidden.push("draft document row directly calls updateDocumentStatus(document.id, \"issue\")");
}
const confirmedLiteralFields = [
  ...new Set(
    [...appSource.matchAll(/confirmedDocumentLiteral\((\w+)/g)]
      .filter((match) => !/function\s+$/.test(appSource.slice(Math.max(0, match.index - 16), match.index)))
      .map((match) => match[1])
  )
];
const missingExplicitFalseState = confirmedLiteralFields.filter((field) => {
  const pattern = new RegExp(`const \\[${field}, [^\\]]+\\] = useState\\(false\\)`);
  return !pattern.test(appSource);
});
const forbiddenTrueState = confirmedLiteralFields.filter((field) => {
  const pattern = new RegExp(`const \\[${field}, [^\\]]+\\] = useState\\(true\\)`);
  return pattern.test(appSource);
});

if (missing.length || forbidden.length || missingExplicitFalseState.length || forbiddenTrueState.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        missing,
        forbidden,
        missingExplicitFalseState,
        forbiddenTrueState
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "document legal confirmations are explicit UI controls",
      confirmedLiteralFields: confirmedLiteralFields.length
    },
    null,
    2
  )
);
