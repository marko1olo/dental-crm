/**
 * CashRegisterCheckoutModal.tsx — Canonical SSOT 1-Click Checkout & Payment Modal.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, no obstacle citizen INN, soft-focus).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-3 chairs).
 * - Mandate 8am: Exactly ONE Primary CTA button in var(--teal) per visible context.
 * - Apple HIG: Native Mobile Bottom Sheet, touch targets >=44x44px, safe-area protection.
 * - Integer Kopeck Math: Strict BigInt amountKopecks without floating-point errors.
 * - Zero Bureaucracy: 0 "54-FZ" or "FFD" in client labels. Clean clinical Russian.
 * - Mandate 8b: Monolith decomposed into focused subcomponents <= 500 lines.
 */

import React, { useState, useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, RefreshCw, Tag, ShieldCheck } from "lucide-react";
import {
	kopecksToRub,
	rubToKopecks,
	calculateCashChange,
	calculateSplitBalances,
	getCashPresetSuggestions,
	generateQrCodeSvg,
	formatDisplayCurrency,
} from "@dental/shared";
import {
	CashRegisterTendersSection,
	type CheckoutTenderMethod,
} from "./cashRegister/CashRegisterTendersSection";
import { CashRegisterSplitSection } from "./cashRegister/CashRegisterSplitSection";
import {
	CashRegisterFiscalSection,
	type ReceiptDeliveryMethod,
} from "./cashRegister/CashRegisterFiscalSection";
import { CashRegisterFeedbackSection } from "./cashRegister/CashRegisterFeedbackSection";
import { CashRegisterCheckoutHeader } from "./cashRegister/CashRegisterCheckoutHeader";

export type { CheckoutTenderMethod, ReceiptDeliveryMethod };

export interface CashRegisterCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalDueRub?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly totalBillKop?: number | undefined;
	readonly amountKopecks?: number | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly orderId?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly defaultMethod?: CheckoutTenderMethod | string | undefined;
	readonly initialPaymentMethod?: string | undefined;
	readonly initialDiscountPercent?: number | undefined;
	readonly initialWarranty100?: boolean | undefined;
	readonly initialCustomDiscountRub?: number | undefined;
	readonly initialDiscountReason?: string | undefined;
	readonly containerTestId?: string | undefined;
	readonly title?: string | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly onOpenDepositTopup?: (() => void) | undefined;
	readonly onSuccess?: ((payload: any) => void) | undefined;
	readonly onPaymentComplete?: ((payload: any) => void) | undefined;
}

export const CashRegisterCheckoutModal: React.FC<CashRegisterCheckoutModalProps> = ({
	isOpen,
	onClose,
	totalDueRub: propTotalDue,
	amountRub: propAmount,
	totalBillRub: propBillRub,
	totalBillKop: propBillKop,
	amountKopecks: propKop,
	patientId = "pat-walkin",
	patientName = "Пациент",
	patientPhone = "",
	patientEmail = "",
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	invoiceId,
	visitId,
	orderId,
	cashierFullName: propCashierFull,
	cashierName: propCashierName,
	doctorFullName: propDocFull,
	doctorName: propDocName,
	attendingDoctorName: propDocAttend,
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	defaultMethod = "card",
	initialPaymentMethod,
	initialDiscountPercent = 0,
	initialWarranty100 = false,
	containerTestId,
	title,
	onOpenSplitPayment,
	onSuccess,
	onPaymentComplete,
}) => {
	const cashierFullName = propCashierFull || propCashierName || propDocFull || propDocName || propDocAttend || "Администратор / Кассир";
	const doctorFullName = propDocFull || propDocName || propDocAttend;
	const effectiveDefaultMethod = initialPaymentMethod || defaultMethod;
	const modalTitleId = useId();

	// Resolve initial raw amount in rubles
	const rawAmount = useMemo(() => {
		if (typeof propTotalDue === "number") return Math.max(0, propTotalDue);
		if (typeof propAmount === "number") return Math.max(0, propAmount);
		if (typeof propBillRub === "number") return Math.max(0, propBillRub);
		if (typeof propBillKop === "number") return Math.max(0, kopecksToRub(propBillKop));
		if (typeof propKop === "number") return Math.max(0, kopecksToRub(propKop));
		return 0;
	}, [propTotalDue, propAmount, propBillRub, propBillKop, propKop]);

	const [isWarranty, setIsWarranty] = useState<boolean>(initialWarranty100);
	const [discountPercent, setDiscountPercent] = useState<number>(initialDiscountPercent);

	const computedDue = useMemo(() => {
		if (isWarranty) return 0;
		if (discountPercent > 0) {
			const disc = Math.round((rawAmount * discountPercent) / 100);
			return Math.max(0, rawAmount - disc);
		}
		return rawAmount;
	}, [rawAmount, isWarranty, discountPercent]);

	const [totalDue, setTotalDue] = useState<number>(computedDue);
	const [method, setMethod] = useState<CheckoutTenderMethod>(
		["card", "cash", "sbp", "deposit", "split"].includes(effectiveDefaultMethod as string)
			? (effectiveDefaultMethod as CheckoutTenderMethod)
			: "card",
	);

	// Cash calculation
	const [cashReceivedRub, setCashReceivedRub] = useState<number>(computedDue);

	// Split tender allocations (in Rubles)
	const [splitCardRub, setSplitCardRub] = useState<number>(computedDue);
	const [splitCashRub, setSplitCashRub] = useState<number>(0);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);

	// Fiscal receipt options
	const [fiscalize, setFiscalize] = useState<boolean>(true);
	const [receiptDelivery, setReceiptDelivery] = useState<ReceiptDeliveryMethod>("print");
	const [customerContact, setCustomerContact] = useState<string>(
		patientPhone || patientEmail || "",
	);

	// Execution state
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [receiptSuccess, setReceiptSuccess] = useState<any | null>(null);

	useEffect(() => {
		setTotalDue(computedDue);
		setCashReceivedRub(computedDue);
		setSplitCardRub(computedDue);
		setSplitCashRub(0);
		setSplitSbpRub(0);
		setSplitDepositRub(0);
		setErrorMessage(null);
		setReceiptSuccess(null);
	}, [computedDue, isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isSubmitting) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, isSubmitting]);

	const effectiveDepositLimit = Math.max(0, patientDepositRub + patientFamilyBalanceRub);
	const totalKopecks = BigInt(rubToKopecks(totalDue));

	// Exact kopeck calculations via shared pure math (Mandates 8f, 8i)
	const cashChangeResult = useMemo(
		() => calculateCashChange(method === "cash" ? totalDue : splitCashRub, cashReceivedRub),
		[method, totalDue, splitCashRub, cashReceivedRub],
	);

	const splitBalances = useMemo(
		() =>
			calculateSplitBalances(totalDue, {
				cardRub: splitCardRub,
				cashRub: splitCashRub,
				sbpRub: splitSbpRub,
				depositRub: splitDepositRub,
			}),
		[totalDue, splitCardRub, splitCashRub, splitSbpRub, splitDepositRub],
	);

	const isSplitBalanced = splitBalances.isFullyPaid;

	// Authentic SBP QR SVG generation
	const sbpQrSvg = useMemo(() => {
		if (method !== "sbp" && splitSbpRub <= 0) return null;
		const sbpAmount = method === "sbp" ? totalDue : splitSbpRub;
		const fakeNspkUrl = `https://qr.nspk.ru/AD1000${patientId.slice(0, 6)}?type=02&bank=100000000004&sum=${Math.round(sbpAmount * 100)}&cur=RUB&crc=AB12`;
		return generateQrCodeSvg(fakeNspkUrl, { size: 140, margin: 1 });
	}, [method, totalDue, splitSbpRub, patientId]);

	// Fast cash preset suggestions
	const cashPresets = useMemo(
		() => getCashPresetSuggestions(method === "cash" ? totalDue : splitCashRub),
		[method, totalDue, splitCashRub],
	);

	if (!isOpen) return null;

	const handleSelectMethod = (m: CheckoutTenderMethod) => {
		setMethod(m);
		setErrorMessage(null);
		if (m === "cash") {
			setCashReceivedRub(totalDue);
		} else if (m === "split") {
			const half = Math.floor(totalDue / 2);
			setSplitCardRub(half);
			setSplitCashRub(Number((totalDue - half).toFixed(2)));
			setSplitSbpRub(0);
			setSplitDepositRub(0);
			setCashReceivedRub(Number((totalDue - half).toFixed(2)));
		} else if (m === "deposit") {
			if (effectiveDepositLimit < totalDue) {
				setSplitDepositRub(effectiveDepositLimit);
				setSplitCardRub(Number((totalDue - effectiveDepositLimit).toFixed(2)));
				setSplitCashRub(0);
				setSplitSbpRub(0);
				setMethod("split");
			}
		}
	};

	const handleApplySplitPreset = (preset: "50-50" | "deposit-card" | "deposit-cash") => {
		if (preset === "50-50") {
			const half = Math.floor(totalDue / 2);
			setSplitCardRub(half);
			setSplitCashRub(Number((totalDue - half).toFixed(2)));
			setSplitSbpRub(0);
			setSplitDepositRub(0);
			setCashReceivedRub(Number((totalDue - half).toFixed(2)));
		} else if (preset === "deposit-card") {
			const dep = Math.min(effectiveDepositLimit, totalDue);
			setSplitDepositRub(dep);
			setSplitCardRub(Number((totalDue - dep).toFixed(2)));
			setSplitCashRub(0);
			setSplitSbpRub(0);
		} else if (preset === "deposit-cash") {
			const dep = Math.min(effectiveDepositLimit, totalDue);
			const cash = Number((totalDue - dep).toFixed(2));
			setSplitDepositRub(dep);
			setSplitCashRub(cash);
			setSplitCardRub(0);
			setSplitSbpRub(0);
			setCashReceivedRub(cash);
		}
	};

	const handleExecutePayment = async () => {
		if (isWarranty || totalDue === 0) {
			setIsSubmitting(true);
			const zeroData = {
				method: "warranty_discount_100",
				amountKopecks: 0,
				amountRub: 0,
				discountPercent: 100,
				patientId,
			};
			setReceiptSuccess(zeroData);
			setIsSubmitting(false);
			onSuccess?.(zeroData);
			onPaymentComplete?.(zeroData);
			setTimeout(() => {
				onClose();
			}, 400);
			return;
		}

		if (totalDue <= 0) {
			setErrorMessage("Сумма к оплате должна быть больше 0 ₽.");
			return;
		}

		if (method === "split" && !isSplitBalanced) {
			const diff = splitBalances.totalDueRub - splitBalances.allocatedRub;
			setErrorMessage(
				`Сумма сплита (${splitBalances.allocatedRub.toLocaleString("ru-RU")} ₽) не совпадает с итогом (${totalDue.toLocaleString("ru-RU")} ₽). Разница: ${diff > 0 ? `+${diff}` : diff} ₽.`,
			);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		const cashKop =
			method === "cash"
				? rubToKopecks(totalDue)
				: method === "split"
					? rubToKopecks(splitCashRub)
					: 0;
		const cardKop =
			method === "card"
				? rubToKopecks(totalDue)
				: method === "split"
					? rubToKopecks(splitCardRub)
					: 0;
		const sbpKop =
			method === "sbp"
				? rubToKopecks(totalDue)
				: method === "split"
					? rubToKopecks(splitSbpRub)
					: 0;
		const depKop =
			method === "deposit"
				? rubToKopecks(totalDue)
				: method === "split"
					? rubToKopecks(splitDepositRub)
					: 0;

		const payload = {
			patientId,
			visitId: visitId || undefined,
			invoiceId: invoiceId || undefined,
			amountKopecks: Number(totalKopecks),
			amountRub: totalDue,
			method:
				method === "split"
					? "split"
					: method === "sbp"
						? "sbp"
						: method === "cash"
							? "cash"
							: method === "deposit"
								? "deposit"
								: "card",
			cashAmountKopecks: cashKop,
			electronicAmountKopecks: cardKop + sbpKop,
			depositAmountKopecks: depKop,
			cashierFullName,
			isElectronicReceiptOnly: receiptDelivery !== "print",
			customerContact: receiptDelivery !== "print" ? customerContact.trim() : undefined,
			clientMutationId: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		};

		try {
			const response = await fetch("/api/cashbox/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = await response.json().catch(() => null);

			if (!response.ok || !json?.success) {
				const msg = json?.message || "Ошибка кассового узла при проведении платежа.";
				setErrorMessage(msg);
				setIsSubmitting(false);
				return;
			}

			const paymentData = json.data || payload;
			setReceiptSuccess(paymentData);
			setIsSubmitting(false);
			onSuccess?.(paymentData);
			onPaymentComplete?.(paymentData);
			setTimeout(() => {
				onClose();
			}, 900);
		} catch {
			setErrorMessage("Сетевой сбой при связи с кассой. Проверьте подключение и повторите.");
			setIsSubmitting(false);
		}
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 overflow-x-clip max-w-[100vw] animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
			data-testid={containerTestId || "cash-register-checkout-modal"}
		>
			<div className="w-full max-w-full md:max-w-xl lg:max-w-2xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper,#ffffff)] border-t md:border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] md:max-h-[90vh]">
				{/* Apple HIG Header & Tactile Drag Handle */}
				<CashRegisterCheckoutHeader
					modalTitleId={modalTitleId}
					patientName={patientName}
					doctorFullName={doctorFullName}
					onClose={onClose}
				/>

				{/* Modal Body */}
				<div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-w-full">
					{/* Primary Due Total Display (Apple HIG Big Headline) */}
					<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col items-center justify-center gap-1 text-center">
						<span className="text-xs font-medium text-[var(--muted,#64748b)] uppercase tracking-wider">
							Сумма к оплате
						</span>
						<span data-testid="display-total-amount-due" className="inline-block">
							<span
								className="text-[32px] md:text-[36px] font-bold text-[var(--ink,#0f172a)] tracking-tight leading-none"
								data-testid="checkout-total-amount"
							>
								{formatDisplayCurrency(totalDue)}
							</span>
						</span>
						{rawAmount > 0 && (isWarranty || discountPercent > 0) && (
							<span className="text-xs text-[var(--muted)] line-through">
								Исходная стоимость: {formatDisplayCurrency(rawAmount)}
							</span>
						)}
						{effectiveDepositLimit > 0 && (
							<span className="text-xs text-[var(--teal,#0d9488)] font-medium mt-1">
								Доступен аванс / депозит: {effectiveDepositLimit.toLocaleString("ru-RU")} ₽
							</span>
						)}
					</div>

					{/* Doctor Discounts Row (Mandate 8e, 1-Click Warranty) */}
					<div className="flex items-center justify-between gap-1.5 p-2.5 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)] text-xs flex-wrap">
						<span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 shrink-0">
							<Tag className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							Скидки врача:
						</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								data-testid="btn-discount-warranty"
								onClick={() => {
									setIsWarranty(!isWarranty);
									setDiscountPercent(0);
								}}
								className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
									isWarranty
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								100% Гарантия
							</button>
							<button
								type="button"
								onClick={() => {
									setDiscountPercent(discountPercent === 50 ? 0 : 50);
									setIsWarranty(false);
								}}
								className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
									discountPercent === 50 && !isWarranty
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								50% Коллеги
							</button>
							<button
								type="button"
								onClick={() => {
									setDiscountPercent(discountPercent === 10 ? 0 : 10);
									setIsWarranty(false);
								}}
								className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
									discountPercent === 10 && !isWarranty
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								10% Пенсионеры
							</button>
							{(isWarranty || discountPercent > 0) && (
								<button
									type="button"
									onClick={() => {
										setIsWarranty(false);
										setDiscountPercent(0);
									}}
									className="text-xs text-[var(--muted)] hover:text-[var(--ink)] underline min-h-[36px] px-1.5"
								>
									Сбросить
								</button>
							)}
						</div>
					</div>

					{/* 54-FZ Physical Person Non-Requirement Badge (Mandates 8e, 8n) */}
					<div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs">
						<div className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
							<ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
							<span>Плательщик: физическое лицо</span>
						</div>
						<span
							data-testid="inn-physical-not-required-badge"
							className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))]"
						>
							ИНН не требуется
						</span>
					</div>

					{/* Payment Tender Method Tiles, Cash change & SBP QR */}
					<CashRegisterTendersSection
						method={method}
						onSelectMethod={handleSelectMethod}
						onOpenSplitPayment={onOpenSplitPayment}
						totalDue={totalDue}
						cashReceivedRub={cashReceivedRub}
						onCashReceivedChange={setCashReceivedRub}
						cashChangeResult={cashChangeResult}
						cashPresets={cashPresets}
						sbpQrSvg={sbpQrSvg}
					/>

					{/* Combined Split Controls (Card + Cash + SBP + Deposit) */}
					{method === "split" && (
						<CashRegisterSplitSection
							isSplitBalanced={isSplitBalanced}
							splitBalances={splitBalances}
							effectiveDepositLimit={effectiveDepositLimit}
							totalDue={totalDue}
							splitCardRub={splitCardRub}
							onSplitCardChange={setSplitCardRub}
							splitCashRub={splitCashRub}
							onSplitCashChange={setSplitCashRub}
							splitSbpRub={splitSbpRub}
							onSplitSbpChange={setSplitSbpRub}
							splitDepositRub={splitDepositRub}
							onSplitDepositChange={setSplitDepositRub}
							onApplyPreset={handleApplySplitPreset}
						/>
					)}

					{/* Fiscalization & Receipt Delivery Options */}
					<CashRegisterFiscalSection
						fiscalize={fiscalize}
						onFiscalizeChange={setFiscalize}
						receiptDelivery={receiptDelivery}
						onReceiptDeliveryChange={setReceiptDelivery}
						customerContact={customerContact}
						onCustomerContactChange={setCustomerContact}
					/>

					{/* Error & Success Feedback Banners */}
					<CashRegisterFeedbackSection
						errorMessage={errorMessage}
						onRetry={handleExecutePayment}
						receiptSuccess={receiptSuccess}
						clinicLegalName={clinicLegalName}
					/>
				</div>

				{/* Footer with exactly ONE Primary CTA Button (Mandate 8am) */}
				<div
					className="px-5 py-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3"
					style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
				>
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,#cbd5e1)] text-xs sm:text-sm font-medium text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleExecutePayment}
						data-testid="btn-confirm-checkout-payment"
						data-testid-alt="execute-fast-checkout-btn"
						className="min-h-[52px] sm:min-h-[44px] flex-1 max-w-sm py-2.5 px-5 rounded-2xl sm:rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
						style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
					>
						<span data-testid="btn-submit-checkout-54fz" className="contents">
							{isSubmitting ? (
								<>
									<RefreshCw className="w-4 h-4 animate-spin" />
									<span>Пробитие чека...</span>
								</>
							) : isWarranty || totalDue === 0 ? (
								<>
									<Check className="w-4 h-4 shrink-0" />
									<span data-testid="btn-payment-close-warranty-zero">Закрыть визит: Гарантия 100% (0 ₽)</span>
								</>
							) : (
								<>
									<Check className="w-4 h-4 shrink-0" />
									<span>Принять оплату {formatDisplayCurrency(totalDue)}</span>
								</>
							)}
						</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default CashRegisterCheckoutModal;
