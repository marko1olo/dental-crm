import React from "react";
import type { ToothData } from "../odontogram/ToothChart";
import { ToothEndoCanalsSection } from "./ToothEndoCanalsSection";
import { ToothSurfacesHeader } from "./surfaces/ToothSurfacesHeader";
import { ToothStateChipsRow } from "./surfaces/ToothStateChipsRow";
import { ToothSurfacesCrossDiagram } from "./surfaces/ToothSurfacesCrossDiagram";
import { ToothMaterialSelector } from "./surfaces/ToothMaterialSelector";
import { useToothSurfacesState } from "./surfaces/useToothSurfacesState";

export * from "./toothSurfacesConstants";

export interface ToothSurfacesAndEndoMatrixProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const ToothSurfacesAndEndoMatrix: React.FC<ToothSurfacesAndEndoMatrixProps> = ({
	toothNumber,
	toothData,
	onUpdateTooth,
	onInsertToProtocol,
}) => {
	const {
		currentSurfaces,
		showEndoTable,
		setShowEndoTable,
		iropzCalculated,
		handleToggleSurface,
		handleSetSurfaces,
		handleClearSurfaces,
		handleApplyMacro,
		handleStateChange,
		handleMaterialChange,
	} = useToothSurfacesState({ toothData, onUpdateTooth });

	const isFrontal = (toothNumber % 10) <= 3;

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-surfaces-endo-matrix">
			<ToothSurfacesHeader iropzCalculated={iropzCalculated} />

			<ToothStateChipsRow
				toothData={toothData}
				onStateChange={handleStateChange}
			/>

			<ToothSurfacesCrossDiagram
				currentSurfaces={currentSurfaces}
				isFrontal={isFrontal}
				onToggleSurface={handleToggleSurface}
				onSetSurfaces={handleSetSurfaces}
				onClearSurfaces={handleClearSurfaces}
				onApplyMacro={handleApplyMacro}
			/>

			<ToothMaterialSelector
				toothData={toothData}
				onMaterialChange={handleMaterialChange}
			/>

			<ToothEndoCanalsSection
				toothNumber={toothNumber}
				toothData={toothData}
				showEndoTable={showEndoTable}
				onToggleShowEndoTable={() => setShowEndoTable((prev) => !prev)}
				onUpdateTooth={onUpdateTooth}
				onInsertToProtocol={onInsertToProtocol}
			/>
		</div>
	);
};

export default ToothSurfacesAndEndoMatrix;
