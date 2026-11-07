/**
 * Presenter3TierSelector.tsx — 3-Tier презентер пакетов лечения (Эконом, Оптимум, Премиум).
 * Мандат 8b: Золотой стандарт модульности (120–150 строк).
 * Мандат 8e: Автономия врача и пациента — мгновенное переключение, 1-клик расчёт НДФЛ.
 * Apple HIG: Сенсорная зона >= 44px, Segmented Control на смартфонах, 0px горизонтального скролла и 0px скролл-туннеля.
 */

import React from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";
import { getTierSegmentLabel } from "./Presenter3TierGrid";

export interface Presenter3TierSelectorProps {
	readonly tiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTier: (tierId: TreatmentPlanTierId) => void;
}

export const Presenter3TierSelector: React.FC<Presenter3TierSelectorProps> = ({
	tiers,
	selectedTierId,
	onSelectTier,
}) => {
	const tiersToDisplay = tiers.length > 0 ? tiers : [];

	return (
		<div className="space-y-4" data-testid="presenter-3tier-selector-wrap">
			{/* Сенсорный мобильный Segmented Control для смартфонов (Apple HIG) */}
			<div
				className="treatment-mobile-tier-bar flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 md:hidden"
				role="tablist"
				aria-label="Переключатель тарифа плана"
				data-testid="mobile-tier-bar-selector"
			>
				{tiersToDisplay.map((tier, idx) => {
					const label = getTierSegmentLabel(tier, idx, tiersToDisplay);
					const isDirectMatch = selectedTierId === tier.tierId;
					const isOptimumAlias = (selectedTierId === "optimum" && tier.tierId === "standard") || (selectedTierId === "standard" && tier.tierId === "optimum" && idx === 1);
					const isSelected = isDirectMatch || isOptimumAlias;

					return (
						<button
							key={tier.tierId}
							type="button"
							role="tab"
							aria-selected={isSelected}
							onClick={() => onSelectTier(tier.tierId)}
							className={`treatment-mobile-tier-btn flex-1 min-h-[44px] py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
								isSelected
									? "active is-selected bg-[var(--paper)] text-[var(--teal)] border border-[var(--line)] shadow-xs"
									: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid={`mobile-tier-btn-${tier.tierId}`}
						>
							<span className="truncate w-full text-center flex items-center justify-center gap-1">
								{label.includes("★") && <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
								<span>{label.replace("★ ", "")}</span>
							</span>
							<span className="text-[10px] font-mono opacity-85 truncate w-full text-center">
								{formatRubles(tier.totalRub)}
							</span>
						</button>
					);
				})}
			</div>

			{/* 3-Tier Сетка: на десктопе 3 колонки, на мобильных только выбранная карточка (Apple HIG: 0px скролл-туннеля) */}
			<div className="treatment-3tier-grid grid grid-cols-1 md:grid-cols-3 gap-4">
				{tiers.map((tier, idx) => {
					const isDirectMatch = selectedTierId === tier.tierId;
					const isOptimumAlias = (selectedTierId === "optimum" && tier.tierId === "standard") || (selectedTierId === "standard" && tier.tierId === "optimum" && idx === 1);
					const isSelected = isDirectMatch || isOptimumAlias;
					const isEconomy = tier.tierId === "economy";
					const isStandard = tier.tierId === "standard";
					const isOptimum = tier.tierId === "optimum";
					const testId = isEconomy
						? "tier-card-economy"
						: isStandard
							? "tier-card-standard"
							: isOptimum
								? "tier-card-optimum"
								: `tier-card-${tier.tierId}`;
					const ndflRefund = Math.round((tier.totalRub || 0) * 0.13);
					const totalWithNdfl = (tier.totalRub || 0) - ndflRefund;

					return (
						<div
							key={tier.tierId}
							onClick={() => onSelectTier(tier.tierId)}
							className={`relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
								isSelected ? "flex" : "hidden md:flex"
							} ${
								isSelected
									? "border-[var(--teal)] bg-[var(--teal)]/5 ring-2 ring-[var(--teal)] shadow-md"
									: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper-soft)]"
							}`}
							data-testid={testId}
						>
							<div>
								<div className="flex items-center justify-between gap-2 mb-1.5">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
										{tier.badge || "Тариф"}
									</span>
									{(tier.isRecommended || isStandard || isOptimum) && (
										<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-[var(--paper-strong,#ffffff)]">
											Рекомендация врача
										</span>
									)}
								</div>

								<h3 className="text-xl font-black text-[var(--ink)] m-0">{tier.title}</h3>
								<p className="text-xs text-[var(--muted)] m-0 mt-1 leading-relaxed">
									{tier.subtitle}
								</p>
							</div>

							{/* Преимущества тарифа */}
							<div className="space-y-1.5 pt-3 border-t border-[var(--line)]/60 text-xs">
								{tier.keyAdvantages?.map((adv, idx) => (
									<div key={idx} className="flex items-center gap-2 text-[var(--ink)]">
										<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
										<span>{adv}</span>
									</div>
								))}
							</div>

							{/* Блок 13% НДФЛ */}
							<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]/50 text-xs space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-[var(--muted)]">Вычет 13% НДФЛ:</span>
									<strong className="text-emerald-600 dark:text-emerald-400 font-bold">
										+{formatRubles(ndflRefund)}
									</strong>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-[var(--muted)]">Итого с вычетом:</span>
									<strong className="text-[var(--ink)] font-black">
										{formatRubles(totalWithNdfl)}
									</strong>
								</div>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onSelectTier(tier.tierId);
									}}
									className="secondary-button dente-btn dente-btn-secondary w-full mt-1.5 py-1 text-[11px] font-bold rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer shadow-2xs"
									data-testid={`calc-ndfl-btn-${tier.tierId}`}
								>
									Рассчитать вычет
								</button>
							</div>

							{/* Цена и кнопка Применить */}
							<div className="pt-3 border-t border-[var(--line)] flex items-end justify-between gap-2">
								<div>
									<span className="text-[10px] uppercase font-bold text-[var(--muted)] block">
										Стоимость под ключ
									</span>
									<span className="text-2xl font-black text-[var(--ink)]">
										{formatRubles(tier.totalRub)}
									</span>
								</div>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onSelectTier(tier.tierId);
									}}
									className="secondary-button dente-btn dente-btn-secondary min-h-[36px] px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] hover:bg-[var(--teal)] hover:text-[var(--paper-strong,#ffffff)] transition-all cursor-pointer shadow-2xs"
									data-testid={`apply-tier-btn-${tier.tierId}`}
								>
									Применить
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default Presenter3TierSelector;
