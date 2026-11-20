import React, { useState } from "react";
import { isPrimaryTooth } from "@dental/shared";
import { FranklBehaviorBadge } from "../pediatric/FranklBehaviorBadge";
import { PediatricParentMemoModal } from "../pediatric/PediatricParentMemoModal";
import {
	type ToothPediatricContextProps,
	useToothPediatricState,
	ToothPediatricHeader,
	ToothPediatricResorptionGrid,
	ToothPediatricFooter,
} from "./pediatric";

export * from "./pediatric";

export const ToothPediatricContext: React.FC<ToothPediatricContextProps> = ({
	toothNumber,
	toothData,
	patientName = "Юный пациент",
	patientAgeYears,
	doctorName = "Детский врач-стоматолог",
	initialFrankl = 3,
	onUpdateTooth,
	onInsertToProtocol,
	onOpenParentMemo,
}) => {
	const [isLocalMemoOpen, setIsLocalMemoOpen] = useState(false);
	const resolvedAgeYears = patientAgeYears ?? (isPrimaryTooth(toothNumber) ? 5 : 7);

	const {
		franklRating,
		selectedResorption,
		activeFranklDef,
		handleFranklChange,
		handleResorptionChange,
		handleInsertResorptionProtocol,
		handleInsertPsychologicalProtocol,
	} = useToothPediatricState(toothNumber, toothData, initialFrankl, onUpdateTooth, onInsertToProtocol);

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-pediatric-context">
			<ToothPediatricHeader toothNumber={toothNumber} activeFranklDef={activeFranklDef} />
			<div className="dente-pediatric-badge-wrapper">
				<FranklBehaviorBadge rating={franklRating} onChange={handleFranklChange} showStrategies={true} compact={false} />
			</div>
			<ToothPediatricResorptionGrid
				toothNumber={toothNumber}
				selectedResorption={selectedResorption}
				onResorptionChange={handleResorptionChange}
				onInsertResorptionProtocol={handleInsertResorptionProtocol}
			/>
			<ToothPediatricFooter
				onInsertPsychologicalProtocol={handleInsertPsychologicalProtocol}
				onPrintMemo={() => {
					if (onOpenParentMemo) {
						onOpenParentMemo();
					} else {
						setIsLocalMemoOpen(true);
					}
				}}
			/>
			{isLocalMemoOpen && (
				<PediatricParentMemoModal
					isOpen={isLocalMemoOpen}
					onClose={() => setIsLocalMemoOpen(false)}
					patientName={patientName}
					patientAgeYears={resolvedAgeYears}
					doctorName={doctorName}
					initialFrankl={franklRating}
				/>
			)}
		</div>
	);
};

export default ToothPediatricContext;
