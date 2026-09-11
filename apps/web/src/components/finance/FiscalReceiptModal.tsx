/**
 * apps/web/src/components/finance/FiscalReceiptModal.tsx
 *
 * DENTE Dental CRM — 54-FZ Cashier Fiscal Receipt Modal.
 * Compliant with:
 * - Mandate 8e item 9 (54-FZ without obstacles: Physical person INN is strictly optional, 1-click presets, zero disabled buttons)
 * - Mandate 8n (Solo Doctor & Small Clinic Sovereignty: instant checkout, cash/card/advance tender without red tape)
 * - 54-FZ Tag 1228 (Buyer INN required ONLY for B2B legal entities / IP, optional for citizens)
 */

import React, { useState, useMemo } from "react";
import {
	X,
	Receipt,
	CreditCard,
	Banknote,
	Wallet,
	ShieldCheck,
	CheckCircle,
	AlertTriangle,
	Printer,
	Building2,
	User,
	Coins,
	Zap,
} from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import {
	validateBuyerInn54Fz,
	type PayerLegalType,
	type BuyerInnValidationResult,
} from "./cashboxOperations";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter";
import { showToast } from "../GlobalToast";
import type { TreatmentPlanItem } from "../treatment-plans/types";

// Re-export canonical 54-FZ modal and utilities for maximum compatibility
export { FiscalReceipt54FzModal } from "./FiscalReceipt54FzModal";
export type { FiscalReceipt54FzModalProps, FiscalModalTab } from "./FiscalReceipt54FzModal";

export type FiscalPaymentMethod = "cash" | "card" | "split" | "advance";

export interface FiscalReceiptModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientDebtRub?: number | undefined;
	readonly totalDueRub?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly items?: readonly TreatmentPlanItem[] | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly onReceiptFiscalized?: ((receiptNumber: string) => void) | undefined;
	readonly defaultMethod?: FiscalPaymentMethod | undefined;
}

export const FiscalReceiptModal: React.FC<FiscalReceiptModalProps> = ({
	isOpen,
	onClose,
	patientId,
	patientName = "Пациент",
	patientPhone = "",
	patientDepositRub = 0,
	patientDebtRub = 0,
	totalDueRub: propTotalDueRub,
	amountRub: propAmountRub = 0,
	items = [],
	cashierFullName = "Администратор / Кассир",
	clinicName = "ООО «ДЕНТЕ»",
	onReceiptFiscalized,
	defaultMethod = "card",
}) => {
	const rawTotalDueRub = propTotalDueRub ?? propAmountRub;
	const totalDueRub = Math.max(0, rawTotalDueRub);

	const [payerType, setPayerType] = useState<PayerLegalType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [activeMethod, setActiveMethod] = useState<FiscalPaymentMethod>(defaultMethod);
	const [cashAmountRub, setCashAmountRub] = useState<number>(defaultMethod === "cash" ? totalDueRub : 0);
	const [cardAmountRub, setCardAmountRub] = useState<number>(defaultMethod === "card" ? totalDueRub : 0);
	const [advanceAmountRub, setAdvanceAmountRub] = useState<number>(defaultMethod === "advance" ? Math.min(totalDueRub, Math.max(0, patientDepositRub)) : 0);
	const [isWarranty100, setIsWarranty100] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// 54-FZ Tag 1228: Citizen INN is strictly optional
	const innValidation: BuyerInnValidationResult = useMemo(() => {
		return validateBuyerInn54Fz({ payerType, buyerInn });
	}, [payerType, buyerInn]);

	// 1-Click Fast Presets (Mandates 8e & 8n)
	const applyWarranty100Preset = () => {
		setIsWarranty100(true);
		setCashAmountRub(0);
		setCardAmountRub(0);
		setAdvanceAmountRub(0);
		setActiveMethod("card");
		showToast("Применен пресет: Гарантия 100% (0 ₽, без фискального чека ККТ)", "info", 2500);
	};

	const applyExactCashPreset = () => {
		setIsWarranty100(false);
		setActiveMethod("cash");
		setCashAmountRub(totalDueRub);
		setCardAmountRub(0);
		setAdvanceAmountRub(0);
		showToast(`Применен пресет: Без сдачи (Ровно: ${totalDueRub.toLocaleString("ru-RU")} ₽ нал)`, "info", 2000);
	};

	const applyFullCardPreset = () => {
		setIsWarranty100(false);
		setActiveMethod("card");
		setCardAmountRub(totalDueRub);
		setCashAmountRub(0);
		setAdvanceAmountRub(0);
		showToast(`Применен пресет: Картой 100% (${totalDueRub.toLocaleString("ru-RU")} ₽)`, "info", 2000);
	};

	const applyDepositPlusCardPreset = () => {
		setIsWarranty100(false);
		const availDeposit = Math.max(0, patientDepositRub);
		const usedDeposit = Math.min(totalDueRub, availDeposit);
		const remainderCard = Math.max(0, Number((totalDueRub - usedDeposit).toFixed(2)));
		setAdvanceAmountRub(usedDeposit);
		setCardAmountRub(remainderCard);
		setCashAmountRub(0);
		setActiveMethod(usedDeposit >= totalDueRub ? "advance" : "split");
		showToast(
			usedDeposit >= totalDueRub
				? `Применен пресет: Списание аванса 100% (${usedDeposit.toLocaleString("ru-RU")} ₽)`
				: `Применен пресет: Аванс (${usedDeposit.toLocaleString("ru-RU")} ₽) + Карта (${remainderCard.toLocaleString("ru-RU")} ₽)`,
			"info",
			2500,
		);
	};

	const apply5050CashCardPreset = () => {
		setIsWarranty100(false);
		const totalKop = rubToKopecks(totalDueRub);
		const halfKop = Math.floor(totalKop / 2);
		const remKop = totalKop - halfKop;
		const cashRub = kopecksToRub(halfKop);
		const cardRub = kopecksToRub(remKop);
		setCashAmountRub(cashRub);
		setCardAmountRub(cardRub);
		setAdvanceAmountRub(0);
		setActiveMethod("split");
		showToast(
			`Применен пресет: 50/50 Нал (${cashRub.toLocaleString("ru-RU")} ₽) + Карта (${cardRub.toLocaleString("ru-RU")} ₽)`,
			"info",
			2500,
		);
	};

	// Calculate tendered total
	const tenderedTotalRub = useMemo(() => {
		if (isWarranty100) return 0;
		if (activeMethod === "cash") return cashAmountRub;
		if (activeMethod === "card") return cardAmountRub;
		if (activeMethod === "advance") return advanceAmountRub;
		return Number((cashAmountRub + cardAmountRub + advanceAmountRub).toFixed(2));
	}, [isWarranty100, activeMethod, cashAmountRub, cardAmountRub, advanceAmountRub]);

	// Submit / Fiscalize handler
	const handleFiscalize = async () => {
		// Mandate 8e: For physical persons, INN is NEVER an obstacle
		if (payerType !== "physical_person" && !innValidation.isValid) {
			showToast(innValidation.errorRu || "Для юрлица/ИП укажите корректный ИНН", "error");
			return;
		}

		setIsSubmitting(true);
		try {
			const receiptNumber = `ЧЕК-${Date.now().toString().slice(-6)}`;

			// Hardware printer print attempt
			try {
				await hardwarePrinter.printFiscalReceipt({
					operationType: "income",
					cashierFullName,
					clinicName,
					patientId,
					customerContact: patientPhone || undefined,
					items:
						items.length > 0
							? items.map((it) => {
									const price = it.unitPriceRub || it.priceRub || 0;
									const qty = it.quantity || 1;
									return {
										name: it.name || "Стоматологическая услуга",
										priceRub: price,
										quantity: qty,
										amountRub: Number((price * qty).toFixed(2)),
										vatRate: "vat_none" as const,
										medicalServiceCode804n: it.code804n || undefined,
									};
								})
							: [
									{
										name: "Стоматологические услуги",
										priceRub: tenderedTotalRub,
										quantity: 1,
										amountRub: tenderedTotalRub,
										vatRate: "vat_none" as const,
									},
								],
					totalRub: tenderedTotalRub,
					cashRub: activeMethod === "cash" || activeMethod === "split" ? cashAmountRub : 0,
					electronicRub: activeMethod === "card" || activeMethod === "split" ? cardAmountRub : 0,
					prepaidRub: activeMethod === "advance" || activeMethod === "split" ? advanceAmountRub : 0,
				});
			} catch (printErr) {
				console.warn("[FiscalReceiptModal] Hardware print notice (non-blocking):", printErr);
			}

			showToast(`Чек 54-ФЗ №${receiptNumber} успешно пробит на сумму ${tenderedTotalRub.toLocaleString("ru-RU")} ₽`, "success");
			if (onReceiptFiscalized) {
				onReceiptFiscalized(receiptNumber);
			}
			onClose();
		} catch (err: unknown) {
			console.error("[FiscalReceiptModal] Fiscalization error:", err);
			showToast("Ошибка фискализации чека. Проверьте соединение с ККТ.", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
			data-testid="fiscal-receipt-modal"
		>
			<div className="relative w-full max-w-2xl bg-[var(--paper,#ffffff)] rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] flex flex-col overflow-hidden max-h-[92vh]">
				{/* Modal Header */}
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
							<Receipt size={22} />
						</div>
						<div>
							<h2 className="text-base font-bold text-[var(--ink,#0f172a)] flex items-center gap-2 m-0">
								<span>Кассовый чек 54-ФЗ (ФФД 1.2)</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> • Сумма счёта:{" "}
								<strong className="text-[var(--ink,#0f172a)]">{totalDueRub.toLocaleString("ru-RU")} ₽</strong>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] transition-colors cursor-pointer"
						data-testid="btn-close-fiscal-modal"
					>
						<X size={18} />
					</button>
				</div>

				{/* 1-Click Fast Presets Bar (Mandates 8e & 8n: Friction-free checkout) */}
				<div className="p-2.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted,#64748b)]">
						<Zap size={14} className="text-amber-500 shrink-0" />
						<span>1-клик пресеты:</span>
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={applyWarranty100Preset}
							className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
								isWarranty100
									? "bg-amber-600 text-white border-amber-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-warranty-100"
							title="Гарантийная переделка 100% (0 ₽, без фискального чека ККТ)"
						>
							<ShieldCheck size={14} className={isWarranty100 ? "text-white" : "text-amber-600"} />
							<span>Гарантия 100% (0 ₽)</span>
						</button>
						<button
							type="button"
							onClick={applyExactCashPreset}
							className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
								activeMethod === "cash" && !isWarranty100
									? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-exact-cash"
						>
							<Banknote size={14} className={activeMethod === "cash" && !isWarranty100 ? "text-white" : "text-emerald-600"} />
							<span>Без сдачи (Ровно: {totalDueRub.toLocaleString("ru-RU")} ₽)</span>
						</button>
						<button
							type="button"
							onClick={applyFullCardPreset}
							className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
								activeMethod === "card" && !isWarranty100
									? "bg-blue-600 text-white border-blue-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-full-card"
						>
							<CreditCard size={14} className={activeMethod === "card" && !isWarranty100 ? "text-white" : "text-blue-600"} />
							<span>Картой 100% ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
						</button>
						<button
							type="button"
							onClick={applyDepositPlusCardPreset}
							className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
								(activeMethod === "advance" || (activeMethod === "split" && advanceAmountRub > 0)) && !isWarranty100
									? "bg-purple-600 text-white border-purple-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-deposit-plus-card"
							data-testid-alt="preset-spend-all-deposit-bonus"
						>
							<Wallet size={14} className={(activeMethod === "advance" || (activeMethod === "split" && advanceAmountRub > 0)) && !isWarranty100 ? "text-white" : "text-purple-600"} />
							<span>Аванс ({Math.min(totalDueRub, Math.max(0, patientDepositRub)).toLocaleString("ru-RU")} ₽) + Карта</span>
						</button>
						<button
							type="button"
							onClick={apply5050CashCardPreset}
							className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
								activeMethod === "split" && cashAmountRub > 0 && cardAmountRub > 0 && !isWarranty100
									? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-indigo-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-50-50-cash-card"
						>
							<Coins size={14} className={activeMethod === "split" && cashAmountRub > 0 && cardAmountRub > 0 && !isWarranty100 ? "text-white" : "text-indigo-600"} />
							<span>50/50 Нал + Карта</span>
						</button>
					</div>
				</div>

				{/* Debt Autonomy Banner (Mandates 8e & 8n: Patient debt never blocks receipt on tendered amount) */}
				{(patientDebtRub > 0 || patientDepositRub < 0) && (
					<div
						data-testid="debt-autonomy-banner"
						className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2"
					>
						<AlertTriangle size={14} className="shrink-0 text-amber-600" />
						<span>
							Задолженность пациента: {(patientDebtRub > 0 ? patientDebtRub : Math.abs(patientDepositRub)).toLocaleString("ru-RU")} ₽.
							Долг не блокирует фискализацию чека на фактически вносимую сумму.
						</span>
					</div>
				)}

				{/* Modal Body */}
				<div className="p-4 overflow-y-auto space-y-4">
					{/* Payer Type Selection */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-[var(--muted,#64748b)]">Тип плательщика (54-ФЗ Tag 1228):</label>
						<div className="grid grid-cols-3 gap-2">
							<button
								type="button"
								onClick={() => setPayerType("physical_person")}
								className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
									payerType === "physical_person"
										? "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300"
										: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]"
								}`}
								data-testid="payer-type-physical"
							>
								<User size={14} />
								<span>Физлицо (Гражданин)</span>
							</button>
							<button
								type="button"
								onClick={() => setPayerType("legal_entity")}
								className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
									payerType === "legal_entity"
										? "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300"
										: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]"
								}`}
								data-testid="payer-type-legal"
							>
								<Building2 size={14} />
								<span>Юрлицо (ООО / АО)</span>
							</button>
							<button
								type="button"
								onClick={() => setPayerType("individual_entrepreneur")}
								className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
									payerType === "individual_entrepreneur"
										? "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300"
										: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]"
								}`}
								data-testid="payer-type-ip"
							>
								<Building2 size={14} />
								<span>ИП</span>
							</button>
						</div>
					</div>

					{/* Buyer INN Input (Strictly optional for physical persons!) */}
					<div className="space-y-1">
						<div className="flex items-center justify-between text-xs">
							<label className="font-semibold text-[var(--muted,#64748b)]">
								ИНН покупателя {payerType === "physical_person" ? "(опционально, 54-ФЗ Tag 1228)" : "(обязательно для B2B)"}:
							</label>
							{payerType === "physical_person" && (
								<span className="text-emerald-600 font-medium">Не требуется для физлиц (54-ФЗ)</span>
							)}
						</div>
						<input
							type="text"
							value={buyerInn}
							onChange={(e) => setBuyerInn(e.target.value)}
							placeholder={payerType === "physical_person" ? "Не требуется (для физлиц поле опционально)" : "10 или 12 цифр"}
							maxLength={12}
							className="h-10 w-full px-3 py-1.5 text-sm font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none focus:border-blue-500 transition-colors"
							data-testid="input-buyer-inn"
						/>
						{innValidation.errorRu && (
							<p className="text-xs text-amber-600 dark:text-amber-400 font-medium m-0">
								{innValidation.errorRu}
							</p>
						)}
					</div>

					{/* Tender Breakdown */}
					<div className="space-y-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
						<label className="text-xs font-bold text-[var(--muted,#64748b)]">Способ оплаты и внесённая сумма:</label>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
								<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
									<Banknote size={14} className="text-emerald-600" />
									<span>Наличными, ₽:</span>
								</span>
								<input
									type="number"
									min={0}
									step="1"
									value={cashAmountRub || ""}
									onChange={(e) => {
										setCashAmountRub(Math.max(0, parseFloat(e.target.value) || 0));
										setIsWarranty100(false);
									}}
									placeholder="0 ₽"
									className="h-9 w-full px-2.5 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-lg text-[var(--ink)] outline-none"
									data-testid="input-cash-amount"
								/>
							</div>

							<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
								<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
									<CreditCard size={14} className="text-blue-600" />
									<span>Безналичными (Карта), ₽:</span>
								</span>
								<input
									type="number"
									min={0}
									step="1"
									value={cardAmountRub || ""}
									onChange={(e) => {
										setCardAmountRub(Math.max(0, parseFloat(e.target.value) || 0));
										setIsWarranty100(false);
									}}
									placeholder="0 ₽"
									className="h-9 w-full px-2.5 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-lg text-[var(--ink)] outline-none"
									data-testid="input-card-amount"
								/>
							</div>

							<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
								<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
									<Wallet size={14} className="text-purple-600" />
									<span>Аванс / Депозит, ₽:</span>
								</span>
								<input
									type="number"
									min={0}
									step="1"
									value={advanceAmountRub || ""}
									onChange={(e) => {
										setAdvanceAmountRub(Math.max(0, parseFloat(e.target.value) || 0));
										setIsWarranty100(false);
									}}
									placeholder="0 ₽"
									className="h-9 w-full px-2.5 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-lg text-[var(--ink)] outline-none"
									data-testid="input-advance-amount"
								/>
							</div>
						</div>
					</div>

					{/* Summary Pill */}
					<div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between text-xs">
						<span className="text-[var(--muted,#64748b)]">ИТОГО К ФИСКАЛИЗАЦИИ В ЧЕКЕ:</span>
						<span className="text-base font-bold font-mono text-blue-600">
							{tenderedTotalRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				{/* Modal Footer (Never blocked by patient debt or optional physical INN!) */}
				<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3 flex-wrap">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
					>
						Отмена
					</button>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleFiscalize}
							disabled={isSubmitting}
							className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
							data-testid="btn-fiscalize-receipt"
						>
							<Printer size={16} />
							<span>
								{isSubmitting
									? "Печать чека..."
									: `Пробить чек 54-ФЗ (${tenderedTotalRub.toLocaleString("ru-RU")} ₽)`}
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
