import type { Dashboard, Patient, PaymentMethod } from "@dental/shared";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import { FinanceLedger } from "./FinanceLedger";
import { FinancePlanningOverview, ServiceCatalogStrip } from "./FinancePlanning";
import { motionSafeScrollIntoView } from "./motionPreference";
import { PaymentCapture } from "./PaymentCapture";

type ClinicalRuleEvaluation = Dashboard["clinicalRuleEvaluations"][number];
type Payment = Dashboard["payments"][number];
type ServiceCatalogItem = Dashboard["serviceCatalog"][number];
type TreatmentPlanItem = Dashboard["treatmentPlanItems"][number];
type TreatmentPlanScenario = Dashboard["treatmentPlanScenarios"][number];
type TaxDeductionCode = "" | "1" | "2";

type FinanceViewProps = {
  activePayments: Payment[];
  activeTreatmentPlanItems: TreatmentPlanItem[];
  activeTreatmentPlanScenarios: TreatmentPlanScenario[];
  billingSummary: Dashboard["billingSummary"];
  clinicalRuleEvaluations: ClinicalRuleEvaluation[];
  clinicalRuleActionLabels: Record<ClinicalRuleEvaluation["action"], string>;
  clinicalRuleSeverityLabels: Record<ClinicalRuleEvaluation["severity"], string>;
  clinicalRuleSummary: Dashboard["clinicalRuleSummary"];
  dashboard: Dashboard;
  documentPatient: Patient | null;
  formatDateTime: (value: string) => string;
  isPaymentSaving: boolean;
  money: (value: number | null) => string;
  onGoToDocuments: () => void;
  onGoToPrices: () => void;
  onGoToVisit: () => void;
  onRecordPayment: () => void;
  paymentAmount: string;
  paymentFeedback: string;
  paymentFiscalCashierName: string;
  paymentFiscalFd: string;
  paymentFiscalFn: string;
  paymentFiscalFpd: string;
  paymentFiscalReceiptIssuedAt: string;
  paymentFiscalReceiptNumber: string;
  paymentFiscalReceiptUrl: string;
  paymentFiscalReceiptLabel: (payment: Pick<Payment, "id" | "fiscalReceiptNumber" | "fiscalReceipt">) => string;
  paymentMethod: PaymentMethod;
  paymentMethodLabels: Record<PaymentMethod, string>;
  paymentPatientContextMessage: string;
  paymentPatientContextReady: boolean;
  paymentPayerBirthDate: string;
  paymentPayerFullName: string;
  paymentPayerIdentityDocument: string;
  paymentPayerInn: string;
  paymentPayerRelationship: string;
  paymentTaxDeductionCode: TaxDeductionCode;
  scenarioPriorityLabels: Record<TreatmentPlanScenario["priority"], string>;
  scenarioStrategyLabels: Record<TreatmentPlanScenario["strategy"], string>;
  serviceCategoryLabels: Record<ServiceCatalogItem["category"], string>;
  serviceTitle: (serviceId: string) => string;
  setPaymentAmount: (value: string) => void;
  setPaymentFiscalCashierName: (value: string) => void;
  setPaymentFiscalFd: (value: string) => void;
  setPaymentFiscalFn: (value: string) => void;
  setPaymentFiscalFpd: (value: string) => void;
  setPaymentFiscalReceiptIssuedAt: (value: string) => void;
  setPaymentFiscalReceiptNumber: (value: string) => void;
  setPaymentFiscalReceiptUrl: (value: string) => void;
  setPaymentMethod: (value: PaymentMethod) => void;
  setPaymentPayerBirthDate: (value: string) => void;
  setPaymentPayerFullName: (value: string) => void;
  setPaymentPayerIdentityDocument: (value: string) => void;
  setPaymentPayerInn: (value: string) => void;
  setPaymentPayerRelationship: (value: string) => void;
  setPaymentTaxDeductionCode: (value: TaxDeductionCode) => void;
  staffRoleLabels: Record<ClinicalRuleEvaluation["ownerRole"], string>;
  treatmentStatusLabels: Record<TreatmentPlanItem["status"], string>;
};

export function FinanceView({
  activePayments,
  activeTreatmentPlanItems,
  activeTreatmentPlanScenarios,
  billingSummary,
  clinicalRuleEvaluations,
  clinicalRuleActionLabels,
  clinicalRuleSeverityLabels,
  clinicalRuleSummary,
  dashboard,
  documentPatient,
  formatDateTime,
  isPaymentSaving,
  money,
  onGoToDocuments,
  onGoToPrices,
  onGoToVisit,
  onRecordPayment,
  paymentAmount,
  paymentFeedback,
  paymentFiscalCashierName,
  paymentFiscalFd,
  paymentFiscalFn,
  paymentFiscalFpd,
  paymentFiscalReceiptIssuedAt,
  paymentFiscalReceiptNumber,
  paymentFiscalReceiptUrl,
  paymentFiscalReceiptLabel,
  paymentMethod,
  paymentMethodLabels,
  paymentPatientContextMessage,
  paymentPatientContextReady,
  paymentPayerBirthDate,
  paymentPayerFullName,
  paymentPayerIdentityDocument,
  paymentPayerInn,
  paymentPayerRelationship,
  paymentTaxDeductionCode,
  scenarioPriorityLabels,
  scenarioStrategyLabels,
  serviceCategoryLabels,
  serviceTitle,
  setPaymentAmount,
  setPaymentFiscalCashierName,
  setPaymentFiscalFd,
  setPaymentFiscalFn,
  setPaymentFiscalFpd,
  setPaymentFiscalReceiptIssuedAt,
  setPaymentFiscalReceiptNumber,
  setPaymentFiscalReceiptUrl,
  setPaymentMethod,
  setPaymentPayerBirthDate,
  setPaymentPayerFullName,
  setPaymentPayerIdentityDocument,
  setPaymentPayerInn,
  setPaymentPayerRelationship,
  setPaymentTaxDeductionCode,
  staffRoleLabels,
  treatmentStatusLabels
}: FinanceViewProps) {
  const focusPaymentCapture = () => {
    const amountInput = document.getElementById("payment-amount-input") as HTMLInputElement | null;
    const paymentCapture = document.getElementById("payment-capture");
    motionSafeScrollIntoView(amountInput ?? paymentCapture, { block: "center" });
    amountInput?.focus({ preventScroll: true });
  };

  return (
    <div className="panel finance-panel" id="finance">
      <div className="panel-heading">
        <div>
          <h2>Оплаты, план лечения и вычет</h2>
          <p className="finance-scope-label">
            Сводка по пациенту: {documentPatient?.fullName ?? "пациент не выбран"}
          </p>
        </div>
        <button className="text-button" type="button" onClick={onGoToDocuments}>
          Документы
        </button>
      </div>

      <FinancePlanningOverview
        activePaymentsCount={activePayments.length}
        billingSummary={billingSummary}
        money={money}
        onGoToVisit={onGoToVisit}
        priorityLabels={scenarioPriorityLabels}
        scenarios={activeTreatmentPlanScenarios}
        strategyLabels={scenarioStrategyLabels}
      />

      <ClinicalRulePanel
        actionLabels={clinicalRuleActionLabels}
        context="finance"
        evaluations={clinicalRuleEvaluations}
        serviceTitle={serviceTitle}
        severityLabels={clinicalRuleSeverityLabels}
        staffRoleLabels={staffRoleLabels}
        summary={clinicalRuleSummary}
      />

      <PaymentCapture
        amount={paymentAmount}
        feedback={paymentFeedback}
        fiscalCashierName={paymentFiscalCashierName}
        fiscalFd={paymentFiscalFd}
        fiscalFn={paymentFiscalFn}
        fiscalFpd={paymentFiscalFpd}
        fiscalReceiptIssuedAt={paymentFiscalReceiptIssuedAt}
        fiscalReceiptNumber={paymentFiscalReceiptNumber}
        fiscalReceiptUrl={paymentFiscalReceiptUrl}
        isSaving={isPaymentSaving}
        method={paymentMethod}
        methodLabels={paymentMethodLabels}
        onAmountChange={setPaymentAmount}
        onFiscalCashierNameChange={setPaymentFiscalCashierName}
        onFiscalFdChange={setPaymentFiscalFd}
        onFiscalFnChange={setPaymentFiscalFn}
        onFiscalFpdChange={setPaymentFiscalFpd}
        onFiscalReceiptIssuedAtChange={setPaymentFiscalReceiptIssuedAt}
        onFiscalReceiptNumberChange={setPaymentFiscalReceiptNumber}
        onFiscalReceiptUrlChange={setPaymentFiscalReceiptUrl}
        onMethodChange={setPaymentMethod}
        onPayerBirthDateChange={setPaymentPayerBirthDate}
        onPayerFullNameChange={setPaymentPayerFullName}
        onPayerIdentityDocumentChange={setPaymentPayerIdentityDocument}
        onPayerInnChange={setPaymentPayerInn}
        onPayerRelationshipChange={setPaymentPayerRelationship}
        onSubmit={onRecordPayment}
        onTaxDeductionCodeChange={setPaymentTaxDeductionCode}
        patientContextMessage={paymentPatientContextMessage}
        patientContextReady={paymentPatientContextReady}
        patientDefaults={{
          birthDate: documentPatient?.birthDate ?? null,
          fullName: documentPatient?.fullName ?? null,
          identityDocument: documentPatient?.administrativeProfile?.identityDocument ?? null,
          taxpayerInn: documentPatient?.administrativeProfile?.taxpayerInn ?? null
        }}
        payerBirthDate={paymentPayerBirthDate}
        payerFullName={paymentPayerFullName}
        payerIdentityDocument={paymentPayerIdentityDocument}
        payerInn={paymentPayerInn}
        payerRelationship={paymentPayerRelationship}
        taxDeductionCode={paymentTaxDeductionCode}
      />

      <FinanceLedger
        categoryLabels={serviceCategoryLabels}
        documents={dashboard.documents}
        formatDateTime={formatDateTime}
        money={money}
        onFocusPaymentCapture={focusPaymentCapture}
        onGoToVisit={onGoToVisit}
        paymentFiscalReceiptLabel={paymentFiscalReceiptLabel}
        paymentMethodLabels={paymentMethodLabels}
        payments={activePayments}
        serviceCatalog={dashboard.serviceCatalog}
        treatmentItems={activeTreatmentPlanItems}
        treatmentStatusLabels={treatmentStatusLabels}
      />

      <ServiceCatalogStrip categoryLabels={serviceCategoryLabels} money={money} onGoToPrices={onGoToPrices} services={dashboard.serviceCatalog} />
    </div>
  );
}
