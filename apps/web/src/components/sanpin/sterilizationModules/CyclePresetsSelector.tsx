import React from "react";
import { CheckCircle2, Clock, Flame, Zap } from "lucide-react";
import { CLINICAL_AUTOCLAVE_1CLICK_PRESETS } from "./sterilizationCycleTypes";

export interface CyclePresetsSelectorProps {
	readonly selectedRegimeId: string;
	readonly onSelectPreset: (preset: (typeof CLINICAL_AUTOCLAVE_1CLICK_PRESETS)[number]) => void;
}

export function CyclePresetsSelector({ selectedRegimeId, onSelectPreset }: CyclePresetsSelectorProps) {
	return (
		<div className="sanpin-form-group" style={{ margin: 0 }}>
			<label className="sanpin-form-label" style={{ margin: "0 0 0.35rem 0", fontWeight: 700 }}>
				Клинические пресеты цикла (выбор в 1 клик)
			</label>
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.5rem" }}>
				{CLINICAL_AUTOCLAVE_1CLICK_PRESETS.map((p, idx) => {
					const isSelected = selectedRegimeId === p.regimeOptionId;
					const IconComponent = idx === 0 ? Flame : idx === 1 ? Clock : Zap;
					return (
						<button
							key={p.id}
							type="button"
							onClick={() => onSelectPreset(p)}
							className={`touch-manipulation ${isSelected ? "border-[var(--teal,#0d9488)] ring-2 ring-[var(--teal,#0d9488)]/20" : "border-[var(--line,#e2e8f0)]"}`}
							style={{
								display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.55rem 0.7rem",
								borderRadius: "10px", border: isSelected ? "2px solid var(--teal, #0d9488)" : "1px solid var(--line, #e2e8f0)",
								background: isSelected ? "color-mix(in srgb, var(--teal,#0d9488) 8%, var(--paper,#ffffff))" : "var(--paper-soft, #f8fafc)",
								cursor: "pointer", textAlign: "left", transition: "all 0.15s ease",
							}}
							data-testid={`preset-click-${p.id}`}
						>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.35rem" }}>
								<span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink, #0f172a)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
									<IconComponent size={13} color="var(--teal, #0d9488)" />
									<span>{p.title}</span>
								</span>
								{isSelected && <CheckCircle2 size={13} color="var(--teal, #0d9488)" style={{ flexShrink: 0 }} />}
							</div>
							<span style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)" }}>{p.subtitle}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
