/**
 * forms/procedureConsent/ProcedureConsentPresetSelector.tsx
 * Preset category buttons selector for procedure consent (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import type { ProcedureSpecificConsentProcedure } from "@dental/shared";
import { PRESET_CATEGORIES } from "./procedureConsentPresets";

interface ProcedureConsentPresetSelectorProps {
	selectedType: ProcedureSpecificConsentProcedure;
	onSelectPreset: (type: ProcedureSpecificConsentProcedure) => void;
}

export const ProcedureConsentPresetSelector: React.FC<ProcedureConsentPresetSelectorProps> = React.memo(
	function ProcedureConsentPresetSelector({ selectedType, onSelectPreset }) {
		return (
			<div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
				<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted, #64748b)", display: "block" }}>
					Клинический профиль вмешательства:
				</span>
				{PRESET_CATEGORIES.map((cat) => (
					<div key={cat.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
						<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
							{cat.title}
						</span>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
							{cat.buttons.map((btn) => {
								const isActive = selectedType === btn.type;
								return (
									<button
										key={btn.type}
										type="button"
										className={isActive ? "primary-button" : "secondary-button"}
										style={{
											minHeight: "36px",
											fontSize: "13px",
											padding: "6px 12px",
											borderRadius: "8px",
											fontWeight: isActive ? 600 : 500,
										}}
										onClick={() => onSelectPreset(btn.type)}
									>
										{btn.label}
									</button>
								);
							})}
						</div>
					</div>
				))}
			</div>
		);
	},
);
