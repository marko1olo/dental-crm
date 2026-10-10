import { type PaymentMethod, kopecksToRub, normalizePaymentMethod, percentageOfKopecks, rubToKopecks } from "@dental/shared";
import { Banknote, Bot, CreditCard, QrCode } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { money } from "./AppHelpers";
import { PaymentModal } from "./components/finance/PaymentModal";
import { showToast } from "./components/GlobalToast";
import { playTactileEarcon } from "./lib/intercomSound";
import { fromKopecks, rubAmountForInput, toKopecks } from "./components/payments/cashDeskAmounts";
import { SberPosTerminalModal } from "./components/payments/sberPos/SberPosTerminalModal";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { DictationHints } from "./DictationHints";
import { useFiscalOperations } from "./hooks/useFiscalOperations";
import { AiOrchestrator } from "./lib/aiOrchestrator";
import { textToNumbers } from "./lib/stringUtils";
import { PaymentCheckoutBar } from "./PaymentCheckoutBar";
import { type DoctorDiscountPreset, PaymentDiscountsAndSplitSection } from "./PaymentDiscountsAndSplitSection";
import { digitsOnly, PaymentFiscalCashierBar } from "./PaymentFiscalCashierBar";
import { PaymentQuickTenderGrid } from "./PaymentQuickTenderGrid";
import { type TaxDeductionCode, TaxPayerDetails } from "./PaymentTaxPayerDetails";
import { normalizeRubAmountInput, validateRubAmountInput } from "./rubAmountInput";
import { SmartParsePreview } from "./SmartParsePreview";

export type { TaxDeductionCode };

export type PaymentCaptureProps = {
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
	"family_wallet",
	"online",
	"bank_transfer",
];

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
	const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
	const [isSplit5050Mode, setIsSplit5050Mode] = useState(false);
	const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
	const [receivedCash, setReceivedCash] = useState<string>("");
	const { isOnline, pendingCount, syncQueue, isSyncing } = useFiscalOperations();

	useEffect(() => {
		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape" && isMoreActionsOpen) setIsMoreActionsOpen(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isMoreActionsOpen]);

	const handleSmartDictation = (text: string) => {
		if (!text.trim()) return;
		const result = AiOrchestrator.processPaymentDictation(text);
		if (result.source === "local_algorithm" && result.data) {
			const parsed = result.data;
			if (parsed.amount) onAmountChange(parsed.amount);
			if (parsed.method) onMethodChange(parsed.method as PaymentMethod);
			if (parsed.taxDeductionCode)
				onTaxDeductionCodeChange(parsed.taxDeductionCode as TaxDeductionCode);

			setSmartParsedData({ isAiTask: false, text: `Успешно распознано: ${text}`, parsed });
			setShowSmartPreview(true);
			if (smartPreviewTimerRef.current) window.clearTimeout(smartPreviewTimerRef.current);
			smartPreviewTimerRef.current = window.setTimeout(() => {
				smartPreviewTimerRef.current = null;
				setShowSmartPreview(false);
				setSmartInputText((cur) => (cur === text ? "" : cur));
			}, 2000);
		}
	};

	const [selectedDoctorDiscount, setSelectedDoctorDiscount] = useState<DoctorDiscountPreset | null>(null);

	const isZeroAllowedDiscount =
		(selectedDoctorDiscount === "warranty_100" || selectedDoctorDiscount === "colleague_100") &&
		(amount.trim() === "0" || normalizeRubAmountInput(amount) === 0);

	const amountMissingStep = isZeroAllowedDiscount ? null : validateRubAmountInput(amount);
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
			patientDefaults.taxpayerInn?.trim(),
	);
	const fiscalDetailsOpen =
		taxDeductionRequested ||
		Boolean(fiscalReceiptNumber.trim() || fiscalReceiptIssuedAt.trim() || fiscalFn.trim() || fiscalFd.trim() || fiscalFpd.trim() || trimmedFiscalReceiptUrl);
	const taxPayerDetailsOpen =
		taxDeductionRequested ||
		Boolean(payerFullName.trim() || trimmedPayerInn || payerBirthDate.trim() || payerIdentityDocument.trim() || (payerRelationship.trim() && payerRelationship.trim() !== "пациент"));

	const paymentMissingSteps = [
		!patientContextReady ? patientContextMessage || "выберите пациента текущего приема" : null,
		amountMissingStep,
		fiscalReceiptUrlInvalid ? "ссылка ОФД должна начинаться с http:// или https://" : null,
	].filter((s): s is string => Boolean(s));
	const paymentReadyToSubmit = paymentMissingSteps.length === 0;
	const isZeroAmount = !isZeroAllowedDiscount && (!amount.trim() || normalizeRubAmountInput(amount) === 0 || normalizeRubAmountInput(amount) === null);

	const taxDeductionMissingSteps = [
		payerInnInvalid ? "ИНН плательщика должен содержать 10 или 12 цифр (опционально для физлиц)" : null,
		taxDeductionRequested && !fiscalReceiptIssuedAt.trim() ? "дата фискального чека" : null,
		taxDeductionRequested && !payerFullName.trim() ? "ФИО плательщика" : null,
		taxDeductionRequested && !payerBirthDate.trim() ? "дата рождения плательщика" : null,
		taxDeductionRequested && !payerIdentityDocument.trim() ? "документ плательщика" : null,
		taxDeductionRequested && !payerRelationship.trim() ? "родство плательщика" : null,
	].filter((s): s is string => Boolean(s));
	const isTaxDeductionDraft = taxDeductionRequested && taxDeductionMissingSteps.length > 0;

	const applyDoctorDiscount = (preset: DoctorDiscountPreset) => {
		if (selectedDoctorDiscount === preset) {
			setSelectedDoctorDiscount(null);
			return;
		}
		setSelectedDoctorDiscount(preset);
		const base = remainingDebt && remainingDebt > 0 ? remainingDebt : (normalizeRubAmountInput(amount) ?? 0);

		if (preset === "warranty_100") {
			onAmountChange("0");
			showToast("Применена 100% скидка врача: гарантийная переделка (к оплате 0 ₽, без пароля)", "info");
			return;
		}
		if (preset === "colleague_100") {
			onAmountChange("0");
			showToast("Применена 100% скидка для персонала (к оплате 0 ₽, без пароля)", "info");
			return;
		}
		if (base > 0) {
			const baseKop = toKopecks(base);
			if (baseKop !== null && baseKop > 0) {
				const pctMap: Record<string, { pct: number; label: string }> = {
					percent_50: { pct: 5000, label: "50%" },
					percent_20: { pct: 8000, label: "20%" },
					percent_10: { pct: 9000, label: "10%" },
				};
				const cfg = pctMap[preset];
				if (cfg) {
					const discountedKop = percentageOfKopecks(baseKop, cfg.pct);
					const discountedRub = fromKopecks(discountedKop);
					onAmountChange(rubAmountForInput(discountedRub));
					showToast(`Применена скидка врача ${cfg.label}: ${money(discountedRub)}`, "info");
				}
			}
		} else {
			showToast("Укажите базовую сумму платежа или выберите долг для расчета скидки", "warning");
		}
	};

	const applySplit5050Preset = () => {
		const effectiveTotal = normalizeRubAmountInput(amount) ?? (remainingDebt && remainingDebt > 0 ? remainingDebt : 0);
		if (!patientId && effectiveTotal <= 0) {
			showToast("Выберите пациента или укажите сумму для расчета 50/50", "warning");
			return;
		}
		if (effectiveTotal > 0) {
			const half = Math.round(effectiveTotal / 2);
			onAmountChange(String(half));
			onMethodChange("cash");
			showToast(`Комбинированная оплата 50/50: 1-я часть (${money(half)}, Наличные). 2-я часть (${money(effectiveTotal - half)}, Карта) принимается следом.`, "info");
		} else {
			setIsSplit5050Mode(true);
			setIsSplitModalOpen(true);
		}
	};

	const applyThreeWaySplitPreset = () => {
		setIsSplit5050Mode(false);
		setIsSplitModalOpen(true);
	};

	const applyDepositPlusCardPreset = () => {
		setIsSplit5050Mode(false);
		setIsSplitModalOpen(true);
	};

	const handleOpenSplitModal = () => {
		if (isSaving) return;
		setIsSplit5050Mode(false);
		setIsSplitModalOpen(true);
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
					showToast(`Установлена сумма по смете: ${money(remainingDebt)}. Нажмите «Принять оплату» для подтверждения`, "info");
					return;
				}
				showToast("Укажите сумму платежа или выберите услугу из плана", "warning");
				return;
			}
			const firstMissing = paymentMissingSteps[0];
			showToast(firstMissing ? `Для проведения платежа: ${firstMissing}` : "Укажите сумму платежа или выберите услугу из плана", "warning");
			return;
		}
		if (isTaxDeductionDraft) {
			showToast("Оплата принимается. Данные для справки налогового вычета можно довнести позже в карточке пациента.", "info");
		}
		playTactileEarcon("pay");
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
					showToast(`Установлена сумма по смете: ${money(remainingDebt)}. Открываю терминал Сбербанка`, "info");
					setIsSberPosModalOpen(true);
					return;
				}
				showToast("Укажите сумму платежа или выберите услугу из плана", "warning");
				return;
			}
			const firstMissing = paymentMissingSteps[0];
			showToast(firstMissing ? `Для проведения платежа: ${firstMissing}` : "Укажите сумму платежа или выберите услугу из плана", "warning");
			return;
		}
		if (isTaxDeductionDraft) {
			showToast("Открываю терминал Сбербанка. Данные для справки налогового вычета можно довнести позже в карточке пациента.", "info");
		}
		setIsSberPosModalOpen(true);
	};

	const handleManualCardTerminalSubmit = () => {
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
				} else {
					showToast("Укажите сумму платежа", "warning");
					return;
				}
			}
		}
		onMethodChange("card");
		showToast("Оплата картой подтверждена на терминале вручную (без повторного списания с карты). Сохраняю платёж...", "success", 4500);
		playTactileEarcon("pay");
		onSubmit();
	};

	const applyPatientTaxDefaults = () => {
		const hasPatientData = Boolean(
			patientDefaults?.fullName?.trim() || patientDefaults?.birthDate?.trim() || patientDefaults?.identityDocument?.trim() || patientDefaults?.taxpayerInn?.trim(),
		);
		const isNoPatientSelected = patientId === null || patientId === "" || (!patientContextReady && !hasPatientData);

		if (!hasPatientData || isNoPatientSelected) {
			showToast("В карточке пациента отсутствуют ФИО и реквизиты плательщика", "warning");
			return;
		}
		if (!payerFullName.trim() && patientDefaults.fullName?.trim()) onPayerFullNameChange(patientDefaults.fullName.trim());
		if (!payerBirthDate.trim() && patientDefaults.birthDate?.trim()) onPayerBirthDateChange(patientDefaults.birthDate.trim());
		if (!payerIdentityDocument.trim() && patientDefaults.identityDocument?.trim()) onPayerIdentityDocumentChange(patientDefaults.identityDocument.trim());
		if (!trimmedPayerInn && patientDefaults.taxpayerInn?.trim()) onPayerInnChange(digitsOnly(patientDefaults.taxpayerInn, 12));
		if (!payerRelationship.trim()) onPayerRelationshipChange("пациент");
		showToast("Заполнены доступные данные пациента. Недостающие реквизиты можно внести вручную", "info");
	};

	return (
		<div className="payment-capture bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-2 sm:p-3 mb-4 pb-28 sm:pb-24" id="payment-capture">
			<PaymentFiscalCashierBar
				isOnline={isOnline}
				pendingCount={pendingCount}
				isSyncing={isSyncing}
				onSyncQueue={() => void syncQueue(async () => true)}
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

			{feedback ? (
				<div className="payment-capture-feedback" role="status" aria-live="polite">{feedback}</div>
			) : (
				<>
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
								style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: "11.5px", paddingRight: "6px", boxSizing: "border-box", fontFamily: "inherit", color: "var(--ink)" }}
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
							style={{ color: "var(--teal-dark)", background: "transparent", border: "none" }}
							className="icon-button"
						/>
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

			<PaymentQuickTenderGrid
				amount={amount}
				onAmountChange={onAmountChange}
				remainingDebt={remainingDebt}
				method={method}
				paymentAmountInvalid={paymentAmountInvalid}
				paymentMissingId={paymentMissingId}
				receivedCash={receivedCash}
				onReceivedCashChange={setReceivedCash}
			/>

			<div
				role="tablist"
				className="dente-segmented-bar w-full flex col-span-full gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
				style={{ gridColumn: "1 / -1", marginBottom: method === "cash" ? "4px" : "6px" }}
				aria-label="Способ оплаты"
			>
				{visiblePaymentMethods.map((paymentMethod) => {
					const isActive = method === paymentMethod;
					return (
						<button
							style={{
								minHeight: "36px",
								padding: "0 12px",
								borderRadius: "8px",
								background: isActive ? "#0d9488" : "transparent",
								color: isActive ? "#ffffff" : "var(--ink)",
								border: isActive ? "1px solid #0d9488" : "1px solid transparent",
							}}
							className={`dente-segmented-item min-h-[36px] flex-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								isActive
									? "active bg-teal-600 text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							key={paymentMethod}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => onMethodChange(paymentMethod)}
							data-testid={`payment-method-${paymentMethod}`}
						>
							<span className="sm:hidden">
								{paymentMethod === "bank_transfer"
									? "Перевод"
									: paymentMethod === "family_wallet"
										? "Баланс"
										: paymentMethod === "card"
											? "Карта"
											: paymentMethod === "cash"
												? "Нал"
												: paymentMethod === "online"
													? "Онлайн"
													: methodLabels[paymentMethod] || paymentMethod}
							</span>
							<span className="hidden sm:inline">
								{methodLabels[paymentMethod] || (paymentMethod === "family_wallet" ? "Баланс / Аванс" : paymentMethod)}
							</span>
						</button>
					);
				})}
			</div>

			<PaymentDiscountsAndSplitSection
				amount={amount}
				selectedDoctorDiscount={selectedDoctorDiscount}
				onApplyDoctorDiscount={applyDoctorDiscount}
				onApplySplit5050={applySplit5050Preset}
				onApplyThreeWaySplit={applyThreeWaySplitPreset}
				onApplyDepositPlusCard={applyDepositPlusCardPreset}
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

			{!paymentReadyToSubmit ? (
				<div className="payment-capture-missing" id={paymentMissingId} role="status" aria-live="polite">
					<strong>Чтобы принять оплату, осталось:</strong>
					<ul>
						{paymentMissingSteps.map((step) => (
							<li key={step}>{step}</li>
						))}
					</ul>
				</div>
			) : isTaxDeductionDraft ? (
				<div className="payment-capture-tax-draft-hint px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs font-medium my-2" role="status" data-testid="payment-tax-draft-hint">
					<span className="font-bold">Налоговый вычет (черновик): </span>
					<span>
						Оплата не блокируется. Для формирования справки ФНС не хватает: {taxDeductionMissingSteps.join(", ")} (можно заполнить позже в карточке пациента).
					</span>
				</div>
			) : null}

			<p className="payment-capture-safeguard text-[10px] text-[var(--muted)] my-1 block">
				Каждая оплата добавляет новую строку в историю. Ошибку закрывайте возвратом или коррекцией, не повторной записью.
			</p>

			{/* Checkout bar with submit button containing data-tour="cashier-pay" */}
			<PaymentCheckoutBar
				amount={amount}
				remainingDebt={remainingDebt}
				paymentReadyToSubmit={paymentReadyToSubmit}
				paymentMissingId={paymentMissingId}
				isSaving={isSaving}
				isZeroAmount={isZeroAmount}
				isMoreActionsOpen={isMoreActionsOpen}
				onToggleMoreActions={() => setIsMoreActionsOpen((prev) => !prev)}
				onCloseMoreActions={() => setIsMoreActionsOpen(false)}
				onPrimarySubmit={handlePrimarySubmit}
				onSberPosClick={handleSberPosClick}
				onOpenSplitModal={handleOpenSplitModal}
				onManualCardTerminalSubmit={handleManualCardTerminalSubmit}
			/>

			{patientId && (
				<SberPosTerminalModal
					isOpen={isSberPosModalOpen}
					onClose={() => setIsSberPosModalOpen(false)}
					totalBillKop={rubToKopecks(
						Number(
							normalizeRubAmountInput(amount) ?? (remainingDebt && remainingDebt > 0 ? remainingDebt : 0),
						),
					)}
					patientName={patientDefaults?.fullName || payerFullName || "Пациент"}
					orderId={`CHK-2026-${patientId ? patientId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() : "891"}`}
					initialOperation={method === "online" ? "sberpay_qr" : "sale"}
					onSelectAlternativeMethod={(altMethod) => {
						onMethodChange(normalizePaymentMethod(altMethod));
					}}
					onTransactionSuccess={(response) => {
						setIsSberPosModalOpen(false);
						onAmountChange("");
						if (response.rrn) onFiscalFdChange(response.rrn);
						if (response.authCode) onFiscalFpdChange(response.authCode);
						showToast(
							`Оплата ${money(kopecksToRub(response.amountKop))} через терминал Сбербанка (${response.cardIssuer}) успешно зафиксирована. RRN: ${response.rrn}`,
							"success",
						);
					}}
				/>
			)}

			<PaymentModal
				isOpen={isSplitModalOpen}
				onClose={() => {
					setIsSplitModalOpen(false);
					setIsSplit5050Mode(false);
				}}
				patientId={patientId || undefined}
				patientName={patientDefaults?.fullName || payerFullName || undefined}
				amountRub={normalizeRubAmountInput(amount) ?? (remainingDebt && remainingDebt > 0 ? remainingDebt : undefined)}
				patientDebtRub={remainingDebt && remainingDebt > 0 ? remainingDebt : undefined}
				cashierName={fiscalCashierName || undefined}
				defaultMethod="split"
				initialSplit5050={isSplit5050Mode}
				onSuccess={(paymentData) => {
					setIsSplitModalOpen(false);
					setIsSplit5050Mode(false);
					onAmountChange("");
					const formattedAmount = paymentData.amountKopecks ? money(kopecksToRub(paymentData.amountKopecks)) : "";
					showToast(`Комбинированная оплата ${formattedAmount} успешно зафиксирована.`, "success", 4000);
				}}
			/>
		</div>
	);
}
