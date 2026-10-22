import React from "react";
import { FranklBehaviorBadge } from "../pediatric/FranklBehaviorBadge";
import {
	type ToothPediatricContextProps,
	printPediatricParentMemo,
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
	patientAgeYears = 6,
	doctorName = "Детский врач-стоматолог",
	initialFrankl = 3,
	onUpdateTooth,
	onInsertToProtocol,
	onOpenParentMemo,
}) => {
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
					onOpenParentMemo?.();
					printPediatricParentMemo({
						patientName,
						patientAgeYears,
						doctorName,
						franklRating,
						toothNumber,
						resorptionStage: selectedResorption,
					});
				}}
			/>
		</div>
	);
};

export default ToothPediatricContext;
