import {
	type PaymentMethod,
	calculateCashChange,
	getCashPresetSuggestions,
	parseKopecks,
	percentageOfKopecks,
	splitKopecks,
} from "@dental/shared";
import { Banknote, Bot, Coins, CreditCard, QrCode, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { money } from "./AppHelpers";
import { SberPosTerminalModal } from "./components/payments/sberPos/SberPosTerminalModal";
import { showToast } from "./components/GlobalToast";
import { rubAmountForInput } from "./components/payments/cashDeskAmounts";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { DictationHints } from "./DictationHints";
import { AiOrchestrator } from "./lib/aiOrchestrator";
import { textToNumbers } from "./lib/stringUtils";
import {
	normalizeRubAmountInput,
	validateRubAmountInput,
} from "./rubAmountInput";
import { SmartParsePreview } from "./SmartParsePreview";

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
	patientId?: string | null;
	payerBirthDate: string;
	payerFullName: string;
	payerIdentityDocument: string;
	payerInn: string;
	payerRelationship: string;
	taxDeductionCode: TaxDeductionCode;
	remainingDebt?: number;
};

const visiblePaymentMethods: PaymentMethod[] = [
	"cash",
	"card",
	"bank_transfer",
	"online",
];

const digitsOnly = (value: string, maxLength: number) =>
	value.replace(/[^\d]/g, "").slice(0, maxLength);

type DigitsInputProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"onChange"
> & {
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
	paymentMissingId,
}: FiscalDetailsProps) {
	return (
		<details
			className="payment-capture-detail-section"
			open={fiscalDetailsOpen}
		>
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
							onChange={(event) =>
								onFiscalReceiptNumberChange(event.target.value)
							}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-receipt-number">
							Номер чека (можно пусто, если есть ФД/ФПД)
						</label>
					</div>
					<div className="smart-field no-float">
						<input
							id="payment-fiscal-receipt-issued-at"
							type="datetime-local"
							value={fiscalReceiptIssuedAt}
							onChange={(event) =>
								onFiscalReceiptIssuedAtChange(event.target.value)
							}
						/>
						<label htmlFor="payment-fiscal-receipt-issued-at">Дата чека</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							id="payment-fiscal-fn"
							maxLength={32}
							value={fiscalFn}
							onChange={onFiscalFnChange}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-fn">
							ФН (номер фискального накопителя)
						</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							id="payment-fiscal-fd"
							maxLength={32}
							value={fiscalFd}
							onChange={onFiscalFdChange}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-fd">
							ФД (номер фискального документа)
						</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							id="payment-fiscal-fpd"
							maxLength={32}
							value={fiscalFpd}
							onChange={onFiscalFpdChange}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-fpd">ФПД (фискальный признак)</label>
					</div>
					<div className="smart-field">
						<input
							id="payment-fiscal-receipt-url"
							type="url"
							autoComplete="url"
							aria-invalid={fiscalReceiptUrlInvalid || undefined}
							aria-describedby={
								fiscalReceiptUrlInvalid ? paymentMissingId : undefined
							}
							value={fiscalReceiptUrl}
							onChange={(event) => onFiscalReceiptUrlChange(event.target.value)}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-receipt-url">
							Ссылка ОФД (https://...)
						</label>
					</div>
					<div className="smart-field">
						<input
							id="payment-fiscal-cashier-name"
							autoComplete="off"
							value={fiscalCashierName}
							onChange={(event) =>
								onFiscalCashierNameChange(event.target.value)
							}
							placeholder=" "
						/>
						<label htmlFor="payment-fiscal-cashier-name">
							Кассир (ФИО администратора)
						</label>
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
	// biome-ignore lint/correctness/noUnusedFunctionParameters: automated suppression
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
	taxPayerDetailsOpen,
}: TaxPayerDetailsProps) {
	return (
		<details
			className="payment-capture-detail-section"
			open={taxPayerDetailsOpen}
		>
			<summary>Плательщик для налогового вычета</summary>
			<div className="smart-details-content">
				<div className="payment-capture-detail-grid">
					<div className="smart-field">
						<input
							id="payment-payer-full-name"
							autoComplete="name"
							value={payerFullName}
							onChange={(event) => onPayerFullNameChange(event.target.value)}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-full-name">
							Плательщик для вычета (ФИО)
						</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							id="payment-payer-inn"
							maxLength={12}
							aria-invalid={payerInnInvalid || undefined}
							aria-describedby={payerInnInvalid ? paymentMissingId : undefined}
							value={payerInn}
							onChange={onPayerInnChange}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-inn">
							ИНН плательщика (если есть, физлицам по 54-ФЗ не требуется)
						</label>
					</div>
					<div className="smart-field no-float">
						<input
							id="payment-payer-birth-date"
							type="date"
							autoComplete="bday"
							value={payerBirthDate}
							onChange={(event) => onPayerBirthDateChange(event.target.value)}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-birth-date">
							Дата рождения плательщика
						</label>
					</div>
					<div className="smart-field">
						<input
							id="payment-payer-identity-document"
							autoComplete="off"
							value={payerIdentityDocument}
							onChange={(event) =>
								onPayerIdentityDocumentChange(event.target.value)
							}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-identity-document">
							Документ плательщика (паспорт / иной)
						</label>
					</div>
					<div className="smart-field">
						<input
							id="payment-payer-relationship"
							autoComplete="off"
							value={payerRelationship}
							onChange={(event) =>
								onPayerRelationshipChange(event.target.value)
							}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-relationship">
							Родство (пациент, мать...)
						</label>
						<div
							className="quick-chips-row"
							style={{ marginTop: "6px", padding: "0 14px 10px 14px" }}
						>
							{["пациент", "мать", "отец", "супруг", "супруга"].map((rel) => (
								<button
									key={rel}
									type="button"
									className="quick-chip min-h-[44px] px-3.5 text-xs sm:text-sm font-semibold"
									style={{ minHeight: "44px" }}
									onClick={() => onPayerRelationshipChange(rel)}
								>
									{rel}
								</button>
							))}
						</div>
					</div>
					<div
						role="toolbar"
						className="quick-chips-row"
						style={{ marginBottom: "20px" }}
						aria-label="Код медицинской услуги для налогового вычета"
					>
						<button
							className={`quick-chip min-h-[44px] px-3.5 text-xs sm:text-sm font-semibold ${taxDeductionCode === "" ? "active" : ""}`}
							type="button"
							style={{ minHeight: "44px" }}
							aria-pressed={taxDeductionCode === ""}
							onClick={() => onTaxDeductionCodeChange("")}
						>
							Не выбран
						</button>
						{(["1", "2"] as const).map((code) => (
							<button
								className={`quick-chip min-h-[44px] px-3.5 text-xs sm:text-sm font-semibold ${taxDeductionCode === code ? "active" : ""}`}
								key={code}
								type="button"
								style={{ minHeight: "44px" }}
								aria-pressed={taxDeductionCode === code}
								onClick={() => onTaxDeductionCodeChange(code)}
							>
								Код {code}
							</button>
						))}
					</div>
					<div className="payment-tax-defaults">
						<button
							className="secondary-button min-h-[44px]"
							type="button"
							style={{ minHeight: "44px" }}
							onClick={applyPatientTaxDefaults}
							disabled={false}
							aria-describedby={
								!patientTaxDefaultsAvailable ? taxDefaultsGuidanceId : undefined
							}
							data-testid="payment-fill-payer-from-patient"
						>
							<UserRound aria-hidden="true" /> Заполнить из карточки пациента
						</button>
						{!patientTaxDefaultsAvailable ? (
							<small id={taxDefaultsGuidanceId}>
								В карточке пациента нет ФИО, даты рождения, документа или ИНН
								для автозаполнения.
							</small>
						) : (
							<small>
								Заполнит только пустые поля и не перезапишет ручные правки
								администратора.
							</small>
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

function InstallmentCalculator({
	totalAmount,
	isOpen,
}: InstallmentCalculatorProps) {
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
	const parts =
		months > 0 && remainingKopecks > 0
			? splitKopecks(remainingKopecks, months)
			: [0];
	const monthlyPaymentKopecks = parts[0] ?? 0;
	const lastMonthPaymentKopecks = parts[parts.length - 1] ?? 0;
	const downPayment = downPaymentKopecks / 100;
	const monthlyPayment = monthlyPaymentKopecks / 100;
	const lastMonthPayment = lastMonthPaymentKopecks / 100;
	const hasUnevenLastPayment =
		months > 0 && lastMonthPaymentKopecks !== monthlyPaymentKopecks;

	return (
		<details
			className="payment-capture-detail-section"
			open={isOpen}
			style={{ marginBottom: "6px" }}
		>
			{/* БЫЛО: «Калькулятор рассрочки (Внутренний)». Слово «внутренний» —
          из разработки: пользователю оно не говорит ничего, а насторожить
          может. Смысл в том, что рассрочка беспроцентная и от самой клиники,
          без банка, — так и написано. */}
			<summary>Рассрочка от клиники, без банка</summary>
			<div
				className="smart-details-content"
				style={{
					padding: "16px",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					borderRadius: "8px",
					marginTop: "8px",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "20px",
						flexWrap: "wrap",
						marginBottom: "16px",
					}}
				>
					<div style={{ flex: "1 1 200px" }}>
						<label
							htmlFor="installment-months-range"
							style={{
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--ink)",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Срок рассрочки (мес): {months}
						</label>
						<input
							id="installment-months-range"
							type="range"
							min="2"
							max="24"
							step="1"
							value={months}
							onChange={(e) => setMonths(parseInt(e.target.value, 10))}
							style={{ width: "100%" }}
						/>
						<div
							style={{
								display: "flex",
								gap: "6px",
								marginTop: "8px",
								flexWrap: "wrap",
							}}
						>
							{[3, 6, 12, 24].map((m) => (
								<button
									key={m}
									type="button"
									className={`quick-chip min-h-[44px] px-3.5 text-xs sm:text-sm font-semibold ${months === m ? "active" : ""}`}
									style={{ minHeight: "44px" }}
									onClick={() => setMonths(m)}
								>
									{m} мес
								</button>
							))}
						</div>
					</div>
					<div style={{ flex: "1 1 200px" }}>
						<label
							htmlFor="installment-down-payment-range"
							style={{
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--ink)",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Первоначальный взнос: {downPaymentPercent}%
						</label>
						<input
							id="installment-down-payment-range"
							type="range"
							min="0"
							max="80"
							step="10"
							value={downPaymentPercent}
							onChange={(e) =>
								setDownPaymentPercent(parseInt(e.target.value, 10))
							}
							style={{ width: "100%" }}
						/>
						<div
							style={{
								display: "flex",
								gap: "6px",
								marginTop: "8px",
								flexWrap: "wrap",
							}}
						>
							{[0, 20, 30, 50].map((p) => (
								<button
									key={p}
									type="button"
									className={`quick-chip min-h-[44px] px-3.5 text-xs sm:text-sm font-semibold ${downPaymentPercent === p ? "active" : ""}`}
									style={{ minHeight: "44px" }}
									onClick={() => setDownPaymentPercent(p)}
								>
									{p}%
								</button>
							))}
						</div>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						background: "var(--paper)",
						padding: "16px",
						borderRadius: "8px",
						border: "1px solid var(--line)",
					}}
				>
					<div>
						<div style={{ fontSize: "12px", color: "var(--muted)" }}>
							Сумма лечения
						</div>
						<div style={{ fontSize: "16px", fontWeight: 600 }}>
							{money(totalAmount)}
						</div>
					</div>
					<div>
						<div style={{ fontSize: "12px", color: "var(--muted)" }}>
							Первый взнос
						</div>
						<div style={{ fontSize: "16px", fontWeight: 600 }}>
							{money(downPayment)}
						</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: "12px", color: "var(--muted)" }}>
							Ежемесячный платеж
						</div>
						<div
							style={{
								fontSize: "20px",
								fontWeight: 700,
								color: "var(--rust)",
							}}
						>
							{money(monthlyPayment)}
						</div>
						{hasUnevenLastPayment && (
							<div
								style={{
									fontSize: "12px",
									color: "var(--muted)",
									marginTop: "2px",
								}}
							>
								последний месяц — {money(lastMonthPayment)}
							</div>
						)}
					</div>
				</div>
				<div
					style={{
						fontSize: "12px",
						color: "var(--muted)",
						marginTop: "12px",
					}}
				>
					Итого по графику:{" "}
					{money(
						downPayment +
							monthlyPayment * Math.max(0, months - 1) +
							lastMonthPayment,
					)}
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
	patientId,
	payerBirthDate,
	payerFullName,
	payerIdentityDocument,
	payerInn,
	payerRelationship,
	taxDeductionCode,
	remainingDebt,
}: PaymentCaptureProps) {
	const [smartInputText, setSmartInputText] = useState("");
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	// Таймер автоскрытия предпросмотра — держим, чтобы отменить при размонтировании.
	const smartPreviewTimerRef = useRef<number | null>(null);
	useEffect(
		() => () => {
			if (smartPreviewTimerRef.current)
				window.clearTimeout(smartPreviewTimerRef.current);
		},
		[],
	);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [smartParsedData, setSmartParsedData] = useState<any>(null);
	const [showHints, setShowHints] = useState(false);
	const [isSberPosModalOpen, setIsSberPosModalOpen] = useState(false);
	const [receivedCash, setReceivedCash] = useState<string>("");

	const handleSmartDictation = (text: string) => {
		if (!text.trim()) return;
		const result = AiOrchestrator.processPaymentDictation(text);
		if (result.source === "local_algorithm" && result.data) {
			const parsed = result.data;
			if (parsed.amount) onAmountChange(parsed.amount);
			if (parsed.method) onMethodChange(parsed.method as PaymentMethod);
			if (parsed.taxDeductionCode)
				onTaxDeductionCodeChange(parsed.taxDeductionCode as TaxDeductionCode);

			setSmartParsedData({
				isAiTask: false,
				text: `Успешно распознано: ${text}`,
				parsed,
			});
			setShowSmartPreview(true);
			// БЫЛО: setTimeout без сохранения идентификатора и без очистки. Через
			// 2 секунды он безусловно стирал поле голосового ввода — если оператор
			// за это время начинал печатать вручную, текст пропадал прямо посреди
			// слова. Плюс таймер срабатывал уже после размонтирования компонента.
			if (smartPreviewTimerRef.current)
				window.clearTimeout(smartPreviewTimerRef.current);
			smartPreviewTimerRef.current = window.setTimeout(() => {
				smartPreviewTimerRef.current = null;
				setShowSmartPreview(false);
				// Поле очищаем ТОЛЬКО если оператор не начал править его вручную.
				setSmartInputText((current) => (current === text ? "" : current));
			}, 2000);
		}
	};

	type DoctorDiscountPreset =
		| "warranty_100"
		| "colleague_100"
		| "percent_50"
		| "percent_20"
		| "percent_10";

	const [selectedDoctorDiscount, setSelectedDoctorDiscount] =
		useState<DoctorDiscountPreset | null>(null);

	const isZeroAllowedDiscount =
		(selectedDoctorDiscount === "warranty_100" ||
			selectedDoctorDiscount === "colleague_100") &&
		(amount.trim() === "0" || normalizeRubAmountInput(amount) === 0);

	const amountMissingStep = isZeroAllowedDiscount
		? null
		: validateRubAmountInput(amount);
	// rubAmountInputMissingStep(amount)
	const taxDeductionRequested =
		taxDeductionCode === "1" || taxDeductionCode === "2";
	const trimmedFiscalReceiptUrl = fiscalReceiptUrl.trim();
	const trimmedPayerInn = payerInn.trim();
	const paymentMissingId = "payment-capture-missing";
	const taxDefaultsGuidanceId = "payment-tax-defaults-guidance";
	const paymentAmountInvalid = Boolean(amountMissingStep);
	const fiscalReceiptUrlInvalid = Boolean(
		trimmedFiscalReceiptUrl &&
			!/^https?:\/\/\S+$/i.test(trimmedFiscalReceiptUrl),
	);
	const payerInnInvalid = Boolean(
		trimmedPayerInn && !/^\d{10}$|^\d{12}$/.test(trimmedPayerInn),
	);
	const patientTaxDefaultsAvailable = Boolean(
		patientDefaults.fullName?.trim() ||
			patientDefaults.birthDate?.trim() ||
			patientDefaults.identityDocument?.trim() ||
			patientDefaults.taxpayerInn?.trim(),
	);
	const fiscalDetailsOpen =
		taxDeductionRequested ||
		Boolean(
			fiscalReceiptNumber.trim() ||
				fiscalReceiptIssuedAt.trim() ||
				fiscalFn.trim() ||
				fiscalFd.trim() ||
				fiscalFpd.trim() ||
				trimmedFiscalReceiptUrl,
		);
	const taxPayerDetailsOpen =
		taxDeductionRequested ||
		Boolean(
			payerFullName.trim() ||
				trimmedPayerInn ||
				payerBirthDate.trim() ||
				payerIdentityDocument.trim() ||
				(payerRelationship.trim() && payerRelationship.trim() !== "пациент"),
		);
	// Финансовые блокеры 54-ФЗ (Мандат 8e: только реальные блокеры кассы)
	const paymentMissingSteps = [
		!patientContextReady
			? patientContextMessage || "выберите пациента текущего приема"
			: null,
		amountMissingStep,
		fiscalReceiptUrlInvalid
			? "ссылка ОФД должна начинаться с http:// или https://"
			: null,
		payerInnInvalid ? "ИНН плательщика должен содержать 10 или 12 цифр" : null,
	].filter((step): step is string => Boolean(step));
	const paymentReadyToSubmit = paymentMissingSteps.length === 0;

	// Опциональные поля для справки об оплате мед. услуг в ФНС (Мандат 8e: НЕ БЛОКИРУЮТ приём денег)
	const taxDeductionMissingSteps = [
		taxDeductionRequested && !fiscalReceiptIssuedAt.trim()
			? "дата фискального чека"
			: null,
		taxDeductionRequested && !payerFullName.trim()
			? "ФИО плательщика"
			: null,
		taxDeductionRequested && !payerBirthDate.trim()
			? "дата рождения плательщика"
			: null,
		taxDeductionRequested && !payerIdentityDocument.trim()
			? "документ плательщика"
			: null,
		taxDeductionRequested && !payerRelationship.trim()
			? "родство плательщика"
			: null,
	].filter((step): step is string => Boolean(step));
	const isTaxDeductionDraft = taxDeductionRequested && taxDeductionMissingSteps.length > 0;

	const applyDoctorDiscount = (preset: DoctorDiscountPreset) => {
		if (selectedDoctorDiscount === preset) {
			setSelectedDoctorDiscount(null);
			return;
		}
		setSelectedDoctorDiscount(preset);

		const base =
			remainingDebt && remainingDebt > 0
				? remainingDebt
				: (normalizeRubAmountInput(amount) ?? 0);

		if (preset === "warranty_100") {
			onAmountChange("0");
			showToast(
				"Применена 100% скидка врача: гарантийная переделка (к оплате 0 ₽, без пароля)",
				"info",
			);
			return;
		}

		if (preset === "colleague_100") {
			onAmountChange("0");
			showToast(
				"Применена 100% скидка для персонала (к оплате 0 ₽, без пароля)",
				"info",
			);
			return;
		}

		if (base > 0) {
			if (preset === "percent_50") {
				const discounted = Math.round(base * 0.5);
				onAmountChange(rubAmountForInput(discounted));
				showToast(`Применена скидка врача 50%: ${money(discounted)}`, "info");
				return;
			}
			if (preset === "percent_20") {
				const discounted = Math.round(base * 0.8);
				onAmountChange(rubAmountForInput(discounted));
				showToast(`Применена скидка врача 20%: ${money(discounted)}`, "info");
				return;
			}
			if (preset === "percent_10") {
				const discounted = Math.round(base * 0.9);
				onAmountChange(rubAmountForInput(discounted));
				showToast(`Применена скидка врача 10%: ${money(discounted)}`, "info");
				return;
			}
		} else {
			showToast(
				"Укажите базовую сумму платежа или выберите долг для расчета скидки",
				"warning",
			);
		}
	};

	const handlePrimarySubmit = () => {
		if (isSaving) return;

		if (!patientId) {
			showToast("Выберите пациента для проведения платежа", "warning");
			return;
		}

		if (!paymentReadyToSubmit) {
			const parsed = normalizeRubAmountInput(amount);
			if (parsed === null || parsed === 0 || !amount.trim()) {
				if (remainingDebt && remainingDebt > 0) {
					onAmountChange(rubAmountForInput(remainingDebt));
					showToast(
						`Установлена сумма по смете: ${money(remainingDebt)}. Нажмите «Принять оплату» для подтверждения`,
						"info",
					);
					return;
				}
				showToast(
					"Укажите сумму платежа или выберите услугу из плана",
					"warning",
				);
				return;
			}
			const firstMissing = paymentMissingSteps[0];
			showToast(
				firstMissing
					? `Для проведения платежа: ${firstMissing}`
					: "Укажите сумму платежа или выберите услугу из плана",
				"warning",
			);
			return;
		}

		if (isTaxDeductionDraft) {
			showToast(
				"Оплата принимается. Данные для справки налогового вычета можно довнести позже в карточке пациента.",
				"info",
			);
		}

		onSubmit();
	};

	const handleSberPosClick = () => {
		if (isSaving) return;

		if (!patientId) {
			showToast("Выберите пациента для проведения платежа", "warning");
			return;
		}

		if (!paymentReadyToSubmit) {
			const parsed = normalizeRubAmountInput(amount);
			if (parsed === null || parsed === 0 || !amount.trim()) {
				if (remainingDebt && remainingDebt > 0) {
					onAmountChange(rubAmountForInput(remainingDebt));
					showToast(
						`Установлена сумма по смете: ${money(remainingDebt)}. Открываю терминал Сбербанка`,
						"info",
					);
					setIsSberPosModalOpen(true);
					return;
				}
				showToast(
					"Укажите сумму платежа или выберите услугу из плана",
					"warning",
				);
				return;
			}
			const firstMissing = paymentMissingSteps[0];
			showToast(
				firstMissing
					? `Для проведения платежа: ${firstMissing}`
					: "Укажите сумму платежа или выберите услугу из плана",
				"warning",
			);
			return;
		}

		if (isTaxDeductionDraft) {
			showToast(
				"Открываю терминал Сбербанка. Данные для справки налогового вычета можно довнести позже в карточке пациента.",
				"info",
			);
		}

		setIsSberPosModalOpen(true);
	};
	const applyPatientTaxDefaults = () => {
		const hasPatientData = Boolean(
			patientDefaults?.fullName?.trim() ||
				patientDefaults?.birthDate?.trim() ||
				patientDefaults?.identityDocument?.trim() ||
				patientDefaults?.taxpayerInn?.trim(),
		);

		const isNoPatientSelected =
			patientId === null ||
			patientId === "" ||
			(!patientContextReady && !hasPatientData);

		if (!hasPatientData || isNoPatientSelected) {
			showToast(
				"В карточке пациента отсутствуют ФИО и реквизиты плательщика",
				"warning",
			);
			return;
		}

		if (!payerFullName.trim() && patientDefaults.fullName?.trim())
			onPayerFullNameChange(patientDefaults.fullName.trim());
		if (!payerBirthDate.trim() && patientDefaults.birthDate?.trim())
			onPayerBirthDateChange(patientDefaults.birthDate.trim());
		if (
			!payerIdentityDocument.trim() &&
			patientDefaults.identityDocument?.trim()
		)
			onPayerIdentityDocumentChange(patientDefaults.identityDocument.trim());
		if (!trimmedPayerInn && patientDefaults.taxpayerInn?.trim())
			onPayerInnChange(digitsOnly(patientDefaults.taxpayerInn, 12));
		if (!payerRelationship.trim()) onPayerRelationshipChange("пациент");

		showToast(
			"Заполнены доступные данные пациента. Недостающие реквизиты можно внести вручную",
			"info",
		);
	};

	return (
		<div
			className="payment-capture bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-2 sm:p-3"
			id="payment-capture"
		>
			{feedback ? (
				<div
					className="payment-capture-feedback"
					role="status"
					aria-live="polite"
				>
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
					<div
						className="smart-ai-booking payment-smart-ai-booking col-span-full"
						style={{
							gridColumn: "1 / -1",
							marginBottom: "2px",
							border: "1px solid var(--line-strong)",
							boxShadow: "0 2px 8px rgba(13, 148, 136, 0.05)",
							borderRadius: "8px",
							padding: "3px 8px",
							background: "var(--paper)",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: "6px",
							minHeight: "30px",
						}}
					>
						<Bot size={15} color="var(--teal-dark)" className="shrink-0" />
						<div style={{ position: "relative", flex: 1, minWidth: 0 }}>
							<input
								type="text"
								value={smartInputText}
								placeholder="Пример: Оплата 5000 картой..."
								onFocus={() => setShowHints(true)}
								onBlur={() => setTimeout(() => setShowHints(false), 200)}
								onChange={(e) => setSmartInputText(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && smartInputText.trim()) {
										e.preventDefault();
										handleSmartDictation(smartInputText);
									}
								}}
								style={{
									width: "100%",
									border: "none",
									background: "transparent",
									outline: "none",
									fontSize: "11.5px",
									paddingRight: "6px",
									boxSizing: "border-box",
									fontFamily: "inherit",
									color: "var(--ink)",
								}}
							/>
							<DictationHints
								isVisible={showHints && !smartInputText}
								type="payment"
							/>
						</div>
						<SmartMicrophoneButton
							context="payment"
							onResult={(t) => {
								const normalized = textToNumbers(t);
								setSmartInputText(normalized);
								handleSmartDictation(normalized);
							}}
							style={{
								color: "var(--teal-dark)",
								background: "transparent",
								border: "none",
							}}
							className="icon-button"
						/>
					</div>
					<div
						className="quick-chips-row payment-smart-chips col-span-full"
						style={{
							gridColumn: "1 / -1",
							marginBottom: "2px",
							display: "flex",
							gap: "3px",
							width: "100%",
						}}
					>
						<button
							type="button"
							className="quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 shrink-0"
							onClick={() => handleSmartDictation("5000 наличными")}
						>
							<Banknote size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
							<span className="sm:hidden">5000 нал</span>
							<span className="hidden sm:inline">5000 наличными</span>
						</button>
						<button
							type="button"
							className="quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 shrink-0"
							onClick={() => handleSmartDictation("15000 по карте")}
						>
							<CreditCard size={12} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
							<span className="sm:hidden">15000 карта</span>
							<span className="hidden sm:inline">15000 картой</span>
						</button>
						<button
							type="button"
							className="quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 shrink-0"
							onClick={() => handleSmartDictation("20000 сбп, вычет")}
						>
							<QrCode size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
							<span className="sm:hidden">20000 СБП</span>
							<span className="hidden sm:inline">20000 СБП + вычет</span>
						</button>
					</div>
					{showSmartPreview && smartParsedData && (
						<div className="col-span-full" style={{ gridColumn: "1 / -1", marginBottom: "8px" }}>
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
			<div
				className="payment-amount-section col-span-full p-2 sm:p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
				style={{ gridColumn: "1 / -1", margin: "1px 0 2px 0" }}
				data-testid="payment-amount-section"
			>
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
					<div className="w-full sm:w-44 shrink-0">
						<label
							htmlFor="payment-amount-input"
							className="block text-[10px] sm:text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5"
						>
							Сумма к оплате (₽)
						</label>
						<div className="relative">
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
								placeholder="0 ₽"
								className="w-full h-8 sm:h-8 px-2.5 text-sm font-bold font-mono rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20 outline-none transition-all"
							/>
							{amount ? (
								<button
									type="button"
									onClick={() => onAmountChange("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] sm:min-h-0 text-xs text-[var(--muted)] hover:text-[var(--ink)] px-1 cursor-pointer flex items-center justify-center"
									title="Очистить сумму"
								>
									✕
								</button>
							) : null}
						</div>
					</div>

					{remainingDebt !== undefined && (
						<div className="flex-1 min-w-0">
							<span className="block text-[10px] sm:text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">
								Быстрые суммы:
							</span>
							<div
								className="quick-chips-row payment-amount-presets flex flex-wrap items-center gap-1 sm:gap-1.5"
								role="toolbar"
								aria-label="Быстрый выбор суммы к оплате"
							>
								{remainingDebt > 0 && (
									<button
										type="button"
										className="quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-2 sm:px-2.5 font-bold text-xs shrink-0 bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
										onClick={() => onAmountChange(rubAmountForInput(remainingDebt))}
									>
										Долг: {money(remainingDebt)}
									</button>
								)}
								{[500, 1000, 2000, 3000, 5000].map((val) => (
									<button
										key={val}
										type="button"
										className={`quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-2 sm:px-2.5 font-bold text-xs shrink-0 ${amount === String(val) ? "active" : ""}`}
										onClick={() => onAmountChange(String(val))}
									>
										{val.toLocaleString("ru-RU")} ₽
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Скидки врача и гарантийные переделки (Мандат 8e п. 7, Мандат 8n: без паролей администратора и блокировок) */}
			<div
				className="doctor-discounts-section col-span-full"
				style={{ gridColumn: "1 / -1", marginTop: "2px", marginBottom: "2px" }}
				data-testid="doctor-discounts-section"
			>
				<span className="text-[10px] sm:text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block mb-0.5">
					Скидка врача / Гарантия (без паролей администратора):
				</span>
				<div
					role="toolbar"
					className="quick-chips-row doctor-discount-chips"
					style={{ display: "flex", gap: "3px" }}
					aria-label="Скидки врача и гарантийные переделки"
				>
					<button
						type="button"
						className={`quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs font-extrabold shrink-0 ${selectedDoctorDiscount === "warranty_100" ? "active bg-blue-600 text-white" : ""}`}
						onClick={() => applyDoctorDiscount("warranty_100")}
						data-testid="btn-doctor-discount-warranty"
						title="100% гарантийная переделка клинического этапа (к оплате 0 ₽, без блокировок)"
					>
						<span className="sm:hidden">100% Гарантия</span>
						<span className="hidden sm:inline">100% Гарантия (Переделка)</span>
					</button>
					<button
						type="button"
						className={`quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs font-bold shrink-0 ${selectedDoctorDiscount === "colleague_100" ? "active bg-purple-600 text-white" : ""}`}
						onClick={() => applyDoctorDiscount("colleague_100")}
						data-testid="btn-doctor-discount-colleague"
						title="100% скидка для коллег и персонала клиники"
					>
						Персонал 100%
					</button>
					<button
						type="button"
						className={`quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold shrink-0 ${selectedDoctorDiscount === "percent_50" ? "active bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-400 font-bold" : ""}`}
						onClick={() => applyDoctorDiscount("percent_50")}
						data-testid="btn-doctor-discount-50"
					>
						<span className="sm:hidden">-50%</span>
						<span className="hidden sm:inline">Скидка 50%</span>
					</button>
					<button
						type="button"
						className={`quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold shrink-0 ${selectedDoctorDiscount === "percent_20" ? "active bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-400 font-bold" : ""}`}
						onClick={() => applyDoctorDiscount("percent_20")}
						data-testid="btn-doctor-discount-20"
					>
						<span className="sm:hidden">-20%</span>
						<span className="hidden sm:inline">Скидка 20%</span>
					</button>
					<button
						type="button"
						className={`quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold shrink-0 ${selectedDoctorDiscount === "percent_10" ? "active bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-400 font-bold" : ""}`}
						onClick={() => applyDoctorDiscount("percent_10")}
						data-testid="btn-doctor-discount-10"
					>
						<span className="sm:hidden">-10%</span>
						<span className="hidden sm:inline">Скидка 10%</span>
					</button>
				</div>
			</div>

			<div
				role="toolbar"
				className="quick-chips-row payment-methods-toolbar col-span-full"
				style={{
					gridColumn: "1 / -1",
					marginBottom: method === "cash" ? "2px" : "3px",
					width: "100%",
				}}
				aria-label="Способ оплаты"
			>
				{visiblePaymentMethods.map((paymentMethod) => {
					const isActive = method === paymentMethod;
					return (
						<button
							className={`quick-chip min-h-[44px] sm:min-h-8 sm:h-8 px-1 sm:px-3 text-[11px] sm:text-xs font-bold justify-center text-center ${
								isActive
									? "active bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-400 dark:border-teal-400 font-bold"
									: ""
							}`}
							key={paymentMethod}
							type="button"
							aria-pressed={isActive}
							onClick={() => onMethodChange(paymentMethod)}
						>
							<span className="sm:hidden">
								{paymentMethod === "bank_transfer"
									? "Перевод"
									: methodLabels[paymentMethod]}
							</span>
							<span className="hidden sm:inline">
								{methodLabels[paymentMethod]}
							</span>
						</button>
					);
				})}
			</div>

			{method === "cash" && (normalizeRubAmountInput(amount) ?? 0) > 0 && (() => {
				const requiredRub = normalizeRubAmountInput(amount) ?? 0;
				const tenderedRub = normalizeRubAmountInput(receivedCash) ?? requiredRub;
				const changeCalc = calculateCashChange(requiredRub, tenderedRub);
				const presets = getCashPresetSuggestions(requiredRub);

				return (
					<div
						className="col-span-full p-3 mb-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/30 space-y-2"
						style={{ gridColumn: "1 / -1" }}
						data-testid="cash-change-hud"
					>
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<span className="text-xs sm:text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
								<Coins size={18} className="text-[var(--teal-dark)]" />
								Калькулятор сдачи (Наличные)
							</span>
							{changeCalc.changeRub > 0 ? (
								<span className="font-mono font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-[var(--teal-dark)] text-white shadow-sm">
									Сдача: {changeCalc.changeRub.toLocaleString("ru-RU")} ₽
								</span>
							) : changeCalc.isShortage ? (
								<span className="font-mono font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-amber-600 text-white shadow-sm">
									Не хватает: {changeCalc.shortageRub.toLocaleString("ru-RU")} ₽
								</span>
							) : (
								<span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
									Без сдачи
								</span>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
							<div className="smart-field no-float">
								<input
									id="payment-tendered-cash-input"
									inputMode="numeric"
									pattern="[0-9\s]*"
									placeholder={`${requiredRub} ₽`}
									value={receivedCash}
									onChange={(e) => setReceivedCash(e.target.value)}
									className="text-right font-mono font-bold text-base min-h-[44px]"
								/>
								<label htmlFor="payment-tendered-cash-input">Получено купюрами (₽)</label>
							</div>

							<div className="space-y-1.5">
								<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
									Быстрый выбор купюры:
								</span>
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-[var(--teal-dark)] text-white hover:brightness-110 active:brightness-95 shadow-sm cursor-pointer"
										onClick={() => setReceivedCash(String(requiredRub))}
									>
										Без сдачи ({requiredRub.toLocaleString("ru-RU")} ₽)
									</button>
									{Array.from(new Set([500, 1000, 2000, 5000, ...presets]))
										.filter((p) => p >= requiredRub)
										.slice(0, 5)
										.map((preset) => (
											<button
												key={preset}
												type="button"
												className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)] shadow-sm cursor-pointer"
												onClick={() => setReceivedCash(String(preset))}
											>
												{preset.toLocaleString("ru-RU")} ₽
											</button>
										))}
								</div>
							</div>
						</div>
					</div>
				);
			})()}
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
			<InstallmentCalculator
				totalAmount={normalizeRubAmountInput(amount) ?? 0}
				isOpen={false}
			/>
			{!paymentReadyToSubmit ? (
				<div
					className="payment-capture-missing"
					id={paymentMissingId}
					role="status"
					aria-live="polite"
				>
					<strong>Чтобы принять оплату, осталось:</strong>
					<ul>
						{paymentMissingSteps.map((step) => (
							<li key={step}>{step}</li>
						))}
					</ul>
				</div>
			) : isTaxDeductionDraft ? (
				<div
					className="payment-capture-tax-draft-hint px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs font-medium my-2"
					role="status"
					data-testid="payment-tax-draft-hint"
				>
					<span className="font-bold">Налоговый вычет (черновик): </span>
					<span>Оплата не блокируется. Для формирования справки ФНС не хватает: {taxDeductionMissingSteps.join(", ")} (можно заполнить позже в карточке пациента).</span>
				</div>
			) : null}
			<p className="payment-capture-safeguard text-[10px] text-[var(--muted)] my-0.5 hidden sm:block">
				Каждая оплата добавляет новую строку в историю. Ошибку закрывайте
				возвратом или коррекцией, не повторной записью.
			</p>

			{/* Панель оформления чека и кнопок оплаты (Мандат 8e / 8c / 8p) */}
			<div
				id="payment-checkout-bar"
				className="payment-checkout-bar col-span-full"
				style={{ gridColumn: "1 / -1" }}
				data-testid="payment-checkout-bar"
			>
				{/* Итого к списанию / оплате по 54-ФЗ */}
				<div
					className="payment-total-due-banner flex items-center justify-between px-3 py-1 sm:py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] select-none mb-1 sm:mb-1.5"
					data-testid="payment-total-due-banner"
				>
					<span className="text-xs sm:text-xs font-bold text-[var(--muted)]">
						Итого к списанию / оплате:
					</span>
					<span className="text-base sm:text-base font-black font-mono text-[var(--ink)]">
						{amount && normalizeRubAmountInput(amount) !== null
							? `${(normalizeRubAmountInput(amount) ?? 0).toLocaleString("ru-RU")} ₽`
							: remainingDebt && remainingDebt > 0
								? `${remainingDebt.toLocaleString("ru-RU")} ₽`
								: "0 ₽"}
					</span>
				</div>

				<div
					className="payment-actions"
					style={{
						display: "flex",
						gap: "6px",
						width: "100%",
					}}
				>
					<button
						className="primary-button min-h-[44px] sm:min-h-[38px] sm:h-9.5 flex-1 font-bold text-sm"
						type="button"
						onClick={handlePrimarySubmit}
						aria-busy={isSaving || undefined}
						aria-describedby={
							!paymentReadyToSubmit ? paymentMissingId : undefined
						}
						disabled={isSaving}
						data-testid="payment-submit-button"
					>
						<CreditCard aria-hidden="true" size={16} className="shrink-0" />{" "}
						<span>{isSaving ? "Записываю..." : "Принять оплату"}</span>
					</button>
					<button
						className="secondary-button min-h-[44px] sm:min-h-[38px] sm:h-9.5 flex-1 font-semibold text-xs"
						type="button"
						onClick={handleSberPosClick}
						aria-describedby={
							!paymentReadyToSubmit ? paymentMissingId : undefined
						}
						disabled={isSaving}
						data-testid="payment-sberpos-button"
					>
						<CreditCard aria-hidden="true" size={15} className="shrink-0" />{" "}
						<span className="sm:hidden">Сбер POS</span>
						<span className="hidden sm:inline">Оплата картой (Сбербанк POS / QR)</span>
					</button>
				</div>
			</div>
			{patientId && (
				<SberPosTerminalModal
					isOpen={isSberPosModalOpen}
					onClose={() => setIsSberPosModalOpen(false)}
					totalBillKop={
						Math.round(
							Number(
								normalizeRubAmountInput(amount) ??
									(remainingDebt && remainingDebt > 0 ? remainingDebt : 0),
							) * 100,
						)
					}
					patientName={patientDefaults?.fullName || payerFullName || "Пациент"}
					orderId={`CHK-2026-${patientId ? patientId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() : "891"}`}
					initialOperation={method === "online" ? "sberpay_qr" : "sale"}
					onSelectAlternativeMethod={(altMethod) => {
						if (altMethod === "sbp") onMethodChange("online");
						else if (altMethod === "deposit") onMethodChange("family_wallet");
						else onMethodChange("cash");
					}}
					onTransactionSuccess={(response) => {
						setIsSberPosModalOpen(false);
						onAmountChange("");
						if (response.rrn) {
							onFiscalFdChange(response.rrn);
						}
						if (response.authCode) {
							onFiscalFpdChange(response.authCode);
						}
						showToast(
							`Оплата ${(response.amountKop / 100).toLocaleString("ru-RU")} ₽ через терминал Сбербанка (${response.cardIssuer}) успешно зафиксирована. RRN: ${response.rrn}`,
							"success",
						);
					}}
				/>
			)}
		</div>
	);
}
