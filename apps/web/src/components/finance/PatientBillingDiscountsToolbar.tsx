import React from "react";
import { Percent, Sparkles, ShieldCheck, X } from "lucide-react";
import { type LoyaltyDiscountPreset } from "./fiscal/fiscal54fzEngine";

export interface PatientBillingDiscountsToolbarProps {
	readonly discountPreset: LoyaltyDiscountPreset;
	readonly onSetDiscountPreset: (preset: LoyaltyDiscountPreset) => void;
	readonly customDiscountPercent: number;
	readonly onSetCustomDiscountPercent: (val: number) => void;
	readonly customDiscountRub: number;
	readonly onSetCustomDiscountRub: (val: number) => void;
	readonly discountResult: {
		readonly totalGrossRub: number;
		readonly totalNetRub: number;
		readonly totalDiscountRub: number;
		readonly effectivePercent: number;
		readonly savingsText: string;
	};
	readonly totalNetRub: number;
	readonly onInputEnterKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const PatientBillingDiscountsToolbar: React.FC<PatientBillingDiscountsToolbarProps> = ({
	discountPreset,
	onSetDiscountPreset,
	customDiscountPercent,
	onSetCustomDiscountPercent,
	customDiscountRub,
	onSetCustomDiscountRub,
	discountResult,
	totalNetRub,
	onInputEnterKeyDown,
}) => {
	return (
		<>
			{/* Loyalty Discount Toolbar (Compact 36px Tier 2 Dropdown + 1-Tap Round-off & Quick Pills) */}
			<div
				className="px-4 sm:px-6 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs min-h-[36px]"
				data-testid="billing-discount-toolbar"
			>
				<div className="flex items-center gap-2 font-bold text-[var(--ink)] flex-wrap">
					<div className="flex items-center gap-1.5">
						<Percent className="w-4 h-4 text-[var(--brand-primary,#0d9488)]" />
						<span>Скидка:</span>
					</div>
					<select
						value={discountPreset}
						onChange={(e) => onSetDiscountPreset(e.target.value as LoyaltyDiscountPreset)}
						className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-[var(--paper)] dark:bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] text-[var(--ink)] focus:border-[var(--teal,#0d9488)] outline-none cursor-pointer transition-colors shadow-2xs"
						data-testid="select-loyalty-discount"
					>
						<option value="none">Без скидки</option>
						<option value="round_hundreds">Округлить до сотен рублей</option>
						<option value="discount_3">Скидка 3%</option>
						<option value="discount_5">Скидка 5%</option>
						<option value="discount_10">Скидка 10%</option>
						<option value="warranty_100">Гарантийная переделка 100% (Врач)</option>
						<option value="colleague_100">Персонал / Коллеги 100%</option>
						<option value="pensioner_10">Пенсионная 10%</option>
						<option value="family_5">Семейная 5%</option>
						<option value="employee_20">Сотрудник 20%</option>
						<option value="manual_percent">Своя скидка (%) до 100%</option>
						<option value="manual_rub">Сумма скидки (₽) до 100%</option>
					</select>

					{/* 1-Tap Round to Hundreds & Quick Discount Pills (Mandate 8e) */}
					<div className="flex items-center gap-1 flex-wrap">
						<button
							type="button"
							onClick={() => onSetDiscountPreset("round_hundreds")}
							className={`min-h-[44px] px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
								discountPreset === "round_hundreds"
									? "bg-amber-600 text-white shadow-2xs"
									: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30"
							}`}
							data-testid="btn-round-hundreds"
							title="Округлить сумму чека до сотен рублей (скидка на копейки в пользу пациента)"
						>
							<Sparkles className="w-3.5 h-3.5 shrink-0" />
							<span>До сотен ₽</span>
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("discount_3")}
							className={`min-h-[44px] min-w-[44px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
								discountPreset === "discount_3"
									? "bg-teal-600 text-white shadow-2xs"
									: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--border,#cbd5e1)]"
							}`}
							data-testid="btn-discount-3"
							title="Быстрая скидка 3% без мастер-паролей"
						>
							3%
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("discount_5")}
							className={`min-h-[44px] min-w-[44px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
								discountPreset === "discount_5"
									? "bg-teal-600 text-white shadow-2xs"
									: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--border,#cbd5e1)]"
							}`}
							data-testid="btn-discount-5"
							title="Быстрая скидка 5% без мастер-паролей"
						>
							5%
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("discount_10")}
							className={`min-h-[44px] min-w-[44px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
								discountPreset === "discount_10"
									? "bg-teal-600 text-white shadow-2xs"
									: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--border,#cbd5e1)]"
							}`}
							data-testid="btn-discount-10"
							title="Быстрая скидка 10% без мастер-паролей"
						>
							10%
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("warranty_100")}
							className={`min-h-[44px] px-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
								discountPreset === "warranty_100"
									? "bg-blue-600 text-white shadow-2xs"
									: "bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
							}`}
							data-testid="btn-discount-warranty"
							title="100% гарантийная переделка клинического этапа (к оплате 0 ₽, без блокировок)"
						>
							<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
							<span>100% Гарантия</span>
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("colleague_100")}
							className={`min-h-[44px] px-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
								discountPreset === "colleague_100"
									? "bg-purple-600 text-white shadow-2xs"
									: "bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
							}`}
							data-testid="btn-discount-colleague"
							title="100% скидка для медицинского персонала и коллег"
						>
							<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
							<span>Персонал 100%</span>
						</button>
						{discountPreset !== "none" && (
							<button
								type="button"
								onClick={() => {
									onSetDiscountPreset("none");
									onSetCustomDiscountPercent(0);
									onSetCustomDiscountRub(0);
								}}
								className="min-h-[44px] px-2.5 rounded-xl text-xs font-bold bg-[var(--paper)] hover:bg-[var(--paper-hover)] text-[var(--muted)] border border-[var(--border,#cbd5e1)] cursor-pointer inline-flex items-center gap-1"
								title="Сбросить скидку"
								data-testid="btn-discount-reset"
							>
								<X size={13} className="shrink-0" />
								<span>Сброс</span>
							</button>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{discountPreset === "manual_percent" && (
						<div className="flex items-center gap-1.5">
							<input
								type="number"
								min={0}
								max={100}
								value={customDiscountPercent || ""}
								onChange={(e) => onSetCustomDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
								onKeyDown={onInputEnterKeyDown}
								placeholder="0%"
								className="h-8 w-20 px-2.5 py-1 text-xs font-bold bg-[var(--paper)] dark:bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl text-[var(--ink)] outline-none focus:border-[var(--teal,#0d9488)]"
							/>
							<span className="font-bold text-[var(--ink)]">%</span>
						</div>
					)}

					{discountPreset === "manual_rub" && (
						<div className="flex items-center gap-1.5">
							<input
								type="number"
								min={0}
								max={discountResult.totalGrossRub}
								value={customDiscountRub || ""}
								onChange={(e) => onSetCustomDiscountRub(Math.max(0, parseFloat(e.target.value) || 0))}
								onKeyDown={onInputEnterKeyDown}
								placeholder="0 ₽"
								className="h-8 w-24 px-2.5 py-1 text-xs font-bold bg-[var(--paper)] dark:bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl text-[var(--ink)] outline-none focus:border-[var(--teal,#0d9488)]"
							/>
							<span className="font-bold text-[var(--ink)]">₽</span>
						</div>
					)}

					{discountResult.totalDiscountRub > 0 && (
						<div className="h-8 px-3 rounded-xl bg-[var(--ok-bg,#f0fdf4)] border border-[var(--ok-fg,#059669)]/30 text-[var(--ok-fg,#059669)] font-extrabold flex items-center gap-1.5 text-xs whitespace-nowrap">
							<Sparkles className="w-3.5 h-3.5 text-[var(--ok-fg,#059669)] shrink-0" />
							<span>{discountResult.savingsText} ({discountResult.effectivePercent}%)</span>
						</div>
					)}
				</div>
			</div>

			{/* Round-off 100 Rubles Banner */}
			{discountPreset === "round_hundreds" && (
				<div
					className="px-4 sm:px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between gap-2 flex-wrap"
					data-testid="round-hundreds-banner"
				>
					<div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
						<Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
						<span>Округление до сотен: копейки списаны в пользу пациента. К оплате ровно {totalNetRub.toLocaleString("ru-RU")} ₽</span>
					</div>
					<span className="text-[11px] font-mono text-amber-700 dark:text-amber-300">
						Точность до копейки
					</span>
				</div>
			)}

			{/* Warranty 100% Banner */}
			{discountPreset === "warranty_100" && (
				<div
					className="px-4 sm:px-6 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between gap-2 flex-wrap"
					data-testid="warranty-rework-banner"
				>
					<div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
						<ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
						<span>100% Гарантийная переделка: стоимость услуг списана в 0 ₽</span>
					</div>
					<span className="text-[11px] font-mono text-blue-700 dark:text-blue-300">
						Чек 0 ₽ / Гарантия
					</span>
				</div>
			)}

			{/* Colleague / Staff 100% Banner */}
			{discountPreset === "colleague_100" && (
				<div
					className="px-4 sm:px-6 py-2 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between gap-2 flex-wrap"
					data-testid="colleague-discount-banner"
				>
					<div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200">
						<ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
						<span>100% Скидка сотруднику: лечение персонала</span>
					</div>
					<span className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
						Чек 0 ₽ / Персонал
					</span>
				</div>
			)}
		</>
	);
};
