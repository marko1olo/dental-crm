import { CreditCard } from "lucide-react";
import type { PaymentMethod } from "@dental/shared";

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
};

const visiblePaymentMethods: PaymentMethod[] = ["cash", "card", "bank_transfer", "online"];

const digitsOnly = (value: string, maxLength: number) => value.replace(/[^\d]/g, "").slice(0, maxLength);

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
  taxDeductionCode
}: PaymentCaptureProps) {
  const amountRub = Number(amount.replace(/[^\d]/g, ""));
  const taxDeductionRequested = taxDeductionCode === "1" || taxDeductionCode === "2";
  const trimmedFiscalReceiptUrl = fiscalReceiptUrl.trim();
  const trimmedPayerInn = payerInn.trim();
  const paymentMissingSteps = [
    !patientContextReady ? patientContextMessage || "выберите пациента текущего приема" : null,
    !Number.isFinite(amountRub) || amountRub <= 0 ? "укажите сумму больше нуля" : null,
    trimmedFiscalReceiptUrl && !/^https?:\/\/\S+$/i.test(trimmedFiscalReceiptUrl) ? "ссылка ОФД должна начинаться с http:// или https://" : null,
    trimmedPayerInn && !/^\d{10}$|^\d{12}$/.test(trimmedPayerInn) ? "ИНН плательщика должен содержать 10 или 12 цифр" : null,
    taxDeductionRequested && !fiscalReceiptIssuedAt.trim() ? "для вычета укажите дату фискального чека" : null,
    taxDeductionRequested && !fiscalFn.trim() ? "для вычета укажите ФН" : null,
    taxDeductionRequested && !fiscalFd.trim() ? "для вычета укажите ФД" : null,
    taxDeductionRequested && !fiscalFpd.trim() ? "для вычета укажите ФПД" : null,
    taxDeductionRequested && !payerFullName.trim() ? "для вычета укажите ФИО плательщика явно" : null,
    taxDeductionRequested && !payerBirthDate.trim() ? "для вычета укажите дату рождения плательщика" : null,
    taxDeductionRequested && !payerIdentityDocument.trim() ? "для вычета укажите документ плательщика" : null,
    taxDeductionRequested && !payerRelationship.trim() ? "для вычета укажите родство плательщика" : null
  ].filter((step): step is string => Boolean(step));
  const paymentReadyToSubmit = paymentMissingSteps.length === 0;

  return (
    <div className="payment-capture">
      {feedback ? (
        <div className="payment-capture-feedback" role="status" aria-live="polite">
          {feedback}
        </div>
      ) : null}
      <label>
        Сумма
        <input inputMode="numeric" value={amount} onChange={(event) => onAmountChange(event.target.value)} placeholder="3800" />
      </label>
      <div className="payment-methods" aria-label="Способ оплаты">
        {visiblePaymentMethods.map((paymentMethod) => (
          <button
            className={method === paymentMethod ? "active" : ""}
            key={paymentMethod}
            type="button"
            onClick={() => onMethodChange(paymentMethod)}
          >
            {methodLabels[paymentMethod]}
          </button>
        ))}
      </div>
      <details className="payment-capture-detail-section">
        <summary>Фискальный чек и кассир</summary>
        <div className="payment-capture-detail-grid">
          <label>
            Номер чека / примечание
            <input
              value={fiscalReceiptNumber}
              onChange={(event) => onFiscalReceiptNumberChange(event.target.value)}
              placeholder="можно оставить пустым, если есть ФН/ФД/ФПД"
            />
          </label>
          <label>
            Дата чека
            <input type="datetime-local" value={fiscalReceiptIssuedAt} onChange={(event) => onFiscalReceiptIssuedAtChange(event.target.value)} />
          </label>
          <label>
            ФН
            <input
              inputMode="numeric"
              value={fiscalFn}
              onChange={(event) => onFiscalFnChange(digitsOnly(event.target.value, 32))}
              placeholder="номер фискального накопителя"
            />
          </label>
          <label>
            ФД
            <input
              inputMode="numeric"
              value={fiscalFd}
              onChange={(event) => onFiscalFdChange(digitsOnly(event.target.value, 32))}
              placeholder="номер фискального документа"
            />
          </label>
          <label>
            ФПД
            <input
              inputMode="numeric"
              value={fiscalFpd}
              onChange={(event) => onFiscalFpdChange(digitsOnly(event.target.value, 32))}
              placeholder="фискальный признак"
            />
          </label>
          <label>
            Ссылка ОФД
            <input value={fiscalReceiptUrl} onChange={(event) => onFiscalReceiptUrlChange(event.target.value)} placeholder="https://..." />
          </label>
          <label>
            Кассир
            <input
              value={fiscalCashierName}
              onChange={(event) => onFiscalCashierNameChange(event.target.value)}
              placeholder="ФИО администратора"
            />
          </label>
        </div>
      </details>
      <details className="payment-capture-detail-section">
        <summary>Плательщик для налогового вычета</summary>
        <div className="payment-capture-detail-grid">
          <label>
            Плательщик для вычета
            <input
              value={payerFullName}
              onChange={(event) => onPayerFullNameChange(event.target.value)}
              placeholder={patientDefaults.fullName ?? "ФИО налогоплательщика"}
            />
          </label>
          <label>
            ИНН плательщика
            <input
              inputMode="numeric"
              value={payerInn}
              onChange={(event) => onPayerInnChange(digitsOnly(event.target.value, 12))}
              placeholder={patientDefaults.taxpayerInn ?? "если есть"}
            />
          </label>
          <label>
            Дата рождения плательщика
            <input
              type="date"
              value={payerBirthDate}
              onChange={(event) => onPayerBirthDateChange(event.target.value)}
              placeholder={patientDefaults.birthDate ?? ""}
            />
          </label>
          <label>
            Документ плательщика
            <input
              value={payerIdentityDocument}
              onChange={(event) => onPayerIdentityDocumentChange(event.target.value)}
              placeholder={patientDefaults.identityDocument ?? "паспорт / иной документ"}
            />
          </label>
          <label>
            Родство
            <input value={payerRelationship} onChange={(event) => onPayerRelationshipChange(event.target.value)} placeholder="пациент" />
          </label>
          <div className="payment-methods" aria-label="Код медицинской услуги для налогового вычета">
            <button className={taxDeductionCode === "" ? "active" : ""} type="button" onClick={() => onTaxDeductionCodeChange("")}>
              Не выбран
            </button>
            {(["1", "2"] as const).map((code) => (
              <button className={taxDeductionCode === code ? "active" : ""} key={code} type="button" onClick={() => onTaxDeductionCodeChange(code)}>
                Код {code}
              </button>
            ))}
          </div>
        </div>
      </details>
      {!paymentReadyToSubmit ? (
        <div className="payment-capture-missing" role="status" aria-live="polite">
          <strong>Чтобы принять оплату, осталось:</strong>
          <ul>
            {paymentMissingSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <button className="primary-button" type="button" onClick={onSubmit} aria-busy={isSaving || undefined} disabled={isSaving || !paymentReadyToSubmit}>
        <CreditCard aria-hidden="true" /> {isSaving ? "Записываю" : "Принять оплату"}
      </button>
    </div>
  );
}
