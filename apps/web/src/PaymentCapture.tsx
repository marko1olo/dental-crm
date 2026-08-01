import { CreditCard, UserRound, Mic, Bot } from "lucide-react";
import { type PaymentMethod, parseKopecks, percentageOfKopecks, splitKopecks } from "@dental/shared";
import { money } from "./AppHelpers";
import { validateRubAmountInput, rubAmountInputMissingStep, normalizeRubAmountInput } from "./rubAmountInput";
import { rubAmountForInput } from "./components/payments/cashDeskAmounts";
import { textToNumbers } from "./lib/stringUtils";
import { AiOrchestrator } from "./lib/aiOrchestrator";
import { SmartParsePreview } from "./SmartParsePreview";
import { useEffect, useRef, useState } from "react";
import { showToast } from "./components/GlobalToast";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { DictationHints } from "./DictationHints";

type TaxDeductionCode = "" | "1" | "2";

type PaymentCaptureProps = {
  amount: string;
  feedback: string;
  fiscalCashierName: string;
  fiscalFd: string;
  fiscalFn: string;
  fiscalFpd: string;
  fiscalReceiptIssuedAt: string;
  fiscalReceiptNumber: string;
  fiscalReceiptUrl: string;
  isSaving: boolean;
  method: PaymentMethod;
  methodLabels: Record<PaymentMethod, string>;
  onAmountChange: (value: string) => void;
  onFiscalCashierNameChange: (value: string) => void;
  onFiscalFdChange: (value: string) => void;
  onFiscalFnChange: (value: string) => void;
  onFiscalFpdChange: (value: string) => void;
  onFiscalReceiptIssuedAtChange: (value: string) => void;
  onFiscalReceiptNumberChange: (value: string) => void;
  onFiscalReceiptUrlChange: (value: string) => void;
  onMethodChange: (value: PaymentMethod) => void;
  onPayerBirthDateChange: (value: string) => void;
  onPayerFullNameChange: (value: string) => void;
  onPayerIdentityDocumentChange: (value: string) => void;
  onPayerInnChange: (value: string) => void;
  onPayerRelationshipChange: (value: string) => void;
  onSubmit: () => void;
  onTaxDeductionCodeChange: (value: TaxDeductionCode) => void;
  patientContextMessage: string;
  patientContextReady: boolean;
  patientDefaults: {
    birthDate?: string | null;
    fullName?: string | null;
    identityDocument?: string | null;
    taxpayerInn?: string | null;
  };
  payerBirthDate: string;
  payerFullName: string;
  payerIdentityDocument: string;
  payerInn: string;
  payerRelationship: string;
  taxDeductionCode: TaxDeductionCode;
  remainingDebt?: number;
};

const visiblePaymentMethods: PaymentMethod[] = ["cash", "card", "bank_transfer", "online"];

const digitsOnly = (value: string, maxLength: number) => value.replace(/[^\d]/g, "").slice(0, maxLength);

type DigitsInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  maxLength: number;
  onChange: (value: string) => void;
};

function DigitsInput({ maxLength, onChange, ...props }: DigitsInputProps) {
  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      pattern="[0-9]*"
      {...props}
      onChange={(event) => onChange(digitsOnly(event.target.value, maxLength))}
    />
  );
}

type FiscalDetailsProps = {
  fiscalCashierName: string;
  fiscalDetailsOpen: boolean;
  fiscalFd: string;
  fiscalFn: string;
  fiscalFpd: string;
  fiscalReceiptIssuedAt: string;
  fiscalReceiptNumber: string;
  fiscalReceiptUrl: string;
  fiscalReceiptUrlInvalid: boolean;
  onFiscalCashierNameChange: (value: string) => void;
  onFiscalFdChange: (value: string) => void;
  onFiscalFnChange: (value: string) => void;
  onFiscalFpdChange: (value: string) => void;
  onFiscalReceiptIssuedAtChange: (value: string) => void;
  onFiscalReceiptNumberChange: (value: string) => void;
  onFiscalReceiptUrlChange: (value: string) => void;
  paymentMissingId: string;
};

function FiscalDetails({
  fiscalCashierName,
  fiscalDetailsOpen,
  fiscalFd,
  fiscalFn,
  fiscalFpd,
  fiscalReceiptIssuedAt,
  fiscalReceiptNumber,
  fiscalReceiptUrl,
  fiscalReceiptUrlInvalid,
  onFiscalCashierNameChange,
  onFiscalFdChange,
  onFiscalFnChange,
  onFiscalFpdChange,
  onFiscalReceiptIssuedAtChange,
  onFiscalReceiptNumberChange,
  onFiscalReceiptUrlChange,
  paymentMissingId
}: FiscalDetailsProps) {
  return (
    <details className="payment-capture-detail-section" open={fiscalDetailsOpen}>
      <summary>Фискальный чек и кассир</summary>
      <div className="smart-details-content">
        <div className="payment-capture-detail-grid">
        {/* id + htmlFor обязательны: оформление «плавающей» подписи держится
            на соседних селекторах (.smart-field input ~ label), а вот
            доступное имя из соседства не берётся — программа чтения с
            экрана объявляла эти поля безымянными. Атрибуты только
            добавляются, на вид ничего не влияет. */}
        <div className="smart-field">
          <input
            id="payment-fiscal-receipt-number"
            autoComplete="off"
            value={fiscalReceiptNumber}
            onChange={(event) => onFiscalReceiptNumberChange(event.target.value)}
            placeholder=" " />
          <label htmlFor="payment-fiscal-receipt-number">Номер чека (можно пусто, если есть ФД/ФПД)</label>
        </div>
        <div className="smart-field no-float">
          <input id="payment-fiscal-receipt-issued-at" type="datetime-local" value={fiscalReceiptIssuedAt} onChange={(event) => onFiscalReceiptIssuedAtChange(event.target.value)} />
          <label htmlFor="payment-fiscal-receipt-issued-at">Дата чека</label>
        </div>
        <div className="smart-field">
          <DigitsInput id="payment-fiscal-fn" maxLength={32} value={fiscalFn} onChange={onFiscalFnChange} placeholder=" " />
          <label htmlFor="payment-fiscal-fn">ФО (номер фискального накопителя)</label>
        </div>
        <div className="smart-field">
          <DigitsInput id="payment-fiscal-fd" maxLength={32} value={fiscalFd} onChange={onFiscalFdChange} placeholder=" " />
          <label htmlFor="payment-fiscal-fd">ФД (номер фискального документа)</label>
        </div>
        <div className="smart-field">
          <DigitsInput id="payment-fiscal-fpd" maxLength={32} value={fiscalFpd} onChange={onFiscalFpdChange} placeholder=" " />
          <label htmlFor="payment-fiscal-fpd">ФПД (фискальный признак)</label>
        </div>
        <div className="smart-field">
          <input
            id="payment-fiscal-receipt-url"
            type="url"
            autoComplete="url"
            aria-invalid={fiscalReceiptUrlInvalid || undefined}
            aria-describedby={fiscalReceiptUrlInvalid ? paymentMissingId : undefined}
            value={fiscalReceiptUrl}
            onChange={(event) => onFiscalReceiptUrlChange(event.target.value)}
            placeholder=" " />
          <label htmlFor="payment-fiscal-receipt-url">Ссылка НФД (https://...)</label>
        </div>
        <div className="smart-field">
          <input
            id="payment-fiscal-cashier-name"
            autoComplete="off"
            value={fiscalCashierName}
            onChange={(event) => onFiscalCashierNameChange(event.target.value)}
            placeholder=" " />
          <label htmlFor="payment-fiscal-cashier-name">Кассир (ФИО администратора)</label>
        </div>
      </div>
      </div>
    </details>
  );
}

type TaxPayerDetailsProps = {
  applyPatientTaxDefaults: () => void;
  onPayerBirthDateChange: (value: string) => void;
  onPayerFullNameChange: (value: string) => void;
  onPayerIdentityDocumentChange: (value: string) => void;
  onPayerInnChange: (value: string) => void;
  onPayerRelationshipChange: (value: string) => void;
  onTaxDeductionCodeChange: (value: TaxDeductionCode) => void;
  patientDefaults: {
    birthDate?: string | null;
    fullName?: string | null;
    identityDocument?: string | null;
    taxpayerInn?: string | null;
  };
  patientTaxDefaultsAvailable: boolean;
  payerBirthDate: string;
  payerFullName: string;
  payerIdentityDocument: string;
  payerInn: string;
  payerInnInvalid: boolean;
  payerRelationship: string;
  paymentMissingId: string;
  taxDeductionCode: TaxDeductionCode;
  taxDefaultsGuidanceId: string;
  taxPayerDetailsOpen: boolean;
};

function TaxPayerDetails({
  applyPatientTaxDefaults,
  onPayerBirthDateChange,
  onPayerFullNameChange,
  onPayerIdentityDocumentChange,
  onPayerInnChange,
  onPayerRelationshipChange,
  onTaxDeductionCodeChange,
  patientDefaults,
  patientTaxDefaultsAvailable,
  payerBirthDate,
  payerFullName,
  payerIdentityDocument,
  payerInn,
  payerInnInvalid,
  payerRelationship,
  paymentMissingId,
  taxDeductionCode,
  taxDefaultsGuidanceId,
  taxPayerDetailsOpen
}: TaxPayerDetailsProps) {
  return (
    <details className="payment-capture-detail-section" open={taxPayerDetailsOpen}>
      <summary>Плательщик для налогового вычета</summary>
      <div className="smart-details-content">
        <div className="payment-capture-detail-grid">
        <div className="smart-field">
          <input
            id="payment-payer-full-name"
            autoComplete="name"
            value={payerFullName}
            onChange={(event) => onPayerFullNameChange(event.target.value)}
            placeholder=" " />
          <label htmlFor="payment-payer-full-name">Плательщик для вычета (ФИО)</label>
        </div>
        <div className="smart-field">
          <DigitsInput
            id="payment-payer-inn"
            maxLength={12}
            aria-invalid={payerInnInvalid || undefined}
            aria-describedby={payerInnInvalid ? paymentMissingId : undefined}
            value={payerInn}
            onChange={onPayerInnChange}
            placeholder=" " />
          <label htmlFor="payment-payer-inn">ИНН плательщика (если есть)</label>
        </div>
        <div className="smart-field no-float">
          <input
            id="payment-payer-birth-date"
            type="date"
            autoComplete="bday"
            value={payerBirthDate}
            onChange={(event) => onPayerBirthDateChange(event.target.value)}
            placeholder=" " />
          <label htmlFor="payment-payer-birth-date">Дата рождения плательщика</label>
        </div>
        <div className="smart-field">
          <input
            id="payment-payer-identity-document"
            autoComplete="off"
            value={payerIdentityDocument}
            onChange={(event) => onPayerIdentityDocumentChange(event.target.value)}
            placeholder=" " />
          <label htmlFor="payment-payer-identity-document">Документ плательщика (паспорт / иной)</label>
        </div>
        <div className="smart-field">
          <input
            id="payment-payer-relationship"
            autoComplete="off"
            value={payerRelationship}
            onChange={(event) => onPayerRelationshipChange(event.target.value)}
            placeholder=" " />
          <label htmlFor="payment-payer-relationship">Родство (пациент, мать...)</label>
          <div className="quick-chips-row" style={{ marginTop: "6px", padding: "0 14px 10px 14px" }}>
             {["пациент", "мать", "отец", "супруг", "супруга"].map(rel => (
               <button key={rel} type="button" className="quick-chip quick-chip--sm" onClick={() => onPayerRelationshipChange(rel)}>{rel}</button>
             ))}
          </div>
        </div>
        <div className="quick-chips-row" style={{marginBottom: "20px"}} aria-label="Код медицинской услуги для налогового вычета">
          <button
            className={`quick-chip ${taxDeductionCode === "" ? "active" : ""}`}
            type="button"
            aria-pressed={taxDeductionCode === ""}
            onClick={() => onTaxDeductionCodeChange("")}
          >
            Не выбран
          </button>
          {(["1", "2"] as const).map((code) => (
            <button
              className={`quick-chip ${taxDeductionCode === code ? "active" : ""}`}
              key={code}
              type="button"
              aria-pressed={taxDeductionCode === code}
              onClick={() => onTaxDeductionCodeChange(code)}
            >
              Код {code}
            </button>
          ))}
        </div>
        <div className="payment-tax-defaults">
          <button
            className="secondary-button"
            type="button"
            onClick={applyPatientTaxDefaults}
            disabled={!patientTaxDefaultsAvailable}
            aria-describedby={!patientTaxDefaultsAvailable ? taxDefaultsGuidanceId : undefined}
            data-testid="payment-fill-payer-from-patient"
          >
            <UserRound aria-hidden="true" /> Заполнить из карточки пациента
          </button>
          {!patientTaxDefaultsAvailable ? (
            <small id={taxDefaultsGuidanceId}>В карточке пациента нет ФИО, даты рождения, документа или ИНН для автозаполнения.</small>
          ) : (
            <small>Заполнит только пустые поля и не перезапишет ручные правки администратора.</small>
          )}
        </div>
      </div>
      </div>
    </details>
  );
}

type InstallmentCalculatorProps = {
  totalAmount: number;
  isOpen: boolean;
};

function InstallmentCalculator({ totalAmount, isOpen }: InstallmentCalculatorProps) {
  const [months, setMonths] = useState(6);
  const [downPaymentPercent, setDownPaymentPercent] = useState(0);

  // БЫЛО: monthlyPayment = Math.round(remaining / months) без сверки с итогом.
  // 100 000 ₽ на 6 месяцев → 16 667 × 6 = 100 002 ₽ (пациенту называли на 2 ₽
  // больше стоимости лечения), 70 000 ₽ на 3 месяца → 69 999 ₽ (счёт не закрыть).
  // Теперь остаток от деления добирается последним платежом: сумма сходится точно.
  const totalKopecks = parseKopecks(totalAmount);
  const basisPoints = Math.round(downPaymentPercent * 100);
  const downPaymentKopecks = percentageOfKopecks(totalKopecks, basisPoints);
  const remainingKopecks = Math.max(0, totalKopecks - downPaymentKopecks);
  const parts = months > 0 && remainingKopecks > 0 ? splitKopecks(remainingKopecks, months) : [0];
  const monthlyPaymentKopecks = parts[0] ?? 0;
  const lastMonthPaymentKopecks = parts[parts.length - 1] ?? 0;
  const downPayment = downPaymentKopecks / 100;
  const monthlyPayment = monthlyPaymentKopecks / 100;
  const lastMonthPayment = lastMonthPaymentKopecks / 100;
  const hasUnevenLastPayment = months > 0 && lastMonthPaymentKopecks !== monthlyPaymentKopecks;

  return (
    <details className="payment-capture-detail-section" open={isOpen} style={{ marginBottom: "20px" }}>
      {/* БЫЛО: «Калькулятор рассрочки (Внутренний)». Слово «внутренний» —
          из разработки: пользователю оно не говорит ничего, а насторожить
          может. Смысл в том, что рассрочка беспроцентная и от самой клиники,
          без банка, — так и написано. */}
      <summary>Рассрочка от клиники, без банка</summary>
      <div className="smart-details-content" style={{ padding: "16px", background: "var(--brand-50)", borderRadius: "8px", marginTop: "8px" }}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "16px" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label htmlFor="installment-months-range" style={{ fontSize: "13px", fontWeight: 600, color: "var(--slate-700)", display: "block", marginBottom: "8px" }}>Срок рассрочки (мес): {months}</label>
            <input id="installment-months-range" type="range" min="2" max="24" step="1" value={months} onChange={(e) => setMonths(parseInt(e.target.value))} style={{ width: "100%" }} />
            <div style={{ display: "flex", gap: "4px", marginTop: "8px", flexWrap: "wrap" }}>
              {[3, 6, 12, 24].map(m => (
                <button key={m} type="button" className={`quick-chip quick-chip--sm ${months === m ? 'active' : ''}`} onClick={() => setMonths(m)}>{m} мес</button>
              ))}
            </div>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label htmlFor="installment-down-payment-range" style={{ fontSize: "13px", fontWeight: 600, color: "var(--slate-700)", display: "block", marginBottom: "8px" }}>Первоначальный взнос: {downPaymentPercent}%</label>
            <input id="installment-down-payment-range" type="range" min="0" max="80" step="10" value={downPaymentPercent} onChange={(e) => setDownPaymentPercent(parseInt(e.target.value))} style={{ width: "100%" }} />
            <div style={{ display: "flex", gap: "4px", marginTop: "8px", flexWrap: "wrap" }}>
              {[0, 20, 30, 50].map(p => (
                <button key={p} type="button" className={`quick-chip quick-chip--sm ${downPaymentPercent === p ? 'active' : ''}`} onClick={() => setDownPaymentPercent(p)}>{p}%</button>
              ))}
            </div>
          </div>
        </div>
        
        {/* БЫЛО: border: 1px solid var(--brand-200). Имени --brand-200 нет ни в
            одном файле стилей (проверка scripts/check-css-tokens.mjs инлайновые
            стили в TSX не видит, поэтому и не поймала). Недействительное
            значение в border-color не наследуется и не откатывается к каскаду —
            берётся начальное currentColor, то есть цвет текста. Рамка вокруг
            итоговой плашки рассрочки рисовалась почти чёрной вместо светлой
            брендовой. Взят объявленный --brand-100 (бирюза темы, есть во всех
            трёх темах): ближайший по смыслу к тому, что задумывали. */}
        <div style={{ display: "flex", justifyContent: "space-between", background: "var(--paper)", padding: "16px", borderRadius: "8px", border: "1px solid var(--brand-100)" }}>
          <div>
            <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>Сумма лечения</div>
            {/* Деньги — общим money(). Своё toLocaleString('ru-RU') печатало
                «120 000,7 ₽» для суммы с копейками: полтинник в такой записи
                читается как пять копеек. */}
            <div style={{ fontSize: "16px", fontWeight: 600 }}>{money(totalAmount)}</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>Первый взнос</div>
            {/* БЫЛО: color: var(--brand-600). В светлой теме это #0284c7, и на
                фоне var(--paper) контраст 4.1 при пороге 4.5 — замерено,
                scratch/audit-inline-colors.mjs. Начертание 16px/600 к крупному
                тексту не относится, поэтому послабления нет.
                Это денежная цифра: читаемость важнее акцента. Оставляем тот же
                цвет, что у соседней «Суммы лечения» — они равноправны, а
                выделен и без того «Ежемесячный платеж»: он крупнее и цветной. */}
            <div style={{ fontSize: "16px", fontWeight: 600 }}>{money(downPayment)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>Ежемесячный платеж</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--rust)" }}>{money(monthlyPayment)}</div>
            {/* Остаток от деления добирается последним месяцем, чтобы сумма
                платежей в точности равнялась стоимости лечения. */}
            {hasUnevenLastPayment && (
              <div style={{ fontSize: "12px", color: "var(--slate-500)", marginTop: "2px" }}>
                последний месяц — {money(lastMonthPayment)}
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "var(--slate-500)", marginTop: "12px" }}>
          Итого по графику: {money(downPayment + monthlyPayment * Math.max(0, months - 1) + lastMonthPayment)}
        </div>
      </div>
    </details>
  );
}

export function PaymentCapture({
  amount,
  feedback,
  fiscalCashierName,
  fiscalFd,
  fiscalFn,
  fiscalFpd,
  fiscalReceiptIssuedAt,
  fiscalReceiptNumber,
  fiscalReceiptUrl,
  isSaving,
  method,
  methodLabels,
  onAmountChange,
  onFiscalCashierNameChange,
  onFiscalFdChange,
  onFiscalFnChange,
  onFiscalFpdChange,
  onFiscalReceiptIssuedAtChange,
  onFiscalReceiptNumberChange,
  onFiscalReceiptUrlChange,
  onMethodChange,
  onPayerBirthDateChange,
  onPayerFullNameChange,
  onPayerIdentityDocumentChange,
  onPayerInnChange,
  onPayerRelationshipChange,
  onSubmit,
  onTaxDeductionCodeChange,
  patientContextMessage,
  patientContextReady,
  patientDefaults,
  payerBirthDate,
  payerFullName,
  payerIdentityDocument,
  payerInn,
  payerRelationship,
  taxDeductionCode,
  remainingDebt
}: PaymentCaptureProps) {
  const [smartInputText, setSmartInputText] = useState("");
  const [showSmartPreview, setShowSmartPreview] = useState(false);
  // Таймер автоскрытия предпросмотра — держим, чтобы отменить при размонтировании.
  const smartPreviewTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (smartPreviewTimerRef.current) window.clearTimeout(smartPreviewTimerRef.current);
  }, []);
  const [smartParsedData, setSmartParsedData] = useState<any>(null);
  const [showHints, setShowHints] = useState(false);
  
  const handleSmartDictation = (text: string) => {
    if (!text.trim()) return;
    const result = AiOrchestrator.processPaymentDictation(text);
    if (result.source === "local_algorithm" && result.data) {
       const parsed = result.data;
       if (parsed.amount) onAmountChange(parsed.amount);
       if (parsed.method) onMethodChange(parsed.method as PaymentMethod);
       if (parsed.taxDeductionCode) onTaxDeductionCodeChange(parsed.taxDeductionCode as TaxDeductionCode);
       
       setSmartParsedData({ isAiTask: false, text: "Успешно распознано: " + text, parsed });
       setShowSmartPreview(true);
       // БЫЛО: setTimeout без сохранения идентификатора и без очистки. Через
       // 2 секунды он безусловно стирал поле голосового ввода — если оператор
       // за это время начинал печатать вручную, текст пропадал прямо посреди
       // слова. Плюс таймер срабатывал уже после размонтирования компонента.
       if (smartPreviewTimerRef.current) window.clearTimeout(smartPreviewTimerRef.current);
       smartPreviewTimerRef.current = window.setTimeout(() => {
         smartPreviewTimerRef.current = null;
         setShowSmartPreview(false);
         // Поле очищаем ТОЛЬКО если оператор не начал править его вручную.
         setSmartInputText((current) => (current === text ? "" : current));
       }, 2000);
    }
  };
  
  const amountMissingStep = validateRubAmountInput(amount);
  // rubAmountInputMissingStep(amount)
  const taxDeductionRequested = taxDeductionCode === "1" || taxDeductionCode === "2";
  const trimmedFiscalReceiptUrl = fiscalReceiptUrl.trim();
  const trimmedPayerInn = payerInn.trim();
  const paymentMissingId = "payment-capture-missing";
  const taxDefaultsGuidanceId = "payment-tax-defaults-guidance";
  const paymentAmountInvalid = Boolean(amountMissingStep);
  const fiscalReceiptUrlInvalid = Boolean(trimmedFiscalReceiptUrl && !/^https?:\/\/\S+$/i.test(trimmedFiscalReceiptUrl));
  const payerInnInvalid = Boolean(trimmedPayerInn && !/^\d{10}$|^\d{12}$/.test(trimmedPayerInn));
  const patientTaxDefaultsAvailable = Boolean(
    patientDefaults.fullName?.trim() ||
      patientDefaults.birthDate?.trim() ||
      patientDefaults.identityDocument?.trim() ||
      patientDefaults.taxpayerInn?.trim()
  );
  const fiscalDetailsOpen =
    taxDeductionRequested ||
    Boolean(
      fiscalReceiptNumber.trim() ||
        fiscalReceiptIssuedAt.trim() ||
        fiscalFn.trim() ||
        fiscalFd.trim() ||
        fiscalFpd.trim() ||
        trimmedFiscalReceiptUrl ||
        fiscalCashierName.trim()
    );
  const taxPayerDetailsOpen =
    taxDeductionRequested ||
    Boolean(
      payerFullName.trim() ||
        trimmedPayerInn ||
        payerBirthDate.trim() ||
        payerIdentityDocument.trim() ||
        (payerRelationship.trim() && payerRelationship.trim() !== "пациент")
    );
  const paymentMissingSteps = [
    !patientContextReady ? patientContextMessage || "выберите пациента текущего приема" : null,
    amountMissingStep,
    fiscalReceiptUrlInvalid ? "ссылка НФД должна начинаться с http:// или https://" : null,
    payerInnInvalid ? "ИНН плательщика должен содержать 10 или 12 цифр" : null,
    taxDeductionRequested && !fiscalReceiptIssuedAt.trim() ? "для вычета укажите дату фискального чека" : null,
    taxDeductionRequested && !fiscalFn.trim() ? "для вычета укажите ФО" : null,
    taxDeductionRequested && !fiscalFd.trim() ? "для вычета укажите ФД" : null,
    taxDeductionRequested && !fiscalFpd.trim() ? "для вычета укажите ФПД" : null,
    taxDeductionRequested && !payerFullName.trim() ? "для вычета укажите ФИО плательщика явно" : null,
    taxDeductionRequested && !payerBirthDate.trim() ? "для вычета укажите дату рождения плательщика" : null,
    taxDeductionRequested && !payerIdentityDocument.trim() ? "для вычета укажите документ плательщика" : null,
    taxDeductionRequested && !payerRelationship.trim() ? "для вычета укажите родство плательщика" : null
  ].filter((step): step is string => Boolean(step));
  const paymentReadyToSubmit = paymentMissingSteps.length === 0;
  const applyPatientTaxDefaults = () => {
    if (!payerFullName.trim() && patientDefaults.fullName?.trim()) onPayerFullNameChange(patientDefaults.fullName.trim());
    if (!payerBirthDate.trim() && patientDefaults.birthDate?.trim()) onPayerBirthDateChange(patientDefaults.birthDate.trim());
    if (!payerIdentityDocument.trim() && patientDefaults.identityDocument?.trim()) onPayerIdentityDocumentChange(patientDefaults.identityDocument.trim());
    if (!trimmedPayerInn && patientDefaults.taxpayerInn?.trim()) onPayerInnChange(digitsOnly(patientDefaults.taxpayerInn, 12));
    if (!payerRelationship.trim()) onPayerRelationshipChange("пациент");
  };

  return (
    <div className="payment-capture bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-4" id="payment-capture">
      {feedback ? (
        <div className="payment-capture-feedback" role="status" aria-live="polite">
          {feedback}
        </div>
      ) : (
        <>
        {/* flexDirection задаём явно. Класс .smart-ai-booking в main.css
            содержит flex-direction: column, инлайновый стиль его не отменял, и
            строка разворачивалась в столбик: значок, поле ввода и микрофон
            вставали друг под другом в узкой колонке шириной около 200px, а
            подсказка «Пример: Оплата 5000 картой…» обрезалась на полуслове.
            Видно на скриншоте экрана «Оплаты». Соседний вызов класса в
            NewAppointmentForm столбик задаёт сам, поэтому общий стиль не
            трогаем. */}
        <div className="smart-ai-booking" style={{ gridColumn: '1 / -1', marginBottom: '12px', border: '1px solid var(--brand-300)', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.05)', borderRadius: '12px', padding: '8px 12px', background: 'var(--paper)', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
          <Bot size={18} color="var(--brand-600)" />
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={smartInputText}
              placeholder="Пример: Оплата 5000 картой, нужен налоговый вычет..."
              onFocus={() => setShowHints(true)}
              onBlur={() => setTimeout(() => setShowHints(false), 200)}
              onChange={(e) => setSmartInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && smartInputText.trim()) {
                  e.preventDefault();
                  handleSmartDictation(smartInputText);
                }
              }}
              style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }}
            />
            <DictationHints isVisible={showHints && !smartInputText} type="payment" />
          </div>
          <SmartMicrophoneButton
            context="payment"
            onResult={(t) => {
              const normalized = textToNumbers(t);
              setSmartInputText(normalized);
              handleSmartDictation(normalized);
            }}
            style={{ color: "var(--brand-600)", background: "transparent", border: "none" }}
            className="icon-button"
          />
        </div>
        <div className="quick-chips-row" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <button type="button" className="quick-chip quick-chip--sm" onClick={() => handleSmartDictation("5000 наличными")}>💰 5000 наличными</button>
          <button type="button" className="quick-chip quick-chip--sm" onClick={() => handleSmartDictation("15000 по карте")}>💳 15000 картой</button>
          <button type="button" className="quick-chip quick-chip--sm" onClick={() => handleSmartDictation("20000 сбп, вычет")}>🧾 20000 СБП + вычет</button>
        </div>
        {showSmartPreview && smartParsedData && (
          <div style={{ marginBottom: '16px' }}>
            <SmartParsePreview 
              parsedData={smartParsedData} 
              rawText={smartInputText}
              type="visit"
              isVisible={showSmartPreview}
              onClose={() => setShowSmartPreview(false)} 
              onApply={() => setShowSmartPreview(false)} 
              onManual={() => setShowSmartPreview(false)} 
            />
          </div>
        )}
        </>
      )}
      <div className="smart-field">
        <input
          id="payment-amount-input"
          inputMode="numeric"
          autoComplete="transaction-amount"
          pattern="[0-9\s]*"
          aria-label="Сумма оплаты"
          aria-invalid={paymentAmountInvalid || undefined}
          aria-describedby={paymentAmountInvalid ? paymentMissingId : undefined}
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder=" "
        />
        <label>Сумма к оплате (₽)</label>
        {remainingDebt !== undefined && (
          <div className="quick-chips-row" style={{ marginTop: "6px", flexWrap: "wrap", width: "max-content", maxWidth: "260px" }}>
            {remainingDebt > 0 && (
              <button
                type="button"
                className="quick-chip"
                /*
                 * БЫЛО: String(Math.round(...)) округлял долг до целых рублей.
                 * 1500,24 ₽ → 1500 (копейки зависали); 1500,70 ₽ → 1501 (лишние 30 коп.).
                 * Поле суммы уже принимает копейки (normalizeRubAmountInput).
                 * СТАЛО: rubAmountForInput — копейки целыми, формат поля верный.
                 */
                onClick={() => onAmountChange(rubAmountForInput(remainingDebt))}
              >
                {/* Подпись money(remainingDebt) совпадает с тем, что уходит в поле. */}
                Долг: {money(remainingDebt)}
              </button>
            )}
            {[1000, 2000, 3000, 5000].map((val) => (
              <button
                key={val}
                type="button"
                className="quick-chip quick-chip--sm"
                onClick={() => onAmountChange(String(val))}
              >
                {val} ₽
              </button>
            ))}
          </div>
        )}
      
      </div>
      <div className="quick-chips-row" style={{marginBottom: "20px"}} aria-label="Способ оплаты">
        {visiblePaymentMethods.map((paymentMethod) => (
          <button
            className={`quick-chip ${method === paymentMethod ? "active" : ""}`}
            key={paymentMethod}
            type="button"
            aria-pressed={method === paymentMethod}
            onClick={() => onMethodChange(paymentMethod)}
          >
            {methodLabels[paymentMethod]}
          </button>
        ))}
      </div>
      <FiscalDetails
        fiscalCashierName={fiscalCashierName}
        fiscalDetailsOpen={fiscalDetailsOpen}
        fiscalFd={fiscalFd}
        fiscalFn={fiscalFn}
        fiscalFpd={fiscalFpd}
        fiscalReceiptIssuedAt={fiscalReceiptIssuedAt}
        fiscalReceiptNumber={fiscalReceiptNumber}
        fiscalReceiptUrl={fiscalReceiptUrl}
        fiscalReceiptUrlInvalid={fiscalReceiptUrlInvalid}
        onFiscalCashierNameChange={onFiscalCashierNameChange}
        onFiscalFdChange={onFiscalFdChange}
        onFiscalFnChange={onFiscalFnChange}
        onFiscalFpdChange={onFiscalFpdChange}
        onFiscalReceiptIssuedAtChange={onFiscalReceiptIssuedAtChange}
        onFiscalReceiptNumberChange={onFiscalReceiptNumberChange}
        onFiscalReceiptUrlChange={onFiscalReceiptUrlChange}
        paymentMissingId={paymentMissingId}
      />
      <TaxPayerDetails
        applyPatientTaxDefaults={applyPatientTaxDefaults}
        onPayerBirthDateChange={onPayerBirthDateChange}
        onPayerFullNameChange={onPayerFullNameChange}
        onPayerIdentityDocumentChange={onPayerIdentityDocumentChange}
        onPayerInnChange={onPayerInnChange}
        onPayerRelationshipChange={onPayerRelationshipChange}
        onTaxDeductionCodeChange={onTaxDeductionCodeChange}
        patientDefaults={patientDefaults}
        patientTaxDefaultsAvailable={patientTaxDefaultsAvailable}
        payerBirthDate={payerBirthDate}
        payerFullName={payerFullName}
        payerIdentityDocument={payerIdentityDocument}
        payerInn={payerInn}
        payerInnInvalid={payerInnInvalid}
        payerRelationship={payerRelationship}
        paymentMissingId={paymentMissingId}
        taxDeductionCode={taxDeductionCode}
        taxDefaultsGuidanceId={taxDefaultsGuidanceId}
        taxPayerDetailsOpen={taxPayerDetailsOpen}
      />
      {/* БЫЛО: parseFloat("120 000") === 120. Поле суммы явно разрешает пробелы
          (pattern="[0-9\s]*"), администратор набирает "120 000" — и калькулятор
          показывал рассрочку на 120 ₽ по 20 ₽ в месяц. Используем тот же
          нормализатор, что и валидация формы: он снимает пробелы и NBSP. */}
      <InstallmentCalculator totalAmount={normalizeRubAmountInput(amount) ?? 0} isOpen={false} />
      {!paymentReadyToSubmit ? (
        <div className="payment-capture-missing" id={paymentMissingId} role="status" aria-live="polite">
          <strong>Чтобы принять оплату, осталось:</strong>
          <ul>
            {paymentMissingSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="payment-capture-safeguard">
        Каждая оплата добавляет новую строку в историю. Ошибку закрывайте возвратом или коррекцией, не повторной записью.
      </p>
      <button
        className="primary-button"
        type="button"
        onClick={onSubmit}
        aria-busy={isSaving || undefined}
        aria-describedby={!paymentReadyToSubmit ? paymentMissingId : undefined}
        disabled={isSaving || !paymentReadyToSubmit}
      >
        {/* Было «Записываэ»: опечатка на кнопке кассы, видна каждому кассиру. */}
        <CreditCard aria-hidden="true" /> {isSaving ? "Записываю" : "Принять оплату"}
      </button>
    </div>
  );
}
