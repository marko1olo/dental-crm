import React from "react";
import { CheckCircle2 } from "lucide-react";
import { CONSENT_INTERVENTION_TYPES } from "./types";

interface PrimaryIntakeInterventionsBarProps {
	selectedInterventions: string[];
	onToggleIntervention: (id: string) => void;
}

export function PrimaryIntakeInterventionsBar({
	selectedInterventions,
	onToggleIntervention,
}: PrimaryIntakeInterventionsBarProps) {
	return (
		<div
			style={{
				padding: "8px 12px",
				borderRadius: "8px",
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
			}}
			data-testid="consent-intervention-selector"
			data-legacy-testid="consent-1051n-intervention-selector"
		>
			<div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
				Объем медицинских вмешательств по согласию:
			</div>
			<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
				{CONSENT_INTERVENTION_TYPES.map((typeItem) => {
					const isActive = selectedInterventions.includes(typeItem.id) || (typeItem.id === "comprehensive" && selectedInterventions.includes("comprehensive_1051n"));
					return (
						<button
							key={typeItem.id}
							type="button"
							onClick={() => onToggleIntervention(typeItem.id)}
							data-testid={`chip-consent-${typeItem.id}`}
							data-legacy-testid={`chip-1051n-${typeItem.id}`}
							style={{
								minHeight: "28px",
								height: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "11.5px",
								fontWeight: 600,
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "5px",
								border: isActive ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line, #e2e8f0)",
								background: isActive ? "var(--teal, #0d9488)" : "var(--paper, #ffffff)",
								color: isActive ? "#ffffff" : "var(--ink, #0f172a)",
								transition: "all 0.15s ease",
							}}
						>
							{isActive && <CheckCircle2 size={12} aria-hidden="true" />}
							<span>{typeItem.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
