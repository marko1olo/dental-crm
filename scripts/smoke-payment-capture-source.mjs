import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const financeViewSource = readFileSync("apps/web/src/FinanceView.tsx", "utf8");
const paymentCaptureSource = readFileSync("apps/web/src/PaymentCapture.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");
const recordPaymentSource = appSource.slice(
  appSource.indexOf("async function recordPayment()"),
  appSource.indexOf("function documentKindsForCommunicationTask")
);

const missing = [];

function requireIn(source, snippet, message) {
  if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
  if (source.includes(snippet)) missing.push(message);
}

requireIn(appSource, 'lazy(() => import("./FinanceView")', "App.tsx must lazy-load the finance view boundary");
forbidIn(appSource, 'from "./PaymentCapture"', "App.tsx must not import payment capture directly");
forbidIn(appSource, "<PaymentCapture", "App.tsx must not render the payment capture form directly");
forbidIn(appSource, 'className="payment-capture-detail-section"', "App.tsx must not inline secondary payment details");
requireIn(appSource, "Дождитесь завершения текущей записи оплаты.", "Payment handler must explain duplicate submit attempts");
requireIn(appSource, "Выберите пациента и активный прием перед записью оплаты.", "Payment handler must fail visibly without a patient/visit context");
requireIn(appSource, 'responseErrorMessage(response, "Оплата не записана")', "Payment handler must surface readable API errors");
requireIn(appSource, "catch (paymentError)", "Payment handler must catch network/runtime payment failures");
requireIn(appSource, "setError(paymentError instanceof Error ? paymentError.message : \"Оплата не записана\")", "Payment handler must show network/runtime payment failures");
requireIn(appSource, "setError(null);", "Payment handler must clear stale errors after a successful payment");
requireIn(appSource, "paymentPatientContextReady", "Payment handler must compute whether selected patient matches the active visit");
requireIn(appSource, "documentPatientMatchesActiveVisit", "Payment handler must guard against writing payment to a different active patient");
requireIn(appSource, "setPaymentFeedback", "Payment handler must expose successful payment feedback");
requireIn(appSource, "setPaymentPayerFullName(\"\")", "Payment handler must clear payer name after a successful payment");
requireIn(appSource, "setPaymentTaxDeductionCode(\"\")", "Payment handler must clear tax deduction selection after a successful payment");
requireIn(recordPaymentSource, "patientId: documentPatient.id", "Payment POST must use the selected finance patient");
forbidIn(recordPaymentSource, "activePatient.", "Payment handler must not silently write to activePatient when finance scope differs");

requireIn(financeViewSource, "<PaymentCapture", "FinanceView must delegate the payment capture form");
requireIn(financeViewSource, "onSubmit={onRecordPayment}", "FinanceView must keep payment submit wired");
requireIn(financeViewSource, "onFiscalFnChange={setPaymentFiscalFn}", "Fiscal FN input must remain wired through props");
requireIn(financeViewSource, "onPayerInnChange={setPaymentPayerInn}", "Tax payer INN input must remain wired through props");
requireIn(financeViewSource, "onTaxDeductionCodeChange={setPaymentTaxDeductionCode}", "Tax deduction selector must remain wired through props");
requireIn(financeViewSource, "feedback={paymentFeedback}", "FinanceView must pass successful payment feedback to PaymentCapture");
requireIn(financeViewSource, "patientContextReady={paymentPatientContextReady}", "FinanceView must pass patient context readiness to PaymentCapture");

requireIn(paymentCaptureSource, "export function PaymentCapture", "PaymentCapture must export the component");
requireIn(paymentCaptureSource, 'className="payment-capture"', "PaymentCapture must own payment form markup");
requireIn(paymentCaptureSource, 'className="payment-capture-detail-section"', "PaymentCapture must collapse secondary details");
requireIn(paymentCaptureSource, "<summary>Фискальный чек и кассир</summary>", "PaymentCapture must hide fiscal receipt fields behind a clear summary");
requireIn(paymentCaptureSource, "<summary>Плательщик для налогового вычета</summary>", "PaymentCapture must hide tax payer fields behind a clear summary");
requireIn(paymentCaptureSource, 'className="payment-capture-detail-grid"', "PaymentCapture details must use a contained detail grid");
requireIn(paymentCaptureSource, "digitsOnly(event.target.value, 32)", "PaymentCapture must keep fiscal number normalization");
requireIn(paymentCaptureSource, "digitsOnly(event.target.value, 12)", "PaymentCapture must keep payer INN normalization");
requireIn(paymentCaptureSource, "onSubmit", "PaymentCapture must submit through a parent callback");
requireIn(paymentCaptureSource, "paymentMissingSteps", "PaymentCapture must explain missing payment fields before submit");
requireIn(paymentCaptureSource, "patientContextReady", "PaymentCapture must include patient context in payment readiness");
requireIn(paymentCaptureSource, "patientContextMessage", "PaymentCapture must show the patient mismatch reason");
requireIn(paymentCaptureSource, "payment-capture-feedback", "PaymentCapture must render successful payment feedback");
requireIn(paymentCaptureSource, "payment-capture-missing", "PaymentCapture must render the missing-field panel");
requireIn(paymentCaptureSource, "aria-busy={isSaving || undefined}", "Payment submit button must expose busy state");
requireIn(paymentCaptureSource, "disabled={isSaving || !paymentReadyToSubmit}", "PaymentCapture must block incomplete payment submit");

requireIn(cssSource, ".payment-capture-detail-section", "CSS must style collapsed payment detail sections");
requireIn(cssSource, ".payment-capture-detail-grid", "CSS must style payment detail grid");
requireIn(cssSource, ".payment-capture-detail-grid .payment-methods", "CSS must span tax code selector in detail grid");
requireIn(cssSource, ".payment-capture-feedback", "CSS must style successful payment feedback");
requireIn(cssSource, ".payment-capture-missing", "CSS must style payment missing-field guidance");

if (missing.length > 0) {
  console.error("Payment capture source smoke failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log({
  ok: true,
  paymentCaptureCollapsed: true,
  fiscalDetailsPreserved: true,
  taxPayerDetailsPreserved: true
});
