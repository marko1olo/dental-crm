/**
 * TreatmentPlanStagesList.tsx — Единый канонический список клинических этапов плана лечения (SSOT).
 * Мандат 8b: Золотой стандарт modularity (120–160 строк).
 * Мандат 8e: Автономия врача — кнопки «Оплатить этап» и «В заказ-наряд» активны ВСЕГДА (disabled={false}).
 * Apple HIG: GPU acceleration (translateZ(0)), тач-таргеты >= 44-52px, 0px горизонтального скролла.
 */

import React, { useMemo } from "react";
import type { TreatmentPlanTier, TreatmentPlanStage } from "./treatmentPlanPresenterTypes.js";
import { TreatmentPlanStagesListControls } from "./stagesList/TreatmentPlanStagesListControls.js";
import { TreatmentPlanStageCardItem } from "./stagesList/TreatmentPlanStageCardItem.js";
import { DEFAULT_PRESENTER_STAGES } from "./TreatmentPlanPresenterDefaultStages.js";

export interface TreatmentPlanStagesListProps {
	readonly tier?: TreatmentPlanTier | null;
	readonly activeTier?: TreatmentPlanTier | null;
	readonly expandedStages?: Record<number, boolean>;
	readonly expandedStageIndex?: number | null;
	readonly onToggleStage: ((stageNum: number) => void) | ((index: number) => void);
	readonly onToggleAllStages?: (expand: boolean) => void;
	readonly showMicroConsumables?: boolean;
	readonly onUpdateItemPrice?: (itemId: string, newPriceRub: number) => void;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onWorkOrder?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly isCompact?: boolean;
}

export const TreatmentPlanStagesList: React.FC<TreatmentPlanStagesListProps> = ({
	tier,
	activeTier,
	expandedStages,
	expandedStageIndex,
	onToggleStage,
	onToggleAllStages,
	showMicroConsumables = false,
	onUpdateItemPrice,
	onPayStage,
	onWorkOrder,
	isCompact = false,
}) => {
	const currentTier = tier || activeTier;
	const stages: readonly TreatmentPlanStage[] = useMemo(() => {
		if (currentTier?.stages && currentTier.stages.length > 0) {
			return currentTier.stages;
		}
		return DEFAULT_PRESENTER_STAGES as unknown as readonly TreatmentPlanStage[];
	}, [currentTier]);

	const isStageExpanded = (stageNum: number, idx: number): boolean => {
		if (expandedStages !== undefined) {
			return Boolean(expandedStages[stageNum]);
		}
		if (expandedStageIndex !== undefined) {
			return expandedStageIndex === idx;
		}
		return idx === 0;
	};

	const handleToggle = (stageNum: number, idx: number) => {
		if (expandedStages !== undefined) {
			(onToggleStage as (stageNum: number) => void)(stageNum);
		} else {
			(onToggleStage as (index: number) => void)(idx);
		}
	};

	const allExpanded = useMemo(() => {
		return stages.length > 0 && stages.every((s, i) => isStageExpanded(s.stageNumber, i));
	}, [stages, expandedStages, expandedStageIndex]);

	return (
		<div
			className="treatment-stages-list-container flex flex-col gap-3.5"
			data-testid="treatment-plan-stages-list"
			style={{ transform: "translateZ(0)", willChange: "transform" }}
		>
			{/* Зубная формула плана лечения FDI (Мандат 8e, 8ar) */}
			<div
				className="flex items-center justify-between p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-2xs gap-3 flex-wrap text-xs"
				data-testid="treatment-plan-fdi-formula"
			>
				<div className="flex items-center gap-2.5">
					<span className="font-bold text-[var(--ink)]">Зубная формула плана:</span>
					<span className="text-[var(--muted)]">FDI 11–48 (комплексный клинический протокол)</span>
				</div>
				{currentTier?.warrantyYears && (
					<span className="text-xs text-[var(--muted)]">
						Гарантия: <strong className="text-[var(--ink)]">{currentTier.warrantyYears} года</strong>
					</span>
				)}
			</div>

			{/* КЛИНИЧЕСКИЕ ЭТАПЫ ВЫБРАННОГО ТАРИФА */}
			<div className="space-y-3" data-testid="stages-accordion-section">
				<div className="flex items-center justify-between pb-1 flex-wrap gap-2">
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] m-0">Клинические этапы плана</h3>
						<p className="text-xs text-[var(--muted)] m-0">Поэтапная реализация и расчет стоимости каждого визита</p>
					</div>
					<span className="text-xs px-3 py-1 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
						Выбранный вариант: <strong className="text-[var(--ink)]">{currentTier?.title || "План"}</strong>
					</span>
				</div>

				{onToggleAllStages && stages.length > 1 && (
					<TreatmentPlanStagesListControls
						totalStages={stages.length}
						durationVisits={currentTier?.durationVisits || stages.length * 2}
						allExpanded={allExpanded}
						onToggleAllStages={onToggleAllStages}
					/>
				)}

				<div className="flex flex-col gap-3">
					{stages.map((stage: TreatmentPlanStage, idx: number) => (
						<TreatmentPlanStageCardItem
							key={stage.id || stage.stageNumber || idx}
							stage={stage}
							isExpanded={isStageExpanded(stage.stageNumber, idx)}
							onToggleStage={() => handleToggle(stage.stageNumber, idx)}
							showMicroConsumables={showMicroConsumables}
							onPayStage={onPayStage}
							onWorkOrder={onWorkOrder}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

export const PresenterStagesList = TreatmentPlanStagesList;
export type PresenterStagesListProps = TreatmentPlanStagesListProps;

export default TreatmentPlanStagesList;
