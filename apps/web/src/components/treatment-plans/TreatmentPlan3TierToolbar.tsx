/**
 * TreatmentPlan3TierToolbar.tsx — Верхняя панель управления 3-Tier сравнения планов (DENTE CRM).
 *
 * Содержит:
 * 1. Заголовок и бейдж соответствия стандартам СтАР.
 * 2. Переключатель сценариев оплаты (Рассрочка 0%, Этапы 30/40/30, Скидка 5% за 100% оплату).
 * 3. Селектор срока рассрочки (3, 6, 12, 24 мес).
 * 4. Тумблер налогового вычета 13% НДФЛ.
 * 5. Кнопку копирования сметы в мессенджер (WhatsApp / Telegram).
 * 6. Кнопки вызова полноэкранных студий (Студия сравнения, Эскроу/депозиты, Валидация цен).
 */

import React from "react";
import {
	Check,
	Coins,
	FileCheck,
	Share2,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "./types";

export interface TreatmentPlan3TierToolbarProps {
	readonly activePaymentMode: "installment" | "staged" | "discount";
	readonly onPaymentModeChange: (mode: "installment" | "staged" | "discount") => void;
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly onInstallmentMonthsChange: (months: 3 | 6 | 12 | 24) => void;
	readonly showNdflBreakdown: boolean;
	readonly onToggleNdflBreakdown: () => void;
	readonly activeTier: TreatmentPlanTier;
	readonly copiedMessengerTierId: TreatmentPlanTierId | null;
	readonly onCopyEstimateToMessenger: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onOpenComparatorStudio?: (() => void) | undefined;
	readonly onOpenStagePaymentStudio?: (() => void) | undefined;
	readonly onOpenPriceValidatorStudio?: (() => void) | undefined;
}

export const TreatmentPlan3TierToolbar: React.FC<TreatmentPlan3TierToolbarProps> = ({
	activePaymentMode,
	onPaymentModeChange,
	installmentMonths,
	onInstallmentMonthsChange,
	showNdflBreakdown,
	onToggleNdflBreakdown,
	activeTier,
	copiedMessengerTierId,
	onCopyEstimateToMessenger,
	onOpenComparatorStudio,
	onOpenStagePaymentStudio,
	onOpenPriceValidatorStudio,
}) => {
	return (
		<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] text-xs text-[var(--ink,#0f172a)]">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="p-2 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20 shrink-0">
					<Sparkles size={16} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-black text-xs sm:text-sm text-[var(--ink,#0f172a)] whitespace-normal sm:whitespace-nowrap shrink-0">
							3-Tier Сравнение планов (Эконом / Оптимум / Премиум)
						</span>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20 whitespace-nowrap">
							Стандарты СтАР
						</span>
					</div>
					<p className="text-[11px] text-[var(--muted,#64748b)] m-0 mt-0.5 leading-relaxed break-words">
						Интерактивное сравнение клинических этапов, сроков, гарантий и программ оплаты 0%
					</p>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2 shrink-0">
				{/* Payment Mode Selector with 32px standard height */}
				<div className="flex flex-wrap items-center gap-2 p-1 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))]">
					<button
						type="button"
						onClick={() => onPaymentModeChange("installment")}
						className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap ${
							activePaymentMode === "installment"
								? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Рассрочка 0%
					</button>
					<button
						type="button"
						onClick={() => onPaymentModeChange("staged")}
						className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap ${
							activePaymentMode === "staged"
								? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Этапы (30/40/30)
					</button>
					<button
						type="button"
						onClick={() => onPaymentModeChange("discount")}
						className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap ${
							activePaymentMode === "discount"
								? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Скидка 5% (100%)
					</button>
				</div>

				{/* Term Selector (when in installment mode) */}
				{activePaymentMode === "installment" && (
					<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] p-1 rounded-xl border border-[var(--line,var(--border,#cbd5e1))]">
						{[3, 6, 12, 24].map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => onInstallmentMonthsChange(m as 3 | 6 | 12 | 24)}
								className={`min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 px-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap ${
									installmentMonths === m
										? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								{m}м
							</button>
						))}
					</div>
				)}

				{/* NDFL Toggle */}
				<button
					type="button"
					onClick={onToggleNdflBreakdown}
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
						showNdflBreakdown
							? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
							: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border-[var(--line,var(--border,#cbd5e1))]"
					}`}
					title="Показать расчет налогового вычета 13% по НК РФ"
				>
					<ShieldCheck size={14} className="shrink-0" />
					<span>Вычет 13%</span>
				</button>

				{/* Messenger Share Button for Active Tier */}
				<button
					type="button"
					onClick={(e) => onCopyEstimateToMessenger(e, activeTier)}
					className="min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors whitespace-nowrap"
					title="Скопировать смету выбранного тарифа для WhatsApp / Telegram (понятный пациенту формат)"
					data-testid="top-copy-messenger-btn"
				>
					{copiedMessengerTierId === activeTier.tierId ? (
						<>
							<Check size={13} className="text-emerald-600 shrink-0" />
							<span className="text-emerald-600">Скопировано!</span>
						</>
					) : (
						<>
							<Share2 size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span>Смета (WhatsApp)</span>
						</>
					)}
				</button>

				{/* Comparator Studio Modal Button */}
				{onOpenComparatorStudio && (
					<button
						type="button"
						onClick={onOpenComparatorStudio}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors whitespace-nowrap"
						title="Открыть полноэкранную презентационную студию сравнения"
					>
						<Sparkles size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span className="hidden sm:inline">Студия</span>
					</button>
				)}

				{/* Stage Payment Modal Button */}
				{onOpenStagePaymentStudio && (
					<button
						type="button"
						onClick={onOpenStagePaymentStudio}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors whitespace-nowrap"
						title="Открыть студию поэтапной оплаты и эскроу-депозитов"
					>
						<Coins size={13} className="text-amber-500 shrink-0" />
						<span className="hidden sm:inline">Эскроу</span>
					</button>
				)}

				{/* Price Validator Modal Button */}
				{onOpenPriceValidatorStudio && (
					<button
						type="button"
						onClick={onOpenPriceValidatorStudio}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors whitespace-nowrap"
						title="Проверить цены по прайсу и протоколам СтАР"
					>
						<FileCheck size={13} className="text-emerald-600 shrink-0" />
						<span className="hidden sm:inline">Валидация</span>
					</button>
				)}
			</div>
		</div>
	);
};

export default TreatmentPlan3TierToolbar;
