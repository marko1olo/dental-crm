/**
 * TreatmentPlansSavedListSelector.tsx — Горизонтальная панель выбора сохранённых планов лечения пациента.
 * Мандаты 8b, 8zi: Декомпозиция монолита TreatmentPlansTab.tsx по протоколу /decomposer.
 */

import React from "react";
import { Plus } from "lucide-react";
import type { PatientTreatmentPlanDto } from "./treatmentPlansTabConstants";

export interface TreatmentPlansSavedListSelectorProps {
	readonly loadedPlans: readonly PatientTreatmentPlanDto[];
	readonly selectedPlanId: string | null;
	readonly onSelectPlan: (planId: string) => void;
	readonly onNewPlan: () => void;
}

const STATUS_MAP: Record<string, { label: string; badgeClass: string }> = {
	Approved: {
		label: "Утверждён",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
	},
	Active: {
		label: "Активный",
		badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
	},
	Draft: {
		label: "Черновик",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]",
	},
	Completed: {
		label: "Завершён",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
	},
};

export const TreatmentPlansSavedListSelector: React.FC<TreatmentPlansSavedListSelectorProps> = ({
	loadedPlans,
	selectedPlanId,
	onSelectPlan,
	onNewPlan,
}) => {
	if (loadedPlans.length <= 1) return null;

	return (
		<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-3 shadow-xs space-y-2">
			<div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium px-1">
				<span>Сохраненные планы пациента ({loadedPlans.length}):</span>
				<button
					type="button"
					onClick={onNewPlan}
					className="text-[var(--teal)] hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer border-0 bg-transparent text-xs"
					data-testid="btn-new-plan-selector"
				>
					<Plus className="w-3.5 h-3.5" />
					<span>Новый план</span>
				</button>
			</div>
			<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
				{loadedPlans.map((pl) => {
					const isCurrent = pl.id === selectedPlanId;
					const currentStatus = STATUS_MAP[pl.status] ?? {
						label: pl.status,
						badgeClass: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]",
					};
					return (
						<button
							key={pl.id}
							type="button"
							onClick={() => onSelectPlan(pl.id)}
							className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border text-left shrink-0 transition-all cursor-pointer flex items-center gap-2.5 ${
								isCurrent
									? "border-[var(--teal,var(--brand-primary))] bg-[var(--teal)]/10 text-[var(--ink)] ring-1 ring-[var(--teal)]/40 shadow-xs"
									: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<div className="flex flex-col">
								<span className="font-bold text-xs truncate max-w-[200px] text-[var(--ink)]">
									{pl.name || "План лечения"}
								</span>
								<span className="text-[10px] text-[var(--muted)]">
									{Number(pl.totalPrice || 0).toLocaleString("ru-RU")} ₽
								</span>
							</div>
							<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${currentStatus.badgeClass}`}>
								{currentStatus.label}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
