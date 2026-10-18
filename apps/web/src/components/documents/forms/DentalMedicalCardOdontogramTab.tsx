import type React from "react";
import { useMemo, useCallback } from "react";
import { ToothChart, type ToothState } from "../../odontogram/ToothChart";
import {
	type DentalMedicalCardOdontogramTabProps,
	PERMANENT_TEETH_UPPER,
	PERMANENT_TEETH_LOWER,
	SURFACES,
	SELECTABLE_STATUSES,
} from "./medicalCardOdontogram/types";
import {
	fdiOdontogramToTeethData,
	toothStateToFdiStatusCode,
	SURFACE_CHART_TO_FDI,
} from "./medicalCardOdontogram/fdiToothAdapter";
import { OdontogramDmftBanner } from "./medicalCardOdontogram/OdontogramDmftBanner";
import { OdontogramStatusChipsBar } from "./medicalCardOdontogram/OdontogramStatusChipsBar";
import { OdontogramToothSurfaceEditor } from "./medicalCardOdontogram/OdontogramToothSurfaceEditor";

export * from "./medicalCardOdontogram/types";
export * from "./medicalCardOdontogram/fdiToothAdapter";

export const DentalMedicalCardOdontogramTab: React.FC<
	DentalMedicalCardOdontogramTabProps
> = ({
	dmftResult,
	effectiveDisabled,
	odontogram,
	setOdontogram,
	selectedTooth,
	setSelectedTooth,
	activeStatus,
	setActiveStatus,
	handleToothStatusSet,
	handleSurfaceToggle,
}) => {
	const currentToothRecord = odontogram[selectedTooth];
	const teethData = useMemo(
		() => fdiOdontogramToTeethData(odontogram),
		[odontogram],
	);

	const handleChartToothClick = useCallback(
		(num: number, _rect?: DOMRect, surface?: string) => {
			setSelectedTooth(num);
			if (surface && !effectiveDisabled) {
				const fdiSurf = SURFACE_CHART_TO_FDI[surface];
				if (fdiSurf) handleSurfaceToggle(num, fdiSurf);
			}
		},
		[setSelectedTooth, effectiveDisabled, handleSurfaceToggle],
	);

	const handleChartQuickStateChange = useCallback(
		(targets: number[], state: ToothState) => {
			if (effectiveDisabled) return;
			const fdiCode = toothStateToFdiStatusCode(state);
			for (const t of targets) {
				handleToothStatusSet(t, fdiCode);
			}
		},
		[effectiveDisabled, handleToothStatusSet],
	);

	return (
		<div className="form-043u-formula-tab flex flex-col gap-2 w-full">
			<OdontogramDmftBanner
				dmftResult={dmftResult}
				effectiveDisabled={effectiveDisabled}
				setOdontogram={setOdontogram}
			/>

			<OdontogramStatusChipsBar
				activeStatus={activeStatus}
				setActiveStatus={setActiveStatus}
				disabled={effectiveDisabled}
			/>

			{/* Флагманский анатомический векторный ToothChart вместо убогих div-квадратиков */}
			<div className="odontogram-flagship-wrapper p-3 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-xs">
				<ToothChart
					teethData={teethData}
					selectedTeeth={selectedTooth ? [selectedTooth] : []}
					topTeeth={PERMANENT_TEETH_UPPER}
					bottomTeeth={PERMANENT_TEETH_LOWER}
					onToothClick={handleChartToothClick}
					onQuickStateChange={handleChartQuickStateChange}
					showPulpAndCanals={true}
					showPeriapicalHalos={true}
					showPeriodontalBoneLoss={true}
					useSurfaces={true}
					className="w-full"
				/>
			</div>

			<OdontogramToothSurfaceEditor
				selectedTooth={selectedTooth}
				currentToothRecord={currentToothRecord}
				activeStatus={activeStatus}
				effectiveDisabled={effectiveDisabled}
				handleToothStatusSet={handleToothStatusSet}
				handleSurfaceToggle={handleSurfaceToggle}
			/>
		</div>
	);
};
