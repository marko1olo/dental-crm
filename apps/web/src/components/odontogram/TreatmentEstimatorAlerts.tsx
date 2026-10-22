import type React from "react";
import { PanelLoadFailure } from "../PanelLoadFailure";
import type { PanelSubject } from "../../lib/panelStateText";
import type {
	GhostToothConflict,
	PlanItemCollision,
	ConsumablesReconciliationResult,
} from "./treatmentEstimatorPricing";
import { EstimatorContractAlert } from "./estimatorAlerts/EstimatorContractAlert";
import { EstimatorGhostConflictsAlert } from "./estimatorAlerts/EstimatorGhostConflictsAlert";
import { EstimatorCollisionsAlert } from "./estimatorAlerts/EstimatorCollisionsAlert";
import { EstimatorIssuesAlert } from "./estimatorAlerts/EstimatorIssuesAlert";
import { EstimatorEmptyPlanPlaceholder } from "./estimatorAlerts/EstimatorEmptyPlanPlaceholder";

export interface TreatmentEstimatorAlertsProps {
	readonly planLoadPhase: "loading" | "ready" | "failed";
	readonly planLoadStatus: number | null;
	readonly planSubject: PanelSubject;
	readonly contractFailure: { status: number | null } | null;
	readonly issueMessages: readonly string[];
	readonly itemsCount: number;
	readonly onRetryPlan: () => void;
	readonly onRetryContract: () => void;
	readonly ghostConflicts?: readonly GhostToothConflict[] | undefined;
	readonly collisions?: readonly PlanItemCollision[] | undefined;
	readonly onReplaceWithImplant?: ((toothNumber: number) => void) | undefined;
	readonly onRestoreToothStatus?: ((toothNumber: number) => void) | undefined;
	readonly onRemoveItemByTooth?: ((toothNumber: number) => void) | undefined;
	readonly consumablesReconciliation?: ConsumablesReconciliationResult | undefined;
	readonly onAddAllUnbilledToPlan?: (() => void) | undefined;
}

export const TreatmentEstimatorAlerts: React.FC<TreatmentEstimatorAlertsProps> = ({
	planLoadPhase,
	planLoadStatus,
	planSubject,
	contractFailure,
	issueMessages,
	itemsCount,
	onRetryPlan,
	onRetryContract,
	ghostConflicts,
	collisions,
	onReplaceWithImplant,
	onRestoreToothStatus,
	onRemoveItemByTooth,
}) => {
	return (
		<>
			{planLoadPhase === "failed" && (
				<PanelLoadFailure
					subject={planSubject}
					status={planLoadStatus}
					onRetry={onRetryPlan}
					className="mb-3"
				/>
			)}
			<EstimatorContractAlert
				contractFailure={contractFailure}
				onRetryContract={onRetryContract}
			/>
			<EstimatorGhostConflictsAlert
				ghostConflicts={ghostConflicts}
				onReplaceWithImplant={onReplaceWithImplant}
				onRestoreToothStatus={onRestoreToothStatus}
				onRemoveItemByTooth={onRemoveItemByTooth}
			/>
			<EstimatorCollisionsAlert collisions={collisions} />
			<EstimatorIssuesAlert issueMessages={issueMessages} />
			<EstimatorEmptyPlanPlaceholder
				planLoadPhase={planLoadPhase}
				itemsCount={itemsCount}
				planSubject={planSubject}
			/>
		</>
	);
};
