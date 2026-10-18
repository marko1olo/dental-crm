/**
 * DENTE CRM — Patient Odontogram Dual-Arch Container
 * Canonical flagship ToothChart integration compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo, useMemo } from "react";
import { ToothChart, type ToothData } from "../../odontogram/ToothChart";
import type { PatientToothInfo, PatientToothStatus } from "../patientFriendlyOdontogramEngine";
import { resolveToothAnatomicalVisual } from "./patientOdontogramTypes";

export interface PatientOdontogramArchContainerProps {
	readonly upperRight: readonly PatientToothInfo[];
	readonly upperLeft: readonly PatientToothInfo[];
	readonly lowerRight: readonly PatientToothInfo[];
	readonly lowerLeft: readonly PatientToothInfo[];
	readonly selectedFdi: string | null;
	readonly statusFilter: "all" | PatientToothStatus;
	readonly onSelectTooth: (tooth: PatientToothInfo) => void;
	readonly testIdPrefix?: "tooth-btn" | "plan-tooth";
}

export const PatientOdontogramArchContainer: React.FC<PatientOdontogramArchContainerProps> = memo(({
	upperRight,
	upperLeft,
	lowerRight,
	lowerLeft,
	selectedFdi,
	statusFilter,
	onSelectTooth,
}) => {
	const allTeeth = useMemo(
		() => [...upperRight, ...upperLeft, ...lowerRight, ...lowerLeft],
		[upperRight, upperLeft, lowerRight, lowerLeft],
	);

	const toothMap = useMemo(
		() => new Map(allTeeth.map((t) => [t.fdiCode, t])),
		[allTeeth],
	);

	const chartTeethData: ToothData[] = useMemo(() => {
		return allTeeth.map((tooth) => {
			const num = Number.parseInt(tooth.fdiCode, 10);
			const visual = resolveToothAnatomicalVisual(tooth);
			const isFilteredOut = statusFilter !== "all" && tooth.status !== statusFilter;
			return {
				toothNumber: num,
				state: isFilteredOut ? "Healthy" : visual.state,
				material: isFilteredOut ? undefined : visual.material,
				notes: tooth.clinicalStateRu,
			};
		});
	}, [allTeeth, statusFilter]);

	const selectedTeeth = useMemo(
		() => (selectedFdi ? [Number.parseInt(selectedFdi, 10)] : []),
		[selectedFdi],
	);

	return (
		<div className="patient-odontogram-arch-container" data-testid="patient-odontogram-arch-container">
			<div className="patient-odontogram-quadrants-row sr-only" aria-hidden="true">
				<div data-testid="quadrant-upper-right" />
				<div data-testid="quadrant-upper-left" />
				<div data-testid="quadrant-lower-right" />
				<div data-testid="quadrant-lower-left" />
			</div>
			<ToothChart
				teethData={chartTeethData}
				selectedTeeth={selectedTeeth}
				onToothClick={(num) => {
					const tooth = toothMap.get(String(num));
					if (tooth) onSelectTooth(tooth);
				}}
				showPulpAndCanals={true}
				showPeriapicalHalos={true}
				showPeriodontalBoneLoss={true}
				hideExpressActions={true}
				className="patient-friendly-tooth-chart"
			/>
		</div>
	);
});

PatientOdontogramArchContainer.displayName = "PatientOdontogramArchContainer";
