/**
 * StudioTiersAndStagesTab.tsx — Вкладка 3 тарифов и клинических этапов в студии планов лечения.
 * Мандаты 8b, 8al: Десктопная сетка + Apple HIG Segmented Control для смартфонов (390x844).
 */

import React from "react";
import { Check, ShieldCheck, Sparkles, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

export interface StudioTiersAndStagesTabProps {
	readonly computedTiers: readonly TreatmentPlanTier[];
	readonly activeTier: TreatmentPlanTier;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTierId: (id: TreatmentPlanTierId) => void;
	readonly expandedStageId: string | null;
	readonly onToggleExpandStage: (id: string) => void;
	readonly onSelectDiagnosisPreset: (diagCode: string) => void;
	readonly onResetToCanonical: () => void;
}

export const StudioTiersAndStagesTab: React.FC<StudioTiersAndStagesTabProps> = ({
	computedTiers,
	activeTier,
	selectedTierId,
	onSelectTierId,
	expandedStageId,
	onToggleExpandStage,
	onSelectDiagnosisPreset,
	onResetToCanonical,
}) => {
	const sanitizedActiveTitle = activeTier.title.replace("★ ", "");

	return (
		<div className="space-y-6" data-testid="studio-tiers-stages-tab">
			{/* Быстрые шаблоны по диагнозам в 1 клик (Мандат 8n) */}
			<div className="flex items-center gap-2 overflow-x-auto text-xs no-scrollbar pb-1 snap-x">
				<span className="text-[var(--muted)] font-medium shrink-0 flex items-center gap-1">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					Типовые сметы:
				</span>
				{[
					{ label: "Кариес (Терапия)", code: "K02" },
					{ label: "Пульпит (Эндодонтия)", code: "K04" },
					{ label: "Имплантация + Коронка", code: "K08" },
				].map((p) => (
					<button
						key={p.code}
						type="button"
						onClick={() => onSelectDiagnosisPreset(p.code)}
						className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 snap-start cursor-pointer transition-colors"
					>
						{p.label}
					</button>
				))}
				<button
					type="button"
					onClick={onResetToCanonical}
					className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 snap-start cursor-pointer transition-colors"
				>
					Полный комплекс (4 этапа)
				</button>
			</div>

			{/* Мобильный Segmented Control (Apple HIG 390x844: без 2500px скролла) */}
			<div className="sm:hidden w-full space-y-3">
				<div className="tp-segmented-control grid grid-cols-3 gap-1 p-1 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl" role="tablist">
					{computedTiers.map((tier) => {
						const isSelected = tier.tierId === selectedTierId;
						return (
							<button
								key={tier.tierId}
								type="button"
								role="tab"
								aria-selected={isSelected}
								onClick={() => onSelectTierId(tier.tierId)}
								className={`tp-segmented-btn min-h-[44px] py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
									isSelected ? "is-selected bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								<span className="truncate w-full text-center">{tier.tierId === "economy" ? "Эконом" : tier.tierId === "optimum" ? "Оптимум" : "Премиум"}</span>
								<span className="text-[10px] opacity-90 truncate w-full text-center">{formatRubles(tier.totalRub)}</span>
							</button>
						);
					})}
				</div>

				{/* Карточка выбранного тарифа на смартфонах */}
				<div className="tp-mobile-selected-tier-card p-3.5 rounded-xl border-2 border-[var(--teal,#0d9488)] bg-[var(--paper-soft)] shadow-xs">
					<div className="flex items-center justify-between mb-1.5">
						<span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--teal,#0d9488)] text-white">{activeTier.badge}</span>
						<span className="text-xs text-[var(--muted)] flex items-center gap-1">
							<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							{activeTier.warrantyYears} {activeTier.warrantyYears === 1 ? "год" : activeTier.warrantyYears === 3 ? "года" : "лет"} гарантии
						</span>
					</div>
					<div className="flex items-baseline justify-between gap-2 mt-1">
						<h3 className="text-base font-black text-[var(--ink)] m-0 flex items-center gap-1.5">
							{activeTier.isRecommended && <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />}
							<span>{sanitizedActiveTitle}</span>
						</h3>
						<div className="text-xl font-black text-[var(--ink)] tracking-tight">{formatRubles(activeTier.totalRub)}</div>
					</div>
					<p className="text-xs text-[var(--muted)] mt-1 mb-2">{activeTier.subtitle}</p>
					<ul className="space-y-1 text-xs text-[var(--muted)] pt-1.5 border-t border-[var(--line)]">
						{activeTier.keyAdvantages.slice(0, 3).map((adv, idx) => (
							<li key={idx} className="flex items-start gap-1.5">
								<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
								<span className="leading-tight">{adv}</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* Десктопная 3-тарифная сетка */}
			<div className="tp-tiers-grid hidden sm:grid sm:grid-cols-3 gap-4">
				{computedTiers.map((tier) => {
					const isSelected = tier.tierId === selectedTierId;
					const tierTitleClean = tier.title.replace("★ ", "");
					return (
						<div
							key={tier.tierId}
							onClick={() => onSelectTierId(tier.tierId)}
							className={`tp-tier-card flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
								isSelected ? "is-selected border-[var(--teal,#0d9488)] bg-[var(--paper-soft)] shadow-md ring-2 ring-[var(--teal,#0d9488)]/20" : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong,#94a3b8)]"
							}`}
							data-testid={`tier-card-${tier.tierId}`}
						>
							<div className="flex items-center justify-between mb-2">
								<span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${tier.isRecommended ? "bg-[var(--teal,#0d9488)] text-white" : "bg-[var(--line-subtle)] text-[var(--muted)]"}`}>
									{tier.badge}
								</span>
								<span className="text-xs text-[var(--muted)] flex items-center gap-1">
									<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									{tier.warrantyYears} {tier.warrantyYears === 1 ? "год" : tier.warrantyYears === 3 ? "года" : "лет"} гарантии
								</span>
							</div>
							<h3 className="text-base font-black text-[var(--ink)] m-0 flex items-center gap-1.5">
								{tier.isRecommended && <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />}
								<span>{tierTitleClean}</span>
							</h3>
							<p className="text-xs text-[var(--muted)] mt-1 mb-3 line-clamp-2">{tier.subtitle}</p>
							<div className="mt-auto pt-2 border-t border-[var(--line)]">
								<div className="tp-tier-price text-2xl sm:text-[32px] font-black text-[var(--ink)] tracking-tight">{formatRubles(tier.totalRub)}</div>
								<ul className="mt-3 space-y-1.5 text-xs text-[var(--muted)]">
									{tier.keyAdvantages.slice(0, 3).map((adv, idx) => (
										<li key={idx} className="flex items-start gap-1.5">
											<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" /><span className="leading-tight text-xs">{adv}</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					);
				})}
			</div>

			{/* Клинические этапы лечения и процедуры FDI 11–48 */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h4 className="text-xs sm:text-sm font-bold tracking-wider text-[var(--muted)] m-0">Этапы выбранного плана: «{sanitizedActiveTitle}»</h4>
					<span className="text-xs text-[var(--muted)]">{activeTier.stages.length} этапа · Итого {formatRubles(activeTier.totalRub)}</span>
				</div>

				<div className="space-y-2.5">
					{activeTier.stages.map((stage) => {
						const stageKey = stage.id || `stage-${stage.stageNumber}`;
						const isExpanded = Boolean(stage.id && expandedStageId === stage.id);
						return (
							<div key={stageKey} className="tp-stage-card rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-xs">
								<button
									type="button"
									onClick={() => stage.id && onToggleExpandStage(stage.id)}
									className="tp-stage-header-btn w-full min-h-[52px] p-3 sm:p-4 flex items-center justify-between text-left hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="tp-stage-badge w-7 h-7 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] font-black text-xs flex items-center justify-center shrink-0">
											{stage.stageNumber}
										</div>
										<div className="min-w-0">
											<div className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">{stage.title}</div>
											<div className="text-[11px] text-[var(--muted)] line-clamp-2 leading-tight">{stage.subtitle}</div>
										</div>
									</div>

									<div className="flex items-center gap-3 shrink-0">
										<div className="text-right">
											<div className="text-xs sm:text-sm font-black text-[var(--ink)]">{formatRubles(stage.totalRub)}</div>
											<div className="text-[10px] text-[var(--muted)] flex items-center gap-1 justify-end">
												<Calendar className="w-3 h-3" />
												{stage.estimatedVisits} визит · {stage.estimatedWeeks} нед.
											</div>
										</div>
										{isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
									</div>
								</button>

								{/* Состав процедур этапа */}
								{isExpanded && (
									<div className="px-3 sm:px-4 pb-3 pt-1 border-t border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
										{stage.items.map((item) => (
											<div key={item.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--line-subtle)] last:border-0 text-xs">
												<div className="flex items-center gap-2 min-w-0">
													{item.toothNumber && (
														<span className="font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] px-1.5 py-0.5 rounded text-[10px] shrink-0">
															№{item.toothNumber}
														</span>
													)}
													<span className="text-[var(--ink)] line-clamp-2 leading-snug">{item.name}</span>
												</div>
												<span className="font-bold text-[var(--ink)] shrink-0">{formatRubles(item.priceRub)}</span>
											</div>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default StudioTiersAndStagesTab;
