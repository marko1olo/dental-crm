import type React from "react";
import type { ToothData } from "../ToothChart";
import { TreatmentEstimatorItemCard } from "../TreatmentEstimatorItemCard";
import {
	type EstimatorContract,
	getGhostToothConflict,
	type PlanItem,
	type PlanItemCollision,
} from "../treatmentEstimatorPricing";
import { rub } from "../treatmentEstimatorTypes";
import { ESTIMATOR_PHASES, getPhaseTitle } from "./estimatorUiConstants";

export interface TreatmentEstimatorPhasesListProps {
	readonly items: readonly PlanItem[];
	readonly currentTeeth: readonly ToothData[];
	readonly contract: EstimatorContract;
	readonly planCollisions: readonly PlanItemCollision[];
	readonly onRemoveItem: (idx: number) => void;
	readonly onSetPhase: (idx: number, phase: number) => void;
	readonly onReplaceWithImplant: (toothNumber: number) => void;
	readonly onRestoreToothStatus: (toothNumber: number) => void;
	readonly onPriceChange: (idx: number, newPrice: number | null) => void;
}

export const TreatmentEstimatorPhasesList: React.FC<TreatmentEstimatorPhasesListProps> = ({
	items,
	currentTeeth,
	contract,
	planCollisions,
	onRemoveItem,
	onSetPhase,
	onReplaceWithImplant,
	onRestoreToothStatus,
	onPriceChange,
}) => {
	return (
		<>
			{ESTIMATOR_PHASES.map((phase) => {
				const phaseItems = items.filter((i) => i.phase === phase);
				if (phaseItems.length === 0) return null;

				return (
					<div key={phase} className="phase-section">
						<h3 className="phase-title">{getPhaseTitle(phase)}</h3>
						<div className="phase-items-list">
							{phaseItems.map((item) => {
								const globalIdx = items.indexOf(item);
								const itemGhostConflict = getGhostToothConflict(item, currentTeeth);
								const itemCollision =
									item.toothNumber !== undefined
										? planCollisions.find((c) => c.toothNumber === item.toothNumber)
										: null;
								return (
									<TreatmentEstimatorItemCard
										key={globalIdx}
										item={item}
										globalIdx={globalIdx}
										contract={contract}
										onRemove={onRemoveItem}
										onSetPhase={onSetPhase}
										formatRub={rub}
										ghostConflict={itemGhostConflict}
										collision={itemCollision}
										onReplaceWithImplant={onReplaceWithImplant}
										onRestoreToothStatus={onRestoreToothStatus}
										onPriceChange={onPriceChange}
									/>
								);
							})}
						</div>
					</div>
				);
			})}
		</>
	);
};
