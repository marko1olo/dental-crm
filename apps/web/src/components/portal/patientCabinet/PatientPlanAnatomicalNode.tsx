/**
 * DENTE CRM — Patient Plan Anatomical SVG Tooth Node
 * Replaces ugly flat <rect> boxes with canonical anatomical tooth graphics.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo } from "react";
import { AnatomicalToothSVG } from "../../odontogram/AnatomicalToothSVG";
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
	isTop,
}) => {
	const toothNum = Number.parseInt(fdi, 10) || 11;
	const visual = resolveToothAnatomicalVisual(tooth);

	const statusColor =
		tooth.status === "healthy"
			? "#10b981"
			: tooth.status === "in_treatment"
				? "#f59e0b"
				: tooth.status === "needs_treatment"
					? "#ef4444"
					: "#0284c7";

	return (
		<g
			onClick={() => onSelect(tooth)}
			style={{ cursor: "pointer", opacity: isDimmed ? 0.3 : 1 }}
			data-testid={`plan-tooth-${fdi}`}
			id={`plan-tooth-${fdi}`}
			role="button"
			tabIndex={0}
			aria-label={`${fdi}: ${tooth.humanNameRu}`}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") onSelect(tooth);
			}}
		>
			{/* Selection / Status glow pill */}
			<rect
				x={x - 2}
				y={y - 2}
				width="34"
				height="62"
				rx="8"
				fill={isSelected ? "rgba(13, 148, 136, 0.25)" : "rgba(255, 255, 255, 0.03)"}
				stroke={isSelected ? "#0d9488" : statusColor}
				strokeWidth={isSelected ? 2 : 1}
				strokeDasharray={tooth.status === "needs_treatment" ? "3 3" : undefined}
			/>

			{/* Canonical Anatomical Tooth SVG render inside viewBox */}
			<svg x={x + 1} y={y + (isTop ? 2 : 4)} width="28" height="46" style={{ overflow: "visible" }}>
				<AnatomicalToothSVG
					number={toothNum}
					state={visual.state}
					material={visual.material}
					scale={0.44}
					isSelected={isSelected}
					onClick={(_, num) => onSelect(tooth)}
					showPulpAndCanals={visual.state === "Pulpitis" || visual.state === "Root_Canal_Treated"}
					showPeriapicalHalos={visual.state === "Periodontitis"}
					showPeriodontalBoneLoss={false}
				/>
			</svg>

			{/* Tooth FDI number */}
			<text
				x={x + 15}
				y={isTop ? y + 54 : y + 54}
				textAnchor="middle"
				fill="#ffffff"
				fontSize="10"
				fontWeight="800"
				fontFamily="sans-serif"
			>
				{fdi}
			</text>

			{/* Status color bullet */}
			<circle cx={x + 15} cy={isTop ? y + 4 : y + 4} r="2.5" fill={statusColor} />
		</g>
	);
});

PatientPlanAnatomicalNode.displayName = "PatientPlanAnatomicalNode";
