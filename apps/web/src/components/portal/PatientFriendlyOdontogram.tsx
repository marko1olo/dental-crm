/**
 * DENTE CRM — Patient-Friendly Canonical Anatomical Odontogram
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import {
	DEFAULT_PATIENT_TEETH,
	calculateDentalHealthIndex,
	type PatientToothInfo,
	type PatientToothStatus,
} from "./patientFriendlyOdontogramEngine";
import { PatientToothDetailBox } from "./PatientToothDetailBox";
import { PatientHealthIndexCard } from "./patientOdontogram/PatientHealthIndexCard";
import { PatientStatusFilterBar } from "./patientOdontogram/PatientStatusFilterBar";
import { PatientOdontogramArchContainer } from "./patientOdontogram/PatientOdontogramArchContainer";

export * from "./patientFriendlyOdontogramEngine";
export * from "./PatientToothDetailBox";

export interface PatientFriendlyOdontogramProps {
	teeth?: readonly PatientToothInfo[] | PatientToothInfo[];
	onSelectTooth?: (tooth: PatientToothInfo) => void;
	showHealthIndexHeader?: boolean;
}

const UR_FDI = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UL_FDI = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LR_FDI = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LL_FDI = ["31", "32", "33", "34", "35", "36", "37", "38"];

export const PatientFriendlyOdontogram: React.FC<PatientFriendlyOdontogramProps> = memo(({
	teeth = DEFAULT_PATIENT_TEETH,
	onSelectTooth,
	showHealthIndexHeader = true,
}) => {
	const [selectedTooth, setSelectedTooth] = useState<PatientToothInfo | null>(null);
	const [statusFilter, setStatusFilter] = useState<"all" | PatientToothStatus>("all");

	const healthIndex = useMemo(() => calculateDentalHealthIndex(teeth), [teeth]);

	const upperRight = useMemo(() => teeth.filter((t) => UR_FDI.includes(t.fdiCode)), [teeth]);
	const upperLeft = useMemo(() => teeth.filter((t) => UL_FDI.includes(t.fdiCode)), [teeth]);
	const lowerRight = useMemo(() => teeth.filter((t) => LR_FDI.includes(t.fdiCode)), [teeth]);
	const lowerLeft = useMemo(() => teeth.filter((t) => LL_FDI.includes(t.fdiCode)), [teeth]);

	const handleToothClick = useCallback((tooth: PatientToothInfo) => {
		setSelectedTooth((prev) => (prev?.fdiCode === tooth.fdiCode ? null : tooth));
		onSelectTooth?.(tooth);
	}, [onSelectTooth]);

	return (
		<div
			className="patient-friendly-odontogram"
			data-testid="patient-friendly-odontogram"
			style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}
		>
			{showHealthIndexHeader && <PatientHealthIndexCard healthIndex={healthIndex} />}
			<PatientStatusFilterBar statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} healthIndex={healthIndex} />
			<PatientOdontogramArchContainer
				upperRight={upperRight}
				upperLeft={upperLeft}
				lowerRight={lowerRight}
				lowerLeft={lowerLeft}
				selectedFdi={selectedTooth?.fdiCode ?? null}
				statusFilter={statusFilter}
				onSelectTooth={handleToothClick}
				testIdPrefix="tooth-btn"
			/>
			{selectedTooth && <PatientToothDetailBox selectedTooth={selectedTooth} onClose={() => setSelectedTooth(null)} />}
		</div>
	);
});

PatientFriendlyOdontogram.displayName = "PatientFriendlyOdontogram";
export default PatientFriendlyOdontogram;
