/**
 * DmsApprovedTeethSelector.tsx — Селектор согласованных номеров зубов FDI
 */

import { Check, ShieldCheck } from "lucide-react";
import React from "react";
import { FDI_ADULT_TEETH_LOWER, FDI_ADULT_TEETH_UPPER } from "./types.js";

export interface DmsApprovedTeethSelectorProps {
	readonly approvedTeethFdi: readonly string[];
	readonly onToggleApprovedTooth: (toothFdi: string) => void;
}

const KEY_TEETH_FOR_QUICK_SELECT: readonly string[] = [
	...FDI_ADULT_TEETH_UPPER.slice(0, 8),
	...FDI_ADULT_TEETH_LOWER.slice(0, 8),
];

export function DmsApprovedTeethSelector({
	approvedTeethFdi,
	onToggleApprovedTooth,
}: DmsApprovedTeethSelectorProps) {
	return (
		<div className="dms-card" data-testid="dms-approved-teeth-selector">
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
				<div className="dms-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<ShieldCheck size={15} style={{ color: "var(--teal, #0d9488)" }} />
					<span>Согласованные зубы по формуле FDI (если пусто — разрешены все зубы):</span>
				</div>
				<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
					{approvedTeethFdi.length > 0 ? `Выбрано зубов: ${approvedTeethFdi.join(", ")}` : "Без ограничения по номерам зубов"}
				</span>
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
				{KEY_TEETH_FOR_QUICK_SELECT.map((tooth) => {
					const isSelected = approvedTeethFdi.includes(tooth);
					return (
						<button
							key={tooth}
							type="button"
							onClick={() => onToggleApprovedTooth(tooth)}
							className={`dms-quick-chip ${isSelected ? "active" : ""}`}
							title={`Согласовать лечение зуба ${tooth} по гарантийному письму`}
						>
							{isSelected && <Check size={11} />}
							<span className="font-mono">{tooth}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
