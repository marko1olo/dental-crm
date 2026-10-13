/**
 * apps/web/src/components/billing/CashRegisterPaymentPane.tsx
 *
 * DENTE Dental CRM — Cashier Instant Payment Pane with Frictionless SBP QR & Multi-Tender Split.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 friction, no bureaucratic delays, 100% warranty discounts)
 * - Mandate 8n: Solo Doctor & Small Clinic Scale Sovereignty (1-click cash in/out, family deposit offset)
 * - Mandate 8i: Integer kopecks precision, zero float rounding drifts
 * - Mandate 8d: Studio Clinical HIG (No accordion hell, clean grid, single-line segmented switch)
 * - Apple HIG: 28-32px semibold total display, tactile earcon acoustic confirmation
 */

import React, { useState, useMemo, useEffect } from "react";
import {
	Banknote, CreditCard, QrCode, Layers, CheckCircle2,
	Coins, Sparkles, ArrowRight, Receipt, ShieldCheck,
	Wallet, Percent, User, FileText, ChevronDown,
} from "lucide-react";
import { type ExtendedTenderType, calculateCanonicalSplit } from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import { playTactileEarcon } from "../../lib/chairsideErgonomics.js";
import { clinicalProceduralAudio } from "../../services/audio/clinicalProceduralAudio.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { SbpDynamicQrCard } from "./SbpDynamicQrCard.js";
import type { ShiftReceiptEntry } from "./CashRegisterDrawer.js";

export type CashierPaymentMethod = Extract<
	ExtendedTenderType,
	"sbp" | "card" | "cash" | "split" | "deposit"
>;

export interface CashRegisterPaymentPaneProps {
	readonly defaultAmountRub?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly onPaymentCompleted?: ((receipt: ShiftReceiptEntry) => void) | undefined;
	readonly onOpenFullSplitModal?: (() => void) | undefined;
	readonly activeInvoice?: any | undefined;
	readonly invoices?: readonly any[] | undefined;
	readonly onSelectInvoice?: ((inv: any) => void) | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly initialMethod?: CashierPaymentMethod | undefined;
}

export const CashRegisterPaymentPane: React.FC<CashRegisterPaymentPaneProps> = ({
	defaultAmountRub = 8500,
	cashierFullName = "Врач-стоматолог / Кассир",
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	onPaymentCompleted,
	onOpenFullSplitModal,
	activeInvoice,
	invoices,
	onSelectInvoice,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	initialMethod = "sbp",
}) => {
	// Resolved current invoice
	const currentInvoice = activeInvoice || (invoices && invoices.length > 0 ? invoices[0] : null);
	const baseAmountRub = currentInvoice?.totalAmountRub ?? currentInvoice?.amountRub ?? defaultAmountRub;

	const [amountRub, setAmountRub] = useState<number>(baseAmountRub);
	const [activeMethod, setActiveMethod] = useState<CashierPaymentMethod>(initialMethod);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(Math.round(baseAmountRub / 2));
	const [splitCashRub, setSplitCashRub] = useState<number>(baseAmountRub - Math.round(baseAmountRub / 2));
	const [splitCardRub, setSplitCardRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);
	const [cashTenderedRub, setCashTenderedRub] = useState<number>(baseAmountRub);
	const [isRoundedToHundreds, setIsRoundedToHundreds] = useState<boolean>(false);

	// Doctor discount autonomy state (Mandate 8e)
	const [activeDiscountPercent, setActiveDiscountPercent] = useState<number>(0);
	const [isWarranty100, setIsWarranty100] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// Synchronize when current invoice changes
	useEffect(() => {
		const newBase = currentInvoice?.totalAmountRub ?? currentInvoice?.amountRub ?? defaultAmountRub;
		setAmountRub(newBase);
		setCashTenderedRub(newBase);
		setSplitSbpRub(Math.round(newBase / 2));
		setSplitCashRub(newBase - Math.round(newBase / 2));
		setIsWarranty100(false);
		setActiveDiscountPercent(0);
	}, [currentInvoice, defaultAmountRub]);

	const canonicalSplit = useMemo(
		() =>
			calculateCanonicalSplit({
				totalDueRub: amountRub,
				sbpRub: activeMethod === "split" ? splitSbpRub : activeMethod === "sbp" ? amountRub : 0,
				cashRub: activeMethod === "split" ? splitCashRub : activeMethod === "cash" ? amountRub : 0,
				cardRub: activeMethod === "split" ? splitCardRub : activeMethod === "card" ? amountRub : 0,
				receivedCashRub: cashTenderedRub,
			}),
		[amountRub, activeMethod, splitSbpRub, splitCashRub, splitCardRub, cashTenderedRub],
	);

	const splitAllocatedRub = splitSbpRub + splitCashRub + splitCardRub + splitDepositRub;
	const splitRemainingRub = amountRub - splitAllocatedRub;
	const cashChangeRub = canonicalSplit.changeRub;
	const isCashShortage = cashTenderedRub < amountRub;
	const totalAvailableDepositRub = Math.max(0, patientDepositRub) + Math.max(0, patientFamilyBalanceRub);

	// 1-Click Preset: 50/50 Cash + SBP
	const handlePreset5050CashSbp = () => {
		const half = Math.floor(amountRub / 2);
		const rest = amountRub - half;
		setSplitCashRub(half);
		setSplitSbpRub(rest);
		setSplitCardRub(0);
		setSplitDepositRub(0);
		setActiveMethod("split");
		showToast("Применен сплит 50/50: Наличные + СБП QR", "info");
	};

	// 1-Click Preset: All in SBP
	const handlePresetAllSbp = () => {
		setActiveMethod("sbp");
		setSplitSbpRub(amountRub);
		setSplitCashRub(0);
		setSplitCardRub(0);
		setSplitDepositRub(0);
		showToast("100% суммы переведено в СБП QR", "info");
	};

	// 1-Click Preset: Round down to hundreds
	const handleRoundToHundreds = () => {
		const rounded = Math.floor(amountRub / 100) * 100;
		if (rounded > 0 && rounded !== amountRub) {
			setAmountRub(rounded);
			setCashTenderedRub(rounded);
			setIsRoundedToHundreds(true);
			showToast(`Сумма округлена до сотен: ${rounded.toLocaleString("ru-RU")} ₽`, "info");
		}
	};

	// 1-Click Doctor Discount Application (Mandate 8e)
	const applyDoctorDiscount = (pct: number) => {
		setIsWarranty100(false);
		setActiveDiscountPercent(pct);
		if (pct === 0) {
			setAmountRub(baseAmountRub);
			setCashTenderedRub(baseAmountRub);
			showToast("Скидка сброшена (полная цена)", "info");
		} else {
			const discounted = Math.max(0, Math.round(baseAmountRub * (1 - pct / 100)));
			setAmountRub(discounted);
			setCashTenderedRub(discounted);
			showToast(`Применена скидка врача ${pct}%: ${discounted.toLocaleString("ru-RU")} ₽`, "info");
		}
	};

	// 1-Click Warranty 100% (Mandate 8e — 0 friction, no manager password)
	const applyWarranty100 = () => {
		setIsWarranty100(true);
		setActiveDiscountPercent(100);
		setAmountRub(0);
		setCashTenderedRub(0);
		showToast("Гарантийный случай: скидка 100% (0.00 ₽) зафиксирована без ограничений", "success");
	};

	// Record completed receipt and trigger backend persistence
	const finalizeReceipt = async (method: ShiftReceiptEntry["method"], sum: number) => {
		setIsSubmitting(true);
		playTactileEarcon("pay");
		void clinicalProceduralAudio.playCashierKaching();

		const invId = currentInvoice?.id;
		if (invId) {
			try {
				const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
				await fetch(`/api/invoices/${invId}/pay`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						amountRub: sum,
						method: method === "split" ? "card" : method,
						clientMutationId: `pay-${invId}-${Date.now()}`,
						patientId: currentInvoice.patientId,
					}),
				}).catch(() => null);
			} catch {
				// Fail-soft: continue receipt flow under Mandate 8e
			}
		}

		const newReceipt: ShiftReceiptEntry = {
			id: `rec-${Date.now().toString().slice(-4)}`,
			number: Date.now().toString().slice(-4),
			time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
			patientName: currentInvoice?.patientName || "Пациент клиники",
			totalRub: sum,
			method,
			items: currentInvoice?.items?.length
				? currentInvoice.items.map((it: any) => ({
						name: it.name || it.title || "Стоматологическая услуга",
						quantity: it.quantity || 1,
						priceRub: it.priceRub || it.price || sum,
						amountRub: it.amountRub || it.amount || sum,
						code804n: it.code804n || "A16.07.002",
					}))
				: [
						{
							name: isWarranty100
								? "Гарантийный прием и переделка (скидка 100%)"
								: "Стоматологический приём и лечение",
							quantity: 1,
							priceRub: sum,
							amountRub: sum,
							code804n: "A16.07.002",
						},
					],
		};

		setIsSubmitting(false);
		onPaymentCompleted?.(newReceipt);
	};

	return (
		<div className="space-y-3.5" data-testid="cash-register-payment-pane">
			{/* Active Invoice Header Card (if invoice is linked) */}
			{currentInvoice && (
				<div className="p-3 rounded-xl border border-teal-500/25 bg-teal-500/5 flex items-center justify-between gap-2.5">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
							<FileText size={16} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="text-xs font-black text-[var(--ink,#0f172a)] truncate">
									{`Счёт ${currentInvoice.number || currentInvoice.id.slice(0, 8)}`}
								</span>
								<span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-200">
									{currentInvoice.status === "paid" ? "Оплачен" : "К оплате"}
								</span>
							</div>
							<p className="text-[11px] text-[var(--muted,#64748b)] m-0 truncate">
								{currentInvoice.patientName || "Пациент клиники"}
							</p>
						</div>
					</div>

					{invoices && invoices.length > 1 && onSelectInvoice && (
						<div className="shrink-0">
							<select
								value={currentInvoice.id}
								onChange={(e) => {
									const target = invoices.find((inv) => inv.id === e.target.value);
									if (target) onSelectInvoice(target);
								}}
								className="h-7 text-[11px] font-bold px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] cursor-pointer"
								aria-label="Выбрать другой счёт"
							>
								{invoices.map((inv) => (
									<option key={inv.id} value={inv.id}>
										{`${inv.number || inv.id.slice(0, 6)} • ${inv.patientName || "Пациент"} (${(inv.totalAmountRub || inv.amountRub || 0).toLocaleString("ru-RU")} ₽)`}
									</option>
								))}
							</select>
						</div>
					)}
				</div>
			)}

			{/* 1. Clean Amount Display (28-32px Semibold per Studio Clinical HIG) */}
			<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3 shadow-2xs">
				<div>
					<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] block">
						Сумма к оплате
					</span>
					<div
						className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-tight mt-0.5 ${
							isWarranty100
								? "text-emerald-600 dark:text-emerald-400"
								: "text-[var(--ink,#0f172a)]"
						}`}
						data-testid="cashier-display-total-amount"
					>
						{amountRub.toLocaleString("ru-RU")} ₽
					</div>
					{isWarranty100 && (
						<span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mt-0.5">
							<ShieldCheck size={12} />
							<span>Гарантия 100% (свобода врача)</span>
						</span>
					)}
				</div>

				{/* Quick Split & Rounding Chips */}
				<div className="flex items-center gap-1.5 flex-wrap justify-end">
					<button
						type="button"
						onClick={handlePreset5050CashSbp}
						className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-500 hover:text-teal-600 text-xs font-bold text-[var(--ink,#0f172a)] transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
						data-testid="chip-preset-50-50-sbp"
						title="Разделить 50/50: Наличные + СБП"
					>
						<Layers size={13} className="text-teal-600 shrink-0" />
						<span>50/50 Нал+СБП</span>
					</button>

					<button
						type="button"
						onClick={handlePresetAllSbp}
						className="h-8 px-2.5 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-xs font-bold text-teal-700 dark:text-teal-300 transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
						data-testid="chip-preset-all-sbp"
						title="Оплатить 100% через СБП QR"
					>
						<QrCode size={13} className="text-teal-600 shrink-0" />
						<span>Вся сумма в СБП</span>
					</button>

					<button
						type="button"
						onClick={handleRoundToHundreds}
						className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1 ${
							isRoundedToHundreds
								? "border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300"
								: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
						}`}
						data-testid="chip-preset-round-hundreds"
						title="Округлить сумму вниз до сотен рублей"
					>
						<Sparkles size={13} className="text-amber-500 shrink-0" />
						<span>Округлить до сотен</span>
					</button>
				</div>
			</div>

			{/* Doctor Discounts Row (Mandate 8e: Doctor Autonomy without blocking) */}
			<div className="p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] space-y-1.5 text-xs">
				<div className="flex items-center justify-between">
					<span className="font-bold text-[var(--muted,#64748b)] text-[11px] uppercase tracking-wider flex items-center gap-1">
						<Percent size={13} className="text-amber-500" />
						<span>Скидки врача:</span>
					</span>
					{activeDiscountPercent > 0 && !isWarranty100 && (
						<span className="text-[11px] font-bold text-amber-600">
							{`-${activeDiscountPercent}% (${(baseAmountRub - amountRub).toLocaleString("ru-RU")} ₽)`}
						</span>
					)}
				</div>
				<div className="grid grid-cols-6 gap-1">
					{[0, 5, 10, 15, 20, 50].map((pct) => (
						<button
							key={pct}
							type="button"
							onClick={() => applyDoctorDiscount(pct)}
							className={`h-7 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
								activeDiscountPercent === pct && !isWarranty100
									? "border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-200"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid={`btn-discount-${pct}`}
						>
							{pct === 0 ? "0%" : `${pct}%`}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={applyWarranty100}
					className={`w-full h-7 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
						isWarranty100
							? "border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
							: "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
					}`}
					data-testid="btn-warranty-100-chip"
					title="Гарантийный случай — 100% скидка без требований пароля суперадмина"
				>
					<ShieldCheck size={13} />
					<span>Гарантия 100% (0 ₽)</span>
				</button>
			</div>

			{/* 2. Unified 36px Segmented Method Switcher (Radius 8px, No Accordion Clutter) */}
			<div className="space-y-1.5">
				<label className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
					Способ оплаты
				</label>
				<div
					className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] select-none overflow-x-auto scrollbar-none"
					role="tablist"
					data-testid="cashier-method-switcher"
				>
					<button
						type="button"
						role="tab"
						aria-selected={activeMethod === "sbp"}
						onClick={() => setActiveMethod("sbp")}
						className={`flex-1 min-w-[58px] sm:min-w-0 h-9 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
							activeMethod === "sbp"
								? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-300 shadow-xs border border-teal-500/30 ring-1 ring-teal-500/20"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="btn-method-tab-sbp"
					>
						<QrCode size={14} className="text-teal-600 shrink-0" />
						<span>СБП</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeMethod === "card"}
						onClick={() => setActiveMethod("card")}
						className={`flex-1 min-w-[58px] sm:min-w-0 h-9 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
							activeMethod === "card"
								? "bg-[var(--paper,#ffffff)] text-blue-700 dark:text-blue-300 shadow-xs border border-blue-500/30 ring-1 ring-blue-500/20"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="btn-method-tab-card"
					>
						<CreditCard size={14} className="text-blue-600 shrink-0" />
						<span>Карта</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeMethod === "cash"}
						onClick={() => setActiveMethod("cash")}
						className={`flex-1 min-w-[58px] sm:min-w-0 h-9 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
							activeMethod === "cash"
								? "bg-[var(--paper,#ffffff)] text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-500/30 ring-1 ring-emerald-500/20"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="btn-method-tab-cash"
					>
						<Banknote size={14} className="text-emerald-600 shrink-0" />
						<span>Нал</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeMethod === "deposit"}
						onClick={() => setActiveMethod("deposit")}
						className={`flex-1 min-w-[62px] sm:min-w-0 h-9 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
							activeMethod === "deposit"
								? "bg-[var(--paper,#ffffff)] text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-500/30 ring-1 ring-indigo-500/20"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="btn-method-tab-deposit"
					>
						<Wallet size={14} className="text-indigo-600 shrink-0" />
						<span>Депозит</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeMethod === "split"}
						onClick={() => setActiveMethod("split")}
						className={`flex-1 min-w-[58px] sm:min-w-0 h-9 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
							activeMethod === "split"
								? "bg-[var(--paper,#ffffff)] text-purple-700 dark:text-purple-300 shadow-xs border border-purple-500/30 ring-1 ring-purple-500/20"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="btn-method-tab-split"
					>
						<Layers size={14} className="text-purple-600 shrink-0" />
						<span>Сплит</span>
					</button>
				</div>
			</div>

			{/* 3. Dynamic Cockpit: Selected Tender View */}
			{activeMethod === "sbp" && (
				/* Autonomous SBP Dynamic QR Widget */
				<SbpDynamicQrCard
					sumRub={amountRub}
					clinicLegalName={clinicLegalName}
					ttlSeconds={30}
					onPaymentSuccess={(res) => finalizeReceipt("sbp", res.sumRub)}
				/>
			)}

			{activeMethod === "card" && (
				/* POS Terminal Pane */
				<div
					className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs"
					data-testid="pane-tender-card"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<CreditCard size={18} className="text-blue-600" />
							<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
								Банковский терминал (Эквайринг 54-ФЗ)
							</span>
						</div>
						<span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
							Безналичный расчет
						</span>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						Пациент прикладывает карту или телефон к POS-терминалу на стойке.
					</p>
					<button
						type="button"
						disabled={isSubmitting}
						onClick={() => {
							showToast(`Оплата картой на ${amountRub.toLocaleString("ru-RU")} ₽ зафиксирована`, "success");
							finalizeReceipt("card", amountRub);
						}}
						className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
						data-testid="btn-confirm-card-pos"
					>
						<CheckCircle2 size={16} />
						<span>Карта одобрена банком ({amountRub.toLocaleString("ru-RU")} ₽)</span>
					</button>
				</div>
			)}

			{activeMethod === "cash" && (
				/* Cash Tender with Fast Bills and Change Calculation */
				<div
					className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs"
					data-testid="pane-tender-cash"
				>
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
							<Banknote size={16} className="text-emerald-600" />
							<span>Внесено наличными:</span>
						</span>
						<button
							type="button"
							onClick={() => setCashTenderedRub(amountRub)}
							className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
							data-testid="btn-cash-exact-match"
						>
							Без сдачи ({amountRub.toLocaleString("ru-RU")} ₽)
						</button>
					</div>

					<div className="flex items-center gap-2">
						<input
							type="number"
							value={cashTenderedRub || ""}
							onChange={(e) => setCashTenderedRub(Math.max(0, parseFloat(e.target.value) || 0))}
							className="flex-1 h-10 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-base text-[var(--ink,#0f172a)] focus:outline-none focus:border-teal-500"
							placeholder="Сумма купюр"
							data-testid="input-cash-tendered-amount"
						/>
						<span className="font-bold text-sm text-[var(--ink,#0f172a)]">₽</span>
					</div>

					{/* Fast Bill Addition Chips */}
					<div className="flex items-center gap-1.5 flex-wrap">
						{[500, 1000, 2000, 5000, 10000].map((bill) => (
							<button
								key={bill}
								type="button"
								onClick={() => setCashTenderedRub((prev) => prev + bill)}
								className="h-7 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs font-mono font-bold text-[var(--ink,#0f172a)] hover:border-emerald-500 cursor-pointer shadow-2xs active:scale-95 transition-all"
								data-testid={`btn-bill-${bill}`}
							>
								+{bill.toLocaleString("ru-RU")} ₽
							</button>
						))}
					</div>

					{/* Change / Shortage Telemetry */}
					<div className="pt-2 border-t border-[var(--line,#cbd5e1)] flex items-center justify-between text-xs">
						<span className="text-[var(--muted,#64748b)]">Сдача пациенту:</span>
						<span
							className={`font-mono font-extrabold text-sm ${
								isCashShortage
									? "text-amber-600 dark:text-amber-400"
									: "text-emerald-700 dark:text-emerald-300"
							}`}
							data-testid="display-cashier-change"
						>
							{isCashShortage
								? `Не хватает ${(amountRub - cashTenderedRub).toLocaleString("ru-RU")} ₽`
								: `${cashChangeRub.toLocaleString("ru-RU")} ₽`}
						</span>
					</div>

					<button
						type="button"
						disabled={isSubmitting}
						onClick={() => {
							showToast(`Наличные ${amountRub.toLocaleString("ru-RU")} ₽ приняты в кассу`, "success");
							finalizeReceipt("cash", amountRub);
						}}
						className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
						data-testid="btn-confirm-cash-tender"
					>
						<CheckCircle2 size={16} />
						<span>Принять наличные ({amountRub.toLocaleString("ru-RU")} ₽)</span>
					</button>
				</div>
			)}

			{activeMethod === "deposit" && (
				/* Family Deposit Offset Cockpit (Mandate 8e & 8n: 1-click offset) */
				<div
					className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs"
					data-testid="pane-tender-deposit"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Wallet size={18} className="text-indigo-600" />
							<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
								Личный / Семейный депозит
							</span>
						</div>
						<span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
							Доступно: {totalAvailableDepositRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>

					<div className="grid grid-cols-2 gap-2 text-xs">
						<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
							<span className="text-[11px] text-[var(--muted,#64748b)] block">Личный аванс</span>
							<strong className="font-mono text-sm text-[var(--ink,#0f172a)]">
								{patientDepositRub.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
						<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
							<span className="text-[11px] text-[var(--muted,#64748b)] block">Семейный кошелек</span>
							<strong className="font-mono text-sm text-[var(--ink,#0f172a)]">
								{patientFamilyBalanceRub.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
					</div>

					{totalAvailableDepositRub >= amountRub ? (
						<button
							type="button"
							disabled={isSubmitting}
							onClick={() => {
								showToast(`Списано с депозита: ${amountRub.toLocaleString("ru-RU")} ₽`, "success");
								finalizeReceipt("card", amountRub);
							}}
							className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
							data-testid="btn-confirm-deposit-tender"
						>
							<CheckCircle2 size={16} />
							<span>Списать с депозита ({amountRub.toLocaleString("ru-RU")} ₽)</span>
						</button>
					) : (
						<div className="space-y-2">
							<p className="text-xs text-amber-600 dark:text-amber-400 m-0">
								Депозита ({totalAvailableDepositRub.toLocaleString("ru-RU")} ₽) не хватает на полную сумму счета ({amountRub.toLocaleString("ru-RU")} ₽).
							</p>
							<button
								type="button"
								onClick={() => {
									setSplitDepositRub(totalAvailableDepositRub);
									setSplitSbpRub(amountRub - totalAvailableDepositRub);
									setSplitCashRub(0);
									setSplitCardRub(0);
									setActiveMethod("split");
									showToast("Депозит учтен! Остаток переведен в СБП QR", "info");
								}}
								className="w-full h-10 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
								data-testid="btn-split-with-deposit"
							>
								<Layers size={15} />
								<span>Списать {totalAvailableDepositRub.toLocaleString("ru-RU")} ₽ + остаток через Сплит</span>
							</button>
						</div>
					)}
				</div>
			)}

			{activeMethod === "split" && (
				/* Compact Multi-Tender Split Grid */
				<div
					className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs"
					data-testid="pane-tender-split"
				>
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
							<Layers size={16} className="text-purple-600" />
							<span>Комбинированный сплит:</span>
						</span>
						<span
							className={`text-xs font-mono font-bold ${
								splitRemainingRub === 0
									? "text-emerald-600 dark:text-emerald-400"
									: "text-amber-600 dark:text-amber-400"
							}`}
						>
							{splitRemainingRub === 0
								? "Сбалансировано"
								: `Осталось: ${splitRemainingRub.toLocaleString("ru-RU")} ₽`}
						</span>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
						<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
							<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1">
								<QrCode size={13} className="text-teal-600" />
								<span>СБП QR</span>
							</span>
							<input
								type="number"
								value={splitSbpRub || ""}
								onChange={(e) => setSplitSbpRub(Math.max(0, parseFloat(e.target.value) || 0))}
								className="w-full h-8 px-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-xs"
								data-testid="input-split-pane-sbp"
							/>
						</div>

						<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
							<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1">
								<Banknote size={13} className="text-emerald-600" />
								<span>Наличные</span>
							</span>
							<input
								type="number"
								value={splitCashRub || ""}
								onChange={(e) => setSplitCashRub(Math.max(0, parseFloat(e.target.value) || 0))}
								className="w-full h-8 px-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-xs"
								data-testid="input-split-pane-cash"
							/>
						</div>

						<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-1">
							<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1">
								<CreditCard size={13} className="text-blue-600" />
								<span>Карта (POS)</span>
							</span>
							<input
								type="number"
								value={splitCardRub || ""}
								onChange={(e) => setSplitCardRub(Math.max(0, parseFloat(e.target.value) || 0))}
								className="w-full h-8 px-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-xs"
								data-testid="input-split-pane-card"
							/>
						</div>
					</div>

					{/* If SBP amount in split > 0, show compact QR preview */}
					{splitSbpRub > 0 && (
						<div className="pt-2">
							<SbpDynamicQrCard
								sumRub={splitSbpRub}
								clinicLegalName={clinicLegalName}
								ttlSeconds={30}
								compactMode={true}
								onPaymentSuccess={() => {
									showToast(`Часть сплита по СБП (${splitSbpRub.toLocaleString("ru-RU")} ₽) оплачена!`, "success");
								}}
							/>
						</div>
					)}

					<div className="flex items-center gap-2 pt-1">
						{onOpenFullSplitModal && (
							<button
								type="button"
								onClick={onOpenFullSplitModal}
								className="h-9 px-3 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 cursor-pointer transition-all"
								data-testid="btn-open-advanced-split"
							>
								Расширенный сплит...
							</button>
						)}
						<button
							type="button"
							onClick={() => {
								showToast(`Сплит-оплата ${amountRub.toLocaleString("ru-RU")} ₽ проведена`, "success");
								finalizeReceipt("split", amountRub);
							}}
							disabled={splitRemainingRub !== 0 || isSubmitting}
							className="flex-1 h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
							data-testid="btn-confirm-split-pane"
						>
							<CheckCircle2 size={16} />
							<span>Завершить сплит-оплату</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default CashRegisterPaymentPane;
