import React from "react";
import { Layers, Plus } from "lucide-react";
import type { TreatmentPlanStage } from "./types";

export interface TreatmentPlanSpecialtyFilterBarProps {
	readonly stages: readonly TreatmentPlanStage[];
	readonly visibleStages: readonly TreatmentPlanStage[];
	readonly specialtyFilter: string;
	readonly onSetSpecialtyFilter: (filter: any) => void;
	readonly onOpenAddCatalogService: () => void;
	readonly onOpenCreateStageModal: () => void;
}

export const TreatmentPlanSpecialtyFilterBar: React.FC<TreatmentPlanSpecialtyFilterBarProps> = ({
	stages,
	specialtyFilter,
	onSetSpecialtyFilter,
	onOpenAddCatalogService,
	onOpenCreateStageModal,
}) => {
	const tabs = [
		{ id: "all", label: "Все специалисты", count: stages.length },
		{ id: "therapy", label: "Терапия", count: stages.filter((s) => s.stageKind === "stage_1_therapy" || s.items.some((i) => (i.category || "").toLowerCase().match(/терап|кариес|эндо/))).length },
		{ id: "surgery", label: "Хирургия", count: stages.filter((s) => s.stageKind === "stage_2_surgery" || s.items.some((i) => (i.category || "").toLowerCase().match(/хирург|имплант|удал/))).length },
		{ id: "orthopedics", label: "Ортопедия", count: stages.filter((s) => s.stageKind === "stage_3_orthopedics" || s.items.some((i) => (i.category || "").toLowerCase().match(/ортопед|коронк|мост/))).length },
		{ id: "orthodontics", label: "Ортодонтия", count: stages.filter((s) => s.stageKind === "stage_4_orthodontics" || s.items.some((i) => (i.category || "").toLowerCase().match(/ортодонт|брекет|элайнер/))).length },
		{ id: "periodontics", label: "Пародонтология", count: stages.filter((s) => s.stageKind === "stage_5_periodontics" || s.items.some((i) => (i.category || "").toLowerCase().match(/пародонт|гигиен|десн/))).length },
	];

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] shadow-xs">
			<div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Фильтр по специализациям">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => onSetSpecialtyFilter(tab.id)}
						data-testid={`tp-specialty-filter-${tab.id}`}
						className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 touch-manipulation ${
							specialtyFilter === tab.id
								? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))]"
						}`}
					>
						<span>{tab.label}</span>
						{tab.count > 0 && (
							<span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${specialtyFilter === tab.id ? "bg-white/20 text-white" : "bg-[var(--paper-strong)] text-[var(--muted)]"}`}>
								{tab.count}
							</span>
						)}
					</button>
				))}
			</div>

			<div className="flex items-center gap-2 flex-wrap shrink-0">
				<button
					type="button"
					onClick={onOpenAddCatalogService}
					data-testid="tp-add-catalog-service-btn"
					className="min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal)]/30 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
					title="Добавить любую услугу из утвержденного прейскуранта клиники"
				>
					<Plus size={14} />
					<span>+ Услуга из каталога</span>
				</button>

				<button
					type="button"
					onClick={onOpenCreateStageModal}
					data-testid="tp-create-stage-btn"
					className="min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
					title="Добавить новый этап в план лечения"
				>
					<Layers size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>+ Добавить этап</span>
				</button>
			</div>
		</div>
	);
};
