import type { Dashboard, Patient, PaymentMethod } from "@dental/shared";
import { useCallback } from "react";
import { money as formatMoney } from "./AppHelpers";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import { useAppLogicContext } from "./contexts/AppLogicContext";
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

/*
 * ПОЧЕМУ У РАЗДЕЛА ТЕПЕРЬ ЕСТЬ ТИП, А БЫЛО `any`.
 *
 * Перечень свойств выше был объявлен и НЕ применён: параметр функции стоял
 * `any`. Из-за этого любая опечатка или переименование свойства в месте вызова
 * (App.tsx) проходила молча, а раздел брал значение по умолчанию из строк ниже.
 * Цена ошибки на экране кассы: `onRecordPayment` подменяется пустой функцией —
 * и «Принять оплату» перестаёт что-либо отправлять, оставаясь на вид рабочей
 * кнопкой; `money` подменяется, и суммы начинают печататься в другом виде, чем
 * на соседних экранах.
 *
 * Partial, а не полный тип: значения по умолчанию ниже как раз и означают
 * «свойство может не прийти». Опечатку и несовпадение типа Partial ловит
 * (в JSX лишние свойства запрещены), а именно от них защита и нужна.
 */
type FinanceViewComponentProps = Partial<FinanceViewProps>;

/*
 * Пустой словарь подписей.
 *
 * Все словари подписей приходят из App.tsx и в живом приложении заполнены.
 * Пустой нужен только чтобы раздел не падал, если его смонтируют без них: тогда
 * на месте подписи будет пусто (React ничего не рисует для undefined), а не
 * слово «undefined». Приведение типа неизбежно: Record с обязательными ключами
 * пустым объектом не описывается.
 */
const noLabels = <Key extends string>(): Record<Key, string> => ({}) as Record<Key, string>;

/*
 * Нулевая финансовая сводка.
 *
 * БЫЛО: `{ totalPaidRub: 0, totalDueRub: 0, outstandingPaidRub: 0 }`. Поля
 * outstandingPaidRub в сводке не существует вовсе (billingSummarySchema,
 * packages/shared/src/index.ts), а четырёх настоящих полей не хватало. На экран
 * это не попадало только потому, что дочерняя панель подставляет `?? 0` каждому
 * полю, — то есть код лгал о форме данных и ждал, когда кто-нибудь на эту ложь
 * положится. Держалось это ровно на том же `any` в параметре функции.
 */
const EMPTY_BILLING_SUMMARY: Dashboard["billingSummary"] = {
  totalPlannedRub: 0,
  totalDiscountRub: 0,
  totalPaidRub: 0,
  totalDueRub: 0,
  taxDeductionEligibleRub: 0,
  draftDocumentAmountRub: 0,
  openTreatmentItems: 0,
  unpaidDocuments: 0
};

/*
 * Нулевая сводка клинических правил. БЫЛО `{}`, а панель предупреждений читает
 * `summary.unresolved` и `summary.coveredRules` без проверки — в строке
 * «N требуют внимания · M закрыты» на месте чисел оказывалось пусто.
 */
const EMPTY_CLINICAL_RULE_SUMMARY: Dashboard["clinicalRuleSummary"] = {
  activeRules: 0,
  evaluatedRules: 0,
  unresolved: 0,
  blockers: 0,
  warnings: 0,
  requiredServices: 0,
  coveredRules: 0
};

export function FinanceView({
  activePayments = [],
  activeTreatmentPlanItems = [],
  activeTreatmentPlanScenarios = [],
  billingSummary = EMPTY_BILLING_SUMMARY,
  clinicalRuleEvaluations = [],
  clinicalRuleActionLabels = noLabels(),
  clinicalRuleSeverityLabels = noLabels(),
  clinicalRuleSummary = EMPTY_CLINICAL_RULE_SUMMARY,
  dashboard,
  documentPatient = null,
  formatDateTime = (val: string) => val || "",
  isPaymentSaving = false,
  /*
   * БЫЛО своё форматирование: `${val.toLocaleString("ru-RU")} ₽`. Оно печатает
   * 1500.5 как «1 500,5 ₽», и полтинник в такой записи читается как пять копеек.
   * Общий money() из AppHelpers показывает «1 500,50 ₽» — и ровно так же те же
   * суммы выглядят в форме приёма оплаты и в семейном кошельке на этом экране.
   */
  money = formatMoney,
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
  paymentMethodLabels = noLabels(),
  paymentPatientContextMessage = "",
  paymentPatientContextReady = true,
  paymentPayerBirthDate = "",
  paymentPayerFullName = "",
  paymentPayerIdentityDocument = "",
  paymentPayerInn = "",
  paymentPayerRelationship = "",
  paymentTaxDeductionCode = "",
  scenarioPriorityLabels = noLabels(),
  scenarioStrategyLabels = noLabels(),
  serviceCategoryLabels = noLabels(),
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
  staffRoleLabels = noLabels(),
  treatmentStatusLabels = noLabels()
}: FinanceViewComponentProps) {
  /*
   * ЗАЧЕМ РАЗДЕЛУ ОБЩИЙ КОНТЕКСТ. Списание с семейного счёта уходит прямо из
   * панели кошелька и создаёт настоящий платёж (POST /api/finance/family/pay
   * вставляет строку в payments). Долг пациента на этом экране считается из
   * dashboard.payments, а дашборд после такого списания никто не перечитывал:
   * сообщения PAYMENT_CREATED веб-часть не слушает вовсе. Администратор списывал
   * 15 000 ₽ с семейного счёта, видел в сводке прежний «Остаток 15 000 ₽» и
   * прежний список платежей — и брал те же деньги второй раз, наличными.
   * Перечитываем дашборд после успешного списания.
   */
  const appLogic = useAppLogicContext();
  const loadDashboard = appLogic?.loadDashboard;
  const reloadAfterFamilyPayment = useCallback(() => {
    void loadDashboard?.();
  }, [loadDashboard]);

  /*
   * Обработчик создания документа передаётся ниже только когда он есть.
   *
   * Журнал платежей решает по наличию этого свойства, рисовать ли кнопку
   * «Справка ИФНС»: кнопка, которая ничего не вызывает, — обманутый оператор.
   * Явное `undefined` при exactOptionalPropertyTypes считается переданным
   * значением, поэтому свойство именно отсутствует, а не равно undefined.
   */
  const createDocumentProp = onCreateDocument ? { onCreateDocument } : {};

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
        {...createDocumentProp}
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
        {/* БЫЛО: `documentPatient?.id ?? "pat-1"` — остаток удалённых демо-данных.
            Такого пациента в базе нет ни у одной клиники: запрос по нему может
            ответить только ошибкой приведения типа (uuid), и на экране финансов
            без выбранного пациента появлялась бы ложная тревога «баланс не
            прочитан». Панель это отсекает по виду идентификатора, но подставлять
            чужой номер, надеясь на проверку в другом файле, нельзя: снимут
            проверку — уйдёт запрос. Пустая строка честно означает «пациент не
            выбран». */}
        <FamilyWalletPanel
          patientId={documentPatient?.id ?? ""}
          remainingDebtRub={billingSummary?.totalDueRub ?? 0}
          onPaymentSuccess={reloadAfterFamilyPayment}
        />
      </div>
    </div>
  );
}
