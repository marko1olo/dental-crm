/**
 * TreatmentPlan3TierToolbar.tsx — Верхняя панель управления 3-Tier сравнения планов (DENTE CRM).
 *
 * Содержит:
 * 1. Заголовок и бейдж соответствия стандартам СтАР.
 * 2. Переключатель сценариев оплаты (Рассрочка 0%, Этапы 30/40/30, Скидка 5% за 100% оплату) — сегментированный контрол.
 * 3. Селектор срока рассрочки (3, 6, 12, 24 мес).
 * 4. Кнопку копирования сметы в мессенджер (WhatsApp / Telegram) для активного тарифа.
 * 5. Выпадающее меню [ ⚙ Параметры сметы ▾ ] (Вычет 13% НДФЛ, Студия сравнения, Эскроу, Валидация цен) — устранение Button Landfill.
 */

import React, { useState, useRef, useEffect } from "react";
import {
	Check,
	ChevronDown,
	Coins,
	FileCheck,
	Settings,
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
	readonly initialParamsOpen?: boolean;
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
	initialParamsOpen = false,
}) => {
	const [isParamsOpen, setIsParamsOpen] = useState(initialParamsOpen);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsParamsOpen(false);
			}
		};
		if (isParamsOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isParamsOpen]);

	return (
		<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] text-xs text-[var(--ink,#0f172a)] shadow-2xs">
			{/* Left: Module Title & Clinical Standards Badge */}
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

			{/* Right: Streamlined Controls (Segmented Modes + Messenger Share + Params Dropdown) */}
			<div className="flex flex-wrap items-center gap-2 shrink-0">
				{/* Payment Mode Selector: Segmented Control */}
				<div
					className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] shadow-2xs gap-1"
					role="group"
					aria-label="Режим расчета оплаты"
				>
					<button
						type="button"
						onClick={() => onPaymentModeChange("installment")}
						className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap touch-manipulation ${
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
						className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap touch-manipulation ${
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
						className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap touch-manipulation ${
							activePaymentMode === "discount"
								? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Скидка 5% (100%)
					</button>
				</div>

				{/* Term Selector (Active in installment mode) */}
				{activePaymentMode === "installment" && (
					<div
						className="inline-flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] p-1 rounded-xl border border-[var(--line,var(--border,#cbd5e1))] shadow-2xs"
						role="group"
						aria-label="Срок рассрочки"
					>
						{[3, 6, 12, 24].map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => onInstallmentMonthsChange(m as 3 | 6 | 12 | 24)}
								className={`min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 px-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap touch-manipulation ${
									installmentMonths === m
										? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)]"
								}`}
								title={`${m} месяцев рассрочки`}
							>
								{m}м
							</button>
						))}
					</div>
				)}

				{/* Messenger Share Button for Active Tier */}
				<button
					type="button"
					onClick={(e) => onCopyEstimateToMessenger(e, activeTier)}
					className="min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors whitespace-nowrap shadow-xs touch-manipulation"
					title="Скопировать смету выбранного тарифа для WhatsApp / Telegram (понятный пациенту формат)"
					data-testid="top-copy-messenger-btn"
				>
					{copiedMessengerTierId === activeTier.tierId ? (
						<>
							<Check size={14} className="text-emerald-600 shrink-0" />
							<span className="text-emerald-600 font-bold">Скопировано!</span>
						</>
					) : (
						<>
							<Share2 size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span>Смета (WhatsApp)</span>
						</>
					)}
				</button>

				{/* Collapsed Secondary Controls: [ ⚙ Параметры сметы ▾ ] Dropdown */}
				<div className="relative inline-flex items-center" ref={dropdownRef}>
					<button
						type="button"
						onClick={() => setIsParamsOpen((prev) => !prev)}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-xl text-xs font-bold border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs transition-colors touch-manipulation whitespace-nowrap"
						title="Параметры сметы: налоговый вычет 13%, студия сравнения, эскроу, валидация цен"
						aria-label="Параметры сметы"
						aria-expanded={isParamsOpen}
						data-testid="tp-3tier-params-btn"
					>
						<Settings size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Параметры сметы</span>
						<ChevronDown
							size={13}
							className={`text-[var(--muted,#64748b)] transition-transform duration-200 ${
								isParamsOpen ? "rotate-180" : ""
							}`}
						/>
					</button>

					{/* Dropdown Menu */}
					<div
						className={`absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong,#ffffff)] border border-[var(--line,var(--border,#cbd5e1))] rounded-2xl shadow-2xl min-w-[260px] text-xs ${
							isParamsOpen ? "animate-in fade-in zoom-in-95 duration-100" : "hidden"
						}`}
						role="menu"
						aria-hidden={!isParamsOpen}
					>
						{/* 1. NDFL 13% Toggle */}
						<button
							type="button"
							onClick={() => {
								onToggleNdflBreakdown();
							}}
							className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px] transition-colors ${
								showNdflBreakdown
									? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
									: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)]"
							}`}
							role="menuitem"
							title="Показать расчет налогового вычета 13% по НК РФ"
						>
							<div className="flex items-center gap-2">
								<ShieldCheck
									size={14}
									className={showNdflBreakdown ? "text-emerald-600" : "text-[var(--muted)]"}
								/>
								<span>Вычет 13% (НДФЛ)</span>
							</div>
							<span
								className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
									showNdflBreakdown
										? "bg-emerald-600 text-white"
										: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
								}`}
							>
								{showNdflBreakdown ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</button>

						{/* 2. Comparator Studio Modal Button */}
						{onOpenComparatorStudio && (
							<button
								type="button"
								onClick={() => {
									onOpenComparatorStudio();
									setIsParamsOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								title="Открыть полноэкранную презентационную студию сравнения"
							>
								<Sparkles size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Студия сравнения планов</span>
							</button>
						)}

						{/* 3. Stage Payment Modal Button */}
						{onOpenStagePaymentStudio && (
							<button
								type="button"
								onClick={() => {
									onOpenStagePaymentStudio();
									setIsParamsOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								title="Открыть студию поэтапной оплаты и эскроу-депозитов"
							>
								<Coins size={14} className="text-amber-500 shrink-0" />
								<span>Поэтапная оплата & Эскроу</span>
							</button>
						)}

						{/* 4. Price Validator Modal Button */}
						{onOpenPriceValidatorStudio && (
							<button
								type="button"
								onClick={() => {
									onOpenPriceValidatorStudio();
									setIsParamsOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								title="Проверить цены по прайсу и протоколам СтАР"
							>
								<FileCheck size={14} className="text-emerald-600 shrink-0" />
								<span>Валидация цен (Прайс СтАР)</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlan3TierToolbar;
