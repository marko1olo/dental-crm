/**
 * TreatmentPlan3TierToolbar.tsx — Верхняя панель управления 3-Tier сравнения планов (DENTE CRM).
 *
 * Содержит:
 * 1. Заголовок и бейдж соответствия стандартам СтАР.
 * 2. Переключатель сценариев оплаты (Рассрочка 0%, Этапы 30/40/30, Скидка 5% за 100% оплату) — сегментированный контрол.
 * 3. Селектор срока рассрочки (3, 6, 12, 24 мес).
 * 4. Кнопку копирования сметы в мессенджер (WhatsApp / Telegram) для активного тарифа.
 * 5. Выпадающее меню [Параметры сметы ▾] (Вычет 13% НДФЛ, Студия сравнения, Эскроу, Валидация цен) — устранение Button Landfill.
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
		<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] text-xs text-[var(--ink,#0f172a)] shadow-2xs max-w-full overflow-x-clip">
			{/* Left: Module Title & Clinical Standards Badge */}
			<div className="flex items-center gap-2 min-w-0">
				<Sparkles size={15} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
				<span className="font-bold text-xs text-[var(--ink,#0f172a)] whitespace-nowrap">
					3-Tier Сравнение планов
				</span>
				<span className="text-[12px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20 whitespace-nowrap">
					СтАР
				</span>
			</div>

			{/* Right: Streamlined Controls (Segmented Modes + Messenger Share + Params Dropdown) */}
			<div className="flex items-center gap-1.5 flex-wrap max-w-full py-0.5">
				{/* Payment Mode Selector: Segmented Control */}
				<div
					className="inline-flex items-center p-[3px] rounded-[10px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] shadow-2xs gap-1 shrink-0"
					role="group"
					aria-label="Режим расчета оплаты"
				>
					<button
						type="button"
						onClick={() => onPaymentModeChange("installment")}
						className={`h-7 px-3 rounded-[7px] font-medium text-[12.5px] transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap touch-manipulation ${
							activePaymentMode === "installment"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
					>
						Рассрочка 0%
					</button>
					<button
						type="button"
						onClick={() => onPaymentModeChange("staged")}
						className={`h-7 px-3 rounded-[7px] font-medium text-[12.5px] transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap touch-manipulation ${
							activePaymentMode === "staged"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
					>
						Этапы (30/40/30)
					</button>
					<button
						type="button"
						onClick={() => onPaymentModeChange("discount")}
						className={`h-7 px-3 rounded-[7px] font-medium text-[12.5px] transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap touch-manipulation ${
							activePaymentMode === "discount"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
					>
						Скидка 5% (100%)
					</button>
				</div>

				{/* Term Selector (Active in installment mode) */}
				{activePaymentMode === "installment" && (
					<div
						className="inline-flex items-center p-[3px] rounded-[10px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] shadow-2xs gap-1"
						role="group"
						aria-label="Срок рассрочки"
					>
						{[3, 6, 12, 24].map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => onInstallmentMonthsChange(m as 3 | 6 | 12 | 24)}
								className={`h-7 w-8 px-1 rounded-[7px] font-mono text-[12.5px] font-medium transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap touch-manipulation ${
									installmentMonths === m
										? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
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
					className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-[13px] font-medium text-[var(--ink,#0f172a)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors whitespace-nowrap shadow-2xs touch-manipulation"
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

				{/* Collapsed Secondary Controls: [Параметры сметы ▾] Dropdown */}
				<div className="relative inline-flex items-center" ref={dropdownRef}>
					<button
						type="button"
						onClick={() => setIsParamsOpen((prev) => !prev)}
						className="h-8 px-3 rounded-lg text-[13px] font-medium border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong)] cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors touch-manipulation whitespace-nowrap"
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
						className={`absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong,#ffffff)] border border-[var(--line,var(--border,#cbd5e1))] rounded-xl shadow-2xl min-w-[260px] text-xs ${
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
							className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium flex items-center justify-between gap-2 cursor-pointer touch-manipulation min-h-[32px] h-8 transition-colors ${
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
								className={`text-[11.5px] font-bold px-1.5 py-0.5 rounded ${
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
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[32px] h-8"
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
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[32px] h-8"
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
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[32px] h-8"
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
