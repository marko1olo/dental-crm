import { readFileSync } from "node:fs";

const mainAppSource = readFileSync("apps/web/src/App.tsx", "utf8");
const appLogicSource = readFileSync("apps/web/src/useAppLogic.tsx", "utf8");
const appSource = mainAppSource + appLogicSource;
const financeViewSource = readFileSync("apps/web/src/FinanceView.tsx", "utf8");
const paymentCaptureSource = readFileSync("apps/web/src/PaymentCapture.tsx", "utf8");
const rubAmountInputSource = readFileSync("apps/web/src/rubAmountInput.ts", "utf8");
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
requireIn(appSource, 'setError(operatorWorkflowFailureMessage("Оплата не записана", paymentError))', "Payment handler must show network/runtime payment failures");
requireIn(appSource, "setError(null);", "Payment handler must clear stale errors after a successful payment");
requireIn(appSource, "paymentPatientContextReady", "Payment handler must compute whether selected patient matches the active visit");
requireIn(appSource, "documentPatientMatchesActiveVisit", "Payment handler must guard against writing payment to a different active patient");
requireIn(appSource, "setPaymentFeedback", "Payment handler must expose successful payment feedback");
requireIn(appSource, "setPaymentPayerFullName(\"\")", "Payment handler must clear payer name after a successful payment");
requireIn(appSource, "setPaymentTaxDeductionCode(\"\")", "Payment handler must clear tax deduction selection after a successful payment");
requireIn(recordPaymentSource, "patientId: documentPatient.id", "Payment POST must use the selected finance patient");
requireIn(
  recordPaymentSource,
  'document.kind !== "payment_refund_correction_request"',
  "Payment submit must not auto-link refund/correction request documents as incoming payment targets"
);
requireIn(recordPaymentSource, 'const paymentClientMutationId = browserGeneratedId("payment")', "Payment submit must mint a client operation id before POST");
requireIn(recordPaymentSource, "clientMutationId: paymentClientMutationId", "Payment POST must send clientMutationId for retry idempotency");
requireIn(appSource, 'from "./rubAmountInput"', "Payment handler must use the shared whole-ruble parser");
requireIn(recordPaymentSource, "normalizeRubAmountInput(paymentAmount)", "Payment POST must parse amount through the shared whole-ruble parser");
requireIn(recordPaymentSource, "rubAmountInputMissingStep(paymentAmount)", "Payment handler must explain invalid whole-ruble amounts before POST");
forbidIn(recordPaymentSource, 'Number(paymentAmount.replace(/[^\\d]/g, ""))', "Payment handler must not concatenate non-digit separators into a different amount");
forbidIn(recordPaymentSource, "activePatient.", "Payment handler must not silently write to activePatient when finance scope differs");

requireIn(rubAmountInputSource, "export function normalizeRubAmountInput", "Whole-ruble parser must be a shared utility");
requireIn(rubAmountInputSource, 'value.replace(/[\\s\\u00A0]/g, "")', "Whole-ruble parser must allow spaces as thousands separators");
requireIn(rubAmountInputSource, "!/^\\d+$/.test(compactAmount)", "Whole-ruble parser must reject commas, dots, signs and mixed text");
requireIn(rubAmountInputSource, "Number.isSafeInteger(amountRub)", "Whole-ruble parser must reject unsafe integer amounts");
requireIn(rubAmountInputSource, "укажите сумму целыми рублями без копеек", "Whole-ruble parser must expose a clear no-kopecks operator message");

requireIn(financeViewSource, "<PaymentCapture", "FinanceView must delegate the payment capture form");
requireIn(financeViewSource, "onSubmit={onRecordPayment}", "FinanceView must keep payment submit wired");
requireIn(financeViewSource, "onFiscalFnChange={setPaymentFiscalFn}", "Fiscal FN input must remain wired through props");
requireIn(financeViewSource, "onPayerInnChange={setPaymentPayerInn}", "Tax payer INN input must remain wired through props");
requireIn(financeViewSource, "onTaxDeductionCodeChange={setPaymentTaxDeductionCode}", "Tax deduction selector must remain wired through props");
requireIn(financeViewSource, "feedback={paymentFeedback}", "FinanceView must pass successful payment feedback to PaymentCapture");
requireIn(financeViewSource, "patientContextReady={paymentPatientContextReady}", "FinanceView must pass patient context readiness to PaymentCapture");

requireIn(paymentCaptureSource, "export function PaymentCapture", "PaymentCapture must export the component");
requireIn(paymentCaptureSource, 'className="payment-capture"', "PaymentCapture must own payment form markup");
requireIn(paymentCaptureSource, 'id="payment-capture"', "PaymentCapture root must be addressable for finance empty-state jumps");
requireIn(paymentCaptureSource, 'id="payment-amount-input"', "Payment amount input must be addressable after payment-history empty-state jumps");
requireIn(paymentCaptureSource, 'aria-label="Сумма оплаты"', "Payment amount input must have a direct accessible label");
requireIn(paymentCaptureSource, 'className="payment-capture-detail-section"', "PaymentCapture must collapse secondary details");
requireIn(paymentCaptureSource, "<summary>Фискальный чек и кассир</summary>", "PaymentCapture must hide fiscal receipt fields behind a clear summary");
requireIn(paymentCaptureSource, "<summary>Плательщик для налогового вычета</summary>", "PaymentCapture must hide tax payer fields behind a clear summary");
requireIn(paymentCaptureSource, 'className="payment-capture-detail-grid"', "PaymentCapture details must use a contained detail grid");
requireIn(paymentCaptureSource, "maxLength={32}", "PaymentCapture must keep fiscal number normalization");
requireIn(paymentCaptureSource, "maxLength={12}", "PaymentCapture must keep payer INN normalization");
requireIn(paymentCaptureSource, "aria-pressed={method === paymentMethod}", "Payment method segmented buttons must expose the selected method.");
requireIn(paymentCaptureSource, "aria-pressed={taxDeductionCode === \"\"}", "Tax deduction empty segmented button must expose its selected state.");
requireIn(paymentCaptureSource, "aria-pressed={taxDeductionCode === code}", "Tax deduction code segmented buttons must expose their selected state.");
requireIn(paymentCaptureSource, "onSubmit", "PaymentCapture must submit through a parent callback");
requireIn(paymentCaptureSource, "paymentMissingSteps", "PaymentCapture must explain missing payment fields before submit");
requireIn(paymentCaptureSource, 'from "./rubAmountInput"', "PaymentCapture must share the same whole-ruble parser as the submit handler");
requireIn(paymentCaptureSource, "rubAmountInputMissingStep(amount)", "PaymentCapture must block invalid whole-ruble amounts before submit");
requireIn(paymentCaptureSource, "const paymentAmountInvalid = Boolean(amountMissingStep);", "PaymentCapture must compute amount validity for field-level feedback");
requireIn(paymentCaptureSource, "const fiscalReceiptUrlInvalid = Boolean(trimmedFiscalReceiptUrl && !/^https?:\\/\\/\\S+$/i.test(trimmedFiscalReceiptUrl));", "PaymentCapture must compute fiscal URL validity once");
requireIn(paymentCaptureSource, "const payerInnInvalid = Boolean(trimmedPayerInn && !/^\\d{10}$|^\\d{12}$/.test(trimmedPayerInn));", "PaymentCapture must compute payer INN validity once");
requireIn(paymentCaptureSource, "aria-invalid={paymentAmountInvalid || undefined}", "Payment amount input must expose invalid state");
requireIn(paymentCaptureSource, "aria-describedby={paymentAmountInvalid ? paymentMissingId : undefined}", "Payment amount input must point to its missing-field guidance");
requireIn(paymentCaptureSource, "aria-invalid={fiscalReceiptUrlInvalid || undefined}", "Fiscal URL input must expose invalid state");
requireIn(paymentCaptureSource, "aria-describedby={fiscalReceiptUrlInvalid ? paymentMissingId : undefined}", "Fiscal URL input must point to its missing-field guidance");
requireIn(paymentCaptureSource, "aria-invalid={payerInnInvalid || undefined}", "Payer INN input must expose invalid state");
requireIn(paymentCaptureSource, "aria-describedby={payerInnInvalid ? paymentMissingId : undefined}", "Payer INN input must point to its missing-field guidance");
forbidIn(paymentCaptureSource, 'Number(amount.replace(/[^\\d]/g, ""))', "PaymentCapture must not concatenate non-digit separators into a different amount");
requireIn(paymentCaptureSource, "patientContextReady", "PaymentCapture must include patient context in payment readiness");
requireIn(paymentCaptureSource, "patientContextMessage", "PaymentCapture must show the patient mismatch reason");
requireIn(paymentCaptureSource, "payment-capture-feedback", "PaymentCapture must render successful payment feedback");
requireIn(paymentCaptureSource, "payment-capture-missing", "PaymentCapture must render the missing-field panel");
requireIn(paymentCaptureSource, 'const paymentMissingId = "payment-capture-missing"', "PaymentCapture must keep one stable id for missing-field guidance");
requireIn(paymentCaptureSource, "id={paymentMissingId}", "PaymentCapture missing-field panel must be addressable");
requireIn(paymentCaptureSource, 'aria-describedby={!paymentReadyToSubmit ? paymentMissingId : undefined}', "Payment submit button must point to missing-field guidance when disabled");
requireIn(paymentCaptureSource, 'autoComplete="transaction-amount"', "Payment amount input must expose transaction amount autocomplete.");
requireIn(paymentCaptureSource, 'pattern="[0-9\\s]*"', "Payment amount input must keep the whole-ruble numeric pattern with spaces.");
requireIn(paymentCaptureSource, 'type="url"', "Fiscal receipt URL input must use the browser URL input type.");
requireIn(paymentCaptureSource, 'autoComplete="url"', "Fiscal receipt URL input must expose URL autocomplete.");
requireIn(paymentCaptureSource, 'autoComplete="name"', "Tax payer full name must expose name autocomplete.");
requireIn(paymentCaptureSource, 'autoComplete="bday"', "Tax payer birth date must expose birth-date autocomplete.");
requireIn(paymentCaptureSource, 'pattern="[0-9]*"', "Numeric fiscal and INN inputs must expose a digit-only input pattern.");
requireIn(paymentCaptureSource, "UserRound", "PaymentCapture must use an icon for patient defaults instead of a text-only tax helper");
requireIn(paymentCaptureSource, "patientTaxDefaultsAvailable", "PaymentCapture must detect reusable patient tax defaults");
requireIn(paymentCaptureSource, "applyPatientTaxDefaults", "PaymentCapture must let admins copy payer fields from the patient card");
requireIn(paymentCaptureSource, 'data-testid="payment-fill-payer-from-patient"', "PaymentCapture must test-tag patient defaults autofill");
requireIn(paymentCaptureSource, "Заполнить из карточки пациента", "PaymentCapture must expose a clear patient-defaults autofill action");
requireIn(paymentCaptureSource, "Заполнит только пустые поля", "PaymentCapture must explain that patient defaults do not overwrite manual payer edits");
requireIn(paymentCaptureSource, "digitsOnly(patientDefaults.taxpayerInn, 12)", "PaymentCapture must normalize patient INN when applying defaults");
requireIn(paymentCaptureSource, "onPayerRelationshipChange(\"пациент\")", "PaymentCapture must fill patient relationship when applying patient defaults");
requireIn(paymentCaptureSource, "aria-describedby={!patientTaxDefaultsAvailable ? taxDefaultsGuidanceId : undefined}", "Disabled patient defaults action must point to guidance");
requireIn(paymentCaptureSource, "const fiscalDetailsOpen =", "PaymentCapture must auto-open fiscal details when they are required or populated");
requireIn(paymentCaptureSource, "const taxPayerDetailsOpen =", "PaymentCapture must auto-open tax payer details when they are required or populated");
requireIn(paymentCaptureSource, "open={fiscalDetailsOpen}", "Fiscal details must reveal required tax receipt fields");
requireIn(paymentCaptureSource, "open={taxPayerDetailsOpen}", "Tax payer details must reveal required payer fields");
requireIn(paymentCaptureSource, "aria-busy={isSaving || undefined}", "Payment submit button must expose busy state");
requireIn(paymentCaptureSource, "disabled={isSaving || !paymentReadyToSubmit}", "PaymentCapture must block incomplete payment submit");
requireIn(paymentCaptureSource, "payment-capture-safeguard", "PaymentCapture must explain append-only payment capture and correction workflow");
requireIn(paymentCaptureSource, "Каждая оплата добавляет новую строку", "PaymentCapture must tell staff each payment becomes a new history row");

requireIn(cssSource, ".payment-capture-detail-section", "CSS must style collapsed payment detail sections");
requireIn(cssSource, ".payment-capture-detail-grid", "CSS must style payment detail grid");
requireIn(cssSource, ".payment-capture-detail-grid .payment-methods", "CSS must span tax code selector in detail grid");
requireIn(cssSource, ".payment-tax-defaults", "CSS must style patient defaults tax helper");
requireIn(cssSource, ".payment-tax-defaults .secondary-button", "CSS must align patient defaults action");
requireIn(cssSource, ".payment-capture-feedback", "CSS must style successful payment feedback");
requireIn(cssSource, ".payment-capture-missing", "CSS must style payment missing-field guidance");
requireIn(cssSource, ".payment-capture-safeguard", "CSS must style append-only payment safeguard copy");

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
