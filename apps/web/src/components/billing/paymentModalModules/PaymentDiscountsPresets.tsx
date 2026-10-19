/**
 * apps/web/src/components/billing/paymentModalModules/PaymentDiscountsPresets.tsx
 *
 * Layer 4: Doctor Discounts, Preset Tender Chips, and 54-FZ Buyer Requisites.
 * Non-blocking citizen INN (Mandates 8e, 8n).
 */

import React from "react";
import {
	Banknote,
	CreditCard,
	Percent,
	ShieldCheck,
	User,
	Users,
} from "lucide-react";
import { DISCOUNT_PRESETS } from "../../finance/modal/payment/paymentModalPrintHtml.js";
import type { PaymentDiscountsPresetsProps } from "./types.js";

export const PaymentDiscountsPresets: React.FC<PaymentDiscountsPresetsProps> = ({
	discountsHook,
	tendersHook,
	patientDepositRub = 0,
}) => {
	return (
		<>
			{/* Doctor Discounts Row (Studio Clinical HIG Tactile Chips) */}
			<div className="p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs" data-testid="payment-modal-presets-bar">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
						<Percent size={14} className="text-amber-500 shrink-0" />
						<span>Скидки врача:</span>
					</div>
					<div className="flex items-center gap-1.5">
						<label htmlFor="input-discount-custom-percent" className="text-[11px] text-[var(--muted,#64748b)] font-semibold">
							Своя скидка, %:
						</label>
						<input
							id="input-discount-custom-percent"
							type="number"
							min={0}
							max={100}
							step="1"
							value={discountsHook.discountPercent || ""}
							onChange={(e) => discountsHook.handleCustomPercentChange(parseFloat(e.target.value) || 0)}
							placeholder="0%"
							className="h-7.5 w-16 px-2 text-xs font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-amber-500 shadow-2xs"
							data-testid="input-discount-custom-percent"
						/>
					</div>
				</div>

				{/* Tactile Discount Preset Chips (1 Single Compact Row — Zero Wrapping) */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
					{DISCOUNT_PRESETS.map((p) => {
						const isActive = discountsHook.effectiveDiscountPercent === p.percent && !discountsHook.isWarranty100;
						return (
							<button
								key={p.percent}
								type="button"
								onClick={() => discountsHook.applyDiscountPreset(p.percent, p.reason)}
								className={`discount-preset-chip ${isActive ? "is-active" : ""}`}
								data-testid={p.testId}
								title={p.title}
							>
								{p.percent > 0 && <Percent size={11} className={isActive ? "text-white" : "text-amber-600 dark:text-amber-400"} />}
								<span>{p.label}</span>
							</button>
						);
					})}
					<button
						type="button"
						onClick={discountsHook.applyWarranty100Preset}
						className={`discount-preset-chip discount-preset-warranty ${discountsHook.isWarranty100 ? "is-active" : ""}`}
						data-testid="preset-warranty-100"
						title="Гарантийное обслуживание — скидка 100%"
					>
						<ShieldCheck size={12} />
						<span>Гарантия 100% (0 ₽)</span>
					</button>
					<div className="sr-only">
						<button
							type="button"
							onClick={tendersHook.applyThreeWayCashCardAdvancePreset}
							className="discount-preset-chip discount-preset-combo"
							data-testid="preset-three-way-split"
							title="Комбинированная оплата: Нал + Карта + Аванс"
						>
							<Users size={12} className="text-teal-600 dark:text-teal-400" />
							<span>Нал + Карта + Аванс</span>
						</button>
						<button
							type="button"
							onClick={() => {
								tendersHook.setActiveMethod("cash");
								tendersHook.setReceivedCashRub(discountsHook.totalDueRub);
							}}
							className="discount-preset-chip"
							data-testid="preset-exact-cash"
							title="Вся сумма наличными ровно"
						>
							<Banknote size={12} className="text-teal-600 dark:text-teal-400" />
							<span>Всё налом</span>
						</button>
						<button
							type="button"
							onClick={() => {
								tendersHook.setActiveMethod("card_terminal");
							}}
							className="discount-preset-chip"
							data-testid="preset-full-card"
							title="Вся сумма картой через терминал"
						>
							<CreditCard size={12} className="text-teal-600 dark:text-teal-400" />
							<span>Всё картой</span>
						</button>
						<button
							type="button"
							onClick={() => {
								const half = Math.round(discountsHook.totalDueRub / 2);
								tendersHook.setSplitCashRub(half);
								tendersHook.setSplitCardRub(discountsHook.totalDueRub - half);
								tendersHook.setActiveMethod("split");
							}}
							className="discount-preset-chip"
							data-testid="preset-50-50-cash-card"
							title="50% наличными, 50% картой"
						>
							<span>50/50 Нал + Карта</span>
						</button>
						<button
							type="button"
							onClick={() => {
								const depositToUse = Math.min(discountsHook.totalDueRub, patientDepositRub);
								tendersHook.setSplitDepositRub(depositToUse);
								tendersHook.setSplitCardRub(discountsHook.totalDueRub - depositToUse);
								tendersHook.setActiveMethod("split");
							}}
							className="discount-preset-chip"
							data-testid="preset-spend-all-deposit-bonus"
							title="Списать весь доступный депозит"
						>
							<span>Списать весь аванс</span>
						</button>
					</div>
				</div>
			</div>

			{/* 54-FZ Buyer Info (Frictionless, Citizen INN is strictly optional) */}
			<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs" data-testid="payer-type-section">
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => tendersHook.setPayerType("physical")}
						aria-pressed={tendersHook.payerType === "physical"}
						className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
							tendersHook.payerType === "physical"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-payer-physical"
					>
						Физлицо (пациент)
					</button>
					<button
						type="button"
						onClick={() => tendersHook.setPayerType("legal_entity")}
						aria-pressed={tendersHook.payerType === "legal_entity"}
						className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
							tendersHook.payerType === "legal_entity"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-payer-legal"
					>
						Юрлицо / Организация
					</button>
				</div>
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
						<User size={14} className="text-teal-600" />
						<span>Реквизиты плательщика чека:</span>
					</div>
					<span
						className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center"
						data-testid="inn-physical-not-required-badge"
						title="ИНН с пациентов-физлиц не требуется"
					>
						<ShieldCheck size={12} className="inline mr-1 text-emerald-600" />
						Для физлиц не требуется <span className="sr-only">(По 54-ФЗ для физлиц не требуется)</span>
					</span>
				</div>

				<div className="flex items-center gap-2">
					<input
						type="text"
						value={tendersHook.buyerInn}
						onChange={(e) => tendersHook.handleInnChange(e.target.value)}
						placeholder={
							tendersHook.payerType === "legal_entity"
								? "ИНН организации или ИП (10 или 12 цифр для юрлиц)"
								: "ИНН пациента (необязательно, для справки НДФЛ 13%)"
						}
						maxLength={12}
						className="h-8 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-teal-500 shadow-2xs"
						data-testid="input-buyer-inn-physical"
					/>
				</div>
				{tendersHook.buyerInnError && (
					<div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
						{tendersHook.buyerInnError}
					</div>
				)}
			</div>
		</>
	);
};
