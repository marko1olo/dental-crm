/**
 * apps/web/src/components/cashbox/CashRegisterCheckoutModal.tsx
 *
 * Canonical SSOT 1-Click Cashbox Checkout & Payment Modal.
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, soft defaults).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Mandate 8am: Exactly ONE Primary CTA button in var(--teal) per visible context.
 * - Apple HIG: Native Mobile Bottom Sheet (rounded-t-[24px], Drag Handle 36x5px, Natural Thumb Zone).
 * - Integer Kopeck Math: Strict BigInt amountKopecks without floating-point errors.
 * - Sweet Spot target: 350-450 lines.
 */

import React, { useState, useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { CreditCard, Banknote, QrCode, Wallet, Layers, Printer, Check, X, ShieldCheck, AlertTriangle } from "lucide-react";
import { kopecksToRub, rubToKopecks, calculateCashChange, calculateSplitBalances, generateQrCodeSvg } from "@dental/shared";
import {
	CASHBOX_TENDER_PRESETS, QUICK_CASH_PRESET_BILLS, DOCTOR_DISCOUNT_PRESETS,
	PAYER_TYPE_PRESETS, RECEIPT_PRINT_FORMATS,
	type CashboxTenderType, type ClientPayerType, type ReceiptPrintFormat,
} from "./cashboxCatalogData.js";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";

const TENDER_ICONS: Record<CashboxTenderType, React.ElementType> = {
	card: CreditCard, cash: Banknote, sbp: QrCode, deposit: Wallet, split: Layers,
};

export type CheckoutTenderMethod = CashboxTenderType;
export type ReceiptDeliveryMethod = "print" | "sms" | "email";

export interface CashRegisterCheckoutModalProps {
	readonly isOpen: boolean; readonly onClose: () => void;
	readonly totalDueRub?: number; readonly amountRub?: number; readonly totalBillRub?: number; readonly totalBillKop?: number;
	readonly amountKopecks?: number; readonly initialAmountKopecks?: number;
	readonly patientId?: string; readonly patientName?: string; readonly patientPhone?: string; readonly patientEmail?: string;
	readonly patientDepositRub?: number; readonly patientFamilyBalanceRub?: number;
	readonly invoiceId?: string; readonly visitId?: string; readonly orderId?: string;
	readonly cashierFullName?: string; readonly cashierName?: string;
	readonly doctorFullName?: string; readonly doctorName?: string; readonly attendingDoctorName?: string;
	readonly clinicLegalName?: string; readonly defaultMethod?: CashboxTenderType | string;
	readonly initialPaymentMethod?: CashboxTenderType | string; readonly initialDiscountPercent?: number; readonly initialWarranty100?: boolean;
	readonly containerTestId?: string; readonly title?: string; readonly onOpenSplitPayment?: () => void;
	readonly onSuccess?: (data: any) => void; readonly onPaymentComplete?: (data: any) => void;
}

export const CashRegisterCheckoutModal: React.FC<CashRegisterCheckoutModalProps> = ({
	isOpen, onClose, totalDueRub: propTotalDue, amountRub: propAmount,
	totalBillRub: propBillRub, totalBillKop: propBillKop, amountKopecks: propKop,
	initialAmountKopecks: propInitialKop, patientId = "pat-walkin", patientName = "Пациент",
	patientPhone = "", patientEmail = "", patientDepositRub = 0, patientFamilyBalanceRub = 0,
	invoiceId, visitId, cashierFullName: propCashierFull, cashierName: propCashierName,
	doctorFullName: propDocFull, doctorName: propDocName, attendingDoctorName: propDocAttend,
	defaultMethod = "card", initialPaymentMethod, initialDiscountPercent = 0,
	initialWarranty100 = false, containerTestId, title, onOpenSplitPayment, onSuccess, onPaymentComplete,
}) => {
	const cashierFullName = propCashierFull || propCashierName || "Администратор / Кассир";
	const doctorFullName = propDocFull || propDocName || propDocAttend;
	const effectiveDefaultMethod = (initialPaymentMethod || defaultMethod || "card") as CashboxTenderType;
	const modalTitleId = useId();

	const rawAmount = useMemo(() => {
		if (typeof propTotalDue === "number") return Math.max(0, propTotalDue);
		if (typeof propAmount === "number") return Math.max(0, propAmount);
		if (typeof propBillRub === "number") return Math.max(0, propBillRub);
		if (typeof propBillKop === "number") return Math.max(0, kopecksToRub(propBillKop));
		if (typeof propKop === "number") return Math.max(0, kopecksToRub(propKop));
		if (typeof propInitialKop === "number") return Math.max(0, kopecksToRub(propInitialKop));
		return 0;
	}, [propTotalDue, propAmount, propBillRub, propBillKop, propKop, propInitialKop]);

	const [isWarranty, setIsWarranty] = useState<boolean>(initialWarranty100);
	const [discountPercent, setDiscountPercent] = useState<number>(initialDiscountPercent);
	const [payerType, setPayerType] = useState<ClientPayerType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");

	const computedDue = useMemo(() => {
		if (isWarranty) return 0;
		if (discountPercent > 0) return Math.max(0, rawAmount - Math.round((rawAmount * discountPercent) / 100));
		return rawAmount;
	}, [rawAmount, isWarranty, discountPercent]);

	const [totalDue, setTotalDue] = useState<number>(computedDue);
	const [method, setMethod] = useState<CashboxTenderType>(
		["card", "cash", "sbp", "deposit", "split"].includes(effectiveDefaultMethod) ? effectiveDefaultMethod : "card",
	);

	const [cashReceivedRub, setCashReceivedRub] = useState<number>(computedDue);
	const [splitCardRub, setSplitCardRub] = useState<number>(computedDue);
	const [splitCashRub, setSplitCashRub] = useState<number>(0);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);

	const [fiscalize, setFiscalize] = useState<boolean>(true);
	const [receiptDelivery, setReceiptDelivery] = useState<ReceiptDeliveryMethod>("print");
	const [printFormat, setPrintFormat] = useState<ReceiptPrintFormat>("tape_80mm");
	const [customerContact, setCustomerContact] = useState<string>(patientPhone || patientEmail || "");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [receiptSuccess, setReceiptSuccess] = useState<any | null>(null);

	useEffect(() => {
		setTotalDue(computedDue); setCashReceivedRub(computedDue); setSplitCardRub(computedDue);
		setSplitCashRub(0); setSplitSbpRub(0); setSplitDepositRub(0);
		setErrorMessage(null); setReceiptSuccess(null);
	}, [computedDue, isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape" && !isSubmitting) onClose(); };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, isSubmitting]);

	const effectiveDepositLimit = Math.max(0, patientDepositRub + patientFamilyBalanceRub);
	const totalKopecks = BigInt(rubToKopecks(totalDue));
	const cashChangeResult = useMemo(() => calculateCashChange(method === "cash" ? totalDue : splitCashRub, cashReceivedRub), [method, totalDue, splitCashRub, cashReceivedRub]);
	const splitBalances = useMemo(() => calculateSplitBalances(totalDue, { cardRub: splitCardRub, cashRub: splitCashRub, sbpRub: splitSbpRub, depositRub: splitDepositRub }), [totalDue, splitCardRub, splitCashRub, splitSbpRub, splitDepositRub]);

	const sbpQrSvg = useMemo(() => {
		if (method !== "sbp" && splitSbpRub <= 0) return null;
		const sbpAmount = method === "sbp" ? totalDue : splitSbpRub;
		const fakeNspkUrl = `https://qr.nspk.ru/AD1000${patientId.slice(0, 6)}?type=02&bank=100000000004&sum=${Math.round(sbpAmount * 100)}&cur=RUB`;
		return generateQrCodeSvg(fakeNspkUrl, { size: 140, margin: 1 });
	}, [method, totalDue, splitSbpRub, patientId]);

	if (!isOpen) return null;

	const handleExecutePayment = async () => {
		const isWarrantyCase = isWarranty || totalDue === 0;
		if (totalDue <= 0 && !isWarrantyCase) {
			setErrorMessage("Сумма к оплате должна быть больше 0 ₽.");
			return;
		}
		if (method === "split" && !isWarrantyCase && !splitBalances.isFullyPaid) {
			const diff = splitBalances.totalDueRub - splitBalances.allocatedRub;
			setErrorMessage(`Сумма сплита не совпадает с итогом. Разница: ${diff > 0 ? `+${diff}` : diff} ₽.`);
			return;
		}
		setIsSubmitting(true);
		setErrorMessage(null);

		const cashKop = isWarrantyCase ? 0 : method === "cash" ? rubToKopecks(totalDue) : method === "split" ? rubToKopecks(splitCashRub) : 0;
		const cardKop = isWarrantyCase ? 0 : method === "card" ? rubToKopecks(totalDue) : method === "split" ? rubToKopecks(splitCardRub) : 0;
		const sbpKop = isWarrantyCase ? 0 : method === "sbp" ? rubToKopecks(totalDue) : method === "split" ? rubToKopecks(splitSbpRub) : 0;
		const depKop = isWarrantyCase ? 0 : method === "deposit" ? rubToKopecks(totalDue) : method === "split" ? rubToKopecks(splitDepositRub) : 0;

		const payload = {
			patientId: patientId && patientId !== "pat-walkin" ? patientId : undefined,
			visitId: visitId || undefined,
			invoiceId: invoiceId || undefined,
			orderId: orderId || undefined,
			amountKopecks: isWarrantyCase ? 0 : Number(totalKopecks),
			amountRub: isWarrantyCase ? 0 : totalDue,
			method: isWarrantyCase ? "warranty" : method === "split" ? "split" : method === "sbp" ? "sbp" : method === "cash" ? "cash" : method === "deposit" ? "deposit" : "card",
			isWarranty: isWarrantyCase,
			cashAmountKopecks: cashKop,
			electronicAmountKopecks: cardKop + sbpKop,
			depositAmountKopecks: depKop,
			cashierFullName,
			isElectronicReceiptOnly: receiptDelivery !== "print",
			customerContact: receiptDelivery !== "print" ? customerContact.trim() : undefined,
			clientType: payerType,
			buyerInn: payerType !== "physical_person" ? buyerInn.trim() || undefined : undefined,
			printFormat,
			clientMutationId: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			note: isWarrantyCase ? "Гарантийный расчёт (скидка 100%)" : undefined,
		};

		try {
			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const response = await fetch("/api/cashbox/payments", {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});
			const json = await response.json().catch(() => null);
			if (!response.ok || !json?.success) {
				if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
					const fallbackData = { ...payload, status: isWarrantyCase ? "paid_warranty" : "paid" };
					setReceiptSuccess(fallbackData);
					setIsSubmitting(false);
					onSuccess?.(fallbackData);
					onPaymentComplete?.(fallbackData);
					setTimeout(onClose, 800);
					return;
				}
				setErrorMessage(json?.message || "Ошибка кассового узла при проведении платежа.");
				setIsSubmitting(false);
				return;
			}
			const paymentData = json.data || payload;
			setReceiptSuccess(paymentData);
			setIsSubmitting(false);
			onSuccess?.(paymentData);
			onPaymentComplete?.(paymentData);
			setTimeout(onClose, 800);
		} catch {
			if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
				const fallbackData = { ...payload, status: isWarrantyCase ? "paid_warranty" : "paid" };
				setReceiptSuccess(fallbackData);
				setIsSubmitting(false);
				onSuccess?.(fallbackData);
				onPaymentComplete?.(fallbackData);
				setTimeout(onClose, 800);
				return;
			}
			setErrorMessage("Сетевой сбой при связи с кассой. Проверьте подключение и повторите.");
			setIsSubmitting(false);
		}
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 overflow-x-clip max-w-[100vw] animate-in fade-in duration-150"
			role="dialog" aria-modal="true" aria-labelledby={modalTitleId} data-testid={containerTestId || "cash-register-checkout-modal"}
		>
			<div className="w-full max-w-full md:max-w-xl lg:max-w-2xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper)] border-t md:border border-[var(--line)] text-[var(--ink)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] md:max-h-[90vh]">
				{/* Apple HIG Header & Drag Handle */}
				<div className="pt-2 px-4 border-b border-[var(--line)] flex flex-col bg-[var(--paper)]">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line)] mx-auto mb-2 md:hidden" aria-hidden="true" />
					<div className="flex items-center justify-between pb-3">
						<div>
							<h2 id={modalTitleId} className="text-base sm:text-lg font-bold tracking-tight text-[var(--ink)] flex items-center gap-2">
								<ShieldCheck className="w-5 h-5 text-[var(--teal,#0d9488)]" />
								<span>{title || "Касса · Оплата приёма"}</span>
							</h2>
							<p className="text-xs text-[var(--muted)]">{patientName} {doctorFullName ? `· Врач: ${doctorFullName}` : ""}</p>
						</div>
						<button
							type="button" onClick={onClose} aria-label="Закрыть"
							className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] transition-colors flex items-center justify-center"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Modal Scroll Body */}
				<div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-w-full bg-[var(--paper)]">
					{/* Big Prominent Total Display (32-36px bold, Mandate 8am) */}
					<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
						<span className="text-xs uppercase tracking-wider font-semibold text-[var(--muted)]">Итого к оплате</span>
						<div className="text-[32px] sm:text-[36px] font-black text-[var(--ink)] tracking-tight my-1" data-testid="checkout-total-amount">
							<span data-testid="display-total-amount-due">{totalDue.toLocaleString("ru-RU")} ₽</span>
						</div>
						{isWarranty && <span className="text-xs font-bold text-[var(--teal,#0d9488)]">100% Гарантийный случай врача</span>}
						{effectiveDepositLimit > 0 && <span className="text-xs text-[var(--muted)] mt-1">Доступен аванс / депозит пациента: {effectiveDepositLimit.toLocaleString("ru-RU")} ₽</span>}
					</div>

					{/* Doctor Discounts Row (Mandate 8e Autonomy) */}
					<div className="flex flex-wrap gap-1.5 items-center">
						<span className="text-xs font-semibold text-[var(--muted)] mr-1">Скидка врача:</span>
						{DOCTOR_DISCOUNT_PRESETS.map((d) => {
							const active = (d.isWarranty && isWarranty) || (!d.isWarranty && discountPercent === d.percent && !isWarranty);
							return (
								<button
									key={d.percent} type="button"
									onClick={() => {
										if (d.isWarranty) { setIsWarranty(!isWarranty); setDiscountPercent(0); }
										else { setIsWarranty(false); setDiscountPercent(discountPercent === d.percent ? 0 : d.percent); }
									}}
									className={`min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
										active ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper)]"
									}`}
								>
									{d.label}
								</button>
							);
						})}
					</div>

					{/* Payer Type Classification (Mandate 8n Autonomy: 0 Forced Citizen INN) */}
					<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
							<span className="text-xs font-bold text-[var(--ink)]">Тип плательщика:</span>
							<span className="text-[11px] text-[var(--muted)]">{PAYER_TYPE_PRESETS.find((p) => p.id === payerType)?.helperText}</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							{PAYER_TYPE_PRESETS.map((p) => (
								<button
									key={p.id} type="button" onClick={() => setPayerType(p.id)}
									className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center flex items-center justify-center ${
										payerType === p.id
											? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold shadow-xs"
											: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
									}`}
								>
									{p.label}
								</button>
							))}
						</div>
						{payerType !== "physical_person" && (
							<div className="pt-1">
								<label htmlFor="input-legal-inn" className="block text-xs font-medium text-[var(--muted)] mb-1">
									ИНН {payerType === "legal_entity" ? "организации (10 цифр)" : "ИП (12 цифр)"}:
								</label>
								<input
									id="input-legal-inn" type="text" value={buyerInn} onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
									maxLength={payerType === "legal_entity" ? 10 : 12} placeholder={payerType === "legal_entity" ? "7701234567" : "500123456789"}
									className="w-full min-h-[44px] px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
								/>
							</div>
						)}
					</div>

					{/* 5 Fast Tender Tiles */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-bold text-[var(--ink)]">Способ расчёта:</span>
							{onOpenSplitPayment && (
								<button
									type="button" onClick={onOpenSplitPayment} data-testid="link-open-split-payment"
									className="text-xs text-[var(--teal,#0d9488)] hover:underline font-semibold min-h-[32px] flex items-center"
								>
									Расширенный сплит →
								</button>
							)}
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
							{CASHBOX_TENDER_PRESETS.map((t) => {
								const isSel = method === t.id;
								const testId = t.id === "card" ? "btn-tender-card" : t.id === "cash" ? "btn-tender-cash" : t.id === "sbp" ? "btn-tender-sbp" : t.id === "deposit" ? "btn-tender-deposit" : "btn-tender-split";
								return (
									<button
										key={t.id} type="button" data-testid={testId}
										onClick={() => {
											setMethod(t.id);
											if (t.id === "cash") setCashReceivedRub(totalDue);
											if (t.id === "split") {
												const half = Math.floor(totalDue / 2);
												setSplitCardRub(half); setSplitCashRub(totalDue - half);
											}
										}}
										className={`min-h-[52px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
											isSel
												? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold shadow-xs ring-1 ring-[var(--teal,#0d9488)]"
												: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)]"
										}`}
									>
										{React.createElement(TENDER_ICONS[t.id], { className: "w-5 h-5 mb-1" })}
										<span className="text-[11px] sm:text-xs leading-tight">{t.id === "sbp" ? "QR СБП" : t.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Cash Change Panel with Quick Bills */}
					{method === "cash" && (
						<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">Получено наличными:</span>
								<div className="flex gap-1.5">
									{QUICK_CASH_PRESET_BILLS.map((b) => (
										<button
											key={b} type="button" onClick={() => setCashReceivedRub(b)}
											className="min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)]"
										>
											+{b} ₽
										</button>
									))}
								</div>
							</div>
							<div className="flex items-center gap-3">
								<input
									type="number" value={cashReceivedRub} onChange={(e) => setCashReceivedRub(Math.max(0, Number(e.target.value) || 0))}
									className="w-1/2 min-h-[44px] px-3 text-base font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								/>
								<div className="w-1/2 text-right">
									<span className="text-xs text-[var(--muted)] block">Сдача клиенту:</span>
									<span className={`text-lg font-black ${cashChangeResult.changeRub >= 0 ? "text-[var(--teal,#0d9488)]" : "text-[var(--danger,#ef4444)]"}`}>
										{cashChangeResult.changeRub.toLocaleString("ru-RU")} ₽
									</span>
								</div>
							</div>
						</div>
					)}

					{/* SBP QR SVG Display */}
					{method === "sbp" && sbpQrSvg && (
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col items-center justify-center text-center">
							<div className="p-2 bg-white rounded-xl shadow-xs border border-[var(--line)]" dangerouslySetInnerHTML={{ __html: sbpQrSvg }} />
							<span className="text-xs font-semibold text-[var(--muted)] mt-2">Пациент сканирует камерой смартфона в приложении банка</span>
						</div>
					)}

					{/* Split Allocation Controls */}
					{method === "split" && (
						<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">Распределение:</span>
								<span className={`text-xs font-bold ${splitBalances.isFullyPaid ? "text-[var(--teal,#0d9488)]" : "text-[var(--danger,#ef4444)]"}`}>
									{splitBalances.allocatedRub.toLocaleString("ru-RU")} / {totalDue.toLocaleString("ru-RU")} ₽
								</span>
							</div>
							<div className="grid grid-cols-2 gap-2">
								{[
									{ label: "Картой:", val: splitCardRub, set: setSplitCardRub },
									{ label: "Наличными:", val: splitCashRub, set: setSplitCashRub },
									{ label: "СБП QR:", val: splitSbpRub, set: setSplitSbpRub },
									{ label: `Депозит (макс ${effectiveDepositLimit} ₽):`, val: splitDepositRub, set: (v: number) => setSplitDepositRub(Math.min(effectiveDepositLimit, v)) },
								].map((f) => (
									<div key={f.label}>
										<label className="text-[11px] font-semibold text-[var(--muted)] block mb-0.5">{f.label}</label>
										<input
											type="number" value={f.val} onChange={(e) => f.set(Math.max(0, Number(e.target.value) || 0))}
											className="w-full min-h-[44px] px-2.5 text-sm font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
										/>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Fiscal Check & Delivery Options */}
					<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
						<div className="flex items-center justify-between">
							<label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--ink)]">
								<input type="checkbox" checked={fiscalize} onChange={(e) => setFiscalize(e.target.checked)} className="rounded border-[var(--line)] text-[var(--teal,#0d9488)] w-4 h-4" />
								<span>Чек с фискализацией</span>
							</label>
							<div className="flex gap-1">
								{RECEIPT_PRINT_FORMATS.map((f) => (
									<button
										key={f.id} type="button" onClick={() => setPrintFormat(f.id)}
										className={`min-h-[44px] px-2 py-1 text-[11px] font-semibold rounded-md border ${
											printFormat === f.id
												? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold"
												: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										{f.id === "tape_80mm" ? "80 мм" : f.id === "tape_58mm" ? "58 мм" : "Акт А4"}
									</button>
								))}
							</div>
						</div>
						<div className="flex flex-col sm:flex-row gap-2 pt-1">
							{[
								{ id: "print", testId: "btn-delivery-paper", label: "Печать на кассе", icon: <Printer className="w-4 h-4" /> },
								{ id: "sms", testId: "btn-delivery-sms", label: "SMS", icon: null },
								{ id: "email", testId: "btn-delivery-email", label: "Email", icon: null },
							].map((d) => (
								<button
									key={d.id} type="button" data-testid={d.testId} onClick={() => setReceiptDelivery(d.id as ReceiptDeliveryMethod)}
									className={`flex-1 min-h-[44px] px-2 py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 ${
										receiptDelivery === d.id
											? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold shadow-xs"
											: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
									}`}
								>
									{d.icon}
									<span>{d.label}</span>
								</button>
							))}
						</div>
					</div>

					{/* Feedback Messages */}
					{errorMessage && (
						<div className="p-3 rounded-xl bg-[var(--danger,#ef4444)]/10 border border-[var(--danger,#ef4444)]/30 text-[var(--danger,#ef4444)] text-xs flex items-center gap-2">
							<AlertTriangle className="w-4 h-4 shrink-0" />
							<span>{errorMessage}</span>
						</div>
					)}
					{receiptSuccess && (
						<div className="p-3 rounded-xl bg-[var(--teal,#0d9488)]/10 border border-[var(--teal,#0d9488)]/30 text-[var(--teal,#0d9488)] text-xs flex items-center gap-2 font-semibold">
							<Check className="w-4 h-4 shrink-0" />
							<span>Оплата успешно проведена. Фискальный чек сформирован.</span>
						</div>
					)}
				</div>

				{/* Floating Bottom Bar with Exactly ONE Primary CTA (Mandate 8am & Apple HIG) */}
				<div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper)] flex items-center justify-end gap-3 safe-bottom">
					<button
						type="button" onClick={onClose}
						className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs sm:text-sm font-semibold text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
					>
						Отмена
					</button>
					<button
						type="button" data-testid="btn-confirm-checkout-payment" onClick={handleExecutePayment} disabled={isSubmitting}
						className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
						style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
					>
						<Check className="w-4 h-4" />
						<span data-testid="btn-submit-checkout-54fz">
							{isSubmitting ? "Пробиваем чек..." : isWarranty ? "Оформить по гарантии (0 ₽)" : `Принять оплату (${totalDue.toLocaleString("ru-RU")} ₽)`}
						</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default CashRegisterCheckoutModal;
