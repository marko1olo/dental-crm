/**
 * DENTE CRM — Patient Anatomical Tooth Component
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo } from "react";
import { Check, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { AnatomicalToothSVG } from "../../odontogram/AnatomicalToothSVG";
import { getPatientToothStatusColor } from "../patientFriendlyOdontogramEngine";
import {
	type PatientAnatomicalToothProps,
	resolveToothAnatomicalVisual,
} from "./patientOdontogramTypes";

export const PatientAnatomicalTooth: React.FC<PatientAnatomicalToothProps> = memo(({
	tooth,
	isSelected,
	isDimmed,
	onSelect,
	testIdPrefix = "tooth-btn",
}) => {
	const toothNumber = Number.parseInt(tooth.fdiCode, 10) || 11;
	const visual = resolveToothAnatomicalVisual(tooth);
	const color = getPatientToothStatusColor(tooth.status);

	return (
		<button
			key={tooth.fdiCode}
			type="button"
			onClick={() => onSelect(tooth)}
			data-testid={`${testIdPrefix}-${tooth.fdiCode}`}
			id={`plan-tooth-${tooth.fdiCode}`}
			aria-label={`${tooth.fdiCode}: ${tooth.humanNameRu}`}
			title={`${tooth.fdiCode}: ${tooth.humanNameRu} — ${tooth.clinicalStateRu}`}
			style={{
				minWidth: "44px",
				minHeight: "44px",
				width: "44px",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "space-between",
				cursor: "pointer",
				padding: "4px 2px",
				borderRadius: "10px",
				border: `1.5px solid ${isSelected ? "var(--pc-primary, #0d9488)" : color.border}`,
				background: isSelected ? "var(--pc-surface, rgba(13, 148, 136, 0.15))" : "var(--pc-bg, #0f172a)",
				boxShadow: isSelected
					? `0 0 0 3px rgba(13, 148, 136, 0.4), ${color.glow}`
					: "0 2px 4px rgba(0,0,0,0.2)",
				opacity: isDimmed ? 0.35 : 1,
				transform: isSelected ? "scale(1.08)" : isDimmed ? "scale(0.96)" : "scale(1)",
				transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
				touchAction: "manipulation",
				userSelect: "none",
				flexShrink: 0,
			}}
		>
			<span style={{ fontSize: "11px", fontWeight: 800, color: "var(--pc-text-main, #e2e8f0)", lineHeight: 1 }}>
				{tooth.fdiCode}
			</span>

			<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "54px", width: "100%", overflow: "hidden" }}>
				<AnatomicalToothSVG
					number={toothNumber}
					state={visual.state}
					material={visual.material}
					scale={0.62}
					isSelected={isSelected}
					onClick={(_, num) => onSelect(tooth)}
					showPulpAndCanals={visual.state === "Pulpitis" || visual.state === "Root_Canal_Treated"}
					showPeriapicalHalos={visual.state === "Periodontitis"}
					showPeriodontalBoneLoss={false}
				/>
			</div>

			<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "14px" }}>
				{tooth.status === "healthy" && <Check size={12} strokeWidth={2.5} style={{ color: "#10b981" }} />}
				{tooth.status === "in_treatment" && <Clock size={11} strokeWidth={2.5} style={{ color: "#f59e0b" }} />}
				{tooth.status === "needs_treatment" && <AlertTriangle size={11} strokeWidth={2.5} style={{ color: "#ef4444" }} />}
				{tooth.status === "missing_or_implant" && <ShieldCheck size={11} strokeWidth={2.5} style={{ color: "#0284c7" }} />}
			</div>
		</button>
	);
});

PatientAnatomicalTooth.displayName = "PatientAnatomicalTooth";
