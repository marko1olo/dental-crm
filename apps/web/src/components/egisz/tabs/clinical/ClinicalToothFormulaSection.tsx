/**
 * ClinicalToothFormulaSection.tsx — Interactive FDI Dental Formula & Status Selector
 */

import React from "react";
import { DENTAL_TOOTH_STATUS_DICTIONARY, FDI_ADULT_TEETH } from "../../egiszRemdEngine";

export interface ClinicalToothFormulaSectionProps {
	readonly selectedTooth: number;
	readonly onSelectTooth: (tooth: number) => void;
	readonly toothStates: Record<number, string>;
	readonly onUpdateToothStatus: (tooth: number, status: string) => void;
}

export const ClinicalToothFormulaSection: React.FC<ClinicalToothFormulaSectionProps> = ({
	selectedTooth,
	onSelectTooth,
	toothStates,
	onUpdateToothStatus,
}) => {
	const renderQuadrantRow = (teeth: readonly number[]) => (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: "4px" }}>
			{teeth.map((t) => {
				const st = toothStates[t] || "Healthy";
				const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || { shortSymbol: "З", color: "var(--success)" };
				const isSelected = selectedTooth === t;
				return (
					<button
						key={t}
						type="button"
						onClick={() => onSelectTooth(t)}
						style={{
							border: isSelected ? "2px solid var(--primary)" : "1px solid var(--line)",
							borderRadius: "4px", padding: "4px 2px", background: "var(--paper)",
							cursor: "pointer", textAlign: "center", minHeight: "42px",
						}}
					>
						<div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)" }}>{t}</div>
						<div style={{ fontSize: "12px", fontWeight: 800, color: stObj.color }}>{stObj.shortSymbol}</div>
					</button>
				);
			})}
		</div>
	);

	return (
		<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper-strong)" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
				<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
					Зубная формула (Одонтограмма)
				</div>
				<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
					Выбран зуб: <strong style={{ color: "var(--primary)" }}>{selectedTooth}</strong> (Статус: {DENTAL_TOOTH_STATUS_DICTIONARY[toothStates[selectedTooth] || "Healthy"]?.labelRu || "Интактен"})
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
				{renderQuadrantRow(FDI_ADULT_TEETH.slice(0, 16))}
				{renderQuadrantRow(FDI_ADULT_TEETH.slice(16, 32))}
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.75rem" }}>
				{Object.entries(DENTAL_TOOTH_STATUS_DICTIONARY).map(([key, val]) => (
					<button
						key={key}
						type="button"
						onClick={() => onUpdateToothStatus(selectedTooth, key)}
						style={{
							padding: "0.25rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "4px",
							border: "1px solid var(--line)",
							background: (toothStates[selectedTooth] || "Healthy") === key ? val.color : "var(--paper)",
							color: (toothStates[selectedTooth] || "Healthy") === key ? "var(--ink-inverse)" : "var(--ink)",
							cursor: "pointer",
						}}
					>
						{val.shortSymbol} &bull; {val.labelRu}
					</button>
				))}
			</div>
		</div>
	);
};
