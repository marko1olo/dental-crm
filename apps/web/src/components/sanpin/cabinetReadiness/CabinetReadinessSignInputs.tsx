import React from "react";

export interface CabinetReadinessSignInputsProps {
	readonly nurseName: string;
	readonly setNurseName: (v: string) => void;
	readonly notes: string;
	readonly setNotes: (v: string) => void;
}

export function CabinetReadinessSignInputs({
	nurseName,
	setNurseName,
	notes,
	setNotes,
}: CabinetReadinessSignInputsProps) {
	return (
		<>
			<div style={{ flex: "1 1 220px", minWidth: 0 }}>
				<label style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)", display: "block", marginBottom: "0.25rem" }}>
					ФИО ассистента / медсестры (опционально):
				</label>
				<input
					type="text"
					value={nurseName}
					onChange={(e) => setNurseName(e.target.value)}
					placeholder="Персонал клиники"
					className="sanpin-input"
					style={{ minHeight: "44px", fontSize: "0.85rem", width: "100%" }}
				/>
			</div>

			<div style={{ flex: "1.2 1 240px", minWidth: 0 }}>
				<label style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)", display: "block", marginBottom: "0.25rem" }}>
					Примечания / Особые указания:
				</label>
				<input
					type="text"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					placeholder="например: стерильный набор имплантации"
					className="sanpin-input"
					style={{ minHeight: "44px", fontSize: "0.85rem", width: "100%" }}
				/>
			</div>
		</>
	);
}
