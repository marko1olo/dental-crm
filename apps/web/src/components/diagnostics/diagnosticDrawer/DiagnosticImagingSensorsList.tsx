import React from "react";
import { POPULAR_RVG_SENSORS } from "../../radiology/directRvgFileValidation";

export const DiagnosticImagingSensorsList: React.FC = () => {
	return (
		<div
			style={{
				padding: 16,
				borderRadius: 8,
				background: "var(--paper-strong, #ffffff)",
				border: "1px solid var(--glass-border, rgba(0,0,0,0.08))",
				display: "flex",
				flexDirection: "column",
				gap: 10,
			}}
		>
			<h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
				Поддерживаемые датчики визиографов (Zero-Configuration):
			</h4>
			<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
				{POPULAR_RVG_SENSORS.map((s) => (
					<span
						key={s.id}
						style={{
							padding: "4px 8px",
							borderRadius: 6,
							background: "var(--surface, #f1f5f9)",
							border: "1px solid var(--line, #e2e8f0)",
							fontSize: 12,
							fontWeight: 600,
						}}
					>
						✓ {s.name} ({s.resolution})
					</span>
				))}
			</div>
		</div>
	);
};
