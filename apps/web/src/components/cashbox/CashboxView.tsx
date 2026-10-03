/**
 * apps/web/src/components/cashbox/CashboxView.tsx
 *
 * DENTE Dental CRM — 54-FZ Cashbox, Cash Register Shift & Payments Workspace.
 *
 * Compliant with:
 * - Mandate 8e, Item 9: 54-FZ Cash Register without obstacles (zero mandatory INN for physical persons).
 * - Mandate 8e, Item 7: Doctor autonomy on discounts up to 100% (warranty reworks & staff) with NO admin password.
 * - Mandate 8n: Scale sovereignty — solo doctor on chair rental & small clinic prioritization.
 * - Mandate 8c: Tier 1 Hot Path layout (clear totals, 1-click presets, dense clinical desktop ergonomics).
 * - Mandate 8b: Integer kopeck precision without IEEE-754 float drift.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
	Banknote,
	CreditCard,
	QrCode,
	ShieldCheck,
	Sparkles,
	Tag,
	RotateCcw,
	CheckCircle2,
	Plus,
} from "lucide-react";
import {
	createCompositeIdempotencyKey,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import { CashShiftWidget } from "../finance/CashShiftWidget.js";
import { PaymentModal, type PaymentMethodTab } from "../finance/PaymentModal.js";
import {
	validateBuyerInn54Fz,
	process100PercentDiscountCheckout,
	type PayerLegalType,
	type TenderAllocationTarget,
	type MultiTenderStateRub,
	allocateRemainderToTender,
} from "../finance/cashboxOperations.js";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";

let zeroReceiptMutationSeq = 0;

export interface CashboxViewProps {
	readonly initialShiftOpen?: boolean;
	readonly cashierName?: string;
	readonly cashierInn?: string;
	readonly clinicName?: string;
	readonly clinicInn?: string;
	readonly initialAmountRub?: number;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly visitId?: string;
	readonly invoiceId?: string;
	readonly documentId?: string;
	readonly onPaymentComplete?: (receipt: any) => void;
}

interface CashBoxSummary {
	readonly id: string;
	readonly type: string;
	readonly name: string;
	readonly balanceRub: number;
	readonly isShiftOpen?: boolean;
}

export function CashboxView({
	initialShiftOpen = true,
	cashierName = "Администратор / Врач",
	cashierInn,
	clinicName = "Стоматологическая клиника",
	clinicInn,
	initialAmountRub = 0,
	patientId,
	patientName,
	patientPhone,
	visitId,
	invoiceId,
	documentId,
	onPaymentComplete,
}: CashboxViewProps) {
	// Cash Boxes & Shift State from backend
	const [cashBoxes, setCashBoxes] = useState<readonly CashBoxSummary[]>([]);
	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(initialShiftOpen);
	const [mainCashBoxId, setMainCashBoxId] = useState<string | null>(null);

	// Payer & 54-FZ State
	const [payerType, setPayerType] = useState<PayerLegalType>("physical_person");
	const [buyerInn, setBuyerInn] = useState("");
	const [grossAmountRub, setGrossAmountRub] = useState<number>(initialAmountRub);
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [isWarranty, setIsWarranty] = useState<boolean>(false);
	const [isStaffColleague, setIsStaffColleague] = useState<boolean>(false);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
	const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethodTab>("card_terminal");
	const [isSubmittingZeroReceipt, setIsSubmittingZeroReceipt] = useState<boolean>(false);

	// Tender Allocations
	const [tenders, setTenders] = useState<MultiTenderStateRub>({
		cardRub: 0,
		cashRub: 0,
		sbpRub: 0,
		depositRub: 0,
		familyRub: 0,
	});

	// Load 6 Cash Boxes and live shift state from backend
	const loadCashBoxes = useCallback(async () => {
		try {
			const res = await fetch("/api/cash/cash-box", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const json = await res.json();
				if (Array.isArray(json.data)) {
					setCashBoxes(json.data);
					const main = json.data.find((b: { type: string }) => b.type === "main");
					if (main) {
						setMainCashBoxId(main.id);
						if (typeof main.isShiftOpen === "boolean") {
							setIsShiftOpen(main.isShiftOpen);
						}
					}
				}
			}
		} catch {
			// Soft fallback if network unreachable
		}
	}, []);

	useEffect(() => {
		void loadCashBoxes();
	}, [loadCashBoxes]);

	// Shift Management Handlers connected to backend /api/cash/*
	const handleOpenShift = async () => {
		const res = await fetch("/api/cash/cash-box-all-open", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ cashierFullName: cashierName }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка открытия смены");
		}
		setIsShiftOpen(true);
		void loadCashBoxes();
	};

	const handleCloseShift = async () => {
		const res = await fetch("/api/cash/cash-box-all-closing", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ zReportNumber: `Z-DAILY-${Date.now()}` }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка закрытия смены");
		}
		setIsShiftOpen(false);
		void loadCashBoxes();
	};

	const handlePrintXReport = async () => {
		const res = await fetch("/api/cash/x-report", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка печати X-отчета");
		}
	};

	const handleCashIn = async (amountRub: number, basis: string) => {
		if (!mainCashBoxId) {
			showToast("Основная касса не определена", "error");
			return;
		}
		const res = await fetch("/api/cash/cash-introduction", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				cashBoxId: mainCashBoxId,
				amountRub,
				reasonText: basis,
			}),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка внесения наличных");
		}
		void loadCashBoxes();
	};

	const handleCashOut = async (amountRub: number, basis: string, recipientFio?: string) => {
		if (!mainCashBoxId) {
			showToast("Основная касса не определена", "error");
			return;
		}
		const res = await fetch("/api/cash/cash-withdrawal", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				cashBoxId: mainCashBoxId,
				amountRub,
				reasonText: basis,
				recipientFio,
			}),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка инкассации / изъятия наличных");
		}
		void loadCashBoxes();
	};

	// INN Validation (54-FZ Tag 1228: Physical person never blocked)
	const innValidation = validateBuyerInn54Fz({
		payerType,
		buyerInn,
	});

	// Checkout & Doctor Discount Calculation
	const checkoutResult = process100PercentDiscountCheckout({
		totalGrossRub: grossAmountRub,
		discountPercent,
		isWarrantyRework: isWarranty,
		isStaffColleague,
	});

	const handleAllocateAll = (target: TenderAllocationTarget) => {
		const updated = allocateRemainderToTender({
			totalDueRub: checkoutResult.totalNetRub,
			currentTenders: tenders,
			targetTender: target,
		});
		setTenders(updated);
	};

	const handleOpenPaymentWithMethod = (method: PaymentMethodTab) => {
		setActivePaymentMethod(method);
		setIsPaymentModalOpen(true);
	};

	// Process 100% Discount Checkout (0 ₽ receipt) via real billing endpoint with idempotency key
	const handleProcessZeroDiscountCheckout = async () => {
		if (isSubmittingZeroReceipt) return;
		setIsSubmittingZeroReceipt(true);
		try {
			const idempotencyKey = createCompositeIdempotencyKey(
				`cashbox-0-receipt-${patientId || "walkin"}-${Date.now()}-${zeroReceiptMutationSeq++}`,
			);

			const notesReason = isWarranty
				? "100% скидка: Гарантийная переделка"
				: isStaffColleague
					? "100% скидка: Лечение коллеги / персонала"
					: `Скидка врача ${discountPercent}%`;

			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				}),
				body: JSON.stringify({
					patientId: patientId || undefined,
					visitId: visitId || undefined,
					documentId: documentId || undefined,
					amountRub: 0,
					method: "cash",
					clientMutationId: idempotencyKey,
					notes: notesReason,
				}),
			});

			if (res.ok) {
				const receiptData = await res.json();
				showToast("Чек 0 ₽ (100% скидка) успешно зафиксирован в системе", "success");
				onPaymentComplete?.(receiptData);
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка проведения расчета 0 ₽", "error");
			}
		} catch {
			showToast("Ошибка сети при проведении 100% чека", "error");
		} finally {
			setIsSubmittingZeroReceipt(false);
		}
	};

	const handleAddAmountPreset = (rub: number) => {
		const currentKop = rubToKopecks(grossAmountRub);
		const addKop = rubToKopecks(rub);
		setGrossAmountRub(kopecksToRub(currentKop + addKop));
	};

	return (
		<div className="cashbox-view flex flex-col gap-4 p-4 max-w-6xl mx-auto">
			{/* Cash Shift Banner / Management Connected to Real Cashbox Endpoints */}
			<section aria-label="Управление кассовой сменой">
				<CashShiftWidget
					initialIsOpen={isShiftOpen}
					cashierName={cashierName}
					cashierInn={cashierInn}
					clinicName={clinicName}
					clinicInn={clinicInn}
					onOpenShift={handleOpenShift}
					onCloseShift={handleCloseShift}
					onPrintXReport={handlePrintXReport}
					onCashIn={handleCashIn}
					onCashOut={handleCashOut}
				/>
			</section>

			{/* Fast Payment & Doctor Autonomy Panel */}
			<div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-xs">
				{/* 1-Row Compact Toolbar (32-36px, Mandates 8c, 8d, 8p) */}
				<div className="cashbox-toolbar min-h-[36px] h-9 max-h-9 flex items-center justify-between gap-2 px-1 pb-2 border-b border-[var(--line)] mb-3 flex-nowrap overflow-hidden select-none">
					<div className="flex items-center gap-2 min-w-0">
						<Banknote className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<h2 className="text-sm font-bold text-[var(--ink)] truncate">
							Касса и чеки
						</h2>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))] whitespace-nowrap">
							<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
							<span>Касса: без барьеров</span>
						</span>
					</div>
				</div>

				{/* Amount Entry & Quick Presets Row */}
				<div className="mb-3 p-3 bg-[var(--paper-soft,#f8fafc)] rounded-lg border border-[var(--line)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
					<div className="flex-1 min-w-[200px]">
						<label htmlFor="gross-amount-input" className="block text-xs font-semibold text-[var(--ink)] mb-1">
							Сумма к расчету (брутто):
						</label>
						<div className="relative">
							<input
								id="gross-amount-input"
								type="number"
								min="0"
								step="1"
								value={grossAmountRub || ""}
								onChange={(e) => {
									const val = parseFloat(e.target.value);
									setGrossAmountRub(isNaN(val) ? 0 : Math.max(0, val));
								}}
								placeholder="Введите сумму в рублях"
								className="w-full text-base font-bold font-mono px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,var(--brand-primary))]"
							/>
							<span className="absolute right-3 top-2 text-xs font-bold text-[var(--muted)]">₽</span>
						</div>
					</div>

					{/* Fast Amount Preset Chips */}
					<div className="flex items-center gap-1.5 flex-wrap">
						{[1000, 3000, 5000, 10000].map((preset) => (
							<button
								key={preset}
								type="button"
								onClick={() => handleAddAmountPreset(preset)}
								className="h-7 px-2.5 rounded-md text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center gap-0.5"
								title={`Добавить +${preset.toLocaleString("ru-RU")} ₽`}
							>
								<Plus className="w-3 h-3 text-[var(--teal,var(--brand-primary))]" />
								<span>{preset.toLocaleString("ru-RU")}</span>
							</button>
						))}

						{grossAmountRub > 0 && (
							<button
								type="button"
								onClick={() => setGrossAmountRub(0)}
								className="h-7 px-2 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer inline-flex items-center gap-1"
								title="Очистить сумму"
							>
								<RotateCcw className="w-3 h-3" />
								<span>Сброс</span>
							</button>
						)}
					</div>
				</div>

				{/* Doctor Discount Autonomy Row (Up to 100% without admin password, Mandates 8c, 8e) */}
				<div className="mb-3 px-2.5 py-1 min-h-[36px] bg-[var(--paper-soft,#f8fafc)] rounded-lg border border-[var(--line)] flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-none select-none">
					<div className="text-xs font-bold text-[var(--ink)] shrink-0 flex items-center gap-1.5 whitespace-nowrap">
						<Tag className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
						<span>Скидки врача:</span>
					</div>
					<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto scrollbar-none flex-nowrap">
						<button
							type="button"
							className={`h-7 px-2 sm:px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
								isWarranty
									? "bg-[var(--warning-fg,#b45309)] text-white shadow-xs"
									: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft,#f1f5f9)]"
							}`}
							onClick={() => {
								setIsWarranty(!isWarranty);
								setIsStaffColleague(false);
							}}
						>
							100% Гарантия
						</button>

						<button
							type="button"
							className={`h-7 px-2 sm:px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
								isStaffColleague
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
									: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft,#f1f5f9)]"
							}`}
							onClick={() => {
								setIsStaffColleague(!isStaffColleague);
								setIsWarranty(false);
							}}
						>
							100% Персонал
						</button>

						{[50, 20, 10].map((pct) => (
							<button
								key={pct}
								type="button"
								className={`h-7 px-2 sm:px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 ${
									discountPercent === pct && !isWarranty && !isStaffColleague
										? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
										: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft,#f1f5f9)]"
								}`}
								onClick={() => {
									setDiscountPercent(discountPercent === pct ? 0 : pct);
									setIsWarranty(false);
									setIsStaffColleague(false);
								}}
							>
								{pct}%
							</button>
						))}

						{(isWarranty || isStaffColleague || discountPercent > 0) && (
							<button
								type="button"
								className="text-xs text-[var(--muted)] hover:text-rose-600 dark:hover:text-rose-400 underline ml-auto whitespace-nowrap cursor-pointer shrink-0"
								onClick={() => {
									setIsWarranty(false);
									setIsStaffColleague(false);
									setDiscountPercent(0);
								}}
							>
								Сбросить
							</button>
						)}
					</div>
				</div>

				{/* Payer Type & 54-FZ INN Logic */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
					<div>
						<label className="block text-xs font-medium text-[var(--muted)] mb-1">
							Тип плательщика
						</label>
						<div className="flex gap-2">
							<button
								type="button"
								className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
									payerType === "physical_person"
										? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal,var(--brand-primary))]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								onClick={() => setPayerType("physical_person")}
							>
								Физическое лицо (без ИНН)
							</button>
							<button
								type="button"
								className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
									payerType === "legal_entity"
										? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal,var(--brand-primary))]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								onClick={() => setPayerType("legal_entity")}
							>
								Юрлицо (ИНН 10 цифр)
							</button>
						</div>
					</div>

					<div>
						<label htmlFor="cashbox-inn-input" className="block text-xs font-medium text-[var(--muted)] mb-1">
							ИНН плательщика {payerType === "physical_person" ? "(опционально)" : "(обязательно)"}
						</label>
						<input
							id="cashbox-inn-input"
							type="text"
							value={buyerInn}
							onChange={(e) => setBuyerInn(e.target.value)}
							placeholder={
								payerType === "physical_person"
									? "Не требуется для оплаты (только для справки 13% НДФЛ)"
									: "10 или 12 цифр"
							}
							className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,var(--brand-primary))]"
						/>
						{innValidation.errorRu && (
							<p className="text-[11px] text-[var(--warning-fg)] mt-1">{innValidation.errorRu}</p>
						)}
					</div>
				</div>

				{/* Financial Summary & 1-Click Tenders */}
				<div className="bg-[var(--paper-soft,#f8fafc)] border border-[var(--line)] rounded-xl p-3">
					<div className="flex items-center justify-between mb-2.5">
						<span className="text-xs text-[var(--muted)] font-medium">Итого к оплате:</span>
						<span className="text-lg font-black font-mono text-[var(--ink)]">
							{checkoutResult.totalNetRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>

					{checkoutResult.isZeroDue ? (
						<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 rounded-lg bg-[var(--ok-bg,rgba(16,185,129,0.1))] border border-[var(--ok-fg,rgba(16,185,129,0.2))]">
							<div className="text-xs text-[var(--ok-fg,#10b981)] font-medium">
								{checkoutResult.statusBannerText}
							</div>
							<button
								type="button"
								onClick={handleProcessZeroDiscountCheckout}
								disabled={isSubmittingZeroReceipt}
								className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
							>
								<CheckCircle2 className="w-4 h-4" />
								<span>{isSubmittingZeroReceipt ? "Оформление..." : "Оформить чек 0 ₽"}</span>
							</button>
						</div>
					) : (
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[var(--teal,var(--brand-primary))] text-white text-xs font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
								onClick={() => {
									handleAllocateAll("card");
									handleOpenPaymentWithMethod("card_terminal");
								}}
							>
								<CreditCard className="w-3.5 h-3.5" />
								Всё картой
							</button>

							<button
								type="button"
								className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white text-xs font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
								onClick={() => {
									handleAllocateAll("cash");
									handleOpenPaymentWithMethod("cash");
								}}
							>
								<Banknote className="w-3.5 h-3.5" />
								Всё наличными
							</button>

							<button
								type="button"
								className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-semibold shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
								onClick={() => {
									handleAllocateAll("sbp");
									handleOpenPaymentWithMethod("sbp_qr");
								}}
							>
								<QrCode className="w-3.5 h-3.5" />
								Всё по СБП
							</button>

							<button
								type="button"
								className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
								onClick={() => handleOpenPaymentWithMethod("split")}
								data-testid="btn-open-payment-modal"
								title="Универсальное окно сплит-оплаты и терминала"
							>
								<Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
								<span>Сплит / Терминал...</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{isPaymentModalOpen && (
				<PaymentModal
					isOpen={isPaymentModalOpen}
					amountRub={checkoutResult.totalNetRub}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					visitId={visitId}
					invoiceId={invoiceId}
					documentId={documentId}
					cashierName={cashierName}
					clinicLegalName={clinicName}
					defaultMethod={activePaymentMethod}
					onClose={() => setIsPaymentModalOpen(false)}
					onSuccess={(receipt) => {
						setIsPaymentModalOpen(false);
						onPaymentComplete?.(receipt);
					}}
				/>
			)}
		</div>
	);
}

export default CashboxView;
