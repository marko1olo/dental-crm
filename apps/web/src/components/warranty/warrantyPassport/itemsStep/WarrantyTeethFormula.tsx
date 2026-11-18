import { Award, Baby } from "lucide-react";
import React, { useState } from "react";
import type { WarrantyItem } from "../../warrantyEngine.js";
import {
	DECIDUOUS_LOWER_LEFT_TEETH,
	DECIDUOUS_LOWER_RIGHT_TEETH,
	DECIDUOUS_UPPER_LEFT_TEETH,
	DECIDUOUS_UPPER_RIGHT_TEETH,
	LOWER_LEFT_TEETH,
	LOWER_RIGHT_TEETH,
	UPPER_LEFT_TEETH,
	UPPER_RIGHT_TEETH,
} from "../constants";

export interface WarrantyTeethFormulaProps {
	selectedTeeth: string[];
	items: WarrantyItem[];
	onToggleTooth: (tooth: string) => void;
}

export const WarrantyTeethFormula: React.FC<WarrantyTeethFormulaProps> = ({
	selectedTeeth,
	items,
	onToggleTooth,
}) => {
	const hasDeciduousItems = items.some((it) => {
		const num = Number.parseInt(it.toothNumber.replace(/\D/g, ""), 10);
		return num >= 51 && num <= 85;
	});

	const [dentition, setDentition] = useState<"permanent" | "deciduous">(
		hasDeciduousItems ? "deciduous" : "permanent",
	);

	const renderToothButton = (t: string) => {
		const cleanTooth = t.replace(".", "");
		const isSel = selectedTeeth.some((st) => st.replace(".", "") === cleanTooth);
		const hasW = items.some((it) => it.toothNumber.replace(".", "") === cleanTooth);
		return (
			<button
				key={cleanTooth}
				type="button"
				className={`warranty-tooth-chip ${isSel ? "selected" : ""} ${hasW ? "has-work" : ""}`}
				onClick={() => onToggleTooth(cleanTooth)}
				title={`Зуб ${cleanTooth}`}
			>
				{cleanTooth}
			</button>
		);
	};

	const upperRight = dentition === "permanent" ? UPPER_RIGHT_TEETH : DECIDUOUS_UPPER_RIGHT_TEETH;
	const upperLeft = dentition === "permanent" ? UPPER_LEFT_TEETH : DECIDUOUS_UPPER_LEFT_TEETH;
	const lowerRight = dentition === "permanent" ? LOWER_RIGHT_TEETH : DECIDUOUS_LOWER_RIGHT_TEETH;
	const lowerLeft = dentition === "permanent" ? LOWER_LEFT_TEETH : DECIDUOUS_LOWER_LEFT_TEETH;

	return (
		<div className="warranty-card-section">
			<div className="warranty-section-header" style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Award size={16} />
					<h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>
						1. Зубы в гарантийном паспорте (FDI):
					</h4>
				</div>
				<div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper-soft)", fontSize: "0.75rem" }}>
					<button
						type="button"
						onClick={() => setDentition("permanent")}
						className={`px-2.5 py-1 rounded-md font-medium transition-all ${
							dentition === "permanent"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						Постоянные (11–48)
					</button>
					<button
						type="button"
						onClick={() => setDentition("deciduous")}
						className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
							dentition === "deciduous"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Baby size={13} />
						Молочные (51–85)
					</button>
				</div>
				<span className="warranty-label truncate min-w-0">
					Выбрано: {selectedTeeth.length > 0 ? selectedTeeth.map((st) => st.replace(".", "")).join(", ") : "нет"}
				</span>
			</div>

			<div className="warranty-teeth-formula">
				{/* Верхняя челюсть */}
				<div className="warranty-arch-row">
					{upperRight.map(renderToothButton)}
					<div className="warranty-arch-divider" />
					{upperLeft.map(renderToothButton)}
				</div>

				{/* Нижняя челюсть */}
				<div className="warranty-arch-row">
					{lowerRight.map(renderToothButton)}
					<div className="warranty-arch-divider" />
					{lowerLeft.map(renderToothButton)}
				</div>
			</div>
		</div>
	);
};
