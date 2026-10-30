/**
 * Presenter3TierGrid.tsx — 3-колоночная сетка тарифов и Segmented Control (Apple HIG, Мандат 8b).
 * Мобильная адаптация: Segmented Control [Эконом | Оптимум | Премиум], 0px горизонтального скролла.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

export interface Presenter3TierGridProps {
	readonly effectiveTiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTierId: (tierId: TreatmentPlanTierId) => void;
}

export const Presenter3TierGrid: React.FC<Presenter3TierGridProps> = ({
	effectiveTiers,
	selectedTierId,
	onSelectTierId,
}) => {
	return (
		<div className="space-y-6">
			{/* Сенсорный Segmented Control на смартфонах (Apple HIG) */}
			<div className="treatment-mobile-tier-bar flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 md:hidden">
				{(["economy", "standard", "optimum"] as const).map((tId) => (
					<button
						key={tId}
						type="button"
						onClick={() => onSelectTierId(tId)}
						className={`treatment-mobile-tier-btn flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
							selectedTierId === tId || (tId === "standard" && selectedTierId === "optimum")
								? "active bg-[var(--paper)] text-[var(--teal)] shadow-xs"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid={`mobile-tier-btn-${tId}`}
					>
						{tId === "economy" ? "Эконом" : tId === "standard" ? "Оптимум" : "Премиум"}
					</button>
				))}
			</div>

			{/* 3-Tier Сетка вариантов смет */}
			<div className="treatment-3tier-grid grid grid-cols-1 md:grid-cols-3 gap-4">
				{effectiveTiers.map((tier) => {
					const isSelected = selectedTierId === tier.tierId;
					const testId =
						tier.tierId === "economy"
							? "tier-card-economy"
							: tier.tierId === "standard"
								? "tier-card-standard"
								: tier.tierId === "optimum"
									? "tier-card-optimum"
									: `tier-card-${tier.tierId}`;
					const ndflRefund = Math.round((tier.totalRub || 0) * 0.13);
					const totalWithNdfl = (tier.totalRub || 0) - ndflRefund;

					return (
						<div
							key={tier.tierId}
							onClick={() => onSelectTierId(tier.tierId)}
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
									{(tier.isRecommended || tier.tierId === "standard" || tier.tierId === "optimum") && (
										<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-[var(--paper-strong,#ffffff)]">
											Рекомендация врача
										</span>
									)}
								</div>
								<h3 className="text-xl font-black text-[var(--ink)] m-0">{tier.title}</h3>
								<p className="text-xs text-[var(--muted)] m-0 mt-1 leading-relaxed">{tier.subtitle}</p>
							</div>

							<div className="space-y-1.5 pt-3 border-t border-[var(--line)]/60 text-xs">
								{tier.keyAdvantages?.map((adv, idx) => (
									<div key={idx} className="flex items-center gap-2 text-[var(--ink)]">
										<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
										<span>{adv}</span>
									</div>
								))}
							</div>

							{/* Расчет 13% НДФЛ */}
							<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]/50 text-xs space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-[var(--muted)]">Вычет 13% НДФЛ:</span>
									<strong className="text-emerald-600 dark:text-emerald-400 font-bold">
										+{formatRubles(ndflRefund)}
									</strong>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-[var(--muted)]">Итого с вычетом:</span>
									<strong className="text-[var(--ink)] font-black">{formatRubles(totalWithNdfl)}</strong>
								</div>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onSelectTierId(tier.tierId);
									}}
									className="secondary-button dente-btn dente-btn-secondary w-full mt-1.5 py-1 text-[11px] font-bold rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
									data-testid={`calc-ndfl-btn-${tier.tierId}`}
								>
									Рассчитать вычет
								</button>
							</div>

							<div className="pt-3 border-t border-[var(--line)] flex items-end justify-between gap-2">
								<div>
									<span className="text-[10px] uppercase font-bold text-[var(--muted)] block">
										Стоимость под ключ
									</span>
									<span className="text-2xl font-black text-[var(--ink)]">{formatRubles(tier.totalRub)}</span>
								</div>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onSelectTierId(tier.tierId);
									}}
									className="secondary-button dente-btn dente-btn-secondary min-h-[36px] px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer transition-colors"
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
