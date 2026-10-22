import React from "react";

export interface CabinetLampDurationSelectorProps {
	readonly selectedDurationMinutes: number;
	readonly setSelectedDurationMinutes: (mins: number) => void;
}

export function CabinetLampDurationSelector({
	selectedDurationMinutes,
	setSelectedDurationMinutes,
}: CabinetLampDurationSelectorProps) {
	return (
		<div>
			<label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted, #64748b)", display: "block", marginBottom: "0.35rem" }}>
				Режим экспозиции:
			</label>
			<div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
				{[15, 30, 60].map((mins) => (
					<button
						key={mins}
						type="button"
						onClick={() => setSelectedDurationMinutes(mins)}
						className="secondary-button"
						style={{
							minHeight: "40px",
							padding: "0.35rem 0.75rem",
							borderRadius: "0.5rem",
							fontSize: "0.82rem",
							fontWeight: selectedDurationMinutes === mins ? 800 : 600,
							border: selectedDurationMinutes === mins ? "2px solid var(--teal, #0d9488)" : "1px solid var(--paper-border, #cbd5e1)",
							background: selectedDurationMinutes === mins ? "rgba(13, 148, 136, 0.1)" : "var(--paper-subtle, #f8fafc)",
							color: selectedDurationMinutes === mins ? "var(--teal, #0d9488)" : "inherit",
							cursor: "pointer",
						}}
					>
						{mins} минут
					</button>
				))}
			</div>
		</div>
	);
}
