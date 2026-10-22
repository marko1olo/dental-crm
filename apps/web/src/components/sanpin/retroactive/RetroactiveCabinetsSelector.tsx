import React from "react";
import { Check } from "lucide-react";
import { STATUTORY_CLINIC_CABINETS } from "../retroactiveSanpinEngine";

export interface RetroactiveCabinetsSelectorProps {
	readonly selectedCabinetIds: string[];
	readonly toggleCabinet: (id: string) => void;
	readonly selectAllCabinets: () => void;
}

export function RetroactiveCabinetsSelector({
	selectedCabinetIds,
	toggleCabinet,
	selectAllCabinets,
}: RetroactiveCabinetsSelectorProps) {
	return (
		<div className="sanpin-form-group">
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<label className="sanpin-form-label" style={{ fontWeight: 700 }}>
					Кабинеты клиники ({selectedCabinetIds.length}/{STATUTORY_CLINIC_CABINETS.length}):
				</label>
				<button
					type="button"
					onClick={selectAllCabinets}
					style={{
						background: "none",
						border: "none",
						color: "var(--brand-primary, #2563eb)",
						fontSize: "0.75rem",
						cursor: "pointer",
						padding: 0,
						textDecoration: "underline",
					}}
				>
					Выбрать все
				</button>
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
				{STATUTORY_CLINIC_CABINETS.map((cab) => {
					const isSelected = selectedCabinetIds.includes(cab.id);
					return (
						<button
							key={cab.id}
							type="button"
							onClick={() => toggleCabinet(cab.id)}
							style={{
								padding: "0.4rem 0.7rem",
								borderRadius: "0.375rem",
								fontSize: "0.82rem",
								fontWeight: isSelected ? 700 : 500,
								border: isSelected ? "1px solid var(--teal)" : "1px solid var(--line, #cbd5e1)",
								background: isSelected ? "var(--teal-surface, rgba(13, 148, 136, 0.12))" : "var(--paper, #ffffff)",
								color: isSelected ? "var(--teal)" : "var(--ink, #334155)",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "0.35rem",
								transition: "all 0.15s ease",
							}}
						>
							{isSelected && <Check size={14} color="var(--teal)" />}
							{cab.shortName}
						</button>
					);
				})}
			</div>
		</div>
	);
}
