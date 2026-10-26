import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { PatientBeforeAfterCase } from "../../patientCabinet/patientCabinetAppointments.js";

export interface PlanBeforeAfterGridProps {
	readonly filteredCases: readonly PatientBeforeAfterCase[];
	readonly activeCaseId: string;
	readonly onSelectCase: (c: PatientBeforeAfterCase) => void;
}

export const PlanBeforeAfterGrid: React.FC<PlanBeforeAfterGridProps> = ({
	filteredCases,
	activeCaseId,
	onSelectCase,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
				gap: "10px",
				marginTop: "4px",
			}}
		>
			{filteredCases.map((c) => {
				const isCurrent = c.id === activeCaseId;
				return (
					<div
						key={c.id}
						data-testid={`before-after-case-card-${c.id}`}
						onClick={() => onSelectCase(c)}
						style={{
							padding: "10px",
							borderRadius: "8px",
							border: `1px solid ${isCurrent ? "var(--pc-primary, #0d9488)" : "var(--pc-border, #334155)"}`,
							backgroundColor: isCurrent ? "rgba(13, 148, 136, 0.12)" : "var(--pc-surface, var(--paper-strong, #ffffff))",
							cursor: "pointer",
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							transition: "all 0.15s ease",
						}}
					>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--pc-primary, #0d9488)" }}>
								{c.categoryRu}
							</span>
							{isCurrent && <CheckCircle2 size={14} style={{ color: "var(--pc-primary, #0d9488)" }} />}
						</div>
						<strong style={{ fontSize: "12px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							{c.titleRu}
						</strong>
						<span style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)" }}>
							{c.durationRu} &bull; {c.doctorName}
						</span>
					</div>
				);
			})}
		</div>
	);
};
