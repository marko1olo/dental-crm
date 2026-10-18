/**
 * DENTE CRM — Patient Odontogram Dual-Arch Container
 * Canonical AnatomicalToothSVG integration compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo } from "react";
import { DenteToothSvgDefs } from "../../odontogram/ToothChart";
import type { PatientToothInfo, PatientToothStatus } from "../patientFriendlyOdontogramEngine";
import { PatientOdontogramQuadrant } from "./PatientOdontogramQuadrant";
import { PATIENT_ODONTOGRAM_CSS } from "./patientOdontogramStyles";

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
	testIdPrefix = "tooth-btn",
}) => (
	<div className="patient-odontogram-arch-container" data-testid="patient-odontogram-arch-container">
		<DenteToothSvgDefs />
		<style>{PATIENT_ODONTOGRAM_CSS}</style>
		<div className="patient-odontogram-arch">
			<div className="patient-odontogram-jaw-title">ВЕРХНЯЯ ЧЕЛЮСТЬ (ПРАВАЯ И ЛЕВАЯ СТОРОНЫ)</div>
			<div className="patient-odontogram-quadrants-row">
				<PatientOdontogramQuadrant testId="quadrant-upper-right" title="Верхний правый (18..11)" teeth={upperRight} selectedFdi={selectedFdi} statusFilter={statusFilter} onSelectTooth={onSelectTooth} testIdPrefix={testIdPrefix} />
				<PatientOdontogramQuadrant testId="quadrant-upper-left" title="Верхний левый (21..28)" teeth={upperLeft} selectedFdi={selectedFdi} statusFilter={statusFilter} onSelectTooth={onSelectTooth} testIdPrefix={testIdPrefix} />
			</div>
		</div>
		<div className="patient-odontogram-divider" />
		<div className="patient-odontogram-arch">
			<div className="patient-odontogram-quadrants-row">
				<PatientOdontogramQuadrant testId="quadrant-lower-right" title="Нижний правый (48..41)" teeth={lowerRight} selectedFdi={selectedFdi} statusFilter={statusFilter} onSelectTooth={onSelectTooth} testIdPrefix={testIdPrefix} />
				<PatientOdontogramQuadrant testId="quadrant-lower-left" title="Нижний левый (31..38)" teeth={lowerLeft} selectedFdi={selectedFdi} statusFilter={statusFilter} onSelectTooth={onSelectTooth} testIdPrefix={testIdPrefix} />
			</div>
			<div className="patient-odontogram-jaw-title" style={{ marginTop: "6px", marginBottom: 0 }}>НИЖНЯЯ ЧЕЛЮСТЬ (ПРАВАЯ И ЛЕВАЯ СТОРОНЫ)</div>
		</div>
	</div>
));

PatientOdontogramArchContainer.displayName = "PatientOdontogramArchContainer";
