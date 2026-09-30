/**
 * VisiographLesionsHud.tsx
 *
 * Right-side HUD overlay displaying active periapical lesions list,
 * calculated area (mm²), equivalent diameter (mm), and treatment guidance.
 */

import type { PeriapicalLesion } from "./VisiographMeasurementMath";

export interface VisiographLesionsHudProps {
	lesions: PeriapicalLesion[];
}

export function VisiographLesionsHud({ lesions }: VisiographLesionsHudProps) {
	if (lesions.length === 0) return null;

	return (
		<div
			style={{
				width: "260px",
				background: "var(--paper-soft, #161b22)",
				borderLeft: "1px solid var(--line, #30363d)",
				padding: "12px",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				fontSize: "0.78rem",
				color: "var(--ink, #c9d1d9)",
			}}
		>
			<div style={{ fontWeight: 600, color: "var(--danger, #ff1744)" }}>
				Периапикальные очаги ({lesions.length})
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
				{lesions.map((les, idx) => (
					<div
						key={les.id}
						style={{
							background: "var(--paper-strong, #0d1117)",
							padding: "8px",
							borderRadius: "6px",
							border: "1px solid var(--danger, #ff1744)",
						}}
					>
						<div style={{ fontWeight: 600, color: "var(--paper-contrast, #ffffff)" }}>
							Очаг #{idx + 1}: {les.classificationLabel}
						</div>
						<div style={{ color: "var(--primary, #00e5ff)", marginTop: 2 }}>
							Площадь: <strong>{les.areaMm2.toFixed(1)} мм²</strong> (Ø {les.equivalentDiameterMm.toFixed(1)} мм)
						</div>
						<div style={{ color: "var(--muted, #8b949e)", fontSize: "0.72rem", marginTop: 4 }}>
							{les.treatmentRecommendation}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
