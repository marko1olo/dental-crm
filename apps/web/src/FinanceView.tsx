import type { Dashboard, Patient, PaymentMethod } from "@dental/shared";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import { FinanceLedger } from "./FinanceLedger";
import { FinancePlanningOverview, ServiceCatalogStrip } from "./FinancePlanning";
import { motionSafeScrollIntoView } from "./motionPreference";
import { PaymentCapture } from "./PaymentCapture";
import { FamilyWalletPanel } from "./components/finance/FamilyWalletPanel";

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
  onCreateDocument?: (kind: string) => void;
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
  activePayments = [],
  activeTreatmentPlanItems = [],
  activeTreatmentPlanScenarios = [],
  billingSummary = { totalPaidRub: 0, totalDueRub: 0, outstandingPaidRub: 0 },
  clinicalRuleEvaluations = [],
  clinicalRuleActionLabels = {},
  clinicalRuleSeverityLabels = {},
  clinicalRuleSummary = {},
  dashboard = {},
  documentPatient = null,
  formatDateTime = (val: string) => val || "",
  isPaymentSaving = false,
  money = (val: number | null) => typeof val === "number" ? `${val.toLocaleString("ru-RU")} ₽` : "0 ₽",
  onCreateDocument,
  onGoToDocuments = () => {},
  onGoToPrices = () => {},
  onGoToVisit = () => {},
  onRecordPayment = () => {},
  paymentAmount = "",
  paymentFeedback = "",
  paymentFiscalCashierName = "",
  paymentFiscalFd = "",
  paymentFiscalFn = "",
  paymentFiscalFpd = "",
  paymentFiscalReceiptIssuedAt = "",
  paymentFiscalReceiptNumber = "",
  paymentFiscalReceiptUrl = "",
  paymentFiscalReceiptLabel = () => "",
  paymentMethod = "cash",
  paymentMethodLabels = {},
  paymentPatientContextMessage = "",
  paymentPatientContextReady = true,
  paymentPayerBirthDate = "",
  paymentPayerFullName = "",
  paymentPayerIdentityDocument = "",
  paymentPayerInn = "",
  paymentPayerRelationship = "",
  paymentTaxDeductionCode = "",
  scenarioPriorityLabels = {},
  scenarioStrategyLabels = {},
  serviceCategoryLabels = {},
  serviceTitle = (id: string) => id,
  setPaymentAmount = () => {},
  setPaymentFiscalCashierName = () => {},
  setPaymentFiscalFd = () => {},
  setPaymentFiscalFn = () => {},
  setPaymentFiscalFpd = () => {},
  setPaymentFiscalReceiptIssuedAt = () => {},
  setPaymentFiscalReceiptNumber = () => {},
  setPaymentFiscalReceiptUrl = () => {},
  setPaymentMethod = () => {},
  setPaymentPayerBirthDate = () => {},
  setPaymentPayerFullName = () => {},
  setPaymentPayerIdentityDocument = () => {},
  setPaymentPayerInn = () => {},
  setPaymentPayerRelationship = () => {},
  setPaymentTaxDeductionCode = () => {},
  staffRoleLabels = {},
  treatmentStatusLabels = {}
}: any) {
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
          <p className="eyebrow finance-scope-label">
            Сводка по пациенту: {documentPatient?.fullName ?? "пациент не выбран"}
          </p>
        </div>
        <button 
          className="text-button focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] focus:outline-none transition-all hover:opacity-80 rounded-md px-2 py-1" 
          type="button" 
          onClick={onGoToDocuments}
          aria-label="Перейти к документам"
        >
          Документы
        </button>
      </div>

      <FinancePlanningOverview
        activePaymentsCount={(activePayments ?? []).length}
        billingSummary={billingSummary}
        money={money}
        onGoToVisit={onGoToVisit}
        priorityLabels={scenarioPriorityLabels}
        scenarios={activeTreatmentPlanScenarios ?? []}
        strategyLabels={scenarioStrategyLabels}
      />

      <ClinicalRulePanel
        actionLabels={clinicalRuleActionLabels}
        context="finance"
        evaluations={clinicalRuleEvaluations ?? []}
        serviceTitle={serviceTitle}
        severityLabels={clinicalRuleSeverityLabels}
        staffRoleLabels={staffRoleLabels}
        summary={clinicalRuleSummary}
      />

      <PaymentCapture
        remainingDebt={billingSummary?.totalDueRub}
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
        onCreateDocument={onCreateDocument}
        documents={dashboard?.documents ?? []}
        formatDateTime={formatDateTime}
        money={money}
        onFocusPaymentCapture={focusPaymentCapture}
        onGoToVisit={onGoToVisit}
        paymentFiscalReceiptLabel={paymentFiscalReceiptLabel}
        paymentMethodLabels={paymentMethodLabels}
        payments={activePayments ?? []}
        serviceCatalog={dashboard?.serviceCatalog ?? []}
        treatmentItems={activeTreatmentPlanItems ?? []}
        treatmentStatusLabels={treatmentStatusLabels}
      />

      <ServiceCatalogStrip categoryLabels={serviceCategoryLabels} money={money} onGoToPrices={onGoToPrices} services={dashboard?.serviceCatalog ?? []} />

      {/*
        ЗДЕСЬ СТОЯЛИ ЧЕТЫРЕ ПУСТЫХ БЛОКА, ОБЕЩАВШИЕ ТО, ЧЕГО СИСТЕМА НЕ УМЕЕТ.
        Все четыре читали таблицы, в которые в приложении никто не пишет —
        проверено поиском по всем исходникам:
          • «Начисления врачам по прайсу» ждали поля «процент врача» и «маржа
            клиники». Таких данных нет ни у сотрудника, ни в прайсе — нигде,
            кроме самой пустой таблицы. Начисление считать не из чего.
          • «Метки авансовых депозитов», «Отправка электронных чеков» и
            «Единицы измерения для ККМ» — это касса по 54-ФЗ. Драйвера кассы в
            системе нет, чеки никуда не уходят.
        Пустая финансовая карточка опаснее отсутствующей: по ней принимают
        решения о деньгах и читают её как «начислений нет», а не «мы это не
        считаем».
        Выработку врачей за период — из настоящих платежей и приёмов — показывает
        отчёт «Врачи» в разделе отчётов (managerReports.doctorPerformance); маржа
        там стоит честным прочерком по той же причине.
        ДОЛГ: касса 54-ФЗ и расчёт зарплаты врача. Первое требует драйвера ККМ,
        второе — поля процента у сотрудника; ни того, ни другого в базе нет.
      */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FamilyWalletPanel patientId={documentPatient?.id ?? "pat-1"} remainingDebtRub={billingSummary?.totalDueRub ?? 0} />
      </div>
    </div>
  );
}
