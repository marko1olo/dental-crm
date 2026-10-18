/**
 * DENTE CRM — Treatment Plan Presenter Dental Formula
 * (DOMAIN: CHAIRSIDE TREATMENT PLAN PRESENTER)
 * Canonical flagship ToothChart integration compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import { ToothChart, type ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanTier } from "../types";
import {
	buildPresenterPlanTeethMap,
	buildPresenterTeethMap,
	buildPresenterToothChartData,
} from "./treatmentPlanPresenterFormulaEngine";
import { TreatmentPlanPresenterFormulaHeader } from "./TreatmentPlanPresenterFormulaHeader";
import { TreatmentPlanPresenterToothInspectionCard } from "./TreatmentPlanPresenterToothInspectionCard";

export interface TreatmentPlanPresenterDentalFormulaProps {
	readonly tier: TreatmentPlanTier;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly onToothClick?: ((toothNumber: number) => void) | undefined;
	readonly className?: string | undefined;
}

export const TreatmentPlanPresenterDentalFormula: React.FC<TreatmentPlanPresenterDentalFormulaProps> = memo(({
	tier,
	teeth = [],
	onToothClick,
	className = "",
}) => {
	const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

	const teethMap = useMemo(() => buildPresenterTeethMap(teeth), [teeth]);
	const planTeethMap = useMemo(() => buildPresenterPlanTeethMap(tier), [tier]);
	const chartTeethData = useMemo(
		() => buildPresenterToothChartData(teethMap, planTeethMap),
		[teethMap, planTeethMap],
	);

	const totalTreatedTeeth = planTeethMap.size;

	const handleToothSelect = useCallback((num: number) => {
		setSelectedTooth((prev) => (prev === num ? null : num));
		onToothClick?.(num);
	}, [onToothClick]);

	const selectedTeethList = useMemo(
		() => (selectedTooth ? [selectedTooth] : []),
		[selectedTooth],
	);

	return (
		<div
			className={`treatment-dental-formula-wrap rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] p-3 sm:p-4 shadow-2xs ${className}`}
			data-testid="treatment-plan-fdi-formula"
		>
			<TreatmentPlanPresenterFormulaHeader totalTreatedTeeth={totalTreatedTeeth} />

			<div className="overflow-x-auto pb-1 scrollbar-none">
				<ToothChart
					teethData={chartTeethData}
					selectedTeeth={selectedTeethList}
					onToothClick={handleToothSelect}
					hideExpressActions={true}
					hideQuadrantSwitcher={true}
					showPulpAndCanals={false}
					showPeriapicalHalos={false}
					showPeriodontalBoneLoss={false}
					className="presenter-tooth-chart"
				/>
			</div>

			{selectedTooth && (
				<TreatmentPlanPresenterToothInspectionCard
					selectedTooth={selectedTooth}
					tierTitle={tier.title}
					initialToothData={teethMap.get(selectedTooth)}
					planInfo={planTeethMap.get(selectedTooth)}
					onClose={() => setSelectedTooth(null)}
				/>
			)}
		</div>
	);
});

TreatmentPlanPresenterDentalFormula.displayName = "TreatmentPlanPresenterDentalFormula";
export default TreatmentPlanPresenterDentalFormula;
