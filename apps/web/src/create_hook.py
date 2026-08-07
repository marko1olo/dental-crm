import re

with open('C:/Clinic_MVP/dental-crm/apps/web/src/useAppLogic.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

def get_block(text, start_pattern, end_pattern):
    start_idx = text.find(start_pattern)
    if start_idx == -1: return ''
    end_idx = text.find(end_pattern, start_idx)
    if end_idx == -1: return ''
    return text[start_idx:end_idx + len(end_pattern)]

destructuring = get_block(text, 'const {\n\t\tdocumentCreateSavingKind,', '} = documentState;')
inner_destructuring = destructuring.split('const {')[1].split('} = documentState;')[0]

usememos = get_block(text, 'const activeDocuments = useMemo(() => {', '	}, [anesthesiaZone, inferredTreatmentArea, labTeethOrArea]);')
# Remove duplicate useMemos that are passed as props
usememos = re.sub(r'const activeTreatmentPlanItems = useMemo\(\(\) => \{.*?\n\t\}, \[dashboard, documentPatient\?\.id\]\);\n', '', usememos, flags=re.DOTALL)
usememos = re.sub(r'const activePayments = useMemo\(\(\) => \{.*?\n\t\}, \[dashboard, documentPatient\?\.id\]\);\n', '', usememos, flags=re.DOTALL)


helpers = get_block(text, 'function treatmentAcceptanceStageRows() {', '		};\n\t}')

api = get_block(text, 'function attendanceStartedAtValue(): string {', 'function documentKindsForCommunicationTask(')
api = api.rsplit('function documentKindsForCommunicationTask(', 1)[0]
api = re.sub(r'function renderClinicalToothRowsEditor\(\) \{.*?\n\t\}', '', api, flags=re.DOTALL)
api = re.sub(r'function changePostVisitCareTopic\(.*?\n\t\}', '', api, flags=re.DOTALL) # remove if exists

imports_block = get_block(text, 'import {', 'import { ClinicalRulePanel }')
imports_block = imports_block.replace('from "./', 'from "../../')

out_content = f"""{imports_block}
import {{ useDocumentStore }} from "../../store/documentStore";

export function useDocumentWorkflowModule({{
  dashboard,
  auth,
  activeDoctor,
  activePayments,
  activeTreatmentPlanItems,
  documentPatient,
  clinicProfileDraft,
  activeAppointment,
  visitNoteForm,
  clinicalAdminSecretSession,
  setError,
  loadDashboard,
  changePostVisitCareTopic,
  setCurrentView
}}: any) {{
  const documentState = useDocumentStore();
  const {{
    {inner_destructuring}
  }} = documentState;

  const releaseSourceRequestAutofillRef = useRef<string | null>(null);
  const taxPaymentSelectionHydratedKeyRef = useRef<string | null>(null);
  const paymentReceiptSelectionHydratedKeyRef = useRef<string | null>(null);
  const outpatient025uDraftHydratedKeyRef = useRef<string | null>(null);
  const medicalRecordExtractDraftHydratedKeyRef = useRef<string | null>(null);
  
  const documentPatientMatchesActiveVisit = dashboard?.activeVisit?.patientId === documentPatient?.id;

{usememos}
{helpers}
{api}

  return {{
    ...documentState,
    requestDocumentIssue,
    confirmDocumentIssue,
    requestDocumentVoid,
    confirmDocumentVoid,
    downloadTaxDocumentXml,
    loadDocumentAuditFacts,
    downloadIssuedDocumentHtml,
    openIssuedDocumentHtml,
    downloadIssuedDocumentPdf,
    documentIssueConfirmation,
    documentIssueAttestationReady,
    documentVoidConfirmation,
    documentVoidReady,
    activeDocuments,
    activeUsableDocuments,
    patientBillingSummary,
    taxDocumentPayerOptions,
    eligibleTaxPayments,
    eligiblePaymentReceiptPayments,
    installmentScheduleRemainingRubValue,
    completedActPaidRubValue,
    activeIssuedPaidContracts,
    issuedMedicalCopyRequestDocuments,
    outpatient025uDraftVisitId,
    medicalRecordExtractDraftVisitId,
    documentPatientMatchesActiveVisit,
  }};
}}
"""

with open('C:/Clinic_MVP/dental-crm/apps/web/src/hooks/domains/useDocumentWorkflowModule.ts', 'w', encoding='utf-8') as f:
    f.write(out_content)

print("Created useDocumentWorkflowModule.ts")
