/**
 * TreatmentPlanRoadmapGrid.tsx — Клинический маршрут лечения тарифа (DENTE CRM).
 *
 * Бесшовная плоская 4-колоночная сетка этапов лечения (Анти-матрешка).
 * Отображает этапы лечения, сроки, визиты и процедуры без избыточных вложенных контейнеров.
 */

import React from "react";
import { Clock } from "lucide-react";
import type { TreatmentPlanTier } from "./types";
import { isMicroConsumable } from "./TreatmentPlanPresenterModal";

export interface TreatmentPlanRoadmapGridProps {
	readonly activeTier: TreatmentPlanTier;
}

export const TreatmentPlanRoadmapGrid: React.FC<TreatmentPlanRoadmapGridProps> = ({
	activeTier,
}) => {
	if (!activeTier || !activeTier.stages || activeTier.stages.length === 0) {
		return null;
	}

	return (
		<section className="text-[var(--ink,#0f172a)] space-y-2 mt-4">
			<div className="flex items-center justify-between gap-3 flex-wrap px-1 py-1">
				<h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink,#0f172a)] flex items-center gap-2 m-0">
					<Clock size={16} className="text-[var(--teal,var(--brand-primary))]" />
					<span>
						Клинический маршрут лечения: {activeTier.title} ({activeTier.durationWeeks} нед. · {activeTier.durationVisits} виз.)
					</span>
				</h4>
				<span className="text-xs font-mono font-bold text-[var(--teal,var(--brand-primary))]">
					Итого по маршруту: {activeTier.totalRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line,var(--border,#cbd5e1))] rounded-2xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] overflow-hidden">
				{activeTier.stages.map((stg) => (
					<div key={stg.stageNumber} className="p-3 sm:p-3.5 space-y-2 min-w-0">
						<div className="flex items-center justify-between gap-2 min-w-0">
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20 shrink-0">
								Этап {stg.stageNumber}
							</span>
							<span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
								{stg.totalRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="min-w-0">
							<h5 className="font-bold text-xs text-[var(--ink,#0f172a)] m-0 leading-snug truncate" title={stg.title}>
								{stg.title.split(":")[1]?.trim() || stg.title}
							</h5>
							<p className="text-[10px] text-[var(--muted,#64748b)] m-0 mt-0.5 truncate" title={stg.clinicalGoal}>
								{stg.clinicalGoal} · ~{stg.estimatedWeeks} нед. ({stg.estimatedVisits} виз.)
							</p>
						</div>

						{stg.items && stg.items.length > 0 && (
							<ul className="max-h-28 overflow-y-auto min-h-0 text-[10px] text-[var(--muted,#64748b)] space-y-1 pl-1.5 border-l-2 border-[var(--teal,var(--brand-primary))]/30 m-0 list-none min-w-0">
								{stg.items.filter((it) => !isMicroConsumable(it)).map((it) => (
									<li key={it.id} className="truncate min-w-0" title={it.name}>
										• {it.toothNumber ? `Зуб ${it.toothNumber}: ` : ""}{it.name}
									</li>
								))}
							</ul>
						)}
					</div>
				))}
			</div>
		</section>
	);
};

export default TreatmentPlanRoadmapGrid;
