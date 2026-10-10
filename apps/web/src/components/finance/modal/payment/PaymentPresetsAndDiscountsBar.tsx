/**
 * apps/web/src/components/finance/modal/payment/PaymentPresetsAndDiscountsBar.tsx
 *
 * Doctor discount presets (0%, 5%, 10%, 15%, 20%, 50%, warranty 100%) and 1-click tender presets.
 */

import React from "react";
import {
	Banknote,
	Coins,
	CreditCard,
	Percent,
	QrCode,
	ShieldCheck,
	Users,
	Wallet,
	Zap,
} from "lucide-react";
import { DISCOUNT_PRESETS } from "./paymentModalPrintHtml.js";
import type { PaymentMethodTab } from "./paymentModalTypes.js";

export interface PaymentPresetsAndDiscountsBarProps {
	readonly discountRub: number;
	readonly effectiveDiscountPercent: number;
	readonly discountReason: string;
	readonly discountPercent: number;
	readonly handleCustomPercentChange: (val: number) => void;
	readonly applyDiscountPreset: (percent: number, reason: string) => void;
	readonly applyWarranty100Preset: () => void;
	readonly isWarranty100: boolean;
	readonly applyExactCashPreset: () => void;
	readonly applySpendAllDepositBonusPreset: () => void;
	readonly apply5050CashCardPreset: () => void;
	readonly applyThreeWayCashCardAdvancePreset: () => void;
	readonly applyFullCardPreset: () => void;
	readonly applyDepositPlusCardPreset: () => void;
	readonly setActiveMethod: (m: PaymentMethodTab) => void;
	readonly activeMethod: PaymentMethodTab;
	readonly cashChange: { isExact: boolean };
	readonly totalDueRub: number;
	readonly splitDepositRub: number;
	readonly splitBonusRub: number;
	readonly splitCashRub: number;
	readonly splitCardRub: number;
	readonly patientDepositRub?: number | undefined;
}

export const PaymentPresetsAndDiscountsBar: React.FC<PaymentPresetsAndDiscountsBarProps> = ({
	discountRub,
	effectiveDiscountPercent,
	discountReason,
	discountPercent,
	handleCustomPercentChange,
	applyDiscountPreset,
	applyWarranty100Preset,
	isWarranty100,
	applyExactCashPreset,
	applySpendAllDepositBonusPreset,
	apply5050CashCardPreset,
	applyThreeWayCashCardAdvancePreset,
	applyFullCardPreset,
	applyDepositPlusCardPreset,
	setActiveMethod,
	activeMethod,
	cashChange,
	totalDueRub,
	splitDepositRub,
	splitBonusRub,
	splitCashRub,
	splitCardRub,
	patientDepositRub = 0,
}) => {
	return (
		<div
			className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs"
			data-testid="payment-modal-presets-bar"
		>
			{/* Doctor Discounts Row */}
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
					<Percent size={14} className="text-amber-500 shrink-0" />
					<span>Скидки врача:</span>
					{discountRub > 0 && (
						<span
							className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
							data-testid="badge-discount-active"
						>
							-{effectiveDiscountPercent}% ({discountRub.toLocaleString("ru-RU")} ₽)
							{discountReason ? ` • ${discountReason}` : ""}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5">
					<label
						htmlFor="input-discount-custom-percent"
						className="text-[11px] font-medium text-[var(--muted,#64748b)]"
					>
						Своя скидка, %:
					</label>
					<div className="relative">
						<input
							id="input-discount-custom-percent"
							type="number"
							min={0}
							max={100}
							step="1"
							value={discountPercent || ""}
							onChange={(e) => handleCustomPercentChange(parseFloat(e.target.value) || 0)}
							placeholder="0%"
							data-testid="input-discount-custom-percent"
							className="h-8 w-20 px-2 text-xs font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-amber-500"
						/>
						<span className="absolute right-2 top-2 text-[10px] text-[var(--muted,#64748b)] pointer-events-none">
							%
						</span>
					</div>
				</div>
			</div>

			{/* 1-Click Discount Preset Buttons */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
				{DISCOUNT_PRESETS.map((p) => {
					const isActive = effectiveDiscountPercent === p.percent && !isWarranty100;
					const isZero = p.percent === 0;
					const activeClass = isZero
						? "bg-slate-700 text-white border-slate-700 shadow-2xs"
						: "bg-amber-600 text-white border-amber-600 shadow-2xs";
					const inactiveClass = isZero
						? "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-slate-400 text-[var(--ink,#0f172a)]"
						: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]";
					return (
						<button
							key={p.percent}
							type="button"
							onClick={() => applyDiscountPreset(p.percent, p.reason)}
							className={`h-8 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
								isActive ? activeClass : inactiveClass
							}`}
							data-testid={p.testId}
							title={p.title}
						>
							{!isZero && (
								<Percent
									size={12}
									className={isActive ? "text-white" : "text-amber-600"}
								/>
							)}
							<span className="truncate">{p.label}</span>
						</button>
					);
				})}

				<button
					type="button"
					onClick={applyWarranty100Preset}
					className={`h-8 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
						isWarranty100
							? "bg-amber-600 text-white border-amber-600 shadow-2xs"
							: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
					}`}
					data-testid="preset-warranty-100"
					title="Гарантийная переделка 100% (0 ₽, без фискального чека ККТ)"
				>
					<ShieldCheck size={14} className={isWarranty100 ? "text-white" : "text-amber-600"} />
					<span className="truncate">Гарантия 100% (0 ₽)</span>
				</button>
			</div>

			{/* Quick Tender Presets Row */}
			<div className="pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 font-bold text-[var(--muted,#64748b)]">
					<Zap size={14} className="text-amber-500 shrink-0" />
					<span>Быстрые сценарии оплаты:</span>
				</div>
			</div>
			<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
				<button
					type="button"
					onClick={applyExactCashPreset}
					className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
						activeMethod === "cash" && cashChange.isExact
							? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
							: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
					}`}
					data-testid="preset-exact-cash"
				>
					<Banknote
						size={14}
						className={
							activeMethod === "cash" && cashChange.isExact ? "text-white" : "text-emerald-600"
						}
					/>
					<span className="truncate">
						Без сдачи (Ровно: {totalDueRub.toLocaleString("ru-RU")} ₽)
					</span>
				</button>
				<button
					type="button"
					onClick={applySpendAllDepositBonusPreset}
					className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
						activeMethod === "family_deposit" ||
						(activeMethod === "split" && (splitDepositRub > 0 || splitBonusRub > 0))
							? "bg-purple-600 text-white border-purple-600 shadow-2xs"
							: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
					}`}
					data-testid="preset-spend-all-deposit-bonus"
					title="Списать весь доступный аванс или бонусы"
				>
					<Wallet
						size={14}
						className={
							activeMethod === "family_deposit" ||
							(activeMethod === "split" && (splitDepositRub > 0 || splitBonusRub > 0))
								? "text-white"
								: "text-purple-600"
						}
					/>
					<span className="truncate">Списать аванс/бонусы</span>
				</button>
				<button
					type="button"
					onClick={apply5050CashCardPreset}
					className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
						activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0
							? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
							: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-indigo-400 text-[var(--ink,#0f172a)]"
					}`}
					data-testid="preset-50-50-cash-card"
					title="50% суммы наличными в кассу + 50% картой через терминал"
				>
					<Coins
						size={14}
						className={
							activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0
								? "text-white"
								: "text-indigo-600"
						}
					/>
					<span className="truncate">50/50 Нал + Карта</span>
				</button>
				<button
					type="button"
					onClick={applyThreeWayCashCardAdvancePreset}
					className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
						activeMethod === "split" &&
						splitCashRub > 0 &&
						splitCardRub > 0 &&
						splitDepositRub > 0
							? "bg-teal-600 text-white border-teal-600 shadow-2xs"
							: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
					}`}
					data-testid="preset-three-way-split"
					title="Комбинированная оплата: Нал + Карта + Аванс"
				>
					<Users
						size={14}
						className={
							activeMethod === "split" &&
							splitCashRub > 0 &&
							splitCardRub > 0 &&
							splitDepositRub > 0
								? "text-white"
								: "text-teal-600"
						}
					/>
					<span className="truncate">Нал + Карта + Аванс</span>
				</button>
				<button
					type="button"
					onClick={applyFullCardPreset}
					className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
						activeMethod === "card_terminal"
							? "bg-blue-600 text-white border-blue-600 shadow-2xs"
							: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
					}`}
					data-testid="preset-full-card"
				>
					<CreditCard
						size={14}
						className={activeMethod === "card_terminal" ? "text-white" : "text-blue-600"}
					/>
					<span className="truncate">
						Картой 100% ({totalDueRub.toLocaleString("ru-RU")} ₽)
					</span>
				</button>
				{patientDepositRub > 0 && (
					<button
						type="button"
						onClick={applyDepositPlusCardPreset}
						className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
							activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0
								? "bg-purple-600 text-white border-purple-600 shadow-2xs"
								: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
						}`}
						data-testid="preset-deposit-plus-card"
					>
						<Wallet
							size={14}
							className={
								activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0
									? "text-white"
									: "text-purple-600"
							}
						/>
						<span className="truncate">
							Весь аванс ({Math.min(totalDueRub, patientDepositRub).toLocaleString("ru-RU")} ₽) +
							Карта
						</span>
					</button>
				)}
				<button
					type="button"
					onClick={() => setActiveMethod("sbp_qr")}
					className="h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-teal-400 text-[var(--ink,#0f172a)] shrink-0"
					data-testid="preset-sbp-qr"
					title="Сформировать QR СБП для быстрой оплаты пациентом"
				>
					<QrCode size={14} className="text-teal-600" />
					<span className="truncate">
						Оплата СБП по QR ({totalDueRub.toLocaleString("ru-RU")} ₽)
					</span>
				</button>
			</div>
		</div>
	);
};
