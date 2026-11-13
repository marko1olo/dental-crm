/**
 * DENTE CRM — Patient Plan Anatomical Node
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo } from "react";
import { AnatomicalTooth } from "../../odontogram/gate0/AnatomicalTooth";
import { toothDataToGate0Flags } from "../../odontogram/gate0/gate0ToothFlagsConverter";
import type { PatientToothInfo } from "../patientFriendlyOdontogramEngine";
import { resolveToothAnatomicalVisual } from "../patientOdontogram/patientOdontogramTypes";

export interface PatientPlanAnatomicalNodeProps {
	readonly fdi: string;
	readonly x: number;
	readonly y: number;
	readonly tooth: PatientToothInfo;
	readonly isSelected: boolean;
	readonly isDimmed: boolean;
	readonly onSelect: (tooth: PatientToothInfo) => void;
	readonly isTop: boolean;
}

export const PatientPlanAnatomicalNode: React.FC<PatientPlanAnatomicalNodeProps> = memo(({
	fdi,
	x,
	y,
	tooth,
	isSelected,
	isDimmed,
	onSelect,
}) => {
	const toothNum = Number.parseInt(fdi, 10) || 11;
	const visual = resolveToothAnatomicalVisual(tooth);

	return (
		<g
			onClick={() => onSelect(tooth)}
			style={{ cursor: "pointer", opacity: isDimmed ? 0.3 : 1 }}
			data-testid={`plan-tooth-${fdi}`}
			id={`plan-tooth-${fdi}`}
			role="button"
			tabIndex={0}
			aria-label={`${fdi}: ${tooth.humanNameRu}`}
		>
			<svg x={x} y={y} width="36" height="56" viewBox="0 0 100 218" style={{ overflow: "visible" }}>
				<AnatomicalTooth
					toothNumber={toothNum}
					layers={toothDataToGate0Flags({
						toothNumber: toothNum,
						state: visual.state as any,
						material: visual.material as any,
					})}
					zoom={0.5}
					showBadge={false}
				/>
			</svg>
			<text x={x + 18} y={y + 64} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="700">
				{fdi}
			</text>
		</g>
	);
});

PatientPlanAnatomicalNode.displayName = "PatientPlanAnatomicalNode";
export default PatientPlanAnatomicalNode;
