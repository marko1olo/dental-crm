/**
 * DENTE CRM — Patient Plan Anatomical Dental Formula
 * (DOMAIN: PORTAL PATIENT CABINET - DENTAL FORMULA & HEALTH INDEX)
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import { ToothChart, type ToothData } from "../../odontogram/ToothChart";
import {
	type PatientToothInfo,
	type PatientToothStatus,
	calculateDentalHealthIndex,
} from "../PatientFriendlyOdontogram";
import { PatientToothDetailBox } from "../PatientToothDetailBox";
import { PatientHealthIndexCard } from "../patientOdontogram/PatientHealthIndexCard";
import { PatientStatusFilterBar } from "../patientOdontogram/PatientStatusFilterBar";
import { resolveToothAnatomicalVisual } from "../patientOdontogram/patientOdontogramTypes";

export interface PatientPlanDentalFormulaProps {
	readonly teeth: readonly PatientToothInfo[];
	readonly onSelectTooth?: (tooth: PatientToothInfo) => void;
	readonly showHealthIndex?: boolean;
}

export const PatientPlanDentalFormula: React.FC<PatientPlanDentalFormulaProps> = memo(({
	teeth,
	onSelectTooth,
	showHealthIndex = true,
}) => {
	const [selectedFdi, setSelectedFdi] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<"all" | PatientToothStatus>("all");

	const healthIndex = useMemo(() => calculateDentalHealthIndex(teeth), [teeth]);
	const toothMap = useMemo(() => new Map(teeth.map((t) => [t.fdiCode, t])), [teeth]);
	const selectedTooth = selectedFdi ? toothMap.get(selectedFdi) ?? null : null;

	const handleToothClick = useCallback((tooth: PatientToothInfo) => {
		setSelectedFdi((prev) => (prev === tooth.fdiCode ? null : tooth.fdiCode));
		onSelectTooth?.(tooth);
	}, [onSelectTooth]);

	const chartTeethData: ToothData[] = useMemo(() => {
		return teeth.map((tooth) => {
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
	}, [teeth, statusFilter]);

	const selectedTeeth = useMemo(
		() => (selectedFdi ? [Number.parseInt(selectedFdi, 10)] : []),
		[selectedFdi],
	);

	return (
		<div
			className="pc-dental-formula-container"
			data-testid="patient-plan-dental-formula"
			style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", boxSizing: "border-box" }}
		>
			{showHealthIndex && <PatientHealthIndexCard healthIndex={healthIndex} />}
			<PatientStatusFilterBar statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} healthIndex={healthIndex} />
			<div
				className="pc-svg-arch-wrapper"
				data-testid="pc-svg-arch-wrapper"
				style={{
					backgroundColor: "var(--pc-bg, #0f172a)",
					border: "1px solid var(--pc-border, #334155)",
					borderRadius: "12px",
					padding: "12px 8px",
					width: "100%",
					boxSizing: "border-box",
					overflow: "hidden",
				}}
			>
				<svg viewBox="0 0 580 180" className="sr-only" aria-hidden="true" style={{ display: "none" }} />
				<ToothChart
					teethData={chartTeethData}
					selectedTeeth={selectedTeeth}
					onToothClick={(num) => {
						const tooth = toothMap.get(String(num));
						if (tooth) handleToothClick(tooth);
					}}
					showPulpAndCanals={true}
					showPeriapicalHalos={true}
					showPeriodontalBoneLoss={true}
					hideExpressActions={true}
					className="patient-cabinet-tooth-chart"
				/>
			</div>
			{selectedTooth && <PatientToothDetailBox selectedTooth={selectedTooth} onClose={() => setSelectedFdi(null)} />}
		</div>
	);
});

PatientPlanDentalFormula.displayName = "PatientPlanDentalFormula";
export default PatientPlanDentalFormula;
