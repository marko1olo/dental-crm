/**
 * Presenter3TierGrid.tsx — 3-колоночная сетка тарифов и Segmented Control (Apple HIG, Мандат 8b).
 * Мобильная адаптация: Segmented Control [Эконом | Оптимум | Премиум], 0px горизонтального скролла.
 * Равномерная высота карточек (h-full, items-stretch), график оплат и рассрочка клиники 0%.
 */

import React from "react";
import { ShieldCheck, CalendarClock, Sparkles } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

export interface Presenter3TierGridProps {
	readonly effectiveTiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTierId: (tierId: TreatmentPlanTierId) => void;
}

export function getTierSegmentLabel(tier: TreatmentPlanTier, index: number, all: readonly TreatmentPlanTier[]): string {
	const t = (tier.title || "").toLowerCase();
	const id = tier.tierId;
	if (id === "economy" || t.includes("эконом") || t.includes("базов")) return "Эконом";
	if (id === "premium" || t.includes("премиум") || (id === "optimum" && all.length === 3 && index === 2)) return "Премиум";
	if (id === "standard" || t.includes("стандарт") || t.includes("оптим")) return "★ Оптимум";
	if (index === 0) return "Эконом";
	if (index === 1) return "★ Оптимум";
	return "Премиум";
}

export const Presenter3TierGrid: React.FC<Presenter3TierGridProps> = ({
	effectiveTiers,
	selectedTierId,
	onSelectTierId,
}) => {
	const tiersToDisplay = effectiveTiers.length > 0 ? effectiveTiers : [];

	return (
		<div className="space-y-6" data-testid="presenter-3tier-grid-wrap">
			{/* Сенсорный Segmented Control на смартфонах (Apple HIG: Natural Thumb Zone, h >= 44px, 0px 2500px туннеля) */}
			<div
				className="treatment-mobile-tier-bar flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 md:hidden"
				role="tablist"
				aria-label="Выбор тарифа плана лечения"
				data-testid="mobile-tier-segmented-control"
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
							onClick={() => onSelectTierId(tier.tierId)}
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

			{/* 3-Tier Сетка вариантов смет: одинаковая высота h-full, items-stretch */}
			<div className="treatment-3tier-grid grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
				{effectiveTiers.map((tier, idx) => {
					const isDirectMatch = selectedTierId === tier.tierId;
					const isOptimumAlias = (selectedTierId === "optimum" && tier.tierId === "standard") || (selectedTierId === "standard" && tier.tierId === "optimum" && idx === 1);
					const isSelected = isDirectMatch || isOptimumAlias;
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
					const installmentMonths = 3;
					const installmentPayment = Math.round((tier.totalRub || 0) / installmentMonths);

					return (
						<div
							key={tier.tierId}
							onClick={() => onSelectTierId(tier.tierId)}
							className={`relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 h-full ${
								isSelected ? "flex" : "hidden md:flex"
							} ${
								isSelected
									? "border-[var(--teal)] bg-[var(--teal)]/5 ring-2 ring-[var(--teal)] shadow-md"
									: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper-soft)]"
							}`}
							data-testid={testId}
						>
							<div className="space-y-3">
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
							</div>

							<div className="space-y-3 pt-3">
								{/* Расчет 13% НДФЛ и Рассрочка 0% */}
								<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]/50 text-xs space-y-1.5">
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
									<div className="pt-1.5 border-t border-[var(--line)]/40 flex items-center justify-between">
										<span className="text-[var(--muted)] flex items-center gap-1">
											<CalendarClock className="w-3 h-3 text-[var(--teal)]" />
											Рассрочка 0%:
										</span>
										<strong className="text-[var(--teal)] font-bold text-[11px] sm:text-xs">
											{installmentMonths} платежа по {formatRubles(installmentPayment)}
										</strong>
									</div>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onSelectTierId(tier.tierId);
										}}
										className="secondary-button dente-btn dente-btn-secondary w-full mt-1.5 py-1 text-[11px] font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
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
						</div>
					);
				})}
			</div>
		</div>
	);
};
