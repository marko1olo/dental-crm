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
 */

import React, { useState } from "react";
import {
	Banknote,
	CreditCard,
	QrCode,
	ShieldCheck,
	Sparkles,
	Tag,
	UserCheck,
} from "lucide-react";
import { CashShiftWidget } from "../finance/CashShiftWidget.js";
import {
	validateBuyerInn54Fz,
	process100PercentDiscountCheckout,
	type PayerLegalType,
	type TenderAllocationTarget,
	type MultiTenderStateRub,
	allocateRemainderToTender,
} from "../finance/cashboxOperations.js";

export interface CashboxViewProps {
	readonly initialShiftOpen?: boolean;
	readonly cashierName?: string;
	readonly cashierInn?: string;
	readonly clinicName?: string;
	readonly clinicInn?: string;
	readonly onPaymentComplete?: (receipt: any) => void;
}

export function CashboxView({
	initialShiftOpen = true,
	cashierName = "Администратор / Врач",
	cashierInn,
	clinicName = "Стоматологическая клиника",
	clinicInn,
	onPaymentComplete,
}: CashboxViewProps) {
	// Payer & 54-FZ State
	const [payerType, setPayerType] = useState<PayerLegalType>("physical_person");
	const [buyerInn, setBuyerInn] = useState("");
	const [grossAmountRub, setGrossAmountRub] = useState<number>(0);
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [isWarranty, setIsWarranty] = useState<boolean>(false);
	const [isStaffColleague, setIsStaffColleague] = useState<boolean>(false);

	// Tender Allocations
	const [tenders, setTenders] = useState<MultiTenderStateRub>({
		cardRub: 0,
		cashRub: 0,
		sbpRub: 0,
		depositRub: 0,
		familyRub: 0,
	});

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

	return (
		<div className="cashbox-view flex flex-col gap-4 p-4 max-w-6xl mx-auto">
			{/* Cash Shift Banner / Management */}
			<section aria-label="Управление кассовой сменой">
				<CashShiftWidget
					initialIsOpen={initialShiftOpen}
					cashierName={cashierName}
					cashierInn={cashierInn}
					clinicName={clinicName}
					clinicInn={clinicInn}
				/>
			</section>

			{/* Fast Payment & Doctor Autonomy Panel */}
			<div className="bg-[var(--paper)] border border-[var(--line)] rounded-lg p-4 shadow-sm">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
					<div className="flex items-center gap-2">
						<Banknote className="w-5 h-5 text-[var(--brand)]" />
						<h2 className="text-base font-semibold text-[var(--ink)]">
							Касса 54-ФЗ и расчеты (Мандат 8e / 8n)
						</h2>
					</div>
					<div className="flex items-center gap-2">
						<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))]">
							<ShieldCheck className="w-3.5 h-3.5" />
							54-ФЗ: без барьеров для физлиц
						</span>
					</div>
				</div>

				{/* Doctor Discount Autonomy Row (Up to 100% without admin password) */}
				<div className="mb-4 p-3 bg-[var(--paper-soft,#f8fafc)] rounded-md border border-[var(--line)]">
					<div className="text-xs font-semibold text-[var(--ink)] mb-2 flex items-center gap-1.5">
						<Tag className="w-3.5 h-3.5 text-[var(--brand)]" />
						Скидки врача (Мандат 8e п. 7 — без мастер-пароля):
					</div>
					<div className="flex flex-wrap gap-2 items-center">
						<button
							type="button"
							className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
								isWarranty
									? "bg-[var(--warning-fg,#b45309)] text-white font-semibold shadow-sm"
									: "bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-hover,#f1f5f9)]"
							}`}
							onClick={() => {
								setIsWarranty(!isWarranty);
								setIsStaffColleague(false);
							}}
						>
							100% Гарантия / Переделка
						</button>

						<button
							type="button"
							className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
								isStaffColleague
									? "bg-[var(--brand)] text-white font-semibold shadow-sm"
									: "bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-hover,#f1f5f9)]"
							}`}
							onClick={() => {
								setIsStaffColleague(!isStaffColleague);
								setIsWarranty(false);
							}}
						>
							100% Персонал / Семья врача
						</button>

						{[50, 20, 10].map((pct) => (
							<button
								key={pct}
								type="button"
								className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
									discountPercent === pct && !isWarranty && !isStaffColleague
										? "bg-[var(--brand)] text-white font-semibold shadow-sm"
										: "bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-hover,#f1f5f9)]"
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
								className="text-xs text-[var(--muted)] hover:text-[var(--danger)] underline ml-auto"
								onClick={() => {
									setIsWarranty(false);
									setIsStaffColleague(false);
									setDiscountPercent(0);
								}}
							>
								Сбросить скидки
							</button>
						)}
					</div>
				</div>

				{/* Payer Type & 54-FZ INN Logic */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<div>
						<label className="block text-xs font-medium text-[var(--muted)] mb-1">
							Тип покупателя (54-ФЗ тег 1228)
						</label>
						<div className="flex gap-2">
							<button
								type="button"
								className={`flex-1 py-1.5 px-3 rounded text-xs font-medium border ${
									payerType === "physical_person"
										? "bg-[var(--brand)] text-white border-[var(--brand)]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
								}`}
								onClick={() => setPayerType("physical_person")}
							>
								Физическое лицо (без ИНН)
							</button>
							<button
								type="button"
								className={`flex-1 py-1.5 px-3 rounded text-xs font-medium border ${
									payerType === "legal_entity"
										? "bg-[var(--brand)] text-white border-[var(--brand)]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
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
							className="w-full text-xs px-3 py-1.5 rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
						/>
						{innValidation.errorRu && (
							<p className="text-[11px] text-[var(--warning-fg)] mt-1">{innValidation.errorRu}</p>
						)}
					</div>
				</div>

				{/* Financial Summary & 1-Click Tenders */}
				<div className="bg-[var(--paper-soft,#f8fafc)] border border-[var(--line)] rounded-md p-3">
					<div className="flex items-center justify-between mb-3">
						<span className="text-xs text-[var(--muted)]">Итого к оплате:</span>
						<span className="text-lg font-bold text-[var(--ink)]">
							{checkoutResult.totalNetRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>

					{checkoutResult.isZeroDue ? (
						<div className="p-2.5 rounded bg-[var(--ok-bg,rgba(16,185,129,0.1))] border border-[var(--ok-fg,rgba(16,185,129,0.2))] text-xs text-[var(--ok-fg,#10b981)] font-medium text-center">
							{checkoutResult.statusBannerText}
						</div>
					) : (
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[var(--brand)] text-white text-xs font-medium shadow-sm hover:opacity-95"
								onClick={() => handleAllocateAll("card")}
							>
								<CreditCard className="w-3.5 h-3.5" />
								Всё картой
							</button>

							<button
								type="button"
								className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[var(--teal)] text-white text-xs font-medium shadow-sm hover:opacity-95"
								onClick={() => handleAllocateAll("cash")}
							>
								<Banknote className="w-3.5 h-3.5" />
								Всё наличными
							</button>

							<button
								type="button"
								className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[var(--brand)] text-white text-xs font-medium shadow-sm hover:opacity-95"
								onClick={() => handleAllocateAll("sbp")}
							>
								<QrCode className="w-3.5 h-3.5" />
								Всё по СБП
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default CashboxView;
