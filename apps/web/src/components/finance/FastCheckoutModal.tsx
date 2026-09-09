/**
 * apps/web/src/components/finance/FastCheckoutModal.tsx
 *
 * DENTE Dental CRM — Express 54-FZ Cashier & Fiscal Checkout Modal.
 * Mobile-First 390px Apple HIG Ergonomics & Zero-Friction Cashier Autonomy.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (No unjustified button disables, no INN demand for B2C).
 * - Mandate 8b: Integer kopeck-exact calculations (No float desync in split tenders).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Zero dead-ends, smooth checkout).
 * - Studio Clinical HIG: Touch targets >= 44px mobile / >= 36px desktop, 0 emojis, WCAG AAA.
 */

import React, { useState, useMemo, useEffect } from "react";
import {
	X,
	CreditCard,
	Banknote,
	QrCode,
	Coins,
	ShieldCheck,
	Sparkles,
	CheckCircle,
	CheckCircle2,
	AlertCircle,
	AlertTriangle,
	Building2,
	User,
	FileText,
	Users,
	Zap,
	Layers,
	Printer,
	ChevronDown,
} from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import {
	calculateCashChange,
	validate54FzBuyerInn,
	type PayerType,
} from "./cashboxOperations.js";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";

export type FastCheckoutPaymentMethod =
	| "card_terminal"
	| "cash"
	| "sbp_qr"
	| "deposit"
	| "family_deposit"
	| "split"
	| "warranty_100";

export interface FastCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly patientDebtRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly totalBillKop?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly amountKopecks?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly initialPaymentMethod?: FastCheckoutPaymentMethod | string | undefined;
	readonly cashierName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly orderId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly onPaymentComplete?: ((payload: Record<string, unknown>) => void) | undefined;
	readonly onSuccess?: ((payload: Record<string, unknown>) => void) | undefined;
}

export const FastCheckoutModal: React.FC<FastCheckoutModalProps> = ({
	isOpen,
	onClose,
	patientId = "00000000-0000-0000-0000-000000000001",
	patientName = "Смирнова Екатерина Васильевна",
	patientPhone = "+7 (999) 123-45-67",
	patientEmail = "patient@example.com",
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	patientDebtRub = 0,
	familyPayerName = "Глава семьи",
	totalBillKop,
	totalBillRub: propTotalBillRub,
	amountKopecks,
	amountRub: propAmountRub,
	initialPaymentMethod = "card_terminal",
	cashierName,
	doctorName,
	clinicLegalName = "ООО «ДЕНТЕ»",
	orderId,
	invoiceId,
	visitId,
	documentId,
	onPaymentComplete,
	onSuccess,
}) => {
	// Solo Doctor & Cashier Autonomy: fallback to doctor name or default solo clinic (Mandates 8e & 8n)
	const effectiveCashier = (cashierName || "").trim() || (doctorName || "").trim() || "Врач-стоматолог";

	// Compute raw total bill in kopecks & rubles
	const rawTotalKop = useMemo(() => {
		if (totalBillKop !== undefined && totalBillKop > 0) return totalBillKop;
		if (amountKopecks !== undefined && amountKopecks > 0) return amountKopecks;
		if (propTotalBillRub !== undefined && propTotalBillRub > 0) return rubToKopecks(propTotalBillRub);
		if (propAmountRub !== undefined && propAmountRub > 0) return rubToKopecks(propAmountRub);
		return 1500000; // Default 15 000 ₽ for checkout preview
	}, [totalBillKop, amountKopecks, propTotalBillRub, propAmountRub]);

	const rawTotalRub = useMemo(() => kopecksToRub(rawTotalKop), [rawTotalKop]);

	// 100% Warranty discount toggle (Doctor Autonomy Mandate 8e Item 7)
	const [isWarranty100, setIsWarranty100] = useState<boolean>(false);

	const effectiveTotalKop = isWarranty100 ? 0 : rawTotalKop;
	const effectiveTotalRub = isWarranty100 ? 0 : rawTotalRub;

	// Active payment method
	const [activeMethod, setActiveMethod] = useState<FastCheckoutPaymentMethod>(
		(initialPaymentMethod as FastCheckoutPaymentMethod) || "card_terminal"
	);

	// Multi-tender split state in Rubles
	const [splitCardRub, setSplitCardRub] = useState<number>(rawTotalRub);
	const [splitCashRub, setSplitCashRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);

	// Cash tender state
	const [receivedCashRub, setReceivedCashRub] = useState<number>(rawTotalRub);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// 54-FZ Buyer Details & Cashier Autonomy state (Mandates 8e & 8n)
	const [payerType, setPayerType] = useState<PayerType>("physical");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [buyerInnError, setBuyerInnError] = useState<string | null>(null);

	// Synchronize defaults on open or amount change
	useEffect(() => {
		if (isOpen) {
			setIsWarranty100(false);
			setReceivedCashRub(rawTotalRub);
			setSplitCardRub(rawTotalRub);
			setSplitCashRub(0);
			setSplitDepositRub(0);
			setSplitSbpRub(0);
		}
	}, [isOpen, rawTotalRub]);

	// Kopeck-exact change calculation using cashboxOperations
	const cashChange = useMemo(() => {
		const tenderTargetRub = activeMethod === "split" ? splitCashRub : effectiveTotalRub;
		return calculateCashChange(tenderTargetRub, receivedCashRub);
	}, [activeMethod, splitCashRub, effectiveTotalRub, receivedCashRub]);

	// Handle INN input changes
	const handleInnChange = (value: string) => {
		const cleaned = value.replace(/\D/g, "").slice(0, 12);
		setBuyerInn(cleaned);
		if (cleaned.length > 0) {
			const validation = validate54FzBuyerInn(cleaned, payerType);
			if (!validation.isValid) {
				setBuyerInnError(validation.errorMessage || "Некорректный ИНН");
			} else {
				setBuyerInnError(null);
			}
		} else {
			setBuyerInnError(null);
		}
	};

	// 1-Click Quick Tender Presets (Mandates 8e, 8b, 8n)
	const handlePreset100Card = () => {
		setIsWarranty100(false);
		setActiveMethod("card_terminal");
		setSplitCardRub(rawTotalRub);
		setSplitCashRub(0);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		showToast(`Применен пресет: Картой 100% (${rawTotalRub.toLocaleString("ru-RU")} ₽)`, "info", 2000);
	};

	const handlePreset100Cash = () => {
		setIsWarranty100(false);
		setActiveMethod("cash");
		setReceivedCashRub(rawTotalRub);
		setSplitCashRub(rawTotalRub);
		setSplitCardRub(0);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		showToast(`Применен пресет: Без сдачи (Нал 100%: ${rawTotalRub.toLocaleString("ru-RU")} ₽)`, "info", 2000);
	};

	const handlePreset100Sbp = () => {
		setIsWarranty100(false);
		setActiveMethod("sbp_qr");
		setSplitSbpRub(rawTotalRub);
		setSplitCardRub(0);
		setSplitCashRub(0);
		setSplitDepositRub(0);
		showToast(`Применен пресет: СБП QR 100% (${rawTotalRub.toLocaleString("ru-RU")} ₽)`, "info", 2000);
	};

	const handlePresetUseDeposit = () => {
		setIsWarranty100(false);
		const totalKop = rubToKopecks(rawTotalRub);
		const maxAvailRub = Math.max(patientDepositRub > 0 ? patientDepositRub : 0, patientFamilyBalanceRub > 0 ? patientFamilyBalanceRub : 0);
		const availKop = rubToKopecks(maxAvailRub);
		const depositKop = Math.min(totalKop, availKop);
		const remKop = Math.max(0, totalKop - depositKop);
		const usedDepRub = kopecksToRub(depositKop);
		const remRub = kopecksToRub(remKop);

		setSplitDepositRub(usedDepRub);
		setSplitCardRub(remRub);
		setSplitCashRub(0);
		setSplitSbpRub(0);
		setActiveMethod("split");
		showToast(`Применен пресет: Аванс ${usedDepRub.toLocaleString("ru-RU")} ₽ + Карта ${remRub.toLocaleString("ru-RU")} ₽`, "info", 2500);
	};

	const handlePresetSplit5050 = () => {
		setIsWarranty100(false);
		const totalKop = rubToKopecks(rawTotalRub);
		const halfKop = Math.floor(totalKop / 2);
		const remKop = totalKop - halfKop;
		const cashRub = kopecksToRub(halfKop);
		const cardRub = kopecksToRub(remKop);

		setSplitCashRub(cashRub);
		setSplitCardRub(cardRub);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		setReceivedCashRub(cashRub);
		setActiveMethod("split");
		showToast(`Применен пресет: 50% Карта (${cardRub.toLocaleString("ru-RU")} ₽) + 50% Нал (${cashRub.toLocaleString("ru-RU")} ₽)`, "info", 2500);
	};

	const handlePresetSplitThreeWay = () => {
		setIsWarranty100(false);
		const totalKop = rubToKopecks(rawTotalRub);
		const maxAvailRub = Math.max(patientDepositRub > 0 ? patientDepositRub : 0, patientFamilyBalanceRub > 0 ? patientFamilyBalanceRub : 0);
		const availKop = rubToKopecks(maxAvailRub);
		const depositKop = Math.min(totalKop, availKop);
		const remKop = Math.max(0, totalKop - depositKop);
		const halfRemKop = Math.floor(remKop / 2);
		const cashKop = halfRemKop;
		const cardKop = remKop - halfRemKop;

		const usedDepRub = kopecksToRub(depositKop);
		const usedCashRub = kopecksToRub(cashKop);
		const usedCardRub = kopecksToRub(cardKop);

		setSplitDepositRub(usedDepRub);
		setSplitCashRub(usedCashRub);
		setSplitCardRub(usedCardRub);
		setSplitSbpRub(0);
		setReceivedCashRub(usedCashRub);
		setActiveMethod("split");
		showToast(`Применен пресет: Аванс ${usedDepRub.toLocaleString("ru-RU")} ₽ + Нал ${usedCashRub.toLocaleString("ru-RU")} ₽ + Карта ${usedCardRub.toLocaleString("ru-RU")} ₽`, "info", 2500);
	};

	const handlePresetWarranty100 = () => {
		setIsWarranty100(true);
		setActiveMethod("warranty_100");
		setSplitCardRub(0);
		setSplitCashRub(0);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		setReceivedCashRub(0);
		showToast("Применена скидка 100% (Гарантийная переделка • 0 ₽)", "info", 2500);
	};

	// Final Checkout Submission
	const handleExecutePayment = async () => {
		setIsSubmitting(true);
		try {
			const clientMutationId = `chk:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const effectiveMethod = isWarranty100
				? "warranty_100"
				: activeMethod === "split"
					? splitCashRub > splitCardRub ? "cash" : "card"
					: activeMethod;

			const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
			const payload = {
				patientId,
				amountRub: effectiveTotalRub,
				method: effectiveMethod,
				visitId: visitId || null,
				documentId: documentId || (invoiceId ? invoiceId : null),
				orderId: orderId || null,
				clientMutationId,
				note: `Быстрый расчет 54-ФЗ (${effectiveCashier}): ${effectiveMethod}${innNote}`,
			};

			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			const responseData = (await res.json().catch(() => ({}))) as Record<string, unknown>;

			if (!res.ok) {
				const errorMsg =
					(responseData && typeof responseData.message === "string" && responseData.message) ||
					`Ошибка оформления чека: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				return;
			}

			showToast(`Чек на сумму ${effectiveTotalRub.toLocaleString("ru-RU")} ₽ успешно оформлен (${effectiveCashier})`, "success");

			const resultPayload = {
				method: effectiveMethod,
				amountKopecks: effectiveTotalKop,
				changeKopecks: cashChange.changeKopecks,
				...responseData,
			};

			if (onPaymentComplete) onPaymentComplete(resultPayload);
			if (onSuccess) onSuccess(resultPayload);
			onClose();
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : "Сбой соединения при оформлении чека";
			showToast(errorMsg, "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
			role="dialog"
			aria-modal="true"
			data-testid="fast-checkout-modal-backdrop"
		>
			<div
				className="w-full max-w-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-150"
				data-testid="fast-checkout-modal-window"
			>
				{/* Header Toolbar (Single row 32-36px, zero clutter) */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] min-w-0">
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
							<Zap size={18} />
						</div>
						<div className="min-w-0">
							<h2 className="text-sm font-black m-0 truncate tracking-tight text-[var(--ink,#0f172a)]">
								Быстрый расчет 54-ФЗ
							</h2>
							<p className="text-[11px] text-[var(--muted,#64748b)] m-0 truncate">
								{patientName} • {effectiveCashier}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center cursor-pointer transition-colors"
						aria-label="Закрыть окно расчета"
						data-testid="btn-close-fast-checkout"
					>
						<X size={18} />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-3 sm:p-4 space-y-3.5 overflow-y-auto max-h-[80vh]">
					{/* Total Amount Due Banner (Touch target friendly, wrap safe) */}
					<div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 flex-wrap min-w-0">
						<div className="min-w-0">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
								Итого к оплате:
							</span>
							<span
								className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 dark:text-emerald-300 truncate block"
								data-testid="checkout-total-bill-amount"
							>
								{isWarranty100 ? "0 ₽" : `${rawTotalRub.toLocaleString("ru-RU")} ₽`}
							</span>
						</div>
						{isWarranty100 ? (
							<span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-bold shrink-0">
								100% Гарантия
							</span>
						) : (
							<div className="text-right text-[11px] text-[var(--muted,#64748b)] shrink-0 min-w-0">
								<div>Без НДС (пп. 2 п. 2 ст. 149 НК РФ)</div>
								<div className="text-emerald-700 dark:text-emerald-400 font-semibold">Чек 54-ФЗ готов к фискализации</div>
							</div>
						)}
					</div>

					{/* 1-Click Fast Presets Ribbon (Mandates 8e & 8k: Zero Friction) */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
							<span className="flex items-center gap-1">
								<Sparkles size={12} className="text-amber-500" />
								<span>Пресеты в 1 клик (Мандат 8e):</span>
							</span>
							<span className="text-[10px] text-emerald-600 font-semibold">Без лишних шагов</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
							<button
								type="button"
								onClick={handlePreset100Card}
								className={`min-h-[44px] sm:min-h-[36px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate ${
									activeMethod === "card_terminal" && !isWarranty100
										? "bg-blue-600 text-white border-blue-600"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="btn-checkout-100-card"
								title="Оплатить 100% банковской картой"
							>
								<CreditCard size={14} className={activeMethod === "card_terminal" && !isWarranty100 ? "text-white" : "text-blue-600"} />
								<span className="truncate">Картой 100%</span>
							</button>

							<button
								type="button"
								onClick={handlePreset100Cash}
								className={`min-h-[44px] sm:min-h-[36px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate ${
									activeMethod === "cash" && !isWarranty100
										? "bg-emerald-600 text-white border-emerald-600"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="btn-checkout-100-cash"
								title="Оплатить 100% наличными ровно в кассу без сдачи"
							>
								<Banknote size={14} className={activeMethod === "cash" && !isWarranty100 ? "text-white" : "text-emerald-600"} />
								<span className="truncate">Без сдачи (Нал 100%)</span>
							</button>

							<button
								type="button"
								onClick={handlePreset100Sbp}
								className={`min-h-[44px] sm:min-h-[36px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate ${
									activeMethod === "sbp_qr" && !isWarranty100
										? "bg-teal-600 text-white border-teal-600"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="btn-checkout-100-sbp"
								title="Оплатить 100% по СБП QR"
							>
								<QrCode size={14} className={activeMethod === "sbp_qr" && !isWarranty100 ? "text-white" : "text-teal-600"} />
								<span className="truncate">СБП QR 100%</span>
							</button>

							<button
								type="button"
								onClick={handlePresetUseDeposit}
								className={`min-h-[44px] sm:min-h-[36px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate ${
									activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0 && !isWarranty100
										? "bg-purple-600 text-white border-purple-600"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="btn-checkout-use-deposit"
								title="Списать аванс пациента с доплатой картой"
							>
								<Coins size={14} className={activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0 && !isWarranty100 ? "text-white" : "text-purple-600"} />
								<span className="truncate">Аванс + Карта</span>
							</button>

							<button
								type="button"
								onClick={handlePresetSplit5050}
								className={`min-h-[44px] sm:min-h-[36px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate ${
									activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 && splitDepositRub === 0 && !isWarranty100
										? "bg-indigo-600 text-white border-indigo-600"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-indigo-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="btn-checkout-split-50-50"
								title="Разделить 50/50: половина картой, половина наличными"
							>
								<Layers size={14} className={activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 && splitDepositRub === 0 && !isWarranty100 ? "text-white" : "text-indigo-600"} />
								<span className="truncate">50% Карта + 50% Нал</span>
							</button>

							<button
								type="button"
								onClick={handlePresetSplitThreeWay}
								className={`min-h-[44px] sm:min-h-[36px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate ${
									activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 && splitDepositRub > 0 && !isWarranty100
										? "bg-teal-600 text-white border-teal-600"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="btn-checkout-split-three-way"
								title={`Комбинированная оплата в 1 клик: Аванс родственника (${familyPayerName}) + 50% Карта + 50% Нал`}
							>
								<Users size={14} className={activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 && splitDepositRub > 0 && !isWarranty100 ? "text-white" : "text-teal-600"} />
								<span className="truncate">Нал + Карта + Аванс</span>
							</button>

							<button
								type="button"
								onClick={handlePresetWarranty100}
								className={`min-h-[44px] sm:min-h-[36px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate col-span-2 ${
									isWarranty100
										? "bg-emerald-700 text-white border-emerald-700"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="btn-checkout-warranty-100"
								title="100% гарантийная переделка (к оплате 0 ₽, без паролей и блокировок)"
							>
								<ShieldCheck size={14} className={isWarranty100 ? "text-white" : "text-emerald-600"} />
								<span className="truncate">100% Гарантия (0 ₽)</span>
							</button>
						</div>
					</div>

					{/* 54-FZ Buyer INN Section (Mandates 8e & 8n: B2C Citizen INN is strictly optional) */}
					<div
						className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2"
						data-testid="payer-type-section"
					>
						<div className="flex items-center justify-between flex-wrap gap-2">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
								<Building2 size={12} className="text-indigo-600" />
								<span>Реквизиты покупателя 54-ФЗ:</span>
							</span>
							<div className="flex items-center gap-1 p-0.5 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg">
								<button
									type="button"
									onClick={() => setPayerType("physical")}
									className={`min-h-[44px] sm:min-h-[30px] px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										payerType === "physical"
											? "bg-emerald-600 text-white shadow-2xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
									data-testid="tab-payer-physical"
								>
									<User size={12} />
									<span>Физлицо</span>
								</button>
								<button
									type="button"
									onClick={() => setPayerType("legal_entity")}
									className={`min-h-[44px] sm:min-h-[30px] px-2.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										payerType === "legal_entity"
											? "bg-indigo-600 text-white shadow-2xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
									data-testid="tab-payer-legal"
								>
									<Building2 size={12} />
									<span>Юрлицо / ИП</span>
								</button>
							</div>
						</div>

						{payerType === "physical" ? (
							<div className="space-y-1">
								<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
									<span className="flex items-center gap-1">
										<FileText size={12} className="text-emerald-600" />
										<span>ИНН пациента (для вычета НДФЛ):</span>
									</span>
									<span
										className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium"
										data-testid="inn-physical-not-required-badge"
									>
										По 54-ФЗ для физлиц не требуется
									</span>
								</div>
								<div className="relative">
									<input
										type="text"
										value={buyerInn}
										onChange={(e) => handleInnChange(e.target.value)}
										placeholder="Необязательно (12 цифр для справки в налоговую)"
										maxLength={12}
										className="min-h-[44px] sm:min-h-[34px] w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-emerald-500"
										data-testid="input-buyer-inn-physical"
									/>
									{buyerInn && (
										<span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-[var(--muted,#64748b)]">
											{buyerInn.length}/12
										</span>
									)}
								</div>
								{buyerInnError && (
									<p className="text-[10px] text-amber-600 dark:text-amber-400 m-0 flex items-center gap-1">
										<AlertCircle size={10} />
										<span>{buyerInnError} (оплата не блокируется)</span>
									</p>
								)}
							</div>
						) : (
							<div className="space-y-1">
								<div className="flex items-center justify-between text-[11px] font-bold text-[var(--ink,#0f172a)]">
									<span>ИНН юрлица / ИП (10 или 12 цифр):</span>
									<span className="text-[10px] text-indigo-600 font-bold">* По 54-ФЗ</span>
								</div>
								<div className="relative">
									<input
										type="text"
										value={buyerInn}
										onChange={(e) => handleInnChange(e.target.value)}
										placeholder="10 цифр (ООО) или 12 цифр (ИП)"
										maxLength={12}
										className={`min-h-[44px] sm:min-h-[34px] w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border rounded-lg text-[var(--ink,#0f172a)] outline-none ${
											buyerInnError
												? "border-rose-500 focus:border-rose-600"
												: "border-[var(--line,#e2e8f0)] focus:border-indigo-500"
										}`}
										data-testid="input-buyer-inn-legal"
									/>
								</div>
								{buyerInnError ? (
									<p className="text-[10px] text-rose-600 dark:text-rose-400 m-0 flex items-center gap-1">
										<AlertCircle size={10} />
										<span>{buyerInnError}</span>
									</p>
								) : buyerInn.length === 10 || buyerInn.length === 12 ? (
									<p className="text-[10px] text-emerald-600 dark:text-emerald-400 m-0 flex items-center gap-1">
										<CheckCircle2 size={10} />
										<span>ИНН валиден по 54-ФЗ</span>
									</p>
								) : null}
							</div>
						)}
					</div>

					{/* Cash Tender Presets and Change Calculator */}
					{(activeMethod === "cash" || (activeMethod === "split" && splitCashRub > 0)) && (
						<div
							className="p-3.5 rounded-xl border border-emerald-500/30 bg-[var(--paper-soft,#f8fafc)] space-y-2.5"
							data-testid="checkout-cash-tender-box"
						>
							<div className="flex items-center justify-between text-xs font-semibold text-[var(--muted,#64748b)]">
								<span className="flex items-center gap-1 text-[var(--ink,#0f172a)] font-bold">
									<Banknote size={15} className="text-emerald-600" />
									<span>Внесение наличных в кассу:</span>
								</span>
								<button
									type="button"
									onClick={() => setReceivedCashRub(0)}
									className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
									data-testid="btn-cash-reset"
								>
									Сброс (0 ₽)
								</button>
							</div>

							<div className="flex items-center gap-2">
								<input
									type="number"
									min={0}
									step="1"
									value={receivedCashRub || ""}
									onChange={(e) => setReceivedCashRub(Math.max(0, parseFloat(e.target.value) || 0))}
									placeholder="0 ₽"
									className="min-h-[44px] sm:min-h-[38px] w-full px-3 text-base font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink,#0f172a)] outline-none focus:border-emerald-500"
									data-testid="input-cash-received"
								/>
								<button
									type="button"
									onClick={() => setReceivedCashRub(activeMethod === "split" ? splitCashRub : effectiveTotalRub)}
									className="min-h-[44px] sm:min-h-[38px] px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold shrink-0 hover:bg-emerald-100 cursor-pointer flex items-center gap-1 transition-all active:scale-95"
									data-testid="btn-cash-exact-rounded"
								>
									<Coins size={14} />
									<span>Ровно</span>
								</button>
							</div>

							{/* Direct Denomination Bill Buttons */}
							<div className="grid grid-cols-5 gap-1 pt-1">
								<button
									type="button"
									onClick={() => setReceivedCashRub(activeMethod === "split" ? splitCashRub : effectiveTotalRub)}
									className="min-h-[44px] sm:min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 truncate"
									data-testid="btn-cash-exact"
									title="Внесено ровно без сдачи"
								>
									Без сдачи
								</button>
								<button
									type="button"
									onClick={() => setReceivedCashRub(1000)}
									className="min-h-[44px] sm:min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
									data-testid="btn-cash-1000"
								>
									1 000 ₽
								</button>
								<button
									type="button"
									onClick={() => setReceivedCashRub(2000)}
									className="min-h-[44px] sm:min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
									data-testid="btn-cash-2000"
								>
									2 000 ₽
								</button>
								<button
									type="button"
									onClick={() => setReceivedCashRub(5000)}
									className="min-h-[44px] sm:min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
									data-testid="btn-cash-5000"
								>
									5 000 ₽
								</button>
								<button
									type="button"
									onClick={() => setReceivedCashRub(10000)}
									className="min-h-[44px] sm:min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
									data-testid="btn-cash-10000"
								>
									10 000 ₽
								</button>
							</div>

							{/* Incremental Tender Buttons */}
							<div className="grid grid-cols-3 gap-1 pt-0.5">
								<button
									type="button"
									onClick={() => setReceivedCashRub((prev) => prev + 1000)}
									className="min-h-[44px] sm:min-h-[34px] rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 cursor-pointer transition-all active:scale-95 font-mono truncate"
									data-testid="btn-cash-add-1000"
								>
									+1 000 ₽
								</button>
								<button
									type="button"
									onClick={() => setReceivedCashRub((prev) => prev + 2000)}
									className="min-h-[44px] sm:min-h-[34px] rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 cursor-pointer transition-all active:scale-95 font-mono truncate"
									data-testid="btn-cash-add-2000"
								>
									+2 000 ₽
								</button>
								<button
									type="button"
									onClick={() => setReceivedCashRub((prev) => prev + 5000)}
									className="min-h-[44px] sm:min-h-[34px] rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 cursor-pointer transition-all active:scale-95 font-mono truncate"
									data-testid="btn-cash-add-5000"
								>
									+5 000 ₽
								</button>
							</div>

							{/* Change Calculation Box */}
							{cashChange.changeRub > 0 ? (
								<div
									className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs min-w-0"
									data-testid="cash-change-display"
								>
									<span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 truncate">
										<CheckCircle size={14} className="shrink-0" />
										<span>Сдача пациенту (копейка-в-копейку):</span>
									</span>
									<span className="font-extrabold font-mono text-sm text-emerald-700 dark:text-emerald-300 shrink-0" data-testid="cash-change-amount">
										{cashChange.changeRub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
									</span>
								</div>
							) : cashChange.isExact ? (
								<div
									className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5"
									data-testid="cash-exact-display"
								>
									<CheckCircle2 size={14} className="shrink-0" />
									<span>Внесено ровно в кассу без сдачи</span>
								</div>
							) : cashChange.shortageKopecks > 0 ? (
								<div
									className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-1.5"
									data-testid="cash-shortage-display"
								>
									<span className="flex items-center gap-1.5">
										<AlertTriangle size={14} className="shrink-0" />
										<span>Не хватает до полной суммы:</span>
									</span>
									<span className="font-mono font-bold">
										{(cashChange.shortageKopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</span>
								</div>
							) : null}
						</div>
					)}
				</div>

				{/* Footer Controls (Apple HIG touch target >= 44px, wrap safe) */}
				<div className="p-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-2 flex-wrap min-w-0">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] cursor-pointer transition-colors"
						data-testid="btn-cancel-fast-checkout"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleExecutePayment}
						disabled={isSubmitting}
						className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
						data-testid="btn-submit-fast-checkout"
					>
						<Zap size={16} />
						<span>
							{isSubmitting
								? "Фискализация чека..."
								: isWarranty100
									? "Оформить гарантию (0 ₽)"
									: `Пробить чек 54-ФЗ (${effectiveTotalRub.toLocaleString("ru-RU")} ₽)`}
						</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default FastCheckoutModal;
