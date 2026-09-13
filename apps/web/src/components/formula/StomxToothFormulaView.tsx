/**
 * apps/web/src/components/formula/StomxToothFormulaView.tsx
 *
 * Канонический компактный фасад-делегат зубной формулы по Мандату 8s и Мандату 8k.
 * Делегирует отображение и манипуляции с зубным рядом в единый канонический OdontogramModule.
 */

import React from "react";
import { OdontogramModule } from "../odontogram/OdontogramModule";
import type { ToothFormulaProps } from "./types";

export interface StomxToothFormulaViewProps extends ToothFormulaProps {
	patientId?: string | undefined;
}

export const StomxToothFormulaView: React.FC<StomxToothFormulaViewProps> = ({
	patientId = "current",
	dentition = "adult",
	className = "",
}) => {
	return (
		<div className={`stomx-tooth-formula-facade ${className}`}>
			<OdontogramModule
				patientId={patientId}
				pediatricMode={dentition === "child"}
			/>
		</div>
	);
};

export const ToothFormulaAdapter = StomxToothFormulaView;
