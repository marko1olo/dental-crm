/**
 * VisiographFindingsPills.tsx
 *
 * Interactive tooth findings pills with checkboxes, pathology indicators,
 * and applied status badges for VisiographAnalyzer.
 */

import React from "react";
import { STATE_LABELS, type AiToothState } from "./VisiographScanHelpers";

export interface VisiographFindingsPillsProps {
	toothStates: AiToothState[];
	appliedToothCodes: string[];
	selectedFindingCodes: Set<string>;
	onToggleFindingCode: (code: string) => void;
}

export function VisiographFindingsPills({
	toothStates,
	appliedToothCodes,
	selectedFindingCodes,
	onToggleFindingCode,
}: VisiographFindingsPillsProps) {
	if (!toothStates || toothStates.length === 0) return null;

	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
			{toothStates.map(({ code, state }) => {
				const isCritical = state === "treatment" || state === "watch";
				const isApplied = appliedToothCodes.includes(code);
				const isSelected = selectedFindingCodes.has(code);

				return (
					<label
						key={code}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							padding: "5px 12px",
							borderRadius: "8px",
							fontSize: "0.82rem",
							fontWeight: 600,
							background: isApplied
								? "var(--teal-soft)"
								: isSelected
									? "var(--paper)"
									: "var(--paper-soft)",
							color: isApplied
								? "var(--teal)"
								: isCritical
									? "var(--rust, #c62828)"
									: "var(--ink)",
							border: `1px solid ${
								isApplied
									? "var(--teal)"
									: isSelected
										? "var(--teal)"
										: "var(--line)"
							}`,
							cursor: "pointer",
							userSelect: "none",
							transition: "all 0.15s ease",
						}}
					>
						<input
							type="checkbox"
							checked={isSelected}
							onChange={() => onToggleFindingCode(code)}
							style={{ cursor: "pointer" }}
						/>
						<span>Зуб {code}</span>
						<span style={{ opacity: 0.8, fontWeight: 400 }}>
							· {STATE_LABELS[state] ?? state}
						</span>
						{isApplied && (
							<span
								style={{
									fontSize: "0.7rem",
									fontWeight: 700,
									background: "var(--teal)",
									color: "var(--on-teal, white)",
									padding: "1px 6px",
									borderRadius: "4px",
									marginLeft: "4px",
								}}
							>
								Внесено
							</span>
						)}
					</label>
				);
			})}
		</div>
	);
}
