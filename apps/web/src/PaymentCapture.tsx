import type { PaymentMethod } from "@dental/shared";
import {
	Bot,
	Coins,
	CreditCard,
	Info,
	Landmark,
	Mic,
	PiggyBank,
	ShieldAlert,
	UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "./AppHelpers";
import { showToast } from "./components/GlobalToast";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { DictationHints } from "./DictationHints";
import { AiOrchestrator } from "./lib/aiOrchestrator";
import { textToNumbers } from "./lib/stringUtils";
import {
	rubAmountInputMissingStep,
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
	payerBirthDate: string;
	payerFullName: string;
	payerIdentityDocument: string;
	payerInn: string;
	payerRelationship: string;
	taxDeductionCode: TaxDeductionCode;
	remainingDebt?: number;
	patientId?: string | undefined;
};

const visiblePaymentMethods: PaymentMethod[] = [
	"cash",
	"card",
	"bank_transfer",
	"online",
	"family_wallet",
	"other",
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
			style={{
				marginTop: "16px",
				background: "var(--surface-100)",
				border: "1px solid var(--border-300)",
				borderRadius: "8px",
			}}
		>
			<summary
				style={{
					padding: "16px",
					fontWeight: 600,
					cursor: "pointer",
					userSelect: "none",
				}}
			>
				Фискальный чек и кассир
			</summary>
			<div
				className="smart-details-content"
				style={{ padding: "0 16px 16px 16px" }}
			>
				<div className="payment-capture-detail-grid">
					<div className="smart-field">
						<input
							autoComplete="off"
							value={fiscalReceiptNumber}
							onChange={(event) =>
								onFiscalReceiptNumberChange(event.target.value)
							}
							placeholder=" "
						/>
						<label>Номер чека (можно пусто, если есть ФД/ФПД)</label>
					</div>
					<div className="smart-field no-float">
						<input
							type="datetime-local"
							value={fiscalReceiptIssuedAt}
							onChange={(event) =>
								onFiscalReceiptIssuedAtChange(event.target.value)
							}
						/>
						<label>Дата чека</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							maxLength={32}
							value={fiscalFn}
							onChange={onFiscalFnChange}
							placeholder=" "
						/>
						<label>ФИО (номер фискального накопителя)</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							maxLength={32}
							value={fiscalFd}
							onChange={onFiscalFdChange}
							placeholder=" "
						/>
						<label>ФД (номер фискального документа)</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							maxLength={32}
							value={fiscalFpd}
							onChange={onFiscalFpdChange}
							placeholder=" "
						/>
						<label>ФПД (фискальный признак)</label>
					</div>
					<div className="smart-field">
						<input
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
						<label>Ссылка на чек (https://...)</label>
					</div>
					<div className="smart-field">
						<input
							autoComplete="off"
							value={fiscalCashierName}
							onChange={(event) =>
								onFiscalCashierNameChange(event.target.value)
							}
							placeholder=" "
						/>
						<label>Кассир (ФИО администратора)</label>
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
	taxPayerDetailsOpen,
}: TaxPayerDetailsProps) {
	return (
		<details
			className="payment-capture-detail-section"
			open={taxPayerDetailsOpen}
			style={{
				marginTop: "16px",
				background: "var(--surface-100)",
				border: "1px solid var(--border-300)",
				borderRadius: "8px",
			}}
		>
			<summary
				style={{
					padding: "16px",
					fontWeight: 600,
					cursor: "pointer",
					userSelect: "none",
				}}
			>
				Плательщик для налогового вычета
			</summary>
			<div
				className="smart-details-content"
				style={{ padding: "0 16px 16px 16px" }}
			>
				<div className="payment-capture-detail-grid">
					<div className="smart-field">
						<input
							autoComplete="name"
							value={payerFullName}
							onChange={(event) => onPayerFullNameChange(event.target.value)}
							placeholder=" "
						/>
						<label>Плательщик для вычета (ФИО)</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							maxLength={12}
							aria-invalid={payerInnInvalid || undefined}
							aria-describedby={payerInnInvalid ? paymentMissingId : undefined}
							value={payerInn}
							onChange={onPayerInnChange}
							placeholder=" "
						/>
						<label>ИНН плательщика (если есть)</label>
					</div>
					<div className="smart-field no-float">
						<input
							type="date"
							autoComplete="bday"
							value={payerBirthDate}
							onChange={(event) => onPayerBirthDateChange(event.target.value)}
							placeholder=" "
						/>
						<label>Дата рождения плательщика</label>
					</div>
					<div className="smart-field">
						<input
							autoComplete="off"
							value={payerIdentityDocument}
							onChange={(event) =>
								onPayerIdentityDocumentChange(event.target.value)
							}
							placeholder=" "
						/>
						<label>Документ плательщика (паспорт / иной)</label>
					</div>
					<div className="smart-field">
						<input
							autoComplete="off"
							value={payerRelationship}
							onChange={(event) =>
								onPayerRelationshipChange(event.target.value)
							}
							placeholder=" "
						/>
						<label>Родство (пациент, мать...)</label>
						<div
							className="quick-chips-row"
							style={{ marginTop: "6px", padding: "0 14px 10px 14px" }}
						>
							{["пациент", "мать", "отец", "супруг", "супруга"].map((rel) => (
								<button
									key={rel}
									type="button"
									className="quick-chip quick-chip--sm"
									onClick={() => onPayerRelationshipChange(rel)}
								>
									{rel}
								</button>
							))}
						</div>
					</div>
					<div
						className="quick-chips-row"
						style={{ marginBottom: "20px" }}
						aria-label="Код медицинской услуги для налогового вычета"
					>
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

	const downPayment = Math.round((totalAmount * downPaymentPercent) / 100);
	const remaining = totalAmount - downPayment;
	const monthlyPayment = months > 0 ? Math.round(remaining / months) : 0;

	return (
		<details
			className="payment-capture-detail-section"
			open={isOpen}
			style={{ marginBottom: "20px" }}
		>
			<summary>Калькулятор рассрочки (Внутренний)</summary>
			<div
				className="smart-details-content"
				style={{
					padding: "16px",
					background: "var(--brand-50)",
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
							style={{
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--slate-700)",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Срок рассрочки (мес): {months}
						</label>
						<input
							type="range"
							min="2"
							max="24"
							step="1"
							value={months}
							onChange={(e) => setMonths(parseInt(e.target.value))}
							style={{ width: "100%" }}
						/>
						<div
							style={{
								display: "flex",
								gap: "4px",
								marginTop: "8px",
								flexWrap: "wrap",
							}}
						>
							{[3, 6, 12, 24].map((m) => (
								<button
									key={m}
									type="button"
									className={`quick-chip quick-chip--sm ${months === m ? "active" : ""}`}
									onClick={() => setMonths(m)}
								>
									{m} мес
								</button>
							))}
						</div>
					</div>
					<div style={{ flex: "1 1 200px" }}>
						<label
							style={{
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--slate-700)",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Первоначальный взнос: {downPaymentPercent}%
						</label>
						<input
							type="range"
							min="0"
							max="80"
							step="10"
							value={downPaymentPercent}
							onChange={(e) => setDownPaymentPercent(parseInt(e.target.value))}
							style={{ width: "100%" }}
						/>
						<div
							style={{
								display: "flex",
								gap: "4px",
								marginTop: "8px",
								flexWrap: "wrap",
							}}
						>
							{[0, 20, 30, 50].map((p) => (
								<button
									key={p}
									type="button"
									className={`quick-chip quick-chip--sm ${downPaymentPercent === p ? "active" : ""}`}
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
						background: "#fff",
						padding: "16px",
						borderRadius: "8px",
						border: "1px solid var(--brand-200)",
					}}
				>
					<div>
						<div style={{ fontSize: "12px", color: "var(--slate-500)" }}>
							Сумма лечения
						</div>
						<div style={{ fontSize: "16px", fontWeight: 600 }}>
							{totalAmount.toLocaleString("ru-RU")} ₽
						</div>
					</div>
					<div>
						<div style={{ fontSize: "12px", color: "var(--slate-500)" }}>
							Первый взнос
						</div>
						<div
							style={{
								fontSize: "16px",
								fontWeight: 600,
								color: "var(--brand-600)",
							}}
						>
							{downPayment.toLocaleString("ru-RU")} ₽
						</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: "12px", color: "var(--slate-500)" }}>
							Ежемесячный платеж
						</div>
						<div
							style={{
								fontSize: "20px",
								fontWeight: 700,
								color: "var(--rust)",
							}}
						>
							{monthlyPayment.toLocaleString("ru-RU")} ₽
						</div>
					</div>
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
	remainingDebt,
	patientId,
}: PaymentCaptureProps) {
	const [smartInputText, setSmartInputText] = useState("");
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<any>(null);
	const [showHints, setShowHints] = useState(false);
	const [familyData, setFamilyData] = useState<any>(null);

	useEffect(() => {
		if (!patientId) {
			setFamilyData(null);
			return;
		}
		fetch(`/api/finance/family/patient/${patientId}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => {
				if (!res.ok) throw new Error("No family");
				return res.json();
			})
			.then((data) => setFamilyData(data))
			.catch(() => setFamilyData(null));
	}, [patientId]);

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
				text: "Успешно распознано: " + text,
				parsed,
			});
			setShowSmartPreview(true);
			setTimeout(() => {
				setShowSmartPreview(false);
				setSmartInputText("");
			}, 2000);
		}
	};

	const amountMissingStep = validateRubAmountInput(amount);
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
				trimmedFiscalReceiptUrl ||
				fiscalCashierName.trim(),
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
	const numericAmount = parseFloat(amount) || 0;
	const hasFamily = !!familyData;
	const familyBalance = familyData ? parseFloat(familyData.balance) : 0;
	const isFamilyWalletPayment = method === "other";

	const paymentMissingSteps = [
		!patientContextReady
			? patientContextMessage || "выберите пациента текущего приема"
			: null,
		amountMissingStep,
		fiscalReceiptUrlInvalid
			? "ссылка на чек должна начинаться с http:// или https://"
			: null,
		payerInnInvalid ? "ИНН плательщика должен содержать 10 или 12 цифр" : null,
		taxDeductionRequested && !fiscalReceiptIssuedAt.trim()
			? "для вычета укажите дату фискального чека"
			: null,
		taxDeductionRequested && !fiscalFn.trim() ? "для вычета укажите ФИО" : null,
		taxDeductionRequested && !fiscalFd.trim() ? "для вычета укажите ФД" : null,
		taxDeductionRequested && !fiscalFpd.trim()
			? "для вычета укажите ФПД"
			: null,
		taxDeductionRequested && !payerFullName.trim()
			? "для вычета укажите ФИО плательщика явно"
			: null,
		taxDeductionRequested && !payerBirthDate.trim()
			? "для вычета укажите дату рождения плательщика"
			: null,
		taxDeductionRequested && !payerIdentityDocument.trim()
			? "для вычета укажите документ плательщика"
			: null,
		taxDeductionRequested && !payerRelationship.trim()
			? "для вычета укажите родство плательщика"
			: null,
		isFamilyWalletPayment && !hasFamily
			? "у пациента не настроен семейный аккаунт"
			: null,
		isFamilyWalletPayment && hasFamily && familyBalance < numericAmount
			? "недостаточно средств на семейном счете"
			: null,
	].filter((step): step is string => Boolean(step));
	const paymentReadyToSubmit = paymentMissingSteps.length === 0;
	const applyPatientTaxDefaults = () => {
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
	};

	return (
		<div className="payment-capture" id="payment-capture">
			{feedback ? (
				<div
					className="payment-capture-feedback"
					role="status"
					aria-live="polite"
				>
					{feedback}
				</div>
			) : (
				<div className="payment-capture-card payment-capture-ai-card">
					<div className="payment-card-header">
						<Bot size={16} className="card-header-icon-bot" />
						<span>Голосовой & ИИ ассистент</span>
					</div>
					<div className="smart-ai-booking-container">
						<Bot size={18} color="var(--brand-600)" />
						<div style={{ position: "relative", flex: 1 }}>
							<input
								type="text"
								value={smartInputText}
								placeholder="Пример: Оплата 5000 картой, нужен налоговый вычет..."
								onFocus={() => setShowHints(true)}
								onBlur={(e) => {
									if (!e.currentTarget.contains(e.relatedTarget)) {
										setShowHints(false);
									}
								}}
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
									fontSize: "14px",
									fontFamily: "inherit",
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
								color: "var(--brand-600)",
								background: "transparent",
								border: "none",
							}}
							className="icon-button"
						/>
					</div>
					<div className="quick-chips-row" style={{ flexWrap: "wrap" }}>
						<button
							type="button"
							className="quick-chip quick-chip--sm"
							onClick={() => handleSmartDictation("5000 наличными")}
						>
							💰 5000 наличными
						</button>
						<button
							type="button"
							className="quick-chip quick-chip--sm"
							onClick={() => handleSmartDictation("15000 по карте")}
						>
							💳 15000 картой
						</button>
						<button
							type="button"
							className="quick-chip quick-chip--sm"
							onClick={() => handleSmartDictation("20000 сбп, вычет")}
						>
							🧾 20000 СБП + вычет
						</button>
					</div>
					{showSmartPreview && smartParsedData && (
						<div style={{ marginTop: "8px" }}>
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
				</div>
			)}

			<div className="payment-capture-card">
				<div className="payment-card-header">
					<Coins size={16} className="card-header-icon-coins" />
					<span>Детали платежа</span>
				</div>

				<div className="smart-field">
					<input
						id="payment-amount-input"
						inputMode="numeric"
						autoComplete="transaction-amount"
						pattern="[0-9\s]*"
						aria-label="Сумма оплаты"
						aria-invalid={paymentAmountInvalid || undefined}
						aria-describedby={
							paymentAmountInvalid ? paymentMissingId : undefined
						}
						value={amount}
						onChange={(event) => onAmountChange(event.target.value)}
						placeholder=" "
					/>
					<label>Сумма к оплате (₽)</label>
					{remainingDebt !== undefined && (
						<div
							className="quick-chips-row"
							style={{ marginTop: "6px", flexWrap: "wrap" }}
						>
							{remainingDebt > 0 && (
								<button
									type="button"
									className="quick-chip"
									onClick={() => onAmountChange(String(remainingDebt))}
								>
									Долг: {remainingDebt} ₽
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

				<div className="payment-methods-grid-container">
					<span className="payment-methods-grid-label">Способ оплаты</span>
					<div className="payment-methods-grid">
						{visiblePaymentMethods.map((paymentMethod) => {
							const getIcon = () => {
								switch (paymentMethod) {
									case "cash":
										return <Coins size={20} />;
									case "card":
										return <CreditCard size={20} />;
									case "bank_transfer":
										return <Landmark size={20} />;
									case "online":
										return <PiggyBank size={20} />;
									case "family_wallet":
										return <UserRound size={20} />;
									case "other":
										return <UserRound size={20} />;
									default:
										return <Coins size={20} />;
								}
							};
							return (
								<button
									className={`payment-method-card ${method === paymentMethod ? "active" : ""}`}
									key={paymentMethod}
									type="button"
									aria-pressed={method === paymentMethod}
									onClick={() => onMethodChange(paymentMethod)}
								>
									{getIcon()}
									<span>{methodLabels[paymentMethod]}</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{isFamilyWalletPayment && familyData && (
				<div
					className="panel family-wallet-status"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "16px",
						background:
							"linear-gradient(135deg, rgba(14, 165, 233, 0.05), rgba(59, 130, 246, 0.1))",
						border: "1px solid rgba(59, 130, 246, 0.3)",
						borderRadius: "12px",
						padding: "20px",
						marginTop: "16px",
						boxShadow: "0 4px 12px rgba(59, 130, 246, 0.05)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
						<div
							style={{
								background: "var(--brand-500)",
								color: "white",
								padding: "10px",
								borderRadius: "10px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<UserRound size={24} />
						</div>
						<div>
							<div
								style={{
									fontSize: "13px",
									color: "var(--slate-500)",
									fontWeight: 500,
								}}
							>
								Оплата со счета
							</div>
							<div
								style={{
									fontSize: "16px",
									fontWeight: 700,
									color: "var(--text-900)",
								}}
							>
								Семейный кошелек
							</div>
						</div>
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							background: "var(--surface-100)",
							padding: "16px",
							borderRadius: "8px",
							border: "1px solid var(--brand-200)",
						}}
					>
						<span style={{ fontSize: "14px", color: "var(--slate-600)" }}>
							Доступный баланс:
						</span>
						<span
							style={{
								fontSize: "22px",
								fontWeight: 800,
								color: "var(--brand-600)",
							}}
						>
							{familyBalance.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>
			)}

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
			<InstallmentCalculator
				totalAmount={parseFloat(amount) || 0}
				isOpen={false}
			/>

			{!paymentReadyToSubmit ? (
				<div
					className="payment-alert-box payment-alert-warning"
					id={paymentMissingId}
					role="status"
					aria-live="polite"
				>
					<ShieldAlert size={18} className="alert-icon" />
					<div className="alert-content">
						<strong style={{ display: "block", marginBottom: "4px" }}>
							Чтобы принять оплату, осталось:
						</strong>
						<ul style={{ margin: 0, paddingLeft: "16px" }}>
							{paymentMissingSteps.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ul>
					</div>
				</div>
			) : null}

			<div className="payment-alert-box payment-alert-info">
				<Info size={16} className="alert-icon" />
				<span className="alert-text">
					Каждая оплата добавляет новую строку в историю. Ошибку закрывайте
					возвратом или коррекцией, не повторной записью.
				</span>
			</div>

			<button
				className="primary-button checkout-submit-btn"
				type="button"
				onClick={onSubmit}
				aria-busy={isSaving || undefined}
				aria-describedby={!paymentReadyToSubmit ? paymentMissingId : undefined}
				disabled={isSaving || !paymentReadyToSubmit}
			>
				<CreditCard aria-hidden="true" />{" "}
				{isSaving ? "Записываю..." : "Принять оплату"}
			</button>
		</div>
	);
}
