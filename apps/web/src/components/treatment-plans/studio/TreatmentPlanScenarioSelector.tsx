/**
 * TreatmentPlanScenarioSelector.tsx — Переключатель клинических сценариев планов лечения.
 * Предоставляет выбор из 3 канонических тарифов (Эконом / Оптимум / Премиум):
 * - Мобильный Segmented Control по Apple HIG (390x844, tablist, tabs)
 * - Десктопная 3-колоночная сетка со стоимостью (32px bold) и преимуществами
 * - 0 disabled блокировок (Мандат 8e)
 */

import React from "react";
import { Check, ShieldCheck } from "lucide-react";
import type {
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

export interface TreatmentPlanScenarioSelectorProps {
	readonly tiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTier: (tierId: TreatmentPlanTierId) => void;
	readonly activeTier: TreatmentPlanTier;
}

export const TreatmentPlanScenarioSelector: React.FC<TreatmentPlanScenarioSelectorProps> = ({
	tiers,
	selectedTierId,
	onSelectTier,
	activeTier,
}) => {
	return (
		<div className="space-y-4">
			{/* 1. МОБИЛЬНЫЙ СЕГМЕНТНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ПО APPLE HIG (390x844) */}
			<div className="sm:hidden w-full space-y-3">
				<div
					className="tp-segmented-control grid grid-cols-3 gap-1 p-1 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl"
					role="tablist"
				>
					{tiers.map((tier) => {
						const isSelected = tier.tierId === selectedTierId;
						return (
							<button
								key={tier.tierId}
								type="button"
								role="tab"
								aria-selected={isSelected}
								onClick={() => onSelectTier(tier.tierId)}
								className={`tp-segmented-btn min-h-[44px] py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
									isSelected
										? "is-selected bg-[var(--teal,#0d9488)] text-white shadow-xs"
										: "text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								<span className="truncate w-full text-center">
									{tier.tierId === "economy" ? "Эконом" : tier.tierId === "optimum" ? "Оптимум" : "Премиум"}
								</span>
								<span className="text-[10px] opacity-90 truncate w-full text-center">
									{formatRubles(tier.totalRub)}
								</span>
							</button>
						);
					})}
				</div>

				{/* Карточка выбранного тарифа на всю ширину для мобильного экрана */}
				<div className="tp-mobile-selected-tier-card p-3 rounded-xl border-2 border-[var(--teal,#0d9488)] bg-[var(--paper-soft)] shadow-xs">
					<div className="flex items-center justify-between mb-1.5">
						<span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--teal,#0d9488)] text-white">
							{activeTier.badge}
						</span>
						<span className="text-xs text-[var(--muted)] flex items-center gap-1">
							<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							{activeTier.warrantyYears} {activeTier.warrantyYears === 1 ? "год" : activeTier.warrantyYears === 3 ? "года" : "лет"} гарантии
						</span>
					</div>
					<div className="flex items-baseline justify-between gap-2 mt-1">
						<h3 className="text-base font-black text-[var(--ink)] m-0">{activeTier.title}</h3>
						<div className="text-xl font-black text-[var(--ink)] tracking-tight">
							{formatRubles(activeTier.totalRub)}
						</div>
					</div>
					<p className="text-xs text-[var(--muted)] mt-1 mb-2">
						{activeTier.subtitle}
					</p>
					<ul className="space-y-1 text-xs text-[var(--muted)] pt-1.5 border-t border-[var(--line)]">
						{activeTier.keyAdvantages.slice(0, 2).map((adv, idx) => (
							<li key={idx} className="flex items-start gap-1.5">
								<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
								<span className="leading-tight">{adv}</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* 2. ДЕСКТОПНАЯ 3-УРОВНЕВАЯ СЕТКА ВАРИАНТОВ ПЛАНА (1-КЛИК ПЕРЕКЛЮЧЕНИЕ У КРЕСЛА) */}
			<div className="tp-tiers-grid hidden sm:grid sm:grid-cols-3 gap-4">
				{tiers.map((tier) => {
					const isSelected = tier.tierId === selectedTierId;
					return (
						<div
							key={tier.tierId}
							onClick={() => onSelectTier(tier.tierId)}
							className={`tp-tier-card flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
								isSelected
									? "is-selected border-[var(--teal,#0d9488)] bg-[var(--paper-soft)] shadow-md ring-2 ring-[var(--teal,#0d9488)]/20"
									: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong,#94a3b8)]"
							}`}
							data-testid={`tier-card-${tier.tierId}`}
						>
							{/* Бейдж рекомендации */}
							<div className="flex items-center justify-between mb-2">
								<span
									className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
										tier.isRecommended
											? "bg-[var(--teal,#0d9488)] text-white"
											: "bg-[var(--line-subtle)] text-[var(--muted)]"
									}`}
								>
									{tier.badge}
								</span>
								<span className="text-xs text-[var(--muted)] flex items-center gap-1">
									<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									{tier.warrantyYears} {tier.warrantyYears === 1 ? "год" : tier.warrantyYears === 3 ? "года" : "лет"} гарантии
								</span>
							</div>

							{/* Заголовок и сумма (32px bold по мандату) */}
							<h3 className="text-base font-black text-[var(--ink)] m-0">{tier.title}</h3>
							<p className="text-xs text-[var(--muted)] mt-1 mb-3 line-clamp-2">
								{tier.subtitle}
							</p>

							<div className="mt-auto pt-2 border-t border-[var(--line)]">
								<div className="tp-tier-price text-2xl sm:text-[32px] font-black text-[var(--ink)] tracking-tight">
									{formatRubles(tier.totalRub)}
								</div>
								<ul className="mt-3 space-y-1.5 text-xs text-[var(--muted)]">
									{tier.keyAdvantages.slice(0, 3).map((adv, idx) => (
										<li key={idx} className="flex items-start gap-1.5">
											<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
											<span className="leading-tight text-xs">{adv}</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default TreatmentPlanScenarioSelector;
