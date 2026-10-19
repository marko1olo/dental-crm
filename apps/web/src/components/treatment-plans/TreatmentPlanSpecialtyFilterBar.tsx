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
		<div className="tp-filter-bar flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xs">
			<div className="tp-filter-chips flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Фильтр по специализациям">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => onSetSpecialtyFilter(tab.id)}
						data-testid={`tp-specialty-filter-${tab.id}`}
						className={`tp-filter-chip ${specialtyFilter === tab.id ? "active" : ""}`}
					>
						<span>{tab.label}</span>
						{tab.count > 0 && (
							<span className="tp-filter-chip-count">
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
					className="secondary-button tp-action-btn tp-action-btn-catalog min-h-[44px] sm:min-h-[32px] h-[44px] sm:h-8 touch-manipulation"
					title="Добавить любую услугу из утвержденного прейскуранта клиники"
				>
					<Plus size={14} className="shrink-0" />
					<span>Услуга из каталога</span>
				</button>

				<button
					type="button"
					onClick={onOpenCreateStageModal}
					data-testid="tp-create-stage-btn"
					className="secondary-button tp-action-btn tp-action-btn-stage min-h-[44px] sm:min-h-[32px] h-[44px] sm:h-8 touch-manipulation"
					title="Добавить новый этап в план лечения"
				>
					<Layers size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>+ Добавить этап</span>
				</button>
			</div>
		</div>
	);
};

export default TreatmentPlanSpecialtyFilterBar;
