/**
 * Presenter3TierSelector.tsx — 3-Tier презентер пакетов лечения (Эконом, Оптимум, Премиум).
 * Мандат 8b: Золотой стандарт модульности (120–150 строк).
 * Мандат 8e: Автономия врача и пациента — мгновенное переключение, 1-клик расчёт НДФЛ.
 * Apple HIG: Сенсорная зона >= 44px, Segmented Control на смартфонах, 0px горизонтального скролла и 0px скролл-туннеля.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

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
	return (
		<div className="space-y-4">
			{/* Сенсорный мобильный Segmented Control для смартфонов (Apple HIG) */}
			<div className="treatment-mobile-tier-bar flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 md:hidden">
				<button
					type="button"
					onClick={() => onSelectTier("economy")}
					className={`treatment-mobile-tier-btn flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
						selectedTierId === "economy"
							? "active bg-[var(--paper)] text-[var(--ink)] shadow-xs"
							: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="mobile-tier-btn-economy"
				>
					Эконом
				</button>
				<button
					type="button"
					onClick={() => onSelectTier("standard")}
					className={`treatment-mobile-tier-btn flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
						selectedTierId === "standard"
							? "active bg-[var(--paper)] text-[var(--teal)] shadow-xs"
							: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="mobile-tier-btn-standard"
				>
					Оптимум
				</button>
				<button
					type="button"
					onClick={() => onSelectTier("optimum")}
					className={`treatment-mobile-tier-btn flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
						selectedTierId === "optimum"
							? "active bg-[var(--paper)] text-[var(--ink)] shadow-xs"
							: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="mobile-tier-btn-optimum"
				>
					Премиум
				</button>
			</div>

			{/* 3-Tier Сетка: на десктопе 3 колонки, на мобильных только выбранная карточка (Apple HIG: 0px скролл-туннеля) */}
			<div className="treatment-3tier-grid grid grid-cols-1 md:grid-cols-3 gap-4">
				{tiers.map((tier) => {
					const isSelected = selectedTierId === tier.tierId;
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
