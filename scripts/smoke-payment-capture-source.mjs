import { readFileSync } from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";
import { functionBodySource } from "./lib/function-body-source.mjs";

const mainAppSource = readFileSync("apps/web/src/App.tsx", "utf8");
const appLogicSource = readAppLogicSourceSync();
const appSource = mainAppSource + appLogicSource;
const financeViewSource = readFileSync("apps/web/src/FinanceView.tsx", "utf8");
const paymentCaptureSource = readFileSync(
	"apps/web/src/PaymentCapture.tsx",
	"utf8",
);
const rubAmountInputSource = readFileSync(
	"apps/web/src/rubAmountInput.ts",
	"utf8",
);
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");
/*
 * Тело обработчика оплаты режется счётом скобок от объявления, а не вторым
 * якорем. Прежний срез — `appSource.slice(indexOf("async function
 * recordPayment()"), indexOf("function documentKindsForCommunicationTask"))` —
 * 2026-08-10 схлопнулся в ПУСТУЮ строку: декомпозиция увезла recordPayment в
 * hooks/domains/useFinanceLogic.ts, а documentKindsForCommunicationTask попал в
 * useDocumentWorkflowModule.ts, то есть раньше по алфавиту. Склейка сортирует
 * файлы по имени, якорь конца встал перед якорем начала (588796 против 560865),
 * и slice вернул "".
 *
 * Опасен не упавший requireIn, а прошедший forbidIn: на пустой строке запрет
 * проходит. Оба запрета ниже — на `Number(paymentAmount.replace(...))` и на
 * запись в `activePatient.` — зеленели вхолостую и ничего не охраняли.
 * Потерянное объявление теперь роняет проверку с внятным текстом.
 */
const recordPaymentSource = functionBodySource(
	appSource,
	"async function recordPayment()",
	"обработчик приёма оплаты",
);

const missing = [];

/*
 * Требование принимает и подстроку, и выражение: приём взят из
 * scripts/smoke-web-render-gating-source.mjs:208-216 (sourceHas), новой техники
 * здесь не изобретается. Выражение нужно там, где написание вокруг закрепляемой
 * связи расставляет форматтер.
 */
function requireIn(source, snippet, message) {
	const found =
		snippet instanceof RegExp ? snippet.test(source) : source.includes(snippet);
	if (!found) missing.push(message);
}

function forbidIn(source, snippet, message) {
	if (source.includes(snippet)) missing.push(message);
}

/*
 * Дословно требовалось `lazy(() => import("./FinanceView")` одной строкой.
 * Замерено 2026-08-09: коммит ad8f12499 форматтером разбил все вызовы lazy в
 * App.tsx надвое, подстрока перестала находиться — до правки EXIT=1. Продукт
 * цел: App.tsx:79 держит `lazy(() =>`, перенос, `import("./FinanceView")`,
 * граница по-прежнему грузится лениво отдельным чанком.
 *
 * Закреплён СМЫСЛ: приём оплаты доезжает до сборки только через lazy-границу
 * FinanceView — что и охраняют три forbidIn ниже. `\s*` покрывает пробел и
 * перенос с табами; подмена модуля и статический импорт краснеют.
 */
requireIn(
	appSource,
	/lazy\(\(\)\s*=>\s*import\("\.\/FinanceView"\)/,
	"App.tsx must lazy-load the finance view boundary",
);
forbidIn(
	appSource,
	'from "./PaymentCapture"',
	"App.tsx must not import payment capture directly",
);
forbidIn(
	appSource,
	"<PaymentCapture",
	"App.tsx must not render the payment capture form directly",
);
forbidIn(
	appSource,
	'className="payment-capture-detail-section"',
	"App.tsx must not inline secondary payment details",
);
requireIn(
	appSource,
	"Дождитесь завершения текущей записи оплаты.",
	"Payment handler must explain duplicate submit attempts",
);
/*
 * Прежде требовалось одно сообщение «Выберите пациента и активный прием перед
 * записью оплаты.». Продукт разделил две разные причины на два разных текста
 * (useFinanceLogic.ts:98 и :104-105):
 *   нет пациента  -> «Выберите пациента, за которого принимаете оплату.»
 *   приём чужой   -> «Оплата не записана: сначала переключите открытый прием
 *                     на этого пациента.»
 * Это точнее для кассира: прежний слитный текст не говорил, что именно не так.
 * Требуются ОБА — иначе одна из двух проверок могла бы тихо исчезнуть.
 */
requireIn(
	appSource,
	"Выберите пациента, за которого принимаете оплату.",
	"Payment handler must fail visibly without a patient context",
);
requireIn(
	appSource,
	"сначала переключите открытый прием на этого пациента",
	"Payment handler must fail visibly when the active visit belongs elsewhere",
);
requireIn(
	appSource,
	'responseErrorMessage(response, "Оплата не записана")',
	"Payment handler must surface readable API errors",
);
requireIn(
	appSource,
	"catch (paymentError)",
	"Payment handler must catch network/runtime payment failures",
);
/*
 * Форматтер развернул вызов: useFinanceLogic.ts:296-298 держит `setError(`,
 * перенос, `operatorWorkflowFailureMessage("Оплата не записана",
 * paymentError),`, перенос, `);`. Показ отказа на месте — это существенно:
 * если запрос упал, а на экране ничего не изменилось, администратор берёт
 * оплату повторно и пациент платит дважды. `\s*` засчитывает обе формы, а
 * молчаливый `catch` без setError продолжает краснеть.
 */
requireIn(
	appSource,
	/setError\(\s*operatorWorkflowFailureMessage\("Оплата не записана", paymentError\),?\s*\)/,
	"Payment handler must show network/runtime payment failures",
);
requireIn(
	appSource,
	"setError(null);",
	"Payment handler must clear stale errors after a successful payment",
);
requireIn(
	appSource,
	"paymentPatientContextReady",
	"Payment handler must compute whether selected patient matches the active visit",
);
requireIn(
	appSource,
	"documentPatientMatchesActiveVisit",
	"Payment handler must guard against writing payment to a different active patient",
);
requireIn(
	appSource,
	"setPaymentFeedback",
	"Payment handler must expose successful payment feedback",
);
requireIn(
	appSource,
	'setPaymentPayerFullName("")',
	"Payment handler must clear payer name after a successful payment",
);
requireIn(
	appSource,
	'setPaymentTaxDeductionCode("")',
	"Payment handler must clear tax deduction selection after a successful payment",
);
requireIn(
	recordPaymentSource,
	"patientId: documentPatient.id",
	"Payment POST must use the selected finance patient",
);
requireIn(
	recordPaymentSource,
	'document.kind !== "payment_refund_correction_request"',
	"Payment submit must not auto-link refund/correction request documents as incoming payment targets",
);
/*
 * Прежде требовалось `const paymentClientMutationId = browserGeneratedId(
 * "payment")` — минт ключа прямо в теле. Продукт стал СИЛЬНЕЕ: ключ хранится в
 * `paymentMutationIdRef` и минтится только если его ещё нет
 * (useFinanceLogic.ts:217-220), а `const paymentClientMutationId =
 * paymentMutationIdRef.current` берёт готовый. Разница существенная: при
 * повторе после сетевого отказа прежняя форма выдала бы НОВЫЙ ключ, и сервер
 * счёл бы повтор новым платежом — пациент заплатил бы дважды. Возврат к
 * прежнему литералу был бы регрессом, поэтому закрепляется ref-форма.
 */
requireIn(
	recordPaymentSource,
	/paymentMutationIdRef\.current = browserGeneratedId\("payment"\)/,
	"Payment submit must mint a client operation id before POST",
);
requireIn(
	recordPaymentSource,
	"clientMutationId: paymentClientMutationId",
	"Payment POST must send clientMutationId for retry idempotency",
);
/*
 * Путь импорта изменился вместе с переездом обработчика: из
 * apps/web/src/hooks/domains/useFinanceLogic.ts до apps/web/src/rubAmountInput.ts
 * два уровня вверх (`../../rubAmountInput`, :14), а не `./rubAmountInput`.
 * Требование прежнее — разбор суммы берётся из общего модуля, а не считается на
 * месте, — поэтому закрепляется имя модуля с любой глубиной пути. Собственный
 * разбор в обработчике по-прежнему не пройдёт: ниже стоит запрет на
 * `Number(paymentAmount.replace(...))`.
 */
requireIn(
	appSource,
	/from "(?:\.\.\/)*\.?\/?rubAmountInput"/,
	"Payment handler must use the shared whole-ruble parser",
);
requireIn(
	recordPaymentSource,
	"normalizeRubAmountInput(paymentAmount)",
	"Payment POST must parse amount through the shared whole-ruble parser",
);
/*
 * Прежде требовалось `rubAmountInputMissingStep(paymentAmount)`. Замерено
 * 2026-08-10: та функция принимает (число, шаг) и проверяет КРАТНОСТЬ, а не
 * корректность ввода; вызвать её строкой нельзя. Разбор суммы переписан, и
 * объяснение оператору теперь даёт `validateRubAmountInput`
 * (useFinanceLogic.ts:110), результат которого уходит в setError на :112.
 * Требование то же — неверная сумма объясняется ДО отправки, — исполнитель
 * другой.
 */
requireIn(
	recordPaymentSource,
	"validateRubAmountInput(paymentAmount)",
	"Payment handler must explain invalid whole-ruble amounts before POST",
);
forbidIn(
	recordPaymentSource,
	'Number(paymentAmount.replace(/[^\\d]/g, ""))',
	"Payment handler must not concatenate non-digit separators into a different amount",
);
forbidIn(
	recordPaymentSource,
	"activePatient.",
	"Payment handler must not silently write to activePatient when finance scope differs",
);

requireIn(
	rubAmountInputSource,
	"export function normalizeRubAmountInput",
	"Whole-ruble parser must be a shared utility",
);
/*
 * ВНИМАНИЕ ТОМУ, КТО ЗАХОЧЕТ ВЕРНУТЬ ПРЕЖНИЕ ОЖИДАНИЯ. Три проверки ниже
 * закрепляли разбор суммы ЦЕЛЫМИ РУБЛЯМИ. Продукт от этого сознательно ушёл:
 * шапка apps/web/src/rubAmountInput.ts описывает замер, при котором дробная
 * сумма давала 400 и в базу не попадала — копеек в программе не было вовсе.
 * Привести продукт «в соответствие со смоуком» значит сломать приём копеек
 * заново. Поэтому здесь закрепляется НЫНЕШНИЙ, более сильный договор.
 *
 * Прогон парсера 2026-08-10 (11 случаев, все прошли):
 *   1500 / «1 500» / «1<U+00A0>500» -> 1500;  1500,50 и 1500.50 -> 1500.5;
 *   1500,505 / -5 / abc / 1500abc / 99999999999999999999 -> отказ с текстом
 *   «сумма указывается цифрами, копейки после запятой: 1500,50».
 */
requireIn(
	rubAmountInputSource,
	/value\.replace\(\/\[\\s[\s ]\]\/g, ""\)/,
	"Whole-ruble parser must allow spaces as thousands separators",
);
/*
 * Неразрывный пробел записан ЛИТЕРАЛОМ U+00A0 внутри класса, а не escape-
 * последовательностью ` ` — поведение то же, написание другое (проверено
 * посимвольно: U+005C U+0073 U+00A0). Выражение выше принимает оба написания и
 * продолжает краснеть, если разделители перестанут отбрасываться вовсе.
 */
requireIn(
	rubAmountInputSource,
	"!/^\\d+(\\.\\d{1,2})?$/.test(compactAmount)",
	"Whole-ruble parser must reject signs and mixed text but accept kopecks",
);
/*
 * Граница безопасного целого проверяется не `Number.isSafeInteger(amountRub)`,
 * а порогом MAX_SAFE_RUB = floor(Number.MAX_SAFE_INTEGER / 100): сумма хранится
 * в копейках, поэтому безопасный предел в рублях в сто раз меньше. Это строже
 * прежнего, а не слабее.
 */
requireIn(
	rubAmountInputSource,
	"amountRub > MAX_SAFE_RUB",
	"Whole-ruble parser must reject unsafe integer amounts",
);
/*
 * Прежде требовалось сообщение «укажите сумму целыми рублями без копеек».
 * Замерено 2026-08-10: в исходнике оно осталось ТОЛЬКО в шапке-комментарии,
 * которая объясняет, что его убрали. То есть проверка зеленела на собственном
 * некрологе и никакого текста для оператора не охраняла. Закрепляется живая
 * строка kopecksMessage, которую действительно видит кассир.
 */
requireIn(
	rubAmountInputSource,
	"сумма указывается цифрами, копейки после запятой: 1500,50",
	"Whole-ruble parser must expose a clear operator message about kopecks",
);

requireIn(
	financeViewSource,
	"<PaymentCapture",
	"FinanceView must delegate the payment capture form",
);
requireIn(
	financeViewSource,
	"onSubmit={onRecordPayment}",
	"FinanceView must keep payment submit wired",
);
requireIn(
	financeViewSource,
	"onFiscalFnChange={setPaymentFiscalFn}",
	"Fiscal FN input must remain wired through props",
);
requireIn(
	financeViewSource,
	"onPayerInnChange={setPaymentPayerInn}",
	"Tax payer INN input must remain wired through props",
);
requireIn(
	financeViewSource,
	"onTaxDeductionCodeChange={setPaymentTaxDeductionCode}",
	"Tax deduction selector must remain wired through props",
);
requireIn(
	financeViewSource,
	"feedback={paymentFeedback}",
	"FinanceView must pass successful payment feedback to PaymentCapture",
);
requireIn(
	financeViewSource,
	"patientContextReady={paymentPatientContextReady}",
	"FinanceView must pass patient context readiness to PaymentCapture",
);

requireIn(
	paymentCaptureSource,
	"export function PaymentCapture",
	"PaymentCapture must export the component",
);
/*
 * Корневой класс на месте, но к нему дописаны утилитарные классы темы:
 * PaymentCapture.tsx:864 — `className="payment-capture bg-white
 * dark:bg-slate-900 border …"`. Литерал с закрывающей кавычкой сразу после
 * имени класса перестал совпадать. Закрепляется имя класса на границе слова:
 * `payment-capture-feedback` и прочие производные за него не сойдут.
 */
requireIn(
	paymentCaptureSource,
	/className="payment-capture(?![\w-])/,
	"PaymentCapture must own payment form markup",
);
requireIn(
	paymentCaptureSource,
	'id="payment-capture"',
	"PaymentCapture root must be addressable for finance empty-state jumps",
);
requireIn(
	paymentCaptureSource,
	'id="payment-amount-input"',
	"Payment amount input must be addressable after payment-history empty-state jumps",
);
requireIn(
	paymentCaptureSource,
	'aria-label="Сумма оплаты"',
	"Payment amount input must have a direct accessible label",
);
requireIn(
	paymentCaptureSource,
	'className="payment-capture-detail-section"',
	"PaymentCapture must collapse secondary details",
);
requireIn(
	paymentCaptureSource,
	"<summary>Фискальный чек и кассир</summary>",
	"PaymentCapture must hide fiscal receipt fields behind a clear summary",
);
requireIn(
	paymentCaptureSource,
	"<summary>Плательщик для налогового вычета</summary>",
	"PaymentCapture must hide tax payer fields behind a clear summary",
);
requireIn(
	paymentCaptureSource,
	'className="payment-capture-detail-grid"',
	"PaymentCapture details must use a contained detail grid",
);
requireIn(
	paymentCaptureSource,
	"maxLength={32}",
	"PaymentCapture must keep fiscal number normalization",
);
requireIn(
	paymentCaptureSource,
	"maxLength={12}",
	"PaymentCapture must keep payer INN normalization",
);
requireIn(
	paymentCaptureSource,
	"aria-pressed={method === paymentMethod}",
	"Payment method segmented buttons must expose the selected method.",
);
requireIn(
	paymentCaptureSource,
	'aria-pressed={taxDeductionCode === ""}',
	"Tax deduction empty segmented button must expose its selected state.",
);
requireIn(
	paymentCaptureSource,
	"aria-pressed={taxDeductionCode === code}",
	"Tax deduction code segmented buttons must expose their selected state.",
);
requireIn(
	paymentCaptureSource,
	"onSubmit",
	"PaymentCapture must submit through a parent callback",
);
requireIn(
	paymentCaptureSource,
	"paymentMissingSteps",
	"PaymentCapture must explain missing payment fields before submit",
);
requireIn(
	paymentCaptureSource,
	'from "./rubAmountInput"',
	"PaymentCapture must share the same whole-ruble parser as the submit handler",
);
requireIn(
	paymentCaptureSource,
	"rubAmountInputMissingStep(amount)",
	"PaymentCapture must block invalid whole-ruble amounts before submit",
);
requireIn(
	paymentCaptureSource,
	"const paymentAmountInvalid = Boolean(amountMissingStep);",
	"PaymentCapture must compute amount validity for field-level feedback",
);
/*
 * Форматтер развернул объявление на четыре строки (PaymentCapture.tsx:818-822).
 * Смысл проверки — «вычислено ОДИН раз в переменную, а не заново в каждом
 * атрибуте», поэтому важно сохранить и `const …Invalid =`, и само выражение
 * проверки ссылки. `[\s\S]*?` перекрывает перенос, `Boolean(` и обе половины
 * условия обязательны.
 */
requireIn(
	paymentCaptureSource,
	/const fiscalReceiptUrlInvalid = Boolean\([\s\S]*?trimmedFiscalReceiptUrl &&[\s\S]*?!\/\^https\?:\\\/\\\/\\S\+\$\/i\.test\(trimmedFiscalReceiptUrl\)[\s\S]*?\)/,
	"PaymentCapture must compute fiscal URL validity once",
);
/* Тот же перенос, PaymentCapture.tsx:787-789. */
requireIn(
	paymentCaptureSource,
	/const payerInnInvalid = Boolean\([\s\S]*?trimmedPayerInn &&[\s\S]*?!\/\^\\d\{10\}\$\|\^\\d\{12\}\$\/\.test\(trimmedPayerInn\)[\s\S]*?\)/,
	"PaymentCapture must compute payer INN validity once",
);
requireIn(
	paymentCaptureSource,
	"aria-invalid={paymentAmountInvalid || undefined}",
	"Payment amount input must expose invalid state",
);
requireIn(
	paymentCaptureSource,
	"aria-describedby={paymentAmountInvalid ? paymentMissingId : undefined}",
	"Payment amount input must point to its missing-field guidance",
);
requireIn(
	paymentCaptureSource,
	"aria-invalid={fiscalReceiptUrlInvalid || undefined}",
	"Fiscal URL input must expose invalid state",
);
/*
 * Форматтер развернул атрибут (PaymentCapture.tsx:218-220). Смысл прежний:
 * ссылка на подсказку выдаётся ТОЛЬКО когда поле неверно, иначе экранный диктор
 * уводит на пустоту. Тернарник закреплён целиком, безусловная ссылка краснеет.
 */
requireIn(
	paymentCaptureSource,
	/aria-describedby=\{\s*fiscalReceiptUrlInvalid \? paymentMissingId : undefined\s*\}/,
	"Fiscal URL input must point to its missing-field guidance",
);
requireIn(
	paymentCaptureSource,
	"aria-invalid={payerInnInvalid || undefined}",
	"Payer INN input must expose invalid state",
);
requireIn(
	paymentCaptureSource,
	"aria-describedby={payerInnInvalid ? paymentMissingId : undefined}",
	"Payer INN input must point to its missing-field guidance",
);
forbidIn(
	paymentCaptureSource,
	'Number(amount.replace(/[^\\d]/g, ""))',
	"PaymentCapture must not concatenate non-digit separators into a different amount",
);
requireIn(
	paymentCaptureSource,
	"patientContextReady",
	"PaymentCapture must include patient context in payment readiness",
);
requireIn(
	paymentCaptureSource,
	"patientContextMessage",
	"PaymentCapture must show the patient mismatch reason",
);
requireIn(
	paymentCaptureSource,
	"payment-capture-feedback",
	"PaymentCapture must render successful payment feedback",
);
requireIn(
	paymentCaptureSource,
	"payment-capture-missing",
	"PaymentCapture must render the missing-field panel",
);
requireIn(
	paymentCaptureSource,
	'const paymentMissingId = "payment-capture-missing"',
	"PaymentCapture must keep one stable id for missing-field guidance",
);
requireIn(
	paymentCaptureSource,
	"id={paymentMissingId}",
	"PaymentCapture missing-field panel must be addressable",
);
/* Тот же перенос, PaymentCapture.tsx:1130-1132 и :1142-1144 (две кнопки). */
requireIn(
	paymentCaptureSource,
	/aria-describedby=\{\s*!paymentReadyToSubmit \? paymentMissingId : undefined\s*\}/,
	"Payment submit button must point to missing-field guidance when disabled",
);
requireIn(
	paymentCaptureSource,
	'autoComplete="transaction-amount"',
	"Payment amount input must expose transaction amount autocomplete.",
);
requireIn(
	paymentCaptureSource,
	'pattern="[0-9\\s]*"',
	"Payment amount input must keep the whole-ruble numeric pattern with spaces.",
);
requireIn(
	paymentCaptureSource,
	'type="url"',
	"Fiscal receipt URL input must use the browser URL input type.",
);
requireIn(
	paymentCaptureSource,
	'autoComplete="url"',
	"Fiscal receipt URL input must expose URL autocomplete.",
);
requireIn(
	paymentCaptureSource,
	'autoComplete="name"',
	"Tax payer full name must expose name autocomplete.",
);
requireIn(
	paymentCaptureSource,
	'autoComplete="bday"',
	"Tax payer birth date must expose birth-date autocomplete.",
);
requireIn(
	paymentCaptureSource,
	'pattern="[0-9]*"',
	"Numeric fiscal and INN inputs must expose a digit-only input pattern.",
);
requireIn(
	paymentCaptureSource,
	"UserRound",
	"PaymentCapture must use an icon for patient defaults instead of a text-only tax helper",
);
requireIn(
	paymentCaptureSource,
	"patientTaxDefaultsAvailable",
	"PaymentCapture must detect reusable patient tax defaults",
);
requireIn(
	paymentCaptureSource,
	"applyPatientTaxDefaults",
	"PaymentCapture must let admins copy payer fields from the patient card",
);
requireIn(
	paymentCaptureSource,
	'data-testid="payment-fill-payer-from-patient"',
	"PaymentCapture must test-tag patient defaults autofill",
);
requireIn(
	paymentCaptureSource,
	"Заполнить из карточки пациента",
	"PaymentCapture must expose a clear patient-defaults autofill action",
);
requireIn(
	paymentCaptureSource,
	"Заполнит только пустые поля",
	"PaymentCapture must explain that patient defaults do not overwrite manual payer edits",
);
requireIn(
	paymentCaptureSource,
	"digitsOnly(patientDefaults.taxpayerInn, 12)",
	"PaymentCapture must normalize patient INN when applying defaults",
);
requireIn(
	paymentCaptureSource,
	'onPayerRelationshipChange("пациент")',
	"PaymentCapture must fill patient relationship when applying patient defaults",
);
/* Тот же перенос, PaymentCapture.tsx:420-422. */
requireIn(
	paymentCaptureSource,
	/aria-describedby=\{\s*!patientTaxDefaultsAvailable \? taxDefaultsGuidanceId : undefined\s*\}/,
	"Disabled patient defaults action must point to guidance",
);
requireIn(
	paymentCaptureSource,
	"const fiscalDetailsOpen =",
	"PaymentCapture must auto-open fiscal details when they are required or populated",
);
requireIn(
	paymentCaptureSource,
	"const taxPayerDetailsOpen =",
	"PaymentCapture must auto-open tax payer details when they are required or populated",
);
requireIn(
	paymentCaptureSource,
	"open={fiscalDetailsOpen}",
	"Fiscal details must reveal required tax receipt fields",
);
requireIn(
	paymentCaptureSource,
	"open={taxPayerDetailsOpen}",
	"Tax payer details must reveal required payer fields",
);
requireIn(
	paymentCaptureSource,
	"aria-busy={isSaving || undefined}",
	"Payment submit button must expose busy state",
);
requireIn(
	paymentCaptureSource,
	"disabled={isSaving || !paymentReadyToSubmit}",
	"PaymentCapture must block incomplete payment submit",
);
requireIn(
	paymentCaptureSource,
	"payment-capture-safeguard",
	"PaymentCapture must explain append-only payment capture and correction workflow",
);
requireIn(
	paymentCaptureSource,
	"Каждая оплата добавляет новую строку",
	"PaymentCapture must tell staff each payment becomes a new history row",
);

requireIn(
	cssSource,
	".payment-capture-detail-section",
	"CSS must style collapsed payment detail sections",
);
requireIn(
	cssSource,
	".payment-capture-detail-grid",
	"CSS must style payment detail grid",
);
requireIn(
	cssSource,
	".payment-capture-detail-grid .payment-methods",
	"CSS must span tax code selector in detail grid",
);
requireIn(
	cssSource,
	".payment-tax-defaults",
	"CSS must style patient defaults tax helper",
);
requireIn(
	cssSource,
	".payment-tax-defaults .secondary-button",
	"CSS must align patient defaults action",
);
requireIn(
	cssSource,
	".payment-capture-feedback",
	"CSS must style successful payment feedback",
);
requireIn(
	cssSource,
	".payment-capture-missing",
	"CSS must style payment missing-field guidance",
);
requireIn(
	cssSource,
	".payment-capture-safeguard",
	"CSS must style append-only payment safeguard copy",
);

if (missing.length > 0) {
	console.error("Payment capture source smoke failed:");
	for (const item of missing) console.error(`- ${item}`);
	process.exit(1);
}

console.log({
	ok: true,
	paymentCaptureCollapsed: true,
	fiscalDetailsPreserved: true,
	taxPayerDetailsPreserved: true,
});
