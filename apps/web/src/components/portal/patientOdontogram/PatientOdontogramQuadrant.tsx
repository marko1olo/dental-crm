/**
 * DENTE CRM — Patient Odontogram Quadrant Block
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo } from "react";
import type { PatientToothInfo, PatientToothStatus } from "../patientFriendlyOdontogramEngine";
import { PatientAnatomicalTooth } from "./PatientAnatomicalTooth";

export interface PatientOdontogramQuadrantProps {
	readonly testId: string;
	readonly title: string;
	readonly teeth: readonly PatientToothInfo[];
	readonly selectedFdi: string | null;
	readonly statusFilter: "all" | PatientToothStatus;
	readonly onSelectTooth: (tooth: PatientToothInfo) => void;
	readonly testIdPrefix?: "tooth-btn" | "plan-tooth";
}

export const PatientOdontogramQuadrant: React.FC<PatientOdontogramQuadrantProps> = memo(({
	testId,
	title,
	teeth,
	selectedFdi,
	statusFilter,
	onSelectTooth,
	testIdPrefix = "tooth-btn",
}) => (
	<div className="patient-odontogram-quadrant" data-testid={testId}>
		<span className="patient-odontogram-quadrant-title">{title}</span>
		<div className="patient-odontogram-teeth-row">
			{teeth.map((tooth) => (
				<PatientAnatomicalTooth
					key={tooth.fdiCode}
					tooth={tooth}
					isSelected={selectedFdi === tooth.fdiCode}
					isDimmed={statusFilter !== "all" && tooth.status !== statusFilter}
					onSelect={onSelectTooth}
					testIdPrefix={testIdPrefix}
				/>
			))}
		</div>
	</div>
));

PatientOdontogramQuadrant.displayName = "PatientOdontogramQuadrant";
